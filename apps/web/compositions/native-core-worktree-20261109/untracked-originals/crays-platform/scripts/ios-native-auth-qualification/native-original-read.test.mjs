import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {readNativeOriginalReference,assertNativeOriginalReadTransport,acquireNativeOriginalReadCapacity,createNativeOriginalReadResponse} from '../../src/lib/native-auth/native-personal-original-read.mjs';
const url='https://core.example.invalid/api/native/personal-message-originals/read';
const reference={attachmentId:'personal-attachment-00000000-0000-4000-8000-000000000001',version:1,sha256:'a'.repeat(64)};
const request=(value=reference,headers={})=>new Request(url,{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(value)});
function result(bytes=Buffer.from([0,1,255,10,13,0]),release=()=>{}) {
 return {bytes,release,receipt:{...reference,sha256:createHash('sha256').update(bytes).digest('hex'),mimeType:'video/quicktime',byteLength:bytes.length,available:true,
  messageReceiptId:'personal-receipt-00000000-0000-4000-8000-000000000002',registrationReceiptId:'personal-attachment-registration-00000000-0000-4000-8000-000000000003'}};
}
test('fixed original read body captures only exact canonical reference',async()=>{
 const r=await readNativeOriginalReference(request(),()=>{});assert.deepEqual(r,reference);assert.ok(Object.isFrozen(r));
});
test('paths model fields version and inherited authority cannot become source reference',async()=>{
 for(const value of [{...reference,path:'/private/other'}, {...reference,accountId:'foreign'}, {...reference,url:'https://foreign.invalid'}, {...reference,version:2}, {...reference,sha256:'bad'}]){
  await assert.rejects(readNativeOriginalReference(request(value),()=>{}),/INVALID_INPUT/);
 }
});
test('cookie query encoding and non-fixed transport denied before data parsing',()=>{
 for(const req of [request(reference,{cookie:'x=y'}),request(reference,{'content-encoding':'gzip'}),new Request(url+'?account=other',{method:'POST',headers:{'content-type':'application/json'},body:'{}'}),new Request(url,{method:'POST',headers:{'content-type':'text/plain'},body:'{}'})])assert.throws(()=>assertNativeOriginalReadTransport(req),/REQUEST_NOT_ADMITTED/);
});
test('actual overflowing reference stream is cancelled at the byte boundary',async()=>{
 let cancelled=false,chunks=0;const body=new ReadableStream({pull(c){c.enqueue(new Uint8Array(1024));if(++chunks===20)c.close();},cancel(){cancelled=true;}});
 const req=new Request(url,{method:'POST',headers:{'content-type':'application/json'},body,duplex:'half'});
 await assert.rejects(readNativeOriginalReference(req,()=>{}),/TOO_LARGE/);assert.equal(cancelled,true);
 assert.throws(()=>assertNativeOriginalReadTransport(request(reference,{'content-length':'2049'})),/TOO_LARGE/);
});
test('currentness lost after await cancels incomplete reference input',async()=>{
 let checks=0,cancelled=false;const body=new ReadableStream({pull(c){c.enqueue(new TextEncoder().encode('{'));},cancel(){cancelled=true;}});
 const req=new Request(url,{method:'POST',headers:{'content-type':'application/json'},body,duplex:'half'});
 await assert.rejects(readNativeOriginalReference(req,()=>{if(++checks>=3)throw Error('NATIVE_PERSONAL_CONFIGURATION_CHANGED');}),/CONFIGURATION_CHANGED/);assert.equal(cancelled,true);
});
test('private response streams exact multi-chunk original and releases once',async()=>{
 const source=Buffer.alloc(131073,0xad);let released=0;const value=result(source,()=>released++),response=createNativeOriginalReadResponse(value,new AbortController().signal);
 assert.equal(response.status,200);assert.equal(response.headers.get('content-length'),String(source.length));assert.equal(response.headers.get('content-encoding'),'identity');
 assert.equal(response.headers.get('content-disposition'),'attachment; filename="original"');assert.equal(response.headers.get('x-crays-original-sha256'),value.receipt.sha256);assert.match(response.headers.get('cache-control'),/no-store/);
 assert.deepEqual(Buffer.from(await response.arrayBuffer()),source);assert.equal(released,1);
});
test('abort after a chunk suppresses remaining body and returns its exact slot',async()=>{
 const lease=acquireNativeOriginalReadCapacity('abort-owner'),ac=new AbortController(),response=createNativeOriginalReadResponse(result(Buffer.alloc(200000),lease.release),ac.signal),reader=response.body.getReader();
 assert.equal((await reader.read()).value.length,65536);ac.abort();await assert.rejects(reader.read(),/CANCELLED/);assert.throws(lease.assertCurrent,/UNAVAILABLE/);
 const again=acquireNativeOriginalReadCapacity('abort-owner');again.release();
});
test('response consumer cancellation releases own reservation exactly once',async()=>{
 let released=0;const response=createNativeOriginalReadResponse(result(Buffer.alloc(200000),()=>released++),new AbortController().signal);
 await response.body.cancel();assert.equal(released,1);
});
test('one own account and two total buffered transfers with no waiting queue',()=>{
 const a=acquireNativeOriginalReadCapacity('capacity-a'),b=acquireNativeOriginalReadCapacity('capacity-b');
 try{assert.throws(()=>acquireNativeOriginalReadCapacity('capacity-a'),/BUSY/);assert.throws(()=>acquireNativeOriginalReadCapacity('capacity-c'),/BUSY/);}finally{a.release();b.release();}
 const c=acquireNativeOriginalReadCapacity('capacity-c');c.release();c.release();assert.throws(c.assertCurrent,/UNAVAILABLE/);
});
test('response construction rejection returns its buffer admission',()=>{
 let released=0;const value=result(Buffer.from('bad'),()=>released++);value.receipt.available=false;
 assert.throws(()=>createNativeOriginalReadResponse(value,new AbortController().signal),/UNAVAILABLE/);assert.equal(released,1);
});
test('real ten-second input deadline cancels a hanging original reference read',async()=>{
 let cancelled=false;const req=new Request(url,{method:'POST',headers:{'content-type':'application/json'},body:new ReadableStream({cancel(){cancelled=true;}}),duplex:'half'});
 const keepAlive=delay(10500);await assert.rejects(readNativeOriginalReference(req,()=>{}),/READ_TIMEOUT/);assert.equal(cancelled,true);await keepAlive;
});
test('real thirty-second response deadline releases a non-consuming caller',async()=>{
 const lease=acquireNativeOriginalReadCapacity('deadline-owner'),response=createNativeOriginalReadResponse(result(Buffer.alloc(200000),lease.release),new AbortController().signal);
 await delay(30500);await assert.rejects(response.arrayBuffer(),/READ_TIMEOUT/);assert.throws(lease.assertCurrent,/UNAVAILABLE/);
 const again=acquireNativeOriginalReadCapacity('deadline-owner');again.release();
});
