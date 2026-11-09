'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('typescript');
const input=JSON.parse(fs.readFileSync(0,'utf8'));
function compiled(source,state){
 const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
 assert(!(output.diagnostics??[]).some(d=>d.category===ts.DiagnosticCategory.Error));
 const calls={legacy:0,rpc:[],pool:0};
 const bundle={account:{account_id:'unit-existing-account',display_name:'Unit Test',status:'active'},accessIdentities:[],roleAssignments:[],memberships:[],nip05Handles:[],nostrIdentity:null};
 const providerUser={sub:'unit-subject',name:'Unit Test',email:'unit@example.invalid'};
 const sdk={validatedIssuer:'https://login.crays.pro/',validatedSubject:state.invalidSubject?'different-subject':'unit-subject',serverConfiguredClientId:'unit-server-client'};
 const req=(id)=>{
  if(id==='node:crypto')return require(id);
  if(id==='next/server')return {};
  if(id==='@/db/core-identity-runtime-rpc')return {
   resolveAuth0IdentityBundleV2:async()=>{throw Error('LEGACY_RPC_NOT_ADMITTED');},
   createCoreOriginalMemberIdentityRuntimeRpcClient:q=>({resolveAuth0IdentityBundleV2:async(...args)=>{
    calls.rpc.push(args);await q('unit-original-member-query',args);
    if(state.rpcFails)throw Error('UNIT_RPC_FAILURE');
    return state.unmapped?null:bundle;
   }})
  };
  if(id==='@/db/core-identity-runtime-pool')return {getCoreOriginalMemberIdentityRpcPool:()=>{calls.pool++;return {query:async(sql,values)=>{assert.equal(sql,'unit-original-member-query');assert.deepEqual(Array.from(values),[sdk.validatedIssuer,sdk.validatedSubject,sdk.serverConfiguredClientId]);return {rows:[],rowCount:0};}};}};
  if(id==='@/lib/clubs/original-google-provisioning-duplicate-guard')return {isRegisteredOriginalGoogleRepairRequired:()=>Boolean(state.googleRepair),originalGoogleRepairPendingResponse:{status:'existing_original_identity_binding_required',providerAuthenticated:true,accountMapped:false,provisioningAvailable:false}};
  if(id==='@/db/core-identity-repository')return {getIdentityBundleByProviderSubject:async()=>{calls.legacy++;if(state.legacyUnavailable)throw Error('UNIT_LEGACY_DATABASE_URL_ABSENT');return bundle;}};
  if(id==='@/lib/auth0')return {auth0:{getSession:async()=>{if(state.sessionThrows)throw Error('UNIT_SDK_READ');return state.signedOut?null:{user:providerUser};}},getAuth0RuntimeConfigStateForRequest:()=>({application:state.application??'clubs'}),getExactOidcServerSessionInput:async()=>sdk};
  if(id==='@/lib/auth-session-mapping')return {createCraysSessionFromIdentityBundle:b=>({status:'crays_mapped',account:{id:b.account.account_id}})};
  if(id==='@/lib/auth-boundary')return {createAnonymousSession:()=>({status:'anonymous'}),createProviderAuthenticatedSession:()=>({status:'provider_authenticated'}),getAuthEnvironmentState:()=>({})};
  if(id==='@/lib/exact-oidc-identity')return {exactOidcIdentity:(issuer,subject)=>{assert.equal(issuer,sdk.validatedIssuer);return {providerKey:'auth0',subject};}};
  if(['@/lib/clubs/member-request-security','@/lib/dal/server-trust','@/lib/provider-account-provisioning','@/lib/roles'].includes(id))return {};
  throw Error('UNEXPECTED_IMPORT:'+id);
 };
 const module={exports:{}};
 vm.runInNewContext(output.outputText,{module,exports:module.exports,require:req,Response,Headers,console},{timeout:3000});
 return {GET:module.exports.GET,calls};
}
(async()=>{
 const baseline=compiled(input.original,{legacyUnavailable:true});
 const old=await baseline.GET({});assert.equal(old.status,503);assert.equal((await old.json()).status,'core_unavailable');assert.equal(baseline.calls.legacy,1);
 const cases=[
  [{legacyUnavailable:true},200,'mapped',1,0],
  [{signedOut:true,legacyUnavailable:true},200,'no_provider_session',0,0],
  [{invalidSubject:true,legacyUnavailable:true},401,'invalid_session_provenance',0,0],
  [{rpcFails:true,legacyUnavailable:true},503,'core_unavailable',1,0],
  [{unmapped:true,legacyUnavailable:true},200,'provider_authenticated_unmapped',1,0],
  [{googleRepair:true,unmapped:true,legacyUnavailable:true},409,'existing_original_identity_binding_required',1,0],
  [{application:'gym'},200,'mapped',0,1],
  [{sessionThrows:true},503,'provider_session_unreadable',0,0]
 ];
 for(const [state,http,status,rpc,legacy]of cases){
  const c=compiled(input.candidate,state),r=await c.GET({}),body=await r.json();
  assert.equal(r.status,http);assert.equal(body.status,status);assert.equal(c.calls.rpc.length,rpc);assert.equal(c.calls.legacy,legacy);
  if(status==='mapped')assert.equal(body.session.account.id,'unit-existing-account');
  assert(!('password'in body)&&!('token'in body));
 }
 const post='export async function POST(';
 assert.equal(input.original.slice(input.original.indexOf(post)),input.candidate.slice(input.candidate.indexOf(post)));
 console.log(JSON.stringify({status:'PASS',originalUnconfiguredLegacyRegressionReproduced:true,candidateCases:cases.length,postBodyByteIdentical:true,syntheticUnitFixtures:true,actualAuthOrDatabaseCalls:false,browserAcceptance:false}));
})().catch(e=>{console.log(JSON.stringify({status:'FAIL',errorClass:e.name,message:e.message}));process.exitCode=1;});
