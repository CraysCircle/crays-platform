// Finite original SDK4 gateway qualification in a private network/mount namespace.
// No owner profile, real provider, model call, Core grant or product acceptance.
import assert from 'node:assert/strict';
import {mkdir,writeFile,readlink,realpath,stat,readFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import {generateKeyPairSync,createHash} from 'node:crypto';
import {createServer} from 'node:net';
import {qualifiedSdkURL,sdkSchemaSourcePins} from './sdk-source-bindings.mjs';

const root=process.env.CRAYS_NATIVE_GATEWAY_PROBE_ROOT;
assert(root && /^\/srv\/crays\/worktrees\/ios-core-native-01a14a1b\/crays-platform\/\.qualification\/native-sdk4-real-gateway-v[0-9]+$/.test(root));
assert.equal(await realpath(root),root);
assert.equal((await stat(root)).uid,process.getuid());
assert.equal(await realpath(process.env.OPENCLAW_STATE_DIR),root+'/private/state');
assert.equal(process.env.OPENCLAW_CONFIG_PATH,root+'/private/config.json');
assert.equal(process.env.OPENCLAW_AGENT_DIR,root+'/private/agent');
assert.equal(process.env.OPENCLAW_TEST_MINIMAL_GATEWAY,undefined);
assert.equal(process.env.OPENCLAW_SKIP_CHANNELS,undefined);
assert.equal(process.env.OPENCLAW_SKIP_PROVIDERS,undefined);
// The system unit must isolate networking and hide user/actual owner state.
const hostNet=process.env.CRAYS_NATIVE_EXPECTED_HOST_NETNS;
assert(/^net:\[[0-9]+\]$/.test(hostNet));
const ownNet=await readlink('/proc/self/ns/net');assert.notEqual(ownNet,hostNet,'Private network namespace required');
const pins=sdkSchemaSourcePins();
const scopes=['operator.sessions.read','operator.sessions.write'];
const agent='synthetic-existing-owner';
const key=`agent:${agent}:ios:controlled-native-conversation`;
const token='SYNTHETIC_GATEWAY_SHARED_TOKEN_NOT_OWNER_AUTH_00000001';
const proxyVariant=process.env.CRAYS_NATIVE_GATEWAY_PROBE_VARIANT==='controlled-core-proxy';
const modelVariant=process.env.CRAYS_NATIVE_GATEWAY_LOCAL_MODEL==='1';
const authTransition=process.env.CRAYS_NATIVE_GATEWAY_AUTH_TRANSITION==='1';
const localPassword='SYNTHETIC_ONLY_CURRENT_GATEWAY_PASSWORD_TRANSITION_20261024';
assert(!authTransition || proxyVariant,'Auth transition requires controlled distinct proxy identity');
let server,client,host,proxy,model,phase='prepare',primary;
const proof={schema:'crays.native.actual-sdk4-gateway-probe.v1',sdkVersion:'2026.10.4',nodeVersion:process.version,sqliteVersion:process.versions.sqlite,
 originalGatewayServer:false,originalGatewayClient:false,privateNetworkNamespace:true,networkNamespace:ownNet,modelCalled:false,ownerStateRead:false,
 actualCorePersonGrant:false,physicalDevice:false,productAccepted:false,sourcePins:pins};
const deadline=setTimeout(()=>{console.error('FINITE_GATEWAY_PROBE_DEADLINE');process.exit(124);},150000);deadline.unref();
const safeError=(error,depth=0)=>({name:error?.name??'Error',code:error?.code??null,message:String(error?.message??error).slice(0,1500),
 ...(error?.cause&&depth<3?{cause:safeError(error.cause,depth+1)}:{})});
try{
 await mkdir(root+'/private/workspace',{recursive:true,mode:0o700});
 const port=await new Promise((resolve,reject)=>{const reserve=createServer();reserve.once('error',reject);reserve.listen(0,'127.0.0.1',()=>{const p=reserve.address().port;reserve.close(error=>error?reject(error):resolve(p));});});
 const corePerson='synthetic-existing-canonical-core-person';
 const {coreSubjectForCanonicalPerson,controlledCoreIdentityProxy}=await import('./controlled-core-identity-proxy.mjs');
 const coreSubject=coreSubjectForCanonicalPerson(corePerson);
 const auth=proxyVariant?{mode:'trusted-proxy',identityScopes:{[coreSubject]:scopes},trustedProxy:{userHeader:'x-crays-core-person',requiredHeaders:['x-crays-core-assertion'],allowUsers:[coreSubject],allowLoopback:true}}:{mode:'token',token};
 if(authTransition)auth.password=localPassword;
 if(modelVariant){const {controlledLocalModel}=await import('./controlled-local-model.mjs');model=await controlledLocalModel();}
 const config={gateway:{mode:'local',bind:'loopback',auth,...(authTransition?{port}:{}),...(proxyVariant?{trustedProxies:['127.0.0.1']}:{ }),controlUi:{enabled:false}},
  agents:{ownership:'explicit',defaults:{workspace:root+'/private/workspace',...(model?{model:{primary:'crays-controlled/synthetic'}}:{})},entries:{[agent]:{name:'Synthetic private SDK integration',workspace:root+'/private/workspace',agentDir:root+'/private/agent'}}},
  ...(model?{models:{mode:'replace',providers:{'crays-controlled':{baseUrl:model.baseUrl,apiKey:'SYNTHETIC_LOCAL_ONLY_NOT_PROVIDER_KEY',api:'openai-completions',models:[{id:'synthetic',name:'Controlled integration fixture',reasoning:false,input:['text'],contextWindow:32768,maxTokens:256,cost:{input:0,output:0,cacheRead:0,cacheWrite:0}}]}}}}:{}),
  channels:{},plugins:{enabled:false},cron:{enabled:false},browser:{enabled:false},update:{checkOnStart:false},discovery:{mdns:{mode:'off'}}};
 await writeFile(process.env.OPENCLAW_CONFIG_PATH,JSON.stringify(config),{mode:0o600,flag:'wx'});
 phase='original-server-start';
 const {startGatewayServer}=await import(qualifiedSdkURL('server-DBBA_cCO.mjs'));
 server=await startGatewayServer(port,{bind:'loopback',controlUiEnabled:false,auth,tailscale:{mode:'off'},ambientEnvTriggers:'suppress',sidecarStartup:'start'});
 assert.equal(typeof server.close,'function');proof.originalGatewayServer=true;
 phase='original-pairing';
 const pair=await import(qualifiedSdkURL('device-pairing-Drmq_Czv.mjs'));
 const approve=await import(qualifiedSdkURL('device-pairing-approval-DyoNg7Fe.mjs'));
 const keys=generateKeyPairSync('ed25519'),raw=keys.publicKey.export({type:'spki',format:'der'}).subarray(-32);
 const identity={deviceId:createHash('sha256').update(raw).digest('hex'),publicKeyPem:keys.publicKey.export({type:'spki',format:'pem'}),privateKeyPem:keys.privateKey.export({type:'pkcs8',format:'pem'})};
 const pending=await pair.u({deviceId:identity.deviceId,publicKey:raw.toString('base64url'),displayName:'Synthetic native host probe',platform:'linux',clientId:'gateway-client',clientMode:'backend',role:'operator',scopes},process.env.OPENCLAW_STATE_DIR);
 assert(pending.request?.requestId,'Original pending request identity');
 const approved=await approve.n(pending.request.requestId,{callerScopes:scopes},process.env.OPENCLAW_STATE_DIR);
 assert.equal(approved?.status,'approved');
 const own=await pair.t(identity.deviceId,process.env.OPENCLAW_STATE_DIR);
 assert.deepEqual(own.tokens.operator.scopes,scopes);const deviceToken=own.tokens.operator.token;assert(deviceToken);
 proof.ephemeralOriginalPairing=true;
 if(proxyVariant){
  phase='controlled-core-identity-proxy';proxy=await controlledCoreIdentityProxy({root:root+'/private',gatewayPort:port,canonicalPersonId:corePerson,assertCurrent:async()=>corePerson});
  proof.identitySource='Controlled canonical Core person; not email/name/native caller headers. Synthetic admission, no real Auth0/Core grant.';
 }
 phase='original-minimal-client';
 const {t:GatewayClient}=await import(qualifiedSdkURL('client-Bd9s4LXT.mjs'));
 if(authTransition){
  phase='original-client-local-auth-transition';
  async function localConnect(secret){
   let local;let timer;let settled=false;
   const outcome=await new Promise(resolve=>{
    const finish=value=>{if(settled)return;settled=true;clearTimeout(timer);resolve(value);};
    local=new GatewayClient({url:`ws://127.0.0.1:${port}`,deviceIdentity:null,sharedStateMode:'read-only',
     ...secret,role:'operator',scopes,mode:'backend',minProtocol:4,maxProtocol:4,requestTimeoutMs:5000,preauthHandshakeTimeoutMs:5000,
     onHelloOk:h=>finish({accepted:true,method:h.auth?.method,role:h.auth?.role,scopes:h.auth?.scopes}),
     onConnectError:e=>finish({accepted:false,code:typeof e?.code==='string'?e.code:null}),
     onClose:()=>finish({accepted:false,closed:true})});
    timer=setTimeout(()=>finish({accepted:false,timeout:true}),8000);local.start();
   });
   try{
    if(outcome.accepted){
     try{const self=await local.request('users.self',{},{timeoutMs:5000});outcome.profileId=self?.profile?.id??null;}
     catch(error){outcome.selfDenied=true;outcome.selfCode=typeof error?.code==='string'?error.code:null;}
    }
    return outcome;
   }finally{await local.stopAndWait();}
  }
  const legacy=await localConnect({token:localPassword});
  assert.equal(legacy.accepted,false,'Existing token-shaped client cannot be assumed preserved by trusted-proxy/password');
  assert.notEqual(legacy.timeout,true,'Auth rejection must be explicit, not an observation timeout');
  assert.equal(legacy.code,'INVALID_REQUEST','Original explicit credential rejection is required');
  const transitioned=await localConnect({password:localPassword});
  assert.equal(transitioned.accepted,true,'Explicit local password original client must connect');
  assert.equal(transitioned.method,'password');
  assert.equal(transitioned.selfDenied,true,'Shared password must not produce a personal profile');
  assert.equal(transitioned.selfCode,'FORBIDDEN','Only explicit profile denial qualifies; timeout/connection errors fail');
  assert.equal(Object.hasOwn(transitioned,'profileId'),false,'No profile, including a foreign profile, may be returned');
  assert.deepEqual(transitioned.scopes,scopes,'Local comparator retains same two minimal scopes');
  proof.localAuthTransition={legacyToken:legacy,explicitPassword:transitioned,
   realOwnerCallerMigration:false,whatsappOrBrokerCompatibilityAccepted:false};
  if(process.env.CRAYS_NATIVE_GATEWAY_TRANSITION_HEALTH==='1'){
   phase='original-health-cli-configured-password';
   const cliPath=process.env.CRAYS_NATIVE_GATEWAY_HEALTH_COMPLETED_LIFECYCLE==='1'
    ?'/opt/crays/openclaw/qualification-artifacts/sdk4-post-lifecycle/9e6efc34a27ae63d619666f8180b0ec29068480e9c85c6cb154c233fa58a6c69/openclaw.mjs'
    :fileURLToPath(new URL('../openclaw.mjs',qualifiedSdkURL('client-Bd9s4LXT.mjs')));
   const baselineCli=fileURLToPath(new URL('../openclaw.mjs',qualifiedSdkURL('client-Bd9s4LXT.mjs')));
   assert.equal(createHash('sha256').update(await readFile(cliPath)).digest('hex'),createHash('sha256').update(await readFile(baselineCli)).digest('hex'),'Completed actual installed CLI keeps exact original launcher bytes');
   const health=await promisify(execFile)(process.execPath,['--max-old-space-size=512',cliPath,'health','--json','--timeout','10000'],
    {env:{...process.env,OPENCLAW_NO_RESPAWN:'1'},timeout:30000,maxBuffer:262144});
   const payload=JSON.parse(health.stdout);assert.equal(payload.ok,true,'Original CLI health must work with configured local password');
   proof.localAuthTransition.originalHealthCliPassed=true;
   proof.localAuthTransition.originalHealthCliSHA256=createHash('sha256').update(await readFile(cliPath)).digest('hex');
   proof.localAuthTransition.healthPrivateState='Synthetic isolated namespace only; no actual owner channel or broker';
  }
 }

 const hello=await new Promise((resolve,reject)=>{
  client=new GatewayClient({url:proxy?.url??`ws://127.0.0.1:${port}`,...(proxy?{tlsFingerprint:proxy.tlsFingerprint,edgeAuthHeaders:{...proxy.edgeAuthHeaders,'x-crays-core-person':'forged-client-identity-must-be-stripped'}}:{}),deviceIdentity:identity,deviceToken,
   deviceAuthScope:'controlled-native-real-gateway',sharedStateMode:'read-only',preparedDeviceAuth:{token:deviceToken,scopes},
   role:'operator',scopes,mode:'backend',minProtocol:4,maxProtocol:4,requestTimeoutMs:5000,preauthHandshakeTimeoutMs:5000,
   onHelloOk:resolve,onConnectError:reject,onClose:()=>reject(Error('Original client closed before hello'))});client.start();
 });
 proof.originalGatewayClient=true;
 proof.hello={protocol:hello.protocol,bootIdPresent:typeof hello.server?.bootId==='string',authMethod:hello.auth?.method,role:hello.auth?.role,scopes:hello.auth?.scopes,
  hasSend:hello.features?.methods?.includes('chat.send'),hasHistory:hello.features?.methods?.includes('chat.history'),hasChatEvents:hello.features?.events?.includes('chat')};
 assert.equal(hello.protocol,4);assert.deepEqual(hello.auth.scopes,scopes);assert.equal(hello.auth.method,proxyVariant?'trusted-proxy':'device-token');
 const sdkSelf=proxyVariant?await client.request('users.self',{},{timeoutMs:5000}):null;
 const sdkProfileId=sdkSelf?.profile?.id;if(proxyVariant){assert.equal(typeof sdkProfileId,'string');proof.originalSdkSelfProfileRead=true;}
 if(authTransition){assert.notEqual(proof.localAuthTransition.explicitPassword.profileId,sdkProfileId,'Shared local caller must not inherit proxy personal profile');proof.localAuthTransition.proxyProfileIsSeparate=true;}
 phase='actual-session-create';
 const patched=await client.request(proxyVariant?'sessions.create':'sessions.patch',proxyVariant?{key,agentId:agent,idempotencyKey:'controlled-canonical-conversation-create-1'}:{key},{timeoutMs:proxyVariant?30000:5000});
 const sessionId=patched.entry?.sessionId;assert.equal(typeof sessionId,'string');assert(sessionId.length>0);
 const history=await client.request('chat.history',{sessionKey:key,agentId:agent,limit:50,maxBytes:65536},{timeoutMs:5000});
 assert.equal(history.sessionId,sessionId);assert.equal(history.sessionKey,key);assert.equal(history.sessionInfo?.agentId,agent);assert(Object.hasOwn(history.sessionInfo,'activeLeafEntryId'));
 proof.originalSessionAllocated=true;proof.originalHistoryCurrentSession=true;
 if(proxyVariant){
  proof.actualSdkVerifiedProfileAcceptedSession=true;proof.proxy=proxy.counters();
  await client.stopAndWait();client=undefined;
  if(process.env.CRAYS_NATIVE_GATEWAY_NATIVE_TRANSPORT==='1'){
   phase='native-transport-original-principal';
   await import('./runtime-source-loader.mjs');
   const {createNativePersonalGatewayTransport}=await import('../../src/lib/native-personal-gateway-transport.ts');
   const canonical='personal-'+'a'.repeat(48),bindingSHA='a'.repeat(64),revocation=new AbortController();let received=0;let terminal,terminalFrame;let resolveTerminal;const terminalReceived=new Promise(resolve=>{resolveTerminal=resolve;});
   const route={coreAgentId:canonical,sdkAgentId:agent,runtimeBindingSHA256:bindingSHA};
   const principal={corePersonId:corePerson,sdkPrincipalId:coreSubject,sdkProfileId,runtimeBindingSHA256:bindingSHA};
   host=createNativePersonalGatewayTransport(GatewayClient,{url:proxy.url,serverBootId:hello.server.bootId,deviceAuthScope:'controlled-native-real-gateway',deviceIdentity:identity,deviceToken,
    agentId:canonical,sdkAgentId:agent,sdkSessionKey:key,sdkSessionId:sessionId,runtimeBindingSHA256:bindingSHA,timeoutMs:10000,
    corePrincipal:{corePersonId:corePerson,sdkPrincipalId:coreSubject,sdkProfileId,tlsFingerprint:proxy.tlsFingerprint,authorization:proxy.edgeAuthHeaders.authorization,revoked:revocation.signal}},
    async()=>({expectedSessionRoutingContract:'controlled-current-core-person-no-model',expectedLeafEntryId:null,expectedAgentRoute:route,expectedGatewayPrincipal:principal}),async event=>{received++;if(event?.event==='chat'&&event.payload?.state==='final'){terminal=event.payload;terminalFrame=event;resolveTerminal();}});
   await host.connect();await host.assertReady();
   const current=await host.transport.request('chat.history',{sessionKey:key,agentId:agent,limit:50,maxBytes:65536});
   assert.equal(current.sessionId,sessionId);assert.equal(current.sessionKey,key);assert.equal(current.sessionInfo.agentId,agent);
   proof.nativeTransportWithOriginalServer=true;proof.nativeTransportSameSessionHistory=true;
   if(model){
    phase='original-chat-turn-local-provider';
    const runId='personal-run-11111111-1111-4111-8111-111111111111';
    const ack=await host.transport.request('chat.send',{sessionKey:key,sessionId,agentId:agent,message:'CONTROLLED_NATIVE_INPUT',idempotencyKey:runId});
    proof.chatAck=ack;assert.equal(ack.runId,runId);
    await Promise.race([terminalReceived,new Promise((_,reject)=>setTimeout(()=>reject(Error('Original final chat event timeout')),30000).unref())]);
    assert.equal(terminal.runId,runId);assert.equal(terminal.sessionKey,key);
    const completed=await host.transport.request('chat.history',{sessionKey:key,agentId:agent,limit:50,maxBytes:65536});
    assert.equal(completed.sessionId,sessionId);
    assert.equal(completed.sessionKey,key);assert.equal(completed.sessionInfo?.agentId,agent);
    const messageText=m=>typeof m.content==='string'?m.content:(Array.isArray(m.content)?m.content.filter(b=>b.type==='text').map(b=>b.text).join(''):null);
    const users=completed.messages.filter(m=>m.role==='user'&&messageText(m)==='CONTROLLED_NATIVE_INPUT');
    const replies=completed.messages.filter(m=>m.role==='assistant'&&messageText(m)==='CONTROLLED_NATIVE_REPLY');
    assert.equal(users.length,1);assert.equal(replies.length,1);assert.equal(messageText(terminal.message),'CONTROLLED_NATIVE_REPLY');
    assert.equal(terminal.message.role,'assistant');assert.equal(model.count(),1);
    proof.originalCompleteChatTurn=true;proof.controlledLocalProviderRequests=1;proof.realModelCalled=false;
    proof.originalSameRunFinalEvent=true;proof.originalHistoryContainsOneStructuredControlledReply=true;
    proof.sdkReplayNotTested=true;
    if(process.env.CRAYS_NATIVE_GATEWAY_DISPATCH_RECONCILE==='1'){
     phase='original-chat-dispatch-event-and-history-reconciliation';
     const {createNativePersonalSdkDispatch}=await import('../../src/lib/native-personal-sdk-dispatch.ts');
     const attempt={attemptId:'controlled-attempt',receiptId:'controlled-receipt',messageId:'controlled-original',body:'CONTROLLED_NATIVE_INPUT',
      sdkRunId:runId,sdkSessionId:sessionId,sdkSessionKey:key,runtimeBindingSHA256:bindingSHA,agentId:canonical,sdkAgentId:agent,freshlyCreated:false};
     const observations=new Map();let promotions=0;
     const repository={read:async id=>{assert.equal(id,attempt.receiptId);return attempt;},
      prepare:async()=>{throw Error('Reconciliation must never prepare or send');},
      observe:async(id,eventKey,kind,payload)=>{
       assert.equal(id,attempt.attemptId);assert.equal(eventKey,'sdk-terminal-response');assert.equal(kind,'terminal_reply');
       assert.deepEqual(payload,{runId,sessionId,text:'CONTROLLED_NATIVE_REPLY'});
       if(observations.has(eventKey))assert.deepEqual(observations.get(eventKey),payload);else observations.set(eventKey,payload);
       return 'controlled-terminal-observation';
      },promote:async(id,observation)=>{assert.equal(id,attempt.attemptId);assert.equal(observation,'controlled-terminal-observation');promotions++;return 'controlled-canonical-response';}};
     const dispatch=createNativePersonalSdkDispatch(repository,host.transport);
     assert.deepEqual(await dispatch.acceptEvent(attempt.receiptId,terminalFrame),{state:'canonical_response',messageId:'controlled-canonical-response'});
     assert.deepEqual(await dispatch.reconcile(attempt.receiptId),{state:'canonical_response',messageId:'controlled-canonical-response'});
     assert.equal(observations.size,1);assert.equal(promotions,2);assert.equal(model.count(),1);
     proof.productionDispatcherAcceptsOriginalFinalEvent=true;proof.productionDispatcherRecoversOriginalPersistedHistory=true;
     proof.repositoryIsExplicitInMemoryFixture=true;proof.actualSqlCanonicalPromotionNotTestedInThisLane=true;
    }
   }

   const beforeRevocation=received;revocation.abort();await assert.rejects(()=>host.assertReady(),/PRINCIPAL_REVOKED/);
   await assert.rejects(()=>host.transport.request('chat.history',{sessionKey:key,agentId:agent}),/PRINCIPAL_REVOKED/);
   await host.close();host=undefined;assert.equal(received,beforeRevocation);proof.nativeRevocationClosesTransport=true;
   const wrongProfileId='synthetic-unassigned-sdk-profile';
   host=createNativePersonalGatewayTransport(GatewayClient,{url:proxy.url,serverBootId:hello.server.bootId,deviceAuthScope:'controlled-native-real-gateway',deviceIdentity:identity,deviceToken,
    agentId:canonical,sdkAgentId:agent,sdkSessionKey:key,sdkSessionId:sessionId,runtimeBindingSHA256:bindingSHA,timeoutMs:10000,
    corePrincipal:{corePersonId:corePerson,sdkPrincipalId:coreSubject,sdkProfileId:wrongProfileId,tlsFingerprint:proxy.tlsFingerprint,authorization:proxy.edgeAuthHeaders.authorization,revoked:new AbortController().signal}},
    async()=>({expectedSessionRoutingContract:'controlled-negative-profile',expectedLeafEntryId:null,expectedAgentRoute:route,expectedGatewayPrincipal:{...principal,sdkProfileId:wrongProfileId}}),async()=>{received++;});
   await assert.rejects(()=>host.connect(),/HELLO_NOT_ADMITTED/);await host.close();host=undefined;
   assert.equal(received,beforeRevocation);proof.actualSdkForeignProfileRejected=true;proof.actualSdkAssignedProfileAccepted=true;
   proof.proxy=proxy.counters();assert.equal(proof.proxy.forwarded,3);
   proof.status='PASS_ORIGINAL_NATIVE_TRANSPORT_CONTROLLED_PRINCIPAL_NOT_OWNER';proof.finalPhase='native-transport-same-session-and-revocation';
  }else{
   proof.status='PASS_ORIGINAL_CORE_PRINCIPAL_CANDIDATE_NOT_NATIVE_TRANSPORT';proof.finalPhase='original-profile-session-history';
  }
  await proxy.close();proxy=undefined;
  await server.close({reason:'finite controlled canonical-principal candidate'});server=undefined;
 }else{
 await client.stopAndWait();client=undefined;
 phase='native-transport-real-server';
 await import('./runtime-source-loader.mjs');
 const {createNativePersonalGatewayTransport}=await import('../../src/lib/native-personal-gateway-transport.ts');
 const canonical='personal-'+'a'.repeat(48),bindingSHA='a'.repeat(64);
 host=createNativePersonalGatewayTransport(GatewayClient,{url:`ws://127.0.0.1:${port}`,serverBootId:hello.server.bootId,deviceAuthScope:'controlled-native-real-gateway',deviceIdentity:identity,deviceToken,
  agentId:canonical,sdkAgentId:agent,sdkSessionKey:key,sdkSessionId:sessionId,runtimeBindingSHA256:bindingSHA,timeoutMs:5000},
  async()=>({expectedSessionRoutingContract:'controlled-probe-no-model-send',expectedLeafEntryId:null,expectedAgentRoute:{coreAgentId:canonical,sdkAgentId:agent,runtimeBindingSHA256:bindingSHA}}),async()=>{});
 await host.connect();
 const current=await host.transport.request('chat.history',{sessionKey:key,agentId:agent,limit:50,maxBytes:65536});
 assert.equal(current.sessionId,sessionId);assert.equal(current.sessionInfo?.agentId,agent);proof.nativeTransportWithOriginalServer=true;
 phase='original-close';await host.close();host=undefined;await server.close({reason:'finite isolated native integration qualification'});server=undefined;
 proof.status='PASS_ORIGINAL_GATEWAY_SESSION_TRANSPORT_NOT_OWNER_MODEL';proof.finalPhase=phase;
 }
}catch(error){primary=error;proof.status='FAIL_ACTUAL_ORIGINAL_GATEWAY';proof.failedPhase=phase;proof.error=safeError(error);process.exitCode=1;}
finally{
 const cleanup=[];
 for(const [name,close] of [['localModel',()=>model?.close()],['controlledProxy',()=>proxy?.close()],['nativeTransport',()=>host?.close()],['originalClient',()=>client?.stopAndWait()],['originalServer',()=>server?.close({reason:'finite probe cleanup'})]]){
  try{await close();}catch(error){cleanup.push({name,error:safeError(error)});}
 }
 proof.cleanupErrors=cleanup;proof.originalSourceUnchanged=JSON.stringify(sdkSchemaSourcePins())===JSON.stringify(pins);
 if(cleanup.length||!proof.originalSourceUnchanged){proof.status='FAIL_PROBE_CLEANUP_OR_SOURCE';process.exitCode=1;}
 await writeFile(root+'/PROBE.json',JSON.stringify(proof,null,2)+'\n',{mode:0o600,flag:'wx'});
 clearTimeout(deadline);console.log(JSON.stringify({status:proof.status,phase,primaryError:primary?safeError(primary):undefined}));
}
