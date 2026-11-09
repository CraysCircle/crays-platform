/** Prepared ORIGINAL local SQLite auth-store test only. Run solely in a reviewed private namespace
 * with an EMPTY private bind at /var/lib/crays-personal-agents. Never against real user or owner auth.
 * Fresh synthetic credentials never contact a provider and establish no actual account entitlement.
 */
import assert from'node:assert/strict';import fs from'node:fs/promises';import{DatabaseSync}from'node:sqlite';import{sha}from'./verify-shared-artifacts.mjs';import{createNativeOwnAccountAuthority}from'./native-own-account-authority.mjs';
import{n as ensureAgentSchema}from'../node_modules/openclaw/dist/openclaw-agent-db-schema-5nC1v0HP.mjs';
import{x as writePersistedAuthProfileStoreRaw}from'../node_modules/openclaw/dist/sqlite-DTknLGLR.mjs';
import{t as assertNoOAuthSecretRefPolicyViolations}from'../node_modules/openclaw/dist/policy-BLyaiMEH.mjs';
export async function runNativeOwnAccountCases(){
 const root='/var/lib/crays-personal-agents';assert.equal(process.env.CRAYS_SYNTHETIC_PERSON_AUTH_QUALIFICATION,'1');assert.deepEqual(await fs.readdir(root),[],'ONLY_EMPTY_PRIVATE_NATIVE_FIXTURE_ROOT');assert.notEqual(process.getuid(),0);
 const person='synthetic-materializer-person',agentId='personal-'+sha('crays.personal-agent.assignment.v1\n'+person).slice(0,48),stateDir=root+'/'+sha('crays.personal-agent.person-namespace.v1\n'+person)+'/'+agentId,agentDir=stateDir+'/agents/'+agentId+'/agent',modelRef='openai/gpt-6-astra';await fs.mkdir(agentDir,{recursive:true,mode:0o700});
 const scope={accountId:'synthetic-core-account',canonicalPersonId:person,agentId,stateDir,agentDir,provider:'openai',apiRoute:'openai-chatgpt-responses',modelRef};let active=true;const identity={...scope,packageVersion:'synthetic-qualified-host-binding',packageSha256:'0'.repeat(64),assertCurrent:async()=>assert(active,'SYNTHETIC_CORE_REVOKED')};
 const auth=createNativeOwnAccountAuthority({verifiedProviderAccount:{accountId:scope.accountId,providerKey:'auth0',providerSubject:'synthetic-committed-subject'},resolveCommittedAssignment:async()=>identity,standardFactory:{getPersonalAgentStandardPackage:()=>({sha256:identity.packageSha256})}}),cases=[];const mark=x=>cases.push(x);
 await assert.rejects(()=>auth.assertReady(scope),e=>e.code==='PENDING_OWN_ACCOUNT');mark('missing-own-local-store-pending-no-main-fallback');
 const file=agentDir+'/openclaw-agent.sqlite';await fs.writeFile(file,'',{flag:'wx',mode:0o600});const db=new DatabaseSync(file);try{ensureAgentSchema(db,agentId,file);const profileRef='openai:synthetic-own',expires=Date.now()+3600000;
 const profile={type:'oauth',provider:'openai',access:'SYNTHETIC_NOT_A_REAL_ACCESS_TOKEN',refresh:'SYNTHETIC_NOT_A_REAL_REFRESH_TOKEN',expires};
 const write=profiles=>writePersistedAuthProfileStoreRaw({version:1,profiles},agentDir,{db,agentId,path:file});write({[profileRef]:profile});
 const r=await auth.assertReady(scope);assert.equal(r.profileRef,profileRef);assert.equal(r.expiresAtMs,expires);assert(!JSON.stringify(r).includes('SYNTHETIC_NOT_A_REAL'));assert.equal(r.accountId,scope.accountId);mark('original-native-schema-writer-local-reader-returns-redacted-identity-expiry');
 const config={agents:{entries:{[agentId]:{workspace:stateDir+'/workspace',agentDir,model:{primary:modelRef,fallbacks:[]}}}},auth:{profiles:{[profileRef]:{provider:'openai',mode:'oauth'}},order:{openai:[profileRef]}}};assert.deepEqual((await auth.assertConfigSelectsOwnProfile(scope,config,profileRef)).profileIds,[profileRef]);mark('original-profile-resolution-selects-one-exact-local-profile-and-model');
 const bad=structuredClone(config);bad.agents.entries[agentId].model.primary='openai/foreign-model';await assert.rejects(()=>auth.assertConfigSelectsOwnProfile(scope,bad,profileRef));mark('foreign-model-and-agent-path-cannot-use-own-observation');
 write({[profileRef]:{...profile,expires:Date.now()-1000}});await assert.rejects(()=>auth.assertReady(scope),e=>e.code==='PENDING_OWN_ACCOUNT');mark('expired-own-credential-pending-no-refresh-or-provider-call');
 write({[profileRef]:{...profile,access:undefined}});await assert.rejects(()=>auth.assertReady(scope),e=>e.code==='PENDING_OWN_ACCOUNT');mark('refresh-only-inline-oauth-not-ready-without-native-usable-access');
 write({[profileRef]:{...profile,expires:Date.now()+60000}});await assert.rejects(()=>auth.assertReady(scope),e=>e.code==='PENDING_OWN_ACCOUNT');mark('original-five-minute-refresh-margin-keeps-near-expiry-pending');
 write({[profileRef]:{type:'oauth',provider:'openai',oauthRef:{source:'openclaw-credentials',provider:'openai-codex',id:'a'.repeat(32)},expires}});await assert.rejects(()=>auth.assertReady(scope),e=>e.code==='PENDING_OWN_ACCOUNT');mark('legacy-oauth-reference-pending-no-secret-or-cli-resolution');
 assert.throws(()=>assertNoOAuthSecretRefPolicyViolations({store:{profiles:{[profileRef]:{type:'oauth',provider:'openai',access:{source:'env',provider:'default',id:'SYNTHETIC_ONLY'}}}}}),/OAuth \+ SecretRef is not supported/);mark('original-native-policy-rejects-oauth-secret-reference');
 write({[profileRef]:profile});const foreignWorkspace=structuredClone(config);foreignWorkspace.agents.entries[agentId].workspace=stateDir+'/foreign-workspace';await assert.rejects(()=>auth.assertConfigSelectsOwnProfile(scope,foreignWorkspace,profileRef));mark('foreign-workspace-context-denied-before-alias-discovery');
 await assert.rejects(()=>auth.assertReady({...scope,canonicalPersonId:'synthetic-foreign-person'}));mark('foreign-person-context-denied-before-own-store-or-alias-discovery');
 write({[profileRef]:profile});active=false;await assert.rejects(()=>auth.assertReady(scope));mark('live-committed-owner-revocation-denied');
 }finally{db.close();}
 assert.equal(cases.length,12);return{status:'PASS',cases,syntheticNativeLocalStoreOnly:true,providerOrNetworkCalled:false,actualHumanLoginOrBillingEntitlementProven:false,modelRequestExecuted:false};
}
