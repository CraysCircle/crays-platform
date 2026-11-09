import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {generateKeyPair,exportJWK,SignJWT} from 'jose';
process.env.CRAYS_NATIVE_QUALIFY_REAL_CORE_LOOKUP='1';
// No original service credentials or network are used. A legacy broad URL
// deliberately exists so the test can prove the native default never adopts it.
delete process.env.CRAYS_CORE_ORIGINAL_MEMBER_RPC_DATABASE_URL;
delete process.env.CRAYS_CORE_ORIGINAL_MEMBER_RPC_CONTRACT;
process.env.CRAYS_DATABASE_URL='postgresql://synthetic:NOT_A_CREDENTIAL@localhost:1/legacy_not_admitted';
await import('./source-loader.mjs');
let broadLookupCalls=0;
globalThis[Symbol.for('crays.native.fixture.lookup')]=()=>{broadLookupCalls++;throw Error('LEGACY_SUBJECT_LOOKUP_MUST_NOT_RUN');};
const {lookupNativeIdentityThroughOriginalCore}=await import('../../src/lib/native-core-identity-lookup.ts');
const {createCoreOriginalMemberIdentityRuntimeRpcClient}=await import('../../src/db/core-identity-runtime-rpc.ts');
const issuer='https://native-exact-qualification.auth0.com/',subject='auth0|exact-qualification',clientId='native_exact_fixture';
const binding=()=>Object.freeze({providerKey:'auth0',providerSubject:subject,issuer,clientId});
test('real native default denies missing original Core contract despite a broad legacy database URL',async()=>{
 await assert.rejects(lookupNativeIdentityThroughOriginalCore('auth0',subject,binding()),/CORE_ORIGINAL_MEMBER_CONFIGURATION_UNAVAILABLE/);
 assert.equal(broadLookupCalls,0);
});
test('real native adapter refuses mutable, foreign-provider and mismatched subject tuples before Core IO',async()=>{
 for(const b of [{...binding()},Object.freeze({...binding(),providerSubject:'foreign'}),Object.freeze({...binding(),providerKey:'foreign'})]){
  await assert.rejects(lookupNativeIdentityThroughOriginalCore('auth0',subject,b),/NATIVE_EXACT_PROVIDER_BINDING_REQUIRED/);
 }
 assert.equal(broadLookupCalls,0);
});
test('original V2 RPC client uses one fixed call and hashes the verified native client ID',async()=>{
 const seen=[];
 const rpc=createCoreOriginalMemberIdentityRuntimeRpcClient(async(sql,args)=>{seen.push({sql,args});return {rowCount:1,rows:[{payload:null}]};});
 assert.equal(await rpc.resolveAuth0IdentityBundleV2(issuer,subject,clientId),null);
 assert.deepEqual(seen,[{sql:'select crays_core_rpc.resolve_auth0_identity_bundle_v2($1::text,$2::text,$3::text) as payload',args:[issuer,subject,createHash('sha256').update(clientId).digest('hex')]}]);
});
test('original V2 RPC refuses old unbound payload instead of falling back to a V1 lookup',async()=>{
 let n=0;
 const rpc=createCoreOriginalMemberIdentityRuntimeRpcClient(async()=>{n++;return {rowCount:1,rows:[{payload:{schema_version:'crays.core.identity-bundle.v1'}}]};});
 await assert.rejects(rpc.resolveAuth0IdentityBundleV2(issuer,subject,clientId),/INVALID_RPC_PAYLOAD/);assert.equal(n,1);
});
test('signed native request through actual default reports unavailable when original Core deployment is absent',async()=>{
 const {createNativeCoreRequestResolver,nativeBootstrapHash}=await import('../../src/lib/native-core-auth.ts');
 const {privateKey,publicKey}=await generateKeyPair('RS256');const jwk={...await exportJWK(publicKey),kid:'exact-binding-key',alg:'RS256'};
 const resolver=createNativeCoreRequestResolver({environment:{CRAYS_NATIVE_AUTH_ENABLED:'true',CRAYS_NATIVE_AUTH_ISSUER:issuer,CRAYS_NATIVE_AUTH_AUDIENCE:'https://core.example/native',CRAYS_NATIVE_AUTH_CLIENT_IDS:clientId,CRAYS_NATIVE_AUTH_IDENTITY_SCOPE:'fixture:identity:read',CRAYS_NATIVE_AUTH_BOOTSTRAP_SCOPE:'fixture:bootstrap:read'},fetch:async url=>{assert.equal(String(url),issuer+'.well-known/jwks.json');return Response.json({keys:[jwk]});}});
 const now=Math.floor(Date.now()/1000);const jwt=await new SignJWT({sub:subject,azp:clientId,scope:'fixture:identity:read fixture:bootstrap:read'}).setProtectedHeader({alg:'RS256',typ:'JWT',kid:jwk.kid}).setIssuer(issuer).setAudience('https://core.example/native').setIssuedAt(now).setExpirationTime(now+300).sign(privateKey);
 const request=new Request('https://core.example/api/graphql',{method:'POST',headers:{authorization:'Bearer '+jwt,'content-type':'application/json'},body:JSON.stringify({operationName:'PlatformBootstrap',extensions:{persistedQuery:{version:1,sha256Hash:nativeBootstrapHash}}})});
 await resolver.admit(request);await assert.rejects(resolver.resolve(request),e=>e.code==='NATIVE_CORE_LOOKUP_UNAVAILABLE'&&e.status===503);assert.equal(broadLookupCalls,0);
});
test('unsupported Core wire roles are denied before legacy native mapper can substitute its default role',async()=>{
 const {parseAuth0IdentityBundleRpcV1}=await import('../../src/db/core-identity-runtime-rpc.ts');
 const value={schema_version:'crays.core.identity-bundle.v1',account:{account_id:'synthetic-existing-account',display_name:'Synthetic fixture',primary_contact:null,primary_contact_type:'contact',status:'active',crays_id:'synthetic-crays-id',default_role:'guest'},access_identities:[],nostr_identity:null,memberships:[],role_assignments:[]};
 assert.equal(parseAuth0IdentityBundleRpcV1(value).account.default_role,'guest');
 for(const unsupported of ['clubs-member','club-manager','holiday-manager','unknown-wire-role']){
  const changed=structuredClone(value);changed.account.default_role=unsupported;
  assert.throws(()=>parseAuth0IdentityBundleRpcV1(changed),/INVALID_RPC_PAYLOAD/);
 }
});
function exactFixture(){
 const hash=s=>createHash('sha256').update(s).digest('hex');
 return {schema_version:'crays.core.auth0-login-context.v2',source_auth_identity_id:'fixture-auth-id',exact_binding:{issuer_binding_id:'fixture-binding',identity_id:'fixture-auth-id',account_id:'fixture-account',account_security_version:'1',binding_version:'1',provider_key:'auth0',issuer,client_id_sha256:hash(clientId),provider_subject_sha256:hash(subject),approval_record_sha256:'ab'.repeat(32),approval_purpose:'approve-exact-identity-binding',policy_version:'synthetic-fixture-only',status:'active',valid_from:new Date(Date.now()-60000).toISOString(),valid_until:new Date(Date.now()+600000).toISOString(),revoked_at:null},bundle:{schema_version:'crays.core.identity-bundle.v1',account:{account_id:'fixture-account',display_name:'Synthetic fixture',primary_contact:null,primary_contact_type:'contact',status:'active',crays_id:'fixture-crays-id',default_role:'guest'},access_identities:[{identity_id:'fixture-auth-id',account_id:'fixture-account',method_type:'social',provider_key:'auth0',verified:true,last_used_at:null}],nostr_identity:null,memberships:[],role_assignments:[]}};
}
test('original V2 parser accepts a complete controlled exact-binding envelope and assigns subject only to its selected identity',async()=>{
 const rpc=createCoreOriginalMemberIdentityRuntimeRpcClient(async()=>({rowCount:1,rows:[{payload:exactFixture()}]}));
 const result=await rpc.resolveAuth0IdentityBundleV2(issuer,subject,clientId);
 assert.equal(result.account.account_id,'fixture-account');assert.equal(result.account.default_role,'guest');
 assert.equal(result.accessIdentities.length,1);assert.equal(result.accessIdentities[0].identity_id,'fixture-auth-id');
 assert.equal(result.accessIdentities[0].provider_subject,subject);
});
test('original V2 parser denies foreign issuer/client/subject, expired or unapproved bindings and foreign account scope',async()=>{
 const changes=[v=>{v.exact_binding.issuer='https://foreign.example/';},v=>{v.exact_binding.client_id_sha256='cd'.repeat(32);},v=>{v.exact_binding.provider_subject_sha256='cd'.repeat(32);},v=>{v.exact_binding.valid_until=new Date(Date.now()-1000).toISOString();},v=>{v.exact_binding.approval_purpose='other-purpose';},v=>{v.exact_binding.revoked_at=new Date().toISOString();},v=>{v.exact_binding.account_id='foreign';},v=>{v.exact_binding.identity_id='foreign';},v=>{v.exact_binding.binding_version='9223372036854775808';}];
 for(const change of changes){
  const value=exactFixture();change(value);
  const rpc=createCoreOriginalMemberIdentityRuntimeRpcClient(async()=>({rowCount:1,rows:[{payload:value}]}));
  await assert.rejects(rpc.resolveAuth0IdentityBundleV2(issuer,subject,clientId),/INVALID_RPC_PAYLOAD/);
 }
});
test('actual admitted personal-chat route refuses missing exact Core before legacy SQL can connect',async()=>{
 const {privateKey,publicKey}=await generateKeyPair('RS256');const jwk={...await exportJWK(publicKey),kid:'personal-original-key',alg:'RS256'};
 Object.assign(process.env,{CRAYS_NATIVE_AUTH_ENABLED:'true',CRAYS_NATIVE_AUTH_ISSUER:issuer,CRAYS_NATIVE_AUTH_AUDIENCE:'https://core.example/native',CRAYS_NATIVE_AUTH_CLIENT_IDS:clientId,CRAYS_NATIVE_AUTH_IDENTITY_SCOPE:'fixture:identity:read',CRAYS_NATIVE_AUTH_PERSONAL_READ_SCOPE:'fixture:personal:read',CRAYS_NATIVE_AUTH_PERSONAL_WRITE_SCOPE:'fixture:personal:write'});
 const priorFetch=globalThis.fetch;globalThis.fetch=async url=>{assert.equal(String(url),issuer+'.well-known/jwks.json');return Response.json({keys:[jwk]});};
 try{
  const {nativePersonalDocuments}=await import('../../src/graphql/native-personal-messenger-documents.ts');
  const {admitNativePersonalRequest,executeNativePersonalRequest}=await import('../../src/lib/native-personal-messenger.ts');
  const definition=nativePersonalDocuments.NativePersonalConversation;
  const token=await new SignJWT({sub:subject,azp:clientId,scope:'fixture:identity:read fixture:personal:read'}).setProtectedHeader({alg:'RS256',typ:'JWT',kid:jwk.kid}).setIssuer(issuer).setAudience('https://core.example/native').setIssuedAt().setExpirationTime('5m').sign(privateKey);
  const request=new Request('https://core.example/api/graphql',{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify({operationName:'NativePersonalConversation',variables:{},extensions:{persistedQuery:{version:1,sha256Hash:createHash('sha256').update(definition.document).digest('hex')}}})});
  assert.equal(await admitNativePersonalRequest(request),true);
  await assert.rejects(executeNativePersonalRequest(request,definition.field,{}),/CORE_ORIGINAL_MEMBER_CONFIGURATION_UNAVAILABLE/);assert.equal(broadLookupCalls,0);
 }finally{globalThis.fetch=priorFetch;}
});
