import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../context/WalletContext';
import { PlusCircle, Users } from 'lucide-react';

export default function Dashboard() {
    const { address } = useWallet();
    const navigate = useNavigate();
    const [groups, setGroups] = useState([]);
    const [isCreating, setIsCreating] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [newMember, setNewMember] = useState('');
    const [members, setMembers] = useState([]);

    useEffect(() => {
        if (address && !members.includes(address)) {
            setMembers([address]);
        }
    }, [address]);

    useEffect(() => {
        fetch('http://localhost:3001/api/groups')
            .then(res => res.json())
            .then(data => {
                // simple client side filter
                if (address) {
                    // Ideally the backend filters by member, but for MVP we fetch all and filter or just show all
                    setGroups(data);
                } else {
                    setGroups(data); // show public groups for demo
                }
            })
            .catch(console.error);
    }, [address]);

    const addMember = () => {
        if (newMember && !members.includes(newMember)) {
            setMembers([...members, newMember]);
            setNewMember('');
        }
    };

    const createGroup = async (e) => {
        e.preventDefault();
        if (!newGroupName || members.length < 1) return;

        try {
            const res = await fetch('http://localhost:3001/api/groups', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newGroupName, members })
            });
            const data = await res.json();
            navigate(`/group/${data.id}`);
        } catch (err) {
            console.error('Failed to create group', err);
        }
    };

    return (
        <div className="flex flex-col gap-8">
            <div className="flex justify-between items-center brutal-panel panel-lavender p-6">
                <div>
                    <h1 className="text-3xl text-black font-black">Your Groups</h1>
                    <p className="text-muted mt-2 font-bold">Manage shared expenses effortlessly.</p>
                </div>
                <button className="btn btn-primary" onClick={() => setIsCreating(true)}>
                    <PlusCircle size={20} /> New Group
                </button>
            </div>

            {isCreating && (
                <div className="brutal-panel panel-cream mt-4 mb-4">
                    <h2 className="text-xl mb-4 text-black flex items-center gap-2">
                        <Users size={24} /> Create New Group
                    </h2>
                    <form onSubmit={createGroup}>
                        <div className="input-group">
                            <label className="input-label">Group Name</label>
                            <input 
                                className="input-field" 
                                placeholder="Trip to Bali" 
                                value={newGroupName} 
                                onChange={e => setNewGroupName(e.target.value)} 
                                required
                            />
                        </div>

                        <div className="input-group mt-4">
                            <label className="input-label">Add Member (Wallet Address)</label>
                            <div className="flex gap-2">
                                <input 
                                    className="input-field w-full" 
                                    placeholder="G..." 
                                    value={newMember} 
                                    onChange={e => setNewMember(e.target.value)} 
                                />
                                <button type="button" className="btn btn-outline" onClick={addMember}>Add</button>
                            </div>
                        </div>

                        <div className="flex gap-2 flex-wrap mb-4 mt-2">
                            {members.map(m => (
                                <span key={m} className="address-pill bg-white text-black">
                                    {m === address ? 'You' : `${m.slice(0,4)}...${m.slice(-4)}`}
                                </span>
                            ))}
                        </div>

                        <div className="flex gap-4 mt-4">
                            <button type="submit" className="btn btn-primary">Create On-Chain Group</button>
                            <button type="button" className="btn btn-outline" onClick={() => setIsCreating(false)}>Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid md:grid-cols-2 gap-6">
                {groups.length === 0 ? (
                    <div className="text-black font-bold col-span-2 text-center mt-8 text-xl">No groups found. Create one to get started!</div>
                ) : (
                    groups.map((g, index) => {
                        const panels = ['panel-blue', 'panel-mint', 'panel-pink', 'panel-lavender'];
                        const panelClass = panels[index % panels.length];
                        return (
                            <div key={g.id} className={`brutal-panel ${panelClass} cursor-pointer`} onClick={() => navigate(`/group/${g.id}`)}>
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="text-xl font-black">{g.name}</h3>
                                    <span className="text-xs font-bold border-b-2 border-black pb-1">{new Date(g.created_at).toLocaleDateString()}</span>
                                </div>
                                <p className="text-sm font-bold mt-4 mb-4">On-chain settlement ready</p>
                                <button className="btn btn-outline w-full mt-2 text-sm bg-white" onClick={(e) => { e.stopPropagation(); navigate(`/group/${g.id}`); }}>View Details</button>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
