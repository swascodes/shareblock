import React, { useState } from 'react';
import * as StellarSdk from '@stellar/stellar-sdk';
import { useWallet } from '../context/WalletContext';
import { Client } from 'shareblock';
import { signWithFreighter, NETWORK_PASSPHRASE } from '../utils/signer';
import { signTransaction as freighterSign } from '@stellar/freighter-api';

const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');

const contract = new Client({
    networkPassphrase: NETWORK_PASSPHRASE,
    contractId: 'CDBSJWLOVS2FT25PTGGI4QW2R2K3DXUF62WSQH7U5GLHTLKLIESELUEC',
    rpcUrl: 'https://soroban-testnet.stellar.org'
});

export default function SettleModal({ debt, groupId, onClose, onSettled }) {
    const { address } = useWallet();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const settleWithFreighter = async () => {
        setLoading(true);
        setError('');
        try {
            if (address !== debt.from) {
                throw new Error("You must be connected as the debtor to settle this balance.");
            }

            // 1. Fetch source account from horizon
            const account = await server.loadAccount(address);

            const randomHex = Array.from(window.crypto.getRandomValues(new Uint8Array(32)))
                .map(b => b.toString(16).padStart(2, '0')).join('');

            // 2. Build Transaction for XLM Payment
            const transaction = new StellarSdk.TransactionBuilder(account, {
                fee: StellarSdk.BASE_FEE,
                networkPassphrase: StellarSdk.Networks.TESTNET
            })
            .addOperation(StellarSdk.Operation.payment({
                destination: debt.to,
                asset: StellarSdk.Asset.native(),
                amount: debt.amount.toString()
            }))
            .addMemo(StellarSdk.Memo.hash(randomHex))
            .setTimeout(30)
            .build();

            // 3. Sign the payment with Freighter directly
            const signResult = await freighterSign(transaction.toXDR(), {
                networkPassphrase: NETWORK_PASSPHRASE,
                accountToSign: address,
            });
            if (signResult.error) throw new Error(signResult.error.message || String(signResult.error));
            if (!signResult.signedTxXdr) throw new Error('Freighter returned no signed XDR');

            // 4. Submit to Horizon and capture the tx hash
            const signedTx = StellarSdk.TransactionBuilder.fromXDR(signResult.signedTxXdr, StellarSdk.Networks.TESTNET);
            const horizonResponse = await server.submitTransaction(signedTx);
            const txHash = horizonResponse.hash;

            // 5. Log the settlement on-chain with tx_hash for history & explorer linking
            const stroops = BigInt(Math.round(parseFloat(debt.amount) * 10000000));
            const tx = await contract.log_settlement({ 
                group_id: Number(groupId), 
                from: debt.from, 
                to: debt.to, 
                amount: stroops,
                tx_hash: txHash,
            }, { publicKey: address });
            await tx.signAndSend({
                signTransaction: (xdr) => signWithFreighter(xdr, address)
            });

            onSettled();
            onClose();

        } catch (err) {
            console.error(err);
            setError(err.message || 'Transaction failed. Check your Testnet balance.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content text-center">
                <h2 className="text-2xl mb-4 text-primary font-bold">Settle Debt On-Chain</h2>
                
                <p className="mb-2 text-muted">You are about to transfer:</p>
                <div className="text-3xl font-bold mb-4">{debt.amount} XLM</div>
                
                <div className="flex justify-between items-center bg-gray-900/50 p-4 rounded-lg border border-gray-800 mb-6 text-sm font-mono">
                    <div>
                        <div className="text-xs text-muted mb-1">To:</div>
                        <div className="text-accent">{debt.to.slice(0, 6)}...{debt.to.slice(-4)}</div>
                    </div>
                </div>

                <div className="text-xs text-muted mb-4 bg-black/10 p-2 rounded border border-black/20">
                    ℹ️ This will prompt <strong>2 wallet signatures</strong>: the XLM payment, then the on-chain settlement record.
                </div>

                {error && <div className="text-danger bg-red-900/20 p-3 rounded-md mb-4 text-sm">{error}</div>}

                <div className="flex gap-4">
                    <button 
                        className="btn btn-primary w-full" 
                        onClick={settleWithFreighter} 
                        disabled={loading}
                    >
                        {loading ? 'Signing with Freighter...' : 'Settle with Freighter'}
                    </button>
                    <button className="btn btn-outline w-full" onClick={onClose} disabled={loading}>
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
