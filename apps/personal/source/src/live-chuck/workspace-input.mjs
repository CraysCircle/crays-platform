/** Personal workspace projection contract. Sources and permissions are validated
 * again by Core. A valid DTO alone grants no data, tools, contact or model use.
 * Original agent taskflows, originals, memory and calendars retain their stores.
 */
const bad=()=>{throw Error('PERSONAL_WORKSPACE_INVALID_INPUT');};
function object(value,keys){
 if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))bad();
 const descriptors=Object.getOwnPropertyDescriptors(value);
 if(Reflect.ownKeys(descriptors).length!==keys.length||keys.some(k=>!Object.hasOwn(descriptors,k)||!Object.hasOwn(descriptors[k],'value')))bad();
 return Object.fromEntries(keys.map(k=>[k,descriptors[k].value]));
}
function list(value,max){
 if(!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype)bad();const d=Object.getOwnPropertyDescriptors(value),n=d.length.value;
 if(n>max||Reflect.ownKeys(d).length!==n+1)bad();const out=[];for(let i=0;i<n;i++){if(!Object.hasOwn(d,i)||!Object.hasOwn(d[i],'value'))bad();out.push(d[i].value);}return out;
}
const text=(v,max,empty=false)=>{if(typeof v!=='string'||v.trim()!==v||(!empty&&!v.length)||new TextEncoder().encode(v).byteLength>max||/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(v))bad();return v;};
const ref=v=>{if(typeof v!=='string'||!/^[-a-zA-Z0-9_:/.]{1,200}$/.test(v)||v.includes('..'))bad();return v;};
const revision=v=>{if(typeof v!=='string'||!/^[1-9][0-9]{0,17}$/.test(v)||BigInt(v)>9223372036854775806n)bad();return v;};
const hash=v=>{if(typeof v!=='string'||!/^[a-f0-9]{64}$/.test(v))bad();return v;};
const uuid=v=>{if(typeof v!=='string'||!/^personal-workspace-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(v))bad();return v;};
function source(value){const v=object(value,['kind','id','version','sha256']);if(!['original-request','public-profile','personal-plan'].includes(v.kind))bad();return Object.freeze({kind:v.kind,id:ref(v.id),version:revision(v.version),sha256:hash(v.sha256)});}
function person(value){const v=object(value,['namespace','personId','pubkey','profileVersion','profileSHA256']);if(v.namespace!=='existing-owned-test-network')bad();return Object.freeze({namespace:v.namespace,personId:ref(v.personId),pubkey:hash(v.pubkey),profileVersion:revision(v.profileVersion),profileSHA256:hash(v.profileSHA256)});}
function payload(kind,input){
 if(kind==='recommendation'){
  const p=object(input,['title','summary','person','purpose','rationale','state']);if(!['Business','Socializing','Dating'].includes(p.purpose)||!['suggested','saved','dismissed'].includes(p.state))bad();
  const rationale=list(p.rationale,8).map(v=>text(v,1024));if(!rationale.length)bad();return Object.freeze({title:text(p.title,640),summary:text(p.summary,4096),person:person(p.person),purpose:p.purpose,rationale:Object.freeze(rationale),state:p.state});
 }
 bad();
}
export function captureWorkspaceWrite(input){
 const v=object(input,['id','kind','expectedVersion','expectedContactRevision','idempotencyKey','provenance','sources','payload']);
 if(v.id===null){if(v.expectedVersion!==null)bad();}else{uuid(v.id);revision(v.expectedVersion);}
 if(!['recommendation'].includes(v.kind)||!['user-authored','explicit-test-data'].includes(v.provenance)||typeof v.idempotencyKey!=='string'||!/^[-a-zA-Z0-9_:]{16,96}$/.test(v.idempotencyKey))bad();
 revision(v.expectedContactRevision);const sources=list(v.sources,16).map(source);if(!sources.length||new Set(sources.map(s=>s.kind+':'+s.id)).size!==sources.length)bad();
 const data=payload(v.kind,v.payload);
 if(v.kind==='recommendation'&&!sources.some(s=>s.kind==='public-profile'&&s.id===data.person.personId&&s.version===data.person.profileVersion&&s.sha256===data.person.profileSHA256))bad();
 return Object.freeze({...v,sources:Object.freeze(sources),payload:data});
}
export function captureWorkspacePage(input){const v=object(input,['kind','afterId','afterVersion']);if(!['recommendation'].includes(v.kind))bad();if(v.afterId===null){if(v.afterVersion!==null)bad();}else{uuid(v.afterId);revision(v.afterVersion);}return Object.freeze(v);}
export function captureWorkspaceRead(input){const v=object(input,['id']);return Object.freeze({id:uuid(v.id)});}
export function captureWorkspaceArchive(input){const v=object(input,['id','expectedVersion','expectedContactRevision','idempotencyKey']);uuid(v.id);revision(v.expectedVersion);revision(v.expectedContactRevision);if(typeof v.idempotencyKey!=='string'||!/^[-a-zA-Z0-9_:]{16,96}$/.test(v.idempotencyKey))bad();return Object.freeze(v);}
