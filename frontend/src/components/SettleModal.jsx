import React, { useState } from 'react';
// Using stellar-sdk for constructing the Transaction XDR
import * as StellarSdk from 'stellar-sdk';
import { useWallet } from '../context/WalletContext';
import { StellarWalletsKit, Networks } from '@creit.tech/stellar-wallets-kit';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Using Stellar Testnet
const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');

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

            // 2. Build Transaction
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

            // 3. Request Signature from Wallet Kit
            const { signedTxXdr } = await StellarWalletsKit.signTransaction(transaction.toXDR(), {
                networkPassphrase: Networks.TESTNET,
                address: debt.from
            });

            // 4. Submit to Horizon
            const signedTransaction = StellarSdk.TransactionBuilder.fromXDR(signedTxXdr, StellarSdk.Networks.TESTNET);
            const response = await server.submitTransaction(signedTransaction);

            // 5. Tell the Backend
            const res = await fetch(`${API_BASE}/api/settlements`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    group_id: groupId,
                    from_address: debt.from,
                    to_address: debt.to,
                    amount: debt.amount,
                    tx_hash: response.hash
                })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to sync settlement with backend');
            }

            onSettled();
            onClose();

        } catch (err) {
            console.error(err);
            setError(err.message || 'Transaction failed. Check account balances on Testnet.');
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

                {error && <div className="text-danger bg-red-900/20 p-3 rounded-md mb-4 text-sm">{error}</div>}

                <div className="flex gap-4">
                    <button 
                        className="btn btn-primary w-full" 
                        onClick={settleWithFreighter} 
                        disabled={loading}
                    >
                        {loading ? 'Confirming in Wallet...' : 'Sign with Wallet'}
                    </button>
                    <button className="btn btn-outline w-full" onClick={onClose} disabled={loading}>
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
