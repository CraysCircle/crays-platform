import {fail,immutable,originalID,revision,validBody} from './protocol.mjs';
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const date=v=>typeof v==='string'&&v.length===24&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v;
const invalid=()=>{throw fail('invalid-response');};
// This fixed text APQ deliberately omits attachment originals. Other rows may
// therefore contain a file-only blank body; no attachment or source claim is
// inferred from that blank. The selected task source must have actual text.
const text=v=>validBody(v)||typeof v==='string'&&v.trim()===''&&new TextEncoder().encode(v).length<=16384;
export function personalRequestPage(value){
 if(!object(value)||!originalID(value.bindingId,'personal-binding-')||!revision(value.revision)||!originalID(value.conversationId,'personal-conversation-')||typeof value.hasOlderRequests!=='boolean'||!Array.isArray(value.requests)||value.requests.length>50)invalid();
 const requests=value.requests.map(r=>{if(!object(r)||!originalID(r.messageId,'personal-message-')||!originalID(r.receiptId,'personal-receipt-')||!text(r.body)||!date(r.createdAt)||!date(r.acceptedAt)||r.acceptedAt<r.createdAt||r.acceptanceOutcome!=='STORED_RUNTIME_UNAVAILABLE'||r.runtimeAdmissionState!=='waiting_runtime_admission'||!['NOT_ATTEMPTED','CHECK_REQUIRED','ACKNOWLEDGED','FAILED','RESPONSE_AVAILABLE'].includes(r.dispatchState))invalid();return {messageId:r.messageId,receiptId:r.receiptId,body:r.body,createdAt:r.createdAt,acceptedAt:r.acceptedAt,acceptanceOutcome:r.acceptanceOutcome,runtimeAdmissionState:r.runtimeAdmissionState,dispatchState:r.dispatchState};});
 if(new Set(requests.map(r=>r.messageId)).size!==requests.length||new Set(requests.map(r=>r.receiptId)).size!==requests.length||requests.some((r,i)=>i&&requests[i-1].createdAt>r.createdAt)||(value.hasOlderRequests?(requests.length!==50||value.nextBeforeMessageId!==requests[0].messageId):value.nextBeforeMessageId!=null))invalid();
 return immutable({bindingId:value.bindingId,revision:value.revision,conversationId:value.conversationId,requests,hasOlderRequests:value.hasOlderRequests,nextBeforeMessageId:value.nextBeforeMessageId??null});
}
