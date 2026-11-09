import type {ConversationLocalView} from './conversationLocalView.mjs';
import type {BrowserAttemptOutbox} from './browserAttemptOutbox.mjs';
export type HumanAttachment={filename:string;mediaType:string;bytes?:number;cipherBytes?:number;sha256?:string;plainSha256?:string;key?:string;nonce?:string;url?:string};
export type HumanMessage={attachments?:HumanAttachment[];id:string;requestId?:string;replyTo?:string;text:string;author:string;status:'received'|'sending'|'sent-to-relay'|'unconfirmed';createdAt?:number;eventIds?:string[]};
export type HumanSendResult={status:'sent-to-relay'|'unconfirmed';eventIds?:string[];messageId?:string;requestId?:string;persistenceWarning?:boolean};
export type HumanSnapshot={connectionState?:'connecting'|'ready'|'unavailable'|'closed';timerChanges?:readonly import('./conversationTimer.mjs').ConversationTimerChange[];contactInfo?:import('./conversationContactInfo.mjs').ConversationContactInfo|null;state:'loading'|'ready'|'offline'|'unavailable'|'closed';available:boolean;canSend?:boolean;supportsReplies?:boolean;supportsAttachments?:boolean;messages:readonly HumanMessage[];sending:boolean;problem:string|null;hasEarlierMessages?:boolean;hasNewerMessages?:boolean;historyExpanded?:boolean;loadingEarlier?:boolean;historyWindowLimit?:number;pinnedReply?:HumanMessage|null};
export interface HumanConversationClient {
 readonly messageTimer?:import('./conversationTimer.mjs').ConversationTimer;
 markRead?():void;
 /** Untrusted wire metadata until the canonical parent validates its binding. */
 getAdmission?():unknown;
 readonly localView?:ConversationLocalView;
 flushLocalView?():Promise<void>;
 getSnapshot():HumanSnapshot;
 subscribe(fn:()=>void):()=>void;
 refresh():Promise<void>;
 loadOlder?():Promise<void>;
 pinReplyOriginal?(id:string):void;
 clearReplyOriginal?():void;
 isPinnedReplyOriginal?(id:string):boolean;
 showLatest?():Promise<void>;
 prepareAttempt(text:string,replyTo?:string|null):Promise<{requestId:string}>;
 acknowledgeAttempt(requestId:string):Promise<boolean|undefined>;
 send(value:{text:string;requestId?:string;replyTo?:string|null}):Promise<HumanSendResult>;
 close():void;
}
export function createHumanConversationClient(options:{accountScope?:{accountId:string;isCurrent:(accountId:string)=>boolean;signal:AbortSignal};conversationId:string;fetcher?:typeof fetch;intervalMs?:number;newRequestId?:()=>string;outbox?:BrowserAttemptOutbox}):HumanConversationClient;
