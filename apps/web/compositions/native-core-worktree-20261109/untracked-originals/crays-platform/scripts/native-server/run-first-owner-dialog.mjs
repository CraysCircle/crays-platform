// One genuine owner Native APQ -> existing Core outbox -> current original SDK
// consumer -> real model -> canonical response read through the same Native APQ.
// This is backend integration, never an iOS/device/TestFlight acceptance claim.
import './source-loader.mjs';
import {nativeServerSourcePins} from './source-loader.mjs';
import {readPrivateOwnerRuntimeFile,startConfiguredOwnerChuck} from './owner-consumer.mjs';
import {createHash} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
const output=new URL('../../../.task-work/native-owner-consumer-20261025/ACTUAL_FIRST_OWNER_DIALOG_RESULT.json',import.meta.url);
const stop=new AbortController();let host,identityPool,personalPool,phase='start-admitted-own-consumer',code=1;
const proof={schema:'crays.native.actual-first-owner-backend-dialog.v1',startedAt:new Date().toISOString(),actualHostedAuth0:true,actualHostedCore:true,actualOriginalSdk:true,actualIosDevice:false,actualNativeHttpServer:false,customerProfileFallback:false};
const deadline=setTimeout(()=>stop.abort(),120000);
process.once('SIGTERM',()=>stop.abort());process.once('SIGINT',()=>stop.abort());
try{
 host=await startConfiguredOwnerChuck({signal:stop.signal,expiresAtMs:Date.now()+115000});
 proof.ownOriginalConsumerStarted=true;proof.rootPolicySha256=host.rootPolicySha256;
 const tokens=await readPrivateOwnerRuntimeFile('native-client-tokens.json');
 const {nativePersonalDocuments}=await import('../../src/graphql/native-personal-messenger-documents.ts');
 const {admitNativePersonalRequest,executeNativePersonalRequest}=await import('../../src/lib/native-personal-messenger.ts');
 identityPool=await import('../../src/db/core-identity-runtime-pool.ts');personalPool=await import('../../src/db/native-personal-runtime-pool.ts');
 async function call(name,input){
  stop.signal.throwIfAborted();const d=nativePersonalDocuments[name];
  const request=new Request('https://api.crays.pro/api/graphql',{method:'POST',signal:stop.signal,headers:{authorization:'Bearer '+tokens.access_token,'content-type':'application/json'},body:JSON.stringify({operationName:name,extensions:{persistedQuery:{version:1,sha256Hash:createHash('sha256').update(d.document).digest('hex')}},variables:input})});
  if(!await admitNativePersonalRequest(request))throw Error('NATIVE_PERSISTED_REQUEST_REQUIRED');
  return executeNativePersonalRequest(request,d.field,input);
 }
 phase='receive-original-native-owner-message';
 const receipt=await call('ReceiveScopedAgentMessage',{bindingId:host.target.bindingId,expectedBindingRevision:host.target.bindingRevision,expectedContactRevision:host.target.contactRevision,idempotencyKey:'owner-native-first-dialog-20261025',body:'Bestätige kurz, dass dieser neue private CRAYS-Chat meinen bestehenden persönlichen Chuck erreicht. Führe keine Werkzeuge oder externen Aktionen aus.'});
 proof.originalCoreReceipt={receiptId:receipt.receiptId,messageId:receipt.messageId,replayed:receipt.replayed};
 phase='await-canonical-same-chat-model-response';
 while(!stop.signal.aborted){
  const transcript=await call('NativePersonalTranscript',{});
  if(transcript.conversationId!==host.conversationId)throw Error('ORIGINAL_SAME_CHAT_REQUIRED');
  const replies=transcript.messages.filter(m=>m.authorKind==='CHUCK'&&m.inReplyToMessageId===receipt.messageId);
  if(replies.length===1){
   if(typeof replies[0].body!=='string'||!replies[0].body.trim())throw Error('CANONICAL_REAL_REPLY_REQUIRED');
   proof.actualCanonicalReply={messageId:replies[0].messageId,requestMessageId:receipt.messageId,conversationId:transcript.conversationId,body:replies[0].body};
   proof.status='ACTUAL_ORIGINAL_OWNER_NATIVE_BACKEND_MODEL_DIALOG_PASS_NOT_IOS_DEVICE';code=0;break;
  }
  if(host.lifecycle.state().phase==='failed')throw Error('ORIGINAL_CONSUMER_FAILED_RECONCILIATION_REQUIRED');
  await new Promise(resolve=>setTimeout(resolve,1000));
 }
 if(code!==0)throw Error('ORIGINAL_RECEIPT_REQUIRES_RECONCILIATION_NO_RESEND');
}catch(error){proof.status='ACTUAL_OWNER_DIALOG_NOT_ACCEPTED';proof.phase=phase;proof.code=/^[A-Z0-9_]+$/.test(error?.message??'')?error.message:'ORIGINAL_HOST_OR_NATIVE_COMMAND_FAILED';}
finally{
 clearTimeout(deadline);stop.abort();
 try{if(host){proof.finalWorkerState=await host.lifecycle.stop();proof.consumerStopped=true;}}catch{proof.consumerCleanupUnconfirmed=true;}
 await identityPool?.closeCoreNativeIdentityRpcPool();await personalPool?.closeNativePersonalRuntimePool();
 proof.sourcePins=nativeServerSourcePins();proof.completedAt=new Date().toISOString();
 await writeFile(output,JSON.stringify(proof,null,2)+'\n',{mode:0o600,flag:'wx'});
 console.log(JSON.stringify({...proof,actualCanonicalReply:proof.actualCanonicalReply?{...proof.actualCanonicalReply,body:'[stored original model reply; private evidence]'}:undefined,sourcePins:Object.keys(proof.sourcePins).length}));process.exit(code);
}
