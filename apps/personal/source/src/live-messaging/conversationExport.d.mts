import type {HumanSnapshot} from './humanConversationClient.mjs';
export type ConversationExportReview={fingerprint:string;count:number;attachmentsOmitted:number;hasEarlierMessages:boolean};
export function reviewConversationExport(snapshot:HumanSnapshot,selectedIds?:readonly string[]|null):ConversationExportReview|null;
export function serializeConversationExport(options:{snapshot:HumanSnapshot;review:ConversationExportReview;title:string;ownPubkey:string;authorName:(pubkey:string)=>string;selectedIds?:readonly string[]|null}):string;
