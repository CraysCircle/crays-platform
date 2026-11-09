// Actual owning compiled HTTP routes with current hosted owner JWT/Core data.
// Read-only: no receive/bind/contact/model request is submitted.
import './source-loader.mjs';
import {configureExistingOwnerCoreEnvironment,readPrivateOwnerRuntimeFile} from './owner-consumer.mjs';
import {createServer} from 'node:http';
import {writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
await configureExistingOwnerCoreEnvironment();
process.env.CRAYS_GRAPHQL_ENABLED='true';
const directory=new URL('../../.qualification/native-core-http-release-v1/',import.meta.url);
process.chdir(directory.pathname);
const stop=new AbortController();let server;
const timer=setTimeout(()=>stop.abort(),60000);timer.unref();
const result={schema:'crays.native.actual-local-http.v1',at:new Date().toISOString(),actualHostedOwnerAuth0:true,actualHostedCore:true,actualHttps:false,actualIos:false,cases:[]};
let exit=1;
try{
 const {default:handler}=await import(new URL('index.mjs',directory));
 const {nativePersonalDocuments}=await import('../../src/graphql/native-personal-messenger-documents.ts');
 server=createServer(handler);
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 const origin='http://127.0.0.1:'+server.address().port;
 const tokens=await readPrivateOwnerRuntimeFile('native-client-tokens.json');
 const document=nativePersonalDocuments.NativePersonalTranscript;
 const body={operationName:'NativePersonalTranscript',extensions:{persistedQuery:{version:1,sha256Hash:createHash('sha256').update(document.document).digest('hex')}},variables:{}};
 async function call(name,{headers={},payload=body,path='/api/graphql',method='POST'}={}){
  const response=await fetch(origin+path,{method,headers:{'content-type':'application/json',...headers},body:method==='POST'?JSON.stringify(payload):undefined,signal:stop.signal});
  const value=await response.json().catch(()=>null);result.cases.push({name,status:response.status});return {response,value};
 }
 let r=await call('no token denied');if(r.response.status<400)throw Error('UNAUTHENTICATED_HTTP_ACCEPTED');
 r=await call('arbitrary query denied',{headers:{authorization:'Bearer '+tokens.access_token},payload:{query:'{__typename}'}});if(r.response.status<400&&!r.value?.errors)throw Error('ARBITRARY_QUERY_ACCEPTED');
 r=await call('actual owner canonical transcript',{headers:{authorization:'Bearer '+tokens.access_token}});
 const transcript=r.value?.data?.nativePersonalTranscript;
 if(r.response.status!==200||!transcript||!Array.isArray(transcript.messages)||!transcript.messages.some(x=>x.authorKind==='CHUCK'&&x.body))throw Error('ACTUAL_CANONICAL_HTTP_TRANSCRIPT_REQUIRED');
 result.canonicalMessagesReturned=transcript.messages.length;
 result.status='ACTUAL_ORIGINAL_COMPILED_CORE_HTTP_OWNER_READ_PASS_NOT_HTTPS_OR_DEVICE';exit=0;
}catch(error){result.status='ACTUAL_LOCAL_CORE_HTTP_NOT_ACCEPTED';result.code=/^[A-Z0-9_]+$/.test(error?.message??'')?error.message:'ORIGINAL_HTTP_COMPOSITION_FAILED';}
finally{
 clearTimeout(timer);stop.abort();if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
 // The bundled pool belongs to that exact process and exits here; no model
 // work, external server state, general pool or private data is exported.
 const output=new URL('../../../.task-work/native-owner-consumer-20261025/ACTUAL_LOCAL_HTTP_RESULT_V2.json',import.meta.url);
 await writeFile(output,JSON.stringify(result,null,2)+'\n',{mode:0o600,flag:'wx'});
 console.log(JSON.stringify(result));process.exit(exit);
}
