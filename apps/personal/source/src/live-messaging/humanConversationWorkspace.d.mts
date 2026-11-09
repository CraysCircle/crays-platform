import type {PrivateGroupController} from './privateGroupController.mjs';
import type {PrivateGroupInvitations} from './privateGroupInvitations.mjs';
import type {PrivateGroupDeparture} from './privateGroupDeparture.mjs';
import type {HumanConversationClient} from './humanConversationClient.mjs';
import type {PrivateMediaSession} from './privateMediaSession.mjs';
import type {PrivateCallController} from './privateCallController.mjs';
export type HumanConversationBinding=Readonly<{kind:'person'|'spot'|'circle';accountId:string;conversationId:string;groupId:string;storageFormat?:'crays-original-mdk-current-v1';pubkey:string}>;
export type HumanConversationResources={client:HumanConversationClient;media?:PrivateMediaSession;group?:PrivateGroupController;invitations?:PrivateGroupInvitations;departure?:PrivateGroupDeparture;close():void|Promise<void>};
export type HumanWorkspaceSnapshot=Readonly<{state:'idle'|'loading'|'ready'|'unavailable'|'closed';client:HumanConversationClient|null;media:PrivateMediaSession|null;call:PrivateCallController|null;group?:PrivateGroupController|null;invitations?:PrivateGroupInvitations|null;departure?:PrivateGroupDeparture|null;problem:string|null}>;
export interface HumanConversationWorkspace {readonly binding:HumanConversationBinding;readonly signal:AbortSignal;getSnapshot():HumanWorkspaceSnapshot;subscribe(fn:()=>void):()=>void;start():Promise<void>;recheck():void;close():void;settled():Promise<void>;}
export function createHumanConversationWorkspace(options:{binding:HumanConversationBinding;signal:AbortSignal;authorize:(binding:HumanConversationBinding)=>boolean;openConversation:(context:{binding:HumanConversationBinding;signal:AbortSignal})=>Promise<HumanConversationResources>;openCalls?:(context:{binding:HumanConversationBinding;signal:AbortSignal})=>Promise<PrivateCallController|null>}):HumanConversationWorkspace;
