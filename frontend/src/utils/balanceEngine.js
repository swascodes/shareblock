/**
 * Computes the net balances for all members in a group and simplifies the debts.
 * @param {Array} expenses 
 * @param {Array} expense_participants 
 * @param {Array} settlements 
 * @returns {Object} { balances: { address: number }, debts: [{ from, to, amount }] }
 */
function computeBalances(expenses, expense_participants, settlements) {
    const balances = {}; // positive means they are owed, negative means they owe

    // 1. Process expenses
    expenses.forEach(exp => {
        // Payer gets credit for the full amount
        balances[exp.payer] = (balances[exp.payer] || 0) + exp.amount;

        // Participants get debit for their share
        const participants = expense_participants.filter(p => p.expense_id === exp.id);
        participants.forEach(p => {
            balances[p.address] = (balances[p.address] || 0) - p.share;
        });
    });

    // 2. Process settlements
    settlements.forEach(s => {
        // from_address paid to_address, so from_address's balance increases (they owe less)
        balances[s.from_address] = (balances[s.from_address] || 0) + s.amount;
        // to_address received money, so their balance decreases
        balances[s.to_address] = (balances[s.to_address] || 0) - s.amount;
    });

    // Clean up tiny floating point issues
    for (const addr in balances) {
        balances[addr] = Math.round(balances[addr] * 10000000) / 10000000;
        if (Math.abs(balances[addr]) < 0.000001) {
            balances[addr] = 0;
        }
    }

    // 3. Simplify debts using greedy algorithm
    const debtors = [];
    const creditors = [];

    for (const [address, balance] of Object.entries(balances)) {
        if (balance < 0) debtors.push({ address, amount: -balance });
        else if (balance > 0) creditors.push({ address, amount: balance });
    }

    // Sort descending by amount to minimize transactions (largest debts settled first)
    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    const simplifiedDebts = [];
    let i = 0; // debtors index
    let j = 0; // creditors index

    while (i < debtors.length && j < creditors.length) {
        const debtor = debtors[i];
        const creditor = creditors[j];

        const settlementAmount = Math.min(debtor.amount, creditor.amount);

        simplifiedDebts.push({
            from: debtor.address,
            to: creditor.address,
            amount: settlementAmount
        });

        debtor.amount -= settlementAmount;
        creditor.amount -= settlementAmount;

        // Clean up float issues
        debtor.amount = Math.round(debtor.amount * 10000000) / 10000000;
        creditor.amount = Math.round(creditor.amount * 10000000) / 10000000;

        if (debtor.amount === 0) i++;
        if (creditor.amount === 0) j++;
    }

    return { balances, debts: simplifiedDebts };
}

export { computeBalances };
