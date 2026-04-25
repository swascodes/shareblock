const express = require('express');
const cors = require('cors');
const { randomUUID, createHash } = require('crypto');
const { dbRun, dbAll, dbGet } = require('./database');
const { computeBalances } = require('./balanceEngine');

const router = express.Router();

// Generate a simple hash of the expense
function generateExpenseHash(groupId, payer, amount, participants) {
    const data = `${groupId}:${payer}:${amount}:${participants.sort().join(',')}:${Date.now()}`;
    return createHash('sha256').update(data).digest('hex');
}

// 1. Create a new group
router.post('/groups', async (req, res) => {
    try {
        const { name, members } = req.body;
        if (!name || !members || !Array.isArray(members) || members.length < 1) {
            return res.status(400).json({ error: 'Invalid group data' });
        }

        const groupId = randomUUID();
        await dbRun('INSERT INTO groups (id, name) VALUES (?, ?)', [groupId, name]);

        for (const address of members) {
            await dbRun('INSERT INTO group_members (group_id, address) VALUES (?, ?)', [groupId, address]);
        }

        res.status(201).json({ id: groupId, name, members });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 2. Get all groups
router.get('/groups', async (req, res) => {
    try {
        const groups = await dbAll('SELECT * FROM groups ORDER BY created_at DESC');
        res.json(groups);
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 3. Get group details (including balances and debts)
router.get('/groups/:id', async (req, res) => {
    try {
        const groupId = req.params.id;
        
        const group = await dbGet('SELECT * FROM groups WHERE id = ?', [groupId]);
        if (!group) return res.status(404).json({ error: 'Group not found' });

        const members = await dbAll('SELECT address FROM group_members WHERE group_id = ?', [groupId]);
        group.members = members.map(m => m.address);

        const expenses = await dbAll('SELECT * FROM expenses WHERE group_id = ? ORDER BY created_at DESC', [groupId]);
        const expenseParticipants = await dbAll('SELECT * FROM expense_participants WHERE expense_id IN (SELECT id FROM expenses WHERE group_id = ?)', [groupId]);
        const settlements = await dbAll('SELECT * FROM settlements WHERE group_id = ? ORDER BY created_at DESC', [groupId]);

        // Embed participants into expenses
        const expensesWithParts = expenses.map(e => ({
            ...e,
            participants: expenseParticipants.filter(ep => ep.expense_id === e.id)
        }));

        const { balances, debts } = computeBalances(expenses, expenseParticipants, settlements);

        res.json({
            ...group,
            expenses: expensesWithParts,
            settlements,
            balances,
            debts
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 3.5. Add member to existing group
router.post('/groups/:id/members', async (req, res) => {
    try {
        const groupId = req.params.id;
        const { address } = req.body;
        
        if (!address) return res.status(400).json({ error: 'Address required' });

        const group = await dbGet('SELECT * FROM groups WHERE id = ?', [groupId]);
        if (!group) return res.status(404).json({ error: 'Group not found' });

        // Add member (ignore if exists due to PRIMARY KEY constraint)
        await dbRun('INSERT OR IGNORE INTO group_members (group_id, address) VALUES (?, ?)', [groupId, address]);

        // Notify over websocket so UI updates
        const io = req.app.get('socketio');
        if (io) {
            io.to(groupId).emit('member_added', { group_id: groupId, address });
        }

        res.status(200).json({ success: true, address });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 4. Log an expense
router.post('/expenses', async (req, res) => {
    try {
        const { group_id, payer, amount, participants } = req.body;

        if (!group_id || !payer || amount <= 0 || !Array.isArray(participants) || participants.length === 0) {
            return res.status(400).json({ error: 'Invalid expense data. Amount must be > 0 and at least 1 participant.' });
        }

        // Reject self-expense only
        if (participants.length === 1 && participants[0] === payer) {
            return res.status(400).json({ error: 'Cannot log an expense paid only for yourself.' });
        }

        // Validate members
        const members = await dbAll('SELECT address FROM group_members WHERE group_id = ?', [group_id]);
        const memberKeys = members.map(m => m.address);
        
        if (!memberKeys.includes(payer)) return res.status(400).json({ error: 'Payer not in group' });
        for (const p of participants) {
            if (!memberKeys.includes(p)) return res.status(400).json({ error: 'Participant not in group' });
        }

        const expenseId = randomUUID();
        const hash = generateExpenseHash(group_id, payer, amount, participants);

        await dbRun('INSERT INTO expenses (id, group_id, payer, amount, hash) VALUES (?, ?, ?, ?, ?)', 
            [expenseId, group_id, payer, amount, hash]);

        const share = amount / participants.length;
        for (const p of participants) {
            await dbRun('INSERT INTO expense_participants (expense_id, address, share) VALUES (?, ?, ?)', 
                [expenseId, p, share]);
        }

        // Emit socket event
        const io = req.app.get('socketio');
        if (io) {
            io.to(group_id).emit('expense_added', { id: expenseId, group_id, payer, amount, hash });
        }

        res.status(201).json({ id: expenseId, hash });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 5. Log a settlement (after tx hash is generated by client)
router.post('/settlements', async (req, res) => {
    try {
        const { group_id, from_address, to_address, amount, tx_hash } = req.body;

        if (!group_id || !from_address || !to_address || amount <= 0 || !tx_hash) {
            return res.status(400).json({ error: 'Invalid settlement data' });
        }

        const id = randomUUID();
        await dbRun('INSERT INTO settlements (id, group_id, from_address, to_address, amount, tx_hash) VALUES (?, ?, ?, ?, ?, ?)', 
            [id, group_id, from_address, to_address, amount, tx_hash]);

        const io = req.app.get('socketio');
        if (io) {
            io.to(group_id).emit('settlement_added', { id, group_id, from_address, to_address, amount, tx_hash });
        }

        res.status(201).json({ id, tx_hash });
    } catch (err) {
        console.error(err);
        if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'Settlement hash already exists' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Chat history
router.get('/groups/:id/chat', async (req, res) => {
    try {
        const messages = await dbAll('SELECT * FROM chat_messages WHERE group_id = ? ORDER BY created_at ASC', [req.params.id]);
        res.json(messages);
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
