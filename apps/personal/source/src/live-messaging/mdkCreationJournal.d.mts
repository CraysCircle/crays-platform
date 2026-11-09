import type {MdkGroupJournal} from './mdkMembershipJournal.mjs';
export interface MdkCreationBinding {accountId:string;pubkey:string;bindingFingerprint:string;contextId:string;kind:'spot'|'circle';storageFormat:'crays-original-mdk-current-v1';relays:readonly string[]}
export interface MdkCreationJournalOptions {binding:MdkCreationBinding;getAdmission():MdkCreationBinding|null;signal:AbortSignal}
export function openMdkCreationJournal(options:MdkCreationJournalOptions&{identity:Pick<MdkCreationBinding,'accountId'|'pubkey'|'bindingFingerprint'>;store:Pick<MdkGroupJournal,'getItem'|'setItem'|'removeItem'>;isCurrent():boolean;locks?:LockManager;crypto?:Crypto}):Promise<MdkGroupJournal>;
