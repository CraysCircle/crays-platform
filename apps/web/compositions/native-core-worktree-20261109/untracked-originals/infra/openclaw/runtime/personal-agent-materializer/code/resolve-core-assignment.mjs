import assert from'node:assert/strict';import{createHash}from'node:crypto';
const hash=x=>createHash('sha256').update(x).digest('hex');
const code=c=>Object.assign(new Error(c),{code:c});
/** Server host connector: getClient is existing Core pool.connect. The caller is the existing authenticated
 * provider-account route; never accept providerSubject/accountId from a model/tool body. No role writes.
 * Every recheck uses a fresh committed transaction and exact account/person/current delivery relation.
 */
export function createCoreAssignmentResolver({getClient,standardFactory}){
 return async function resolve(account,standard){
  const query=async()=>{const client=await getClient();try{await client.query('begin');
   const a=await client.query(`select a.account_id from crays_core.crays_accounts a join crays_core.auth_identities i on i.account_id=a.account_id where a.account_id=$1 and i.provider_key=$2 and i.provider_subject=$3 and a.status in ('active','review') for share of a,i`,[account.accountId,account.providerKey,account.providerSubject]);
   if(a.rows.length!==1)throw code('ACCOUNT_SCOPE_DENIED');
   const p=await client.query(`select canonical_person_id from crays_core.canonical_people where account_id=$1 and lifecycle_state in ('active','review') for share`,[account.accountId]);if(!p.rows.length)throw code('PENDING_CANONICAL_PERSON');if(p.rows.length!==1)throw code('ACCOUNT_SCOPE_DENIED');
   const person=p.rows[0].canonical_person_id,agent='personal-'+hash('crays.personal-agent.assignment.v1\n'+person).slice(0,48);
   const q=await client.query(`select d.account_id,d.canonical_person_id,d.agent_id,d.package_version,d.package_sha256,d.assignment_proposal from crays_core.personal_agent_baseline_deliveries d join crays_core.personal_agent_standard_assignments b on b.canonical_person_id=d.canonical_person_id and b.account_id=d.account_id and b.agent_id=d.agent_id where d.canonical_person_id=$1 order by d.created_at desc,d.package_version desc limit 1 for share of d,b`,[person]);
   const d=q.rows[0];if(!d)throw code('PENDING_BASELINE_INTENT');assert.equal(d.account_id,account.accountId);assert.equal(d.agent_id,agent);assert.equal(d.package_version,standard.descriptor.version,'CURRENT_BASELINE_VERSION_REQUIRED');assert.equal(d.package_sha256,standard.sha256);
   const o=d.assignment_proposal;assert(o&&o.proposal?.canonicalPersonId===person&&o.proposal?.agentId===agent);const modelRef=o.proposal.modelAccountReadiness.modelRef;assert(/^openai\/[A-Za-z0-9_.-]+$/.test(modelRef));assert.equal(standardFactory.getPersonalAgentStandardPackage().sha256,standard.sha256);const expected=standardFactory.createNewPersonalAgentStandardConfigWith124({canonicalPersonId:person,agentId:agent,expectedPackageVersion:standard.descriptor.version,expectedPackageSha256:standard.sha256,modelAccount:{canonicalPersonId:person,agentId:agent,provider:'openai',apiRoute:'openai-chatgpt-responses',modelRef,state:'PENDING_OWN_LOGIN',readinessReceiptSha256:null},artifactBindings:standard.descriptor.plugins.map(p=>({pluginId:p.id,codeSetSha256:p.codeSetSha256,manifestSha256:null,state:'SOURCE_ASSIGNED',admissionReceiptSha256:null}))});assert.deepEqual(o,expected,'EXACT_COMMITTED_BASELINE_INTENT_REQUIRED');
   await client.query('commit');return{accountId:account.accountId,canonicalPersonId:person,agentId:agent,packageVersion:d.package_version,packageSha256:d.package_sha256,deliveryJsonSha256:hash(JSON.stringify(o)),modelRef};
  }catch(e){await client.query('rollback').catch(()=>{});throw e;}finally{client.release();}};
  assert(account.providerKey==='auth0'&&typeof account.providerSubject==='string'&&account.providerSubject.length>0);const first=await query();return{...first,assertCurrent:async()=>assert.deepEqual(await query(),first,'COMMITTED_ASSIGNMENT_CHANGED')};
 };
}
