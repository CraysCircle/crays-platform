// Qualification-only original SDK4 full server fixture. Caller must run inside
// the bounded private-network SQL controller; no owner/config discovery.
import assert from 'node:assert/strict';
import {mkdir,writeFile,realpath,stat,readlink} from 'node:fs/promises';
import {generateKeyPairSync,createHash} from 'node:crypto';
import {createServer} from 'node:net';
import {qualifiedSdkURL,sdkSchemaSourcePins} from './sdk-source-bindings.mjs';
export async function originalSdkServerFixture({root,corePerson,agent}){
 assert.equal(process.getuid(),1000);assert.equal(process.getgid(),1000);
 assert(/^\/srv\/crays\/worktrees\/ios-core-native-01a14a1b\/crays-platform\/\.qualification\/native-http-sql-(?:v6[1278]|v75|v76|v77|v78|v79|v80|v81|v82|v83|v84|v85|v86|v87|v88|v89|v90|v91|v92|v93|v94|v95|v96|v97|v98|v99|v100)\/sdk-fixture$/.test(root));
 const expectedHostNetns=process.env.CRAYS_NATIVE_EXPECTED_HOST_NETNS;
 assert(typeof expectedHostNetns==='string' && /^net:\[\d+\]$/.test(expectedHostNetns),'Exact original host network namespace required');
 assert.notEqual(await readlink('/proc/self/ns/net'),expectedHostNetns);
 await mkdir(root,{mode:0o700});assert.equal(await realpath(root),root);assert.equal((await stat(root)).uid,1000);
 await mkdir(root+'/private',{mode:0o700});await mkdir(root+'/private/state',{mode:0o700});await mkdir(root+'/private/agent',{mode:0o700});
 process.env.OPENCLAW_CONFIG_PATH=root+'/private/config.json';process.env.OPENCLAW_STATE_DIR=root+'/private/state';process.env.OPENCLAW_AGENT_DIR=root+'/private/agent';
 const pins=sdkSchemaSourcePins(),scopes=['operator.sessions.read','operator.sessions.write'],proxyVariant=true;
 const key=`agent:${agent}:ios:controlled-native-conversation`,token='SYNTHETIC_LOCAL_TOKEN_NOT_OWNER';
 let server,client,proxy,model,phase;const proof={};
 const close=async()=>{const errors=[];for(const finish of [()=>client?.stopAndWait(),()=>proxy?.close(),()=>server?.close({reason:'finite synthetic SQL/SDK fixture'}),()=>model?.close()]){try{await finish();}catch(e){errors.push(e);}}if(errors.length)throw Error('SYNTHETIC_SDK_CLEANUP_FAILED');};
 try{
 await mkdir(root+'/private/workspace',{recursive:true,mode:0o700});
 const port=await new Promise((resolve,reject)=>{const reserve=createServer();reserve.once('error',reject);reserve.listen(0,'127.0.0.1',()=>{const p=reserve.address().port;reserve.close(error=>error?reject(error):resolve(p));});});

 const {coreSubjectForCanonicalPerson,controlledCoreIdentityProxy}=await import('./controlled-core-identity-proxy.mjs');
 const coreSubject=coreSubjectForCanonicalPerson(corePerson);
 const auth=proxyVariant?{mode:'trusted-proxy',identityScopes:{[coreSubject]:scopes},trustedProxy:{userHeader:'x-crays-core-person',requiredHeaders:['x-crays-core-assertion'],allowUsers:[coreSubject],allowLoopback:true}}:{mode:'token',token};
 if(true){const {controlledLocalModel}=await import('./controlled-local-model.mjs');model=await controlledLocalModel();}
 const config={gateway:{mode:'local',bind:'loopback',auth,...(proxyVariant?{trustedProxies:['127.0.0.1']}:{ }),controlUi:{enabled:false}},
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
 phase='actual-session-create';
 const patched=await client.request(proxyVariant?'sessions.create':'sessions.patch',proxyVariant?{key,agentId:agent,idempotencyKey:'controlled-canonical-conversation-create-1'}:{key},{timeoutMs:proxyVariant?30000:5000});
 const sessionId=patched.entry?.sessionId;assert.equal(typeof sessionId,'string');assert(sessionId.length>0);
 const history=await client.request('chat.history',{sessionKey:key,agentId:agent,limit:50,maxBytes:65536},{timeoutMs:5000});
 assert.equal(history.sessionId,sessionId);assert.equal(history.sessionKey,key);assert.equal(history.sessionInfo?.agentId,agent);assert(Object.hasOwn(history.sessionInfo,'activeLeafEntryId'));

 await client.stopAndWait();client=undefined;
 const {o:resolveRoutingContract}=await import(qualifiedSdkURL('main-session-00MgEWj5.mjs'));
 const revoked=new AbortController();
 return {GatewayClient,model,proof,sourcePins:pins,sessionId,sessionKey:key,sdkProfileId,coreSubject,
  routingContract:resolveRoutingContract(config),
  gateway:{url:proxy.url,serverBootId:hello.server.bootId,deviceAuthScope:'controlled-native-sql-original-gateway',deviceIdentity:identity,deviceToken,timeoutMs:10000,
   corePrincipal:{corePersonId:corePerson,sdkPrincipalId:coreSubject,sdkProfileId,tlsFingerprint:proxy.tlsFingerprint,authorization:proxy.edgeAuthHeaders.authorization,revoked:revoked.signal}},
  close:async()=>{revoked.abort();await close();assert.deepEqual(sdkSchemaSourcePins(),pins);}};
 }catch(error){await close();throw error;}
}
