import 'server-only';
import {createHash} from 'node:crypto';
import {captureOwnAttachmentReference,PERSONAL_ATTACHMENT_MIME_TYPES} from '../db/personal-message-attachment-input.mjs';

const deny=()=>{throw Error('NATIVE_PERSONAL_SDK_ORIGINAL_ENCODING_REJECTED');};
function data(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))deny();
 if(Reflect.ownKeys(value).some(k=>typeof k!=='string'))deny();
 const descriptors=Object.getOwnPropertyDescriptors(value);
 if(Object.values(descriptors).some(p=>!Object.hasOwn(p,'value')))deny();
 return Object.fromEntries(Object.entries(descriptors).map(([k,p])=>[k,p.value]));
}
/** Pure byte formatting, NOT Core/agent/model/disclosure authority. The host
 * must separately resolve an authorized original for the exact committed input
 * and enforce current SDK/model capability before any IO. No file, URL,
 * provider credential, decoder, private directory or chat.send is used here.
 * The existing MEDIA_ADMISSION_REQUIRED gate remains unchanged.
 */
export function encodeCanonicalOriginalForSdk(original,expectedReference,limits){
 const input=data(original),r=data(input.receipt),reference=data(expectedReference),cap=data(limits);
 if(Object.keys(reference).sort().join(',')!=='attachmentId,messageId,messageReceiptId,registrationReceiptId,sha256,version')deny();
 const expected={...captureOwnAttachmentReference({attachmentId:reference.attachmentId,version:reference.version,sha256:reference.sha256}),
  messageId:reference.messageId,messageReceiptId:reference.messageReceiptId,registrationReceiptId:reference.registrationReceiptId};
 for(const[k,prefix]of [['messageId','personal-message-'],['messageReceiptId','personal-receipt-'],['registrationReceiptId','personal-attachment-registration-']]){
  if(typeof expected[k]!=='string'||!new RegExp('^'+prefix+'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$').test(expected[k]))deny();
 }
 if(!Number.isSafeInteger(cap.maximumOriginalBytes)||cap.maximumOriginalBytes<1||cap.maximumOriginalBytes>64*1024*1024||
    !Number.isSafeInteger(cap.maximumEncodedBytes)||cap.maximumEncodedBytes<1||cap.maximumEncodedBytes>25*1024*1024)deny();
 if(r.schema!=='crays.personal-message-attachment.registration.v1'||r.available!==true||
    r.attachmentId!==expected.attachmentId||r.version!==expected.version||r.sha256!==expected.sha256||
    r.messageId!==expected.messageId||r.messageReceiptId!==expected.messageReceiptId||r.registrationReceiptId!==expected.registrationReceiptId||
    !PERSONAL_ATTACHMENT_MIME_TYPES.includes(r.mimeType)||!Number.isSafeInteger(r.byteLength)||r.byteLength<1||r.byteLength>cap.maximumOriginalBytes)deny();
 if(!ArrayBuffer.isView(input.bytes)||![Buffer.prototype,Uint8Array.prototype].includes(Object.getPrototypeOf(input.bytes))||input.bytes.byteLength!==r.byteLength)deny();
 // Detach before hashing/encoding. Later mutation of a source buffer cannot
 // retarget an already formatted input; metadata strings are never bytes.
 const bytes=Buffer.from(input.bytes);
 if(createHash('sha256').update(bytes).digest('hex')!==expected.sha256)deny();
 const attachment=Object.freeze({type:r.mimeType.startsWith('image/')?'image':'file',mimeType:r.mimeType,
  fileName:'original',sizeBytes:bytes.byteLength,content:bytes.toString('base64'),origin:'file'});
 if(Buffer.byteLength(JSON.stringify(attachment))>cap.maximumEncodedBytes)deny();
 return attachment;
}
