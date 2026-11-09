export type ConversationDraftValue={text:string;replyTo:string|null};
export function isConversationDraftForWorkspace(controller:ConversationDraft,workspace:import('./humanConversationWorkspace.mjs').HumanConversationWorkspace):boolean;
export type ConversationDraftBinding=Readonly<{kind:'person'|'spot'|'circle';accountId:string;conversationId:string;groupId:string;storageFormat?:'crays-original-mdk-current-v1';pubkey:string;membershipId:string}>;
export type ConversationDraftSnapshot=Readonly<ConversationDraftValue&{available:boolean;version:number;saving:boolean;problem:string|null;conflict:Readonly<ConversationDraftValue&{revision:number;operationId:string|null}>|null}>;
export interface ConversationDraft {
 readonly binding:ConversationDraftBinding;
 readonly signal:AbortSignal;
 getSnapshot():ConversationDraftSnapshot;
 subscribe(listener:()=>void):()=>void;
 set(value:ConversationDraftValue):number;
 clearConfirmed(expected:ConversationDraftValue):boolean;
 flush():Promise<void>;
 retry():Promise<void>;
 keepCurrent(expectedVersion:number,expectedConflict:NonNullable<ConversationDraftSnapshot['conflict']>):Promise<void>;
 useSaved(expectedVersion:number,expectedConflict:NonNullable<ConversationDraftSnapshot['conflict']>):Promise<void>;
 close():void;
}
export function openConversationDraft(options:{binding:{kind:'person'|'spot'|'circle';accountId:string;conversationId:string;groupId:string;storageFormat?:'crays-original-mdk-current-v1';pubkey:string;membershipId:string};journal:{getItem(key:string):Promise<unknown>;setItem(key:string,value:unknown):Promise<unknown>};exclusive<T>(scope:string,operation:()=>Promise<T>,signal:AbortSignal):Promise<T>;authorize(binding:unknown):boolean;signal:AbortSignal;newId?:()=>string}):Promise<ConversationDraft>;
