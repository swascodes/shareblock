# Shareblock — 100% On-Chain Expense Splitter ⛓️

Shareblock is a **fully decentralized** dApp for managing shared expenses and settling debts natively on the **Stellar blockchain** using **Soroban smart contracts**. There is no centralized backend, database, or server — all state lives on-chain.

**🌐 Live dApp:** [https://shareblock-drab.vercel.app/](https://shareblock-drab.vercel.app/)  
**📺 Demo Video:** [Watch on YouTube](https://youtu.be/5J1HcspLRTA?si=3AqGIKz8_oZ2_UcA)

---

## 📸 Snaps

<img width="1860" height="858" alt="Dashboard" src="https://github.com/user-attachments/assets/b2ed090c-f274-4531-912f-b059d9d168b0" />

<img width="1854" height="869" alt="Group View" src="https://github.com/user-attachments/assets/4261d4aa-0ce1-4a33-a803-c7a8544996f7" />

---

## ⛓️ Smart Contract (Soroban — Stellar Testnet)

All application state — groups, members, expenses, chat, and settlements — is stored **persistently on-chain** using a Soroban smart contract deployed to Stellar Testnet.

| Detail | Value |
|---|---|
| **Contract ID** | `CDBSJWLOVS2FT25PTGGI4QW2R2K3DXUF62WSQH7U5GLHTLKLIESELUEC` |
| **Network** | Stellar Testnet |
| **SDK** | `soroban-sdk` v22.0.0 |
| **Explorer** | [View on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CDBSJWLOVS2FT25PTGGI4QW2R2K3DXUF62WSQH7U5GLHTLKLIESELUEC) |

### Contract Functions

| Function | Description |
|---|---|
| `create_group(name, creator)` | Creates a new on-chain group, returns group ID |
| `add_member(group_id, new_member)` | Adds a wallet address to a group |
| `log_expense(group_id, payer, amount, participants)` | Records a shared expense |
| `log_settlement(group_id, from, to, amount, tx_hash)` | Records a completed settlement with Horizon tx hash |
| `send_chat(group_id, sender, message)` | Sends a chat message stored on-chain |
| `get_group / get_expenses / get_chats / get_settlements` | State read-only getters |

---

## ✨ Features

- **🏗️ 100% On-Chain:** No SQLite, no Express backend — all state is stored persistently in a Soroban smart contract.
- **👥 Group Management:** Create groups and add participant wallets with Ed25519 key validation.
- **💸 Expense Logging:** Log expenses and split them equally among group members — all signed to the blockchain.
- **🧮 Debt Simplification Engine:** Automatically simplifies debts using a greedy min-cost-flow algorithm (e.g., A→B→C becomes A→C).
- **✅ Settlement History:** Every completed debt settlement is stored on-chain with the Stellar transaction hash, viewable on [Stellarchain.io](https://testnet.stellarchain.io).
- **🔗 Explorer Links:** Click the **Tx** badge on any settlement to jump directly to the transaction on Stellarchain.io.
- **💬 On-Chain Group Chat:** Every chat message is signed and stored on the Soroban smart contract.
- **🎨 Neo-Brutalism UI:** Bold borders, vibrant yellow palette, chunky shadows, and smooth micro-animations.

---

## 🚀 Quick Start

### Requirements
- Node.js 18+
- [Freighter Wallet Extension](https://www.freighter.app/) in your browser, switched to **Testnet**
- Fund your wallet via [Stellar Friendbot](https://laboratory.stellar.org/#account-creator)

### Run Locally
```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### Usage Flow
1. Connect your **Freighter** wallet (top right).
2. Click **"New Group"**, enter a name, add member wallet addresses, and sign.
3. Inside a group, click **"Add Expense"** → enter an XLM amount → sign with Freighter.
4. View **Pending Debts** — debts are auto-simplified by the balance engine.
5. Click **"Settle Now"** → sign 2 transactions (XLM payment + on-chain record).
6. Switch to the **History** tab to see the completed settlement with a **Tx** link to Stellarchain.io.
7. Use the **Group Chat** — every message requires a Freighter signature.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Smart Contract** | Rust, `soroban-sdk` v22.0.0 |
| **Frontend** | React 19, Vite 8, Vanilla CSS (Neo-Brutalism) |
| **Wallet** | `@creit.tech/stellar-wallets-kit`, `@stellar/freighter-api` |
| **Stellar SDK** | `@stellar/stellar-sdk` v14.6.1 |
| **Deployment** | Vercel (Frontend), Stellar Testnet (Contract) |

---

## 🔗 Stellar Explorer

Every settlement links directly to the transaction on **Stellarchain.io**:

> `https://testnet.stellarchain.io/transactions/{tx_hash}`

Click any **Tx** button in the Settlement History tab inside the dApp.
