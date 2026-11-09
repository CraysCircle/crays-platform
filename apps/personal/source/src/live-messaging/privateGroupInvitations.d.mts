export type GroupInviteReview=Readonly<{requestId:string;pubkey:string;keyPackageEventId:string;expectedParent:string;name:string}>;
export type GroupInviteResult=Readonly<{requestId:string;pubkey:string;keyPackageEventId:string;expectedParent:string;status:'publishing'|'unconfirmed'|'commit-confirmed'|'welcome-published'}>;
export type GroupInviteSnapshot=Readonly<{available:boolean;canInvite:boolean;busy:boolean;candidates:readonly Readonly<{pubkey:string;name:string}>[];attempts:readonly GroupInviteResult[]}>;
export interface PrivateGroupInvitations{getSnapshot():GroupInviteSnapshot;subscribe(fn:()=>void):()=>void;prepare(pubkey:string):Promise<GroupInviteReview>;confirm(review:GroupInviteReview):Promise<GroupInviteResult>;retryOriginal?(requestId:string):Promise<GroupInviteResult>;recheck():void;close():void;}
export function openPrivateGroupInvitations(options:Record<string,unknown>):Promise<PrivateGroupInvitations>;
