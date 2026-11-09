import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {captureOwnOriginalDisplayName as name,captureOwnAttachmentUpload as upload,captureOwnMessageWithOriginals as capture} from '../../src/db/personal-message-attachment-input.mjs';
const original=()=>({mimeType:'application/pdf',retainSeconds:300,bytes:Buffer.from('Synthetic original, not decoded PDF')});
const command=()=>({bindingId:'binding-1',expectedBindingRevision:'1',expectedContactRevision:'2',idempotencyKey:'message-1',body:'',originals:[original()]});
const input=()=>({...original(),messageId:'message-1',receiptId:'receipt-1',idempotencyKey:'upload-1',expectedContactRevision:'2'});
test('display name retains exact safe Unicode and spaces without becoming a file path',()=>{for(const s of ['Travel notes.pdf','Café – Reise.pdf','東京.pdf','emoji 🌊.pdf','a..b.pdf','a'.repeat(251)+'.pdf'])assert.equal(name(s),s);});
test('paths, control characters, bidi spoofing, invalid Unicode and overlong bytes are denied',()=>{for(const s of ['',null,3,'.','..',' notes.pdf','notes.pdf ','../note.pdf','dir/note.pdf','C:\\note.pdf','a\n.pdf','a\u0000.pdf','a\u202e.pdf','a\u2066.pdf','a\u200e.pdf','a\ufeff.pdf','a\ud800.pdf','🌊'.repeat(64),'a'.repeat(256)])assert.throws(()=>name(s),/INVALID_INPUT/);});
test('absence preserves the exact original upload fingerprint and four-field message identity',()=>{
 const i=input(),v=upload(i),hash=createHash('sha256').update(i.bytes).digest('hex');
 assert.equal(v.fingerprint,createHash('sha256').update(JSON.stringify(['crays.personal-message-attachment.upload.v1',i.messageId,i.receiptId,i.expectedContactRevision,i.mimeType,i.bytes.length,hash,i.retainSeconds])).digest('hex'));
 assert.deepEqual(capture(command()).originalIdentity,[[i.mimeType,i.bytes.length,hash,i.retainSeconds]]);assert.ok(!Object.hasOwn(v,'displayName'));
});
test('name changes immutable command identity but not original bytes/hash',()=>{
 const a=upload({...input(),displayName:'One.pdf'}),b=upload({...input(),displayName:'Two.pdf'});assert.notEqual(a.fingerprint,b.fingerprint);assert.equal(a.sha256,b.sha256);assert.deepEqual(a.copyBytes(),b.copyBytes());
 assert.notDeepEqual(capture({...command(),originals:[{...original(),displayName:'One.pdf'}]}).originalIdentity,capture({...command(),originals:[{...original(),displayName:'Two.pdf'}]}).originalIdentity);
});
test('name and bytes detach before SQL and survive materialization without losing metadata',()=>{
 const i=command();i.originals[0].displayName='Travel notes.pdf';const v=capture(i);i.originals[0].displayName='Changed.pdf';i.originals[0].bytes.fill(0);
 const m=v.materialize('stored-message','stored-receipt')[0];assert.equal(m.displayName,'Travel notes.pdf');assert.equal(v.originalIdentity[0][4],'Travel notes.pdf');assert.deepEqual(m.copyBytes(),original().bytes);assert.ok(Object.isFrozen(m));
});
test('optional name accessor is rejected without evaluating an untrusted getter',()=>{
 let calls=0;const i=input();Object.defineProperty(i,'displayName',{get(){calls++;return 'Injected.pdf';}});assert.throws(()=>upload(i),/INVALID_INPUT/);
 const c=command();Object.defineProperty(c.originals[0],'displayName',{get(){calls++;return 'Injected.pdf';}});assert.throws(()=>capture(c),/INVALID_INPUT/);assert.equal(calls,0);
});
test('explicit null and undefined names are invalid rather than ambiguous legacy names',()=>{for(const displayName of [null,undefined]){assert.throws(()=>upload({...input(),displayName}),/INVALID_INPUT/);assert.throws(()=>capture({...command(),originals:[{...original(),displayName}]}),/INVALID_INPUT/);}});
