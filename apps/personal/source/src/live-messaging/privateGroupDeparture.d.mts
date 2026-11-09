export type GroupDepartureReview=Readonly<{requestId:string;expectedParent:string}>;
export type GroupDepartureResult=GroupDepartureReview&Readonly<{status:'publishing'|'unconfirmed'|'left'}>;
export type GroupDepartureSnapshot=Readonly<{available:boolean;canLeave:boolean;busy:boolean;requiresAdminHandover:boolean;status:'idle'|'publishing'|'unconfirmed'|'left';requestId:string|null}>;
export interface PrivateGroupDeparture{getSnapshot():GroupDepartureSnapshot;subscribe(fn:()=>void):()=>void;prepare():GroupDepartureReview;confirm(review:GroupDepartureReview):Promise<GroupDepartureResult>;recheck():void;settled?():Promise<void>;close():void;}
export function openPrivateGroupDeparture(options:Record<string,unknown>):Promise<PrivateGroupDeparture>;
