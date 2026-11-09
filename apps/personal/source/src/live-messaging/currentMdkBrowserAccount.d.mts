import type {PublicMessagingIdentity} from './currentBoundSigner.mjs';
import type {MdkBrowserAccount,MdkBrowserAccountContext,MdkBrowserAccountClass} from './mdkBrowserAccount.mjs';
import type {MdkCreationJournalOptions} from './mdkCreationJournal.mjs';
import type {MdkGroupJournal,MdkGroupJournalOptions} from './mdkMembershipJournal.mjs';
export interface CurrentMdkBrowserAccount extends MdkBrowserAccount {openCreationJournal(options:MdkCreationJournalOptions):Promise<MdkGroupJournal>;openGroupJournal(options:MdkGroupJournalOptions):Promise<MdkGroupJournal>}
export function openCurrentMdkBrowserAccount(options:{account:MdkBrowserAccountContext;AccountClass:MdkBrowserAccountClass;isCurrentBinding:(binding:PublicMessagingIdentity)=>boolean;storage?:{indexedDB?:IDBFactory;databaseName?:string;dataDatabaseName?:string};locks?:LockManager;crypto?:Crypto}):Promise<CurrentMdkBrowserAccount>;
