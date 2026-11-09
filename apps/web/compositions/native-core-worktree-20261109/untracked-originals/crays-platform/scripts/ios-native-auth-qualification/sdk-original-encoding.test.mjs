import '../native-server/source-loader.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const {encodeCanonicalOriginalForSdk:encode}=await import('../../src/lib/native-personal-sdk-original-encoding.mjs');
const {t:normalize}=await import('/opt/crays/openclaw/dependency-artifacts/sdk4-complete/2badb63c9d2ed692a4d2d71c63e1d96ac7453a9c5519348a8dc5a001d611afbb/node_modules/openclaw/dist/attachment-normalize-Bgzo6FoE.mjs');
const {J:validateChatSendParams}=await import('/opt/crays/openclaw/dependency-artifacts/sdk4-complete/2badb63c9d2ed692a4d2d71c63e1d96ac7453a9c5519348a8dc5a001d611afbb/node_modules/openclaw/dist/src-l2dWvEsN.mjs');
const id='11111111-1111-4111-8111-111111111111';
function source(bytes=Buffer.from('synthetic original text'),mimeType='text/plain'){
 const receipt={schema:'crays.personal-message-attachment.registration.v1',attachmentId:'personal-attachment-'+id,version:1,
  sha256:createHash('sha256').update(bytes).digest('hex'),mimeType,byteLength:bytes.length,messageId:'personal-message-'+id,
  messageReceiptId:'personal-receipt-'+id,registrationReceiptId:'personal-attachment-registration-'+id,available:true,effectAuthorized:false,attachmentDelivered:false};
 const reference=Object.fromEntries(['attachmentId','version','sha256','messageId','messageReceiptId','registrationReceiptId'].map(k=>[k,receipt[k]]));
 return {original:{receipt,bytes},reference};
}
const caps={maximumOriginalBytes:1024*1024,maximumEncodedBytes:2*1024*1024};
test('exact detached bytes survive the unchanged original SDK normalizer',()=>{
 const s=source(),encoded=encode(s.original,s.reference,caps);s.original.bytes.fill(0);
 const actual=normalize([encoded]);assert.equal(actual.length,1);assert.equal(createHash('sha256').update(Buffer.from(actual[0].content,'base64')).digest('hex'),s.reference.sha256);
 assert.equal(actual[0].fileName,'original');assert.equal(encoded.origin,'file');assert.equal(Object.isFrozen(encoded),true);
 assert.equal(validateChatSendParams({sessionKey:'agent:synthetic-own:isolated-input',sessionId:id,agentId:'synthetic-own',message:'synthetic input',idempotencyKey:'personal-run-'+id,expectedSessionRoutingContract:'per-sender|main|synthetic-own',expectedLeafEntryId:null,attachments:[encoded]}),true);
 assert.equal(Object.hasOwn(encoded,'effectAuthorized'),false);
});
test('encoded PNG reaches the unchanged original SDK inline-image parser',async()=>{
 const {o:parse}=await import('/opt/crays/openclaw/dependency-artifacts/sdk4-complete/2badb63c9d2ed692a4d2d71c63e1d96ac7453a9c5519348a8dc5a001d611afbb/node_modules/openclaw/dist/chat-attachments-CGf2bW4A.mjs');
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jPioAAAAASUVORK5CYII=','base64');
 const s=source(png,'image/png'),attachment=encode(s.original,s.reference,caps);
 const parsed=await parse('synthetic image input',normalize([attachment]),{maxBytes:caps.maximumOriginalBytes,supportsImages:true,supportsInlineImages:true,acceptNonImage:false,imageStorage:'inline'});
 assert.equal(parsed.images.length,1);assert.equal(parsed.images[0].mimeType,'image/png');assert.equal(parsed.offloadedRefs.length,0);
 assert.equal(createHash('sha256').update(Buffer.from(parsed.images[0].data,'base64')).digest('hex'),s.reference.sha256);
});
for(const key of ['attachmentId','version','sha256','messageId','messageReceiptId','registrationReceiptId'])test('different canonical '+key+' is denied',()=>{
 const s=source();s.original.receipt[key]=key==='version'?2:'changed';assert.throws(()=>encode(s.original,s.reference,caps));
});
test('unavailable bytes, wrong source hash and quota are refused before SDK',()=>{
 let s=source();s.original.receipt.available=false;assert.throws(()=>encode(s.original,s.reference,caps));
 s=source();s.original.bytes[0]^=1;assert.throws(()=>encode(s.original,s.reference,caps));
 s=source();assert.throws(()=>encode(s.original,s.reference,{...caps,maximumEncodedBytes:4}));assert.throws(()=>encode(s.original,s.reference,{...caps,maximumOriginalBytes:1}));
});
test('a getter is never executed and receipt metadata never substitutes bytes',()=>{
 const s=source();let observed=false;Object.defineProperty(s.original,'bytes',{get(){observed=true;return Buffer.from('secret');}});
 assert.throws(()=>encode(s.original,s.reference,caps));assert.equal(observed,false);
 const second=source();second.original.bytes=second.reference.sha256;assert.throws(()=>encode(second.original,second.reference,caps));
});
