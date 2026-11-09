import type {HumanSnapshot} from './humanConversationClient.mjs';
export type ConversationSearchMatch={id:string;author:string;excerpt:string;createdAt?:number};
export function searchConversationMessages(snapshot:HumanSnapshot,query:string):{matches:ConversationSearchMatch[];total:number};
