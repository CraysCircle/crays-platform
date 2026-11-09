import {qualifiedSdkURL} from './sdk-source-bindings.mjs';
// Controlled loopback peer, NOT a real assigned host/model/user pairing.
// Exercises the unmodified original SDK protocol client with ephemeral memory
// keys only. Never loads a user's device identity or provider/model credentials.
import assert from 'node:assert/strict';
import {generateKeyPairSync,createHash} from 'node:crypto';
import {once} from 'node:events';
const {t:GatewayClient}=await import(qualifiedSdkURL("client-Bd9s4LXT.mjs"));
const {n:WebSocketServer}=await import(qualifiedSdkURL("websocket-CGHaToS5.mjs"));
const {n:buildDeviceAuthPayloadV3}=await import(qualifiedSdkURL("device-auth-BT2rF0Jc.mjs"));
const {d:verifyEd25519Signature}=await import(qualifiedSdkURL("ed25519-signature-D_xiObSW.mjs"));
const {t:lazyCompile}=await import(qualifiedSdkURL("protocol-validator-BeXu4Ype.mjs"));
const schemas=await import(qualifiedSdkURL("sessions-DJqMAtE3.mjs"));
const minimal=['operator.sessions.read','operator.sessions.write'];
export async function originalGatewayPeer(target,mode='normal') {
 const sdkAgentId=target.sdkAgentId??target.agentId;
 const keys=generateKeyPairSync('ed25519'),raw=keys.publicKey.export({type:'spki',format:'der'}).subarray(-32);
 const identity={deviceId:createHash('sha256').update(raw).digest('hex'),publicKeyPem:keys.publicKey.export({type:'spki',format:'pem'}),privateKeyPem:keys.privateKey.export({type:'pkcs8',format:'pem'})};
 const token='synthetic-own-paired-device-token-not-real';
 const server=new WebSocketServer({host:'127.0.0.1',port:0,maxPayload:131072});await once(server,'listening');
 const address=server.address();assert.equal(address.address,'127.0.0.1');
 let socket,connected=false,outerSeq=0,history=[],holdHistory=false,heldHistory,historyWaiter,onSend,historyResponder;const calls=[],errors=[];
 const respond=(id,payload)=>socket.send(JSON.stringify({type:'res',id,ok:true,payload}));
 server.on('connection',s=>{
  assert.equal(socket,undefined,'only one socket; wrapper must stop implicit reconnect');socket=s;
  s.send(JSON.stringify({type:'event',event:'connect.challenge',payload:{nonce:'synthetic-native-gateway-nonce',ts:Date.now()}}));
  s.on('message',bytes=>{
   try{
    const req=JSON.parse(bytes.toString()),p=req.params;assert.equal(req.type,'req');calls.push({method:req.method,params:p});
    if(req.method==='connect'){
     assert.equal(lazyCompile(schemas.tn)(p),true,'original connect schema');
     assert.deepEqual(p.scopes,minimal);assert.equal(p.role,'operator');assert.equal(p.minProtocol,4);assert.equal(p.maxProtocol,4);
     assert.equal(p.auth.deviceToken,token);assert.equal(p.auth.token,undefined);assert.equal(p.auth.password,undefined);
     assert.equal(p.device.id,identity.deviceId);assert.equal(p.device.nonce,'synthetic-native-gateway-nonce');
     const payload=buildDeviceAuthPayloadV3({deviceId:p.device.id,clientId:p.client.id,clientMode:p.client.mode,role:p.role,scopes:p.scopes,signedAtMs:p.device.signedAt,token,nonce:p.device.nonce,platform:p.client.platform,deviceFamily:p.client.deviceFamily});
     assert.equal(verifyEd25519Signature({publicKey:p.device.publicKey,payload,signatureBase64Url:p.device.signature}),true,'actual SDK signed ephemeral challenge');
     const hello={type:'hello-ok',protocol:4,server:{version:'controlled-sdk-peer',connId:'synthetic-connection',bootId:mode==='wrong-boot'?'other-boot':'synthetic-personal-boot'},features:{methods:['chat.send','chat.history'],events:['chat']},snapshot:{presence:[],health:{},stateVersion:{presence:0,health:0},uptimeMs:0},auth:{method:mode==='wrong-auth'?'token':'device-token',role:'operator',scopes:mode==='broad-scopes'?[...minimal,'operator.admin']:minimal},policy:{maxPayload:131072,maxBufferedBytes:131072,tickIntervalMs:30000}};
     assert.equal(lazyCompile(schemas.an)(hello),true,'original hello schema');connected=true;respond(req.id,hello);return;
    }
    assert.equal(connected,true);
    if(req.method==='chat.history'){
     assert.equal(lazyCompile(schemas.Ot)(p),true,'original history request schema');assert.equal(p.sessionId,undefined);assert.equal(p.sessionKey,target.sdkSessionKey);assert.equal(p.agentId,sdkAgentId);
     if(holdHistory){holdHistory=false;heldHistory=req.id;historyWaiter?.();historyWaiter=undefined;return;}
     respond(req.id,historyResponder?historyResponder(p):{sessionKey:target.sdkSessionKey,sessionId:target.sdkSessionId,messages:history,sessionInfo:{key:target.sdkSessionKey,sessionId:target.sdkSessionId,agentId:sdkAgentId,activeLeafEntryId:null},inputReceipts:[],hasMore:false,totalMessages:history.length,...(p.offset===undefined?{}:{offset:p.offset})});return;
    }
    assert.equal(req.method,'chat.send','no broad operator method');assert.equal(lazyCompile(schemas.Pt)(p),true,'original send request schema');assert.equal(p.agentId,sdkAgentId);assert.equal(p.sessionKey,target.sdkSessionKey);assert.equal(p.sessionId,target.sdkSessionId);
    onSend?.();if(mode!=='lost-ack')respond(req.id,{runId:p.idempotencyKey,status:'started',messageSeq:1});
   }catch(error){errors.push(error.message);s.close(1008,'controlled fixture assertion failed');}
  });
 });
 return {
  GatewayClient,calls,errors,
  setHistory(rows){history=structuredClone(rows);},
  setHistoryResponder(read){historyResponder=read;},
  holdNextHistory(){assert.equal(heldHistory,undefined);holdHistory=true;},
  async waitForHeldHistory(){if(heldHistory!==undefined)return;await new Promise(resolve=>{historyWaiter=resolve;});},
  releaseHistory(){if(heldHistory!==undefined){const id=heldHistory;heldHistory=undefined;respond(id,{sessionKey:target.sdkSessionKey,sessionId:target.sdkSessionId,messages:history,sessionInfo:{key:target.sdkSessionKey,sessionId:target.sdkSessionId,agentId:sdkAgentId,activeLeafEntryId:null},inputReceipts:[],hasMore:false,totalMessages:history.length});}},
  onSend(callback){onSend=callback;},
  binding:{url:`ws://127.0.0.1:${address.port}`,serverBootId:'synthetic-personal-boot',deviceAuthScope:'synthetic-native-own-device',deviceIdentity:identity,deviceToken:token,agentId:target.agentId,sdkAgentId,sdkSessionKey:target.sdkSessionKey,sdkSessionId:target.sdkSessionId,runtimeBindingSHA256:target.runtimeBindingSHA256,timeoutMs:1000},
  emit(event,payload){assert.ok(socket);socket.send(JSON.stringify({type:'event',event,seq:++outerSeq,payload}));},
  async close(){for(const c of server.clients)c.terminate();await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));assert.deepEqual(errors,[]);},
 };
}
