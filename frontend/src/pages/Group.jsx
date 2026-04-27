import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWallet } from '../context/WalletContext';
import SettleModal from '../components/SettleModal';
import { ArrowRight, MessageSquare, Plus, CheckCircle, ExternalLink, History } from 'lucide-react';
import { Client } from 'shareblock';
import { computeBalances } from '../utils/balanceEngine';
import { signWithFreighter } from '../utils/signer';

const contract = new Client({
    networkPassphrase: 'Test SDF Network ; September 2015',
    contractId: 'CDBSJWLOVS2FT25PTGGI4QW2R2K3DXUF62WSQH7U5GLHTLKLIESELUEC',
    rpcUrl: 'https://soroban-testnet.stellar.org'
});

export default function Group() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { address } = useWallet();

    const [group, setGroup] = useState(null);
    const [expenses, setExpenses] = useState([]);
    const [balances, setBalances] = useState({});
    const [debts, setDebts] = useState([]);
    const [settlements, setSettlements] = useState([]);
    const [messages, setMessages] = useState([]);
    const [activeTab, setActiveTab] = useState('debts'); // 'debts' | 'history'

    const [chatMsg, setChatMsg] = useState('');
    const chatEndRef = useRef(null);

    const [isAddingExpense, setIsAddingExpense] = useState(false);
    const [amount, setAmount] = useState('');
    const [error, setError] = useState('');

    const [newMemberAddress, setNewMemberAddress] = useState('');
    const [isAddingMember, setIsAddingMember] = useState(false);
    const [activeDebt, setActiveDebt] = useState(null);
    const [isSendingChat, setIsSendingChat] = useState(false);

    const fetchGroupData = async () => {
        try {
            const tx = await contract.get_group({ group_id: Number(id) });
            if (!tx.result) throw new Error('Group not found');
            setGroup({ id, name: tx.result.name, members: tx.result.members });

            const expTx = await contract.get_expenses({ group_id: Number(id) });
            const rawExpenses = expTx.result || [];

            const parsedExpenses = [];
            const parsedParticipants = [];
            rawExpenses.forEach((e, idx) => {
                const amt = Number(e.amount) / 10000000;
                parsedExpenses.push({ id: idx, payer: e.payer, amount: amt, created_at: Date.now() });
                e.participants.forEach(p => {
                    parsedParticipants.push({ expense_id: idx, address: p, share: amt / e.participants.length });
                });
            });
            setExpenses(parsedExpenses);

            const settleTx = await contract.get_settlements({ group_id: Number(id) });
            const rawSettlements = settleTx.result || [];
            const parsedSettlements = rawSettlements.map(s => ({
                from_address: s.from,
                to_address: s.to,
                amount: Number(s.amount) / 10000000,
                tx_hash: s.tx_hash,
            }));
            setSettlements(parsedSettlements);

            const { balances, debts } = computeBalances(parsedExpenses, parsedParticipants, parsedSettlements);
            setBalances(balances);
            setDebts(debts);

            const chatTx = await contract.get_chats({ group_id: Number(id) });
            setMessages(chatTx.result || []);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchGroupData();
        const interval = setInterval(fetchGroupData, 5000);
        return () => clearInterval(interval);
    }, [id]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendChatMessage = async (e) => {
        e.preventDefault();
        if (!chatMsg.trim() || !address) return;
        setIsSendingChat(true);
        try {
            const tx = await contract.send_chat({ group_id: Number(id), sender: address, message: chatMsg }, { publicKey: address });
            await tx.signAndSend({
                signTransaction: (xdr) => signWithFreighter(xdr, address)
            });
            setChatMsg('');
            fetchGroupData();
        } catch (err) {
            console.error("Failed to send chat:", err);
            alert("Chat failed: " + err.message);
        } finally {
            setIsSendingChat(false);
        }
    };

    const submitExpense = async (e) => {
        e.preventDefault();
        setError('');
        if (!amount || amount <= 0) return setError('Amount > 0 required');
        try {
            const stroops = BigInt(Math.round(parseFloat(amount) * 10000000));
            const tx = await contract.log_expense({
                group_id: Number(id),
                payer: address,
                amount: stroops,
                participants: group.members
            }, { publicKey: address });
            await tx.signAndSend({
                signTransaction: (xdr) => signWithFreighter(xdr, address)
            });
            setAmount('');
            setIsAddingExpense(false);
            fetchGroupData();
        } catch (err) {
            setError(err.message);
        }
    };

    const addMemberToGroup = async (e) => {
        e.preventDefault();
        if (!newMemberAddress) return;
        try {
            const tx = await contract.add_member({ group_id: Number(id), new_member: newMemberAddress }, { publicKey: address });
            await tx.signAndSend({
                signTransaction: (xdr) => signWithFreighter(xdr, address)
            });
            setNewMemberAddress('');
            setIsAddingMember(false);
            fetchGroupData();
        } catch (err) {
            console.error(err);
        }
    };

    if (!group) return <div className="text-center mt-20 text-muted font-bold text-xl animate-pulse">Loading On-Chain Group...</div>;

    const truncateAddress = (addr) => `${addr.slice(0, 5)}...${addr.slice(-4)}`;
    const stellarExplorerUrl = (hash) => `https://testnet.stellarchain.io/transactions/${hash}`;

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
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
                                    className="input-field py-1 px-2 text-xs bg-black/50 w-40"
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
                                <button type="submit" className="btn btn-blue w-full text-xs py-1">Save On-Chain</button>
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
                                        <span>{e.amount.toFixed(7)} XLM</span>
                                        <span className="text-xs opacity-75 bg-black text-white px-1 rounded">On-Chain</span>
                                    </div>
                                    <div className="text-xs font-bold mt-1">Paid by {e.payer === address ? 'You' : truncateAddress(e.payer)}</div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Middle Col: Debts + History */}
                <div className="brutal-panel panel-blue flex flex-col h-[75vh] overflow-hidden">
                    {/* Tab bar */}
                    <div className="flex border-b-2 border-black mb-4 shrink-0">
                        <button
                            onClick={() => setActiveTab('debts')}
                            className={`flex-1 py-2 text-sm font-black border-r-2 border-black transition-colors ${activeTab === 'debts' ? 'bg-black text-white' : 'bg-white text-black hover:bg-black/10'}`}
                        >
                            Pending Debts
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`flex-1 py-2 text-sm font-black flex items-center justify-center gap-1 transition-colors ${activeTab === 'history' ? 'bg-black text-white' : 'bg-white text-black hover:bg-black/10'}`}
                        >
                            <History size={14} /> History
                            {settlements.length > 0 && (
                                <span className={`text-xs rounded-full px-1.5 py-0.5 font-bold ${activeTab === 'history' ? 'bg-white text-black' : 'bg-black text-white'}`}>
                                    {settlements.length}
                                </span>
                            )}
                        </button>
                    </div>

                    <div className="overflow-y-auto flex-1">
                        {activeTab === 'debts' ? (
                            debts.length === 0 ? (
                                <div className="text-center mt-10">
                                    <CheckCircle size={48} className="mx-auto text-black mb-4 opacity-50" />
                                    <div className="text-black font-black">All settled up!</div>
                                    <div className="text-black text-sm mt-2 font-bold opacity-70">No outstanding debts.</div>
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
                                                    <div className="font-black text-lg">{d.amount.toFixed(4)} XLM</div>
                                                    {isCurrentUserDebt ? (
                                                        <button
                                                            className="btn text-xs py-1 px-2 uppercase bg-[var(--panel-bg-3)] border-2 border-black text-black shadow-[2px_2px_0px_#000] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all font-black"
                                                            onClick={() => setActiveDebt(d)}
                                                        >
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
                            )
                        ) : (
                            /* Settlement History Tab */
                            settlements.length === 0 ? (
                                <div className="text-center mt-10">
                                    <History size={48} className="mx-auto text-black mb-4 opacity-50" />
                                    <div className="text-black font-black">No settlements yet</div>
                                    <div className="text-black text-sm mt-2 font-bold opacity-70">Completed settlements will appear here.</div>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    {[...settlements].reverse().map((s, i) => (
                                        <div key={i} className="p-3 bg-white border-2 border-black rounded shadow-[2px_2px_0px_#000]">
                                            <div className="flex items-center justify-between font-mono text-xs mb-2">
                                                <span className={`font-bold ${s.from_address === address ? 'text-danger' : ''}`}>
                                                    {s.from_address === address ? 'You' : truncateAddress(s.from_address)}
                                                </span>
                                                <ArrowRight size={12} className="text-black" />
                                                <span className={`font-bold ${s.to_address === address ? 'text-success' : ''}`}>
                                                    {s.to_address === address ? 'You' : truncateAddress(s.to_address)}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div className="font-black">{s.amount.toFixed(4)} XLM</div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[10px] bg-green-100 text-green-800 border border-green-400 px-1.5 py-0.5 rounded font-bold">✓ Settled</span>
                                                    {s.tx_hash && (
                                                        <a
                                                            href={stellarExplorerUrl(s.tx_hash)}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-1 text-[10px] bg-black text-white px-1.5 py-0.5 rounded font-bold hover:bg-gray-800 transition-colors"
                                                            title="View on Stellarchain.io"
                                                        >
                                                            <ExternalLink size={10} /> Tx
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                            {s.tx_hash && (
                                                <div className="mt-1.5 text-[9px] font-mono text-gray-500 truncate" title={s.tx_hash}>
                                                    {s.tx_hash}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )
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
                                </div>
                            );
                        })}
                        <div ref={chatEndRef} />
                    </div>

                    <form onSubmit={sendChatMessage} className="flex gap-2 shrink-0">
                        <input
                            className="input-field flex-1"
                            type="text"
                            placeholder={address ? "Type a message..." : "Connect wallet to chat"}
                            value={chatMsg}
                            onChange={e => setChatMsg(e.target.value)}
                            disabled={!address || isSendingChat}
                        />
                        <button
                            type="submit"
                            className="btn btn-mint bg-[var(--panel-bg-2)] border-2 border-black shadow-[3px_3px_0px_#000] text-black font-bold"
                            disabled={!address || isSendingChat}
                        >
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
                    onSettled={() => {
                        fetchGroupData();
                        setActiveDebt(null);
                        setActiveTab('history'); // Auto-switch to history after settling
                    }}
                />
            )}
        </div>
    );
}
