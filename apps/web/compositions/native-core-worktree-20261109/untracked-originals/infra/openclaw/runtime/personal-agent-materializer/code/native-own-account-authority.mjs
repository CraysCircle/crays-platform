import assert from'node:assert/strict';import fs from'node:fs/promises';import path from'node:path';import{sha}from'./verify-shared-artifacts.mjs';
// Original admitted distribution, staged at the existing native RUN/node_modules alias; no SDK patch.
import{i as loadOwnStoreAtDatabasePath}from'../node_modules/openclaw/dist/persisted-DZD4Xf06.mjs';
import{g as resolveAuthProfileDatabasePath,t as assertAuthProfileStoreAgentOwner}from'../node_modules/openclaw/dist/sqlite-DTknLGLR.mjs';
import{l as isProfileInCooldown}from'../node_modules/openclaw/dist/profile-usage-stats-BLwxBqRR.mjs';
import{a as resolveAuthProfileOrder,i as resolveAuthProfileEligibility}from'../node_modules/openclaw/dist/order-BQASoz-d.mjs';
import{r as hasUsableOAuthCredential}from'../node_modules/openclaw/dist/credential-state-WXO5HScp.mjs';
import{t as assertNoOAuthSecretRefPolicyViolations}from'../node_modules/openclaw/dist/policy-BLyaiMEH.mjs';
import{o as loadPluginMetadataSnapshot}from'../node_modules/openclaw/dist/plugin-metadata-snapshot-CkKRQVnj.mjs';
const ROOT='/var/lib/crays-personal-agents',pending=()=>Object.assign(Error('PENDING_OWN_ACCOUNT'),{code:'PENDING_OWN_ACCOUNT'});
async function privateMetadata(p,file=false){const s=await fs.lstat(p);assert(!s.isSymbolicLink()&&s.uid===process.getuid()&&(s.mode&0o077)===0&&(file?s.isFile()&&s.nlink===1:s.isDirectory()),'EXCLUSIVE_OWN_NATIVE_PATH_REQUIRED');assert.equal(await fs.realpath(p),p);return s;}
/** Construct only in the trusted authenticated host path. verifiedProviderAccount comes from actual Auth0
 * mapping; resolveCommittedAssignment rechecks Core on every call. No model-supplied path/profile/boolean.
 * Read-only ORIGINAL persisted local DB reader; never main-store merge, CLI discovery, OAuth refresh or network.
 */
export function createNativeOwnAccountAuthority({verifiedProviderAccount,resolveCommittedAssignment,standardFactory}){
 const load=async(scope,config)=>{
  assert(process.getuid()!==0,'NON_ROOT_PERSON_HOST_REQUIRED');const identity=await resolveCommittedAssignment(verifiedProviderAccount,standardFactory.getPersonalAgentStandardPackage());await identity.assertCurrent();
  const namespace=sha('crays.personal-agent.person-namespace.v1\n'+identity.canonicalPersonId),stateDir=ROOT+'/'+namespace+'/'+identity.agentId,agentDir=stateDir+'/agents/'+identity.agentId+'/agent';
  assert(scope.accountId===identity.accountId&&scope.canonicalPersonId===identity.canonicalPersonId&&scope.agentId===identity.agentId&&scope.agentDir===agentDir&&scope.stateDir===stateDir&&scope.modelRef===identity.modelRef&&scope.provider==='openai'&&scope.apiRoute==='openai-chatgpt-responses','OWN_CORE_MODEL_SCOPE_REQUIRED');
  const directories=[];try{for(let p=agentDir;;p=path.dirname(p)){directories.push([p,await privateMetadata(p)]);if(p===ROOT)break;assert(p.startsWith(ROOT+'/'));}}catch(e){if(e.code==='ENOENT')throw pending();throw e;}
  const file=resolveAuthProfileDatabasePath(agentDir);assert.equal(file,agentDir+'/openclaw-agent.sqlite');let before;try{before=await privateMetadata(file,true);}catch(e){if(e.code==='ENOENT')throw pending();throw e;}
  for(const suffix of['-wal','-shm']){try{await privateMetadata(file+suffix,true);}catch(e){if(e.code!=='ENOENT')throw e;}}
  assertAuthProfileStoreAgentOwner(agentDir,identity.agentId);
  // The original generic "WithoutExternalProfiles" loader can merge inherited main state. Do not use it.
  let store;try{store=loadOwnStoreAtDatabasePath(file,'agent');}catch{throw pending();}if(!store)throw pending();
  const cfg=config??{agents:{entries:{[identity.agentId]:{workspace:stateDir+'/workspace',agentDir,model:{primary:identity.modelRef,fallbacks:[]}}}}};
  if(config){assert.equal(Object.keys(cfg.agents?.entries??{}).length,1);const a=cfg.agents.entries[identity.agentId];assert(a&&a.agentDir===agentDir&&a.workspace===stateDir+'/workspace'&&a.model.primary===identity.modelRef&&a.model.fallbacks.length===0,'OWN_NATIVE_MODEL_SELECTION_REQUIRED');}
  // Only server-derived person paths enter native metadata discovery. No ambient env, current
  // process snapshot, inherited state, external CLI bootstrap or OAuth reference hydration.
  const env=Object.freeze({PATH:'/usr/bin:/bin',HOME:stateDir,OPENCLAW_STATE_DIR:stateDir,OPENCLAW_AGENT_DIR:agentDir});
  const workspaceDir=stateDir+'/workspace';
  const metadataSnapshot=loadPluginMetadataSnapshot({config:cfg,env,stateDir,workspaceDir,allowCurrent:false,preferPersisted:false});
  const authAliasLookupParams=Object.freeze({env,workspaceDir,metadataSnapshot});
  try{assertNoOAuthSecretRefPolicyViolations({cfg,store,context:'own-local-oauth'});}catch{throw pending();}
  const profileIds=resolveAuthProfileOrder({cfg,store,provider:'openai',forModel:identity.modelRef.slice('openai/'.length),authAliasLookupParams,includePendingOAuthRefresh:false});if(profileIds.length!==1)throw pending();const profileRef=profileIds[0],credential=store.profiles[profileRef];
  if(isProfileInCooldown(store,profileRef,Date.now(),identity.modelRef.slice('openai/'.length)))throw pending();if(!hasUsableOAuthCredential(credential,{now:Date.now()}))throw pending();
  if(resolveAuthProfileEligibility({cfg,store,provider:'openai',profileId:profileRef,now:Date.now(),authAliasLookupParams,includePendingOAuthRefresh:false}).eligible!==true)throw pending();
  const after=await privateMetadata(file,true);assert(before.dev===after.dev&&before.ino===after.ino,'OWN_AUTH_STORE_REBOUND');for(const[p,s]of directories){const a=await privateMetadata(p);assert(s.dev===a.dev&&s.ino===a.ino,'OWN_NATIVE_DIRECTORY_REBOUND');}await identity.assertCurrent();
  // No credentials, email, provider account identifier or token-derived value crosses this boundary.
  const metadata={accountId:identity.accountId,canonicalPersonId:identity.canonicalPersonId,agentId:identity.agentId,agentDir,provider:'openai',apiRoute:'openai-chatgpt-responses',profileRef,expiresAtMs:credential.expires};
  return{...metadata,receiptSha256:sha(JSON.stringify({schema:'crays.own-local-native-auth-observation.v1',...metadata,databaseDev:after.dev,databaseIno:after.ino}))};
 };
 return Object.freeze({assertReady:scope=>load(scope),assertConfigSelectsOwnProfile:async(scope,config,profileRef)=>{assert.deepEqual(config.auth?.order,{openai:[profileRef]});assert.deepEqual(config.auth?.profiles,{[profileRef]:{provider:'openai',mode:'oauth'}});const a=await load(scope,config);assert.equal(a.profileRef,profileRef);return{agentDir:a.agentDir,modelRef:scope.modelRef,profileIds:[a.profileRef],source:'OWN_AGENT_STORE_ONLY'};}});
}
