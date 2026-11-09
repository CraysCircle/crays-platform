import {fail,immutable,identifier,originalID,revision} from './protocol.mjs';
import {ORIGINAL_MIME_TYPES,NATIVE_ORIGINAL_TRANSFER_MAX_BYTES} from './originals.mjs';
const reject=()=>{throw fail('invalid-upload');};
const text=value=>typeof value==='string'&&!value.includes('\0')&&!/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(value);
function fields(value,required,optional=[]){
 if(!value||typeof value!=='object'||Array.isArray(value))reject();
 const descriptors=Object.getOwnPropertyDescriptors(value),allowed=[...required,...optional];
 if(Reflect.ownKeys(descriptors).some(key=>!allowed.includes(key)||!Object.hasOwn(descriptors[key],'value'))||required.some(key=>!Object.hasOwn(descriptors,key)))reject();
 return Object.fromEntries(Reflect.ownKeys(descriptors).map(key=>[key,descriptors[key].value]));
}
function dense(value){
 if(!Array.isArray(value)||value.length<1||value.length>8)reject();
 const d=Object.getOwnPropertyDescriptors(value);if(Reflect.ownKeys(d).length!==value.length+1)reject();
 return Array.from({length:value.length},(_,i)=>{if(!Object.hasOwn(d[i]??{},'value'))reject();return d[i].value;});
}
/** Exact original multipart metadata. Local identity covers bytes/digest,
 * filename, retention AND explicit inputPurpose; none is replaceable on retry. */
export function captureOriginalUploadCommand(value){
 const v=fields(value,['bindingId','expectedBindingRevision','expectedContactRevision','idempotencyKey','body','originals'],['inputPurpose']);
 if(!originalID(v.bindingId,'personal-binding-')||!revision(v.expectedBindingRevision)||!revision(v.expectedContactRevision)||!identifier(v.idempotencyKey)||!text(v.body)||new TextEncoder().encode(v.body).length>16384||Object.hasOwn(v,'inputPurpose')&&v.inputPurpose!=='personal-chuck-input')reject();
 let total=0;
 const originals=dense(v.originals).map(value=>{
  const r=fields(value,['mimeType','byteLength','sha256','retainSeconds'],['displayName']);
  if(!ORIGINAL_MIME_TYPES.includes(r.mimeType)||!Number.isSafeInteger(r.byteLength)||r.byteLength<1||(total+=r.byteLength)>NATIVE_ORIGINAL_TRANSFER_MAX_BYTES||typeof r.sha256!=='string'||!/^[a-f0-9]{64}$/.test(r.sha256)||!Number.isSafeInteger(r.retainSeconds)||r.retainSeconds<300||r.retainSeconds>2592000)reject();
  if(Object.hasOwn(r,'displayName')&&(!text(r.displayName)||!r.displayName.length||r.displayName.trim()!==r.displayName||['.','..'].includes(r.displayName)||new TextEncoder().encode(r.displayName).length>255||/[/\\\p{Cc}\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069\ufeff]/u.test(r.displayName)))reject();
  return {mimeType:r.mimeType,byteLength:r.byteLength,sha256:r.sha256,retainSeconds:r.retainSeconds,...(Object.hasOwn(r,'displayName')?{displayName:r.displayName}:{})};
 });
 const command={bindingId:v.bindingId,expectedBindingRevision:v.expectedBindingRevision,expectedContactRevision:v.expectedContactRevision,idempotencyKey:v.idempotencyKey,body:v.body,originals,...(Object.hasOwn(v,'inputPurpose')?{inputPurpose:v.inputPurpose}:{})};
 if(new TextEncoder().encode(JSON.stringify(command)).length>32768)reject();
 return immutable(command);
}
/** Snapshot every selected byte before any async digest. Caller mutation of
 * its selection cannot alter the captured payload; recheck after local reads
 * and before network use. Returned buffers are owned by the consuming layer. */
export async function captureOriginalUploadBytes(value,payloads,{subtle=globalThis.crypto?.subtle,assertCurrent=()=>{}}={}){
 const command=captureOriginalUploadCommand(value),selected=dense(payloads);assertCurrent();
 if(selected.length!==command.originals.length||!subtle||typeof subtle.digest!=='function')reject();
 const captured=selected.map((bytes,i)=>{
  if(!(bytes instanceof Uint8Array)&&!(bytes instanceof ArrayBuffer)||bytes.byteLength!==command.originals[i].byteLength)reject();
  let snapshot;if(bytes instanceof Uint8Array)snapshot=Uint8Array.from(bytes);else if(bytes instanceof ArrayBuffer)snapshot=new Uint8Array(bytes.slice(0));else reject();
  if(snapshot.byteLength!==command.originals[i].byteLength)reject();return snapshot;
 });
 for(let i=0;i<captured.length;i++){
  assertCurrent();const digest=new Uint8Array(await subtle.digest('SHA-256',captured[i]));assertCurrent();
  if(Array.from(digest,b=>b.toString(16).padStart(2,'0')).join('')!==command.originals[i].sha256)reject();
 }
 return captured.map(bytes=>bytes.buffer);
}
