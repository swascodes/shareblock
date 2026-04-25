import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWallet } from '../context/WalletContext';
import io from 'socket.io-client';
import SettleModal from '../components/SettleModal';
import { ArrowRight, MessageSquare, Plus, CheckCircle } from 'lucide-react';
import * as StellarSdk from 'stellar-sdk';
import { StellarWalletsKit, Networks } from '@creit.tech/stellar-wallets-kit';

const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
const socket = io('http://localhost:3001');

export default function Group() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { address } = useWallet();

    const [group, setGroup] = useState(null);
    const [expenses, setExpenses] = useState([]);
    const [balances, setBalances] = useState({});
    const [debts, setDebts] = useState([]);
    const [settlements, setSettlements] = useState([]);
    
    // Chat
    const [messages, setMessages] = useState([]);
    const [chatMsg, setChatMsg] = useState('');
    const chatEndRef = useRef(null);

    // Expense Form
    const [isAddingExpense, setIsAddingExpense] = useState(false);
    const [amount, setAmount] = useState('');
    const [error, setError] = useState('');

    // Member Form
    const [newMemberAddress, setNewMemberAddress] = useState('');
    const [isAddingMember, setIsAddingMember] = useState(false);

    // Settlement
    const [activeDebt, setActiveDebt] = useState(null);

    const fetchGroupData = async () => {
        try {
            const res = await fetch(`http://localhost:3001/api/groups/${id}`);
            if (!res.ok) throw new Error('Group not found');
            const data = await res.json();
            setGroup(data);
            setExpenses(data.expenses);
            setBalances(data.balances);
            setDebts(data.debts);
            setSettlements(data.settlements || []);
        } catch (err) {
            console.error(err);
            navigate('/');
        }
    };

    const fetchChat = async () => {
        try {
            const res = await fetch(`http://localhost:3001/api/groups/${id}/chat`);
            const data = await res.json();
            setMessages(data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchGroupData();
        fetchChat();

        socket.emit('join_group', id);

        socket.on('receive_message', (msg) => {
            setMessages(prev => [...prev, msg]);
        });

        socket.on('expense_added', (exp) => {
            fetchGroupData(); // Refresh all to get new balances
        });

        socket.on('settlement_added', (s) => {
            fetchGroupData(); // Refresh all to get new balances
        });

        socket.on('member_added', () => {
            fetchGroupData();
        });

        return () => {
            socket.off('receive_message');
            socket.off('expense_added');
            socket.off('settlement_added');
            socket.off('member_added');
        };
    }, [id]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const [isSendingChat, setIsSendingChat] = useState(false);

    const sendChatMessage = async (e) => {
        e.preventDefault();
        if (!chatMsg.trim() || !address) return;
        
        setIsSendingChat(true);
        try {
            // Send a tiny transaction to self to embed the chat in the Memo
            const account = await server.loadAccount(address);
            
            const transaction = new StellarSdk.TransactionBuilder(account, {
                fee: StellarSdk.BASE_FEE,
                networkPassphrase: StellarSdk.Networks.TESTNET
            })
            .addOperation(StellarSdk.Operation.payment({
                destination: address,
                asset: StellarSdk.Asset.native(),
                amount: "0.0000001"
            }))
            .addMemo(StellarSdk.Memo.text(chatMsg))
            .setTimeout(30)
            .build();

            // Sign using Freighter
            const { signedTxXdr } = await StellarWalletsKit.signTransaction(transaction.toXDR(), {
                networkPassphrase: Networks.TESTNET,
                address: address
            });

            // Submit to Horizon
            const signedTransaction = StellarSdk.TransactionBuilder.fromXDR(signedTxXdr, StellarSdk.Networks.TESTNET);
            const response = await server.submitTransaction(signedTransaction);

            // Now emit the message to the backend via sockets, including tx_hash
            socket.emit('send_message', { 
                group_id: id, 
                sender: address, 
                message: chatMsg,
                tx_hash: response.hash
            });
            
            setChatMsg('');
        } catch (err) {
            console.error("Failed to send on-chain chat:", err);
            alert("Chat transaction failed. " + (err.message || ''));
        } finally {
            setIsSendingChat(false);
        }
    };

    const submitExpense = async (e) => {
        e.preventDefault();
        setError('');
        if (!amount || amount <= 0) {
            setError('Amount must be greater than 0');
            return;
        }

        try {
            const res = await fetch('http://localhost:3001/api/expenses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    group_id: id,
                    payer: address,
                    amount: parseFloat(amount),
                    participants: group.members // Defaulting to simple equal split among all members
                })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to add expense');
            }

            setAmount('');
            setIsAddingExpense(false);
            // WebSocket will trigger generic refresh
        } catch (err) {
            setError(err.message);
        }
    };

    const addMemberToGroup = async (e) => {
        e.preventDefault();
        if (!newMemberAddress) return;
        try {
            const res = await fetch(`http://localhost:3001/api/groups/${id}/members`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address: newMemberAddress })
            });
            if (res.ok) {
                setNewMemberAddress('');
                setIsAddingMember(false);
                fetchGroupData();
            }
        } catch (err) {
            console.error(err);
        }
    };

    if (!group) return <div className="text-center mt-20 text-muted">Loading group...</div>;

    const truncateAddress = (addr) => `${addr.slice(0, 5)}...${addr.slice(-4)}`;

    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-end border-b-4 border-black pb-4 mb-2">
                <div>
                    <h1 className="text-3xl text-black font-black">{group.name}</h1>
                    <div className="flex gap-2 mt-2 items-center flex-wrap break-words max-w-full">
                        {group.members.map(m => (
                            <span key={m} className={`address-pill text-xs break-all ${m === address ? 'border-primary text-primary' : ''}`}>
                                {m === address ? 'You' : truncateAddress(m)}
                            </span>
                        ))}
                        {!isAddingMember ? (
                            <button onClick={() => setIsAddingMember(true)} className="btn btn-outline py-0.5 px-2 text-xs border-dashed text-muted">
                                <Plus size={12} /> Add
                            </button>
                        ) : (
                            <form onSubmit={addMemberToGroup} className="flex gap-1">
                                <input 
                                    className="input-field py-1 px-2 text-xs bg-black/50 w-32" 
                                    placeholder="Wallet G..." 
                                    value={newMemberAddress}
                                    onChange={e => setNewMemberAddress(e.target.value)}
                                />
                                <button type="submit" className="btn btn-primary py-1 px-2 text-xs">Save</button>
                                <button type="button" onClick={() => setIsAddingMember(false)} className="btn btn-outline py-1 px-2 text-xs">X</button>
                            </form>
                        )}
                    </div>
                </div>
            </div>

            <div className="group-grid relative">
                {/* Left Col: Expenses */}
                <div className="brutal-panel panel-pink flex flex-col overflow-hidden h-[75vh]">
                    <div className="flex justify-between items-center mb-4 border-b-2 border-black pb-2">
                        <h2 className="text-xl font-black">Expenses</h2>
                        {!isAddingExpense && (
                            <button className="btn btn-outline bg-white text-xs py-1" onClick={() => setIsAddingExpense(true)}>
                                <Plus size={14} /> Add
                            </button>
                        )}
                    </div>

                    {isAddingExpense && (
                        <form onSubmit={submitExpense} className="bg-white p-4 rounded border-2 border-black shadow-[2px_2px_0px_#000] mb-4 shrink-0">
                            {error && <div className="text-danger text-xs mb-2 font-bold">{error}</div>}
                            <div className="input-group">
                                <label className="input-label text-xs">Amount (XLM)</label>
                                <input 
                                    className="input-field py-1 text-sm" 
                                    type="number" 
                                    step="0.0000001" 
                                    value={amount} 
                                    onChange={e => setAmount(e.target.value)} 
                                    placeholder="100.5"
                                />
                            </div>
                            <div className="text-[10px] text-black font-bold mb-4 opacity-75">
                                Paid by you, split equally among all {group.members.length} members.
                            </div>
                            <div className="flex gap-2">
                                <button type="submit" className="btn btn-blue w-full text-xs py-1">Save</button>
                                <button type="button" className="btn btn-outline w-full text-xs py-1 border-dashed" onClick={() => setIsAddingExpense(false)}>Cancel</button>
                            </div>
                        </form>
                    )}

                    <div className="overflow-y-auto flex-1 pr-2">
                        {expenses.length === 0 ? (
                            <div className="text-black font-bold text-sm text-center mt-10 opacity-70">No expenses logged yet.</div>
                        ) : (
                            expenses.map(e => (
                                <div key={e.id} className="border-b-2 border-dashed border-black py-3 last:border-0">
                                    <div className="flex justify-between font-black">
                                        <span>{e.amount} XLM</span>
                                        <span className="text-xs opacity-75">{new Date(e.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <div className="text-xs font-bold mt-1">Paid by {e.payer === address ? 'You' : truncateAddress(e.payer)}</div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Middle Col: Balances & Settlement */}
                <div className="brutal-panel panel-blue flex flex-col h-[75vh] overflow-y-auto">
                    <h2 className="text-xl font-black mb-4">Pending Debts</h2>
                    
                    {debts.length === 0 ? (
                        <div className="text-center mt-10">
                            <CheckCircle size={48} className="mx-auto text-black mb-4 opacity-50" />
                            <div className="text-black font-black">All settled up!</div>
                            <div className="text-black text-sm mt-2 font-bold opacity-70">No outstanding debts in this group.</div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {debts.map((d, i) => {
                                const isCurrentUserDebt = d.from === address;
                                return (
                                    <div key={i} className="p-3 bg-white border-2 border-black rounded shadow-[2px_2px_0px_#000]">
                                        <div className="flex items-center justify-between font-mono text-sm mb-2">
                                            <span className={d.from === address ? 'text-danger font-bold' : 'font-bold'}>
                                                {d.from === address ? 'You' : truncateAddress(d.from)}
                                            </span>
                                            <ArrowRight size={14} className="text-black" />
                                            <span className={d.to === address ? 'text-success font-bold' : 'font-bold'}>
                                                {d.to === address ? 'You' : truncateAddress(d.to)}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="font-black text-lg">{d.amount} XLM</div>
                                            {isCurrentUserDebt ? (
                                                <button className="btn btn-pink text-xs py-1 px-2 uppercase bg-[var(--panel-bg-3)] border-2 border-black text-black shadow-[2px_2px_0px_#000] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all" onClick={() => setActiveDebt(d)}>
                                                    Settle Now
                                                </button>
                                            ) : (
                                                <span className="text-xs bg-black text-white px-2 py-1 rounded font-bold">Waiting</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <div className="mt-8 border-t-4 border-black pt-4">
                        <h2 className="text-xl font-black mb-4">Settlement History</h2>
                        {settlements.length === 0 ? (
                            <div className="text-center text-sm font-bold opacity-70">No payments have been made yet.</div>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {settlements.map(s => (
                                    <div key={s.id} className="p-2 bg-white border-2 border-black rounded text-sm shadow-[2px_2px_0px_#000]">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="font-bold text-success">+{s.amount} XLM</span>
                                            <span className="text-xs opacity-75">{new Date(s.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex items-center gap-1 font-mono text-xs mb-1">
                                            <span className="font-bold">{s.from_address === address ? 'You' : truncateAddress(s.from_address)}</span>
                                            <ArrowRight size={10} />
                                            <span className="font-bold">{s.to_address === address ? 'You' : truncateAddress(s.to_address)}</span>
                                        </div>
                                        <a 
                                            href={`https://stellarchain.io/transactions/${s.tx_hash}`}
                                            target="_blank" rel="noopener noreferrer"
                                            className="text-[10px] text-blue-600 font-bold border-b border-blue-600 block w-max mt-2"
                                            style={{ textDecoration: 'none' }}
                                        >
                                            View Tx Explorer
                                        </a>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Col: Live Chat */}
                <div className="brutal-panel panel-cream flex flex-col h-[75vh] overflow-hidden">
                    <h2 className="text-xl font-black mb-4 flex items-center gap-2 border-b-2 border-black pb-2">
                        <MessageSquare size={18} /> Group Chat
                    </h2>
                    
                    <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-2 mb-4">
                        {messages.length === 0 && <div className="text-black font-bold text-sm text-center mt-4 opacity-70">No messages yet.</div>}
                        {messages.map((m, i) => {
                            const isMe = m.sender === address;
                            return (
                                <div key={i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} mb-1`}>
                                    {!isMe && <span className="text-[10px] text-black font-bold ml-1 mb-[2px]">{truncateAddress(m.sender)}</span>}
                                    <div className={`chat-message text-sm ${isMe ? 'chat-self' : 'chat-other'}`}>
                                        {m.message}
                                    </div>
                                    {m.tx_hash && (
                                        <a 
                                            href={`https://stellarchain.io/transactions/${m.tx_hash}`} 
                                            target="_blank" rel="noopener noreferrer"
                                            className="text-[8px] text-blue-600 border-b border-blue-600 mt-1 opacity-60"
                                            style={{ textDecoration: 'none' }}
                                        >
                                            View Tx
                                        </a>
                                    )}
                                </div>
                            );
                        })}
                        <div ref={chatEndRef} />
                    </div>

                    <form onSubmit={sendChatMessage} className="flex gap-2 shrink-0">
                        <input 
                            className="input-field flex-1" 
                            type="text" 
                            placeholder={address ? "Type a message (max 28 chars)..." : "Connect wallet to chat"} 
                            value={chatMsg} 
                            onChange={e => setChatMsg(e.target.value)} 
                            disabled={!address || isSendingChat}
                            maxLength={28}
                        />
                        <button type="submit" className="btn btn-mint bg-[var(--panel-bg-2)] border-2 border-black shadow-[3px_3px_0px_#000] text-black font-bold" disabled={!address || isSendingChat}>
                            {isSendingChat ? '...' : 'Send'}
                        </button>
                    </form>
                </div>
            </div>

            {activeDebt && (
                <SettleModal 
                    debt={activeDebt} 
                    groupId={id} 
                    onClose={() => setActiveDebt(null)} 
                    onSettled={fetchGroupData} 
                />
            )}
        </div>
    );
}
