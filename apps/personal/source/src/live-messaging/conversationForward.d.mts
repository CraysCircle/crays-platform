import type {HumanConversationClient,HumanSnapshot} from './humanConversationClient.mjs';
export type ForwardTarget=Readonly<{conversationId:string;title:string;kind:'person'|'spot'|'circle';version:string}>;
export type ForwardDraft=Readonly<{version:string;text:string;replyTo?:string|null;hasAttachments?:boolean}>;
/** Original parent must recheck actual destination authority AND compare draft
 * versions atomically in stageDraft. It must preserve pending attachments and
 * clear only the explicitly reviewed reply target. This port never sends. */
export type ConversationForwardingPort=Readonly<{
 accountId:string;signal:AbortSignal;refresh?:()=>Promise<void>;
 getSnapshot():Readonly<{available:boolean;targets:readonly ForwardTarget[]}>;
 subscribe(fn:()=>void):()=>void;
 getDraft(conversationId:string,expectedTargetVersion:string):ForwardDraft;
 prepareDraft?(conversationId:string,expectedTargetVersion:string,signal:AbortSignal):Promise<ForwardDraft>;
 stageDraft(request:{accountId:string;sourceConversationId:string;conversationId:string;expectedTargetVersion:string;expectedDraftVersion:string;text:string;replyTo:null;replace:boolean;preserveAttachments:true}):{status:'draft-ready';conversationId:string};
 open(conversationId:string):void;
}>;
export type ForwardReview=Readonly<{fingerprint:string;selectedIds:readonly string[];text:string;count:number;attachmentsOmitted:number}>;
export type ForwardSource=Readonly<{accountId:string;conversationId:string;title:string;ownPubkey:string;authorName:(pubkey:string)=>string;isCurrent:()=>boolean}>;
export function reviewConversationForward(options:{snapshot:HumanSnapshot;selectedIds:readonly string[]|null;title:string;ownPubkey:string;authorName:(pubkey:string)=>string}):ForwardReview|null;
export function admittedForwardTargets(port:ConversationForwardingPort|undefined,accountId:string,sourceConversationId:string):readonly ForwardTarget[];
export function stageConversationForward(options:{client:HumanConversationClient;review:ForwardReview;source:ForwardSource;port:ConversationForwardingPort;target:ForwardTarget;expectedDraft:ForwardDraft;replace?:boolean}):{status:'draft-ready';conversationId:string};
