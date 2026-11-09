import{createHash}from'node:crypto';
const digest=x=>createHash('sha256').update(x).digest('hex');
/** Host injection uses auth0.getSession(request), getCorePgPool().connect(), and a stable
 * server-authenticated session binding. No review-role/cookie or body identity accepted.
 * This resolves Core person WITHOUT requiring model login, agent readiness or a new role.
 */
export function createCorePersonResolver({getAuth0Session,getClient,getVerifiedSessionBinding}){
 for(const f of[getAuth0Session,getClient,getVerifiedSessionBinding])if(typeof f!=='function')throw Error('HOST_BINDING_REQUIRED');
 const issued=new WeakSet();
 const resolve=async request=>{
  const read=async()=>{
   const s=await getAuth0Session(request),sub=s?.user?.sub;
   if(typeof sub!=='string'||!sub||sub.length>2048)throw Error('AUTHENTICATED_SESSION_REQUIRED');
   const binding=await getVerifiedSessionBinding(request,s);
   if(typeof binding!=='string'||binding.length<16||binding.length>4096)throw Error('SESSION_BINDING_REQUIRED');
   const c=await getClient();try{
    await c.query('begin isolation level repeatable read read only');
    const p=await c.query(`select a.account_id,a.status as account_status,p.canonical_person_id,p.person_version,p.lifecycle_state from crays_core.auth_identities i join crays_core.crays_accounts a on a.account_id=i.account_id join crays_core.canonical_people p on p.account_id=a.account_id where i.provider_key='auth0' and i.provider_subject=$1 and a.status in ('active','review') and p.lifecycle_state in ('active','review')`,[sub]);
    if(p.rows.length!==1)throw Error('CANONICAL_PERSON_REQUIRED');const row=p.rows[0];
    for(const key of['account_id','canonical_person_id'])if(typeof row[key]!=='string'||!row[key].length||row[key].length>4096)throw Error('CORE_IDENTITY_INVALID');
    if(!/^[1-9][0-9]*$/.test(String(row.person_version)))throw Error('CORE_PERSON_VERSION_REQUIRED');
    await c.query('commit');return{accountId:row.account_id,canonicalPersonId:row.canonical_person_id,personVersion:String(row.person_version),accountStatus:row.account_status,personLifecycle:row.lifecycle_state,sessionBinding:digest(binding),authSubjectSha256:digest(sub)};
   }catch(e){await c.query('rollback').catch(()=>{});throw e;}finally{c.release();}
  };
  const first=await read();const result=Object.freeze({...first,assertCurrent:async()=>{if(JSON.stringify(await read())!==JSON.stringify(first))throw Error('CORE_PERSON_CHANGED');}});issued.add(result);return result;
 };
 Object.defineProperty(resolve,'assertResolvedPerson',{value:async person=>{if(!issued.has(person))throw Error('FOREIGN_AUTHORITY');await person.assertCurrent();}});
 return Object.freeze(resolve);
}
