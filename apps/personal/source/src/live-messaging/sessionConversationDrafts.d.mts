type Port={accountId:string;signal:AbortSignal};
type SetRecord<T>=(value:Record<string,T>|((previous:Record<string,T>)=>Record<string,T>))=>void;
export type ConversationPositionMemory={position:{top:number;height:number;viewport:number;nearBottom:boolean}|null};
export function sessionConversationDrafts(port?:Port):{getSnapshot():{drafts:Record<string,string>;replies:Record<string,string|null>};subscribe(listener:()=>void):()=>void;setDrafts:SetRecord<string>;setReplies:SetRecord<string|null>;viewFor(conversationId:string):ConversationPositionMemory|undefined};
