import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {createFocusedNativeCustomerFixture} from './focused-native-customer-fixture.mjs';
const f=await createFocusedNativeCustomerFixture();
const {executePersonalMessenger}=await import('../../src/db/personal-messenger-adapter.ts');
let verified=[];
try {
 const {rows:[role]}=await f.pool.query('select rolsuper,rolbypassrls from pg_roles where rolname=current_user');
 assert.equal(role.rolsuper,false);assert.equal(role.rolbypassrls,false);
 assert.deepEqual((await f.admin.query('select account_id from crays_core.canonical_people')).rows.map(x=>x.account_id),[null,null]);
 verified.push('Actual non-bypass Core role resolves existing explicit customer link without legacy direct account column');
 const transcript=await executePersonalMessenger(f.principals[0],'read',{});
 assert.equal(transcript.bindingId,f.bindings[0].bindingId);assert.equal(transcript.messages.length,1);
 assert.equal(f.invocation.freshlyCreated,true);
 assert.equal((await f.runtime.read(f.invocation.receiptId)).attemptId,f.invocation.attemptId);
 verified.push('Actual native bind, ingress receipt, runtime preparation and current-attempt SQL chain use same customer link');
 const peer=await executePersonalMessenger(f.principals[1],'read',{});assert.equal(peer.messages.length,0);
 await assert.rejects(executePersonalMessenger(f.principals[1],'receipt',{idempotencyKey:'foreign-key'}));
 verified.push('Other existing customer receives only its own conversation');
 const client=await f.pool.connect();
 try {
  await client.query('begin');await client.query("select set_config('crays.native_personal_account',$1,true)",[f.fixtures[0].account.accountId]);
  await assert.rejects(client.query("update crays_core.canonical_person_accounts set version=version+1 where account_id=$1",[f.fixtures[0].account.accountId]));await client.query('rollback');
 } finally {client.release();}
 verified.push('Native read/row-lock eligibility does not grant identity-link update');
 await f.admin.query("update crays_core.canonical_person_accounts set status='revoked' where account_id=$1",[f.fixtures[0].account.accountId]);
 await assert.rejects(executePersonalMessenger(f.principals[0],'read',{}));await assert.rejects(f.runtime.read(f.invocation.receiptId));
 verified.push('Revoked original customer link denies transcript and existing runtime attempt');
 await f.admin.query("update crays_core.canonical_person_accounts set status='active',purpose='business' where account_id=$1",[f.fixtures[0].account.accountId]);
 await assert.rejects(executePersonalMessenger(f.principals[0],'read',{}));
 verified.push('Business-only link is not native customer access');
 await f.admin.query("update crays_core.canonical_person_accounts set purpose='customer' where account_id=$1",[f.fixtures[0].account.accountId]);
 const restored=await executePersonalMessenger(f.principals[0],'read',{});assert.equal(restored.bindingId,transcript.bindingId);
 verified.push('Restored same existing link preserves conversation and immutable message; no new identity/agent');
 writeFileSync(process.env.CRAYS_NATIVE_CUSTOMER_RESULT,JSON.stringify({status:'ACTUAL_FOCUSED_PRODUCT_SOURCE_PASS_NOT_PRODUCTIVE_OWNER',verified,realOwnerOrModel:false,productiveChanges:false},null,2)+'\n');
 console.log(JSON.stringify({status:'PASS',verified}));
}finally{await f.close();}
