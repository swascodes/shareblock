# Shareblock - On-Chain Expense Splitter (Stellar Edition)

Shareblock is a full-stack dApp that allows groups to log shared expenses, simplify overlapping debts, and settle natively on the Stellar blockchain using the Freighter wallet.

## Features
- **Group Management:** Create groups and add participant wallets.
- **Expense Logging:** Log expenses paid by one person and split equally among the group.
- **Balance Simplification Engine:** Automatically simplifies O(N^2) debts into minimal transactions (e.g., if A owes B, and B owes C, A just owes C).
- **On-Chain Settlements:** Sign an XLM payment via Freighter. The transaction hash is stored as verifiable proof of settlement.
- **WebSocket Chat:** Real-time group chat and transaction notifications.

---

## 🚀 Quick Start (60 Second Demo)

### 1. Requirements
- Node.js installed
- **Freighter Extension** installed in your browser and switched to **Testnet**.
- Fund your Freighter wallet using [Stellar Friendbot](https://laboratory.stellar.org/#account-creator).

### 2. Run the App
From the root of this project, run:
```bash
npm install
npm start
```

This will concurrently start:
- Backend Server (Express, SQLite, Socket.io) on `http://localhost:3001`
- Frontend React App (Vite, Tailwind) on `http://localhost:5173`

### 3. Usage Flow
1. Open `http://localhost:5173`.
2. Connect your **Freighter** wallet in the top right.
3. Click **"New Group"** and add another test address as a member.
4. Add an expense (e.g. 100 XLM paid by YOU). It will distribute the debt.
5. You will see the other member owes you 50 XLM.
6. Connect as the other member (or simply test out the transaction) and click **"Settle Now"** to trigger a native Stellar payment.
7. Observe the balances settle to 0 in real-time.

---

## Tech Stack
- **Frontend:** React, Vite, Vanilla CSS Modules (Glassmorphism), `@stellar/freighter-api`, `stellar-sdk`.
- **Backend:** Node.js, Express, `sqlite3`, `socket.io`.
- **Blockchain:** Stellar Testnet.

## SQLite Database
The SQLite database file `shareblock.db` is auto-generated inside the `backend/` folder on first run.

## Caching Strategy
- Groups, Members, and Expenses are cached off-chain in SQLite.
- The `balanceEngine` parses expenses and settlements on the fly and simplifies the debt graph.
- All settlements are logged to the blockchain natively for timestamped immutability.
