export interface MdkGroupJournalBinding {accountId:string;conversationId:string;groupId:string;membershipId:string;pubkey:string;kind:'spot'|'circle'}
export interface MdkGroupJournal {
 getItem(key:string):Promise<unknown>;
 setItem(key:string,value:unknown):Promise<void>;
 removeItem(key:string):Promise<void>;
 exclusive<T>(key:string,work:()=>T|Promise<T>):Promise<T>;
 close():void;
}
export interface MdkGroupJournalOptions {binding:MdkGroupJournalBinding;getAdmission:()=>MdkGroupJournalBinding&{storageFormat:'crays-original-mdk-current-v1'};signal:AbortSignal}
export function openMdkMembershipJournal(options:MdkGroupJournalOptions&{identity:{accountId:string;pubkey:string;bindingFingerprint:string};store:Pick<MdkGroupJournal,'getItem'|'setItem'|'removeItem'>;isCurrent:()=>boolean;locks?:LockManager;crypto?:Crypto}):Promise<MdkGroupJournal>;
