# Shareblock - On-Chain Expense Splitter 

Shareblock is a full-stack dApp that allows groups to log shared expenses, simplify overlapping debts, and settle natively on the Stellar blockchain using the Freighter wallet.

## 📺 Demo Video
**Watch the live demonstration here->** [Watch on youtube]( https://youtu.be/5J1HcspLRTA?si=3AqGIKz8_oZ2_UcA)



## 🚀 Snaps:

<img width="1860" height="858" alt="image" src="https://github.com/user-attachments/assets/b2ed090c-f274-4531-912f-b059d9d168b0" />

## 
<img width="1854" height="869" alt="image" src="https://github.com/user-attachments/assets/4261d4aa-0ce1-4a33-a803-c7a8544996f7" />

## 🔗 Stellar Integration & Contracts

All monetary settlements and chat messaging operations are built directly upon native Stellar operations and rely on exact transaction hashes for immutability.

| Feature / Mechanism | Blockchain Network | Operational Paradigm | Explorer Link |
| --- | --- | --- | --- |
| **Settlement Clearing** | Stellar Testnet | Native XLM P2P Transfers | [Stellarchain.io](https://stellarchain.io) |
| **On-Chain Group Chat** | Stellar Testnet | 0.0000001 XLM Tx + `Memo.text` (Max 28 Bytes) | [Stellarchain.io](https://stellarchain.io) |

*(Note: Click any `View Tx` link inside the dApp to be instantly bridged to the specific transaction on Stellarchain.io)*

---

## Features
- **Group Management:** Create groups and securely add participant wallets with strict validation.
- **Expense Logging:** Log expenses paid by one person and split equally among the group.
- **Balance Simplification Engine:** Automatically simplifies O(N^2) debts into minimal transactions (e.g., if A owes B, and B owes C, A just owes C).
- **On-Chain Settlements:** Sign an XLM payment via Freighter. The transaction hash is stored as verifiable proof of settlement and linked natively to the blockchain explorer.
- **On-Chain Blockchain Chat:** Real-time group chat where every single text message is signed and pushed to the Stellar blockchain via a native Transaction Memo payload.
- **Garbage Data Prevention:** Strict cryptographic validations rejecting invalid Ed25519 Public Keys from polluting the member arrays.
- **Neo-Brutalism UI:** A striking, ultra-modern dynamic aesthetic focusing on brutalist boundaries, vibrant yellow canvases, and soft pastel block scaling.

---



## 🚀 Quick Start 

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
6. Test out the Chat! Every message will prompt a Freighter signature to store it on-chain.
7. Connect as the other member (or simply test out the transaction) and click **"Settle Now"** to trigger a native Stellar payment.
8. Observe the balances settle to 0 in real-time.

---

## Tech Stack
- **Frontend:** React, Vite, Vanilla CSS Modules (Neo-Brutalism), `@creit.tech/stellar-wallets-kit`, `stellar-sdk`.
- **Backend:** Node.js, Express, `sqlite3`, `socket.io`.
- **Blockchain:** Stellar Testnet.

## SQLite Database
The SQLite database file `shareblock.db` is auto-generated inside the `backend/` folder on first run.

## Caching Strategy
- Groups, Members, and Expenses are cached off-chain in SQLite.
- The `balanceEngine` parses expenses and settlements on the fly and simplifies the debt graph.
- All settlements and chat messages are logged to the blockchain natively for timestamped immutability.
