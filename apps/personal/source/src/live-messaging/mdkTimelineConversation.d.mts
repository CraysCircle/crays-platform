import type {MdkTimelinePage} from './mdkBrowserAccount.mjs';
import type {HumanConversationClient} from './humanConversationClient.mjs';
import type {HumanConversationBinding} from './humanConversationWorkspace.mjs';
export interface MdkTimelineRuntime {
 readonly storageFormat:'crays-original-mdk-current-v1';readonly accountPubkey:string;
 readTimeline(groupId:string,options?:{before?:{at:number;messageId:string};limit?:number}):Promise<MdkTimelinePage>;
 subscribeTimeline(listener:(change:Readonly<{kind:'append'|'withdrawal'|'closed'|'offline'}>)=>void):()=>void;
}
export type MdkConversationAdmission=HumanConversationBinding&Readonly<{kind:'circle'|'spot';membershipId:string}>;
export type MdkConversationCommandClient=HumanConversationClient&Readonly<{storageFormat:'crays-original-mdk-current-v1';getAdmission():MdkConversationAdmission|null}>;
export function openMdkTimelineConversation(options:{binding:MdkConversationAdmission;runtime:MdkTimelineRuntime;commands:MdkConversationCommandClient;authorize:(binding:MdkConversationAdmission,action:'read'|'send')=>boolean;signal:AbortSignal;pageSize?:number;maxVisible?:number}):Promise<HumanConversationClient>;
