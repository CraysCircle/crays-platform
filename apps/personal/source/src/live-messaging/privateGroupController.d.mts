export type PrivateGroupChange=Readonly<{type:'rename'|'remove'|'promote'|'demote';value:string}>;
export type PrivateGroupReview=PrivateGroupChange&Readonly<{requestId:string;expectedParent:string}>;
export type PrivateGroupChangeResult=PrivateGroupReview&Readonly<{status:'publishing'|'sent-to-relay'|'unconfirmed'}>;
export type PrivateGroupSnapshot=Readonly<{available:boolean;busy:boolean;canManage:boolean;canRetry:boolean;pendingChanges:readonly PrivateGroupChangeResult[];name:string;revision:string|null;members:readonly Readonly<{pubkey:string;admin:boolean}>[]}>;
export interface PrivateGroupController {getSnapshot():PrivateGroupSnapshot;subscribe(fn:()=>void):()=>void;prepare(change:PrivateGroupChange):PrivateGroupReview;confirm(review:PrivateGroupReview):Promise<PrivateGroupChangeResult>;retryOriginal(requestId:string):Promise<PrivateGroupChangeResult>;readAttempt(requestId:string):PrivateGroupChangeResult|null;recheck():void;close():void;}
export function openPrivateGroupController(options:Record<string,unknown>):Promise<PrivateGroupController>;
