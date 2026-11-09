import {fail,immutable,originalID,revision} from './protocol.mjs';
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const id=(v,p)=>originalID(v,p)&&v===v.toLowerCase();
const hash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const date=v=>typeof v==='string'&&v.length===24&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v;
const ref=v=>typeof v==='string'&&/^[A-Za-z0-9_.:-]{1,160}$/.test(v);
const nodeRef=v=>typeof v==='string'&&/^node-[a-z0-9_-]{1,64}$/.test(v);
const invalid=()=>{throw fail('invalid-response');};
const noGrants=v=>v.nodeExecutionAuthorized===false&&v.providerDisclosureAuthorized===false&&v.spendingAuthorized===false;
/** Same selected iOS proposal contract. Reading or confirming a proposal is
 * never a tool, provider-disclosure or spending authorization. */
function plan(value){
 if(!object(value)||typeof value.title!=='string'||!value.title.length||value.title.trim()!==value.title||new TextEncoder().encode(value.title).length>640||/[\x00-\x1f\x7f]/.test(value.title)||!Array.isArray(value.nodes)||value.nodes.length<1||value.nodes.length>32)invalid();
 const nodes=value.nodes.map(n=>{
  if(!object(n)||!nodeRef(n.nodeRef)||!Array.isArray(n.parents)||n.parents.length>31||!n.parents.every(nodeRef)||new Set(n.parents).size!==n.parents.length||n.parents.includes(n.nodeRef)||!ref(n.workloadRef)||!ref(n.operationRef)||!/^personal-[a-f0-9]{48}$/.test(n.actorRef??'')||n.state!=='planned'||[n.approvalRef,n.budgetReservationRef,n.receiptRef,n.nextAttemptAt].some(v=>v!=null))invalid();
  return {nodeRef:n.nodeRef,parents:[...n.parents],workloadRef:n.workloadRef,operationRef:n.operationRef,actorRef:n.actorRef,state:'planned',approvalRef:null,budgetReservationRef:null,receiptRef:null,nextAttemptAt:null};
 });
 const index=new Map(nodes.map(n=>[n.nodeRef,n]));if(index.size!==nodes.length||new Set(nodes.map(n=>n.actorRef)).size!==1)invalid();
 const visited=new Set(),visiting=new Set();const visit=n=>{if(visited.has(n.nodeRef))return;if(visiting.has(n.nodeRef))invalid();visiting.add(n.nodeRef);for(const p of n.parents){if(!index.has(p))invalid();visit(index.get(p));}visiting.delete(n.nodeRef);visited.add(n.nodeRef);};nodes.forEach(visit);
 return {title:value.title,nodes};
}
export function personalTask(value){
 if(!object(value)||!id(value.taskId,'personal-task-')||!revision(value.version)||!hash(value.planSHA256)||!date(value.createdAt)||!id(value.sourceMessageId,'personal-message-')||!id(value.sourceReceiptId,'personal-receipt-')||typeof value.sourceAvailable!=='boolean'||value.sourceAvailable!==(value.plan!=null)||!['awaiting-review','plan-confirmed','paused','cancelled'].includes(value.state)||(value.lastEventId!=null&&!id(value.lastEventId,'personal-task-event-'))||(value.state!=='awaiting-review'&&value.lastEventId==null)||typeof value.replayed!=='boolean'||!noGrants(value))invalid();
 return immutable({taskId:value.taskId,version:value.version,planSHA256:value.planSHA256,createdAt:value.createdAt,sourceMessageId:value.sourceMessageId,sourceReceiptId:value.sourceReceiptId,sourceAvailable:value.sourceAvailable,state:value.state,lastEventId:value.lastEventId??null,replayed:value.replayed,nodeExecutionAuthorized:false,providerDisclosureAuthorized:false,spendingAuthorized:false,plan:value.plan==null?null:plan(value.plan)});
}
export function personalTaskPage(value){
 if(!object(value)||!Array.isArray(value.tasks)||value.tasks.length>50||typeof value.hasMore!=='boolean'||value.completeTaskHistory!==false||value.hasMore&&value.tasks.length!==50)invalid();
 const tasks=value.tasks.map(personalTask);if(new Set(tasks.map(t=>t.taskId)).size!==tasks.length||tasks.some((t,i)=>i&&tasks[i-1].createdAt<t.createdAt))invalid();
 return immutable({tasks,hasMore:value.hasMore,completeTaskHistory:false});
}
