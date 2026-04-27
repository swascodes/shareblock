#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String, Vec, symbol_short};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct GroupData {
    pub name: String,
    pub members: Vec<Address>,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ExpenseData {
    pub payer: Address,
    pub amount: i128,
    pub participants: Vec<Address>,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ChatData {
    pub sender: Address,
    pub message: String,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SettlementData {
    pub from: Address,
    pub to: Address,
    pub amount: i128,
    pub tx_hash: String,  // Stellar Horizon transaction hash for explorer link
}

#[contracttype]
pub enum DataKey {
    GroupCounter,
    Group(u32),
    Expenses(u32),
    Chats(u32),
    Settlements(u32),
}

#[contract]
pub struct ShareblockContract;

#[contractimpl]
impl ShareblockContract {
    /// Creates a new group, stores it, and emits a `GroupCreated` event.
    pub fn create_group(env: Env, name: String, creator: Address) -> u32 {
        creator.require_auth();

        let mut counter: u32 = env.storage().persistent().get(&DataKey::GroupCounter).unwrap_or(0);
        counter += 1;
        env.storage().persistent().set(&DataKey::GroupCounter, &counter);

        let mut members = Vec::new(&env);
        members.push_back(creator.clone());

        let group_data = GroupData {
            name: name.clone(),
            members,
        };

        env.storage().persistent().set(&DataKey::Group(counter), &group_data);

        // Emit event: ["GroupCreated", group_id], [name, creator]
        env.events().publish((symbol_short!("GrpCreate"), counter), (name, creator));

        counter
    }

    /// Retrieves a group's metadata.
    pub fn get_group(env: Env, group_id: u32) -> Option<GroupData> {
        env.storage().persistent().get(&DataKey::Group(group_id))
    }

    /// Adds a member to an existing group and emits a `MemberAdded` event.
    pub fn add_member(env: Env, group_id: u32, new_member: Address) {
        let mut group: GroupData = env.storage().persistent().get(&DataKey::Group(group_id)).unwrap();
        
        // Prevent duplicates
        if !group.members.contains(&new_member) {
            group.members.push_back(new_member.clone());
            env.storage().persistent().set(&DataKey::Group(group_id), &group);
            
            // Emit event
            env.events().publish((symbol_short!("MemAdded"), group_id), new_member);
        }
    }

    /// Logs an expense and stores it in Persistent State for easy retrieval by the frontend.
    pub fn log_expense(env: Env, group_id: u32, payer: Address, amount: i128, participants: Vec<Address>) {
        payer.require_auth();
        
        let expense = ExpenseData {
            payer: payer.clone(),
            amount,
            participants: participants.clone(),
        };

        let mut expenses: Vec<ExpenseData> = env.storage().persistent().get(&DataKey::Expenses(group_id)).unwrap_or(Vec::new(&env));
        expenses.push_back(expense);
        env.storage().persistent().set(&DataKey::Expenses(group_id), &expenses);

        // Emit event: ["ExpLogged", group_id], [payer, amount, participants]
        env.events().publish(
            (symbol_short!("ExpLogged"), group_id),
            (payer, amount, participants)
        );
    }

    /// Retrieves all expenses for a group
    pub fn get_expenses(env: Env, group_id: u32) -> Vec<ExpenseData> {
        env.storage().persistent().get(&DataKey::Expenses(group_id)).unwrap_or(Vec::new(&env))
    }

    /// Sends a chat message in a group
    pub fn send_chat(env: Env, group_id: u32, sender: Address, message: String) {
        sender.require_auth();
        
        let chat = ChatData {
            sender: sender.clone(),
            message,
        };

        let mut chats: Vec<ChatData> = env.storage().persistent().get(&DataKey::Chats(group_id)).unwrap_or(Vec::new(&env));
        chats.push_back(chat);
        env.storage().persistent().set(&DataKey::Chats(group_id), &chats);

        env.events().publish((symbol_short!("ChatSent"), group_id), sender);
    }

    /// Retrieves all chats for a group
    pub fn get_chats(env: Env, group_id: u32) -> Vec<ChatData> {
        env.storage().persistent().get(&DataKey::Chats(group_id)).unwrap_or(Vec::new(&env))
    }

    /// Logs a settlement with the Stellar transaction hash for explorer linking
    pub fn log_settlement(env: Env, group_id: u32, from: Address, to: Address, amount: i128, tx_hash: String) {
        from.require_auth();
        let s = SettlementData {
            from: from.clone(),
            to,
            amount,
            tx_hash,
        };
        let mut settlements: Vec<SettlementData> = env.storage().persistent().get(&DataKey::Settlements(group_id)).unwrap_or(Vec::new(&env));
        settlements.push_back(s);
        env.storage().persistent().set(&DataKey::Settlements(group_id), &settlements);
    }

    /// Retrieves all settlements
    pub fn get_settlements(env: Env, group_id: u32) -> Vec<SettlementData> {
        env.storage().persistent().get(&DataKey::Settlements(group_id)).unwrap_or(Vec::new(&env))
    }
}
