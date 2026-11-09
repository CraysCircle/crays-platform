// Genuine hosted-Auth0 JWT through the original native request resolver.
// Fixed existing private files; no synthetic principal or caller-selected account.
import './source-loader.mjs';
import {nativeServerSourcePins} from './source-loader.mjs';
import {readFile,writeFile,lstat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const directory='/home/craysdev/.config/crays/native-core/owner-v1';
async function privateJson(name){const p=directory+'/'+name,s=await lstat(p);if(!s.isFile()||s.isSymbolicLink()||s.uid!==process.getuid()||(s.mode&0o077))throw Error('PRIVATE_SERVER_INPUT_REQUIRED');return JSON.parse(await readFile(p,'utf8'));}
let code=1,identityPool,personalPool;
try{
 const env=await privateJson('server-environment.json');for(const[k,v]of Object.entries(env))process.env[k]=v;
 delete process.env.CRAYS_DATABASE_URL; // No general/business database fallback.
 const tokens=await privateJson('native-client-tokens.json');
 identityPool=await import('../../src/db/core-identity-runtime-pool.ts');
 personalPool=await import('../../src/db/native-personal-runtime-pool.ts');
 const {createNativeCoreRequestResolver}=await import('../../src/lib/native-core-auth.ts');
 const {NativeIdentityStatusDocument}=await import('../../src/graphql/native-identity-documents.ts');
 const request=new Request('https://api.crays.pro/api/graphql',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+tokens.access_token},body:JSON.stringify({operationName:'NativeIdentityStatus',extensions:{persistedQuery:{version:1,sha256Hash:NativeIdentityStatusDocument.__meta__.hash}},variables:{}})});
 const resolver=createNativeCoreRequestResolver();await resolver.admit(request);const result=await resolver.resolveIdentity(request);
 if(!result.accountMapped||result.accountId!=='acct_dae5f628-3c09-4fd9-940d-fe55cb68323c')throw Error('ACTUAL_ORIGINAL_ACCOUNT_REQUIRED');
 const proof={schema:'crays.native.actual-owner-original-entry.v1',at:new Date().toISOString(),originalNativeRequestResolver:true,actualHostedAuth0Jwt:true,actualOriginalOwnerMapped:true,actualRestrictedCoreContactRead:true,
  currentContactRevision:result.contactRevision,emailVerificationRequired:result.emailVerificationRequired,nostrSignerVerified:result.nostrSignerVerified,requiredActions:result.requiredActions,
  generalDatabaseConfigured:false,actualNativeHttpServer:false,actualIosDevice:false,sameChatReply:false,sourcePins:nativeServerSourcePins()};
 const output=fileURLToPath(new URL('../../../.task-work/native-core-actual-server-connections-20261025/ACTUAL_OWNER_ENTRY_RESULT.json',import.meta.url));
 await writeFile(output,JSON.stringify(proof,null,2)+'\n',{mode:0o600,flag:'wx'});console.log(JSON.stringify({...proof,sourcePins:Object.keys(proof.sourcePins).length}));code=0;
}catch(error){console.log(JSON.stringify({status:'ACTUAL_OWNER_ENTRY_NOT_COMPLETE',code:/^[A-Z0-9_]+$/.test(error?.message??'')?error.message:'ORIGINAL_NATIVE_ENTRY_FAILED',tokensPrinted:false}));}
finally{await identityPool?.closeCoreNativeIdentityRpcPool();await personalPool?.closeNativePersonalRuntimePool();process.exit(code);}
