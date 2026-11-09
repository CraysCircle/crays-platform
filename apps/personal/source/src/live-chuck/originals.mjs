import {fail,immutable,originalID,revision} from './protocol.mjs';
import {personalRequestPage} from './requests.mjs';

// Pinned V220 Core source metadata. The native HTTP byte-transfer limit is
// separately 16 MiB; accepting a reference never promises a download or grant.
export const ORIGINAL_REFERENCE_MAX_BYTES=64*1024*1024;
export const NATIVE_ORIGINAL_TRANSFER_MAX_BYTES=16*1024*1024;
export const ORIGINAL_MIME_TYPES=Object.freeze(['image/jpeg','image/png','image/webp','image/heic','image/heif','video/mp4','video/webm','video/quicktime','text/plain','audio/mp4','audio/aac','audio/mpeg','audio/wav','audio/x-wav','audio/vnd.wave','application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.openxmlformats-officedocument.presentationml.presentation']);
const invalid=()=>{throw fail('invalid-response');};
const fields=(value,required,optional=[])=>{
 if(!value||typeof value!=='object'||Array.isArray(value))invalid();
 const descriptors=Object.getOwnPropertyDescriptors(value),allowed=[...required,...optional];
 if(Reflect.ownKeys(descriptors).some(key=>!allowed.includes(key)||!Object.hasOwn(descriptors[key],'value'))||required.some(key=>!Object.hasOwn(descriptors,key)))invalid();
 return Object.fromEntries(Reflect.ownKeys(descriptors).map(key=>[key,descriptors[key].value]));
};
const array=(value,maximum)=>{
 if(!Array.isArray(value)||value.length>maximum)invalid();
 const descriptors=Object.getOwnPropertyDescriptors(value);
 if(Reflect.ownKeys(descriptors).length!==value.length+1)invalid();
 return Array.from({length:value.length},(_,index)=>{const d=descriptors[String(index)];if(!d||!Object.hasOwn(d,'value'))invalid();return d.value;});
};
const date=value=>typeof value==='string'&&value.length===24&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString()===value;
const text=value=>typeof value==='string'&&!value.includes('\0')&&!/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(value)&&new TextEncoder().encode(value).length<=16384;
const canonicalID=(value,prefix)=>originalID(value,prefix)&&value===value.toLowerCase();
const referenceKeys=['attachmentId','version','sha256','mimeType','byteLength','messageReceiptId','registrationReceiptId','createdAt','expiresAt','availability'];

/** An original reference is provenance, not a URL or a byte-read capability. */
export function originalReference(value){
 const r=fields(value,referenceKeys,['displayName']);
 if(!canonicalID(r.attachmentId,'personal-attachment-')||r.version!==1||typeof r.sha256!=='string'||!/^[0-9a-f]{64}$/.test(r.sha256)||!ORIGINAL_MIME_TYPES.includes(r.mimeType)||!Number.isSafeInteger(r.byteLength)||r.byteLength<1||r.byteLength>ORIGINAL_REFERENCE_MAX_BYTES||!canonicalID(r.messageReceiptId,'personal-receipt-')||!canonicalID(r.registrationReceiptId,'personal-attachment-registration-')||!date(r.createdAt)||!date(r.expiresAt)||!['RETAINED','ERASED','EXPIRED','UNAVAILABLE'].includes(r.availability))invalid();
 const retention=Date.parse(r.expiresAt)-Date.parse(r.createdAt);
 if(retention<300000||retention>2592000000)invalid();
 const displayName=r.displayName??null;
 if(displayName!==null&&(typeof displayName!=='string'||!displayName.length||displayName.trim()!==displayName||displayName==='.'||displayName==='..'||new TextEncoder().encode(displayName).length>255||/[/\\\p{Cc}\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069\ufeff]/u.test(displayName)||/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(displayName)))invalid();
 return immutable(Object.fromEntries([...referenceKeys.map(key=>[key,r[key]]),['displayName',displayName]]));
}

/** Capture exactly the original Core's three-field read input. The server must
 * still reauthenticate, reauthorize and verify current bytes and their digest. */
export function captureOriginalReadInput(value){const r=fields(value,['attachmentId','version','sha256']);if(!canonicalID(r.attachmentId,'personal-attachment-')||r.version!==1||typeof r.sha256!=='string'||!/^[0-9a-f]{64}$/.test(r.sha256))invalid();return immutable(r);}
export function originalReadReference(value){const r=originalReference(value);return captureOriginalReadInput({attachmentId:r.attachmentId,version:r.version,sha256:r.sha256});}
export function isOriginalLocallyRetained(value,instant=Date.now()){const r=originalReference(value);return Number.isFinite(instant)&&r.availability==='RETAINED'&&instant<Date.parse(r.expiresAt);}
export function canRefreshOriginal(previous,next){
 const before=originalReference(previous),after=originalReference(next);
 if([...referenceKeys.filter(key=>key!=='availability'),'displayName'].some(key=>before[key]!==after[key]))return false;
 if(before.availability==='ERASED')return after.availability==='ERASED';
 if(before.availability==='EXPIRED')return ['EXPIRED','ERASED'].includes(after.availability);
 return true;
}

function originals(value){
 if(typeof value.hasOriginals!=='boolean')invalid();
 const refs=array(value.originals,128).map(originalReference);
 if(!value.hasOriginals&&refs.length||new Set(refs.map(r=>r.attachmentId)).size!==refs.length||new Set(refs.map(r=>r.messageReceiptId)).size>1)invalid();
 return {hasOriginals:value.hasOriginals,originals:refs};
}
export function originalMessage(value){
 const m=fields(value,['messageId','body','createdAt','authorKind','agentId','inReplyToMessageId','hasOriginals','originals']),refs=originals(m);
 if(!originalID(m.messageId,'personal-message-')||!text(m.body)||!m.body.trim()&&!refs.hasOriginals||!date(m.createdAt)||!['OWNER','CHUCK'].includes(m.authorKind))invalid();
 if(m.authorKind==='OWNER'?(m.agentId!==null||m.inReplyToMessageId!==null):(refs.hasOriginals||refs.originals.length||typeof m.agentId!=='string'||!/^personal-[0-9a-f]{48}$/.test(m.agentId)||!originalID(m.inReplyToMessageId,'personal-message-')||m.inReplyToMessageId===m.messageId))invalid();
 return immutable({...m,...refs});
}
export function canRefreshOriginalMessage(previous,next){
 const before=originalMessage(previous),after=originalMessage(next);
 return ['messageId','body','createdAt','authorKind','agentId','inReplyToMessageId','hasOriginals'].every(key=>before[key]===after[key])&&before.originals.length===after.originals.length&&before.originals.every((r,index)=>canRefreshOriginal(r,after.originals[index]));
}

export function originalTranscript(value){
 const p=fields(value,['bindingId','revision','conversationId','hasOlderMessages','nextBeforeMessageId','messages']);
 if(!originalID(p.bindingId,'personal-binding-')||!revision(p.revision)||!originalID(p.conversationId,'personal-conversation-')||typeof p.hasOlderMessages!=='boolean')invalid();
 const messages=array(p.messages,50).map(originalMessage),refs=messages.flatMap(m=>m.originals);
 if(new Set(messages.map(m=>m.messageId)).size!==messages.length||new Set(refs.map(r=>r.attachmentId)).size!==refs.length||messages.some((m,index)=>index&&messages[index-1].createdAt>m.createdAt)||(p.hasOlderMessages?(messages.length!==50||p.nextBeforeMessageId!==messages[0].messageId):p.nextBeforeMessageId!==null))invalid();
 return immutable({...p,messages});
}

export function originalRequestPage(value){
 const p=fields(value,['bindingId','revision','conversationId','hasOlderRequests','nextBeforeMessageId','requests']);
 const rows=array(p.requests,50).map(row=>fields(row,['messageId','receiptId','body','createdAt','acceptedAt','acceptanceOutcome','runtimeAdmissionState','dispatchState','hasOriginals','originals']));
 const plain=personalRequestPage({...p,requests:rows}),requests=rows.map((row,index)=>{
  const refs=originals(row);
  if(!text(row.body)||!row.body.trim()&&!refs.hasOriginals||refs.originals.some(r=>r.messageReceiptId!==row.receiptId))invalid();
  return {...plain.requests[index],...refs};
 });
 const refs=requests.flatMap(r=>r.originals);
 if(new Set(refs.map(r=>r.attachmentId)).size!==refs.length)invalid();
 return immutable({...plain,requests});
}
