/** Original Core recommendation reads and captured updates of existing records.
 * Current Core admission remains mandatory; no identity/permission fallback. */
import {captureWorkspaceWrite} from './workspace-input.mjs';
const operations=Object.freeze({
 WriteNativePersonalWorkspaceRecommendation:{field:'writeNativePersonalWorkspaceRecommendation',hash:'5895c6afff05b86e3c87d346e48b819e4bf3b9801ec2d3ccbdbf09c77dfedd53'},
 SeedNativePersonalWorkspaceTestData:{field:'seedNativePersonalWorkspaceTestData',hash:'3a1059b9fd82b7ce9f110716cd96559238863b51f585922719eb58e76252862f'},
 NativePersonalWorkspaceRecommendations:{field:'nativePersonalWorkspaceRecommendations',hash:'8075e1084e6fae1636930f6d51d4a629d98e3e9e44fc8d6e3bf39cc54c4abac3'},
 NativePersonalWorkspaceRecommendation:{field:'nativePersonalWorkspaceRecommendation',hash:'2073bc5275598902e18e0db2b389cd87d29d30cf7761bf55ee9bff672cae2dab'}
});
const fail=code=>Object.assign(new Error('WORKSPACE_'+code),{code});
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const id=v=>typeof v==='string'&&/^personal-workspace-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(v);
const revision=v=>typeof v==='string'&&/^[1-9][0-9]{0,17}$/.test(v)&&BigInt(v)<=9223372036854775806n;
const hash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const text=(v,max)=>typeof v==='string'&&v.trim()===v&&v.length>0&&new TextEncoder().encode(v).length<=max&&!/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(v);
const ref=v=>typeof v==='string'&&/^[-a-zA-Z0-9_:/.]{1,200}$/.test(v)&&!v.includes('..');
const date=v=>typeof v==='string'&&/^\d{4}-\d\d-\d\dT/.test(v)&&Number.isFinite(Date.parse(v));
const freeze=v=>{if(object(v)||Array.isArray(v)){for(const child of Object.values(v))freeze(child);Object.freeze(v);}return v;};
export function workspaceRecommendation(input){
 // Snapshot parsed data: future changes to a transport object must not alter UI.
 const v=structuredClone(input),p=v?.payload,person=p?.person;
 if(!object(v)||!id(v.id)||!revision(v.version)||v.kind!=='recommendation'||!['user-authored','explicit-test-data'].includes(v.provenance)||!hash(v.contentSHA256)||!date(v.createdAt)||!date(v.updatedAt)||Date.parse(v.updatedAt)<Date.parse(v.createdAt))throw fail('invalid-response');
 for(const key of ['nodeExecutionAuthorized','contactDisclosureAuthorized','providerDisclosureAuthorized','spendingAuthorized'])if(v[key]!==false)throw fail('invalid-response');
 if(!object(p)||!text(p.title,640)||!text(p.summary,4096)||!['Business','Socializing','Dating'].includes(p.purpose)||!['suggested','saved','dismissed'].includes(p.state)||!Array.isArray(p.rationale)||!p.rationale.length||p.rationale.length>8||!p.rationale.every(s=>text(s,1024)))throw fail('invalid-response');
 if(!object(person)||person.namespace!=='existing-owned-test-network'||!ref(person.personId)||!hash(person.pubkey)||!revision(person.profileVersion)||!hash(person.profileSHA256))throw fail('invalid-response');
 if(!Array.isArray(v.sources)||!v.sources.length||v.sources.length>16||!v.sources.every(s=>object(s)&&['original-request','public-profile','personal-plan'].includes(s.kind)&&ref(s.id)&&revision(s.version)&&hash(s.sha256))||new Set(v.sources.map(s=>s.kind+':'+s.id)).size!==v.sources.length||!v.sources.some(s=>s.kind==='public-profile'&&s.id===person.personId&&s.version===person.profileVersion&&s.sha256===person.profileSHA256))throw fail('invalid-response');
 // Whitelist fields; no arbitrary/private Core properties reach the workspace.
 return freeze({id:v.id,version:v.version,kind:v.kind,provenance:v.provenance,createdAt:v.createdAt,updatedAt:v.updatedAt,contentSHA256:v.contentSHA256,
  sources:v.sources.map(({kind,id,version,sha256})=>({kind,id,version,sha256})),
  payload:{title:p.title,summary:p.summary,purpose:p.purpose,state:p.state,rationale:[...p.rationale],person:{namespace:person.namespace,personId:person.personId,pubkey:person.pubkey,profileVersion:person.profileVersion,profileSHA256:person.profileSHA256}},
  profilePath:'/explore/people/'+person.pubkey,nodeExecutionAuthorized:false,contactDisclosureAuthorized:false,providerDisclosureAuthorized:false,spendingAuthorized:false});
}
export function workspacePage(v){
 if(!object(v)||!Array.isArray(v.records)||v.records.length>50||typeof v.hasMore!=='boolean'||v.completeHistory!==!v.hasMore||(v.hasMore?(!object(v.nextAfter)||!id(v.nextAfter.id)||!revision(v.nextAfter.version)):v.nextAfter!==null))throw fail('invalid-response');
 const records=v.records.map(workspaceRecommendation);
 if(new Set(records.map(r=>r.id)).size!==records.length||records.some((r,i)=>i>0&&records[i-1].id>=r.id))throw fail('invalid-response');
 return freeze({records,hasMore:v.hasMore,completeHistory:v.completeHistory,nextAfter:v.hasMore?{id:v.nextAfter.id,version:v.nextAfter.version}:null});
}
export function createWorkspaceReader({fetch:fetcher=globalThis.fetch,accountScope,assertCurrent}){
 if(typeof fetcher!=='function'||typeof assertCurrent!=='function'||typeof accountScope!=='string'||!/^[\x21-\x7e]{1,200}$/.test(accountScope))throw fail('invalid-context');
 async function read(operation,variables,signal){
  assertCurrent();const op=operations[operation];let response;
  try{response=await fetcher('/api/crays/personal/chuck',{method:'POST',credentials:'same-origin',cache:'no-store',redirect:'error',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(20000)]):AbortSignal.timeout(20000),headers:{Accept:'application/json','Content-Type':'application/json','X-Crays-Web-Account-Context':accountScope},body:JSON.stringify({operationName:operation,variables,extensions:{persistedQuery:{version:1,sha256Hash:op.hash}}})});}catch{assertCurrent();throw fail(signal?.aborted?'cancelled':'connection');}
  assertCurrent();if(signal?.aborted)throw fail('cancelled');
  if(response.status===401||response.status===403)throw fail('access-denied');
  if(!response.ok||!['application/json','application/graphql-response+json'].includes(response.headers.get('content-type')?.split(';')[0].trim().toLowerCase()))throw fail('unavailable');
  const reader=response.body?.getReader();if(!reader)throw fail('invalid-response');let size=0;const chunks=[];
  try{for(;;){const part=await reader.read();assertCurrent();if(signal?.aborted)throw fail('cancelled');if(part.done)break;size+=part.value.length;if(size>1024*1024)throw fail('invalid-response');chunks.push(part.value);}}catch(e){try{await reader.cancel();}catch{}throw e;}finally{reader.releaseLock();}
  assertCurrent();const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}let value;
  try{value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{throw fail('invalid-response');}
  if(value?.errors?.length){
   // The original BFF deliberately omits account context on error responses.
   // A failed read carries no usable records. Preserve exact public denials
   // without mistaking a transport/Core failure for a changed account.
   const code=Array.isArray(value.errors)&&value.errors.length===1&&value.data==null?value.errors[0]?.extensions?.code:null;
   const denied=['NATIVE_AUTHENTICATION_REQUIRED','NATIVE_PERSONAL_CURRENT_OWNER_REQUIRED','NATIVE_PERSONAL_BINDING_REVOKED'];
   const changed=['NATIVE_CONTACT_STATE_CHANGED','NATIVE_PERSONAL_CONTACT_CHANGED','NATIVE_PERSONAL_BINDING_CHANGED','NATIVE_PERSONAL_CURRENT_BINDING_REQUIRED'];
   throw fail(denied.includes(code)?'access-denied':changed.includes(code)?'context-changed':typeof code==='string'&&code.endsWith('OUTCOME_UNKNOWN')?'outcome-unknown':'unavailable');
  }
  // No successful payload is usable without the exact canonical context.
  if(response.headers.get('X-Crays-Web-Account-Context')!==accountScope)throw fail('context-changed');
  if(!object(value)||!object(value.data)||Object.keys(value.data).length!==1||!Object.hasOwn(value.data,op.field))throw fail('unavailable');
  assertCurrent();return value.data[op.field];
 }
 return Object.freeze({
  async write(command,{signal}={}){const captured=captureWorkspaceWrite(command);if(!captured.id)throw fail('invalid-id');return read('WriteNativePersonalWorkspaceRecommendation',{input:captured},signal);},
  async seed({signal}={}){
   const v=await read('SeedNativePersonalWorkspaceTestData',{},signal);
   if(!object(v)||typeof v.eligible!=='boolean'||v.realm!=='crays-isolated-demo'||v.newPeopleCreated!==0||v.newAgentsCreated!==0||v.externalActionsPerformed!==false||!Array.isArray(v.receipts)||v.receipts.length>20||!v.eligible&&v.receipts.length||!v.receipts.every(r=>object(r)&&id(r.id)&&revision(r.version)&&typeof r.receiptId==='string'&&/^personal-workspace-receipt-[0-9a-f-]{36}$/.test(r.receiptId)&&typeof r.replayed==='boolean'&&ref(r.sourcePersonId))||new Set(v.receipts.map(r=>r.id)).size!==v.receipts.length)throw fail('invalid-response');
   return freeze({eligible:v.eligible,receipts:v.receipts.map(({id,version,receiptId,replayed,sourcePersonId})=>({id,version,receiptId,replayed,sourcePersonId}))});
  },
  async page({after=null,signal}={}){if(after!==null&&(!object(after)||!id(after.id)||!revision(after.version)))throw fail('invalid-cursor');const result=workspacePage(await read('NativePersonalWorkspaceRecommendations',after?{afterId:after.id,afterVersion:after.version}:{},signal));if(after&&result.records.some(r=>r.id<=after.id)||result.hasMore&&after&&result.nextAfter.id<=after.id)throw fail('cursor-changed');return result;},
  async detail(recordId,{signal}={}){if(!id(recordId))throw fail('invalid-id');const result=workspaceRecommendation(await read('NativePersonalWorkspaceRecommendation',{id:recordId},signal));if(result.id!==recordId)throw fail('invalid-response');return result;}
 });
}
