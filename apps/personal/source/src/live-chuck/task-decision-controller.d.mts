import type {PersonalChuckTask} from './tasks.mjs';
import type {ChuckJournal} from './journal.mjs';
import type {ChuckTaskDecisionCommand,ChuckTaskDecisionReceipt,ChuckPendingTaskDecision} from './task-decisions.mjs';
export type ChuckTaskDecisionSnapshot={phase:string;task:PersonalChuckTask|null;pending:ChuckPendingTaskDecision|null;latestReceipt:ChuckTaskDecisionReceipt|null;canRetryOriginal:boolean;problem:string|null};
export class PersonalChuckTaskDecisionController{
 constructor(config:{execute:(name:string,variables?:Record<string,unknown>,control?:{signal?:AbortSignal})=>Promise<unknown>;journal:ChuckJournal;randomUUID?:()=>string});
 subscribe:(listener:()=>void)=>()=>void;getSnapshot:()=>ChuckTaskDecisionSnapshot;setContext(scope:string):void;load():Promise<unknown>;decide(action:{reviewedTask:PersonalChuckTask;decision:ChuckTaskDecisionCommand['decision']}):Promise<ChuckTaskDecisionReceipt|undefined>;reconcile():Promise<ChuckTaskDecisionReceipt|undefined>;retryOriginal():Promise<ChuckTaskDecisionReceipt|undefined>;setAsideOriginal(options:{understandOriginalMayStillCommit:boolean;expectedOriginal:ChuckPendingTaskDecision}):Promise<void>;invalidateAccess():void;dispose():void;
}
