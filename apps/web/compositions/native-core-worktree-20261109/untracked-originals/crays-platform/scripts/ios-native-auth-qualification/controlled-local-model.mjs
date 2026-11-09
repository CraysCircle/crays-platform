// Test-only deterministic OpenAI-compatible SSE peer. Never a real model,
// provider key, public endpoint or product response. Outer probe requires a
// private network namespace and synthetic state before importing this module.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
export async function controlledLocalModel(){
 let requests=0;
 const server=createServer(async(req,res)=>{
  try{
   assert.equal(req.method,'POST');assert.equal(req.url,'/v1/chat/completions');
   assert.equal(req.headers.authorization,'Bearer SYNTHETIC_LOCAL_ONLY_NOT_PROVIDER_KEY');
   let bytes=0;const chunks=[];
   for await(const chunk of req){bytes+=chunk.length;assert(bytes<=1048576);chunks.push(chunk);}
   const body=JSON.parse(Buffer.concat(chunks));assert.equal(body.model,'synthetic');assert.equal(body.stream,true);
   assert(JSON.stringify(body.messages).includes('CONTROLLED_NATIVE_INPUT'));
   requests++;
   res.writeHead(200,{'content-type':'text/event-stream','cache-control':'no-store'});
   const base={id:'controlled-completion',object:'chat.completion.chunk',created:1,model:'synthetic'};
   for(const entry of [{delta:{role:'assistant',content:'CONTROLLED_NATIVE_REPLY'},finish_reason:null},{delta:{},finish_reason:'stop'}]){
    res.write('data: '+JSON.stringify({...base,choices:[{index:0,...entry}]})+'\n\n');
   }
   res.end('data: [DONE]\n\n');
  }catch{res.writeHead(400,{'content-type':'application/json'});res.end(JSON.stringify({error:{message:'Controlled fixture rejected request'}}));}
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 return Object.freeze({baseUrl:`http://127.0.0.1:${server.address().port}/v1`,count:()=>requests,
  close:()=>new Promise((resolve,reject)=>{server.close(error=>error?reject(error):resolve());server.closeAllConnections();})});
}
