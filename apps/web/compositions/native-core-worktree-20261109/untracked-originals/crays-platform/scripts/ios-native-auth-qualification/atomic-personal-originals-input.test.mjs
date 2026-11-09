import test from 'node:test';
import assert from 'node:assert/strict';
import {captureOwnMessageWithOriginals as capture} from '../../src/db/personal-message-attachment-input.mjs';
const input=()=>({bindingId:'binding-1',expectedBindingRevision:'1',expectedContactRevision:'2',idempotencyKey:'message-1',body:'Original 🌊',originals:[{mimeType:'video/quicktime',bytes:Buffer.from('original'),retainSeconds:300}]});
const identity=v=>JSON.stringify(capture(v).originalIdentity);
test('complete message and original detach before SQL await',()=>{
 const v=input(),c=capture(v);v.body='other';v.originals[0].bytes.fill(0);v.originals[0].mimeType='text/plain';
 assert.equal(c.message.body,'Original 🌊');assert.deepEqual(c.materialize('m','r')[0].copyBytes(),Buffer.from('original'));assert.equal(c.originalIdentity[0][0],'video/quicktime');
});
test('file-only retains empty body without fabricated filler',()=>assert.equal(capture({...input(),body:''}).message.body,''));
test('ordered source metadata and immutable bytes determine command identity',()=>{
 const a=input();a.originals.push({mimeType:'text/plain',bytes:Buffer.from('second'),retainSeconds:400});
 const first=identity(a);assert.notEqual(identity({...a,originals:[...a.originals].reverse()}),first);
 for(const delta of [{mimeType:'image/png'},{bytes:Buffer.from('changed')},{retainSeconds:301}])assert.notEqual(identity({...input(),originals:[{...input().originals[0],...delta}]}),identity(input()));
});
test('new database IDs do not alter stable replay identity or ordinal upload keys',()=>{
 const c=capture(input()),a=c.materialize('m','r')[0],b=c.materialize('m2','r2')[0];assert.equal(a.idempotencyKey,b.idempotencyKey);assert.notEqual(a.fingerprint,b.fingerprint);assert.deepEqual(a.copyBytes(),b.copyBytes());
});
test('materialized buffers cannot mutate captured originals',()=>{const c=capture(input());c.materialize('m','r')[0].copyBytes().fill(0);assert.deepEqual(c.materialize('m','r')[0].copyBytes(),Buffer.from('original'));});
test('identity, file paths, model approvals and extra fields denied',()=>{
 for(const extra of [{accountId:'x'},{path:'/tmp/x'},{effectAuthorized:true},{url:'https://example.invalid'}])assert.throws(()=>capture({...input(),...extra}),/INVALID_INPUT/);
 assert.throws(()=>capture({...input(),originals:[{...input().originals[0],path:'/tmp/x'}]}),/INVALID_INPUT/);
});
test('message and original getters denied without evaluation',()=>{
 let calls=0;const a=input();Object.defineProperty(a,'body',{get(){calls++;return 'no';}});assert.throws(()=>capture(a),/INVALID_INPUT/);
 const b=input();Object.defineProperty(b.originals[0],'bytes',{get(){calls++;return Buffer.from('no');}});assert.throws(()=>capture(b),/INVALID_INPUT/);assert.equal(calls,0);
});
test('array accessors, sparse slots and symbols denied without evaluation',()=>{
 let calls=0;const a=input();Object.defineProperty(a.originals,'0',{get(){calls++;return {};}});assert.throws(()=>capture(a),/INVALID_INPUT/);assert.equal(calls,0);
 const b=input();b.originals[Symbol('hidden')]=true;assert.throws(()=>capture(b),/INVALID_INPUT/);assert.throws(()=>capture({...input(),originals:new Array(1)}),/INVALID_INPUT/);
});
test('bounded message and count reject malformed text and empty/oversized original list',()=>{
 for(const body of ['x'.repeat(16385),'x\u0000','x\ud800'])assert.throws(()=>capture({...input(),body}),/INVALID_INPUT/);
 for(const originals of [[],new Array(9).fill(input().originals[0])])assert.throws(()=>capture({...input(),originals}),/INVALID_INPUT/);
});
test('capture results and source-order identity are frozen',()=>{
 const c=capture(input());for(const v of [c,c.message,c.originalIdentity,c.originalIdentity[0],c.materialize('m','r')])assert.ok(Object.isFrozen(v));
});
