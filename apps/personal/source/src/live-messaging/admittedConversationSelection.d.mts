import type {ConversationDraft} from './conversationDraft.mjs';
import type {HumanConversationWorkspace} from './humanConversationWorkspace.mjs';
import type {ConversationForwardingPort} from './conversationForward.mjs';
import type {SessionInbox} from './sessionInbox.mjs';
/** Supplied only by the current canonical host; abort on account/rights revocation. */
export type AdmittedHumanMessagingPort=Readonly<{accountId:string;signal:AbortSignal;openSpotDiscussion?:(options:{spotId:string;rootId:string;signal:AbortSignal})=>Promise<ReturnType<typeof import('./currentSpotRelayClient.mjs').createCurrentSpotRelayClient>>;inbox?:SessionInbox;refreshInbox?:()=>Promise<void>;openGroups?:(options:import('./currentOwnedGroups.mjs').CurrentOwnedGroupOptions)=>Promise<import('./currentOwnedGroups.mjs').CurrentOwnedGroups>;setArchived?:(conversationId:string,archived:boolean)=>Promise<void>;forwarding?:ConversationForwardingPort;getComposer?:(workspace:HumanConversationWorkspace)=>ConversationDraft;openPrivateNote?:(workspace:HumanConversationWorkspace)=>Promise<import('./conversationPrivateNote.mjs').ConversationPrivateNote>;openConversation(request:{accountId:string;conversationId:string;signal:AbortSignal}):Promise<HumanConversationWorkspace>}>;
export type AdmittedSelectionSnapshot=Readonly<{state:'idle'|'loading'|'ready'|'unavailable'|'closed';workspace:HumanConversationWorkspace|null}>;
export interface AdmittedConversationSelection {getSnapshot():AdmittedSelectionSnapshot;subscribe(fn:()=>void):()=>void;start():Promise<void>;close():void;settled():Promise<void>;}
export function createAdmittedConversationSelection(options:{port:AdmittedHumanMessagingPort;accountId:string;conversationId:string;signal:AbortSignal}):AdmittedConversationSelection;
