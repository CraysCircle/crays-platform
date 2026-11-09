import type {NostrEvent} from 'nostr-tools';
export type PrivateHistoryBinding={accountId:string;conversationId:string;kind:string;groupId:string;membershipId:string;pubkey:string};
export type PrivateHistoryCursor=Readonly<{version:1;scope:string;until:number;boundaryIds:readonly string[]}>|Readonly<{version:2;scope:string;until:number;beforeId:string}>;
export const PRIVATE_INBOX_HISTORY_PAGE_SIZE:200;
export const PRIVATE_INBOX_HISTORY_RELAY_LIMIT:500;
export const PRIVATE_INBOX_HISTORY_MAX_PAGE_BYTES:number;
export function readPrivateInboxHistoryPage(options:{peer:{readInbox(options:{limit:number;until?:number}):Promise<NostrEvent[]>;supportsHistoryCursor?():Promise<boolean>;readInboxBefore?(options:{limit:number;before:{id:string;created_at:number}|null}):Promise<NostrEvent[]>};binding:PrivateHistoryBinding;isCurrent:()=>boolean;cursor?:PrivateHistoryCursor|null;pageSize?:number}):Promise<Readonly<{events:readonly NostrEvent[];nextCursor:PrivateHistoryCursor|null;exhausted:boolean}>>;
