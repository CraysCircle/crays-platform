import type {WorkspaceRecommendation} from './workspace-controller.mjs';
import type {ChuckJournal} from './journal.mjs';
export type WorkspaceActionReceipt={receiptId:string;id:string;version:string;contentSHA256:string;createdAt:string;replayed:boolean};
export type WorkspaceActionPending={status:'prepared'|'unknown'|'stored';command:{id:string;idempotencyKey:string;payload:{state:string}};receipt:WorkspaceActionReceipt|null};
export type WorkspaceActionArchive={record:WorkspaceActionPending;archivedAt:string;coreActionCancelled:false};
export type WorkspaceActionSnapshot={blockedOriginalKey:string|null;archive:readonly WorkspaceActionArchive[];archiveHasMore:boolean;archiveAfter:string|null;phase:'idle'|'checking'|'sending'|'stored'|'outcome-unknown'|'storage-error'|'unavailable'|'review-original';pending:WorkspaceActionPending|null;current:WorkspaceRecommendation|null;receipt:WorkspaceActionReceipt|null;problem:string|null};
export class PersonalWorkspaceActionController{
 constructor(options:{accountScope:string;assertCurrent:()=>void;fetch?:typeof fetch;journal:ChuckJournal;randomUUID?:()=>string});
 getSnapshot:()=>WorkspaceActionSnapshot;
 subscribe:(listener:()=>void)=>()=>void;
 load():Promise<unknown>;
 earlierChanges():Promise<unknown>;
 restoreOriginal(saved:WorkspaceActionArchive):Promise<unknown>;
 choose(input:{reviewedRecord:WorkspaceRecommendation;state:'saved'|'dismissed'|'suggested'}):Promise<unknown>;
 retryOriginal():Promise<unknown>;
 setAsideIncompatible(input:{understandOriginalMayStillCommit:boolean;expectedKey:string}):Promise<unknown>;
 setAsideOriginal(input:{understandOriginalMayStillCommit:boolean;expectedOriginal:WorkspaceActionPending}):Promise<unknown>;
 invalidateAccess():void;
 dispose():void;
}
