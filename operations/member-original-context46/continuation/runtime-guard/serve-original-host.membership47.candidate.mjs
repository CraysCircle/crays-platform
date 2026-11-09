import {nostrProviderInputs18} from '/srv/crays/releases/nostr-original-core-addon-20261108-18/runtime-core-adoption18-executable/load-runtime-inputs18.mjs';
import {attachNostrRelayUpgrade18} from '/srv/crays/releases/nostr-original-core-addon-20261108-18/runtime-core-adoption18-executable/nostr-relay-upgrade18.mjs';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {loadOriginalPersonalChuckRuntime} from './original-runtime.mjs';
import {createChuckCommonHandler} from './common-host.mjs';
import {composeOriginalHostHumanRoutes} from '../../messaging/server/originalHostHumanExtension.mjs';
const sourcePin=Object.freeze({path:fileURLToPath(new URL('../../../../common/common-host.cjs',import.meta.url)),sha256:'822fab2fc20aba7cd6cd45e50089efaf8756425a5695db215eca2311b4ddb1d4'});
/** Concrete common-host replacement, activated only in the coordinated release
 * slot. Keeps original registry, Member/Auth/Work handlers and static selection.
 * This entry does not stop processes, write the registry or approve a Core client. */
export async function createOriginalChuckHost({nostrProviderInputs=nostrProviderInputs18}={}){
 const selectedDirectory=fileURLToPath(new URL('../../../.qualification/chuck-selected-core-web-v1/',import.meta.url));
 const runtime=await loadOriginalPersonalChuckRuntime({nostrProviderInputs,selectedDirectory,fenceCoreExecution:false,webExecutionPolicy:'original-sdk-core-v1'});
 const originalHandle=createChuckCommonHandler({personalChuck:runtime.handler,personalOriginalRead:runtime.originalReadHandler,personalOriginalUpload:runtime.originalUploadHandler,sourcePin});
 const originalHumanHandle=composeOriginalHostHumanRoutes({originalHandle,extension:runtime.messagingSignerExtension,assertRuntimeCurrent:runtime.assertRuntimeCurrent});
 const handle=async(req,res)=>{if(runtime.nostrProviderExtension&&await runtime.nostrProviderExtension.handle(req,res)===true)return;return originalHumanHandle(req,res);};
 const server=createServer({maxHeaderSize:65536},(request,response)=>{
  Promise.resolve(handle(request,response)).catch(()=>{if(!response.headersSent){response.writeHead(503,{'Content-Type':'application/json','Cache-Control':'private, no-store'});response.end(JSON.stringify({status:'temporarily_unavailable'}));}else response.destroy();});
 });
 if(runtime.nostrProviderExtension)attachNostrRelayUpgrade18(server,{assertRuntimeCurrent:runtime.assertRuntimeCurrent});
 server.requestTimeout=45000;server.headersTimeout=10000;
 return Object.freeze({server,close:async()=>{await runtime.nostrProviderExtension?.close();await runtime.messagingSignerExtension.close();},assertRuntimeCurrent:runtime.assertRuntimeCurrent,qualification:runtime.qualification});
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.length!==3||process.argv[2]!=='--serve')throw Error('EXPLICIT_HOST_START_REQUIRED');
  const {server,close,assertRuntimeCurrent}=await createOriginalChuckHost({nostrProviderInputs:nostrProviderInputs18});assertRuntimeCurrent();
  server.listen(8990,'127.0.0.1');await once(server,'listening');process.stdout.write('CRAYS_COMMON8990_CHUCK_HOST_READY\n');
  for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{void close().then(()=>server.close(()=>process.exit(0))).catch(()=>process.exit(1));});
 }catch{process.stderr.write('CRAYS_COMMON8990_CHUCK_HOST_START_FAILED\n');process.exitCode=1;}
}
