import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {captureOwnAttachmentUpload as capture,captureOwnAttachmentReference as reference} from '../../src/db/personal-message-attachment-input.mjs';

const upload = () => ({messageId:'personal-message-original',receiptId:'original-ingress',idempotencyKey:'upload-1',
 expectedContactRevision:'1',mimeType:'video/mp4',bytes:Buffer.from('synthetic private original'),retainSeconds:300});
const ref = () => ({attachmentId:'personal-attachment-12345678-1234-1234-1234-123456789abc',version:1,sha256:'a'.repeat(64)});
const denied = value => assert.throws(()=>capture(value),/PERSONAL_ATTACHMENT_INVALID_INPUT/);
test('original bytes hash is computed by actual server source',()=>{
 const u=upload(),v=capture(u);assert.equal(v.sha256,createHash('sha256').update(u.bytes).digest('hex'));
 assert.equal(v.byteLength,u.bytes.length);assert.ok(Object.isFrozen(v));
});
test('later source byte mutation cannot change captured original',()=>{
 const u=upload(),v=capture(u),original=Buffer.from(u.bytes);u.bytes.fill(0);assert.deepEqual(v.copyBytes(),original);
});
test('returned SQL buffer mutation cannot change later copy or receipt hash',()=>{
 const v=capture(upload()),first=v.copyBytes();first.fill(0);assert.notDeepEqual(first,v.copyBytes());
 assert.equal(createHash('sha256').update(v.copyBytes()).digest('hex'),v.sha256);
});
test('later descriptor and retention mutation cannot retarget captured command',()=>{
 const u=upload(),v=capture(u);u.messageId='other';u.retainSeconds=999;assert.equal(v.messageId,'personal-message-original');assert.equal(v.retainSeconds,300);
});
test('equal immutable command retains fingerprint across retry',()=>assert.equal(capture(upload()).fingerprint,capture(upload()).fingerprint));
test('changed message, receipt, revision, retention, MIME or bytes changes command identity',()=>{
 const base=capture(upload()).fingerprint;
 for(const delta of [{messageId:'different'},{receiptId:'different'},{expectedContactRevision:'2'},{retainSeconds:301},{mimeType:'image/png'},{bytes:Buffer.from('different')}])assert.notEqual(capture({...upload(),...delta}).fingerprint,base);
});
test('arbitrary paths, URLs and model identity fields are denied',()=>{
 for(const extra of [{path:'/tmp/x'},{url:'https://example.invalid/x'},{accountId:'other'},{agentId:'other'},{attachmentId:'guessed'}])denied({...upload(),...extra});
});
test('accessor descriptors are rejected without executing getter',()=>{
 let called=false;const u=upload();Object.defineProperty(u,'bytes',{get(){called=true;throw Error('getter');},enumerable:true});denied(u);assert.equal(called,false);
});
test('symbol extra fields are not silently discarded',()=>{const u=upload();u[Symbol('authority')]=true;denied(u);});
test('missing fields and arrays are denied',()=>{const u=upload();delete u.receiptId;denied(u);denied([]);denied(null);});
test('empty or non-Buffer bytes are denied',()=>{denied({...upload(),bytes:Buffer.alloc(0)});denied({...upload(),bytes:new Uint8Array([1])});});
test('remote MIME declarations and uncontrolled generic file types denied',()=>{
 for(const mimeType of ['text/html','application/octet-stream','VIDEO/MP4','video/mp4;codecs=x'])denied({...upload(),mimeType});
});
test('retention uses explicit bounded integral seconds',()=>{
 for(const retainSeconds of [0,299,2592001,300.1,Infinity,'300'])denied({...upload(),retainSeconds});
 assert.equal(capture({...upload(),retainSeconds:2592000}).retainSeconds,2592000);
});
test('all four original tool document/video families are retained as declared formats',()=>{
 for(const mimeType of ['video/mp4','video/webm',
 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
 'application/vnd.openxmlformats-officedocument.presentationml.presentation'])assert.equal(capture({...upload(),mimeType}).mimeType,mimeType);
});
test('invalid IDs, revisions and contact aliases are not original identity',()=>{
 for(const delta of [{messageId:'../secret'},{receiptId:' '},{idempotencyKey:''},{expectedContactRevision:'0'},{expectedContactRevision:1}])denied({...upload(),...delta});
});
test('reference is exact immutable version and hash, with no arbitrary path/authority',()=>{
 assert.deepEqual(reference(ref()),ref());assert.ok(Object.isFrozen(reference(ref())));
 for(const delta of [{version:2},{version:'1'},{sha256:'A'.repeat(64)},{attachmentId:'legacy-path'},{path:'/tmp/x'}])assert.throws(()=>reference({...ref(),...delta}),/INVALID_INPUT/);
});
test('reference accessors are rejected without evaluating them',()=>{
 let called=false;const r=ref();Object.defineProperty(r,'sha256',{get(){called=true;return 'a'.repeat(64);}});assert.throws(()=>reference(r),/INVALID_INPUT/);assert.equal(called,false);
});

test('native original declarations preserve bytes without implicit conversion or effect grants',()=>{
 const bytes=Buffer.from('Synthetic declared native bytes; no image/audio/video decoder invoked');
 const expectedHash=createHash('sha256').update(bytes).digest('hex'),fingerprints=new Set();
 for(const mimeType of ['image/heic','image/heif','video/quicktime','text/plain',
  'audio/mp4','audio/aac','audio/mpeg','audio/wav','audio/x-wav','audio/vnd.wave']){
  const v=capture({...upload(),bytes,mimeType});
  assert.deepEqual(v.copyBytes(),bytes);assert.equal(v.sha256,expectedHash);
  assert.equal(v.byteLength,bytes.length);fingerprints.add(v.fingerprint);
  assert.equal(Object.hasOwn(v,'effectAuthorized'),false);assert.equal(Object.hasOwn(v,'attachmentDelivered'),false);
 }
 assert.equal(fingerprints.size,10,'MIME is part of each immutable upload command, not guessed from bytes');
});
