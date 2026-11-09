import {fail,immutable,originalID,revision,captureTaskDecision} from './protocol.mjs';
export function taskDecisionReceipt(value,command){
 if(!value||typeof value!=='object'||Array.isArray(value)||!originalID(value.eventId,'personal-task-event-')||value.eventId!==value.eventId.toLowerCase()||!originalID(value.taskId,'personal-task-')||value.taskId!==value.taskId.toLowerCase()||!revision(value.version)||typeof value.planSHA256!=='string'||!/^[a-f0-9]{64}$/.test(value.planSHA256)||!['confirm-plan','pause','cancel'].includes(value.decision)||!revision(value.contactRevision)||typeof value.createdAt!=='string'||value.createdAt.length!==24||!Number.isFinite(Date.parse(value.createdAt))||new Date(value.createdAt).toISOString()!==value.createdAt||typeof value.replayed!=='boolean'||value.nodeExecutionAuthorized!==false||value.providerDisclosureAuthorized!==false||value.spendingAuthorized!==false)throw fail('invalid-response');
 if(command){const c=captureTaskDecision(command);if(value.taskId!==c.taskId||value.version!==c.expectedVersion||value.planSHA256!==c.expectedPlanSHA256||value.decision!==c.decision||value.contactRevision!==c.expectedContactRevision||value.eventId===c.expectedEventId)throw fail('decision-receipt-changed');}
 return immutable({eventId:value.eventId,taskId:value.taskId,version:value.version,planSHA256:value.planSHA256,decision:value.decision,contactRevision:value.contactRevision,createdAt:value.createdAt,replayed:value.replayed,nodeExecutionAuthorized:false,providerDisclosureAuthorized:false,spendingAuthorized:false});
}
export function pendingTaskDecision(value){
 if(value===null)return null;
 if(!value||!['prepared','unknown','stored'].includes(value.status))throw fail('pending-storage');
 const command=captureTaskDecision(value.command),receipt=value.receipt==null?null:taskDecisionReceipt(value.receipt,command);
 if((value.status==='stored')!==!!receipt)throw fail('pending-storage');
 return immutable({status:value.status,command,receipt});
}
