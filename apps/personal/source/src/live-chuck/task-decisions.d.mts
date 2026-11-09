export type ChuckTaskDecisionCommand={taskId:string;expectedVersion:string;expectedPlanSHA256:string;expectedEventId:string|null;expectedContactRevision:string;idempotencyKey:string;decision:'confirm-plan'|'pause'|'cancel'};
export type ChuckTaskDecisionReceipt={eventId:string;taskId:string;version:string;planSHA256:string;decision:ChuckTaskDecisionCommand['decision'];contactRevision:string;createdAt:string;replayed:boolean;nodeExecutionAuthorized:false;providerDisclosureAuthorized:false;spendingAuthorized:false};
export type ChuckPendingTaskDecision={status:'prepared'|'unknown'|'stored';command:ChuckTaskDecisionCommand;receipt:ChuckTaskDecisionReceipt|null};
export function taskDecisionReceipt(value:unknown,command?:ChuckTaskDecisionCommand):ChuckTaskDecisionReceipt;
export function pendingTaskDecision(value:unknown):ChuckPendingTaskDecision|null;
