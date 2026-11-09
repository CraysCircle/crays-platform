import {createHash} from 'node:crypto';

export const MAX_PERSONAL_ATTACHMENT_BYTES = 64 * 1024 * 1024;
export const PERSONAL_ATTACHMENT_MIME_TYPES = Object.freeze([
 'image/jpeg','image/png','image/webp','image/heic','image/heif',
 'video/mp4','video/webm','video/quicktime','text/plain',
 'audio/mp4','audio/aac','audio/mpeg','audio/wav','audio/x-wav','audio/vnd.wave',
 'application/pdf',
 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);
const id = s => typeof s === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(s);
const fail = () => {throw Error('PERSONAL_ATTACHMENT_INVALID_INPUT');};
/** Display-only untrusted basename, never a path/header/decoder instruction.
 * Keep the exact supplied Unicode text; do not invent names for older originals.
 */
export function captureOwnOriginalDisplayName(value) {
 if(typeof value!=='string'||value.length===0||Buffer.byteLength(value,'utf8')>255||
    value.trim()!==value||value==='.'||value==='..'||
    /[/\\\p{Cc}\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069\ufeff]/u.test(value)||
    /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(value))fail();
 return value;
}
function captureFields(value,names,optional=[]) {
 if(!value||typeof value!=='object'||Array.isArray(value))fail();
 const d=Object.getOwnPropertyDescriptors(value),allowed=[...names,...optional];
 if(Reflect.ownKeys(d).some(k=>!allowed.includes(k)||!Object.hasOwn(d[k],'value'))||names.some(k=>!Object.hasOwn(d,k)))fail();
 return Object.fromEntries(Reflect.ownKeys(d).map(k=>[k,d[k].value]));
}

/** An authenticated OWN upload command, never an AI decode/edit approval.
 * Detach caller bytes before the first asynchronous identity/SQL operation.
 * MIME is a declared format; this validator does NOT claim container validity.
 */
export function captureOwnAttachmentUpload(input) {
 const value=captureFields(input,['messageId','receiptId','idempotencyKey','expectedContactRevision','mimeType','bytes','retainSeconds'],['displayName']);
 if(Object.hasOwn(value,'displayName'))value.displayName=captureOwnOriginalDisplayName(value.displayName);
 if (![value.messageId,value.receiptId,value.idempotencyKey].every(id) ||
     typeof value.expectedContactRevision !== 'string' || !/^[1-9][0-9]{0,18}$/.test(value.expectedContactRevision) ||
     !PERSONAL_ATTACHMENT_MIME_TYPES.includes(value.mimeType) || !Buffer.isBuffer(value.bytes) ||
     value.bytes.length < 1 || value.bytes.length > MAX_PERSONAL_ATTACHMENT_BYTES ||
     !Number.isSafeInteger(value.retainSeconds) || value.retainSeconds < 300 || value.retainSeconds > 2592000) fail();
 const bytes = Buffer.from(value.bytes);
 const sha256 = createHash('sha256').update(bytes).digest('hex');
 const fingerprint = createHash('sha256').update(JSON.stringify([
  'crays.personal-message-attachment.upload.v1',value.messageId,value.receiptId,
  value.expectedContactRevision,value.mimeType,bytes.length,sha256,value.retainSeconds,
  ...(value.displayName===undefined?[]:[value.displayName]),
 ])).digest('hex');
 // Buffer is private to this closure. No returned mutable byte array may alter
 // the captured command; each SQL submission receives a separate copy.
 delete value.bytes;
 return Object.freeze({...value,byteLength:bytes.length,sha256,fingerprint,
  copyBytes: () => Buffer.from(bytes)});
}

export function captureOwnAttachmentReference(input) {
 if (!input || typeof input !== 'object' || Array.isArray(input)) fail();
 const d = Object.getOwnPropertyDescriptors(input);
 const names = ['attachmentId','version','sha256'];
 if (Reflect.ownKeys(d).length !== names.length || names.some(k => !Object.hasOwn(d,k) || !Object.hasOwn(d[k],'value'))) fail();
 const v = Object.fromEntries(names.map(k => [k,d[k].value]));
 if (typeof v.attachmentId !== 'string' || !/^personal-attachment-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v.attachmentId) ||
     v.version !== 1 || typeof v.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(v.sha256)) fail();
 return Object.freeze(v);
}

/** Capture a complete OWN message before SQL starts. No public APQ expansion,
 * identity, effect approval or file-path authority. Original order is part of
 * idempotency; newly generated database IDs are deliberately not part of it.
 * File-only messages retain their actual empty body instead of invented text.
 */
export function captureOwnMessageWithOriginals(input) {
 const v=captureFields(input,['bindingId','expectedBindingRevision','expectedContactRevision','idempotencyKey','body','originals']);
 if (!id(v.bindingId)||!id(v.idempotencyKey)||
     ![v.expectedBindingRevision,v.expectedContactRevision].every(s=>typeof s==='string'&&/^[1-9][0-9]{0,18}$/.test(s))||
     typeof v.body!=='string'||Buffer.byteLength(v.body,'utf8')>16384||v.body.includes('\u0000')||
     /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(v.body)||
     !Array.isArray(v.originals)||v.originals.length<1||v.originals.length>8) fail();
 const a=Object.getOwnPropertyDescriptors(v.originals);
 if (Reflect.ownKeys(a).length!==v.originals.length+1) fail();
 let total=0;
 const uploads=[];
 for(let i=0;i<v.originals.length;i++) {
  if (!Object.hasOwn(a,String(i))||!Object.hasOwn(a[String(i)],'value')) fail();
  const original=captureFields(a[String(i)].value,['mimeType','bytes','retainSeconds'],['displayName']);
  if(!Buffer.isBuffer(original.bytes)||(total+=original.bytes.length)>MAX_PERSONAL_ATTACHMENT_BYTES)fail();
  uploads.push(captureOwnAttachmentUpload({...original,messageId:'pending-message',receiptId:'pending-receipt',
   expectedContactRevision:v.expectedContactRevision,
   idempotencyKey:'atomic-original-'+createHash('sha256').update(JSON.stringify([v.idempotencyKey,i])).digest('hex')}));
 }
 const message=Object.freeze(Object.fromEntries(['bindingId','expectedBindingRevision','expectedContactRevision','idempotencyKey','body'].map(k=>[k,v[k]])));
 const originalIdentity=Object.freeze(uploads.map(u=>Object.freeze([u.mimeType,u.byteLength,u.sha256,u.retainSeconds,...(u.displayName===undefined?[]:[u.displayName])])));
 return Object.freeze({message,originalIdentity,materialize:(messageId,receiptId)=>Object.freeze(uploads.map(u=>
  captureOwnAttachmentUpload({messageId,receiptId,idempotencyKey:u.idempotencyKey,expectedContactRevision:u.expectedContactRevision,
   mimeType:u.mimeType,bytes:u.copyBytes(),retainSeconds:u.retainSeconds,...(u.displayName===undefined?{}:{displayName:u.displayName})}))) });
}
