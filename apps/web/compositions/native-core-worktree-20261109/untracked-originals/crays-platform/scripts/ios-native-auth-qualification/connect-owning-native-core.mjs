// Actual existing-role connection admission, not a synthetic database test.
// Credentials arrive over non-echoing stdin, never argv, stdout or source.
import './runtime-source-loader.mjs';
import {readFile,writeFile,mkdir,open,lstat,rename} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Pool} from 'pg';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const sha=v=>createHash('sha256').update(typeof v==='string'||Buffer.isBuffer(v)?v:JSON.stringify(v)).digest('hex');
const root=resolve(fileURLToPath(new URL('../../',import.meta.url)));
const directory=resolve(root,'../.task-work/native-core-actual-server-connections-20261025');
const privateDirectory='/home/craysdev/.config/crays/native-core/owner-v1';
const refresh=process.argv.slice(2).join(' ')==='--refresh-current';
const expectedAccount='acct_dae5f628-3c09-4fd9-940d-fe55cb68323c';
let metadataPool,phase='private-input';
try {
 let line='';for await(const chunk of process.stdin){line+=chunk;if(Buffer.byteLength(line)>32768)throw Error('INPUT_LIMIT');if(line.includes('\n'))break;}
 const input=JSON.parse(line);
 if(Object.keys(input).sort().join(',')!=='identity,personal')throw Error('EXACT_TWO_EXISTING_ROLES_REQUIRED');
 const identity=new URL(input.identity),personal=new URL(input.personal);
 const host='ep-wandering-field-astlbgje.c-4.eu-central-1.aws.neon.tech';
 for(const [uri,role] of [[identity,'crays_core_identity_rpc_runtime_v1'],[personal,'crays_core_native_personal_runtime_v1']]){
  if(!['postgres:','postgresql:'].includes(uri.protocol)||uri.hostname!==host||uri.pathname!=='/neondb'||decodeURIComponent(uri.username)!==role||!uri.password||uri.hash||uri.port&&uri.port!=='5432')throw Error('ORIGINAL_TARGET_ROLE_REQUIRED');
  for(const key of uri.searchParams.keys())if(!['sslmode','channel_binding'].includes(key)||uri.searchParams.getAll(key).length!==1)throw Error('CONNECTION_OPTIONS_DENIED');
  if(!['require','verify-full'].includes(uri.searchParams.get('sslmode')))throw Error('TLS_REQUIRED');
 }
 identity.searchParams.set('channel_binding','require');
 personal.searchParams.delete('channel_binding'); // Product pool selects TLS and channel binding in its explicit pg options.
 phase='actual-personal-role-catalogue';
 const native=await import('../../src/db/native-personal-runtime-pool.ts');
 const candidateContract={accessManifestSha256:native.NATIVE_PERSONAL_ACCESS_SHA256,catalogueSha256:'0'.repeat(64)};
 const candidate=native.buildNativePersonalRuntimePoolConfig({CRAYS_CORE_NATIVE_PERSONAL_DATABASE_URL:personal.href,CRAYS_CORE_NATIVE_PERSONAL_DATABASE_CONTRACT:JSON.stringify(candidateContract)});
 metadataPool=new Pool(candidate.config);
 const client=await metadataPool.connect();let catalogue,contract;
 try {
  // Explicit owning release admission: freeze current restricted-role metadata,
  // then pass the unchanged verifier. Ordinary checkouts never auto-refresh it.
  catalogue=await native.readNativePersonalRuntimeCatalogue(client);
  contract={accessManifestSha256:native.NATIVE_PERSONAL_ACCESS_SHA256,catalogueSha256:native.nativePersonalRuntimeCatalogueSHA256(catalogue)};
  await native.verifyNativePersonalRuntimeCheckout(client,Object.freeze(contract));
 }finally{client.release();await metadataPool.end();metadataPool=undefined;}
 phase='exact-original-identity-lookup';
 const source=resolve(root,'../.task-work/native-exact-original-identity-reader-20261025');
 const approval=await readFile(resolve(source,'EXACT_NATIVE_OWNER_ISSUER_APPROVAL.json'));
 const identityContract={role:'crays_core_identity_rpc_runtime_v1',identityOwner:'crays_core_identity_rpc_owner_v1',
  identityDefinitionSha256:'5e575a66f4f1172e5e80ebfdd11bb2475bd7799a63fed0efc2c69ecc0dab5c8f',
  generationSha256:sha({schema:'crays.native.exact-original-identity-release.v1',approvalSha256:sha(approval),migrationSha256:sha(await readFile(resolve(root,'database/migrations/0221_native_exact_original_identity_reader.sql')))})};
 const runtime={CRAYS_NATIVE_AUTH_ENABLED:'true',CRAYS_NATIVE_AUTH_ISSUER:'https://login.crays.pro/',CRAYS_NATIVE_AUTH_AUDIENCE:'https://api.crays.pro/',
  CRAYS_NATIVE_AUTH_CLIENT_IDS:'CERjos0EEyKusmsI7LQupWokjhEwDpzn',CRAYS_NATIVE_AUTH_IDENTITY_SCOPE:'crays:identity:read',CRAYS_NATIVE_AUTH_BOOTSTRAP_SCOPE:'crays:bootstrap:read',
  CRAYS_NATIVE_AUTH_CONTACT_WRITE_SCOPE:'crays:contact:write',CRAYS_NATIVE_AUTH_PERSONAL_READ_SCOPE:'crays:personal:read',CRAYS_NATIVE_AUTH_PERSONAL_WRITE_SCOPE:'crays:personal:write',
  CRAYS_CORE_NATIVE_IDENTITY_RPC_DATABASE_URL:identity.href,CRAYS_CORE_NATIVE_IDENTITY_RPC_CONTRACT:JSON.stringify(identityContract),
  CRAYS_CORE_NATIVE_PERSONAL_DATABASE_URL:personal.href,CRAYS_CORE_NATIVE_PERSONAL_DATABASE_CONTRACT:JSON.stringify(contract)};
 for(const [k,v] of Object.entries(runtime))process.env[k]=v;
 const intake=JSON.parse(await readFile('/home/craysdev/codex-chat-projects/openclaw/apps/ios/.secrets/owner-first-account-intake.json','utf8'));
 const binding=Object.freeze({providerKey:'auth0',providerSubject:intake.existingAuth0ProviderObservation.subject,issuer:runtime.CRAYS_NATIVE_AUTH_ISSUER,clientId:runtime.CRAYS_NATIVE_AUTH_CLIENT_IDS});
 const {lookupNativeIdentityThroughOriginalCore}=await import('../../src/lib/native-core-identity-lookup.ts');
 const identityPool=await import('../../src/db/core-identity-runtime-pool.ts');
 let mapped;
 try {mapped=await lookupNativeIdentityThroughOriginalCore('auth0',binding.providerSubject,binding);}
 finally {await identityPool.closeCoreNativeIdentityRpcPool();}
 if(mapped?.account?.account_id!==expectedAccount)throw Error('ORIGINAL_ACCOUNT_MAPPING_REQUIRED');
 phase='private-server-configuration';
 await mkdir(directory,{recursive:true,mode:0o700});
 const ds=await lstat(directory);if(!ds.isDirectory()||ds.isSymbolicLink()||ds.uid!==process.getuid()||(ds.mode&0o077))throw Error('PRIVATE_CONFIG_DIRECTORY_REQUIRED');
 await mkdir(privateDirectory,{recursive:true,mode:0o700});
 const ps=await lstat(privateDirectory);if(!ps.isDirectory()||ps.isSymbolicLink()||ps.uid!==process.getuid()||(ps.mode&0o077))throw Error('PRIVATE_CONFIG_DIRECTORY_REQUIRED');
 const output=resolve(privateDirectory,'server-environment.json');
 if(refresh){const old=await lstat(output);if(!old.isFile()||old.isSymbolicLink()||old.uid!==process.getuid()||(old.mode&0o077))throw Error('PRIVATE_CONFIG_REFRESH_DENIED');}
 const staging=refresh?output+'.next-'+process.pid:output;
 const fd=await open(staging,'wx',0o600);try{await fd.writeFile(JSON.stringify(runtime)+'\n');await fd.sync();}finally{await fd.close();}
 if(refresh)await rename(staging,output);
 const proof={schema:'crays.native.actual-original-core-local-tls-admission.v1',observedAtUtc:new Date().toISOString(),
  originalTypeScriptIdentityLookup:true,actualHostedCore:true,actualRestrictedPersonalPool:true,originalAccountMapped:true,
  identityTlsCertificateVerified:true,identityScramChannelBindingRequired:true,personalCatalogueVerified:true,
  catalogueContract:contract,identityReleaseContract:identityContract,tableCount:catalogue.tables.length,
  privateConfigurationPrepared:true,credentialsPrinted:false,auth0NativeJwtIssued:false,nativeDeviceAccepted:false,
  modelCalled:false,chuckLifecycleStarted:false,productiveServicesChanged:false};
 await writeFile(resolve(directory,refresh?'ACTUAL_LOCAL_TLS_CONTACT_RESULT.json':'ACTUAL_LOCAL_TLS_RESULT.json'),JSON.stringify(proof,null,2)+'\n',{flag:'wx',mode:0o600});
 console.log(JSON.stringify(proof));
}catch(error){console.error(JSON.stringify({status:'ACTUAL_CORE_CONNECTION_ADMISSION_FAILED',phase,code:/^[A-Z0-9_]+$/.test(error?.message??'')?error.message:'ORIGINAL_CONNECTION_OR_VERIFICATION_FAILED'}));process.exitCode=1;}
finally{await metadataPool?.end();}
