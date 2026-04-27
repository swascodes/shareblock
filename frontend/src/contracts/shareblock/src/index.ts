import { Buffer } from "buffer";
import { Address } from "@stellar/stellar-sdk";
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
  Spec as ContractSpec,
} from "@stellar/stellar-sdk/contract";
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  
  
} from "@stellar/stellar-sdk/contract";
export * from "@stellar/stellar-sdk";
export * as contract from "@stellar/stellar-sdk/contract";
export * as rpc from "@stellar/stellar-sdk/rpc";

if (typeof window !== "undefined") {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}


export const networks = {
  testnet: {
    networkPassphrase: "Test SDF Network ; September 2015",
    contractId: "CDBSJWLOVS2FT25PTGGI4QW2R2K3DXUF62WSQH7U5GLHTLKLIESELUEC",
  }
} as const

export type DataKey = {tag: "GroupCounter", values: void} | {tag: "Group", values: readonly [u32]} | {tag: "Expenses", values: readonly [u32]} | {tag: "Chats", values: readonly [u32]} | {tag: "Settlements", values: readonly [u32]};


export interface ChatData {
  message: string;
  sender: string;
}


export interface GroupData {
  members: Array<string>;
  name: string;
}


export interface ExpenseData {
  amount: i128;
  participants: Array<string>;
  payer: string;
}


export interface SettlementData {
  amount: i128;
  from: string;
  to: string;
  tx_hash: string;
}

export interface Client {
  /**
   * Construct and simulate a get_chats transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Retrieves all chats for a group
   */
  get_chats: ({group_id}: {group_id: u32}, options?: MethodOptions) => Promise<AssembledTransaction<Array<ChatData>>>

  /**
   * Construct and simulate a get_group transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Retrieves a group's metadata.
   */
  get_group: ({group_id}: {group_id: u32}, options?: MethodOptions) => Promise<AssembledTransaction<Option<GroupData>>>

  /**
   * Construct and simulate a send_chat transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Sends a chat message in a group
   */
  send_chat: ({group_id, sender, message}: {group_id: u32, sender: string, message: string}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a add_member transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Adds a member to an existing group and emits a `MemberAdded` event.
   */
  add_member: ({group_id, new_member}: {group_id: u32, new_member: string}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a log_expense transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Logs an expense and stores it in Persistent State for easy retrieval by the frontend.
   */
  log_expense: ({group_id, payer, amount, participants}: {group_id: u32, payer: string, amount: i128, participants: Array<string>}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a create_group transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Creates a new group, stores it, and emits a `GroupCreated` event.
   */
  create_group: ({name, creator}: {name: string, creator: string}, options?: MethodOptions) => Promise<AssembledTransaction<u32>>

  /**
   * Construct and simulate a get_expenses transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Retrieves all expenses for a group
   */
  get_expenses: ({group_id}: {group_id: u32}, options?: MethodOptions) => Promise<AssembledTransaction<Array<ExpenseData>>>

  /**
   * Construct and simulate a log_settlement transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Logs a settlement with the Stellar transaction hash for explorer linking
   */
  log_settlement: ({group_id, from, to, amount, tx_hash}: {group_id: u32, from: string, to: string, amount: i128, tx_hash: string}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a get_settlements transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Retrieves all settlements
   */
  get_settlements: ({group_id}: {group_id: u32}, options?: MethodOptions) => Promise<AssembledTransaction<Array<SettlementData>>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
      }
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy(null, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAAAAAAAB9SZXRyaWV2ZXMgYWxsIGNoYXRzIGZvciBhIGdyb3VwAAAAAAlnZXRfY2hhdHMAAAAAAAABAAAAAAAAAAhncm91cF9pZAAAAAQAAAABAAAD6gAAB9AAAAAIQ2hhdERhdGE=",
        "AAAAAAAAAB1SZXRyaWV2ZXMgYSBncm91cCdzIG1ldGFkYXRhLgAAAAAAAAlnZXRfZ3JvdXAAAAAAAAABAAAAAAAAAAhncm91cF9pZAAAAAQAAAABAAAD6AAAB9AAAAAJR3JvdXBEYXRhAAAA",
        "AAAAAAAAAB9TZW5kcyBhIGNoYXQgbWVzc2FnZSBpbiBhIGdyb3VwAAAAAAlzZW5kX2NoYXQAAAAAAAADAAAAAAAAAAhncm91cF9pZAAAAAQAAAAAAAAABnNlbmRlcgAAAAAAEwAAAAAAAAAHbWVzc2FnZQAAAAAQAAAAAA==",
        "AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAABQAAAAAAAAAAAAAADEdyb3VwQ291bnRlcgAAAAEAAAAAAAAABUdyb3VwAAAAAAAAAQAAAAQAAAABAAAAAAAAAAhFeHBlbnNlcwAAAAEAAAAEAAAAAQAAAAAAAAAFQ2hhdHMAAAAAAAABAAAABAAAAAEAAAAAAAAAC1NldHRsZW1lbnRzAAAAAAEAAAAE",
        "AAAAAAAAAENBZGRzIGEgbWVtYmVyIHRvIGFuIGV4aXN0aW5nIGdyb3VwIGFuZCBlbWl0cyBhIGBNZW1iZXJBZGRlZGAgZXZlbnQuAAAAAAphZGRfbWVtYmVyAAAAAAACAAAAAAAAAAhncm91cF9pZAAAAAQAAAAAAAAACm5ld19tZW1iZXIAAAAAABMAAAAA",
        "AAAAAQAAAAAAAAAAAAAACENoYXREYXRhAAAAAgAAAAAAAAAHbWVzc2FnZQAAAAAQAAAAAAAAAAZzZW5kZXIAAAAAABM=",
        "AAAAAAAAAFVMb2dzIGFuIGV4cGVuc2UgYW5kIHN0b3JlcyBpdCBpbiBQZXJzaXN0ZW50IFN0YXRlIGZvciBlYXN5IHJldHJpZXZhbCBieSB0aGUgZnJvbnRlbmQuAAAAAAAAC2xvZ19leHBlbnNlAAAAAAQAAAAAAAAACGdyb3VwX2lkAAAABAAAAAAAAAAFcGF5ZXIAAAAAAAATAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAAAAAADHBhcnRpY2lwYW50cwAAA+oAAAATAAAAAA==",
        "AAAAAQAAAAAAAAAAAAAACUdyb3VwRGF0YQAAAAAAAAIAAAAAAAAAB21lbWJlcnMAAAAD6gAAABMAAAAAAAAABG5hbWUAAAAQ",
        "AAAAAAAAAEFDcmVhdGVzIGEgbmV3IGdyb3VwLCBzdG9yZXMgaXQsIGFuZCBlbWl0cyBhIGBHcm91cENyZWF0ZWRgIGV2ZW50LgAAAAAAAAxjcmVhdGVfZ3JvdXAAAAACAAAAAAAAAARuYW1lAAAAEAAAAAAAAAAHY3JlYXRvcgAAAAATAAAAAQAAAAQ=",
        "AAAAAAAAACJSZXRyaWV2ZXMgYWxsIGV4cGVuc2VzIGZvciBhIGdyb3VwAAAAAAAMZ2V0X2V4cGVuc2VzAAAAAQAAAAAAAAAIZ3JvdXBfaWQAAAAEAAAAAQAAA+oAAAfQAAAAC0V4cGVuc2VEYXRhAA==",
        "AAAAAQAAAAAAAAAAAAAAC0V4cGVuc2VEYXRhAAAAAAMAAAAAAAAABmFtb3VudAAAAAAACwAAAAAAAAAMcGFydGljaXBhbnRzAAAD6gAAABMAAAAAAAAABXBheWVyAAAAAAAAEw==",
        "AAAAAAAAAEhMb2dzIGEgc2V0dGxlbWVudCB3aXRoIHRoZSBTdGVsbGFyIHRyYW5zYWN0aW9uIGhhc2ggZm9yIGV4cGxvcmVyIGxpbmtpbmcAAAAObG9nX3NldHRsZW1lbnQAAAAAAAUAAAAAAAAACGdyb3VwX2lkAAAABAAAAAAAAAAEZnJvbQAAABMAAAAAAAAAAnRvAAAAAAATAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAAAAAAB3R4X2hhc2gAAAAAEAAAAAA=",
        "AAAAAAAAABlSZXRyaWV2ZXMgYWxsIHNldHRsZW1lbnRzAAAAAAAAD2dldF9zZXR0bGVtZW50cwAAAAABAAAAAAAAAAhncm91cF9pZAAAAAQAAAABAAAD6gAAB9AAAAAOU2V0dGxlbWVudERhdGEAAA==",
        "AAAAAQAAAAAAAAAAAAAADlNldHRsZW1lbnREYXRhAAAAAAAEAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAAAAAABGZyb20AAAATAAAAAAAAAAJ0bwAAAAAAEwAAAAAAAAAHdHhfaGFzaAAAAAAQ" ]),
      options
    )
  }
  public readonly fromJSON = {
    get_chats: this.txFromJSON<Array<ChatData>>,
        get_group: this.txFromJSON<Option<GroupData>>,
        send_chat: this.txFromJSON<null>,
        add_member: this.txFromJSON<null>,
        log_expense: this.txFromJSON<null>,
        create_group: this.txFromJSON<u32>,
        get_expenses: this.txFromJSON<Array<ExpenseData>>,
        log_settlement: this.txFromJSON<null>,
        get_settlements: this.txFromJSON<Array<SettlementData>>
  }
}
