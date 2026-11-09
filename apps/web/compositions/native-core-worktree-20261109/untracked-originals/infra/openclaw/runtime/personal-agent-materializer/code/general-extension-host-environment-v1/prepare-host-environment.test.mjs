import test from 'node:test';
import assert from 'node:assert/strict';
import {composeSdkHostEnvironment} from './prepare-host-environment.mjs';
const bin='/opt/crays/openclaw/tool-artifacts/tesseract-ocr/'+'a'.repeat(64)+'/usr/bin';
test('SDK child PATH receives OCR directory while original environment stays unchanged',()=>{
 const original={PATH:'/usr/local/bin:/usr/bin:/bin',PRIVATE_TEST_VALUE:'synthetic'};
 const before=process.env.PATH,result=composeSdkHostEnvironment(original,bin);
 assert.equal(result.PATH,bin+':'+original.PATH);assert.equal(result.PRIVATE_TEST_VALUE,'synthetic');
 assert.equal(original.PATH,'/usr/local/bin:/usr/bin:/bin');assert.equal(process.env.PATH,before);assert(Object.isFrozen(result));
 original.PRIVATE_TEST_VALUE='changed';assert.equal(result.PRIVATE_TEST_VALUE,'synthetic');
});
test('repeated preparation retains directory ordering without duplicate OCR entries',()=>{
 const result=composeSdkHostEnvironment({PATH:'/bin:'+bin+':/usr/bin:'+bin},bin);
 assert.equal(result.PATH,bin+':/bin:/usr/bin');
});
test('rejects unpinned OCR paths',()=>{
 for(const path of ['/tmp/ocr','/opt/crays/openclaw/tool-artifacts/tesseract-ocr/latest/usr/bin',bin+':/tmp'])assert.throws(()=>composeSdkHostEnvironment({PATH:'/bin'},path),/FIXED_OCR_BIN/);
});
test('never evaluates caller environment accessors',()=>{
 let touched=false;const input={PATH:'/bin'};Object.defineProperty(input,'SECRET',{get(){touched=true;throw Error('getter');}});
 assert.throws(()=>composeSdkHostEnvironment(input,bin),/DATA_ONLY/);assert.equal(touched,false);
});
test('rejects cwd empty relative and linebreak executable path entries',()=>{
 for(const PATH of ['',':/bin','/bin:','.','bin','/bin\n/tmp'])assert.throws(()=>composeSdkHostEnvironment({PATH},bin));
});
test('rejects invalid environment key value and symbol without coercion',()=>{
 for(const input of [{PATH:'/bin','BAD=KEY':'x'},{PATH:'/bin',X:'a\0b'},{PATH:'/bin',X:5},{PATH:'/bin',[Symbol('x')]:'v'}])assert.throws(()=>composeSdkHostEnvironment(input,bin));
});
test('inherited variables are not included in child environment',()=>{
 const input=Object.assign(Object.create({UNTRUSTED_INHERITED:'x'}),{PATH:'/bin'});
 const result=composeSdkHostEnvironment(input,bin);assert.equal(result.UNTRUSTED_INHERITED,undefined);assert.equal(Object.getPrototypeOf(result),null);
});
