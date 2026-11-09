// Actual own PostgreSQL/RLS and original command. Synthetic Auth0/JWKS/userinfo
// and exact-binding fixture are explicit; no hosted owner login is claimed here.
import './native-pool-fixture-loader.mjs';
import assert from 'node:assert/strict';
import {generateKeyPair,exportJWK,SignJWT} from 'jose';
import {randomUUID} from 'node:crypto';
import {writeFileSync} from 'node:fs';
const {createFocusedNativeCustomerFixture}=await import('./focused-native-pool-fixture.mjs');
const preparation=await import('./prepare-native-pool-fixture.mjs');
const {createNativeScopedEmailRegistrationService}=await import('../../src/db/native-email-registration.mjs');
const reads=await import('../../src/db/account-email-verification.ts');
const database=await import('../../src/db/client.ts');
let fixture,broad,oldConnect;const checks=[];
const check=async(name,fn)=>{await fn();checks.push(name);};
try{
 fixture=await createFocusedNativeCustomerFixture();
 const observedClients=new WeakSet();
 preparation.rawPool.on('acquire',client=>{
  if(observedClients.has(client))return;observedClients.add(client);const original=client.query.bind(client);
  client.query=(...args)=>{const value=original(...args);return value?.catch?value.catch(error=>{console.error(JSON.stringify({scopedSqlFailure:{code:error.code,table:error.table,column:error.column,routine:error.routine}}));throw error;}):value;};
 });
 const own=fixture.fixtures[0],foreign=fixture.fixtures[1],issuer=fixture.issuer,audience='https://core.crays.example/native';
 const {privateKey,publicKey}=await generateKeyPair('RS256'),jwk={...await exportJWK(publicKey),kid:'native-scoped-contact',alg:'RS256'};
 const token=async(subject)=>new SignJWT({sub:subject,azp:'native_http_fixture',scope:'fixture:identity:read fixture:email:write',jti:randomUUID()}).setProtectedHeader({alg:'RS256',typ:'JWT',kid:jwk.kid}).setIssuer(issuer).setAudience(audience).setIssuedAt().setExpirationTime('5m').sign(privateKey);
 const userinfos=new Map();
 const fetch=async(url,options)=>{
  if(String(url)===issuer+'.well-known/jwks.json')return Response.json({keys:[jwk]});
  assert.equal(String(url),issuer+'userinfo');const value=userinfos.get(options.headers.authorization);assert(value);return Response.json(value);
 };
 const service=createNativeScopedEmailRegistrationService({issuer,audience,nativeClientIds:['native_http_fixture'],requiredIdentityScope:'fixture:identity:read',requiredContactWriteScope:'fixture:email:write'},{fetch});
 const request=token=>new Request('https://core.crays.example/api/graphql',{method:'POST',headers:{authorization:'Bearer '+token}});
 const ownToken=await token(own.authIdentity.providerSubject),foreignToken=await token(foreign.authIdentity.providerSubject);
 userinfos.set('Bearer '+ownToken,{sub:own.authIdentity.providerSubject,email:own.account.primaryContact,email_verified:true});
 userinfos.set('Bearer '+foreignToken,{sub:foreign.authIdentity.providerSubject,email:foreign.account.primaryContact,email_verified:true});
 const primary=request(ownToken),secondary=request(ownToken),proof=await service.readEmailProof(secondary);
 const revision=await reads.getNativeCurrentAccountContactRevision(own.account.accountId,own.account.primaryContact,'contact');
 broad=database.getCorePgPool();oldConnect=broad.connect;broad.connect=()=>{throw Error('GENERAL_POOL_FORBIDDEN_IN_NATIVE_CONTACT_PATH');};
 await check('native current revision and proof use verified scoped role with general pool poisoned',async()=>{
  assert.equal(await reads.getNativeCurrentAccountContactRevision(own.account.accountId,own.account.primaryContact,'contact'),revision);
  assert.equal((await reads.getNativeCurrentAccountEmailVerification(own.account.accountId,issuer)).account_id,own.account.accountId);
  assert.equal(await reads.getNativeCurrentAccountContactRevision(own.account.accountId,foreign.account.primaryContact,'contact'),null);
 });
 await check('foreign rows remain excluded and transaction account context is released',async()=>{
  const c=await preparation.nativePool.connect();try{await c.query('begin');await c.query("select set_config('crays.native_personal_account',$1,true)",[own.account.accountId]);assert.equal((await c.query('select account_id from crays_core.crays_accounts where account_id=$1',[foreign.account.accountId])).rowCount,0);await c.query('rollback');}finally{c.release();}
  const next=await preparation.nativePool.connect();next.release();
 });
 await check('revoked provider verification invalidates existing current proof',async()=>{
  await fixture.admin.query('update crays_core.auth_identities set verified=false where identity_id=$1',[own.authIdentity.identityId]);
  assert.equal(await reads.getNativeCurrentAccountEmailVerification(own.account.accountId,issuer),null);
  await fixture.admin.query('update crays_core.auth_identities set verified=true where identity_id=$1',[own.authIdentity.identityId]);
 });
 await fixture.admin.query('delete from crays_core.account_email_verifications where account_id=$1',[own.account.accountId]);
 let receipt;
 await check('actual original native contact command commits proof and audit under non-bypass own role',async()=>{
  receipt=await service.register(primary,secondary,proof,{idempotencyKey:'scoped-contact',expectedContactRevision:revision});assert.equal(receipt.current,true);assert.equal(receipt.replayed,false);
  assert.equal((await reads.getNativeCurrentAccountEmailVerification(own.account.accountId,issuer)).receipt_id,receipt.receiptId);
  assert.equal((await fixture.admin.query("select count(*)::int n from crays_core.audit_events where actor_account_id=$1 and action='identity.registration_email.verified' and metadata->>'receiptId'=$2",[own.account.accountId,receipt.receiptId])).rows[0].n,1);
 });
 await check('repeated command returns same durable receipt without another audit or identity',async()=>{
  const again=await service.register(primary,secondary,proof,{idempotencyKey:'scoped-contact',expectedContactRevision:revision});assert.equal(again.receiptId,receipt.receiptId);assert.equal(again.replayed,true);
  assert.equal((await fixture.admin.query('select count(*)::int n from crays_core.auth_identities where provider_subject=$1',[own.authIdentity.providerSubject])).rows[0].n,1);
 });
 await check('foreign verified secondary identity cannot be linked and own original proof remains',async()=>{
  const secondaryForeign=request(foreignToken),p=await service.readEmailProof(secondaryForeign);
  await assert.rejects(service.register(primary,secondaryForeign,p,{idempotencyKey:'foreign-contact',expectedContactRevision:revision}));
  assert.equal((await reads.getNativeCurrentAccountEmailVerification(own.account.accountId,issuer)).receipt_id,receipt.receiptId);
 });
 await check('stale revision denies before contact effects',async()=>{
  await assert.rejects(service.register(primary,secondary,proof,{idempotencyKey:'stale-contact',expectedContactRevision:'999'}),/CONTACT_CHANGED/);
 });
 await check('revoked exact original client binding denies before native registration',async()=>{
  await fixture.admin.query('update crays_native_qualification.exact_bindings set revoked=true where subject=$1',[own.authIdentity.providerSubject]);
  await assert.rejects(service.register(primary,secondary,proof,{idempotencyKey:'revoked-contact',expectedContactRevision:revision}),/ACCOUNT_REQUIRED/);
  await fixture.admin.query('update crays_native_qualification.exact_bindings set revoked=false where subject=$1',[own.authIdentity.providerSubject]);
 });
 await check('role cannot write another account or security version or read audit data',async()=>{
  const c=await preparation.nativePool.connect();try{
   await c.query('begin');await c.query("select set_config('crays.native_personal_account',$1,true)",[own.account.accountId]);
   assert.equal((await c.query('update crays_core.crays_accounts set primary_contact=$2 where account_id=$1',[foreign.account.accountId,'denied@example.invalid'])).rowCount,0);await c.query('rollback');
   await assert.rejects(c.query('select * from crays_core.audit_events'),e=>e.code==='42501');
   await assert.rejects(c.query('update crays_core.auth_identities set verified=false'),e=>e.code==='42501');
   await assert.rejects(c.query('delete from crays_core.account_email_verifications'),e=>e.code==='42501');
  }finally{c.release();}
 });
 await check('personal-chat context still cannot mutate identity despite dedicated contact write grants',async()=>{
  const c=await preparation.nativePool.connect();try{
   await c.query('begin');await c.query("select set_config('crays.native_personal_account',$1,true)",[own.account.accountId]);
   await assert.rejects(c.query('update crays_core.crays_accounts set primary_contact=$2 where account_id=$1',[own.account.accountId,'denied@example.invalid']),e=>e.code==='P0001'&&/read and lock only/.test(e.message));
   await c.query('rollback');
  }finally{c.release();}
 });
 await check('audit scope forbids foreign target and arbitrary action even for own account',async()=>{
  for(const [target,action]of [[foreign.account.accountId,'identity.registration_email.verified'],[own.account.accountId,'arbitrary.effect']]){
   const c=await preparation.nativePool.connect();try{await c.query('begin');await c.query("select set_config('crays.native_personal_account',$1,true)",[own.account.accountId]);await assert.rejects(c.query("insert into crays_core.audit_events(audit_id,actor_account_id,target_type,target_id,action,outcome,risk_level) values($1,$2,'crays-account',$3,$4,'changed','sensitive')",['denied-'+randomUUID(),own.account.accountId,target,action]),e=>e.code==='42501');await c.query('rollback');}finally{c.release();}
  }
 });
 writeFileSync(process.env.CRAYS_NATIVE_CUSTOMER_RESULT,JSON.stringify({status:'PASS_FOCUSED_NATIVE_CONTACT_RLS_NOT_OWNER_OR_NATIVE_DEVICE',checks,checksPassed:checks.length,actualPostgresql:true,actualRestrictedProductPool:true,hostedAuth0:false,syntheticJwtUserinfoAndExactBindingFixture:true,generalPoolForbiddenDuringNativeChecks:true,productiveChanges:false},null,2)+'\n');console.log(JSON.stringify({checksPassed:checks.length}));
}finally{if(broad)broad.connect=oldConnect;await preparation.nativePool?.end();await fixture?.close();await (await import('./original-core-rpc-fixture.mjs')).closeCoreNativeIdentityRpcPool();}
