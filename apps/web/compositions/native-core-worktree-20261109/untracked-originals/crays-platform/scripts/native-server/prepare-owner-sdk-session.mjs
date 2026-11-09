// Real existing owner SDK connection, current Core rights and a dedicated SDK
// session for the original Core conversation. No model request is made here.
import './source-loader.mjs';
import {readFile,lstat,writeFile} from 'node:fs/promises';
import {promisify} from 'node:util';
import {execFile} from 'node:child_process';
const command=promisify(execFile),dir='/home/craysdev/.config/crays/native-core/owner-v1';
const sdk='/opt/crays/openclaw/dependency-artifacts/sdk4-complete/2badb63c9d2ed692a4d2d71c63e1d96ac7453a9c5519348a8dc5a001d611afbb/node_modules/openclaw/dist/';
const actionPath=new URL('../../../.task-work/native-owner-consumer-20261025/ACTION_BIND_EXISTING_OWNER_SERVICE.json',import.meta.url);
const readCurrent=process.argv.slice(2).join(' ')==='--read-current';
let client,identityPool,personalPool,phase='private-configuration',exit=1;
try{
 const privateJson=async name=>{const p=dir+'/'+name,s=await lstat(p);if(!s.isFile()||s.isSymbolicLink()||s.uid!==process.getuid()||(s.mode&0o077))throw Error('PRIVATE_HOST_INPUT_REQUIRED');return JSON.parse(await readFile(p,'utf8'));};
 const env=await privateJson('server-environment.json');for(const[k,v]of Object.entries(env))process.env[k]=v;
 const device=await privateJson('gateway-service-identity.json'),credential=await privateJson('gateway-service-credential.json');
 const action=JSON.parse(await readFile(actionPath,'utf8')),route=action.currentCoreRoute;
 const intake=JSON.parse(await readFile('/home/craysdev/codex-chat-projects/openclaw/apps/ios/.secrets/owner-first-account-intake.json','utf8'));
 const provider=Object.freeze({providerKey:'auth0',providerSubject:intake.existingAuth0ProviderObservation.subject,issuer:'https://login.crays.pro/',clientId:env.CRAYS_NATIVE_AUTH_CLIENT_IDS});
 identityPool=await import('../../src/db/core-identity-runtime-pool.ts');personalPool=await import('../../src/db/native-personal-runtime-pool.ts');
 const {lookupNativeIdentityThroughOriginalCore}=await import('../../src/lib/native-core-identity-lookup.ts');
 const {assertNativePersonalServiceScope}=await import('../../src/db/native-personal-service-admission.ts');
 const scope=Object.freeze({accountId:route.account_id,canonicalPersonId:route.canonical_person_id,agentId:route.agent_id,bindingId:route.binding_id,bindingRevision:route.binding_revision,contactRevision:route.contact_revision,expectedIssuer:provider.issuer});
 async function current(){
  const m=(await command('/usr/bin/systemctl',['show',action.existingService,'-p','ActiveState','-p','InvocationID'],{timeout:3000,maxBuffer:16384})).stdout;
  if(!m.includes('ActiveState=active\n')||!m.includes('InvocationID='+action.expectedServiceInvocation+'\n'))throw Error('EXISTING_OWNER_HOST_CHANGED');
  const mapped=await lookupNativeIdentityThroughOriginalCore('auth0',provider.providerSubject,provider);
  if(mapped?.account?.account_id!==route.account_id)throw Error('CURRENT_ORIGINAL_OWNER_REQUIRED');
  if(await assertNativePersonalServiceScope(scope)!==route.conversation_id)throw Error('ORIGINAL_CORE_CONVERSATION_REQUIRED');
 }
 phase='current-core-and-host';await current();
 const scopes=['operator.write'];
 if(device.deviceId!==credential.deviceId||credential.requestedScopes?.join(',')!==scopes.join(',')||credential.scopes.some(s=>!['operator.write','operator.read','operator.sessions.read','operator.sessions.write'].includes(s)))throw Error('MINIMAL_OWN_SERVICE_DEVICE_REQUIRED');
 const {t:GatewayClient}=await import(sdk+'client-Bd9s4LXT.mjs');
 phase='actual-original-gateway-connect';
 const hello=await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Error('OWNER_GATEWAY_CONNECT_TIMEOUT')),10000);
  client=new GatewayClient({url:'ws://127.0.0.1:18789',deviceIdentity:device,deviceToken:credential.token,deviceAuthScope:'crays-native-core-owner-v1',sharedStateMode:'read-only',preparedDeviceAuth:{token:credential.token,scopes},role:'operator',scopes,mode:'backend',minProtocol:4,maxProtocol:4,requestTimeoutMs:10000,preauthHandshakeTimeoutMs:10000,
   onHelloOk:h=>{clearTimeout(timer);resolve(h);},onConnectError:()=>{clearTimeout(timer);reject(Error('ORIGINAL_SERVICE_DEVICE_CONNECT_REJECTED'));},onClose:()=>{clearTimeout(timer);reject(Error('ORIGINAL_SERVICE_DEVICE_CLOSED'));}});client.start();
 });
 if(hello.protocol!==4||hello.auth?.method!=='device-token'||hello.auth.role!=='operator'||hello.auth.scopes?.join(',')!==scopes.join(',')||typeof hello.server?.bootId!=='string')throw Error('EXACT_ORIGINAL_DEVICE_AUTH_REQUIRED');
 await current();
 const key='agent:'+action.sdkAgentId+':crays-native:'+route.conversation_id;
 phase='prepare-own-original-sdk-session';
 const existing=readCurrent?JSON.parse(await readFile(new URL('../../../.task-work/native-owner-consumer-20261025/ACTUAL_GATEWAY_SESSION_RESULT.json',import.meta.url),'utf8')):undefined;
 const prepared=readCurrent?undefined:await client.request('sessions.patch',{key},{timeoutMs:10000});
 const id=readCurrent?existing.sdkSessionId:prepared.entry?.sessionId;if(typeof id!=='string'||!id)throw Error('ORIGINAL_SESSION_ID_REQUIRED');
 phase='verify-same-own-sdk-session';const history=await client.request('chat.history',{sessionKey:key,agentId:action.sdkAgentId,limit:1,maxBytes:16384},{timeoutMs:10000});
 if(history.sessionId!==id||history.sessionKey!==key||history.sessionInfo?.agentId!==action.sdkAgentId)throw Error('ORIGINAL_SESSION_ROUTE_MISMATCH');
 await current();
 if(!Object.hasOwn(history.sessionInfo,'activeLeafEntryId'))throw Error('ORIGINAL_SESSION_LEAF_REQUIRED');
 const result={status:'ACTUAL_CURRENT_OWNER_CORE_AND_ORIGINAL_SDK_SESSION_PREPARED_NOT_MODEL',at:new Date().toISOString(),scope,conversationId:route.conversation_id,sdkAgentId:action.sdkAgentId,sdkSessionId:id,sdkSessionKey:key,serverBootId:hello.server.bootId,deviceId:device.deviceId,hostInvocationId:action.expectedServiceInvocation,initialLeafEntryId:history.sessionInfo.activeLeafEntryId,authMethod:hello.auth.method,scopes:hello.auth.scopes,modelCalled:false,whatsappChanged:false,customerProfileFallback:false};
 await writeFile(new URL('../../../.task-work/native-owner-consumer-20261025/'+(readCurrent?'ACTUAL_GATEWAY_SESSION_ADMISSION_METADATA.json':'ACTUAL_GATEWAY_SESSION_RESULT.json'),import.meta.url),JSON.stringify(result,null,2)+'\n',{mode:0o600,flag:'wx'});
 console.log(JSON.stringify({...result,sdkSessionKey:'[own Core conversation session]',sdkSessionId:'[original SDK session]'}));exit=0;
}catch(error){console.log(JSON.stringify({status:'ACTUAL_OWNER_SDK_SESSION_NOT_READY',phase,code:/^[A-Z0-9_]+$/.test(error?.message??'')?error.message:'ORIGINAL_SDK_REQUEST_FAILED',originalErrorCode:typeof error?.code==='string'?error.code:null,reasonCategory:/profile/i.test(error?.message??'')?'SDK_PROFILE_REQUIRED':/scope/i.test(error?.message??'')?'SDK_SCOPE_REQUIRED':/visible|access/i.test(error?.message??'')?'SDK_SESSION_ACCESS_REQUIRED':'UNCLASSIFIED',modelCalled:false}));}
finally{await client?.stopAndWait();await identityPool?.closeCoreNativeIdentityRpcPool();await personalPool?.closeNativePersonalRuntimePool();process.exit(exit);}
