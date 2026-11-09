import{createHash}from'node:crypto';
export const hash=x=>createHash('sha256').update(x).digest('hex');
export const fingerprint=p=>hash(JSON.stringify([p.accountId,p.canonicalPersonId,p.personVersion,p.accountStatus,p.personLifecycle,p.authSubjectSha256,p.sessionBinding]));
export const denied=()=>{throw Error('OAUTH_PERSISTENCE_DENIED');};
export const uid=x=>{if(typeof x!=='string'||!/^[A-Za-z0-9_-]{1,100}$/.test(x))denied();return x;};
/** Per-request host adapter; person MUST be issued by THIS original Core resolver instance. */
export async function createPersonPgContext({getClient,resolvePerson,person,now=Date.now}){
 if(typeof getClient!=='function'||typeof resolvePerson?.assertResolvedPerson!=='function')denied();await resolvePerson.assertResolvedPerson(person);
 const owner=b=>{if(!b||b.accountId!==person.accountId||b.canonicalPersonId!==person.canonicalPersonId)denied();};
 const binding=b=>{owner(b);if(b.sessionBinding!==person.sessionBinding||b.coreFingerprint!==fingerprint(person))denied();};
 const tx=async(write,operation)=>{
  await resolvePerson.assertResolvedPerson(person);const c=await getClient();let commitStarted=false,destroyClient=false;
  try{
   await c.query(write?'begin':'begin isolation level repeatable read read only');
   const role=await c.query("select rolsuper,rolbypassrls,row_security_active('crays_core.auth_identities'::regclass) identity_rls,row_security_active('crays_core.crays_accounts'::regclass) account_rls from pg_roles where rolname=current_user");if(role.rows.length!==1||role.rows[0].rolsuper||role.rows[0].rolbypassrls||!role.rows[0].identity_rls||!role.rows[0].account_rls)denied();
   await c.query("set local lock_timeout='1500ms'; set local statement_timeout='5000ms'");
   await c.query("select set_config('crays.native_personal_account',$1,true)",[person.accountId]);
   // Actual Core person row serializes only this person's durable mutations. No other person's lock.
   const r=await c.query(`select a.account_id,a.status as account_status,p.canonical_person_id,p.person_version,p.lifecycle_state,i.provider_subject from crays_core.crays_accounts a join crays_core.canonical_people p on p.account_id=a.account_id join crays_core.auth_identities i on i.account_id=a.account_id and i.provider_key='auth0' and i.verified=true where a.account_id=$1 and p.canonical_person_id=$2 and a.status in ('active','review') and p.lifecycle_state in ('active','review')`+(write?' for update of p for share of a,i':''),[person.accountId,person.canonicalPersonId]);
   const matches=r.rows.filter(x=>hash(x.provider_subject)===person.authSubjectSha256);if(matches.length!==1)denied();const row=matches[0];
   if(String(row.person_version)!==person.personVersion||row.account_status!==person.accountStatus||row.lifecycle_state!==person.personLifecycle)denied();
   const result=await operation(c);await person.assertCurrent();commitStarted=true;await c.query('commit');return result;
  }catch(e){if(!commitStarted)await c.query('rollback').catch(()=>{destroyClient=true;});if(commitStarted)destroyClient=true;if(commitStarted)throw Error('PERSISTENCE_COMMIT_UNKNOWN');throw Error(['OAUTH_PERSISTENCE_DENIED','CORE_PERSON_CHANGED','FOREIGN_AUTHORITY','ATTEMPT_CAPACITY','REFRESH_PENDING_RECONCILIATION'].includes(e?.message)?e.message:'OAUTH_PERSISTENCE_NOT_CONFIRMED');}finally{c.release(destroyClient);}
 };
 const receipt=(c,operation,id,version=1)=>c.query(`insert into crays_core.personal_oauth_receipts(account_id,canonical_person_id,operation,resource_id,resource_version,at_ms)values($1,$2,$3,$4,$5,$6)`,[person.accountId,person.canonicalPersonId,operation,id,version,now()]);
 return Object.freeze({person,owner,binding,tx,receipt,now});
}
