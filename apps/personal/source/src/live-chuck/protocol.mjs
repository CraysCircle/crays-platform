import {CHUCK_OPERATIONS} from './contracts.mjs';
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
export const fail=code=>Object.assign(new Error(code),{code});
export const immutable=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(immutable);Object.freeze(value);}return value;};
export const identifier=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(v);
export const revision=v=>typeof v==='string'&&/^[1-9][0-9]{0,18}$/.test(v)&&BigInt(v)<=9223372036854775807n;
export const originalID=(v,prefix)=>typeof v==='string'&&new RegExp('^'+prefix+'[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$').test(v);
export const validBody=v=>typeof v==='string'&&v.trim().length>0&&new TextEncoder().encode(v).length<=16384&&!v.includes('\0')&&!/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(v);
const date=v=>typeof v==='string'&&v.length===24&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v;
export function captureCommand(value){
 if(!object(value)||Object.keys(value).sort().join(',')!=='bindingId,body,expectedBindingRevision,expectedContactRevision,idempotencyKey'||!originalID(value.bindingId,'personal-binding-')||!revision(value.expectedBindingRevision)||!revision(value.expectedContactRevision)||!identifier(value.idempotencyKey)||!validBody(value.body))throw fail('invalid-command');
 return immutable({...value});
}
export function captureTaskDecision(value){
 if(!object(value))throw fail('invalid-command');
 const keys=Object.keys(value).sort().join(',');
 if(!['decision,expectedContactRevision,expectedEventId,expectedPlanSHA256,expectedVersion,idempotencyKey,taskId','decision,expectedContactRevision,expectedPlanSHA256,expectedVersion,idempotencyKey,taskId'].includes(keys)||!originalID(value.taskId,'personal-task-')||value.taskId!==value.taskId.toLowerCase()||!revision(value.expectedVersion)||typeof value.expectedPlanSHA256!=='string'||!/^[a-f0-9]{64}$/.test(value.expectedPlanSHA256)||(value.expectedEventId!=null&&(!originalID(value.expectedEventId,'personal-task-event-')||value.expectedEventId!==value.expectedEventId.toLowerCase()))||!revision(value.expectedContactRevision)||!identifier(value.idempotencyKey)||!['confirm-plan','pause','cancel'].includes(value.decision))throw fail('invalid-command');
 return immutable({...value,expectedEventId:value.expectedEventId??null});
}
const READS=new Set(['NativePersonalConversation','NativePersonalTranscript','NativePersonalRequests','NativePersonalConversationOriginals','NativePersonalTranscriptOriginals','NativePersonalRequestsOriginals']);
// Original Core projections allow 50 messages x 128 source references. Their
// bounded JSON envelope can exceed the text-only limit (including 16 KiB text
// per row and escaped display names). This is metadata, not a binary upload,
// download, provider/model permission or caller-selectable response budget.
const ORIGINAL_METADATA_RESPONSES=new Set(['NativePersonalConversationOriginals','NativePersonalTranscriptOriginals','NativePersonalRequestsOriginals','BindPersonalMessengerOriginals']);
export function personalAPQ(operationName,variables={}){
 if(!Object.hasOwn(CHUCK_OPERATIONS,operationName)||!object(variables))throw fail('invalid-operation');
 const keys=Object.keys(variables).sort().join(',');
 if(operationName==='NativeEmailSetup'){if(keys)throw fail('invalid-operation');}
 else if(READS.has(operationName)){if(keys!==''&&(keys!=='beforeMessageId'||!originalID(variables.beforeMessageId,'personal-message-')))throw fail('invalid-operation');}
 else if(operationName==='BindPersonalMessenger'||operationName==='BindPersonalMessengerOriginals'){if(keys!=='expectedContactRevision'||!revision(variables.expectedContactRevision))throw fail('invalid-operation');}
 else if(operationName==='DecideNativePersonalTaskFlow')variables=captureTaskDecision(variables);
 else if(operationName==='GetAgentDeliveryReceipt'||operationName==='NativePersonalTaskFlowDecision'){if(keys!=='idempotencyKey'||!identifier(variables.idempotencyKey))throw fail('invalid-operation');}
 else if(operationName==='ReceiveScopedAgentMessage')captureCommand(variables);
 else if(operationName==='NativePersonalTaskFlows'){if(keys)throw fail('invalid-operation');}
 else if(operationName==='NativePersonalTaskFlowsPage'){if(keys!==''&&(keys!=='beforeTaskId,beforeVersion'||!originalID(variables.beforeTaskId,'personal-task-')||variables.beforeTaskId!==variables.beforeTaskId.toLowerCase()||!revision(variables.beforeVersion)))throw fail('invalid-operation');}
 else if(operationName==='NativePersonalTaskFlow'){if(keys!=='taskId'||!originalID(variables.taskId,'personal-task-')||variables.taskId!==variables.taskId.toLowerCase())throw fail('invalid-operation');}
 else throw fail('operation-not-connected');
 return immutable({operationName,extensions:{persistedQuery:{version:1,sha256Hash:CHUCK_OPERATIONS[operationName].hash}},variables:{...variables}});
}
export function contactSetup(value){
 if(!object(value)||typeof value.accountMapped!=='boolean'||typeof value.emailVerificationRequired!=='boolean'||(value.accountMapped?!revision(value.contactRevision):value.contactRevision!=null||!value.emailVerificationRequired))throw fail('invalid-response');
 return immutable({accountMapped:value.accountMapped,emailVerificationRequired:value.emailVerificationRequired,contactRevision:value.contactRevision??null});
}
export function receipt(value){
 if(!object(value)||!originalID(value.receiptId,'personal-receipt-')||!originalID(value.messageId,'personal-message-')||value.outcome!=='STORED_RUNTIME_UNAVAILABLE'||typeof value.replayed!=='boolean'||!date(value.createdAt))throw fail('invalid-response');
 return immutable({receiptId:value.receiptId,messageId:value.messageId,outcome:value.outcome,replayed:value.replayed,createdAt:value.createdAt});
}
export function transcript(value){
 if(!object(value)||!originalID(value.bindingId,'personal-binding-')||!revision(value.revision)||!originalID(value.conversationId,'personal-conversation-')||typeof value.hasOlderMessages!=='boolean'||!Array.isArray(value.messages)||value.messages.length>50)throw fail('invalid-response');
 const messages=value.messages.map(m=>{
  if(!object(m)||!originalID(m.messageId,'personal-message-')||!validBody(m.body)||!date(m.createdAt)||!['OWNER','CHUCK'].includes(m.authorKind))throw fail('invalid-response');
  if(m.authorKind==='OWNER'?(m.agentId!=null||m.inReplyToMessageId!=null):(!/^personal-[0-9a-f]{48}$/.test(m.agentId||'')||!originalID(m.inReplyToMessageId,'personal-message-')||m.inReplyToMessageId===m.messageId))throw fail('invalid-response');
  return immutable({messageId:m.messageId,body:m.body,createdAt:m.createdAt,authorKind:m.authorKind,agentId:m.agentId??null,inReplyToMessageId:m.inReplyToMessageId??null});
 });
 if(new Set(messages.map(m=>m.messageId)).size!==messages.length||messages.some((m,i)=>i&&messages[i-1].createdAt>m.createdAt)|| (value.hasOlderMessages?(messages.length!==50||value.nextBeforeMessageId!==messages[0].messageId):value.nextBeforeMessageId!=null))throw fail('invalid-response');
 return immutable({bindingId:value.bindingId,revision:value.revision,conversationId:value.conversationId,hasOlderMessages:value.hasOlderMessages,nextBeforeMessageId:value.nextBeforeMessageId??null,messages});
}
/** Same-origin browser session only. The server must reauthenticate and resolve
 * original Core authority on EVERY request. No bearer/identity/provider secret accepted here. */
export function createChuckFetchTransport({fetch:fetcher=globalThis.fetch,endpoint='/api/crays/personal/chuck',accountScope}={}){
 if(endpoint!=='/api/crays/personal/chuck'||typeof fetcher!=='function')throw fail('invalid-transport');
 if(accountScope!==undefined&&(typeof accountScope!=='string'||!accountScope.length||accountScope.length>200||/[^\x21-\x7e]/.test(accountScope)))throw fail('invalid-context');
 return async (operationName,variables={},control={})=>{
  const request=personalAPQ(operationName,variables);
  const requestSignal=control.signal?AbortSignal.any([control.signal,AbortSignal.timeout(20000)]):AbortSignal.timeout(20000);
  let response;try{response=await fetcher(endpoint,{method:'POST',credentials:'same-origin',cache:'no-store',redirect:'error',headers:{Accept:'application/json','Content-Type':'application/json',...(accountScope&&{'X-Crays-Web-Account-Context':accountScope})},body:JSON.stringify(request),signal:requestSignal});}catch{throw fail('connection');}
  if(response.status===401||response.status===403){
   const error=fail('access-denied');
   // Distinguish a missing SDK session only for the initial identity read.
   // Every caller still receives the original denial; no retry or grant changes.
   if(operationName==='NativeEmailSetup'&&response.status===401)Object.defineProperty(error,'requiresOriginalSignIn',{value:true});
   throw error;
  }
  if(response.status===409)throw fail('conflict');
  if(!response.ok||!['application/json','application/graphql-response+json'].includes(response.headers.get('content-type')?.split(';')[0].trim().toLowerCase()))throw fail('unavailable');
  const maximum=ORIGINAL_METADATA_RESPONSES.has(operationName)?16*1024*1024:1024*1024;
  const reader=response.body?.getReader();if(!reader)throw fail('invalid-response');let size=0;const parts=[];
  try{for(;;){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>maximum){try{await reader.cancel();}catch{/* The exceeded bound still rejects the response. */}throw fail('invalid-response');}parts.push(part.value);}}catch(error){if(error?.code==='invalid-response')throw error;throw fail('connection');}finally{reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;for(const p of parts){bytes.set(p,offset);offset+=p.byteLength;}let result;try{result=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{throw fail('invalid-response');}
  if(!object(result))throw fail('invalid-response');
  if(result.errors?.length){
   // Exact original Core codes only. An absent receipt is NOT proof of no write.
   // Partial success/multiple errors never authorize the explicit retry path.
   const code=Array.isArray(result.errors)&&result.errors.length===1&&result.data==null?result.errors[0]?.extensions?.code:null;
   const mapped={NATIVE_AUTHENTICATION_REQUIRED:'access-denied',NATIVE_PERSONAL_CURRENT_OWNER_REQUIRED:'access-denied',NATIVE_PERSONAL_CURRENT_BINDING_REQUIRED:'binding-changed',NATIVE_PERSONAL_BINDING_REVOKED:'binding-revoked',NATIVE_CONTACT_STATE_CHANGED:'contact-changed',NATIVE_PERSONAL_CONTACT_CHANGED:'contact-changed',NATIVE_PERSONAL_BINDING_CHANGED:'binding-changed',NATIVE_PERSONAL_IDEMPOTENCY_CONFLICT:'conflict',NATIVE_PERSONAL_CURSOR_UNAVAILABLE:'cursor-changed',NATIVE_PERSONAL_OUTCOME_UNKNOWN:'outcome-unknown',NATIVE_PERSONAL_TASKFLOW_OUTCOME_UNKNOWN:'outcome-unknown',NATIVE_PERSONAL_TASKFLOW_CONTACT_CHANGED:'contact-changed',NATIVE_PERSONAL_TASKFLOW_CURRENT_OWNER_REQUIRED:'access-denied',NATIVE_PERSONAL_TASKFLOW_ACTUAL_NATIVE_ACTOR_REQUIRED:'access-denied',NATIVE_PERSONAL_TASKFLOW_IDEMPOTENCY_CONFLICT:'conflict',NATIVE_PERSONAL_TASKFLOW_VERSION_CONFLICT:'task-changed',NATIVE_PERSONAL_TASKFLOW_CURRENT_SOURCE_REQUIRED:'source-changed',NATIVE_PERSONAL_TASKFLOW_CANCELLED:'task-cancelled',NATIVE_PERSONAL_TASKFLOW_OWN_TASK_REQUIRED:'task-unavailable',NATIVE_PERSONAL_TASKFLOW_CURSOR_UNAVAILABLE:'cursor-changed'};
   if(code==='NATIVE_PERSONAL_RECEIPT_UNAVAILABLE'&&operationName==='GetAgentDeliveryReceipt')throw fail('receipt-unavailable');
   throw fail(Object.hasOwn(mapped,code)?mapped[code]:'unavailable');
  }
  if(!object(result.data)||Object.keys(result.data).length!==1||!Object.hasOwn(result.data,CHUCK_OPERATIONS[operationName].field))throw fail('invalid-response');
  return result.data[CHUCK_OPERATIONS[operationName].field];
 };
}
