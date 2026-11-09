import type {MdkBrowserAccount,MdkTimelinePage} from './mdkBrowserAccount.mjs';
import type {MdkGroupJournal,MdkGroupJournalBinding} from './mdkMembershipJournal.mjs';
import type {Event} from 'nostr-tools';
export interface MdkOutgoingReceipt {readonly status:'sent-to-relay'|'unconfirmed';readonly requestId:string;readonly messageId:string;readonly eventIds:readonly string[]}
export interface MdkOutgoingAdmission extends MdkGroupJournalBinding {storageFormat:'crays-original-mdk-current-v1';relays:string[]}
export interface MdkOutgoingPublisher {
 readonly storageFormat:'crays-original-mdk-current-v1';
 prepareAttempt(text:string,replyTo?:string|null):Promise<{requestId:string}>;
 acknowledgeAttempt(requestId:string):Promise<boolean|undefined>;
 observeTimeline?(page:MdkTimelinePage):Promise<void>;
 readReceipt(requestId:string):Promise<MdkOutgoingReceipt|null>;
 send(value:{requestId:string;text:string;replyTo?:string|null}):Promise<MdkOutgoingReceipt>;
 close():void;
}
export function openMdkOutgoingPublisher(options:{binding:MdkGroupJournalBinding;runtime:MdkBrowserAccount;journal:MdkGroupJournal;network:{publish(relays:string[],event:Event,options:{signal:AbortSignal;beforeSend:()=>boolean}):Promise<Record<string,{ok:boolean}>>;request(relays:string[],filter:{kinds:number[];ids:string[];limit:number},signal:AbortSignal):Promise<Event[]>};getAdmission:()=>MdkOutgoingAdmission|null;authorize:(binding:MdkGroupJournalBinding,action:'read'|'send')=>boolean;signal:AbortSignal;crypto?:Crypto}):Promise<MdkOutgoingPublisher>;
