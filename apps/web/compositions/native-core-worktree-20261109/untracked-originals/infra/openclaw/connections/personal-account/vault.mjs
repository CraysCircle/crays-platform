import{randomBytes}from'node:crypto';import{uid,denied}from'./person-pg-context.mjs';
const context=(p,r)=>({accountId:p.accountId,canonicalPersonId:p.canonicalPersonId,provider:r.provider,purpose:'oauth-credential',resourceId:r.credential_ref,resourceVersion:String(r.version),connectionHandle:r.connection_handle});
/** Server-only bound vault. readAppSecret is an admitted host secret-reference resolver, not env/body.
 * pg is createPersonPgContext with the genuine resolver-issued person. No absolute file path input.
 */
export function createPersonVault({pg,codec,readAppSecret}){
 if(!pg||typeof codec?.encrypt!=='function'||typeof codec?.decrypt!=='function'||typeof readAppSecret!=='function')denied();
 const read=async(c,ref)=>{uid(ref);const r=await c.query(`select * from crays_core.personal_oauth_vault where credential_ref=$1 and account_id=$2 and canonical_person_id=$3`,[ref,pg.person.accountId,pg.person.canonicalPersonId]);if(r.rows.length!==1)denied();return r.rows[0];};
 return Object.freeze({
  async withAppSecret(ref,operation){await pg.person.assertCurrent();if(typeof ref!=='string'||!ref.length||ref.length>4096||typeof operation!=='function')denied();return readAppSecret(ref,async value=>{await pg.person.assertCurrent();const result=await operation(value);await pg.person.assertCurrent();return result;});},
  async seal(input){pg.owner(input);uid(input.handle);if(!['google','microsoft','linkedin'].includes(input.provider)||!Number.isSafeInteger(input.expiresAt)||input.expiresAt<=pg.now())denied();const credentials=input.credentials;
   if(!credentials||typeof credentials.accessToken!=='string'||!credentials.accessToken.length||credentials.accessToken.length>32768||(credentials.refreshToken!==null&&(typeof credentials.refreshToken!=='string'||credentials.refreshToken.length>32768)))denied();
   const ref='cv_'+randomBytes(32).toString('base64url'),row={credential_ref:ref,provider:input.provider,version:1,connection_handle:input.handle};const envelope=await codec.encrypt(credentials,context(pg.person,row));
   try{await pg.tx(true,async c=>{await c.query(`insert into crays_core.personal_oauth_vault(credential_ref,account_id,canonical_person_id,provider,connection_handle,state,envelope,expires_at_ms,created_at_ms)values($1,$2,$3,$4,$5,'SEALED',$6,$7,$8)`,[ref,pg.person.accountId,pg.person.canonicalPersonId,input.provider,input.handle,envelope,input.expiresAt,pg.now()]);await pg.receipt(c,'VAULT_SEALED',ref);});}catch(error){
    if(error?.message!=='PERSISTENCE_COMMIT_UNKNOWN')throw error;
    // Reconcile this exact generated ref; never retry INSERT or erase a possibly committed secret.
    const found=await pg.tx(false,async c=>read(c,ref));
    if(found.state!=='SEALED'||found.connection_handle!==input.handle||found.provider!==input.provider||found.envelope?.ciphertext!==envelope.ciphertext||found.envelope?.tag!==envelope.tag)throw Error('VAULT_COMMIT_UNKNOWN');
   }return ref;
  },
  async destroy(ref){return pg.tx(true,async c=>{const r=await read(c,ref);if(r.state==='REVOKED')return;await c.query(`update crays_core.personal_oauth_vault set state='REVOKED',envelope=null,revoked_at_ms=$2,version=version+1 where credential_ref=$1`,[ref,pg.now()]);await pg.receipt(c,'VAULT_REVOKED',ref,Number(r.version)+1);});},
  async withCredential({ref,handle,provider,expectedConnectionVersion,assertCurrent},operation){if(typeof assertCurrent!=='function'||typeof operation!=='function')denied();await assertCurrent();
   const row=await pg.tx(false,async c=>{const r=await read(c,ref);if(r.state!=='BOUND'||r.connection_handle!==handle||r.provider!==provider)denied();const live=await c.query(`select credential_ref from crays_core.personal_oauth_connections where handle=$1 and account_id=$2 and canonical_person_id=$3 and state='CONNECTED' and version=$4`,[handle,pg.person.accountId,pg.person.canonicalPersonId,expectedConnectionVersion]);if(live.rows.length!==1||live.rows[0].credential_ref!==ref)denied();return r;});
   const credentials=await codec.decrypt(row.envelope,context(pg.person,row));await assertCurrent();
   // Key custody/decryption can await. Do not delegate connection currentness to a Core-only callback.
   // This fresh committed read must precede use even when the host callback only checks identity.
   await pg.tx(false,async c=>{const fresh=await read(c,ref);if(fresh.state!=='BOUND'||fresh.connection_handle!==handle||fresh.provider!==provider||String(fresh.version)!==String(row.version))denied();const live=await c.query(`select credential_ref from crays_core.personal_oauth_connections where handle=$1 and account_id=$2 and canonical_person_id=$3 and state='CONNECTED' and version=$4`,[handle,pg.person.accountId,pg.person.canonicalPersonId,expectedConnectionVersion]);if(live.rows.length!==1||live.rows[0].credential_ref!==ref)denied();});
   const result=await operation(credentials);await assertCurrent();return result;
  },
  async expireUnboundSealed(){return pg.tx(true,async c=>{const rows=(await c.query(`select credential_ref,version from crays_core.personal_oauth_vault v where account_id=$1 and canonical_person_id=$2 and state='SEALED' and expires_at_ms<=$3 and not exists(select 1 from crays_core.personal_oauth_connections x where x.credential_ref=v.credential_ref) order by credential_ref limit 128`,[pg.person.accountId,pg.person.canonicalPersonId,pg.now()])).rows;for(const r of rows){await c.query(`update crays_core.personal_oauth_vault set state='REVOKED',envelope=null,revoked_at_ms=$2,version=version+1 where credential_ref=$1 and state='SEALED'`,[r.credential_ref,pg.now()]);await pg.receipt(c,'VAULT_REVOKED',r.credential_ref,Number(r.version)+1);}return{expiredUnbound:rows.length,scanMayHaveMore:rows.length===128};});},
  async rotateEncryptionKey({ref,expectedVaultVersion}){return pg.tx(true,async c=>{const old=await read(c,ref);if(old.state==='REVOKED'||Number(old.version)!==expectedVaultVersion)denied();const value=await codec.decrypt(old.envelope,context(pg.person,old));const next={...old,version:Number(old.version)+1},envelope=await codec.encrypt(value,context(pg.person,next));await c.query(`update crays_core.personal_oauth_vault set envelope=$2,version=version+1 where credential_ref=$1 and version=$3`,[ref,envelope,old.version]);await pg.receipt(c,'VAULT_ROTATED',ref,next.version);return{credentialRef:ref,vaultVersion:next.version};});}
 });
}
