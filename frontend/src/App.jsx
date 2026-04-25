import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { WalletProvider, useWallet } from './context/WalletContext';
import Dashboard from './pages/Dashboard';
import Group from './pages/Group';
import { Wallet, ExternalLink } from 'lucide-react';

const Navbar = () => {
    const { address, connectWallet, isConnecting, disconnectWallet } = useWallet();

    const truncateAddress = (addr) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

    return (
        <nav className="navbar">
            <Link to="/" className="logo">
                <Wallet className="text-black" /> Shareblock
            </Link>
            
            <div>
                {address ? (
                    <div className="flex items-center gap-4">
                        <a 
                            href={`https://stellarchain.io/accounts/${address}`}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs font-bold text-black border-dashed border-b-2 border-black flex items-center gap-1"
                            style={{textDecoration: 'none'}}
                        >
                           <ExternalLink size={12} /> Explorer
                        </a>
                        <span className="address-pill text-sm">{truncateAddress(address)}</span>
                        <button className="btn btn-outline text-xs" onClick={disconnectWallet}>Disconnect</button>
                    </div>
                ) : (
                    <button className="btn btn-primary text-sm" onClick={connectWallet} disabled={isConnecting}>
                        {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                    </button>
                )}
            </div>
        </nav>
    );
};

function App() {
  return (
    <WalletProvider>
        <BrowserRouter>
            <Navbar />
            <main className="container">
                <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/group/:id" element={<Group />} />
                </Routes>
            </main>
        </BrowserRouter>
    </WalletProvider>
  );
}

export default App;
