import {fail,immutable,originalID,receipt} from './protocol.mjs';
import {captureOriginalUploadCommand,captureOriginalUploadBytes} from './upload-command.mjs';
const date=value=>typeof value==='string'&&value.length===24&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString()===value;
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const exact=(value,names)=>object(value)&&Object.keys(value).sort().join(',')===[...names].sort().join(',');
/** Receipt-only reconciliation proves ingress storage, never source-use or
 * model execution. A direct explicit-input upload response must include the
 * original source-use projection; preserve its false execution/delivery flags. */
export function originalUploadReceipt(value,input,{allowReceiptOnly=false}={}){
 const command=captureOriginalUploadCommand(input),base=receipt(value),hasUse=object(value)&&Object.hasOwn(value,'sourceUse');
 if(!exact(value,['receiptId','messageId','outcome','replayed','createdAt',...(hasUse?['sourceUse']:[])]))throw fail('invalid-response');
 if(!hasUse){if(command.inputPurpose&&!allowReceiptOnly)throw fail('invalid-response');return base;}
 if(!command.inputPurpose)throw fail('invalid-response');
 const u=value.sourceUse,keys=['schema','sourceUseReceiptId','purpose','messageId','messageReceiptId','originals','agentId','bindingRevision','contactRevision','createdAt','expiresAt','current','replayed','modelExecutionAuthorized','sdkDelivered'];
 if(!exact(u,keys)||u.schema!=='crays.personal-original.source-use.v1'||!originalID(u.sourceUseReceiptId,'personal-original-use-')||u.purpose!=='personal-chuck-input'||u.messageId!==base.messageId||u.messageReceiptId!==base.receiptId||typeof u.agentId!=='string'||!/^personal-[a-f0-9]{48}$/.test(u.agentId)||u.bindingRevision!==command.expectedBindingRevision||u.contactRevision!==command.expectedContactRevision||!date(u.createdAt)||!date(u.expiresAt)||Date.parse(u.expiresAt)<=Date.parse(u.createdAt)||Date.parse(u.expiresAt)-Date.parse(u.createdAt)>86400000||typeof u.current!=='boolean'||typeof u.replayed!=='boolean'||u.modelExecutionAuthorized!==false||u.sdkDelivered!==false||!Array.isArray(u.originals)||u.originals.length!==command.originals.length||Object.keys(u.originals).length!==u.originals.length)throw fail('invalid-response');
 const originals=u.originals.map((r,i)=>{
  if(!exact(r,['attachmentId','version','sha256'])||!originalID(r.attachmentId,'personal-attachment-')||r.version!==1||r.sha256!==command.originals[i].sha256)throw fail('invalid-response');
  return {attachmentId:r.attachmentId,version:r.version,sha256:r.sha256};
 });
 if(new Set(originals.map(r=>r.attachmentId)).size!==originals.length)throw fail('invalid-response');
 return immutable({...base,sourceUse:{...u,originals}});
}
/** Fixed same-session multipart transport. No caller-selected URL/identity,
 * native bearer, provider, path or model. The browser supplies its multipart
 * boundary; each verified original part is named exactly 'original'. */
export function createOriginalUploadTransport({fetch:fetcher=globalThis.fetch,accountScope}={}){
 if(typeof fetcher!=='function'||typeof accountScope!=='string'||!accountScope.length||accountScope.length>200||/[^\x21-\x7e]/.test(accountScope))throw fail('invalid-context');
 return async(value,payloads,{signal,assertCurrent=()=>{}}={})=>{
  const current=()=>{if(signal?.aborted)throw fail('cancelled');assertCurrent();};
  current();const command=captureOriginalUploadCommand(value),bytes=await captureOriginalUploadBytes(command,payloads,{assertCurrent:current});current();
  const form=new FormData();form.set('metadata',new Blob([JSON.stringify(command)],{type:'application/json'}),'metadata.json');
  bytes.forEach((data,i)=>form.set('original'+i,new Blob([data],{type:command.originals[i].mimeType}),'original'));current();
  const requestSignal=signal?AbortSignal.any([signal,AbortSignal.timeout(20000)]):AbortSignal.timeout(20000);
  const networkCurrent=()=>{current();if(requestSignal.aborted)throw fail('connection');};
  let response;try{response=await fetcher('/api/crays/personal/chuck',{method:'POST',credentials:'same-origin',cache:'no-store',redirect:'error',headers:{Accept:'application/json','X-Crays-Web-Account-Context':accountScope},body:form,signal:requestSignal});}catch{current();throw fail('connection');}
  current();if(response.status===401||response.status===403)throw fail('access-denied');networkCurrent();
  if(response.status===409)throw fail('conflict');if(response.status===429)throw fail('upload-busy');
  if(!response.ok||!['application/json','application/graphql-response+json'].includes(response.headers.get('content-type')?.split(';')[0].trim().toLowerCase()))throw fail('unavailable');
  const reader=response.body?.getReader();if(!reader)throw fail('invalid-response');const parts=[];let size=0,complete=false;
  try{for(;;){networkCurrent();const part=await reader.read();networkCurrent();if(part.done){complete=true;break;}size+=part.value.byteLength;if(size>32768)throw fail('invalid-response');parts.push(part.value);}}
  catch(error){current();if(['invalid-response','cancelled'].includes(error?.code))throw error;throw fail('connection');}
  finally{if(!complete)try{await reader.cancel();}catch{/* A failed or cancelled response cannot authorize a retry. */}reader.releaseLock();}
  const data=new Uint8Array(size);let offset=0;for(const part of parts){data.set(part,offset);offset+=part.byteLength;}
  let result;try{result=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(data));}catch{throw fail('invalid-response');}networkCurrent();
  if(result?.errors?.length){
   const code=Array.isArray(result.errors)&&result.errors.length===1&&result.data==null?result.errors[0]?.extensions?.code:null;
   const mapped={NATIVE_AUTHENTICATION_REQUIRED:'access-denied',NATIVE_PERSONAL_CURRENT_OWNER_REQUIRED:'access-denied',NATIVE_PERSONAL_CURRENT_BINDING_REQUIRED:'binding-changed',NATIVE_PERSONAL_BINDING_REVOKED:'binding-revoked',NATIVE_PERSONAL_BINDING_CHANGED:'binding-changed',NATIVE_PERSONAL_CONTACT_CHANGED:'contact-changed',NATIVE_PERSONAL_IDEMPOTENCY_CONFLICT:'conflict',NATIVE_PERSONAL_OUTCOME_UNKNOWN:'outcome-unknown',NATIVE_PERSONAL_ORIGINAL_UPLOAD_BUSY:'upload-busy'};
   throw fail(Object.hasOwn(mapped,code)?mapped[code]:'unavailable');
  }
  if(!exact(result?.data,['receiveScopedAgentMessage']))throw fail('invalid-response');
  return originalUploadReceipt(result.data.receiveScopedAgentMessage,command);
 };
}
