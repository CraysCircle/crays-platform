// Owner-authorized first native account setup through original fixed handlers.
// Real hosted JWT + userinfo + Core; no raw token/contact is logged.
import './source-loader.mjs';
import {nativeServerSourcePins} from './source-loader.mjs';
import {readFile,writeFile,lstat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const directory='/home/craysdev/.config/crays/native-core/owner-v1';
const hash=s=>createHash('sha256').update(s).digest('hex');
const proofPath=new URL('../../../.task-work/native-contact-registration-20261025/ACTUAL_OWNER_CONTACT_AND_BIND_RESULT.json',import.meta.url);
let identityPool,personalPool,phase='private-input',exit=1;
const report={schema:'crays.native.actual-owner-email-and-personal-bind.v1',startedAt:new Date().toISOString(),actualHostedAuth0:true,actualHostedCore:true,actualNativeHttpServer:false,actualIosDevice:false,modelCalled:false};
try{
 const load=async name=>{const path=directory+'/'+name,s=await lstat(path);if(!s.isFile()||s.isSymbolicLink()||s.uid!==process.getuid()||(s.mode&0o077))throw Error('PRIVATE_INPUT_REQUIRED');return JSON.parse(await readFile(path,'utf8'));};
 const env=await load('server-environment.json');for(const[k,v]of Object.entries(env))process.env[k]=v;
 delete process.env.CRAYS_DATABASE_URL;
 const tokens=await load('native-client-tokens.json');
 identityPool=await import('../../src/db/core-identity-runtime-pool.ts');personalPool=await import('../../src/db/native-personal-runtime-pool.ts');
 const {createNativeCoreRequestResolver}=await import('../../src/lib/native-core-auth.ts');
 const documents=await import('../../src/graphql/native-identity-documents.ts');
 const resolver=createNativeCoreRequestResolver();
 const request=(name,sha,input={},email=false)=>new Request('https://api.crays.pro/api/graphql',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+tokens.access_token,...(email?{'x-crays-email-authorization':'Bearer '+tokens.access_token}:{})},body:JSON.stringify({operationName:name,extensions:{persistedQuery:{version:1,sha256Hash:sha}},variables:input})});
 const state=async()=>{const req=request('NativeEmailSetup',documents.NativeEmailSetupDocument.__meta__.hash);await resolver.admit(req);return resolver.resolveIdentity(req);};
 phase='read-current-native-email-state';let current=await state();
 if(!current.accountMapped||current.accountId!=='acct_dae5f628-3c09-4fd9-940d-fe55cb68323c')throw Error('ORIGINAL_OWNER_REQUIRED');
 if(current.emailVerificationRequired){
  phase='register-original-provider-email-proof';
  const input={idempotencyKey:'owner-native-email-20261025',expectedContactRevision:current.contactRevision};
  const req=request('NativeRegisterEmail',documents.NativeRegisterEmailDocument.__meta__.hash,input,true);await resolver.admit(req);
  const receipt=await resolver.registerEmail(req,input);report.actualContactReceipt={receiptId:receipt.receiptId,contactRevision:receipt.contactRevision,current:receipt.current,replayed:receipt.replayed};
 }
 phase='verify-current-core-contact';current=await state();if(current.emailVerificationRequired)throw Error('CURRENT_PROVIDER_EMAIL_PROOF_REQUIRED');
 report.originalOwnerMapped=true;report.emailVerifiedInCore=true;report.contactRevision=current.contactRevision;
 // The existing own-person command creates only the canonical assignment and
 // conversation intent. It does NOT install another SDK agent or claim a reply.
 phase='bind-original-personal-messenger';
 const {nativePersonalDocuments}=await import('../../src/graphql/native-personal-messenger-documents.ts');
 const {admitNativePersonalRequest,executeNativePersonalRequest}=await import('../../src/lib/native-personal-messenger.ts');
 const d=nativePersonalDocuments.BindPersonalMessenger,input={expectedContactRevision:current.contactRevision};
 const req=request('BindPersonalMessenger',hash(d.document),input);if(!await admitNativePersonalRequest(req))throw Error('NATIVE_PERSONAL_REQUEST_REQUIRED');
 const binding=await executeNativePersonalRequest(req,d.field,input);
 report.actualCanonicalPersonalBinding={bindingId:binding.bindingId,revision:binding.revision,conversationId:binding.conversationId};
 report.baselineAssignmentIntentCreated=true;report.anotherSdkAgentCreated=false;report.chuckRuntimeStarted=false;
 report.status='ACTUAL_OWNER_NATIVE_AUTH_CONTACT_AND_CORE_BIND_PASS_NOT_DEVICE_OR_MODEL_REPLY';report.sourcePins=nativeServerSourcePins();exit=0;
}catch(error){report.status='ACTUAL_OWNER_SETUP_INCOMPLETE';report.phase=phase;report.code=/^[A-Z0-9_]+$/.test(error?.message??'')?error.message:'ORIGINAL_NATIVE_COMMAND_FAILED';}
finally{
 await identityPool?.closeCoreNativeIdentityRpcPool();await personalPool?.closeNativePersonalRuntimePool();
 report.completedAt=new Date().toISOString();await writeFile(proofPath,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({...report,sourcePins:report.sourcePins?Object.keys(report.sourcePins).length:undefined}));process.exit(exit);
}
