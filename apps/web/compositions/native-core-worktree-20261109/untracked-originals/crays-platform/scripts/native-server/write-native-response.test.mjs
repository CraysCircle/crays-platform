import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer,request} from 'node:http';
import {createHash} from 'node:crypto';
import {writeNativeResponse} from './write-native-response.mjs';
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function listener(makeResponse){
 let settled=false,error,aborted=false;
 const server=createServer(async(_req,res)=>{
  const stop=new AbortController();res.once('close',()=>{if(!res.writableEnded){aborted=true;stop.abort();}});
  try{await writeNativeResponse(makeResponse(),res,stop.signal);}catch(e){error=e;res.destroy();}finally{settled=true;}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 return{url:'http://127.0.0.1:'+server.address().port,state:()=>({settled,error,aborted}),async close(){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}};
}
test('completed private response preserves exact bytes and headers',async()=>{
 const bytes=Buffer.alloc(1024*1024,123),host=await listener(()=>new Response(bytes,{headers:{'x-test-original':'exact','cache-control':'no-store, private'}}));
 try{const r=await fetch(host.url);const b=Buffer.from(await r.arrayBuffer());assert.equal(createHash('sha256').update(b).digest('hex'),createHash('sha256').update(bytes).digest('hex'));assert.equal(r.headers.get('x-test-original'),'exact');await delay(20);assert.equal(host.state().settled,true);assert.equal(host.state().error,undefined);}finally{await host.close();}
});
test('disconnect during a pre-created JSON response settles the handler',async()=>{
 const host=await listener(()=>Response.json({data:'x'.repeat(8*1024*1024)}));
 try{
  await new Promise((resolve,reject)=>{const req=request(host.url,res=>{res.once('data',()=>{res.destroy();req.destroy();resolve();});});req.once('error',e=>{if(e.code!=='ECONNRESET')reject(e);});req.end();});
  for(let i=0;i<50&&!host.state().settled;i++)await delay(10);
  assert.equal(host.state().aborted,true);assert.equal(host.state().settled,true,'socket close must settle original handler even after Web body has closed');
 }finally{await host.close();}
});
test('disconnect cancels still open original byte producer once',async()=>{
 let cancelled=0;
 const host=await listener(()=>new Response(new ReadableStream({pull(c){c.enqueue(new Uint8Array(65536));},cancel(){cancelled++;}})));
 try{
  await new Promise((resolve,reject)=>{const req=request(host.url,res=>{res.once('data',()=>{res.destroy();req.destroy();resolve();});});req.once('error',e=>{if(e.code!=='ECONNRESET')reject(e);});req.end();});
  for(let i=0;i<50&&!host.state().settled;i++)await delay(10);
  assert.equal(host.state().settled,true);assert.equal(cancelled,1);
 }finally{await host.close();}
});
