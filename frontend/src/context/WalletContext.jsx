import React, { createContext, useContext, useState, useEffect } from 'react';
import { StellarWalletsKit, Networks } from '@creit.tech/stellar-wallets-kit';
import { defaultModules } from '@creit.tech/stellar-wallets-kit/modules/utils';

// Initialize the static kit
StellarWalletsKit.init({
    network: Networks.TESTNET,
    modules: defaultModules(),
});

const WalletContext = createContext();

export const useWallet = () => useContext(WalletContext);

export const WalletProvider = ({ children }) => {
    const [address, setAddress] = useState(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState('');

    const connectWallet = async () => {
        setIsConnecting(true);
        setError('');
        try {
            const result = await StellarWalletsKit.authModal();
            if (result && result.address) {
                setAddress(result.address);
            }
        } catch (err) {
            console.error(err);
            setError(err.message || 'Failed to connect wallet');
        } finally {
            setIsConnecting(false);
        }
    };

    const disconnectWallet = async () => {
        try {
            await StellarWalletsKit.disconnect();
        } catch (e) {}
        setAddress(null);
    };

    return (
        <WalletContext.Provider value={{ address, isConnecting, error, connectWallet, disconnectWallet }}>
            {children}
        </WalletContext.Provider>
    );
};
