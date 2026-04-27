/**
 * Signs a Soroban transaction XDR using Freighter wallet directly.
 * Uses @stellar/freighter-api v6 which returns { signedTxXdr, signerAddress, error }
 */
import { signTransaction as freighterSign } from '@stellar/freighter-api';

export const NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';

/**
 * Compatible with the @stellar/stellar-sdk AssembledTransaction.signAndSend callback:
 * must return { signedTxXdr: string }.
 */
export async function signWithFreighter(xdr, address) {
    const result = await freighterSign(xdr, {
        networkPassphrase: NETWORK_PASSPHRASE,
        accountToSign: address,
    });

    if (result.error) {
        throw new Error(result.error.message || String(result.error) || 'Freighter signing failed');
    }
    if (!result.signedTxXdr) {
        throw new Error('Freighter returned no signed XDR. Did you reject the transaction?');
    }

    // freighter-api v6 returns { signedTxXdr, signerAddress, error }
    return { signedTxXdr: result.signedTxXdr };
}
