// Derived own fixture from existing focused v96 setup; no original runtime/Core identity claim.
// Focused SOURCE-COMPOSITION CANDIDATE, not previously executed V96 fixture.
// Exact original setup body retained below, no HTTP/chat/attachment test replay.
// Caller admits/starts/stops its OWN disposable PG. No leases/services started here.
import './runtime-source-loader.mjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomUUID,createHash} from 'node:crypto';
import {generateKeyPair,exportJWK,SignJWT} from 'jose';
export async function createFocusedNativeCustomerFixture(){
 assert.equal(process.env.CRAYS_NATIVE_CUSTOMER_FIXTURE,'synthetic-source-composition-only');
 assert.ok(process.env.CRAYS_NATIVE_SQL_FIXTURE_SOCKET?.startsWith('/tmp/crays-ios-native-sql-'));
 for(const key of ['OPENAI_API_KEY','ANTHROPIC_API_KEY','OPENCLAW_CONFIG_PATH','OPENCLAW_AGENT_DIR'])assert.ok(!process.env[key]);
 const issuer='https://crays-http-qualification.auth0.com/',audience='https://core.crays.example/native';
 const {privateKey,publicKey}=await generateKeyPair('RS256');
 const jwk={...await exportJWK(publicKey),kid:'focused-source-fixture',alg:'RS256'};
const repository = await import('../../src/db/core-identity-repository.ts');
const database = await import('../../src/db/client.ts');
const {createNativeEmailRegistrationService}=await import('../../src/db/native-email-registration.mjs');
const pool = database.getCorePgPool();
assert.equal((await pool.query('select current_database() db')).rows[0].db, 'ios_native_qualification');
await pool.query(readFileSync(new URL('../../database/migrations/0001_core_identity.sql', import.meta.url), 'utf8'));
const emailMigration=readFileSync(new URL('../../database/migrations/0207_core_account_email_verification.sql',import.meta.url),'utf8');
await pool.query(emailMigration);await pool.query(emailMigration);

await pool.query(readFileSync(new URL('../../database/migrations/0002_core_domain.sql',import.meta.url),'utf8'));
await pool.query(readFileSync(new URL('../../database/migrations/0003_communication_persistence.sql',import.meta.url),'utf8'));
const canonicalBytes=readFileSync(new URL('../../database/migrations/0075_ncrv2_canonical_contact_mail_activity.sql',import.meta.url));
assert.equal(createHash('sha256').update(canonicalBytes).digest('hex'),'3e5ee33a86acf74f0db6cf530a0755a46c81cbeeffa8d4664c2f6217bb36be6c');
const canonical=canonicalBytes.toString('utf8'),personStart=canonical.indexOf('create table if not exists crays_core.canonical_people ('),personEnd=canonical.indexOf('\n);',personStart);
assert.ok(personStart>=0&&personEnd>personStart);
await pool.query(canonical.slice(personStart,personEnd+4));
const personIndex=canonical.indexOf('create unique index if not exists canonical_people_one_current_account_uq');
assert.ok(personIndex>personEnd);await pool.query(canonical.slice(personIndex,canonical.indexOf(';',personIndex)+1));
const assignment=readFileSync(new URL('../../database/migrations/0207_personal_agent_standard_assignment.sql',import.meta.url));
assert.equal(createHash('sha256').update(assignment).digest('hex'),'3decfce60e9e204a478aa570d3b7b2356fd38d4194150d7376a23e02b33a80d7');
await pool.query(assignment.toString('utf8'));
await pool.query(readFileSync(new URL('../../database/migrations/0208_personal_agent_baseline_deliveries.sql',import.meta.url),'utf8'));
// Reproduce actual managed Core CHECK definitions; no productive rows copied.
const managedConstraintBytes=readFileSync(new URL('./managed-core-communication-constraints.json',import.meta.url));
assert.equal(createHash('sha256').update(managedConstraintBytes).digest('hex'),'a0357766c7da3448c3c449fb10468341dda4abc348a45a48635437c57ea484bf');
const managedConstraints=JSON.parse(managedConstraintBytes).constraints;
assert.equal(managedConstraints.length,5);
for(const c of managedConstraints){
 assert(['conversations','conversation_participants','messages'].includes(c.table));
 assert(/^[a-z_]+$/.test(c.name)&&c.type==='c'&&c.validated===true);
 await pool.query(`alter table crays_core.${c.table} drop constraint ${c.name}; alter table crays_core.${c.table} add constraint ${c.name} ${c.definition}`);
}
await pool.query(readFileSync(new URL('../../database/migrations/0210_native_personal_messenger.sql',import.meta.url),'utf8'));
await pool.query(readFileSync(new URL('../../database/migrations/0211_native_personal_runtime_attempts.sql',import.meta.url),'utf8'));
await pool.query(readFileSync(new URL('../../database/migrations/0212_native_personal_identity_transaction_scope.sql',import.meta.url),'utf8'));
// Actual apply/empty rollback/reapply on this disposable database only.
for(const file of ['0212_native_personal_identity_transaction_scope.down.sql','0211_native_personal_runtime_attempts.down.sql','0211_native_personal_runtime_attempts.sql','0212_native_personal_identity_transaction_scope.sql']){
 await pool.query(readFileSync(new URL('../../database/migrations/'+file,import.meta.url),'utf8'));
}
await pool.query(readFileSync(new URL('../../database/migrations/0213_native_personal_verified_principal_scope.sql',import.meta.url),'utf8'));
await pool.query(readFileSync(new URL('../../database/migrations/0213_native_personal_verified_principal_scope.down.sql',import.meta.url),'utf8'));
await pool.query(readFileSync(new URL('../../database/migrations/0213_native_personal_verified_principal_scope.sql',import.meta.url),'utf8'));
const {getCurrentAccountEmailVerification}=await import('../../src/db/account-email-verification.ts');
const fixtures = ['a','b'].map((person, i) => ({
 account: { accountId: 'ios-native-fixture-' + person, craysId: 'ios-native-fixture-' + person,
  displayName: 'Synthetic iOS native fixture ' + person, primaryContact: 'synthetic-'+person+'@example.invalid', primaryContactType: 'contact', defaultRole: 'guest', status: 'active' },
 authIdentity: { identityId: 'ios-native-provider-' + person, providerKey: 'auth0', providerSubject: 'auth0|ios-native-' + person, methodType: 'social', verified: true },
 nostrIdentity: { npub: 'synthetic-existing-npub-' + person, pubkeyHex: (i ? 'cd' : 'ab').repeat(32),
  nip05: 'fixture.' + person + '@crays.world', issuanceStatus: 'active', privateKeyHandoff: 'not_applicable', signerStatus: 'verified', accessEnabled: true },
 organization: { organizationId: 'ios-native-org-' + person, name: 'Synthetic platform organization ' + person, organizationType: 'crays', status: 'active' },
 roleAssignment: { assignmentId: 'ios-native-role-' + person, roleKey: 'guest', organizationId: 'ios-native-org-' + person,
  nostrBindingStatus: 'verified', nostrPubkeyHex: (i ? 'cd' : 'ab').repeat(32), status: 'active' },
}));
for (const fixture of fixtures) await repository.upsertCoreIdentity(fixture);
assert.equal(process.env.CRAYS_NATIVE_CONTROLLED_ORIGINAL_RPC_SQL,'true','Explicit own original V2 SQL transport qualification required');
await pool.query(readFileSync(new URL('./original-core-rpc-fixture.sql',import.meta.url),'utf8'));
// Baseline email receipts are minted by the actual trusted internal Core command
// using real JWT verification and controlled provider responses, not legacy flags.
async function seedCurrentProof(index=0){
 const fixture=fixtures[index],subject=fixture.authIdentity.providerSubject;
 await pool.query('delete from crays_core.account_email_verifications where account_id=$1',[fixture.account.accountId]);
 const now=Math.floor(Date.now()/1000),token=await new SignJWT({sub:subject,azp:'native_http_fixture',scope:'fixture:identity:read fixture:email:write',jti:randomUUID()}).setProtectedHeader({alg:'RS256',typ:'JWT',kid:jwk.kid}).setIssuer(issuer).setAudience(audience).setIssuedAt(now).setExpirationTime(now+300).sign(privateKey);
 const transport=async(url)=>{if(String(url)===issuer+'.well-known/jwks.json')return Response.json({keys:[jwk]});assert.equal(String(url),issuer+'userinfo');return Response.json({sub:subject,email:fixture.account.primaryContact,email_verified:true});};
 const service=createNativeEmailRegistrationService({issuer,audience,nativeClientIds:['native_http_fixture'],requiredIdentityScope:'fixture:identity:read',requiredContactWriteScope:'fixture:email:write'},{fetch:transport});
 const primary=new Request('https://core.crays.example/api/graphql',{method:'POST',headers:{authorization:'Bearer '+token}}),secondary=new Request(primary);
 const proof=await service.readEmailProof(secondary);
 await service.register(primary,secondary,proof,{idempotencyKey:'baseline_'+randomUUID(),expectedContactRevision:await contactRevision(fixture.account.accountId)});
}
await seedCurrentProof(0);await seedCurrentProof(1);
async function contactRevision(account=fixtures[0].account.accountId){return (await pool.query('select primary_contact_revision::text revision from crays_core.crays_accounts where account_id=$1',[account])).rows[0].revision;}
async function seedPersonal(){
 process.env.CRAYS_NATIVE_AUTH_PERSONAL_READ_SCOPE='fixture:personal:read';process.env.CRAYS_NATIVE_AUTH_PERSONAL_WRITE_SCOPE='fixture:personal:write';
 for(let i=0;i<2;i++){
  await repository.upsertCoreIdentity(fixtures[i]);await seedCurrentProof(i);
  const person='native-personal-'+i,agent='personal-'+String(i?'b':'a').repeat(48);
  await pool.query("insert into crays_core.canonical_people(canonical_person_id,person_version,account_id,display_name_sha256,encrypted_display_name_ref,field_authority_version,lifecycle_state) values($1,1,$2,repeat('a',64),'secret://synthetic-native-personal','synthetic-only','active') on conflict do nothing",[person,fixtures[i].account.accountId]);
  await pool.query("insert into crays_core.personal_agent_standard_assignments(canonical_person_id,account_id,agent_id,package_version,package_sha256,everyday_skill_sha256,assignment_proposal) values($1,$2,$3,'synthetic-intent-only',repeat('a',64),repeat('b',64),'{}'::jsonb) on conflict do nothing",[person,fixtures[i].account.accountId,agent]);
 }
}

 await seedPersonal();
 await pool.query(readFileSync(new URL('./original-canonical-person-accounts-0350.fixture.sql',import.meta.url),'utf8'));
 for(const migration of ['0218_native_customer_person_binding.sql','0218_native_customer_person_binding.down.sql','0218_native_customer_person_binding.sql'])
  await pool.query(readFileSync(new URL('../../database/migrations/'+migration,import.meta.url),'utf8'));
 for(let i=0;i<2;i++)await pool.query("insert into crays_core.canonical_person_accounts(account_id,canonical_person_id,purpose,status,authority_ref) values($1,$2,'customer','active','synthetic-source-composition-only')",[fixtures[i].account.accountId,'native-personal-'+i]);
 // Actual original Core has an independent explicit link; no direct-column fallback.
 await pool.query('update crays_core.canonical_people set account_id=null');
 await pool.query(readFileSync(new URL('../../database/migrations/0214_native_personal_agent_responses.sql',import.meta.url),'utf8'));
 await pool.query(readFileSync(new URL('../../database/migrations/0216_personal_feed_effects.sql',import.meta.url),'utf8'));
 const {executePersonalMessenger}=await import('../../src/db/personal-messenger-adapter.ts');
 let current=true;
 const principals=fixtures.map(f=>Object.freeze({providerKey:'auth0',providerSubject:f.authIdentity.providerSubject,issuer,clientId:'native_http_fixture',accountId:f.account.accountId,assertCurrent(){assert.ok(current,'SYNTHETIC_FIXTURE_REVOKED');},recordCommittedOutbox(){}}));
 const bindings=[];
 for(let i=0;i<2;i++)bindings.push(await executePersonalMessenger(principals[i],'bind',{expectedContactRevision:await contactRevision(fixtures[i].account.accountId)}));
 const originalURL=process.env.CRAYS_DATABASE_URL;
 const {Pool}=await import('pg');
 const admin=new Pool({connectionString:originalURL,ssl:false,max:1,options:'-c crays.app_role=core_service'});
 await admin.query(`create role ios_native_personal_http_fixture login nosuperuser nobypassrls noinherit;
 grant usage on schema crays_core to ios_native_personal_http_fixture;
 grant select,insert,update on crays_core.personal_agent_standard_assignments,crays_core.personal_agent_baseline_deliveries to ios_native_personal_http_fixture;
 grant select,update on crays_core.canonical_person_accounts to ios_native_personal_http_fixture;
 grant select,update on crays_core.crays_accounts,crays_core.auth_identities,crays_core.canonical_people,crays_core.account_email_verifications to ios_native_personal_http_fixture;
 grant select,insert,update on crays_core.conversations,crays_core.conversation_participants,crays_core.messages,crays_core.personal_messenger_bindings,crays_core.personal_messenger_ingress_receipts,crays_core.personal_messenger_outbox,crays_core.personal_messenger_runtime_attempts,crays_core.personal_messenger_runtime_observations to ios_native_personal_http_fixture;
 grant select,insert on crays_core.personal_messenger_agent_responses to ios_native_personal_http_fixture;
 grant usage,select on sequence crays_core.conversations_id_seq,crays_core.conversation_participants_id_seq,crays_core.messages_id_seq,crays_core.personal_messenger_runtime_observations_observation_id_seq,crays_core.personal_feed_outcomes_ordinal_seq to ios_native_personal_http_fixture;
 grant execute on function crays_core.assert_native_personal_runtime_attempt_current(text,text),crays_core.append_native_personal_runtime_observation(text,text,text,jsonb),crays_core.persist_native_personal_agent_response(text,bigint,text),crays_core.guard_personal_feed_effect() to ios_native_personal_http_fixture;`);
 for(const suffix of ['states','revocations','intents','confirmations','attempts','outcomes'])await admin.query(`grant select,insert,update,delete on crays_core.personal_feed_${suffix} to ios_native_personal_http_fixture`);
 const focusedContact=await contactRevision();
 await database.closeCoreDatabase();
 const url=new URL(originalURL);url.username='ios_native_personal_http_fixture';process.env.CRAYS_DATABASE_URL=url.toString();process.env.CRAYS_DATABASE_POOL_MAX='2';
 const restricted=database.getCorePgPool();
 assert.deepEqual((await restricted.query('select rolsuper,rolbypassrls from pg_roles where rolname=current_user')).rows[0],{rolsuper:false,rolbypassrls:false});
 const contact=focusedContact;
 const incoming=await executePersonalMessenger(principals[0],'receive',{bindingId:bindings[0].bindingId,expectedBindingRevision:bindings[0].revision,expectedContactRevision:contact,idempotencyKey:'focused-'+randomUUID(),body:'Synthetic source-only feed operation'});
 const runtimeTarget={accountId:fixtures[0].account.accountId,canonicalPersonId:'native-personal-0',agentId:'personal-'+'a'.repeat(48),bindingId:bindings[0].bindingId,bindingRevision:bindings[0].revision,contactRevision:contact,expectedIssuer:issuer,runtimeBindingSHA256:'c'.repeat(64),sdkSessionId:'focused-synthetic-session',sdkSessionKey:'agent:personal-'+'a'.repeat(48)+':ios:synthetic-core-conversation'};
 const {createNativePersonalRuntimeRepository}=await import('../../src/db/native-personal-runtime-repository.ts');
 const runtime=createNativePersonalRuntimeRepository(runtimeTarget,async()=>{});
 const invocation=await runtime.prepare(incoming.receiptId);
 const commands=await import('../../src/db/personal-feed-effects.ts');
 return Object.freeze({admin,pool:restricted,fixtures,issuer,principals,bindings,runtimeTarget,runtime,invocation,commands,
  revokeSyntheticCurrentness(){current=false;},
  async close(){current=false;await database.closeCoreDatabase();await admin.end();}});
}
