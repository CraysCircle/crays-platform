import{randomBytes}from'node:crypto';import{uid,hash,denied}from'./person-pg-context.mjs';
import{actionScopes}from'./providers.mjs';
/** Host-only refresh journal. Lease expiry NEVER permits replay of a possibly consumed refresh token.
 * Caller must reconcile UNKNOWN or explicitly reconnect; no hidden provider/network retry here.
 */
export function createOAuthRefreshRepository({pg}){
 if(!pg)denied();const owner=()=>[pg.person.accountId,pg.person.canonicalPersonId];
 const norm=(provider,s)=>provider==='microsoft'?s.replace(/^https:\/\/graph\.microsoft\.com\//,'').toLowerCase():s;
 const projection=r=>({refreshId:r.refresh_id,handle:r.handle,baseVersion:Number(r.base_version),state:r.state,observeUntil:Number(r.observe_until_ms),committedVersion:r.committed_version===null?null:Number(r.committed_version)});
 const read=async(c,id)=>{uid(id);const r=(await c.query(`select * from crays_core.personal_oauth_refreshes where refresh_id=$1 and account_id=$2 and canonical_person_id=$3`,[id,...owner()])).rows[0];if(!r)denied();return r;};
 return Object.freeze({
  async begin({handle,version,idempotencyKey}){uid(handle);if(!Number.isSafeInteger(version)||version<1||typeof idempotencyKey!=='string'||!idempotencyKey.length||idempotencyKey.length>256)denied();return pg.tx(true,async c=>{
   const h=hash(idempotencyKey),prior=(await c.query(`select * from crays_core.personal_oauth_refreshes where account_id=$1 and canonical_person_id=$2 and handle=$3 and key_sha256=$4`,[...owner(),handle,h])).rows[0];
   if(prior){if(Number(prior.base_version)!==version)denied();return{...projection(prior),mayCallProvider:false};}
   const row=(await c.query(`select * from crays_core.personal_oauth_connections where handle=$1 and account_id=$2 and canonical_person_id=$3 and state='CONNECTED' and version=$4`,[handle,...owner(),version])).rows[0];if(!row)denied();
   const pending=(await c.query(`select refresh_id from crays_core.personal_oauth_refreshes where handle=$1 and state in ('RUNNING','UNKNOWN')`,[handle])).rows;if(pending.length)throw Error('REFRESH_PENDING_RECONCILIATION');
   const id='rf_'+randomBytes(32).toString('base64url'),r=(await c.query(`insert into crays_core.personal_oauth_refreshes(refresh_id,account_id,canonical_person_id,handle,key_sha256,base_version,state,started_at_ms,observe_until_ms)values($1,$2,$3,$4,$5,$6,'RUNNING',$7,$8) returning *`,[id,...owner(),handle,h,version,pg.now(),pg.now()+60000])).rows[0];await pg.receipt(c,'REFRESH_STARTED',id);
   return{...projection(r),credentialRef:row.credential_ref,provider:row.provider,mayCallProvider:true};
  });},
  async assertCurrent({refreshId,handle,version}){return pg.tx(false,async c=>{const r=await read(c,refreshId);if(r.state!=='RUNNING'||r.handle!==handle||Number(r.base_version)!==version)denied();const x=(await c.query(`select handle from crays_core.personal_oauth_connections where handle=$1 and account_id=$2 and canonical_person_id=$3 and state='CONNECTED' and version=$4`,[handle,...owner(),version])).rows;if(x.length!==1)denied();return projection(r);});},
  async markUnknown({refreshId}){return pg.tx(true,async c=>{let r=await read(c,refreshId);if(r.state==='RUNNING'){r=(await c.query(`update crays_core.personal_oauth_refreshes set state='UNKNOWN' where refresh_id=$1 returning *`,[refreshId])).rows[0];await pg.receipt(c,'REFRESH_UNKNOWN',refreshId);}return projection(r);});},
  async readOutcome({refreshId}){return pg.tx(false,async c=>projection(await read(c,refreshId)));},
  async commit({refreshId,newCredentialRef,expiresAt,grantedScopes}){uid(newCredentialRef);if(!Number.isSafeInteger(expiresAt)||expiresAt<=pg.now()||!Array.isArray(grantedScopes)||grantedScopes.length>128||grantedScopes.some(s=>typeof s!=='string'||s.length>1024))denied();return pg.tx(true,async c=>{
   const r=await read(c,refreshId);if(r.state==='COMMITTED'){if(r.new_credential_ref!==newCredentialRef)denied();return projection(r);}if(!['RUNNING','UNKNOWN'].includes(r.state))denied();
   const row=(await c.query(`select * from crays_core.personal_oauth_connections where handle=$1 and account_id=$2 and canonical_person_id=$3 and state='CONNECTED' and version=$4`,[r.handle,...owner(),r.base_version])).rows[0];if(!row)denied();
   for(const need of actionScopes(row.provider,row.actions))if(!grantedScopes.map(s=>norm(row.provider,s)).includes(norm(row.provider,need)))denied();
   // The person-row lock may have waited beyond the earlier outer validation.
   if(expiresAt<=pg.now())denied();
   const v=(await c.query(`select * from crays_core.personal_oauth_vault where credential_ref=$1 and account_id=$2 and canonical_person_id=$3 and connection_handle=$4 and provider=$5 and state='SEALED' and expires_at_ms=$6`,[newCredentialRef,...owner(),row.handle,row.provider,expiresAt])).rows;if(v.length!==1)denied();
   const next=(await c.query(`update crays_core.personal_oauth_connections set credential_ref=$2,granted_scopes=$3,expires_at_ms=$4,version=version+1 where handle=$1 and version=$5 returning *`,[row.handle,newCredentialRef,JSON.stringify(grantedScopes),expiresAt,row.version])).rows[0];if(!next)denied();
   await c.query(`update crays_core.personal_oauth_vault set state='BOUND' where credential_ref=$1`,[newCredentialRef]);await c.query(`update crays_core.personal_oauth_vault set state='REVOKED',envelope=null,version=version+1,revoked_at_ms=$2 where credential_ref=$1`,[row.credential_ref,pg.now()]);
   await c.query(`insert into crays_core.personal_oauth_connection_versions(handle,version,account_id,canonical_person_id,metadata)values($1,$2,$3,$4,$5)`,[next.handle,next.version,...owner(),{provider:next.provider,clientId:next.client_id,providerSubjectSha256:next.provider_subject_sha256,appFingerprint:next.app_fingerprint,state:next.state,actions:next.actions,grantedScopes:next.granted_scopes,expiresAt:Number(next.expires_at_ms)}]);
   const out=(await c.query(`update crays_core.personal_oauth_refreshes set state='COMMITTED',committed_version=$2,new_credential_ref=$3 where refresh_id=$1 returning *`,[refreshId,next.version,newCredentialRef])).rows[0];await pg.receipt(c,'REFRESH_COMMITTED',refreshId,Number(next.version));return projection(out);
  });}
 });
}
