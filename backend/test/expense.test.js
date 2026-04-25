const { computeBalances } = require('../balanceEngine');

describe('balanceEngine', () => {
    it('should correctly calculate balances and simplify debts', () => {
        const expenses = [
            { id: 'e1', group_id: 'g1', payer: 'A', amount: 100 }
        ];
        
        const expenseParticipants = [
            { expense_id: 'e1', address: 'A', share: 50 },
            { expense_id: 'e1', address: 'B', share: 50 }
        ];

        const settlements = [];

        const result = computeBalances(expenses, expenseParticipants, settlements);

        expect(result.balances['A']).toBe(50); // A paid 100, owes 50 -> +50
        expect(result.balances['B']).toBe(-50); // B paid 0, owes 50 -> -50

        expect(result.debts).toHaveLength(1);
        expect(result.debts[0]).toEqual({
            from: 'B',
            to: 'A',
            amount: 50
        });
    });

    it('should reduce debts correctly after a settlement', () => {
        const expenses = [
            { id: 'e1', group_id: 'g1', payer: 'A', amount: 100 }
        ];
        
        const expenseParticipants = [
            { expense_id: 'e1', address: 'A', share: 50 },
            { expense_id: 'e1', address: 'B', share: 50 }
        ];

        const settlements = [
            { id: 's1', group_id: 'g1', from_address: 'B', to_address: 'A', amount: 25 }
        ];

        const result = computeBalances(expenses, expenseParticipants, settlements);

        expect(result.balances['A']).toBe(25); // Was 50, got 25 -> 25
        expect(result.balances['B']).toBe(-25); // Was -50, paid 25 -> -25

        expect(result.debts).toHaveLength(1);
        expect(result.debts[0]).toEqual({
            from: 'B',
            to: 'A',
            amount: 25
        });
    });

    it('should eliminate debts if fully settled', () => {
        const expenses = [
            { id: 'e1', group_id: 'g1', payer: 'A', amount: 100 }
        ];
        
        const expenseParticipants = [
            { expense_id: 'e1', address: 'A', share: 50 },
            { expense_id: 'e1', address: 'B', share: 50 }
        ];

        const settlements = [
            { id: 's1', group_id: 'g1', from_address: 'B', to_address: 'A', amount: 50 }
        ];

        const result = computeBalances(expenses, expenseParticipants, settlements);

        expect(result.balances['A']).toBe(0);
        expect(result.balances['B']).toBe(0);

        expect(result.debts).toHaveLength(0);
    });

    it('should resolve cyclic debts natively (graph simplification)', () => {
        // A pays for B, B pays for C, C pays for A
        // A -> 30 for [A,B], B -> 30 for [B,C], C -> 30 for [C,A]
        const expenses = [
            { id: 'e1', group_id: 'g1', payer: 'A', amount: 30 },
            { id: 'e2', group_id: 'g1', payer: 'B', amount: 30 },
            { id: 'e3', group_id: 'g1', payer: 'C', amount: 30 },
        ];
        
        const expenseParticipants = [
            { expense_id: 'e1', address: 'A', share: 15 },
            { expense_id: 'e1', address: 'B', share: 15 },
            
            { expense_id: 'e2', address: 'B', share: 15 },
            { expense_id: 'e2', address: 'C', share: 15 },

            { expense_id: 'e3', address: 'C', share: 15 },
            { expense_id: 'e3', address: 'A', share: 15 },
        ];

        const settlements = [];

        const result = computeBalances(expenses, expenseParticipants, settlements);

        expect(result.balances['A']).toBe(0);
        expect(result.balances['B']).toBe(0);
        expect(result.balances['C']).toBe(0);

        expect(result.debts).toHaveLength(0);
    });
});
