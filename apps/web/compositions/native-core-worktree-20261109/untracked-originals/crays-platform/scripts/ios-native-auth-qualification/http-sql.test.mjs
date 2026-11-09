import {sdkSchemaSourcePins,qualifiedSdkURL} from './sdk-source-bindings.mjs';
import './runtime-source-loader.mjs';
import { test, after } from 'node:test';
import { randomUUID, createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { createServer, request as unixHttpRequest } from 'node:http';
import { readFileSync, writeFileSync } from 'node:fs';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import { runtimeSourcePins } from './runtime-source-loader.mjs';
assert.ok(process.env.CRAYS_NATIVE_SQL_FIXTURE_SOCKET, 'Run only through the own-PG controller');
const originalSdkSchemaPins=sdkSchemaSourcePins();

const issuer = 'https://crays-http-qualification.auth0.com/';
const audience = 'https://core.crays.example/native';
Object.assign(process.env, { NODE_ENV: 'test', CRAYS_NATIVE_AUTH_ENABLED: 'true',
 CRAYS_NATIVE_AUTH_ISSUER: issuer, CRAYS_NATIVE_AUTH_AUDIENCE: audience,
 CRAYS_NATIVE_AUTH_CLIENT_IDS: 'native_http_fixture', CRAYS_NATIVE_AUTH_IDENTITY_SCOPE: 'fixture:identity:read',
 CRAYS_NATIVE_AUTH_CONTACT_WRITE_SCOPE: 'fixture:email:write', CRAYS_NATIVE_AUTH_BOOTSTRAP_SCOPE: 'fixture:bootstrap:read', CRAYS_ALLOW_REVIEW_PERSONAS: 'false',
 CRAYS_REDIS_ENABLED: 'false', AUTH0_DOMAIN: 'browser-fixture.auth0.com', AUTH0_CLIENT_ID: 'browser_fixture',
 AUTH0_CLIENT_SECRET: 'synthetic-browser-secret-not-an-account', AUTH0_SECRET: 'ab'.repeat(32), APP_BASE_URL: 'https://core.crays.example' });
for (const k of ['CRAYS_REDIS_URL','CRAYS_KAFKA_BROKERS','CRAYS_GRAPHQL_OTLP_ENDPOINT']) delete process.env[k];
const originalFetch = globalThis.fetch;
let origin,originalSdkModelOrigin;
const httpSocket=process.env.CRAYS_NATIVE_HTTP_SOCKET;
assert.equal(httpSocket,process.env.CRAYS_NATIVE_SQL_FIXTURE_SOCKET+'/http.sock','Only own controlled Unix HTTP socket');
function fetchOwnUnixHTTP(address,options={}){
 return new Promise((resolve,reject)=>{
  const request=unixHttpRequest({socketPath:httpSocket,path:new URL(address).pathname,method:options.method??'GET',headers:options.headers,signal:options.signal},response=>{
   const chunks=[];let length=0;
   response.on('data',chunk=>{length+=chunk.length;if(length>1048576){request.destroy(Error('FIXTURE_RESPONSE_TOO_LARGE'));return;}chunks.push(chunk);});
   response.on('error',reject);
   response.on('end',()=>resolve(new Response(Buffer.concat(chunks),{status:response.statusCode,headers:response.headers})));
  });
  request.setTimeout(30000,()=>request.destroy(Error('FIXTURE_HTTP_TIMEOUT')));
  request.on('error',reject);request.end(options.body);
 });
}
let dropCommittedPersonalResponse=false;
const { privateKey, publicKey } = await generateKeyPair('RS256');
const jwk = { ...await exportJWK(publicKey), kid: 'http-sql-fixture', alg: 'RS256' };
let jwksFetches = 0;
const emailUserinfoResponses=new Map();let emailUserinfoReads=0;
globalThis.fetch = async (url, options) => {
 const address = url instanceof Request ? url.url : String(url);
 if(originalSdkModelOrigin && new URL(address).origin===originalSdkModelOrigin && new URL(address).pathname==='/v1/chat/completions')return originalFetch(url,options);
 if (address === issuer + '.well-known/jwks.json') { jwksFetches++; return Response.json({ keys: [jwk] }); }
 if (address === issuer+'userinfo') {emailUserinfoReads++;const value=emailUserinfoResponses.get(options.headers.authorization);return value?Response.json(value):Response.json({error:'fixture missing'},{status:401});}
 if (origin && new URL(address).origin === origin) return fetchOwnUnixHTTP(address, options);
 throw new Error('UNADMITTED_NETWORK_ENDPOINT');
};
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

const actual = await import('../../src/app/api/graphql/route.ts');
const originalUploadRoute=await import('../../src/app/api/native/personal-message-originals/route.ts');
const originalReadRoute=await import('../../src/app/api/native/personal-message-originals/read/route.ts');
const { nativeBootstrapHash } = await import('../../src/lib/native-core-auth.ts');
let personalRequestAbortController;
const server = createServer(async (incoming, outgoing) => {
 try {
  const chunks = []; let size = 0;
  for await (const chunk of incoming) { size += chunk.length; if (size > 65536) throw Error('FIXTURE_BODY_TOO_LARGE'); chunks.push(chunk); }
  const headers = new Headers(); for (const [k,v] of Object.entries(incoming.headers)) if (v !== undefined) headers.set(k, Array.isArray(v) ? v.join(', ') : v);
  const request = new Request(origin + incoming.url, { method: incoming.method, headers, signal: personalRequestAbortController?.signal,
   ...(['GET','HEAD'].includes(incoming.method) ? {} : { body: Buffer.concat(chunks) }) });
  const response = incoming.url.startsWith('/api/native/personal-message-originals/read')?await originalReadRoute.POST(request):incoming.url.startsWith('/api/native/personal-message-originals')?await originalUploadRoute.POST(request):await actual.POST(request, { params: Promise.resolve({}) });
  if(dropCommittedPersonalResponse){dropCommittedPersonalResponse=false;await response.arrayBuffer();outgoing.destroy();return;}
  outgoing.writeHead(response.status, Object.fromEntries(response.headers)); outgoing.end(Buffer.from(await response.arrayBuffer()));
 } catch (error) { outgoing.writeHead(500); outgoing.end(JSON.stringify({ fixtureAdapterError: error.message })); }
});
await new Promise((resolve,reject) => { server.once('error',reject);server.listen(httpSocket,resolve); });
origin = 'http://native-core-qualification.invalid';
async function originalsCall(metadata,originals,{scope='fixture:identity:read fixture:personal:write',subject='auth0|ios-native-a',headers={},modifyForm}={}) {
 const form=new FormData();form.append('metadata',new Blob([JSON.stringify(metadata)],{type:'application/json'}),'metadata.json');
 originals.forEach((o,i)=>form.append('original'+i,new Blob([o.bytes],{type:o.mimeType}),'original'));modifyForm?.(form);
 const encoded=new Request(origin+'/api/native/personal-message-originals',{method:'POST',body:form});
 const now=Math.floor(Date.now()/1000),token=await new SignJWT({sub:subject,azp:'native_http_fixture',scope}).setProtectedHeader({alg:'RS256',typ:'JWT',kid:jwk.kid}).setIssuer(issuer).setAudience(audience).setIssuedAt(now).setExpirationTime(now+300).sign(privateKey);
 const response=await fetch(encoded.url,{method:'POST',headers:{'content-type':encoded.headers.get('content-type'),authorization:'Bearer '+token,...headers},body:Buffer.from(await encoded.arrayBuffer())});
 return {status:response.status,headers:response.headers,body:await response.json()};
}
async function originalReadCall(reference,{scope='fixture:identity:read fixture:personal:read',subject='auth0|ios-native-a',headers={}}={}) {
 const now=Math.floor(Date.now()/1000),token=await new SignJWT({sub:subject,azp:'native_http_fixture',scope}).setProtectedHeader({alg:'RS256',typ:'JWT',kid:jwk.kid}).setIssuer(issuer).setAudience(audience).setIssuedAt(now).setExpirationTime(now+300).sign(privateKey);
 const response=await fetch(origin+'/api/native/personal-message-originals/read',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+token,...headers},body:JSON.stringify(reference)});
 const bytes=Buffer.from(await response.arrayBuffer());return {status:response.status,headers:response.headers,bytes};
}
function operation() { return { operationName: 'PlatformBootstrap', extensions: { persistedQuery: { version: 1, sha256Hash: nativeBootstrapHash } } }; }
async function call({ subject = 'auth0|ios-native-a', scope = 'fixture:identity:read fixture:bootstrap:read', claims = {}, payload = operation(), headers = {} } = {}) {
 const now = Math.floor(Date.now()/1000);
 const token = await new SignJWT({ sub: subject, azp: 'native_http_fixture', scope, ...claims }).setProtectedHeader({ alg:'RS256',typ:'JWT',kid:jwk.kid })
  .setIssuer(issuer).setAudience(audience).setIssuedAt(now).setExpirationTime(now + 300).sign(privateKey);
 const response = await fetch(origin + '/api/graphql', { method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+token,...headers},body:JSON.stringify(payload) });
 return { status: response.status, headers: response.headers, body: await response.json() };
}
test('native migration preserves observed managed Core roles and guest thread restrictions', async()=>{
 const columns={conversations_type_check:'conversation_type',conversations_related_type_check:'related_entity_type',
  conversations_opened_by_role_check:'opened_by_role',conversation_participants_role_key_check:'role_key',messages_sender_role_check:'sender_role'};
 for(const c of managedConstraints){
  const column=columns[c.name];assert(column);
  const current=await pool.query(`select pg_get_expr(k.conbin,k.conrelid) expression from pg_constraint k join pg_class t on t.oid=k.conrelid join pg_namespace n on n.oid=t.relnamespace where n.nspname='crays_core' and t.relname=$1 and k.conname=$2`,[c.table,c.name]);
  assert.equal(current.rows.length,1);const expression=current.rows[0].expression;
  const originalValues=[...new Set([...c.definition.matchAll(/'([^']+)'::text/g)].map(m=>m[1]))];assert(originalValues.length>0);
  async function admits(value,thread='support_thread'){
   const secondary=column==='opened_by_role'?', $2::text as conversation_type':'';
   const result=await pool.query(`select (${expression}) admitted from (select $1::text as ${column}${secondary}) fixture`,column==='opened_by_role'?[value,thread]:[value]);
   return result.rows[0].admitted;
  }
  for(const value of originalValues)assert.equal(await admits(value),true,`${c.table}/${c.name} must retain ${value}`);
  assert.equal(await admits('invalid-unapproved-role-or-type'),false,'Unknown values remain rejected');
  if(['opened_by_role','role_key','sender_role'].includes(column)){
   assert(originalValues.includes('holiday-manager'),'Actual later Core role is exercised');
   assert.equal(await admits('guest','personal_chuck'),true);
  }
  if(column==='opened_by_role')assert.equal(await admits('guest','support_thread'),false,'Guest cannot open a business thread');
 }
});

test('actual HTTP handler, persisted registry, Yoga, real Core SQL mapping and viewer return canonical A', async () => {
 const r = await call(); assert.equal(r.status,200,JSON.stringify(r.body)); assert.equal(r.body.errors,undefined);
 assert.equal(r.body.data.viewer.authenticated,true); assert.equal(r.body.data.viewer.authoritySource,'AUTH0_CRAYS_SESSION');
 assert.equal(r.body.data.viewer.role,'guest'); assert.equal(r.body.data.viewer.tenantId,'ios-native-org-a');
 assert.equal(r.body.data.viewer.reviewMode,false); assert.match(r.headers.get('cache-control'),/no-store/);
 const person = await repository.getIdentityBundleByProviderSubject('auth0','auth0|ios-native-a');
 assert.equal(person.account.account_id,fixtures[0].account.accountId); assert.equal(person.nostrIdentity.pubkey_hex,fixtures[0].nostrIdentity.pubkeyHex);
});
test('second real persisted person stays separate despite forged account/role/tenant/key claims', async () => {
 const r = await call({subject:'auth0|ios-native-b',claims:{role:'admin',tenant:'ios-native-org-a',accountId:'ios-native-fixture-a',npub:'forged'}});
 assert.equal(r.status,200,JSON.stringify(r.body));assert.equal(r.body.data.viewer.tenantId,'ios-native-org-b');assert.equal(r.body.data.viewer.role,'guest');
 const person = await repository.getIdentityBundleByProviderSubject('auth0','auth0|ios-native-b');assert.equal(person.nostrIdentity.pubkey_hex,fixtures[1].nostrIdentity.pubkeyHex);
});
test('missing actual scope produces HTTP401 without a review fallback', async () => {const r=await call({scope:'fixture:identity:read'});assert.equal(r.status,401,JSON.stringify(r.body));assert.equal(r.body.data,undefined);});
test('unknown subject stays403 and creates no account/key/role rows', async () => {
 const counts=async()=> (await pool.query('select (select count(*) from crays_core.crays_accounts)::int accounts,(select count(*) from crays_core.nostr_identities)::int keys,(select count(*) from crays_core.role_assignments)::int roles')).rows[0];
 const before=await counts();const r=await call({subject:'auth0|ios-native-unmapped'});assert.equal(r.status,403,JSON.stringify(r.body));assert.deepEqual(await counts(),before);
});
test('committed Core account block denies subsequent HTTP request with a still-valid token', async () => {
 await repository.upsertCoreIdentity({account:{...fixtures[0].account,status:'blocked'}});
 try {const r=await call();assert.equal(r.status,403,JSON.stringify(r.body));assert.equal(r.body.data,undefined);}
 finally {await repository.upsertCoreIdentity({account:fixtures[0].account});}
});
test('committed role revocation denies next HTTP request', async () => {
 await repository.upsertCoreIdentity({account:fixtures[0].account,roleAssignment:{...fixtures[0].roleAssignment,status:'revoked'}});
 try {const r=await call();assert.equal(r.status,403,JSON.stringify(r.body));}
 finally {await repository.upsertCoreIdentity({account:fixtures[0].account,roleAssignment:fixtures[0].roleAssignment});}
});
for (const reason of ['missing-email','unverified-contact','signer-is-not-email']) test('actual SQL email gate denies '+reason+' despite verified Nostr and forged token claims',async()=>{
 const fixture=fixtures[0];
 const change=reason==='missing-email'?{account:{...fixture.account,primaryContact:null}}:
  {account:fixture.account,authIdentity:{...fixture.authIdentity,...(reason==='unverified-contact'?{verified:false}:{methodType:'nostr'})}};
 await repository.upsertCoreIdentity(change);
 await pool.query('update crays_core.account_email_verifications set revoked_at=now() where account_id=$1',[fixture.account.accountId]);
 try{const r=await call({claims:{email:'forged@example.invalid',email_verified:true}});assert.equal(r.status,403,JSON.stringify(r.body));assert.equal(r.body.data,undefined);}
 finally{await repository.upsertCoreIdentity({account:fixture.account,authIdentity:fixture.authIdentity});await seedCurrentProof(0);}
});
test('other APQ, injected query and portal-cookie mixtures cannot execute', async () => {
 for (const options of [{payload:{...operation(),query:'mutation { forbidden }'}},{payload:{...operation(),extensions:{persistedQuery:{version:1,sha256Hash:'2d083b886b80cec31511da7739c1360a636280f4ced7012e081a75112fee9efb'}}}},{headers:{cookie:'portal-role=admin'}}]) {
  const r=await call(options);assert.ok([401,403].includes(r.status),JSON.stringify(r.body));assert.equal(r.body.data,undefined);
 }
});
function identityOperation(){return {operationName:'NativeIdentityStatus',extensions:{persistedQuery:{version:1,sha256Hash:'ddd997fbe168bf5e721b39f37712421e7f02676cac75287cc09ec0e68d6e0073'}}};}
const identityCall=options=>call({scope:'fixture:identity:read',payload:identityOperation(),...options});
test('registered identity-only operation reads own SQL account through actual Yoga without creating a domain grant',async()=>{const r=await identityCall();assert.equal(r.status,200,JSON.stringify(r.body));assert.equal(r.body.errors,undefined);const p=r.body.data.nativeIdentityStatus;assert.equal(p.accountId,fixtures[0].account.accountId);assert.equal(p.emailVerificationRequired,false);assert.equal(p.nostrPublicKeyHex,fixtures[0].nostrIdentity.pubkeyHex);assert.equal(p.role,undefined);assert.ok(!JSON.stringify(r.body).includes('@example.invalid'));assert.match(r.headers.get('cache-control'),/no-store/);});
test('unmapped provider gets setup status without another Core account or key',async()=>{const before=(await pool.query('select count(*)::int n from crays_core.crays_accounts')).rows[0].n;const r=await identityCall({subject:'auth0|ios-native-unmapped'});assert.equal(r.status,200,JSON.stringify(r.body));assert.equal(r.body.data.nativeIdentityStatus.accountMapped,false);assert.equal(r.body.data.nativeIdentityStatus.nostrPublicKeyHex,null);assert.equal((await pool.query('select count(*)::int n from crays_core.crays_accounts')).rows[0].n,before);});
test('identity read shows missing email while normal bootstrap remains403',async()=>{await repository.upsertCoreIdentity({account:{...fixtures[0].account,primaryContact:null}});try{const r=await identityCall();assert.equal(r.status,200,JSON.stringify(r.body));assert.equal(r.body.data.nativeIdentityStatus.emailVerificationRequired,true);assert.equal(r.body.data.nativeIdentityStatus.nostrPublicKeyHex,fixtures[0].nostrIdentity.pubkeyHex);assert.equal((await call()).status,403);}finally{await repository.upsertCoreIdentity({account:fixtures[0].account});await seedCurrentProof(0);}});
test('pending key setup preserves existing public key and never enables bootstrap',async()=>{await repository.upsertCoreIdentity({account:fixtures[0].account,nostrIdentity:{...fixtures[0].nostrIdentity,signerStatus:'pending'}});try{const r=await identityCall();assert.equal(r.status,200,JSON.stringify(r.body));assert.equal(r.body.data.nativeIdentityStatus.nostrSignerVerified,false);assert.equal(r.body.data.nativeIdentityStatus.nostrPublicKeyHex,fixtures[0].nostrIdentity.pubkeyHex);assert.equal((await call()).status,403);}finally{await repository.upsertCoreIdentity({account:fixtures[0].account,nostrIdentity:fixtures[0].nostrIdentity});}});
test('identity-only token cannot bootstrap, inject queries or select foreign accounts',async()=>{assert.equal((await call({scope:'fixture:identity:read'})).status,401);for(const payload of [{...identityOperation(),variables:{accountId:fixtures[1].account.accountId}},{...identityOperation(),query:'query{viewer{tenantId}}'},{...identityOperation(),extensions:operation().extensions}])assert.equal((await identityCall({payload})).status,403);const r=await identityCall({subject:'auth0|ios-native-b',claims:{accountId:fixtures[0].account.accountId,tenant:'foreign',role:'admin'}});assert.equal(r.body.data.nativeIdentityStatus.accountId,fixtures[1].account.accountId);});
test('anonymous request cannot execute private native identity resolver',async()=>{const r=await fetchOwnUnixHTTP(origin+'/api/graphql',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(identityOperation())});const body=await r.json();assert.ok(body.errors?.length);assert.equal(body.data?.nativeIdentityStatus??null,null);});
test('same-account provider verification withdrawal preserves original row but exact Core login is denied',async()=>{
 const before=(await pool.query('select identity_id,account_id from crays_core.auth_identities where provider_key=$1 and provider_subject=$2',['auth0',fixtures[0].authIdentity.providerSubject])).rows[0];
 await repository.upsertCoreIdentity({account:fixtures[0].account,authIdentity:{...fixtures[0].authIdentity,verified:false}});
 try {const after=(await pool.query('select identity_id,account_id,verified from crays_core.auth_identities where provider_key=$1 and provider_subject=$2',['auth0',fixtures[0].authIdentity.providerSubject])).rows[0];assert.equal(after.account_id,before.account_id);assert.equal(after.identity_id,before.identity_id);assert.equal(after.verified,false);assert.equal((await call()).status,403);}
 finally {await repository.upsertCoreIdentity({account:fixtures[0].account,authIdentity:fixtures[0].authIdentity});}
});
test('foreign account cannot take existing provider subject and preceding account edits roll back',async()=>{
 const before=(await pool.query('select display_name,primary_contact from crays_core.crays_accounts where account_id=$1',[fixtures[1].account.accountId])).rows[0];
 await assert.rejects(repository.upsertCoreIdentity({account:{...fixtures[1].account,displayName:'Must not survive rollback'},authIdentity:{...fixtures[0].authIdentity,identityId:'synthetic-foreign-attempt'}}),/CORE_PROVIDER_IDENTITY_ALREADY_BOUND/);
 assert.deepEqual((await pool.query('select display_name,primary_contact from crays_core.crays_accounts where account_id=$1',[fixtures[1].account.accountId])).rows[0],before);
 assert.equal((await repository.getIdentityBundleByProviderSubject('auth0',fixtures[0].authIdentity.providerSubject)).account.account_id,fixtures[0].account.accountId);
 assert.equal((await identityCall()).body.data.nativeIdentityStatus.nostrPublicKeyHex,fixtures[0].nostrIdentity.pubkeyHex);
});
test('new account cannot hijack a bound provider subject or leave an orphaned account',async()=>{
 const account={...fixtures[0].account,accountId:'ios-native-rejected-new-account',craysId:'ios-native-rejected-new-crays'};
 await assert.rejects(repository.upsertCoreIdentity({account,authIdentity:{...fixtures[0].authIdentity,identityId:'synthetic-new-attempt'}}),/CORE_PROVIDER_IDENTITY_ALREADY_BOUND/);
 assert.equal((await pool.query('select count(*)::int n from crays_core.crays_accounts where account_id=$1',[account.accountId])).rows[0].n,0);
});
test('concurrent enrollments for one new provider subject have one durable account and one conflict',async()=>{
 const subject='auth0|ios-native-concurrent-fixture';const accounts=['a','b'].map(suffix=>({...fixtures[0].account,accountId:'ios-native-concurrent-'+suffix,craysId:'ios-native-concurrent-'+suffix}));
 try {
  const results=await Promise.allSettled(accounts.map(account=>repository.upsertCoreIdentity({account,authIdentity:{providerKey:'auth0',providerSubject:subject,methodType:'contact',verified:true}})));
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);const rejected=results.find(r=>r.status==='rejected');assert.match(rejected.reason.message,/CORE_PROVIDER_IDENTITY_ALREADY_BOUND/);
  const owner=await repository.getIdentityBundleByProviderSubject('auth0',subject);assert.ok(accounts.some(a=>a.accountId===owner.account.account_id));
  assert.equal((await pool.query('select count(*)::int n from crays_core.crays_accounts where account_id=any($1::text[])',[accounts.map(a=>a.accountId)])).rows[0].n,1);
  assert.equal((await pool.query('select count(*)::int n from crays_core.auth_identities where provider_key=$1 and provider_subject=$2',['auth0',subject])).rows[0].n,1);
 } finally {await pool.query('delete from crays_core.crays_accounts where account_id=any($1::text[])',[accounts.map(a=>a.accountId)]);}
});
// Receipt rows below are explicit synthetic DB fixtures, NOT proof that a live
// provider/contact command has run. Only the future trusted writer may mint them.
const receiptIssuer='https://email-proof-fixture.auth0.com/';
async function contactRevision(account=fixtures[0].account.accountId){return (await pool.query('select primary_contact_revision::text revision from crays_core.crays_accounts where account_id=$1',[account])).rows[0].revision;}
async function seedEmailReceipt({receipt='synthetic-email-receipt',account=fixtures[0].account.accountId,identity=fixtures[0].authIdentity.identityId,subject=fixtures[0].authIdentity.providerSubject,digest='11'.repeat(32)}={}){
 const revision=await contactRevision(account);const address=(await pool.query('select primary_contact from crays_core.crays_accounts where account_id=$1',[account])).rows[0].primary_contact;
 await pool.query(`insert into crays_core.account_email_verifications(receipt_id,account_id,contact_revision,contact_address,auth_identity_id,provider_subject,provider_issuer,proof_method,proof_token_digest,idempotency_key) values($1,$2,$3,$4,$5,$6,$7,'auth0-userinfo-verified-email',$8,$1)`,[receipt,account,revision,address,identity,subject,receiptIssuer,digest]);return revision;
}
async function clearEmailReceipts(){await pool.query('delete from crays_core.account_email_verifications');}
test('actual HTTP gate requires new contact-version receipt after address change and restoration',async()=>{
 try{assert.equal((await call()).status,200);await repository.upsertCoreIdentity({account:{...fixtures[0].account,primaryContact:'new-unverified@example.invalid'}});assert.equal((await identityCall()).body.data.nativeIdentityStatus.emailVerificationRequired,true);assert.equal((await call()).status,403);
 await repository.upsertCoreIdentity({account:fixtures[0].account});assert.equal((await call()).status,403);await seedCurrentProof(0);assert.equal((await call()).status,200);assert.equal((await identityCall()).body.data.nativeIdentityStatus.emailVerificationRequired,false);}
 finally{await repository.upsertCoreIdentity({account:fixtures[0].account});await seedCurrentProof(0);}
});
test('revoked current receipt denies actual HTTP Bootstrap despite generic verified flag',async()=>{
 try{await pool.query('update crays_core.account_email_verifications set revoked_at=now() where account_id=$1',[fixtures[0].account.accountId]);assert.equal((await call()).status,403);assert.equal((await identityCall()).body.data.nativeIdentityStatus.emailVerificationRequired,true);}
 finally{await seedCurrentProof(0);}
});
test('legacy verified flags and additive migration do not manufacture email receipts',async()=>{await clearEmailReceipts();assert.equal(await getCurrentAccountEmailVerification(fixtures[0].account.accountId,receiptIssuer),null);assert.equal((await pool.query('select count(*)::int n from crays_core.account_email_verifications')).rows[0].n,0);});
test('actual same-address revision and same-provider receipt are read without exposing bearer or email',async()=>{
 try {const revision=await seedEmailReceipt();const value=await getCurrentAccountEmailVerification(fixtures[0].account.accountId,receiptIssuer);assert.equal(value.contact_revision,revision);assert.equal(value.receipt_id,'synthetic-email-receipt');assert.equal(value.email,undefined);assert.equal(value.proof_token_digest,undefined);assert.equal(await getCurrentAccountEmailVerification(fixtures[0].account.accountId,'https://foreign.auth0.com/'),null);}
 finally{await clearEmailReceipts();}
});
test('address change and return to old value cannot reuse old contact proof or rewind revision',async()=>{
 try {const old=await seedEmailReceipt();await repository.upsertCoreIdentity({account:{...fixtures[0].account,primaryContact:'changed@example.invalid'}});assert.equal(BigInt(await contactRevision()),BigInt(old)+1n);assert.equal(await getCurrentAccountEmailVerification(fixtures[0].account.accountId,receiptIssuer),null);
 await repository.upsertCoreIdentity({account:fixtures[0].account});assert.equal(BigInt(await contactRevision()),BigInt(old)+2n);assert.equal(await getCurrentAccountEmailVerification(fixtures[0].account.accountId,receiptIssuer),null);
 await pool.query('update crays_core.crays_accounts set primary_contact_revision=$2 where account_id=$1',[fixtures[0].account.accountId,old]);assert.equal(BigInt(await contactRevision()),BigInt(old)+2n);}
 finally{await repository.upsertCoreIdentity({account:fixtures[0].account});await clearEmailReceipts();}
});
test('unrelated profile update preserves contact proof while revoke invalidates it',async()=>{
 try {const revision=await seedEmailReceipt();await repository.upsertCoreIdentity({account:{...fixtures[0].account,displayName:'Synthetic renamed fixture'}});assert.equal(await contactRevision(),revision);assert.ok(await getCurrentAccountEmailVerification(fixtures[0].account.accountId,receiptIssuer));await pool.query('update crays_core.account_email_verifications set revoked_at=now()');assert.equal(await getCurrentAccountEmailVerification(fixtures[0].account.accountId,receiptIssuer),null);}
 finally{await repository.upsertCoreIdentity({account:fixtures[0].account});await clearEmailReceipts();}
});
test('foreign auth identity receipt is not accepted and proof digest cannot be replayed for another account',async()=>{
 try {await seedEmailReceipt({identity:fixtures[1].authIdentity.identityId,subject:fixtures[1].authIdentity.providerSubject});assert.equal(await getCurrentAccountEmailVerification(fixtures[0].account.accountId,receiptIssuer),null);
 await assert.rejects(seedEmailReceipt({receipt:'synthetic-duplicate-proof',account:fixtures[1].account.accountId,identity:fixtures[1].authIdentity.identityId,subject:fixtures[1].authIdentity.providerSubject}),{code:'23505'});}
 finally{await clearEmailReceipts();}
});
test('transactional schema rollback restores version and receipt data when aborted',async()=>{
 const revision=await contactRevision();const client=await pool.connect();try{await client.query('begin');await client.query(readFileSync(new URL('../../database/migrations/0207_core_account_email_verification.down.sql',import.meta.url),'utf8'));await client.query('rollback');assert.equal(await contactRevision(),revision);}
 finally{client.release();}
});

async function registrationFixture({secondarySubject='auth0|registration-email-fixture',email='registration@example.invalid',writeScope=true,signal}={}){
 const records=new Map();
 async function signed(subject,scope,requestSignal){const now=Math.floor(Date.now()/1000);const token=await new SignJWT({sub:subject,azp:'native_http_fixture',scope}).setProtectedHeader({alg:'RS256',typ:'JWT',kid:jwk.kid}).setIssuer(issuer).setAudience(audience).setIssuedAt(now).setExpirationTime(now+300).sign(privateKey);records.set('Bearer '+token,{sub:subject,email,email_verified:true});return new Request(origin+'/api/graphql',{method:'POST',headers:{authorization:'Bearer '+token},signal:requestSignal});}
 const transport=async(url,options)=>{if(String(url)===issuer+'.well-known/jwks.json')return Response.json({keys:[jwk]});assert.equal(String(url),issuer+'userinfo');return Response.json(records.get(options.headers.authorization));};
 const service=createNativeEmailRegistrationService({issuer,audience,nativeClientIds:['native_http_fixture'],requiredIdentityScope:'fixture:identity:read',requiredContactWriteScope:'fixture:email:write'},{fetch:transport});
 const primary=await signed(fixtures[0].authIdentity.providerSubject,'fixture:identity:read'+(writeScope?' fixture:email:write':''),signal);
 const secondary=await signed(secondarySubject,'fixture:identity:read');const proof=await service.readEmailProof(secondary);
 return {service,primary,secondary,proof,options:{idempotencyKey:'synthetic-registration-command',expectedContactRevision:await contactRevision()}};
}
async function cleanupRegistration(){await clearEmailReceipts();await pool.query("delete from crays_core.auth_identities where provider_key='auth0' and provider_subject='auth0|registration-email-fixture'");await repository.upsertCoreIdentity({account:fixtures[0].account});}
test('actual verified-provider command links email to original account, preserves Nostr and commits one durable receipt/audit',async()=>{
 try{const f=await registrationFixture();const beforeKey=(await repository.getIdentityBundleByProviderSubject('auth0',fixtures[0].authIdentity.providerSubject)).nostrIdentity.pubkey_hex;
 const result=await f.service.register(f.primary,f.secondary,f.proof,f.options);assert.equal(result.current,true);assert.equal(result.replayed,false);
 const linked=await repository.getIdentityBundleByProviderSubject('auth0','auth0|registration-email-fixture');assert.equal(linked.account.account_id,fixtures[0].account.accountId);assert.equal(linked.account.primary_contact,'registration@example.invalid');assert.equal(linked.nostrIdentity.pubkey_hex,beforeKey);
 assert.equal((await getCurrentAccountEmailVerification(fixtures[0].account.accountId,issuer)).receipt_id,result.receiptId);
 const audit=await pool.query("select metadata from crays_core.audit_events where action='identity.registration_email.verified' and metadata->>'receiptId'=$1",[result.receiptId]);assert.equal(audit.rows.length,1);assert.equal(JSON.stringify(audit.rows).includes('registration@example.invalid'),false);}
 finally{await cleanupRegistration();}
});
test('same command is idempotent and later contact change is reported without overwriting it',async()=>{
 try{const f=await registrationFixture();const first=await f.service.register(f.primary,f.secondary,f.proof,f.options);const second=await f.service.register(f.primary,f.secondary,f.proof,f.options);assert.equal(second.receiptId,first.receiptId);assert.equal(second.replayed,true);assert.equal(second.current,true);
 await repository.upsertCoreIdentity({account:{...fixtures[0].account,primaryContact:'later@example.invalid'}});const old=await f.service.register(f.primary,f.secondary,f.proof,f.options);assert.equal(old.current,false);assert.equal((await repository.getIdentityBundleByProviderSubject('auth0',fixtures[0].authIdentity.providerSubject)).account.primary_contact,'later@example.invalid');}
 finally{await cleanupRegistration();}
});
test('secondary identity already mapped to another account cannot be merged or move either account/key',async()=>{
 try{const before=await contactRevision();const f=await registrationFixture({secondarySubject:fixtures[1].authIdentity.providerSubject,email:fixtures[1].account.primaryContact});await assert.rejects(f.service.register(f.primary,f.secondary,f.proof,f.options),/IDENTITY_ALREADY_BOUND/);assert.equal(await contactRevision(),before);assert.equal((await pool.query('select count(*)::int n from crays_core.account_email_verifications')).rows[0].n,0);assert.equal((await repository.getIdentityBundleByProviderSubject('auth0',fixtures[1].authIdentity.providerSubject)).account.account_id,fixtures[1].account.accountId);}
 finally{await cleanupRegistration();}
});
test('read-only primary scope, forged proof and stale contact revision cannot write registrations',async()=>{
 try{const read=await registrationFixture({writeScope:false});await assert.rejects(read.service.register(read.primary,read.secondary,read.proof,read.options),/NATIVE_AUTHENTICATION_REQUIRED/);
 const f=await registrationFixture();await assert.rejects(f.service.register(f.primary,f.secondary,{...f.proof},f.options),/NATIVE_EMAIL_PROOF_REQUIRED/);await assert.rejects(f.service.register(f.primary,f.secondary,f.proof,{...f.options,expectedContactRevision:'999999'}),/CONTACT_CHANGED/);assert.equal((await pool.query("select count(*)::int n from crays_core.auth_identities where provider_subject='auth0|registration-email-fixture'")).rows[0].n,0);}
 finally{await cleanupRegistration();}
});
test('concurrent identical registrations commit one receipt with one replay and no duplicate identity',async()=>{
 try{const f=await registrationFixture();const results=await Promise.all([f.service.register(f.primary,f.secondary,f.proof,f.options),f.service.register(f.primary,f.secondary,f.proof,f.options)]);assert.equal(results[0].receiptId,results[1].receiptId);assert.equal(results.filter(r=>r.replayed).length,1);assert.equal((await pool.query('select count(*)::int n from crays_core.account_email_verifications')).rows[0].n,1);}
 finally{await cleanupRegistration();}
});
test('actual audit write failure rolls back contact, secondary identity and receipt together',async()=>{
 await pool.query("create function crays_core.synthetic_email_audit_failure() returns trigger language plpgsql as $$begin if new.action='identity.registration_email.verified' then raise exception 'synthetic audit failure'; end if; return new;end;$$;create trigger synthetic_email_audit_failure before insert on crays_core.audit_events for each row execute function crays_core.synthetic_email_audit_failure();");
 try{const f=await registrationFixture(),before=await contactRevision();await assert.rejects(f.service.register(f.primary,f.secondary,f.proof,f.options),/NATIVE_EMAIL_REGISTRATION_UNAVAILABLE/);assert.equal(await contactRevision(),before);assert.equal((await pool.query('select count(*)::int n from crays_core.account_email_verifications')).rows[0].n,0);assert.equal(await repository.getIdentityBundleByProviderSubject('auth0','auth0|registration-email-fixture'),null);}
 finally{await pool.query('drop trigger synthetic_email_audit_failure on crays_core.audit_events;drop function crays_core.synthetic_email_audit_failure();');await cleanupRegistration();}
});
test('aborted primary while waiting for real account lock cannot commit a later email link',async()=>{
 const blocker=await pool.connect();const controller=new AbortController();let pending;
 try{await blocker.query('begin');await blocker.query('select account_id from crays_core.crays_accounts where account_id=$1 for update',[fixtures[0].account.accountId]);const f=await registrationFixture({signal:controller.signal});pending=f.service.register(f.primary,f.secondary,f.proof,f.options);const observed=pending.then(value=>({ok:true,value}),error=>({ok:false,error}));
 let waiting=false;for(let i=0;i<100;i++){await blocker.query('select pg_stat_clear_snapshot()');const rows=await blocker.query("select count(*)::int n from pg_stat_activity where datname=current_database() and wait_event_type='Lock' and query like '%from crays_core.auth_identities i join crays_core.crays_accounts a%'");if(rows.rows[0].n){waiting=true;break;}await new Promise(r=>setTimeout(r,10));}assert.equal(waiting,true);controller.abort();await blocker.query('rollback');const result=await observed;assert.equal(result.ok,false);assert.match(result.error.message,/CANCELLED/);assert.equal(await repository.getIdentityBundleByProviderSubject('auth0','auth0|registration-email-fixture'),null);}
 finally{controller.abort();await blocker.query('rollback').catch(()=>{});blocker.release();await pending?.catch(()=>{});await cleanupRegistration();}
});
const emailSetupOperation=()=>({operationName:'NativeEmailSetup',extensions:{persistedQuery:{version:1,sha256Hash:'b4cc2f723cd30ca91f38e65ec55d7d537189ffd4d0a7ef569829a10a8401d547'}}});
const emailRegisterOperation=variables=>({operationName:'NativeRegisterEmail',extensions:{persistedQuery:{version:1,sha256Hash:'ab20c81eea12948255c864d930c7beb0e1124fe5b72bd09baa730406bd364dc9'}},variables});
async function emailBearer(subject='auth0|registration-email-fixture',email='registration@example.invalid'){const now=Math.floor(Date.now()/1000);const token=await new SignJWT({sub:subject,azp:'native_http_fixture',scope:'fixture:identity:read',jti:randomUUID()}).setProtectedHeader({alg:'RS256',typ:'JWT',kid:jwk.kid}).setIssuer(issuer).setAudience(audience).setIssuedAt(now).setExpirationTime(now+300).sign(privateKey);emailUserinfoResponses.set('Bearer '+token,{sub:subject,email,email_verified:true});return'Bearer '+token;}
test('registered NativeEmailSetup exposes only own contact revision through real HTTP',async()=>{const r=await call({scope:'fixture:identity:read',payload:emailSetupOperation()});assert.equal(r.status,200,JSON.stringify(r.body));const v=r.body.data.nativeIdentityStatus;assert.equal(v.accountMapped,true);assert.equal(v.contactRevision,await contactRevision());assert.equal(v.accountId,undefined);assert.equal(v.email,undefined);});
test('actual current contact revision matches exact Core contact snapshot and remains available before email proof',async()=>{
 const {getCurrentAccountContactRevision}=await import('../../src/db/account-email-verification.ts');
 const a=fixtures[0].account;
 assert.equal(await getCurrentAccountContactRevision(a.accountId,a.primaryContact,'contact'),await contactRevision());
 assert.equal(await getCurrentAccountContactRevision(a.accountId,'foreign@example.invalid','contact'),null);
 assert.equal(await getCurrentAccountContactRevision(a.accountId,a.primaryContact,'npub'),null);
 assert.equal(await getCurrentAccountContactRevision('missing-account',a.primaryContact,'contact'),null);
 await pool.query('update crays_core.account_email_verifications set revoked_at=now() where account_id=$1',[a.accountId]);
 try{assert.equal(await getCurrentAccountContactRevision(a.accountId,a.primaryContact,'contact'),await contactRevision());}
 finally{await pool.query('update crays_core.account_email_verifications set revoked_at=null where account_id=$1',[a.accountId]);}
});
test('registered email proof does not grant exact Core login; later explicit synthetic approval preserves same account',async()=>{
 try{const secondary=await emailBearer();const variables={idempotencyKey:'http-email-command',expectedContactRevision:await contactRevision()};const r=await call({scope:'fixture:identity:read fixture:email:write',payload:emailRegisterOperation(variables),headers:{'x-crays-email-authorization':secondary}});assert.equal(r.status,200,JSON.stringify(r.body));assert.equal(r.body.data.nativeRegisterEmail.current,true);assert.ok(!JSON.stringify(r.body).includes(secondary));assert.match(r.headers.get('cache-control'),/no-store/);
 const retry=await call({scope:'fixture:identity:read fixture:email:write',payload:emailRegisterOperation(variables),headers:{'x-crays-email-authorization':secondary}});assert.equal(retry.body.data.nativeRegisterEmail.receiptId,r.body.data.nativeRegisterEmail.receiptId);assert.equal(retry.body.data.nativeRegisterEmail.replayed,true);
 const beforeApproval=await call({subject:'auth0|registration-email-fixture'});assert.equal(beforeApproval.status,403,JSON.stringify(beforeApproval.body));
 await pool.query("insert into crays_native_qualification.exact_bindings(subject) values('auth0|registration-email-fixture')");
 const login=await call({subject:'auth0|registration-email-fixture'});assert.equal(login.status,200,JSON.stringify(login.body));assert.equal(login.body.data.viewer.tenantId,fixtures[0].organization.organizationId);assert.equal((await identityCall({subject:'auth0|registration-email-fixture'})).body.data.nativeIdentityStatus.accountId,fixtures[0].account.accountId);
 }finally{await pool.query("delete from crays_native_qualification.exact_bindings where subject='auth0|registration-email-fixture'");await cleanupRegistration();}
});
test('GraphQL write rejects absent scope before Userinfo and refuses extra account selector',async()=>{
 const secondary=await emailBearer(),variables={idempotencyKey:'http-denied',expectedContactRevision:await contactRevision()},before=emailUserinfoReads;
 const denied=await call({scope:'fixture:identity:read',payload:emailRegisterOperation(variables),headers:{'x-crays-email-authorization':secondary}});assert.equal(denied.status,401,JSON.stringify(denied.body));assert.equal(emailUserinfoReads,before);
 const injected=await call({scope:'fixture:identity:read fixture:email:write',payload:emailRegisterOperation({...variables,accountId:fixtures[1].account.accountId}),headers:{'x-crays-email-authorization':secondary}});assert.equal(injected.status,403);assert.equal(emailUserinfoReads,before);
 const missing=await call({scope:'fixture:identity:read fixture:email:write',payload:emailRegisterOperation(variables)});assert.equal(missing.status,403);
});
test('foreign email login identity produces actual GraphQL409 without merge or leaked owner',async()=>{
 const secondary=await emailBearer(fixtures[1].authIdentity.providerSubject,fixtures[1].account.primaryContact);const r=await call({scope:'fixture:identity:read fixture:email:write',payload:emailRegisterOperation({idempotencyKey:'http-foreign',expectedContactRevision:await contactRevision()}),headers:{'x-crays-email-authorization':secondary}});assert.equal(r.status,409,JSON.stringify(r.body));assert.match(r.body.errors[0].message,/IDENTITY_ALREADY_BOUND/);assert.ok(!JSON.stringify(r.body).includes(fixtures[1].account.accountId));
});
test('secondary credential cannot be smuggled into ordinary registered identity read',async()=>{const secondary=await emailBearer();const r=await identityCall({headers:{'x-crays-email-authorization':secondary}});assert.equal(r.status,403);});
test('anonymous or browser-cookie request cannot execute new registered email mutation',async()=>{
 const secondary=await emailBearer(),payload=emailRegisterOperation({idempotencyKey:'http-anonymous',expectedContactRevision:await contactRevision()}),before=emailUserinfoReads;
 const r=await fetchOwnUnixHTTP(origin+'/api/graphql',{method:'POST',headers:{'content-type':'application/json','x-crays-email-authorization':secondary},body:JSON.stringify(payload)});const body=await r.json();assert.ok(body.errors?.length);assert.equal(body.data?.nativeRegisterEmail??null,null);assert.equal(emailUserinfoReads,before);
 const cookie=await call({scope:'fixture:identity:read fixture:email:write',payload,headers:{'x-crays-email-authorization':secondary,cookie:'untrusted=browser'}});assert.ok([401,403].includes(cookie.status));assert.equal(emailUserinfoReads,before);
});
test('unconfigured contact write scope disables mutation even after earlier successful request',async()=>{
 const saved=process.env.CRAYS_NATIVE_AUTH_CONTACT_WRITE_SCOPE;try{process.env.CRAYS_NATIVE_AUTH_CONTACT_WRITE_SCOPE='';const before=emailUserinfoReads;const r=await call({scope:'fixture:identity:read fixture:email:write',payload:emailRegisterOperation({idempotencyKey:'http-disabled',expectedContactRevision:await contactRevision()}),headers:{'x-crays-email-authorization':await emailBearer()}});assert.equal(r.status,503,JSON.stringify(r.body));assert.match(r.body.errors[0].message,/NATIVE_CONTACT_WRITE_NOT_CONFIGURED/);assert.equal(emailUserinfoReads,before);}finally{process.env.CRAYS_NATIVE_AUTH_CONTACT_WRITE_SCOPE=saved;}
});
test('JWKS stays pinned to the controlled fixture; real Nostr keys, relays and external APIs are never used', () => {assert.ok(jwksFetches>=1 && jwksFetches<=6);});

const {nativePersonalDocuments}=await import('../../src/graphql/native-personal-messenger-documents.ts');
const personalScope='fixture:identity:read fixture:personal:read fixture:personal:write';
function personalOperation(name,variables={}){const d=nativePersonalDocuments[name];return {operationName:name,extensions:{persistedQuery:{version:1,sha256Hash:createHash('sha256').update(d.document).digest('hex')}},variables};}
async function personalCall(name,variables={},extra={}){return call({scope:personalScope,payload:personalOperation(name,variables),...extra});}
async function seedPersonal(){
 process.env.CRAYS_NATIVE_AUTH_PERSONAL_READ_SCOPE='fixture:personal:read';process.env.CRAYS_NATIVE_AUTH_PERSONAL_WRITE_SCOPE='fixture:personal:write';
 for(let i=0;i<2;i++){
  await repository.upsertCoreIdentity(fixtures[i]);await seedCurrentProof(i);
  const person='native-personal-'+i,agent='personal-'+String(i?'b':'a').repeat(48);
  await pool.query("insert into crays_core.canonical_people(canonical_person_id,person_version,account_id,display_name_sha256,encrypted_display_name_ref,field_authority_version,lifecycle_state) values($1,1,$2,repeat('a',64),'secret://synthetic-native-personal','synthetic-only','active') on conflict do nothing",[person,fixtures[i].account.accountId]);
  await pool.query("insert into crays_core.personal_agent_standard_assignments(canonical_person_id,account_id,agent_id,package_version,package_sha256,everyday_skill_sha256,assignment_proposal) values($1,$2,$3,'synthetic-intent-only',repeat('a',64),repeat('b',64),'{}'::jsonb) on conflict do nothing",[person,fixtures[i].account.accountId,agent]);
 }
}
let ownA,ownB,originalReceipt,originalInput;
test('own-person fixed APQs bind real canonical conversations for two separate accounts without business guest grants',async()=>{
 await seedPersonal();
 const a=await personalCall('BindPersonalMessenger',{expectedContactRevision:await contactRevision()}),b=await personalCall('BindPersonalMessenger',{expectedContactRevision:await contactRevision(fixtures[1].account.accountId)},{subject:fixtures[1].authIdentity.providerSubject});
 assert.equal(a.status,200,JSON.stringify(a.body));assert.equal(b.status,200,JSON.stringify(b.body));ownA=a.body.data.bindPersonalMessenger;ownB=b.body.data.bindPersonalMessenger;
 assert.notEqual(ownA.bindingId,ownB.bindingId);assert.notEqual(ownA.conversationId,ownB.conversationId);
 const replay=await personalCall('BindPersonalMessenger',{expectedContactRevision:await contactRevision()});assert.equal(replay.body.data.bindPersonalMessenger.bindingId,ownA.bindingId);
 const rows=await pool.query("select c.conversation_type,c.visibility_roles,p.account_id,p.can_invite,p.can_share_externally from crays_core.conversations c join crays_core.conversation_participants p on p.conversation_id=c.conversation_id order by p.account_id");assert.equal(rows.rows.length,2);assert.ok(rows.rows.every(r=>r.conversation_type==='personal_chuck'&&r.visibility_roles.length===0&&!r.can_invite&&!r.can_share_externally));
});
test('real concurrent ingress commits one immutable original, receipt and pending-admission record; never sent or answered',async()=>{
 originalInput={bindingId:ownA.bindingId,expectedBindingRevision:ownA.revision,expectedContactRevision:await contactRevision(),idempotencyKey:'native-personal-original',body:'Private original 🌊 e\u0301'};
 const pair=await Promise.all([personalCall('ReceiveScopedAgentMessage',originalInput),personalCall('ReceiveScopedAgentMessage',originalInput)]);
 for(const r of pair)assert.equal(r.status,200,JSON.stringify(r.body));
 const receipts=pair.map(r=>r.body.data.receiveScopedAgentMessage);originalReceipt=receipts[0];assert.equal(receipts[0].receiptId,receipts[1].receiptId);assert.equal(receipts.filter(r=>r.replayed).length,1);assert.equal(originalReceipt.outcome,'STORED_RUNTIME_UNAVAILABLE');
 const records=await pool.query('select body,delivery_status from crays_core.messages where conversation_id=$1',[ownA.conversationId]);assert.deepEqual(records.rows,[{body:originalInput.body,delivery_status:'not_sent'}]);
 assert.equal((await pool.query("select count(*)::int n from crays_core.personal_messenger_outbox where state='waiting_runtime_admission'")).rows[0].n,1);
 await assert.rejects(pool.query("update crays_core.messages set body='changed' where message_id=$1",[originalReceipt.messageId]),/immutable/);
});
test('lost-ACK receipt lookup and reread preserve same actual original; changed idempotency payload conflicts',async()=>{
 const recovered=await personalCall('GetAgentDeliveryReceipt',{idempotencyKey:originalInput.idempotencyKey});assert.equal(recovered.status,200,JSON.stringify(recovered.body));assert.equal(recovered.body.data.agentDeliveryReceipt.receiptId,originalReceipt.receiptId);
 const reread=await personalCall('NativePersonalConversation');assert.equal(reread.body.data.nativePersonalConversation.messages[0].messageId,originalReceipt.messageId);assert.equal(reread.body.data.nativePersonalConversation.messages[0].body,originalInput.body);
 const conflict=await personalCall('ReceiveScopedAgentMessage',{...originalInput,body:'A changed original'});assert.equal(conflict.status,409,JSON.stringify(conflict.body));assert.match(conflict.body.errors[0].message,/IDEMPOTENCY_CONFLICT/);
});
test('second account cannot substitute conversation binding or observe first account receipt despite forged claims',async()=>{
 const b={subject:fixtures[1].authIdentity.providerSubject,claims:{accountId:fixtures[0].account.accountId,role:'admin',agent:'forged'}};
 const forged=await personalCall('ReceiveScopedAgentMessage',{...originalInput,expectedContactRevision:await contactRevision(fixtures[1].account.accountId)},b);assert.equal(forged.status,409,JSON.stringify(forged.body));assert.match(forged.body.errors[0].message,/BINDING_CHANGED/);
 const receipt=await personalCall('GetAgentDeliveryReceipt',{idempotencyKey:originalInput.idempotencyKey},b);assert.equal(receipt.status,503,JSON.stringify(receipt.body));assert.ok(!JSON.stringify(receipt.body).includes(originalReceipt.receiptId));
 const own=await personalCall('NativePersonalConversation',{},b);assert.deepEqual(own.body.data.nativePersonalConversation.messages,[]);
});
test('missing scope, cookies, extra actor selectors and malformed body fail closed before a write',async()=>{
 const scope=await personalCall('ReceiveScopedAgentMessage',originalInput,{scope:'fixture:identity:read fixture:personal:read'});assert.ok([401,403].includes(scope.status),JSON.stringify(scope.body));
 const selector=await personalCall('ReceiveScopedAgentMessage',{...originalInput,accountId:fixtures[1].account.accountId});assert.equal(selector.status,403);
 const cookie=await personalCall('NativePersonalConversation',{}, {headers:{cookie:'forged=1'}});assert.equal(cookie.status,403);
 const oversized=await personalCall('ReceiveScopedAgentMessage',{...originalInput,body:'x'.repeat(16385)});assert.equal(oversized.status,403);
 const malformedUnicode=await personalCall('ReceiveScopedAgentMessage',{...originalInput,body:'invalid '+String.fromCharCode(0xD800)});assert.equal(malformedUnicode.status,403);
});
test('current contact revocation, removed participant, revoked binding and blocked canonical person deny subsequent ingress/read',async()=>{
 for(const [change,restore] of [
 ["update crays_core.account_email_verifications set revoked_at=now() where account_id=$1","update crays_core.account_email_verifications set revoked_at=null where account_id=$1"],
 ["update crays_core.conversation_participants set status='removed' where account_id=$1","update crays_core.conversation_participants set status='active' where account_id=$1"],
 ["update crays_core.personal_messenger_bindings set status='revoked',revision=revision+1 where account_id=$1","update crays_core.personal_messenger_bindings set status='active',revision=revision-1 where account_id=$1"],
 ["update crays_core.canonical_people set lifecycle_state='suspended' where account_id=$1","update crays_core.canonical_people set lifecycle_state='active' where account_id=$1"],
 ]){await pool.query(change,[fixtures[0].account.accountId]);try{const denied=await personalCall('NativePersonalConversation');assert.ok(denied.body.errors?.length,JSON.stringify(denied.body));assert.equal(denied.body.data,null);const receive=await personalCall('ReceiveScopedAgentMessage',{...originalInput,idempotencyKey:'revocation-must-not-persist'});assert.ok(receive.body.errors?.length);}finally{await pool.query(restore,[fixtures[0].account.accountId]);}}
 assert.equal((await pool.query('select count(*)::int n from crays_core.personal_messenger_ingress_receipts')).rows[0].n,1);
});


test('actual lost HTTP ACK after committed personal ingress recovers one durable receipt without resending',async()=>{
 const input={...originalInput,idempotencyKey:'actual-dropped-ack',body:'Original survives dropped HTTP response'};
 dropCommittedPersonalResponse=true;
 await assert.rejects(personalCall('ReceiveScopedAgentMessage',input),/fetch failed|socket|other side/i);
 const status=await personalCall('GetAgentDeliveryReceipt',{idempotencyKey:input.idempotencyKey});assert.equal(status.status,200,JSON.stringify(status.body));
 const receipt=status.body.data.agentDeliveryReceipt;assert.equal(receipt.outcome,'STORED_RUNTIME_UNAVAILABLE');
 const retry=await personalCall('ReceiveScopedAgentMessage',input);assert.equal(retry.body.data.receiveScopedAgentMessage.receiptId,receipt.receiptId);assert.equal(retry.body.data.receiveScopedAgentMessage.replayed,true);
 assert.equal((await pool.query('select count(*)::int n from crays_core.personal_messenger_ingress_receipts where idempotency_key=$1',[input.idempotencyKey])).rows[0].n,1);
});
test('actual pending-admission insert failure rolls back original, receipt and conversation update',async()=>{
 await pool.query("create function crays_core.synthetic_personal_outbox_failure() returns trigger language plpgsql as $$begin raise exception 'synthetic outbox failure';end$$;create trigger synthetic_personal_outbox_failure before insert on crays_core.personal_messenger_outbox for each row execute function crays_core.synthetic_personal_outbox_failure();");
 const before=await pool.query('select last_message_at from crays_core.conversations where conversation_id=$1',[ownA.conversationId]);
 try{const failed=await personalCall('ReceiveScopedAgentMessage',{...originalInput,idempotencyKey:'rollback-original',body:'Must never persist'});assert.equal(failed.status,503,JSON.stringify(failed.body));assert.equal((await pool.query("select count(*)::int n from crays_core.messages where body='Must never persist'")).rows[0].n,0);assert.equal((await pool.query("select count(*)::int n from crays_core.personal_messenger_ingress_receipts where idempotency_key='rollback-original'")).rows[0].n,0);assert.deepEqual((await pool.query('select last_message_at from crays_core.conversations where conversation_id=$1',[ownA.conversationId])).rows,before.rows);}
 finally{await pool.query('drop trigger synthetic_personal_outbox_failure on crays_core.personal_messenger_outbox;drop function crays_core.synthetic_personal_outbox_failure();');}
});
test('new own-person RLS actually isolates non-owner PostgreSQL role without business access policy',async()=>{
 await pool.query('create role ios_personal_rls_fixture nologin;grant usage on schema crays_core to ios_personal_rls_fixture;grant select on crays_core.conversations,crays_core.conversation_participants,crays_core.messages,crays_core.personal_messenger_bindings,crays_core.personal_messenger_ingress_receipts,crays_core.personal_messenger_outbox to ios_personal_rls_fixture;');
 const client=await pool.connect();
 try{for(let i=0;i<2;i++){
  await client.query('begin');await client.query('set local role ios_personal_rls_fixture');await client.query("select set_config('crays.app_role','core_service',true),set_config('crays.native_personal_account',$1,true)",[fixtures[i].account.accountId]);
  const bindings=await client.query('select account_id from crays_core.personal_messenger_bindings');assert.deepEqual(bindings.rows,[{account_id:fixtures[i].account.accountId}]);
  const conversations=await client.query('select conversation_id from crays_core.conversations');assert.deepEqual(conversations.rows,[{conversation_id:i?ownB.conversationId:ownA.conversationId}]);
  const receipts=await client.query('select account_id from crays_core.personal_messenger_ingress_receipts');assert.ok(receipts.rows.every(r=>r.account_id===fixtures[i].account.accountId));if(i)assert.equal(receipts.rows.length,0);else assert.equal(receipts.rows.length,2);
  await client.query('rollback');
 }}finally{await client.query('rollback');client.release();}
});


test('aborted actual HTTP personal ingress releases its pool connection while the competing advisory lock remains held',async()=>{
 const blocker=await pool.connect(),controller=new AbortController();let pending;
 const key='bounded-held-lock-'+randomUUID();personalRequestAbortController=controller;
 try{
  await blocker.query('begin');
  await blocker.query("select pg_advisory_xact_lock(hashtextextended($1,0))",['native-personal:'+fixtures[0].account.accountId]);
  pending=personalCall('ReceiveScopedAgentMessage',{...originalInput,idempotencyKey:key,body:'Must not persist after cancelled held-lock wait'});
  const observed=pending.then(value=>({settled:true,value}),error=>({settled:true,error}));
  let waiting=false;
  for(let i=0;i<100;i++){
   await blocker.query('select pg_stat_clear_snapshot()');
   const rows=await blocker.query("select count(*)::int n from pg_stat_activity where datname=current_database() and wait_event_type='Lock' and query like 'select pg_advisory_xact_lock%'");
   if(rows.rows[0].n){waiting=true;break;}await new Promise(resolve=>setTimeout(resolve,10));
  }
  assert.equal(waiting,true,'Must observe the actual command blocked in PostgreSQL first');
  controller.abort();
  let timer;const bounded=new Promise(resolve=>{timer=setTimeout(()=>resolve({settled:false}),3500);});
  let result;try{result=await Promise.race([observed,bounded]);}finally{clearTimeout(timer);}
  assert.equal(result.settled,true,'Aborted ingress must settle before the blocker releases its lock');
  assert.equal(result.error,undefined);
  assert.ok(result.value.body.errors?.some(error=>/NATIVE_PERSONAL_(UNAVAILABLE|CANCELLED)/.test(error.extensions?.code)));
  assert.equal(result.value.body.data,null);
  // This second real query can finish only when ingress returns its connection;
  // the blocker deliberately remains in its transaction until finally below.
  assert.equal(pool.idleCount,1);
  assert.equal((await pool.query('select 1 n')).rows[0].n,1);
  assert.equal((await blocker.query('select count(*)::int n from crays_core.personal_messenger_ingress_receipts where idempotency_key=$1',[key])).rows[0].n,0);
 }finally{
  personalRequestAbortController=undefined;controller.abort();
  await blocker.query('rollback').catch(()=>{});blocker.release();await pending?.catch(()=>{});
 }
});

test('stable older-page cursor returns every own stored original without duplicates or foreign cursor disclosure',async()=>{
 const now=Date.now()-100000;
 for(let i=0;i<51;i++)await pool.query("insert into crays_core.messages(message_id,conversation_id,sender_account_id,sender_role,channel,message_type,body,visibility,delivery_status,created_at) values($1,$2,$3,'guest','in_app','shared_comment',$4,'internal','not_sent',$5::timestamptz+$6::integer*interval '1 microsecond')",['personal-message-00000000-0000-4000-8000-'+String(5000+i).padStart(12,'0'),ownA.conversationId,fixtures[0].account.accountId,'Synthetic retained source '+i,new Date(now),i]);
 const first=await personalCall('NativePersonalConversation');assert.equal(first.status,200,JSON.stringify(first.body));const page=first.body.data.nativePersonalConversation;assert.equal(page.messages.length,50);assert.equal(page.hasOlderMessages,true);assert.ok(page.nextBeforeMessageId);
 const next=await personalCall('NativePersonalConversation',{beforeMessageId:page.nextBeforeMessageId});assert.equal(next.status,200,JSON.stringify(next.body));const older=next.body.data.nativePersonalConversation;assert.equal(older.messages.length,3);assert.equal(older.hasOlderMessages,false);assert.equal(older.nextBeforeMessageId,null);assert.equal(new Set([...page.messages,...older.messages].map(r=>r.messageId)).size,53);
 const foreign=await personalCall('NativePersonalConversation',{beforeMessageId:page.nextBeforeMessageId},{subject:fixtures[1].authIdentity.providerSubject});assert.ok(foreign.body.errors?.length);assert.ok(!JSON.stringify(foreign.body).includes(originalReceipt.messageId));
});


// SQL component qualification only. No live runtime or gateway admission is
// minted by a digest/fixture; no SDK/model call or canonical reply is claimed.
async function runtimeSql(ownerIndex, action) {
 const client=await pool.connect();
 try{
  await client.query('begin');await client.query('set local role ios_runtime_sql_fixture');
  await client.query("set local lock_timeout='1500ms';set local statement_timeout='5000ms'");
  await client.query("select set_config('crays.app_role','core_service',true),set_config('crays.native_personal_account',$1,true)",[fixtures[ownerIndex].account.accountId]);
  const result=await action(client);await client.query('commit');return result;
 }catch(error){await client.query('rollback');throw error;}finally{client.release();}
}
const runtimeFixtureGrants=` grant usage on schema crays_core to ios_runtime_sql_fixture;
 grant select,update on crays_core.crays_accounts,crays_core.auth_identities,crays_core.canonical_people,crays_core.personal_agent_standard_assignments,crays_core.account_email_verifications,crays_core.conversations,crays_core.conversation_participants,crays_core.messages,crays_core.personal_messenger_bindings,crays_core.personal_messenger_ingress_receipts to ios_runtime_sql_fixture;
 grant select on crays_core.personal_messenger_outbox to ios_runtime_sql_fixture;
 grant select,insert,update,delete on crays_core.personal_messenger_runtime_attempts,crays_core.personal_messenger_runtime_observations to ios_runtime_sql_fixture;
 grant usage,select on sequence crays_core.personal_messenger_runtime_observations_observation_id_seq to ios_runtime_sql_fixture;
 grant execute on function crays_core.assert_native_personal_runtime_attempt_current(text,text),crays_core.append_native_personal_runtime_observation(text,text,text,jsonb) to ios_runtime_sql_fixture;`;
const runtimeAttempt='synthetic-runtime-attempt-a';
async function prepareRuntimeAttempt(client,patch={}) {
 const input={attempt:runtimeAttempt,receipt:originalReceipt.receiptId,account:fixtures[0].account.accountId,binding:ownA.bindingId,revision:ownA.revision,run:'synthetic-sdk-run-a',...patch};
 return client.query(`insert into crays_core.personal_messenger_runtime_attempts
 (attempt_id,receipt_id,account_id,binding_id,binding_revision,contact_revision,agent_id,runtime_binding_sha256,sdk_session_id,sdk_session_key,sdk_run_id,request_sha256)
 select $1,$2,$3,$4,$5,r.contact_revision,b.agent_id,$6,'synthetic-private-session-a','synthetic-private-session-key-a',$7,r.payload_sha256
 from crays_core.personal_messenger_ingress_receipts r join crays_core.personal_messenger_bindings b on b.binding_id=r.binding_id where r.receipt_id=$2`,
 [input.attempt,input.receipt,input.account,input.binding,input.revision,'a'.repeat(64),input.run]);
}
async function observeRuntime(client,event='ack-a',kind='acknowledged',projection={runId:'synthetic-sdk-run-a',status:'started'}){
 return (await client.query('select crays_core.append_native_personal_runtime_observation($1,$2,$3,$4::jsonb) id',[runtimeAttempt,event,kind,JSON.stringify({sessionId:'synthetic-private-session-a',...projection})])).rows[0].id;
}
test('runtime attempt SQL stores one immutable original correlation before IO and denies duplicate/foreign preparation',async()=>{
 await pool.query('create role ios_runtime_sql_fixture nologin');
 await pool.query(runtimeFixtureGrants);
 for(let i=0;i<2;i++)await runtimeSql(i,async c=>{
  const accounts=await c.query('select account_id from crays_core.crays_accounts');assert.deepEqual(accounts.rows,[{account_id:fixtures[i].account.accountId}]);
  const ids=await c.query('select account_id from crays_core.auth_identities');assert.ok(ids.rows.length>0);assert.ok(ids.rows.every(r=>r.account_id===fixtures[i].account.accountId));
 });

 // UPDATE policies are needed for row locks, but MUST NOT grant identity edits.
 // Test ordinary statements with the very same non-bypass role/grants/context.
 for(const sql of [
  "update crays_core.crays_accounts set default_role='admin' where account_id=$1",
  "update crays_core.crays_accounts set status='blocked' where account_id=$1",
  "update crays_core.crays_accounts set display_name=display_name where account_id=$1",
  "update crays_core.auth_identities set verified=false where account_id=$1",
  "update crays_core.auth_identities set provider_subject='forged-subject' where account_id=$1",
 ]) await assert.rejects(runtimeSql(0,c=>c.query(sql,[fixtures[0].account.accountId])),/identity context is read and lock only/);

 // Execute the actual rollback source up to/including its locked empty check;
 // a concurrent producer must block, then fail rather than commit a lost row.
 const down=readFileSync(new URL('../../database/migrations/0211_native_personal_runtime_attempts.down.sql',import.meta.url),'utf8');
 const split=down.indexOf('drop function');assert.ok(split>0);
 const migrator=await pool.connect();let producer,producerPid,producerDone=false;
 try{
  await migrator.query(down.slice(0,split));
  producer=runtimeSql(0,async c=>{producerPid=(await c.query('select pg_backend_pid() pid')).rows[0].pid;return prepareRuntimeAttempt(c);})
   .then(()=>({ok:true}),error=>({ok:false,error})).finally(()=>{producerDone=true;});
  let blocked=false;
  for(let i=0;i<50&&!producerDone;i++){
   if(producerPid){const wait=await migrator.query('select wait_event_type from pg_stat_activity where pid=$1',[producerPid]);if(wait.rows[0]?.wait_event_type==='Lock'){blocked=true;break;}}
   await new Promise(resolve=>setTimeout(resolve,10));
  }
  assert.equal(blocked,true,'Own producer must wait behind rollback table locks');assert.equal(producerDone,false);
  await migrator.query(down.slice(split));
  const denied=await producer;assert.equal(denied.ok,false,'Rollback must not erase an accepted producer attempt');
  await migrator.query(readFileSync(new URL('../../database/migrations/0211_native_personal_runtime_attempts.sql',import.meta.url),'utf8'));
  // Recreated tables/functions intentionally have no PUBLIC grants. Restore
  // only this disposable fixture role's original privileges, not production.
  await migrator.query(runtimeFixtureGrants);
 }finally{await migrator.query('rollback');migrator.release();if(producer)await producer;}
 await assert.rejects(runtimeSql(1,c=>c.query(down)),/Global unfiltered migration visibility required/);
 await runtimeSql(0,c=>prepareRuntimeAttempt(c));
 const stored=await runtimeSql(0,c=>c.query('select * from crays_core.personal_messenger_runtime_attempts'));
 assert.equal(stored.rows.length,1);assert.equal(stored.rows[0].receipt_id,originalReceipt.receiptId);
 assert.equal(stored.rows[0].sdk_run_id,'synthetic-sdk-run-a');assert.ok(!Object.hasOwn(stored.rows[0],'body'));
 await assert.rejects(runtimeSql(0,c=>prepareRuntimeAttempt(c,{attempt:'duplicate-attempt',run:'fresh-run-for-same-receipt'})),/unique|duplicate/i);
 await assert.rejects(runtimeSql(0,c=>c.query("update crays_core.personal_messenger_runtime_attempts set sdk_run_id='new-run' where attempt_id=$1",[runtimeAttempt])),/immutable/i);
 await assert.rejects(runtimeSql(0,c=>c.query('delete from crays_core.personal_messenger_runtime_attempts where attempt_id=$1',[runtimeAttempt])),/immutable/i);
 const foreign=await runtimeSql(1,c=>c.query('select * from crays_core.personal_messenger_runtime_attempts'));assert.deepEqual(foreign.rows,[]);
 await assert.rejects(runtimeSql(1,c=>c.query(down)),/Global unfiltered migration visibility required/);
 await assert.rejects(runtimeSql(1,c=>observeRuntime(c)),/Own runtime attempt required/);
 await assert.rejects(runtimeSql(0,c=>c.query("insert into crays_core.personal_messenger_runtime_observations(attempt_id,account_id,event_key,kind,projection) values($1,$2,'foreign','acknowledged','{}')",[runtimeAttempt,fixtures[1].account.accountId])),/Core runtime context|row-level security/);
});
test('runtime callback SQL retains unknown and ACK separately, deduplicates concurrent exact callbacks and rejects changed callback',async()=>{
 const before=(await pool.query('select count(*)::int n from crays_core.messages')).rows[0].n;
 const unknown={runId:'synthetic-sdk-run-a',requestSent:true};
 const one=await runtimeSql(0,c=>observeRuntime(c,'lost-ack','transport_unknown',unknown));
 const ids=await Promise.all([runtimeSql(0,c=>observeRuntime(c)),runtimeSql(0,c=>observeRuntime(c))]);assert.equal(ids[0],ids[1]);
 assert.equal(await runtimeSql(0,c=>observeRuntime(c,'lost-ack','transport_unknown',unknown)),one);
 await assert.rejects(runtimeSql(0,c=>observeRuntime(c,'ack-a','acknowledged',{runId:'changed-run',status:'started'})),/Conflicting personal runtime callback/);
 await assert.rejects(runtimeSql(0,c=>observeRuntime(c,'ack-a','terminal_reply',{text:'invented'})),/Conflicting personal runtime callback/);
 await assert.rejects(runtimeSql(0,c=>observeRuntime(c,'fresh-wrong-run','acknowledged',{runId:'another-run',status:'started'})),/run and session correlation/);
 await assert.rejects(runtimeSql(0,c=>observeRuntime(c,'fresh-wrong-session','acknowledged',{runId:'synthetic-sdk-run-a',sessionId:'another-session',status:'started'})),/run and session correlation/);
 await assert.rejects(runtimeSql(0,c=>observeRuntime(c,'fresh-secret-field','acknowledged',{runId:'synthetic-sdk-run-a',status:'started',authorization:'must-not-be-retained'})),/Bounded personal runtime projection/);
 await assert.rejects(runtimeSql(0,c=>observeRuntime(c,'fresh-bad-seq','acknowledged',{runId:'synthetic-sdk-run-a',status:'started',messageSeq:0.5})),/Valid acknowledgement/);
 await assert.rejects(runtimeSql(0,c=>c.query("update crays_core.personal_messenger_runtime_observations set projection='{}' where attempt_id=$1",[runtimeAttempt])),/immutable/i);
 const records=await runtimeSql(0,c=>c.query('select kind from crays_core.personal_messenger_runtime_observations order by observation_id'));
 assert.deepEqual(records.rows.map(r=>r.kind),['transport_unknown','acknowledged']);
 assert.equal((await pool.query('select count(*)::int n from crays_core.personal_messenger_runtime_attempts')).rows[0].n,1);
 const rollbackClient=await pool.connect();
 try{await assert.rejects(rollbackClient.query(readFileSync(new URL('../../database/migrations/0211_native_personal_runtime_attempts.down.sql',import.meta.url),'utf8')),/Reconcile and preserve/);}
 finally{await rollbackClient.query('rollback');rollbackClient.release();}
 assert.equal((await pool.query('select count(*)::int n from crays_core.personal_messenger_runtime_attempts')).rows[0].n,1);
 assert.equal((await pool.query('select count(*)::int n from crays_core.messages')).rows[0].n,before);
 assert.equal((await pool.query('select state from crays_core.personal_messenger_outbox where receipt_id=$1',[originalReceipt.receiptId])).rows[0].state,'waiting_runtime_admission');
});
test('runtime late effects and even identical replay fail after current contact, participant or binding authority changes',async()=>{
 const account=fixtures[0].account.accountId;
 for(const[change,restore]of[
 ["update crays_core.account_email_verifications set revoked_at=now() where account_id=$1","update crays_core.account_email_verifications set revoked_at=null where account_id=$1"],
 ["update crays_core.conversation_participants set can_reply=false where account_id=$1","update crays_core.conversation_participants set can_reply=true where account_id=$1"],
 ["update crays_core.personal_messenger_bindings set revision=revision+1 where account_id=$1","update crays_core.personal_messenger_bindings set revision=revision-1 where account_id=$1"],
 ["update crays_core.messages set deleted_at=now() where sender_account_id=$1","update crays_core.messages set deleted_at=null where sender_account_id=$1"],
 ]){
  await pool.query(change,[account]);
  try{await assert.rejects(runtimeSql(0,c=>observeRuntime(c)),/Current personal runtime attempt authority required/);await assert.rejects(runtimeSql(0,c=>observeRuntime(c,'late','terminal_reply',{text:'late result'})),/Current personal runtime attempt authority required/);}
  finally{await pool.query(restore,[account]);}
 }
 assert.equal((await runtimeSql(0,c=>c.query('select count(*)::int n from crays_core.personal_messenger_runtime_observations'))).rows[0].n,2);
 await assert.rejects(runtimeSql(0,c=>observeRuntime(c,'oversize','terminal_reply',{runId:'synthetic-sdk-run-a',text:'x'.repeat(65536)})),/Bounded terminal reply projection/);
 await assert.rejects(runtimeSql(0,c=>c.query("select set_config('crays.app_role','guest',true)").then(()=>observeRuntime(c))),/Current own Core runtime context required/);
});

// New SQL response component; controlled terminal fixtures are NOT a real SDK
// answer. The future registered producer and native typed transcript remain open.
let canonicalObservation, canonicalResponse;
const canonicalText='Synthetic terminal response · exact café 🌊 e\u0301';
async function promoteCanonical(client,observation,message='personal-message-00000000-0000-4000-8000-000000009001') {
 await client.query("select set_config('crays.native_personal_runtime_producer','sdk-terminal',true)");
 return (await client.query('select crays_core.persist_native_personal_agent_response($1,$2,$3) message',[runtimeAttempt,observation,message])).rows[0].message;
}
test('canonical agent response stores one exact terminal original in the same conversation without human impersonation',async()=>{
 const migration=name=>readFileSync(new URL('../../database/migrations/'+name,import.meta.url),'utf8');
 await pool.query(migration('0214_native_personal_agent_responses.sql'));
 await pool.query(migration('0214_native_personal_agent_responses.down.sql'));
 await pool.query(migration('0214_native_personal_agent_responses.sql'));
 await pool.query(`grant select,insert on crays_core.personal_messenger_agent_responses to ios_runtime_sql_fixture;
 grant insert on crays_core.messages to ios_runtime_sql_fixture;
 grant usage,select on sequence crays_core.messages_id_seq to ios_runtime_sql_fixture;
 grant execute on function crays_core.persist_native_personal_agent_response(text,bigint,text) to ios_runtime_sql_fixture;`);
 const ack=(await pool.query("select observation_id from crays_core.personal_messenger_runtime_observations where kind='acknowledged' and attempt_id=$1",[runtimeAttempt])).rows[0].observation_id;
 await assert.rejects(runtimeSql(0,c=>promoteCanonical(c,ack)),/Terminal response required/);
 canonicalObservation=await runtimeSql(0,c=>observeRuntime(c,'terminal-answer-a','terminal_reply',{runId:'synthetic-sdk-run-a',text:canonicalText}));
 await assert.rejects(runtimeSql(0,c=>c.query('select crays_core.persist_native_personal_agent_response($1,$2,$3)',[runtimeAttempt,canonicalObservation,'unadmitted-answer'])),/Trusted current Core SDK response context required/);
 // Exercise real COMMIT-time descriptor checks before any valid response exists.
 const insertDescriptor=async(c,message)=>{
  await c.query("select set_config('crays.native_personal_runtime_producer','sdk-terminal',true)");
  await c.query(`insert into crays_core.personal_messenger_agent_responses
   (message_id,attempt_id,observation_id,account_id,binding_id,agent_id,request_message_id)
   select $1,t.attempt_id,$2,t.account_id,t.binding_id,t.agent_id,r.message_id
   from crays_core.personal_messenger_runtime_attempts t
   join crays_core.personal_messenger_ingress_receipts r on r.receipt_id=t.receipt_id
   where t.attempt_id=$3`,[message,canonicalObservation,runtimeAttempt]);
 };
 await assert.rejects(runtimeSql(0,c=>insertDescriptor(c,originalReceipt.messageId)),/Canonical response provenance must reference its exact assistant message/);
 const foreignOriginal=await personalCall('ReceiveScopedAgentMessage',{
  bindingId:ownB.bindingId,expectedBindingRevision:ownB.revision,
  expectedContactRevision:await contactRevision(fixtures[1].account.accountId),
  idempotencyKey:'foreign-original-response-guard',body:'Another owner original'
 },{subject:fixtures[1].authIdentity.providerSubject});
 assert.equal(foreignOriginal.status,200,JSON.stringify(foreignOriginal.body));
 await assert.rejects(runtimeSql(0,c=>insertDescriptor(c,foreignOriginal.body.data.receiveScopedAgentMessage.messageId)),/Canonical response provenance must reference its exact assistant message/);
 await assert.rejects(runtimeSql(0,async c=>{
  await insertDescriptor(c,'personal-message-00000000-0000-4000-8000-000000009002');
  await c.query(`insert into crays_core.messages(message_id,conversation_id,sender_role,message_type,body,visibility)
   values('personal-message-00000000-0000-4000-8000-000000009002',$1,'system','system_notification','Changed terminal body','internal')`,[ownA.conversationId]);
 }),/Canonical answer must equal exact terminal original/);
 assert.equal((await pool.query('select count(*)::int n from crays_core.personal_messenger_agent_responses')).rows[0].n,0);
 await assert.rejects(runtimeSql(0,c=>promoteCanonical(c,canonicalObservation,'noncanonical-agent-answer')),/personal_messenger_agent_responses_message_id_check/);
 assert.equal((await pool.query('select count(*)::int n from crays_core.personal_messenger_agent_responses')).rows[0].n,0);
 const answers=await Promise.all([runtimeSql(0,c=>promoteCanonical(c,canonicalObservation)),runtimeSql(0,c=>promoteCanonical(c,canonicalObservation,'ignored-new-response-id'))]);
 assert.equal(answers[0],answers[1]);canonicalResponse=answers[0];
 const records=await runtimeSql(0,c=>c.query(`select m.message_id,m.conversation_id,m.sender_account_id,m.sender_role,m.body,r.agent_id,r.request_message_id
  from crays_core.messages m join crays_core.personal_messenger_agent_responses r on r.message_id=m.message_id where m.message_id=$1`,[canonicalResponse]));
 assert.equal(records.rows.length,1);const row=records.rows[0];
 assert.equal(row.conversation_id,ownA.conversationId);assert.equal(row.sender_account_id,null);assert.equal(row.sender_role,'system');assert.equal(row.body,canonicalText);assert.equal(row.request_message_id,originalReceipt.messageId);
 const assigned=(await pool.query('select agent_id from crays_core.personal_agent_standard_assignments where account_id=$1',[fixtures[0].account.accountId])).rows[0].agent_id;assert.equal(row.agent_id,assigned);
 const foreign=await runtimeSql(1,c=>c.query('select message_id from crays_core.messages where message_id=$1',[canonicalResponse]));assert.deepEqual(foreign.rows,[]);
 const foreignProof=await runtimeSql(1,c=>c.query('select * from crays_core.personal_messenger_agent_responses'));assert.deepEqual(foreignProof.rows,[]);
 // Legacy owner-only transcript never mislabels a system answer as the human.
 const legacy=await personalCall('NativePersonalConversation');assert.ok(!legacy.body.data.nativePersonalConversation.messages.some(m=>m.messageId===canonicalResponse));
});
test('canonical response rejects forged author, changed terminal, foreign owner and mutation',async()=>{
 const changed=await runtimeSql(0,c=>observeRuntime(c,'terminal-answer-conflict','terminal_reply',{runId:'synthetic-sdk-run-a',text:'Different terminal content'}));
 await assert.rejects(runtimeSql(0,c=>promoteCanonical(c,changed)),/Conflicting terminal response/);
 await assert.rejects(runtimeSql(1,c=>promoteCanonical(c,canonicalObservation)),/Own personal attempt required/);
 await assert.rejects(runtimeSql(0,c=>c.query(`insert into crays_core.messages(message_id,conversation_id,sender_account_id,sender_role,message_type,body,visibility)
  values('forged-human-agent-author',$1,$2,'admin','internal_note','Not an admitted answer','internal')`,[ownA.conversationId,fixtures[0].account.accountId])),/Typed canonical personal message author required/);
 await assert.rejects(runtimeSql(0,c=>c.query(`insert into crays_core.messages(message_id,conversation_id,sender_role,message_type,body,visibility)
  values('forged-system-answer',$1,'system','system_notification','Not an admitted answer','internal')`,[ownA.conversationId])),/Canonical answer must equal exact terminal original|row-level security/);
 await assert.rejects(pool.query("update crays_core.personal_messenger_agent_responses set agent_id=agent_id where message_id=$1",[canonicalResponse]),/immutable/);
 await assert.rejects(pool.query("delete from crays_core.personal_messenger_agent_responses where message_id=$1",[canonicalResponse]),/immutable/);
 assert.equal((await pool.query('select count(*)::int n from crays_core.personal_messenger_agent_responses')).rows[0].n,1);
});
test('canonical identical reply replay rereads revocation and rollback preserves an existing answer',async()=>{
 await pool.query('update crays_core.account_email_verifications set revoked_at=now() where account_id=$1',[fixtures[0].account.accountId]);
 try{await assert.rejects(runtimeSql(0,c=>promoteCanonical(c,canonicalObservation)),/Current personal runtime attempt authority required/);}
 finally{await pool.query('update crays_core.account_email_verifications set revoked_at=null where account_id=$1',[fixtures[0].account.accountId]);}
 assert.equal(await runtimeSql(0,c=>promoteCanonical(c,canonicalObservation)),canonicalResponse);
 const rollback=await pool.connect();
 try{await assert.rejects(rollback.query(readFileSync(new URL('../../database/migrations/0214_native_personal_agent_responses.down.sql',import.meta.url),'utf8')),/Preserve canonical agent replies/);}
 finally{await rollback.query('rollback');rollback.release();}
 assert.equal((await pool.query('select body from crays_core.messages where message_id=$1',[canonicalResponse])).rows[0].body,canonicalText);
});

// Current request projection requires the complete runtime/response schema.
// Keep its real HTTP checks after all SQL migration roundtrip checks, never
// fabricate a not-attempted fallback when required tables are absent.
test('registered own request projection exposes exact immutable originals and storage receipts, never inferred execution',async()=>{
 const response=await personalCall('NativePersonalRequests');assert.equal(response.status,200,JSON.stringify(response.body));
 const page=response.body.data.nativePersonalRequests;
 assert.equal(page.bindingId,ownA.bindingId);assert.equal(page.conversationId,ownA.conversationId);
 const original=page.requests.find(r=>r.messageId===originalReceipt.messageId);assert.ok(original);
 assert.equal(original.body,originalInput.body);assert.equal(original.receiptId,originalReceipt.receiptId);
 assert.equal(original.acceptanceOutcome,'STORED_RUNTIME_UNAVAILABLE');assert.equal(original.runtimeAdmissionState,'waiting_runtime_admission');assert.equal(original.dispatchState,'RESPONSE_AVAILABLE');
 assert.ok(page.requests.every(r=>!Object.hasOwn(r,'idempotencyKey')&&!Object.hasOwn(r,'agentId')&&!Object.hasOwn(r,'answer')));
 const receipts=await pool.query('select count(*)::int n from crays_core.personal_messenger_ingress_receipts where account_id=$1',[fixtures[0].account.accountId]);
 assert.equal(page.requests.length,receipts.rows[0].n); // Raw messages without ingress receipts are not invented tasks.
 const before=await pool.query('select count(*)::int n from crays_core.personal_messenger_outbox');
 const replay=await personalCall('NativePersonalRequests');assert.deepEqual(replay.body.data,response.body.data);
 assert.deepEqual((await pool.query('select count(*)::int n from crays_core.personal_messenger_outbox')).rows,before.rows);
});
test('own request projection cannot inherit write scopes, forged actors, cookies or another owner cursor',async()=>{
 const read=await personalCall('NativePersonalRequests',{}, {scope:'fixture:identity:read fixture:personal:read'});assert.equal(read.status,200,JSON.stringify(read.body));
 const denied=await personalCall('NativePersonalRequests',{}, {scope:'fixture:identity:read fixture:personal:write'});assert.ok([401,403].includes(denied.status));
 const actor=await personalCall('NativePersonalRequests',{accountId:fixtures[1].account.accountId});assert.equal(actor.status,403);
 const cookie=await personalCall('NativePersonalRequests',{}, {headers:{cookie:'forged=1'}});assert.equal(cookie.status,403);
 const b=await personalCall('NativePersonalRequests',{}, {subject:fixtures[1].authIdentity.providerSubject,claims:{accountId:fixtures[0].account.accountId,role:'admin'}});
 assert.equal(b.status,200,JSON.stringify(b.body));assert.equal(b.body.data.nativePersonalRequests.conversationId,ownB.conversationId);assert.ok(b.body.data.nativePersonalRequests.requests.every(r=>r.receiptId!==originalReceipt.receiptId));
 const foreign=await personalCall('NativePersonalRequests',{beforeMessageId:originalReceipt.messageId},{subject:fixtures[1].authIdentity.providerSubject});
 assert.ok(foreign.body.errors?.length);assert.equal(foreign.body.data,null);assert.ok(!JSON.stringify(foreign.body).includes(originalInput.body));
 const raw=await personalCall('NativePersonalRequests',{beforeMessageId:'personal-message-00000000-0000-4000-8000-000000005000'});assert.ok(raw.body.errors?.length); // Own raw message is not a receipt cursor.
});
test('lost HTTP ACK is recoverable through canonical original receipt projection without fresh send or fake result',async()=>{
 const key='native-personal-requests-lost-ack',input={...originalInput,idempotencyKey:key};
 const originalCount=(await pool.query('select count(*)::int n from crays_core.personal_messenger_ingress_receipts')).rows[0].n;
 dropCommittedPersonalResponse=true;
 await assert.rejects(personalCall('ReceiveScopedAgentMessage',input));
 const receipt=await personalCall('GetAgentDeliveryReceipt',{idempotencyKey:key});assert.equal(receipt.status,200,JSON.stringify(receipt.body));
 const page=await personalCall('NativePersonalRequests');const recovered=page.body.data.nativePersonalRequests.requests.find(r=>r.receiptId===receipt.body.data.agentDeliveryReceipt.receiptId);
 assert.ok(recovered);assert.equal(recovered.body,input.body);assert.equal(recovered.runtimeAdmissionState,'waiting_runtime_admission');assert.equal(recovered.dispatchState,'NOT_ATTEMPTED');
 assert.equal((await pool.query('select count(*)::int n from crays_core.personal_messenger_ingress_receipts')).rows[0].n,originalCount+1);
});
test('canonical request projection rereads revocation and exposes no retained private original after authority withdrawal',async()=>{
 for(const [change,restore] of [
 ["update crays_core.account_email_verifications set revoked_at=now() where account_id=$1","update crays_core.account_email_verifications set revoked_at=null where account_id=$1"],
 ["update crays_core.conversation_participants set status='removed' where account_id=$1","update crays_core.conversation_participants set status='active' where account_id=$1"],
 ["update crays_core.personal_messenger_bindings set status='revoked',revision=revision+1 where account_id=$1","update crays_core.personal_messenger_bindings set status='active',revision=revision-1 where account_id=$1"],
 ]){
  await pool.query(change,[fixtures[0].account.accountId]);
  try{const response=await personalCall('NativePersonalRequests');assert.ok(response.body.errors?.length);assert.equal(response.body.data,null);assert.ok(!JSON.stringify(response.body).includes(originalInput.body));}
  finally{await pool.query(restore,[fixtures[0].account.accountId]);}
 }
 const restored=await personalCall('NativePersonalRequests');assert.equal(restored.status,200);assert.ok(restored.body.data.nativePersonalRequests.requests.some(r=>r.messageId===originalReceipt.messageId));
});
test('request pages retain exact originals with receipt-only owned cursors, including timestamp ties',async()=>{
 // Real canonical fixtures deliberately share one timestamp across the page
 // boundary. Normal receive already qualifies durable ingress above; these
 // historical originals exercise the actual SQL cursor, not a fake task store.
 for(let i=0;i<51;i++){
  const messageId='personal-message-'+randomUUID(),receiptId='personal-receipt-'+randomUUID();
  await pool.query(`with original as (
   insert into crays_core.messages(message_id,conversation_id,sender_account_id,sender_role,channel,message_type,body,visibility,delivery_status,created_at)
   values($1,$2,$3,'guest','in_app','shared_comment',$4,'internal','not_sent','2020-01-01T00:00:00Z') returning message_id
  ), receipt as (
   insert into crays_core.personal_messenger_ingress_receipts(receipt_id,binding_id,account_id,message_id,idempotency_key,payload_sha256,binding_revision,contact_revision,outcome)
   select $5,$6,$3,message_id,$7,$8,$9,$10,'STORED_RUNTIME_UNAVAILABLE' from original returning receipt_id
  ) insert into crays_core.personal_messenger_outbox(receipt_id,state) select receipt_id,'waiting_runtime_admission' from receipt`,
  [messageId,ownA.conversationId,fixtures[0].account.accountId,'Receipt-backed original '+i+' 🌊 e\u0301',receiptId,ownA.bindingId,'request-page-'+i,'a'.repeat(64),ownA.revision,await contactRevision()]);
 }
 const count=(await pool.query('select count(*)::int n from crays_core.personal_messenger_ingress_receipts where account_id=$1',[fixtures[0].account.accountId])).rows[0].n;
 const first=await personalCall('NativePersonalRequests');const page=first.body.data.nativePersonalRequests;
 assert.equal(page.requests.length,50);assert.equal(page.hasOlderRequests,true);assert.equal(page.nextBeforeMessageId,page.requests[0].messageId);
 const older=await personalCall('NativePersonalRequests',{beforeMessageId:page.nextBeforeMessageId});const next=older.body.data.nativePersonalRequests;
 assert.equal(next.hasOlderRequests,false);assert.equal(next.nextBeforeMessageId,null);
 assert.equal(page.requests[0].createdAt,next.requests.at(-1).createdAt); // Cursor crosses equal timestamps.
 assert.equal(new Set([...page.requests,...next.requests].map(r=>r.messageId)).size,count);
 assert.ok([...page.requests,...next.requests].every(r=>r.acceptanceOutcome==='STORED_RUNTIME_UNAVAILABLE'&&r.runtimeAdmissionState==='waiting_runtime_admission'));
});


// Final lane uses the ACTUAL configured Core pool and HTTP/APQ handler with a
// genuinely non-superuser/non-BYPASSRLS PostgreSQL login, not a repository mock.
let nativeAdminObserver;
const originalDatabaseURL=process.env.CRAYS_DATABASE_URL,originalPoolMax=process.env.CRAYS_DATABASE_POOL_MAX;
test('actual restricted Core pool resolves verified native JWT to only its existing canonical owner',async()=>{
 const {Pool:QualificationPool}=await import('pg');
 const checked=new URL(originalDatabaseURL);assert.equal(checked.searchParams.get('host'),process.env.CRAYS_NATIVE_SQL_FIXTURE_SOCKET);assert.equal(checked.pathname,'/ios_native_qualification');
 await pool.query(`create role ios_native_personal_http_fixture login nosuperuser nobypassrls noinherit;
 grant usage on schema crays_core to ios_native_personal_http_fixture;
 grant select,insert,update on crays_core.personal_agent_standard_assignments,crays_core.personal_agent_baseline_deliveries to ios_native_personal_http_fixture;
 grant select on crays_core.personal_messenger_agent_responses,crays_core.personal_messenger_runtime_observations,crays_core.personal_messenger_runtime_attempts to ios_native_personal_http_fixture;
 grant select,update on crays_core.crays_accounts,crays_core.auth_identities,crays_core.canonical_people,crays_core.personal_agent_standard_assignments,crays_core.account_email_verifications to ios_native_personal_http_fixture;
 grant select,insert,update on crays_core.conversations,crays_core.conversation_participants,crays_core.messages,crays_core.personal_messenger_bindings,crays_core.personal_messenger_ingress_receipts,crays_core.personal_messenger_outbox to ios_native_personal_http_fixture;
 grant usage,select on sequence crays_core.conversations_id_seq,crays_core.conversation_participants_id_seq,crays_core.messages_id_seq to ios_native_personal_http_fixture;`);
 // Existing independently verified login on A, distinct from its email-proof identity.
 await repository.upsertCoreIdentity({account:fixtures[0].account,authIdentity:{...fixtures[0].authIdentity,identityId:'ios-native-linked-provider-a',providerSubject:'auth0|ios-native-a-linked-verified'}});
 // A third entirely synthetic canonical person has no conversation yet. Real
 // registered Bind must create its first own thread under the restricted pool.
 const fresh={account:{...fixtures[0].account,accountId:'ios-native-fixture-c',craysId:'ios-native-fixture-c',displayName:'Synthetic iOS native fixture c',primaryContact:'synthetic-c@example.invalid'},authIdentity:{...fixtures[0].authIdentity,identityId:'ios-native-provider-c',providerSubject:'auth0|ios-native-c'}};
 fixtures.push(fresh);await repository.upsertCoreIdentity(fresh);await seedCurrentProof(2);
 await pool.query("insert into crays_core.canonical_people(canonical_person_id,person_version,account_id,display_name_sha256,encrypted_display_name_ref,field_authority_version,lifecycle_state) values('native-personal-2',1,$1,repeat('a',64),'secret://synthetic-native-personal','synthetic-only','active')",[fresh.account.accountId]);
 await pool.query("insert into crays_core.personal_agent_standard_assignments(canonical_person_id,account_id,agent_id,package_version,package_sha256,everyday_skill_sha256,assignment_proposal) values('native-personal-2',$1,$2,'synthetic-intent-only',repeat('a',64),repeat('b',64),'{}'::jsonb)",[fresh.account.accountId,'personal-'+'c'.repeat(48)]);
 // New native account: no agent intent or channel setup was preseeded.
 const unassigned={account:{...fresh.account,accountId:'ios-native-fixture-d',craysId:'ios-native-fixture-d',primaryContact:'synthetic-d@example.invalid'},authIdentity:{...fresh.authIdentity,identityId:'ios-native-provider-d',providerSubject:'auth0|ios-native-d'}};
 fixtures.push(unassigned);await repository.upsertCoreIdentity(unassigned);await seedCurrentProof(3);
 await pool.query("insert into crays_core.canonical_people(canonical_person_id,person_version,account_id,display_name_sha256,encrypted_display_name_ref,field_authority_version,lifecycle_state) values('native-personal-3',1,$1,repeat('a',64),'secret://synthetic-native-personal','synthetic-only','active')",[unassigned.account.accountId]);
 nativeAdminObserver=new QualificationPool({connectionString:originalDatabaseURL,ssl:false,max:1,options:'-c crays.app_role=core_service'});
 await database.closeCoreDatabase();
 checked.username='ios_native_personal_http_fixture';process.env.CRAYS_DATABASE_URL=checked.toString();process.env.CRAYS_DATABASE_POOL_MAX='1';
 const active=database.getCorePgPool();const role=(await active.query('select current_user name,rolsuper,rolbypassrls from pg_roles where rolname=current_user')).rows[0];
 assert.deepEqual(role,{name:'ios_native_personal_http_fixture',rolsuper:false,rolbypassrls:false});
 for(let i=0;i<2;i++){
  const response=await personalCall('NativePersonalConversation',{}, {subject:fixtures[i].authIdentity.providerSubject,claims:{accountId:fixtures[1-i].account.accountId,role:'admin'}});
  assert.equal(response.status,200,JSON.stringify(response.body));assert.equal(response.body.data.nativePersonalConversation.conversationId,i?ownB.conversationId:ownA.conversationId);
 }
 const freshBefore=await personalCall('NativePersonalConversation',{}, {subject:fixtures[2].authIdentity.providerSubject});assert.ok(freshBefore.body.errors?.length); // Reads never create a thread.
 const freshRevision=String((await nativeAdminObserver.query('select primary_contact_revision from crays_core.crays_accounts where account_id=$1',[fixtures[2].account.accountId])).rows[0].primary_contact_revision);
 const freshResponse=await personalCall('BindPersonalMessenger',{expectedContactRevision:freshRevision},{subject:fixtures[2].authIdentity.providerSubject});assert.equal(freshResponse.status,200,JSON.stringify(freshResponse.body));
 const freshBinding=freshResponse.body.data.bindPersonalMessenger;assert.deepEqual(freshBinding.messages,[]);assert.notEqual(freshBinding.conversationId,ownA.conversationId);assert.notEqual(freshBinding.conversationId,ownB.conversationId);
 const freshAgain=await personalCall('BindPersonalMessenger',{expectedContactRevision:freshRevision},{subject:fixtures[2].authIdentity.providerSubject});assert.equal(freshAgain.status,200,JSON.stringify(freshAgain.body));assert.equal(freshAgain.body.data.bindPersonalMessenger.bindingId,freshBinding.bindingId);
 const missing=await personalCall('NativePersonalConversation',{}, {subject:'auth0|no-existing-core-mapping'});assert.ok(missing.body.errors?.length);assert.equal(missing.body.data,null);
 const hidden=await active.query('select account_id from crays_core.crays_accounts');assert.deepEqual(hidden.rows,[]);
 const identities=await active.query('select account_id from crays_core.auth_identities');assert.deepEqual(identities.rows,[]);
});
test('restricted actual native HTTP ingress persists one original through duplicate and lost ACK without identity escalation',async()=>{
 const input={...originalInput,expectedContactRevision:await (async()=>String((await nativeAdminObserver.query('select primary_contact_revision from crays_core.crays_accounts where account_id=$1',[fixtures[0].account.accountId])).rows[0].primary_contact_revision))(),idempotencyKey:'restricted-http-original',body:'Restricted real Core original 🌊 e\u0301'};
 const accepted=await personalCall('ReceiveScopedAgentMessage',input);assert.equal(accepted.status,200,JSON.stringify(accepted.body));const receipt=accepted.body.data.receiveScopedAgentMessage;
 const duplicate=await personalCall('ReceiveScopedAgentMessage',input);assert.equal(duplicate.status,200,JSON.stringify(duplicate.body));assert.equal(duplicate.body.data.receiveScopedAgentMessage.receiptId,receipt.receiptId);assert.equal(duplicate.body.data.receiveScopedAgentMessage.replayed,true);
 const before=(await nativeAdminObserver.query('select count(*)::int n from crays_core.personal_messenger_ingress_receipts where account_id=$1',[fixtures[0].account.accountId])).rows[0].n;
 dropCommittedPersonalResponse=true;const lost={...input,idempotencyKey:'restricted-http-lost-ack',body:'Restricted original retained despite lost HTTP ACK'};
 await assert.rejects(personalCall('ReceiveScopedAgentMessage',lost));
 const recovered=await personalCall('GetAgentDeliveryReceipt',{idempotencyKey:lost.idempotencyKey});assert.equal(recovered.status,200,JSON.stringify(recovered.body));
 const originals=await personalCall('NativePersonalRequests');assert.ok(originals.body.data.nativePersonalRequests.requests.some(r=>r.receiptId===recovered.body.data.agentDeliveryReceipt.receiptId&&r.body===lost.body&&r.runtimeAdmissionState==='waiting_runtime_admission'));
 assert.equal((await nativeAdminObserver.query('select count(*)::int n from crays_core.personal_messenger_ingress_receipts where account_id=$1',[fixtures[0].account.accountId])).rows[0].n,before+1);
 const foreign=await personalCall('GetAgentDeliveryReceipt',{idempotencyKey:input.idempotencyKey},{subject:fixtures[1].authIdentity.providerSubject,claims:{accountId:fixtures[0].account.accountId}});assert.ok(foreign.body.errors?.length);assert.ok(!JSON.stringify(foreign.body).includes(receipt.receiptId));
 const injected=await personalCall('ReceiveScopedAgentMessage',{...input,accountId:fixtures[1].account.accountId});assert.equal(injected.status,403);
 const records=await nativeAdminObserver.query('select body,delivery_status from crays_core.messages where message_id=$1',[receipt.messageId]);assert.deepEqual(records.rows,[{body:input.body,delivery_status:'not_sent'}]);
});
test('restricted Core principal context is transaction-local and current revocation denies subsequent actual HTTP reads',async()=>{
 const active=database.getCorePgPool();
 const cleared=(await active.query("select nullif(current_setting('crays.native_personal_account',true),'') account,nullif(current_setting('crays.native_personal_provider_subject',true),'') subject")).rows[0];assert.deepEqual(cleared,{account:null,subject:null});
 const client=await active.connect();
 try{
  await client.query('begin');await client.query("select set_config('crays.native_personal_provider_key','auth0',true),set_config('crays.native_personal_provider_subject',$1,true)",[fixtures[0].authIdentity.providerSubject]);
  const exact=await client.query('select provider_subject,account_id from crays_core.auth_identities');assert.deepEqual(exact.rows,[{provider_subject:fixtures[0].authIdentity.providerSubject,account_id:fixtures[0].account.accountId}]);
  assert.deepEqual((await client.query('select account_id from crays_core.crays_accounts')).rows,[]);
  const change=await client.query("update crays_core.auth_identities set provider_subject='not-authorized' where account_id=$1",[fixtures[0].account.accountId]);assert.equal(change.rowCount,0);
 }finally{await client.query('rollback');client.release();}
 await nativeAdminObserver.query('update crays_core.account_email_verifications set revoked_at=now() where account_id=$1',[fixtures[0].account.accountId]);
 try{const denied=await personalCall('NativePersonalConversation');assert.ok(denied.body.errors?.length);assert.equal(denied.body.data,null);}
 finally{await nativeAdminObserver.query('update crays_core.account_email_verifications set revoked_at=null where account_id=$1',[fixtures[0].account.accountId]);}
 const resumed=await personalCall('NativePersonalConversation');assert.equal(resumed.status,200,JSON.stringify(resumed.body));assert.equal(resumed.body.data.nativePersonalConversation.conversationId,ownA.conversationId);
 const linkedSubject='auth0|ios-native-a-linked-verified';
 const linked=await personalCall('NativePersonalConversation',{}, {subject:linkedSubject});assert.equal(linked.status,200,JSON.stringify(linked.body));assert.equal(linked.body.data.nativePersonalConversation.conversationId,ownA.conversationId);
 // Revoke ONLY the independent identity backing v; the current login i stays verified.
 await nativeAdminObserver.query('update crays_core.auth_identities set verified=false where identity_id=$1',[fixtures[0].authIdentity.identityId]);
 try{
  assert.equal((await nativeAdminObserver.query('select verified from crays_core.auth_identities where identity_id=$1',['ios-native-linked-provider-a'])).rows[0].verified,true);
  const proofDenied=await personalCall('NativePersonalConversation',{}, {subject:linkedSubject});assert.ok(proofDenied.body.errors?.length);assert.equal(proofDenied.body.data,null);
  const revision=String((await nativeAdminObserver.query('select primary_contact_revision from crays_core.crays_accounts where account_id=$1',[fixtures[0].account.accountId])).rows[0].primary_contact_revision);
  const writeDenied=await personalCall('ReceiveScopedAgentMessage',{...originalInput,expectedContactRevision:revision,idempotencyKey:'restricted-proof-identity-denied'},{subject:linkedSubject});assert.ok(writeDenied.body.errors?.length);
  assert.equal((await nativeAdminObserver.query("select count(*)::int n from crays_core.personal_messenger_ingress_receipts where idempotency_key='restricted-proof-identity-denied'")).rows[0].n,0);
 }finally{await nativeAdminObserver.query('update crays_core.auth_identities set verified=true where identity_id=$1',[fixtures[0].authIdentity.identityId]);}
 const restoredLinked=await personalCall('NativePersonalConversation',{}, {subject:linkedSubject});assert.equal(restoredLinked.status,200,JSON.stringify(restoredLinked.body));

 assert.equal((await active.query("select count(*)::int n from crays_core.auth_identities")).rows[0].n,0);
});


test('typed transcript returns exact Chuck author and original provenance through actual restricted HTTP pool',async()=>{
 const result=await personalCall('NativePersonalTranscript',{}, {scope:'fixture:identity:read fixture:personal:read'});
 assert.equal(result.status,200,JSON.stringify(result.body));assert.ok(!result.body.errors,JSON.stringify(result.body));
 // Preserve the actual untouched registered HTTP response for native decoder compatibility.
 writeFileSync(process.env.CRAYS_NATIVE_SQL_FIXTURE_RESULT+'.typed-transcript.json',JSON.stringify(result.body,null,2)+'\n');
 const page=result.body.data.nativePersonalTranscript;assert.equal(page.conversationId,ownA.conversationId);
 assert.equal(page.messages.length,50);assert.equal(page.hasOlderMessages,true);
 const chuck=page.messages.filter(m=>m.authorKind==='CHUCK');assert.equal(chuck.length,1);
 assert.equal(chuck[0].messageId,canonicalResponse);assert.equal(chuck[0].body,canonicalText);
 assert.equal(chuck[0].inReplyToMessageId,originalReceipt.messageId);assert.ok(chuck[0].agentId);
 for(const m of page.messages.filter(m=>m.authorKind==='OWNER')){assert.equal(m.agentId,null);assert.equal(m.inReplyToMessageId,null);}
 const again=await personalCall('NativePersonalTranscript');assert.deepEqual(again.body.data,result.body.data);
 const older=await personalCall('NativePersonalTranscript',{beforeMessageId:page.nextBeforeMessageId});
 assert.equal(older.status,200,JSON.stringify(older.body));assert.ok(!older.body.errors);
 const ids=[...page.messages,...older.body.data.nativePersonalTranscript.messages].map(m=>m.messageId);
 assert.equal(new Set(ids).size,ids.length);
 const beforeChuck=await personalCall('NativePersonalTranscript',{beforeMessageId:canonicalResponse});
 assert.equal(beforeChuck.status,200,JSON.stringify(beforeChuck.body));assert.ok(!beforeChuck.body.errors);
 assert.ok(!beforeChuck.body.data.nativePersonalTranscript.messages.some(m=>m.messageId===canonicalResponse));
});
test('typed transcript denies foreign cursors, caller identity, cookies and write-only scope',async()=>{
 const b={subject:fixtures[1].authIdentity.providerSubject,claims:{accountId:fixtures[0].account.accountId,role:'admin'}};
 const own=await personalCall('NativePersonalTranscript',{},b);assert.equal(own.status,200,JSON.stringify(own.body));
 assert.ok(!own.body.data.nativePersonalTranscript.messages.some(m=>m.messageId===canonicalResponse));
 const foreign=await personalCall('NativePersonalTranscript',{beforeMessageId:canonicalResponse},b);
 assert.ok(foreign.body.errors?.length);assert.equal(foreign.body.data,null);assert.ok(!JSON.stringify(foreign.body).includes(canonicalText));
 assert.equal((await personalCall('NativePersonalTranscript',{accountId:fixtures[1].account.accountId})).status,403);
 assert.equal((await personalCall('NativePersonalTranscript',{}, {headers:{cookie:'forged=1'}})).status,403);
 assert.ok([401,403].includes((await personalCall('NativePersonalTranscript',{}, {scope:'fixture:identity:read fixture:personal:write'})).status));
});
test('typed transcript rereads current contact and binding revocation without leaking previous answer',async()=>{
 for(const [table,key,id] of [['account_email_verifications','account_id',fixtures[0].account.accountId],['personal_messenger_bindings','binding_id',ownA.bindingId]]){
  const contact=table==='account_email_verifications';
  await nativeAdminObserver.query(`update crays_core.${table} set ${contact?'revoked_at=now()':"status='revoked'"} where ${key}=$1`,[id]);
  try{const denied=await personalCall('NativePersonalTranscript');assert.ok(denied.body.errors?.length);assert.equal(denied.body.data,null);assert.ok(!JSON.stringify(denied.body).includes(canonicalText));}
  finally{await nativeAdminObserver.query(`update crays_core.${table} set ${contact?'revoked_at=null':"status='active'"} where ${key}=$1`,[id]);}
 }
 const resumed=await personalCall('NativePersonalTranscript');assert.equal(resumed.status,200,JSON.stringify(resumed.body));
 assert.ok(resumed.body.data.nativePersonalTranscript.messages.some(m=>m.messageId===canonicalResponse));
});


let runtimeRepository, runtimeRepositoryTarget, repositoryPrepared;
async function repositoryOriginal(key,body='Runtime repository original · café 🌊 e\u0301'){
 const revision=String((await nativeAdminObserver.query('select primary_contact_revision from crays_core.crays_accounts where account_id=$1',[fixtures[0].account.accountId])).rows[0].primary_contact_revision);
 const response=await personalCall('ReceiveScopedAgentMessage',{...originalInput,expectedContactRevision:revision,idempotencyKey:key,body});
 assert.equal(response.status,200,JSON.stringify(response.body));assert.ok(!response.body.errors,JSON.stringify(response.body));
 return {receipt:response.body.data.receiveScopedAgentMessage,revision};
}
test('actual restricted Core runtime repository claims one durable original before SDK IO and preserves exact run on replay',async()=>{
 await nativeAdminObserver.query(`grant select,insert,update on crays_core.personal_messenger_runtime_attempts,crays_core.personal_messenger_runtime_observations to ios_native_personal_http_fixture;
  grant insert on crays_core.personal_messenger_agent_responses to ios_native_personal_http_fixture;
  grant usage,select on sequence crays_core.personal_messenger_runtime_observations_observation_id_seq to ios_native_personal_http_fixture;
  grant execute on function crays_core.assert_native_personal_runtime_attempt_current(text,text),crays_core.append_native_personal_runtime_observation(text,text,text,jsonb),crays_core.persist_native_personal_agent_response(text,bigint,text) to ios_native_personal_http_fixture;`);
 const {createNativePersonalRuntimeRepository}=await import('../../src/db/native-personal-runtime-repository.ts');
 const original=await repositoryOriginal('runtime-repository-original');
 runtimeRepositoryTarget={accountId:fixtures[0].account.accountId,canonicalPersonId:'native-personal-0',agentId:'personal-'+'a'.repeat(48),
  bindingId:ownA.bindingId,bindingRevision:ownA.revision,contactRevision:original.revision,expectedIssuer:issuer,
  runtimeBindingSHA256:'c'.repeat(64),sdkSessionId:'repository-synthetic-session',sdkSessionKey:'agent:personal-'+'a'.repeat(48)+':ios:synthetic-core-conversation'};
 // Controlled admission callback, NOT an actual running host or live SDK/model.
 runtimeRepository=createNativePersonalRuntimeRepository(runtimeRepositoryTarget,async()=>{});
 const pair=await Promise.all([runtimeRepository.prepare(original.receipt.receiptId),runtimeRepository.prepare(original.receipt.receiptId)]);
 assert.equal(pair.filter(p=>p.freshlyCreated).length,1);assert.equal(pair[0].attemptId,pair[1].attemptId);assert.equal(pair[0].sdkRunId,pair[1].sdkRunId);
 repositoryPrepared=pair[0];assert.equal(repositoryPrepared.messageId,original.receipt.messageId);
 assert.deepEqual(Buffer.from(repositoryPrepared.body),Buffer.from('Runtime repository original · café 🌊 e\u0301'));
 assert.equal((await nativeAdminObserver.query('select count(*)::int n from crays_core.personal_messenger_runtime_attempts where receipt_id=$1',[original.receipt.receiptId])).rows[0].n,1);
 const ack={runId:repositoryPrepared.sdkRunId,sessionId:runtimeRepositoryTarget.sdkSessionId,status:'started'};
 const observed=await runtimeRepository.observe(repositoryPrepared.attemptId,'sdk-ack','acknowledged',ack);
 assert.equal(await runtimeRepository.observe(repositoryPrepared.attemptId,'sdk-ack','acknowledged',ack),observed);
 await assert.rejects(runtimeRepository.promote(repositoryPrepared.attemptId,observed),/Terminal response required/);
 const text='Controlled terminal through actual Core repository · exact 🌊 e\u0301';
 const terminal=await runtimeRepository.observe(repositoryPrepared.attemptId,'sdk-terminal','terminal_reply',{runId:repositoryPrepared.sdkRunId,sessionId:runtimeRepositoryTarget.sdkSessionId,text});
 const message=await runtimeRepository.promote(repositoryPrepared.attemptId,terminal);
 assert.match(message,/^personal-message-[a-f0-9-]{36}$/i);assert.equal(await runtimeRepository.promote(repositoryPrepared.attemptId,terminal),message);
 const transcript=await personalCall('NativePersonalTranscript');assert.ok(transcript.body.data.nativePersonalTranscript.messages.some(m=>m.messageId===message&&m.authorKind==='CHUCK'&&m.inReplyToMessageId===original.receipt.messageId&&m.body===text));
 const replay=await runtimeRepository.prepare(original.receipt.receiptId);assert.equal(replay.freshlyCreated,false);assert.equal(replay.sdkRunId,repositoryPrepared.sdkRunId);
});
test('runtime repository denies foreign receipt, changed target, revoked owner and uncertain-commit replacement run',async()=>{
 const {createNativePersonalRuntimeRepository}=await import('../../src/db/native-personal-runtime-repository.ts');
 const foreign=(await nativeAdminObserver.query('select receipt_id from crays_core.personal_messenger_ingress_receipts where account_id=$1 limit 1',[fixtures[1].account.accountId])).rows[0].receipt_id;
 await assert.rejects(runtimeRepository.prepare(foreign),/CURRENT_RECEIPT_REQUIRED/);
 const changed=createNativePersonalRuntimeRepository({...runtimeRepositoryTarget,runtimeBindingSHA256:'d'.repeat(64)},async()=>{});
 await assert.rejects(changed.prepare(repositoryPrepared.receiptId),/ORIGINAL_RUNTIME_CHANGED/);
 await nativeAdminObserver.query('update crays_core.account_email_verifications set revoked_at=now() where account_id=$1',[fixtures[0].account.accountId]);
 try{await assert.rejects(runtimeRepository.prepare(repositoryPrepared.receiptId),/CURRENT_OWNER_REQUIRED/);}
 finally{await nativeAdminObserver.query('update crays_core.account_email_verifications set revoked_at=null where account_id=$1',[fixtures[0].account.accountId]);}
 const original=await repositoryOriginal('runtime-repository-uncertain-commit');let checks=0;
 const uncertain=createNativePersonalRuntimeRepository(runtimeRepositoryTarget,async()=>{if(++checks===4)throw Error('SYNTHETIC_POST_COMMIT_AUTHORITY_LOSS');});
 await assert.rejects(uncertain.prepare(original.receipt.receiptId),/OUTCOME_UNKNOWN/);
 const committed=await runtimeRepository.prepare(original.receipt.receiptId);assert.equal(committed.freshlyCreated,false);
 assert.equal((await nativeAdminObserver.query('select count(*)::int n from crays_core.personal_messenger_runtime_attempts where receipt_id=$1',[original.receipt.receiptId])).rows[0].n,1);
 const current=(await database.getCorePgPool().query("select nullif(current_setting('crays.native_personal_account',true),'') account,nullif(current_setting('crays.native_personal_runtime_producer',true),'') producer")).rows[0];
 assert.deepEqual(current,{account:null,producer:null});
});


// Controlled SDK protocol dependency: these exercise the real Core repository,
// not a running original GatewayClient or a live model. Keep that gate OPEN.
async function dispatchHarness(key, mode="ack") {
 const {createNativePersonalSdkDispatch}=await import('../../src/lib/native-personal-sdk-dispatch.ts');
 const original=await repositoryOriginal(key);let calls=[],current=true,currentChecks=0;
 const validators=await import(qualifiedSdkURL('src-l2dWvEsN.mjs'));
 const transport={
  async assertCurrent(p){currentChecks++;if(!current)throw Error('SYNTHETIC_HOST_REVOKED');assert.equal(p.sdkSessionKey,runtimeRepositoryTarget.sdkSessionKey);assert.equal(p.agentId,runtimeRepositoryTarget.agentId);return mode==='missing-guards'?undefined:{expectedSessionRoutingContract:'per-sender|main|'+p.agentId,expectedLeafEntryId:null};},
  async request(method,params){
   calls.push({method,params});assert.equal((method==='chat.history'?validators.W:validators.J)(params),true,'original SDK parameter schema');
   const local=(await database.getCorePgPool().query("select nullif(current_setting('crays.native_personal_account',true),'') account,nullif(current_setting('crays.native_personal_runtime_producer',true),'') producer")).rows[0];
   assert.deepEqual(local,{account:null,producer:null},'no transaction/context held across SDK IO');
   if(method==='chat.history'){assert.equal(params.sessionId,undefined,'Original SDK rejects sessionId without messageId');return {sessionKey:params.sessionKey,sessionId:mode==='changed-session'?'OTHER':runtimeRepositoryTarget.sdkSessionId,sessionInfo:{key:params.sessionKey,sessionId:runtimeRepositoryTarget.sdkSessionId,agentId:runtimeRepositoryTarget.agentId,activeLeafEntryId:null},messages:[{role:'assistant',text:'Unrelated older response'}],inputReceipts:[{runId:params.inputRunIds[0],state:'consumed',consumedByEventId:'fixture-event'}]};}
   assert.equal(method,'chat.send');assert.equal(params.message,'Runtime repository original · café 🌊 e\u0301');
   if(mode==='unknown')throw Object.assign(Error('synthetic disconnect; not persisted'),{requestSent:true});
   if(mode==='revoke-after-send')current=false;
   return {runId:params.idempotencyKey,status:'started',messageSeq:1,secretFixture:'must never persist'};
  },
 };
 const dispatch=createNativePersonalSdkDispatch(runtimeRepository,transport);
 return {original,dispatch,calls,revoke(){current=false;},get currentChecks(){return currentChecks;}};
}
function dispatchTerminal(p,text='Controlled SDK protocol terminal · café 🌊 e\u0301',seq=2){
 return {type:'event',event:'chat',payload:{runId:p.sdkRunId,sessionKey:p.sdkSessionKey,seq,state:'final',message:{role:'assistant',content:[{type:'text',text}],text}}};
}
test('SDK observation read cannot create an original attempt or reserve a send',async()=>{
 const h=await dispatchHarness('sdk-unprepared-observation');
 assert.equal(await runtimeRepository.read(h.original.receipt.receiptId),null);
 await assert.rejects(h.dispatch.reconcile(h.original.receipt.receiptId),/ORIGINAL_ATTEMPT_REQUIRED/);
 await assert.rejects(h.dispatch.acceptEvent(h.original.receipt.receiptId,{event:'chat'}),/ORIGINAL_ATTEMPT_REQUIRED/);
 assert.equal(h.calls.length,0);assert.equal(await runtimeRepository.read(h.original.receipt.receiptId),null);
});
test('SDK dispatcher submits exactly one durable original under parallel dispatch and ACK never becomes an answer',async()=>{
 const h=await dispatchHarness('sdk-parallel-dispatch');
 const results=await Promise.all([h.dispatch.dispatch(h.original.receipt.receiptId),h.dispatch.dispatch(h.original.receipt.receiptId)]);
 assert.deepEqual(results.map(r=>r.state).sort(),['acknowledged','reconciliation_required']);
 const sends=h.calls.filter(c=>c.method==='chat.send');assert.equal(sends.length,1);
 const p=await runtimeRepository.read(h.original.receipt.receiptId);assert.equal(sends[0].params.idempotencyKey,p.sdkRunId);assert.equal(sends[0].params.expectedSessionRoutingContract,'per-sender|main|'+p.agentId);assert.equal(sends[0].params.expectedLeafEntryId,null);
 assert.deepEqual(Object.keys(sends[0].params).sort(),['agentId','expectedLeafEntryId','expectedSessionRoutingContract','idempotencyKey','message','sessionId','sessionKey']);
 const rows=(await nativeAdminObserver.query('select kind,projection from crays_core.personal_messenger_runtime_observations where attempt_id=$1',[p.attemptId])).rows;
 assert.equal(rows.length,1);assert.equal(rows[0].kind,'acknowledged');assert.equal(rows[0].projection.secretFixture,undefined);
 assert.equal((await nativeAdminObserver.query('select count(*)::int n from crays_core.personal_messenger_agent_responses where attempt_id=$1',[p.attemptId])).rows[0].n,0);
 await h.dispatch.reconcile(h.original.receipt.receiptId);assert.equal(h.calls.filter(c=>c.method==='chat.send').length,1);
 const event=dispatchTerminal(p),answer=await h.dispatch.acceptEvent(h.original.receipt.receiptId,event);
 assert.equal(answer.state,'canonical_response');assert.match(answer.messageId,/^personal-message-[a-f0-9-]{36}$/i);
 assert.deepEqual(await h.dispatch.acceptEvent(h.original.receipt.receiptId,event),answer);
 const transcript=await personalCall('NativePersonalTranscript');
 assert.ok(transcript.body.data.nativePersonalTranscript.messages.some(m=>m.messageId===answer.messageId&&m.authorKind==='CHUCK'&&m.inReplyToMessageId===h.original.receipt.messageId&&m.body===event.payload.message.text));
 await assert.rejects(h.dispatch.acceptEvent(h.original.receipt.receiptId,dispatchTerminal(p,'changed callback')),/Conflicting personal runtime callback/);
});
test('SDK unknown outcome stays on original run even after consumed or absent receipt and changed session cannot send',async()=>{
 const h=await dispatchHarness('sdk-unknown-send','unknown');
 assert.equal((await h.dispatch.dispatch(h.original.receipt.receiptId)).state,'transport_unknown');
 const p=await runtimeRepository.read(h.original.receipt.receiptId);
 await h.dispatch.dispatch(h.original.receipt.receiptId);await h.dispatch.reconcile(h.original.receipt.receiptId);
 assert.equal(h.calls.filter(c=>c.method==='chat.send').length,1);
 assert.equal((await runtimeRepository.read(h.original.receipt.receiptId)).sdkRunId,p.sdkRunId);
 const row=(await nativeAdminObserver.query('select projection from crays_core.personal_messenger_runtime_observations where attempt_id=$1',[p.attemptId])).rows[0];assert.equal(row.projection.requestSent,true);
 const guards=await dispatchHarness('sdk-missing-session-guards','missing-guards');await assert.rejects(guards.dispatch.dispatch(guards.original.receipt.receiptId),/SESSION_GUARDS_REQUIRED/);assert.equal(guards.calls.filter(c=>c.method==='chat.send').length,0);
 const changed=await dispatchHarness('sdk-changed-session','changed-session');
 await assert.rejects(changed.dispatch.dispatch(changed.original.receipt.receiptId),/SESSION_CHANGED/);
 assert.equal(changed.calls.filter(c=>c.method==='chat.send').length,0);
});
test('SDK terminal rejects foreign run/key/agent, nonassistant, inconsistent or unsupported output and never promotes deltas',async()=>{
 const h=await dispatchHarness('sdk-terminal-scope');await h.dispatch.dispatch(h.original.receipt.receiptId);
 const p=await runtimeRepository.read(h.original.receipt.receiptId);
 for(const change of [{runId:'other-run'},{sessionKey:'agent:other:main'},{agentId:'personal-'+'b'.repeat(48)}]){
  const event=dispatchTerminal(p);Object.assign(event.payload,change);await assert.rejects(h.dispatch.acceptEvent(h.original.receipt.receiptId,event),/FOREIGN_EVENT/);
 }
 for(const change of [{message:{role:'user',text:'pretend reply'}},{seq:0},{message:{role:'assistant',text:'one',content:[{type:'text',text:'two'}]}},{message:{role:'assistant',content:[{type:'image',url:'https://example.invalid/private'}]}},{message:{role:'assistant',text:'x'.repeat(16385)}}]){
  const event=dispatchTerminal(p);Object.assign(event.payload,change);await assert.rejects(h.dispatch.acceptEvent(h.original.receipt.receiptId,event),/INVALID_|INCONSISTENT_|NON_TEXT_/);
 }
 const delta=dispatchTerminal(p);delta.payload.state='delta';assert.equal((await h.dispatch.acceptEvent(h.original.receipt.receiptId,delta)).state,'nonterminal');
 assert.equal((await nativeAdminObserver.query('select count(*)::int n from crays_core.personal_messenger_agent_responses where attempt_id=$1',[p.attemptId])).rows[0].n,0);
 const error=dispatchTerminal(p);error.payload.state='error';error.payload.errorMessage='sensitive provider error not copied';
 assert.equal((await h.dispatch.acceptEvent(h.original.receipt.receiptId,error)).state,'terminal_error');
 const stored=(await nativeAdminObserver.query('select projection from crays_core.personal_messenger_runtime_observations where attempt_id=$1 and kind=$2',[p.attemptId,'terminal_error'])).rows[0].projection;
 assert.equal(stored.errorCode,'SDK_TERMINAL_ERROR');assert.equal(stored.errorMessage,undefined);
});
test('SDK current host and actual Core contact revocation suppress late terminal effects and permit no replacement send',async()=>{
 const h=await dispatchHarness('sdk-current-host','revoke-after-send');
 await assert.rejects(h.dispatch.dispatch(h.original.receipt.receiptId),/SYNTHETIC_HOST_REVOKED/);
 const p=await runtimeRepository.read(h.original.receipt.receiptId);
 await assert.rejects(h.dispatch.acceptEvent(h.original.receipt.receiptId,dispatchTerminal(p)),/SYNTHETIC_HOST_REVOKED/);
 assert.equal(h.calls.filter(c=>c.method==='chat.send').length,1);
 const c=await dispatchHarness('sdk-current-contact');await c.dispatch.dispatch(c.original.receipt.receiptId);
 const cp=await runtimeRepository.read(c.original.receipt.receiptId);
 await nativeAdminObserver.query('update crays_core.account_email_verifications set revoked_at=now() where account_id=$1',[fixtures[0].account.accountId]);
 try{await assert.rejects(c.dispatch.acceptEvent(c.original.receipt.receiptId,dispatchTerminal(cp)),/CURRENT_OWNER_REQUIRED/);}
 finally{await nativeAdminObserver.query('update crays_core.account_email_verifications set revoked_at=null where account_id=$1',[fixtures[0].account.accountId]);}
 assert.equal((await nativeAdminObserver.query('select count(*)::int n from crays_core.personal_messenger_agent_responses where attempt_id=$1',[cp.attemptId])).rows[0].n,0);
});

// Actual original GatewayClient is connected only to an ephemeral controlled
// loopback peer. This is protocol/client evidence, not hosted personal admission.
let originalGatewayClientCases=0;
test('original GatewayClient performs signed minimal device handshake, send and trusted terminal through actual Core',async()=>{
 const {originalGatewayPeer}=await import('./original-gateway-peer.mjs');
 const {createNativePersonalGatewayTransport}=await import('../../src/lib/native-personal-gateway-transport.ts');
 const {createNativePersonalSdkDispatch}=await import('../../src/lib/native-personal-sdk-dispatch.ts');
 const original=await repositoryOriginal('actual-original-sdk-client');
 const peer=await originalGatewayPeer(runtimeRepositoryTarget);let dispatch,eventDone;
 const observed=new Promise(resolve=>{eventDone=resolve;});
 const host=createNativePersonalGatewayTransport(peer.GatewayClient,peer.binding,async p=>{
  if(p)assert.equal(p.agentId,runtimeRepositoryTarget.agentId);
  return {expectedSessionRoutingContract:'per-sender|main|'+runtimeRepositoryTarget.agentId,expectedLeafEntryId:null};
 },async e=>{await dispatch.acceptEvent(original.receipt.receiptId,e);eventDone();});
 try{
  dispatch=createNativePersonalSdkDispatch(runtimeRepository,host.transport);await host.connect();originalGatewayClientCases++;
  assert.equal((await dispatch.dispatch(original.receipt.receiptId)).state,'acknowledged');
  const p=await runtimeRepository.read(original.receipt.receiptId),event=dispatchTerminal(p);
  peer.emit(event.event,event.payload);await Promise.race([observed,new Promise((_,reject)=>{const t=setTimeout(()=>reject(Error('ACTUAL_SDK_EVENT_TIMEOUT')),3000);t.unref();})]);await host.settled();
  const transcript=await personalCall('NativePersonalTranscript');assert.ok(transcript.body.data.nativePersonalTranscript.messages.some(m=>m.authorKind==='CHUCK'&&m.inReplyToMessageId===original.receipt.messageId&&m.body===event.payload.message.text));
  await dispatch.dispatch(original.receipt.receiptId);assert.equal(peer.calls.filter(c=>c.method==='chat.send').length,1);
  await assert.rejects(host.transport.request('agent.wait',{}),/METHOD_FORBIDDEN/);
  await assert.rejects(host.transport.request('chat.history',{agentId:'personal-'+'b'.repeat(48),sessionKey:runtimeRepositoryTarget.sdkSessionKey}),/FOREIGN_REQUEST/);
  await assert.rejects(host.connect(),/CONNECT_ONCE/);
 }finally{await host.close();await peer.close();}
});
for(const mode of ['broad-scopes','wrong-boot','wrong-auth'])test('original SDK hello '+mode+' never grants personal transport readiness',async()=>{
 const {originalGatewayPeer}=await import('./original-gateway-peer.mjs');const {createNativePersonalGatewayTransport}=await import('../../src/lib/native-personal-gateway-transport.ts');
 const peer=await originalGatewayPeer(runtimeRepositoryTarget,mode);let events=0;
 const host=createNativePersonalGatewayTransport(peer.GatewayClient,peer.binding,async()=>({expectedSessionRoutingContract:'synthetic',expectedLeafEntryId:null}),async()=>{events++;});
 try{await assert.rejects(host.connect(),/HELLO_NOT_ADMITTED/);originalGatewayClientCases++;assert.equal(peer.calls.length,1);assert.equal(events,0);}
 finally{await host.close();await peer.close();}
});
test('actual original SDK lost ACK and current host revocation never resend or publish a late answer',async()=>{
 const {originalGatewayPeer}=await import('./original-gateway-peer.mjs');const {createNativePersonalGatewayTransport}=await import('../../src/lib/native-personal-gateway-transport.ts');const {createNativePersonalSdkDispatch}=await import('../../src/lib/native-personal-sdk-dispatch.ts');
 const original=await repositoryOriginal('actual-sdk-lost-ack'),peer=await originalGatewayPeer(runtimeRepositoryTarget,'lost-ack');let current=true,events=0;
 const host=createNativePersonalGatewayTransport(peer.GatewayClient,peer.binding,async()=>{if(!current)throw Error('SYNTHETIC_REVOKED_HOST');return {expectedSessionRoutingContract:'synthetic',expectedLeafEntryId:null};},async()=>{events++;});
 try{
  await host.connect();originalGatewayClientCases++;const dispatch=createNativePersonalSdkDispatch(runtimeRepository,host.transport);
  assert.equal((await dispatch.dispatch(original.receipt.receiptId)).state,'transport_unknown');
  await dispatch.dispatch(original.receipt.receiptId);assert.equal(peer.calls.filter(c=>c.method==='chat.send').length,1);
  current=false;const p=await runtimeRepository.read(original.receipt.receiptId),event=dispatchTerminal(p);peer.emit(event.event,event.payload);
  // Observe the actual socket event invalidating this connection, rather than
  // accepting the earlier synthetic current-host callback rejection as proof.
  let eventRejected=false;
  for(let i=0;i<50;i++){
   try{await host.settled();}catch(error){if(error.message.includes('EVENT_NOT_RECONCILED')){eventRejected=true;break;}}
   await new Promise(r=>setTimeout(r,10));
  }
  assert.equal(eventRejected,true);await assert.rejects(host.settled(),/EVENT_NOT_RECONCILED/);
  await assert.rejects(dispatch.dispatch(original.receipt.receiptId),/EVENT_NOT_RECONCILED/);
  assert.equal(events,0);assert.equal(peer.calls.filter(c=>c.method==='chat.send').length,1);
 }finally{await host.close();await peer.close();}
});

async function waitForCanonicalRequests(ids){
 for(let i=0;i<100;i++){
  const rows=(await nativeAdminObserver.query('select request_message_id,message_id from crays_core.personal_messenger_agent_responses where request_message_id=any($1::text[])',[ids])).rows;
  if(rows.length===ids.length)return rows;
  await new Promise(resolve=>setTimeout(resolve,20));
 }
 assert.fail('Expected actual Core canonical response was not observed');
}
test('composed original Chuck host routes out-of-order parallel replies by durable own run, ignores foreign runs and replays once',async()=>{
 const {createNativePersonalChuckHost}=await import('../../src/lib/native-personal-chuck-host.ts');
 const {originalGatewayPeer}=await import('./original-gateway-peer.mjs');
 const {createNativePersonalRuntimeRepository}=await import('../../src/db/native-personal-runtime-repository.ts');
 const a=await repositoryOriginal('composed-host-first','FIRST original private request'),b=await repositoryOriginal('composed-host-second','SECOND original private request');
 const peer=await originalGatewayPeer(runtimeRepositoryTarget);
 const admit=async()=>({expectedSessionRoutingContract:'per-sender|main|'+runtimeRepositoryTarget.agentId,expectedLeafEntryId:null});
 const host=createNativePersonalChuckHost(runtimeRepositoryTarget,peer.GatewayClient,peer.binding,admit);
 const receiptB=(await nativeAdminObserver.query('select receipt_id from crays_core.personal_messenger_ingress_receipts where account_id=$1 limit 1',[fixtures[1].account.accountId])).rows[0].receipt_id;
 const currentB=String((await nativeAdminObserver.query('select primary_contact_revision from crays_core.crays_accounts where account_id=$1',[fixtures[1].account.accountId])).rows[0].primary_contact_revision);
 const targetB={...runtimeRepositoryTarget,accountId:fixtures[1].account.accountId,canonicalPersonId:'native-personal-1',agentId:'personal-'+'b'.repeat(48),bindingId:ownB.bindingId,bindingRevision:ownB.revision,contactRevision:currentB,sdkSessionKey:'agent:personal-'+'b'.repeat(48)+':ios:synthetic-core-conversation-b',sdkSessionId:'repository-synthetic-session-b',runtimeBindingSHA256:'b'.repeat(64)};
 const repoB=createNativePersonalRuntimeRepository(targetB,async()=>{}),foreign=await repoB.prepare(receiptB);
 assert.equal(await runtimeRepository.findByRun(foreign.sdkRunId),null);assert.equal(await repoB.findByRun('personal-run-'+randomUUID()),null);
 try{
  await assert.rejects(host.dispatchReceipt(a.receipt.receiptId),/NOT_AUTHENTICATED/);assert.equal(await runtimeRepository.read(a.receipt.receiptId),null);
  await host.connect();originalGatewayClientCases++;
  const results=await Promise.all([host.dispatchReceipt(a.receipt.receiptId),host.dispatchReceipt(b.receipt.receiptId)]);assert.ok(results.every(r=>r.state==='acknowledged'));
  const pa=await runtimeRepository.read(a.receipt.receiptId),pb=await runtimeRepository.read(b.receipt.receiptId);assert.notEqual(pa.sdkRunId,pb.sdkRunId);
  assert.equal(peer.calls.filter(c=>c.method==='chat.send').length,2);assert.deepEqual(peer.calls.filter(c=>c.method==='chat.send').map(c=>c.params.message).sort(),['FIRST original private request','SECOND original private request']);
  const countBefore=(await nativeAdminObserver.query('select count(*)::int n from crays_core.personal_messenger_runtime_attempts')).rows[0].n;
  const eb=dispatchTerminal(pb,'Reply for SECOND original'),ea=dispatchTerminal(pa,'Reply for FIRST original');
  peer.emit(eb.event,eb.payload);
  peer.emit('chat',dispatchTerminal({...pa,sdkRunId:foreign.sdkRunId},'Foreign text must never enter own Core').payload);
  peer.emit('chat',dispatchTerminal({...pa,sdkRunId:'personal-run-'+randomUUID()},'Unknown run must never mint a Core request').payload);
  peer.emit(ea.event,ea.payload);
  await waitForCanonicalRequests([a.receipt.messageId,b.receipt.messageId]);await host.settled();
  peer.emit(eb.event,eb.payload);await host.reconcileReceipt(b.receipt.receiptId);await host.settled();
  const transcript=await personalCall('NativePersonalTranscript');
  for(const [original,text] of [[a,'Reply for FIRST original'],[b,'Reply for SECOND original']])assert.ok(transcript.body.data.nativePersonalTranscript.messages.some(m=>m.authorKind==='CHUCK'&&m.inReplyToMessageId===original.receipt.messageId&&m.body===text));
  assert.equal((await nativeAdminObserver.query('select count(*)::int n from crays_core.personal_messenger_runtime_attempts')).rows[0].n,countBefore);
  assert.equal((await nativeAdminObserver.query('select count(*)::int n from crays_core.personal_messenger_agent_responses where request_message_id=any($1::text[])',[[a.receipt.messageId,b.receipt.messageId]])).rows[0].n,2);
  assert.equal((await nativeAdminObserver.query('select count(*)::int n from crays_core.personal_messenger_agent_responses where attempt_id=$1',[foreign.attemptId])).rows[0].n,0);
  assert.equal(peer.calls.filter(c=>c.method==='chat.send').length,2);
 }finally{await host.close();await peer.close();}
});
test('new composed host recovers durable pending run routing after reconnect without another send',async()=>{
 const {createNativePersonalChuckHost}=await import('../../src/lib/native-personal-chuck-host.ts');const {originalGatewayPeer}=await import('./original-gateway-peer.mjs');
 const anchor=(await nativeAdminObserver.query(`select receipt_id from crays_core.personal_messenger_ingress_receipts
  where account_id=$1 and binding_id=$2 and binding_revision=$3::bigint and contact_revision=$4::bigint order by created_at desc,receipt_id desc limit 1`,
  [runtimeRepositoryTarget.accountId,runtimeRepositoryTarget.bindingId,runtimeRepositoryTarget.bindingRevision,runtimeRepositoryTarget.contactRevision])).rows[0].receipt_id;
 const original=await repositoryOriginal('composed-host-restart','Request before controlled host restart');
 const admit=async()=>({expectedSessionRoutingContract:'per-sender|main|'+runtimeRepositoryTarget.agentId,expectedLeafEntryId:null});
 const peer1=await originalGatewayPeer(runtimeRepositoryTarget),host1=createNativePersonalChuckHost(runtimeRepositoryTarget,peer1.GatewayClient,peer1.binding,admit);
 try{
  await assert.rejects(host1.dispatchOutboxPage(anchor,1),/NOT_AUTHENTICATED/);assert.equal(await runtimeRepository.read(original.receipt.receiptId),null);
  await host1.connect();originalGatewayClientCases++;
  const stopped=new AbortController();stopped.abort();await assert.rejects(host1.dispatchOutboxPage(anchor,1,stopped.signal),{name:'AbortError'});
  assert.equal(await runtimeRepository.read(original.receipt.receiptId),null);assert.equal(peer1.calls.filter(c=>c.method==='chat.send').length,0);
  const pages=await Promise.all([host1.dispatchOutboxPage(anchor,1),host1.dispatchOutboxPage(anchor,1)]);
  for(const page of pages){assert.deepEqual(page.results.map(r=>r.receiptId),[original.receipt.receiptId]);assert.equal(page.nextAfterReceiptId,null);}
  assert.equal(pages.flatMap(page=>page.results).filter(r=>r.state==='acknowledged').length,1);
  assert.equal(peer1.calls.filter(c=>c.method==='chat.send').length,1);
 }
 finally{await host1.close();await peer1.close();}
 const pending=await runtimeRepository.read(original.receipt.receiptId),peer2=await originalGatewayPeer(runtimeRepositoryTarget),host2=createNativePersonalChuckHost(runtimeRepositoryTarget,peer2.GatewayClient,peer2.binding,admit);
 try{
  await host2.connect();originalGatewayClientCases++;assert.equal((await host2.dispatchReceipt(original.receipt.receiptId)).state,'reconciliation_required');
  const event=dispatchTerminal(pending,'Delayed controlled reply after reconnect');peer2.emit(event.event,event.payload);
  await waitForCanonicalRequests([original.receipt.messageId]);await host2.settled();
  assert.equal(peer2.calls.filter(c=>c.method==='chat.send').length,0);assert.equal((await runtimeRepository.read(original.receipt.receiptId)).sdkRunId,pending.sdkRunId);
  const transcript=await personalCall('NativePersonalTranscript');assert.ok(transcript.body.data.nativePersonalTranscript.messages.some(m=>m.inReplyToMessageId===original.receipt.messageId&&m.body===event.payload.message.text));
 }finally{await host2.close();await peer2.close();}
 assert.throws(()=>createNativePersonalChuckHost(runtimeRepositoryTarget,peer2.GatewayClient,{...peer2.binding,sdkSessionId:'other-session'},admit),/BINDING_MISMATCH/);
});

function storedSdkTerminal(p,text='Persisted controlled SDK reply after lost event',id='controlled-sdk-terminal-id') {
 return {role:'assistant',stopReason:'stop',endTurn:true,content:[{type:'text',text}],__openclaw:{id,runId:p.sdkRunId}};
}
test('original SDK projected history recovers a lost terminal into exact Core original without resend and matches later live callback',async()=>{
 const {originalGatewayPeer}=await import('./original-gateway-peer.mjs');const {createNativePersonalChuckHost}=await import('../../src/lib/native-personal-chuck-host.ts');
 const {a:projectChatDisplayMessage}=await import(qualifiedSdkURL('chat-display-projection.core-BRO3Pr6M.mjs'));
 const original=await repositoryOriginal('sdk-history-lost-terminal'),peer=await originalGatewayPeer(runtimeRepositoryTarget);
 const host=createNativePersonalChuckHost(runtimeRepositoryTarget,peer.GatewayClient,peer.binding,async()=>({expectedSessionRoutingContract:'synthetic',expectedLeafEntryId:null}));
 try{
  await host.connect();originalGatewayClientCases++;await host.dispatchReceipt(original.receipt.receiptId);
  const p=await runtimeRepository.read(original.receipt.receiptId),raw={...storedSdkTerminal(p),phase:'final_answer'},projected=projectChatDisplayMessage(raw);
  assert.equal(projected.__openclaw.runId,p.sdkRunId);assert.equal(projected.__openclaw.id,raw.__openclaw.id);assert.equal(projected.stopReason,'stop');assert.equal(projected.phase,'final_answer');
  peer.setHistory([projected]);const recovered=await host.reconcileReceipt(original.receipt.receiptId);assert.equal(recovered.state,'canonical_response');
  assert.deepEqual(await host.dispatchReceipt(original.receipt.receiptId),recovered);
  const event=dispatchTerminal(p,raw.content[0].text);peer.emit(event.event,event.payload);
  await host.reconcileReceipt(original.receipt.receiptId);await host.settled();
  assert.equal(peer.calls.filter(c=>c.method==='chat.send').length,1);
  const rows=await waitForCanonicalRequests([original.receipt.messageId]);assert.equal(rows[0].message_id,recovered.messageId);
  const transcript=await personalCall('NativePersonalTranscript');assert.ok(transcript.body.data.nativePersonalTranscript.messages.some(m=>m.messageId===recovered.messageId&&m.inReplyToMessageId===original.receipt.messageId&&m.body===raw.content[0].text));
 }finally{await host.close();await peer.close();}
});
test('history recovery refuses last assistant, consumed input, partial/failure/truncated/foreign and ambiguous final provenance',async()=>{
 // Continue an already persisted unknown-send scenario instead of exhausting
 // the real per-IP/APQ rate window by manufacturing another HTTP original.
 const prior=(await nativeAdminObserver.query('select receipt_id from crays_core.personal_messenger_ingress_receipts where account_id=$1 and idempotency_key=$2',[fixtures[0].account.accountId,'sdk-unknown-send'])).rows[0];
 const p=await runtimeRepository.read(prior.receipt_id);
 const {createNativePersonalSdkDispatch}=await import('../../src/lib/native-personal-sdk-dispatch.ts');
 let messages=[];const transport={assertCurrent:async()=>({expectedSessionRoutingContract:'synthetic',expectedLeafEntryId:null}),async request(method,params){assert.equal(method,'chat.history','recovery cannot send');assert.equal(params.inputRunIds[0],p.sdkRunId);return {sessionKey:p.sdkSessionKey,sessionId:p.sdkSessionId,sessionInfo:{key:p.sdkSessionKey,sessionId:p.sdkSessionId,agentId:p.agentId,activeLeafEntryId:null},messages,hasMore:false,totalMessages:messages.length,inputReceipts:[{runId:p.sdkRunId,state:'consumed',consumedByEventId:'only-input-consumption'}]};}};
 const recovery=createNativePersonalSdkDispatch(runtimeRepository,transport),valid=storedSdkTerminal(p);
 const commentaryBlock={type:'text',text:'Commentary is not a completed answer',textSignature:JSON.stringify({v:1,phase:'commentary'})};
 const invalids=[{...valid,phase:'commentary'},{...valid,content:[commentaryBlock]},{role:'assistant',text:'unrelated last assistant'}, {...valid,__openclaw:{id:'foreign',runId:'personal-run-'+randomUUID()}},{...valid,role:'user'},{...valid,stopReason:'toolUse'},{...valid,endTurn:false},{...valid,__openclaw:{...valid.__openclaw,truncated:true}},{...valid,stopReason:'error',errorMessage:'private provider error'}, {...valid,openclawAbort:{aborted:true}},{...valid,openclawStreamFallback:{source:'segment'}},{...valid,idempotencyKey:'foreign-run'},{...valid,content:[{type:'image',url:'https://example.invalid/private-image'}]}];
 for(const invalid of invalids){messages=[invalid];assert.equal((await recovery.reconcile(p.receiptId)).state,'reconciliation_required');}
 for(const message of [{...valid,phase:'commentary'},{...valid,content:[commentaryBlock]}]){const event=dispatchTerminal(p);event.payload.message=message;await assert.rejects(recovery.acceptEvent(p.receiptId,event),/NONFINAL_TERMINAL_MESSAGE/);}
 messages=[valid,{...valid,__openclaw:{id:'second-final',runId:p.sdkRunId}}];await assert.rejects(recovery.reconcile(p.receiptId),/AMBIGUOUS_HISTORY_TERMINAL/);
 messages=[valid,storedSdkTerminal(p,'Conflicting body for same persisted ID')];await assert.rejects(recovery.reconcile(p.receiptId),/AMBIGUOUS_HISTORY_TERMINAL/);
 messages=[valid,{...valid,__openclaw:{id:'same-run-media-final',runId:p.sdkRunId},content:[{type:'video',url:'https://example.invalid/private-video'}]}];assert.equal((await recovery.reconcile(p.receiptId)).state,'reconciliation_required');
 assert.equal((await nativeAdminObserver.query('select count(*)::int n from crays_core.personal_messenger_agent_responses where attempt_id=$1',[p.attemptId])).rows[0].n,0);
 // Gateway-injected source rows use exact root idempotencyKey when provider
 // run metadata is absent. Original projector must retain that actual shape.
 const {a:project}=await import(qualifiedSdkURL('chat-display-projection.core-BRO3Pr6M.mjs'));
 messages=[project({...valid,__openclaw:{id:'injected-final'},idempotencyKey:p.sdkRunId,content:[{type:'text',text:valid.content[0].text,textSignature:JSON.stringify({v:1,phase:'final_answer'})}]})];assert.equal(messages[0].idempotencyKey,p.sdkRunId);
 assert.equal((await recovery.reconcile(p.receiptId)).state,'canonical_response');
});

test('pending outbox pages use actual own-account RLS and immutable cursors without claiming attempts or completed responses',async()=>{
 const attempts=(await nativeAdminObserver.query('select count(*)::int n from crays_core.personal_messenger_runtime_attempts')).rows[0].n;
 const expected=(await nativeAdminObserver.query(`select r.receipt_id from crays_core.personal_messenger_ingress_receipts r
  join crays_core.personal_messenger_outbox o on o.receipt_id=r.receipt_id
  join crays_core.messages m on m.message_id=r.message_id
  where r.account_id=$1 and r.binding_id=$2 and r.binding_revision=$3::bigint and r.contact_revision=$4::bigint
   and m.deleted_at is null and not exists(select 1 from crays_core.personal_messenger_agent_responses a where a.request_message_id=r.message_id)
  order by r.created_at,r.receipt_id`,[runtimeRepositoryTarget.accountId,runtimeRepositoryTarget.bindingId,runtimeRepositoryTarget.bindingRevision,runtimeRepositoryTarget.contactRevision])).rows.map(r=>r.receipt_id);
 assert.ok(expected.length>2,'Actual Core pending originals needed, not an empty-page fixture');
 const received=[];let cursor=null,pages=0;
 do{const page=await runtimeRepository.pendingOutboxPage(cursor,2);assert.ok(Object.isFrozen(page)&&Object.isFrozen(page.receiptIds));received.push(...page.receiptIds);cursor=page.nextAfterReceiptId;assert.ok(++pages<=100);}while(cursor!==null);
 assert.deepEqual(received,expected);assert.equal(new Set(received).size,received.length);
 const foreign=(await nativeAdminObserver.query('select receipt_id from crays_core.personal_messenger_ingress_receipts where account_id=$1 limit 1',[fixtures[1].account.accountId])).rows[0].receipt_id;
 for(const anchor of [foreign,'personal-receipt-'+randomUUID()])await assert.rejects(runtimeRepository.pendingOutboxPage(anchor,2),/INVALID_OUTBOX_CURSOR/);
 for(const limit of [0,21,-1,1.1,NaN])await assert.rejects(runtimeRepository.pendingOutboxPage(null,limit),/INVALID_OUTBOX_PAGE/);
 assert.equal((await nativeAdminObserver.query('select count(*)::int n from crays_core.personal_messenger_runtime_attempts')).rows[0].n,attempts);
});
test('pending outbox read rechecks participant, binding and verified contact; denied scans create no attempts',async()=>{
 const before=(await nativeAdminObserver.query('select count(*)::int n from crays_core.personal_messenger_runtime_attempts')).rows[0].n;
 for(const [table,key,id,column,disabled,restored]of[
  ['conversation_participants','conversation_id',ownA.conversationId,'can_reply',false,true],
  ['personal_messenger_bindings','binding_id',ownA.bindingId,'status','revoked','active'],
  ['account_email_verifications','account_id',fixtures[0].account.accountId,'revoked_at',new Date(),null],
 ]){
  await nativeAdminObserver.query(`update crays_core.${table} set ${column}=$1 where ${key}=$2`,[disabled,id]);
  try{await assert.rejects(runtimeRepository.pendingOutboxPage(),/CURRENT_OUTBOX_BINDING_REQUIRED|CURRENT_OWNER_REQUIRED/);}
  finally{await nativeAdminObserver.query(`update crays_core.${table} set ${column}=$1 where ${key}=$2`,[restored,id]);}
 }
 assert.equal((await nativeAdminObserver.query('select count(*)::int n from crays_core.personal_messenger_runtime_attempts')).rows[0].n,before);
});

test('outbox page cancellation during actual SDK history prevents send, and cancellation after possible send preserves ACK without resend',async()=>{
 const {createNativePersonalChuckHost}=await import('../../src/lib/native-personal-chuck-host.ts');
 const {originalGatewayPeer}=await import('./original-gateway-peer.mjs');
 const unattempted=(await nativeAdminObserver.query(`select r.receipt_id from crays_core.personal_messenger_ingress_receipts r
  where r.account_id=$1 and r.binding_id=$2 and r.binding_revision=$3::bigint and r.contact_revision=$4::bigint
   and not exists(select 1 from crays_core.personal_messenger_runtime_attempts t where t.receipt_id=r.receipt_id)
  order by r.created_at,r.receipt_id limit 2`,[runtimeRepositoryTarget.accountId,runtimeRepositoryTarget.bindingId,runtimeRepositoryTarget.bindingRevision,runtimeRepositoryTarget.contactRevision])).rows;
 assert.equal(unattempted.length,2,'Reuse actual existing HTTP originals; do not bypass HTTP rate limits or fabricate receipts');
 for(const [index,{receipt_id:receipt}] of unattempted.entries()){
  const anchor=(await nativeAdminObserver.query(`select r.receipt_id from crays_core.personal_messenger_ingress_receipts r
   where r.account_id=$1 and r.binding_id=$2 and r.binding_revision=$3::bigint and r.contact_revision=$4::bigint
    and (r.created_at,r.receipt_id)<(select a.created_at,a.receipt_id from crays_core.personal_messenger_ingress_receipts a where a.receipt_id=$5)
   order by r.created_at desc,r.receipt_id desc limit 1`,[runtimeRepositoryTarget.accountId,runtimeRepositoryTarget.bindingId,runtimeRepositoryTarget.bindingRevision,runtimeRepositoryTarget.contactRevision,receipt])).rows[0]?.receipt_id??null;
  const peer=await originalGatewayPeer(runtimeRepositoryTarget),controller=new AbortController();
  const host=createNativePersonalChuckHost(runtimeRepositoryTarget,peer.GatewayClient,peer.binding,async()=>({expectedSessionRoutingContract:'synthetic',expectedLeafEntryId:null}));
  try{
   await host.connect();originalGatewayClientCases++;
   if(index===0){
    peer.holdNextHistory();const pending=host.dispatchOutboxPage(anchor,1,controller.signal);const rejected=assert.rejects(pending,{name:'AbortError'});
    await peer.waitForHeldHistory();controller.abort();peer.releaseHistory();await rejected;
    assert.equal(peer.calls.filter(c=>c.method==='chat.send').length,0);
   }else{
    peer.onSend(()=>controller.abort());await assert.rejects(host.dispatchOutboxPage(anchor,1,controller.signal),{name:'AbortError'});
    assert.equal(peer.calls.filter(c=>c.method==='chat.send').length,1);
   }
   const p=await runtimeRepository.read(receipt);assert.ok(p);
   const observations=(await nativeAdminObserver.query('select kind from crays_core.personal_messenger_runtime_observations where attempt_id=$1',[p.attemptId])).rows;
   assert.equal(observations.filter(row=>row.kind==='acknowledged').length,index===0?0:1);
   const replay=await host.dispatchOutboxPage(anchor,1);assert.equal(replay.results[0].receiptId,receipt);assert.equal(replay.results[0].state,'reconciliation_required');
   assert.equal((await runtimeRepository.read(receipt)).sdkRunId,p.sdkRunId);assert.equal(peer.calls.filter(c=>c.method==='chat.send').length,index===0?0:1);
  }finally{peer.releaseHistory();await host.close();await peer.close();}
 }
});
test('actual SDK transport rechecks page cancellation after asynchronous admission immediately before socket send',async()=>{
 const {createNativePersonalGatewayTransport}=await import('../../src/lib/native-personal-gateway-transport.ts');const {originalGatewayPeer}=await import('./original-gateway-peer.mjs');
 const peer=await originalGatewayPeer(runtimeRepositoryTarget),controller=new AbortController();let armed=false,release,entered;
 const waiting=new Promise(resolve=>{entered=resolve;});
 const host=createNativePersonalGatewayTransport(peer.GatewayClient,peer.binding,async()=>{
  if(armed){entered();await new Promise(resolve=>{release=resolve;});}return {expectedSessionRoutingContract:'synthetic',expectedLeafEntryId:null};
 },async()=>{});
 try{
  await host.connect();originalGatewayClientCases++;armed=true;
  const pending=host.transport.request('chat.send',{agentId:runtimeRepositoryTarget.agentId,sessionKey:runtimeRepositoryTarget.sdkSessionKey,sessionId:runtimeRepositoryTarget.sdkSessionId,message:'Must not reach SDK',idempotencyKey:'cancelled-before-socket'},controller.signal);
  const denied=assert.rejects(pending,error=>error.message.includes('REQUEST_CANCELLED_BEFORE_SEND')&&error.requestSent===false);
  await waiting;controller.abort();release();await denied;
  assert.equal(peer.calls.filter(c=>c.method==='chat.send').length,0);
 }finally{release?.();await host.close();await peer.close();}
});

test('registered typed request state reflects current exact dispatch facts without rewriting immutable acceptance or inventing answers',async()=>{
 console.log('WAITING_REAL_RATE_LIMIT_WINDOW_BEFORE_MULTIREAD_DISPATCH_PROJECTION');await new Promise(resolve=>setTimeout(resolve,61000));
 let result=await personalCall('NativePersonalRequests');
 if(result.body.errors?.some(error=>error.extensions?.code==='RATE_LIMITED')){
  // The full original HTTP suite exhausts the real 120/minute shared limit.
  // Respect a fresh real window; never reset counters, increase limits, forge
  // a different IP or bypass the registered HTTP path for the new assertions.
  console.log('WAITING_REAL_RATE_LIMIT_WINDOW_FOR_DISPATCH_PROJECTION');
  await new Promise(resolve=>setTimeout(resolve,61000));
  result=await personalCall('NativePersonalRequests');
 }
 assert.equal(result.status,200,JSON.stringify(result.body));assert.ok(!result.body.errors,JSON.stringify(result.body));
 const page=result.body.data.nativePersonalRequests;
 const receipts=(await nativeAdminObserver.query('select receipt_id,idempotency_key from crays_core.personal_messenger_ingress_receipts where account_id=$1',[runtimeRepositoryTarget.accountId])).rows;
 for(const [key,state]of[['sdk-missing-session-guards','CHECK_REQUIRED'],['actual-sdk-lost-ack','CHECK_REQUIRED'],['sdk-current-contact','ACKNOWLEDGED'],['sdk-terminal-scope','FAILED'],['composed-host-first','RESPONSE_AVAILABLE']]){
  const receipt=receipts.find(r=>r.idempotency_key===key);assert.ok(receipt,key);const item=page.requests.find(r=>r.receiptId===receipt.receipt_id);assert.ok(item,key);assert.equal(item.dispatchState,state,key);
  assert.equal(item.acceptanceOutcome,'STORED_RUNTIME_UNAVAILABLE');assert.equal(item.runtimeAdmissionState,'waiting_runtime_admission');
  for(const field of ['sdkRunId','runtimeBindingSHA256','projection','profileRef','attemptId','answer'])assert.equal(Object.hasOwn(item,field),false,field);
 }
 const answered=page.requests.find(item=>item.dispatchState==='RESPONSE_AVAILABLE');assert.ok(answered);
 const answer=(await nativeAdminObserver.query('select message_id from crays_core.personal_messenger_agent_responses where request_message_id=$1',[answered.messageId])).rows[0];
 await nativeAdminObserver.query('update crays_core.messages set deleted_at=now() where message_id=$1',[answer.message_id]);
 try{
  const hidden=await personalCall('NativePersonalRequests');assert.equal(hidden.status,200,JSON.stringify(hidden.body));assert.ok(!hidden.body.errors,JSON.stringify(hidden.body));
  assert.equal(hidden.body.data.nativePersonalRequests.requests.find(item=>item.messageId===answered.messageId).dispatchState,'CHECK_REQUIRED','Hidden canonical answer cannot be called available');
 }finally{await nativeAdminObserver.query('update crays_core.messages set deleted_at=null where message_id=$1',[answer.message_id]);}
 writeFileSync(process.env.CRAYS_NATIVE_SQL_FIXTURE_RESULT+'.dispatch-requests.json',JSON.stringify(result.body,null,2)+'\n');
 const other=await personalCall('NativePersonalRequests',{}, {subject:fixtures[1].authIdentity.providerSubject});assert.equal(other.status,200,JSON.stringify(other.body));
 const ownIds=new Set(page.requests.map(r=>r.receiptId));assert.ok(other.body.data.nativePersonalRequests.requests.every(r=>!ownIds.has(r.receiptId)));
});


test('original SDK offset recovery scans older pages before accepting a final and refuses incomplete or shifting histories',async()=>{
 const {originalGatewayPeer}=await import('./original-gateway-peer.mjs');const {createNativePersonalChuckHost}=await import('../../src/lib/native-personal-chuck-host.ts');
 const original=await repositoryOriginal('sdk-paginated-recovery'),p=await runtimeRepository.prepare(original.receipt.receiptId),peer=await originalGatewayPeer(runtimeRepositoryTarget);
 let leaf='stable-current-leaf',mode='older-media',tailReads=0;
 const host=createNativePersonalChuckHost(runtimeRepositoryTarget,peer.GatewayClient,peer.binding,async()=>({expectedSessionRoutingContract:'synthetic-page-route',expectedLeafEntryId:leaf}));
 const valid=storedSdkTerminal(p,'Exact older-page reply, café 👋','paged-final'),filler={role:'user',content:[{type:'text',text:'Unrelated recent original'}],__openclaw:{id:'recent-other-original'}};
 peer.setHistoryResponder(params=>{
  const offset=params.offset??0,base={sessionKey:p.sdkSessionKey,sessionId:p.sdkSessionId,sessionInfo:{key:p.sdkSessionKey,sessionId:p.sdkSessionId,agentId:p.agentId,activeLeafEntryId:null},inputReceipts:[],hasMore:offset===0,totalMessages:100,...(offset===0?{nextOffset:50}:{offset})};
  if(offset===0)tailReads++;
  if(mode==='sdk-changed-leaf'&&offset)base.sessionInfo.activeLeafEntryId='other-leaf';
  if(mode==='sdk-changed-tail-leaf'&&offset===0&&tailReads>1)base.sessionInfo.activeLeafEntryId='other-tail-leaf';
  if(mode==='older-only'&&offset)delete base.sessionInfo.activeLeafEntryId;
  if(mode==='missing-metadata')return {sessionKey:p.sdkSessionKey,sessionId:p.sdkSessionId,sessionInfo:base.sessionInfo,messages:[valid]};
  if(mode==='bound')return {...base,messages:[filler],hasMore:true,totalMessages:100000,nextOffset:offset+1,...(offset?{offset}:{})};
  if(mode==='bad-next')return {...base,messages:[valid],nextOffset:0};
  if(mode==='changed-total'&&offset)return {...base,messages:[valid],totalMessages:101};
  if(mode==='wrong-offset'&&offset)return {...base,messages:[valid],offset:49};
  if(mode==='reset'&&offset)return {...base,messages:[valid],windowReset:true};
  if(mode==='foreign-session'&&offset)return {...base,messages:[valid],sessionId:'foreign-session'};
  if(mode==='changed-leaf'&&offset)leaf='changed-current-leaf';
  if(mode==='shifted-tail'&&offset===0&&tailReads>1)return {...base,messages:[{...filler,text:'Tail changed during pagination'}]};
  if(mode==='older-media')return {...base,messages:offset?[{...valid,__openclaw:{id:'older-media',runId:p.sdkRunId},content:[{type:'image',url:'https://example.invalid/private-media'}]}]:[valid]};
  if(mode==='ambiguous')return {...base,messages:[offset?{...valid,__openclaw:{id:'other-final',runId:p.sdkRunId}}:valid]};
  if(mode==='overlap')return {...base,messages:[valid]};
  return {...base,messages:[offset?valid:filler]};
 });
 const noAnswer=async()=>assert.equal((await nativeAdminObserver.query('select count(*)::int n from crays_core.personal_messenger_agent_responses where attempt_id=$1',[p.attemptId])).rows[0].n,0);
 try{
  await host.connect();originalGatewayClientCases++;
  for(mode of ['older-media','missing-metadata','bad-next','changed-total','wrong-offset','reset','bound','shifted-tail','changed-leaf','sdk-changed-leaf','sdk-changed-tail-leaf']){
   leaf='stable-current-leaf';tailReads=0;
   assert.equal((await host.reconcileReceipt(p.receiptId)).state,'reconciliation_required',mode);await noAnswer();
  }
  mode='foreign-session';await assert.rejects(host.reconcileReceipt(p.receiptId),/SESSION_CHANGED/);await noAnswer();
  mode='ambiguous';await assert.rejects(host.reconcileReceipt(p.receiptId),/AMBIGUOUS_HISTORY_TERMINAL/);await noAnswer();
  // Actual composed host uses the same SDK pager. Exact replayed display
  // siblings are deduplicated by their stable terminal identity, never counted
  // as another answer. No send is needed to recover the durable original run.
  mode='older-only';tailReads=0;leaf='stable-current-leaf';
  const response=await host.reconcileReceipt(p.receiptId);assert.equal(response.state,'canonical_response','The valid final exists only on the older page');
  mode='overlap';tailReads=0;
  assert.deepEqual(await host.reconcileReceipt(p.receiptId),response);
  const found=(await nativeAdminObserver.query('select m.body,a.request_message_id from crays_core.personal_messenger_agent_responses a join crays_core.messages m on m.message_id=a.message_id where a.attempt_id=$1',[p.attemptId])).rows;
  assert.equal(found.length,1);assert.equal(found[0].body,valid.content[0].text);assert.equal(found[0].request_message_id,p.messageId);
  assert.equal(peer.calls.filter(c=>c.method==='chat.send').length,0);assert.ok(peer.calls.some(c=>c.method==='chat.history'&&c.params.offset===50));assert.deepEqual(peer.errors,[]);
 }finally{await host.close();await peer.close();}
});


test('original SDK current session projection supplies the active send leaf and rejects missing, foreign or retired targets before send',async()=>{
 const {originalGatewayPeer}=await import('./original-gateway-peer.mjs');const {createNativePersonalChuckHost}=await import('../../src/lib/native-personal-chuck-host.ts');
 const peer=await originalGatewayPeer(runtimeRepositoryTarget);let mode='current';
 const host=createNativePersonalChuckHost(runtimeRepositoryTarget,peer.GatewayClient,peer.binding,async()=>({expectedSessionRoutingContract:'synthetic-current-route',expectedLeafEntryId:null}));
 peer.setHistoryResponder(()=>{
  const info={key:runtimeRepositoryTarget.sdkSessionKey,sessionId:runtimeRepositoryTarget.sdkSessionId,agentId:runtimeRepositoryTarget.agentId,activeLeafEntryId:'server-owned-active-leaf'};
  if(mode==='foreign-key')info.key='agent:other:main';
  if(mode==='foreign-session')info.sessionId='foreign-session';
  if(mode==='foreign-agent')info.agentId='personal-'+'b'.repeat(48);
  if(mode==='missing-leaf')delete info.activeLeafEntryId;
  if(mode==='bad-leaf')info.activeLeafEntryId='';
  if(mode==='archived')info.archived=true;
  if(mode==='tombstoned')info.restartRecoveryStatus='tombstoned';
  return {sessionKey:runtimeRepositoryTarget.sdkSessionKey,sessionId:runtimeRepositoryTarget.sdkSessionId,messages:[],hasMore:false,totalMessages:0,...(mode==='missing-info'?{}:{sessionInfo:info})};
 });
 try{
  await host.connect();originalGatewayClientCases++;
  for(mode of ['missing-info','foreign-key','foreign-session','foreign-agent','missing-leaf','bad-leaf','archived','tombstoned']){
   const original=await repositoryOriginal('sdk-current-projection-'+mode);
   await assert.rejects(host.dispatchReceipt(original.receipt.receiptId),/SESSION_DESCRIPTION_REQUIRED|ACTIVE_SESSION_LEAF_REQUIRED|INVALID_SESSION_LEAF/,mode);
   const attempt=await runtimeRepository.read(original.receipt.receiptId);assert.ok(attempt,'Retain the original durable claim for reconciliation, never substitute another run');
   assert.equal((await nativeAdminObserver.query('select count(*)::int n from crays_core.personal_messenger_agent_responses where attempt_id=$1',[attempt.attemptId])).rows[0].n,0);
  }
  assert.equal(peer.calls.filter(c=>c.method==='chat.send').length,0);
  mode='current';const original=await repositoryOriginal('sdk-current-projection-valid');
  const accepted=await host.dispatchReceipt(original.receipt.receiptId);assert.equal(accepted.state,'acknowledged');
  const sends=peer.calls.filter(c=>c.method==='chat.send');assert.equal(sends.length,1);
  assert.equal(sends[0].params.expectedLeafEntryId,'server-owned-active-leaf','Use actual SDK read, not the callback null or last displayed message');
  assert.equal(sends[0].params.expectedSessionRoutingContract,'synthetic-current-route');
  assert.equal(sends[0].params.agentId,runtimeRepositoryTarget.agentId);assert.equal(sends[0].params.sessionId,runtimeRepositoryTarget.sdkSessionId);
  const persisted=await runtimeRepository.read(original.receipt.receiptId);assert.ok(persisted);
  assert.equal(sends[0].params.message,persisted.body);
  assert.equal((await host.dispatchReceipt(original.receipt.receiptId)).state,'reconciliation_required');
  assert.equal(peer.calls.filter(c=>c.method==='chat.send').length,1);assert.deepEqual(peer.errors,[]);
 }finally{await host.close();await peer.close();}
});

test('distinct existing personal SDK agent requires exact current mapping before any handshake and rejects defaults without normalization',async()=>{
 const {originalGatewayPeer}=await import('./original-gateway-peer.mjs');
 const {createNativePersonalChuckHost}=await import('../../src/lib/native-personal-chuck-host.ts');
 const {personalSdkAgentId}=await import('../../src/lib/native-personal-agent-route.ts');
 const target={...runtimeRepositoryTarget,sdkAgentId:'synthetic-existing-owner',sdkSessionKey:'agent:synthetic-existing-owner:ios:existing-personal'};
 for(const id of ['main','default','global','business',' Synthetic-owner','SYNTHETIC-OWNER','bad/name','',null,{},[]]){
  assert.throws(()=>personalSdkAgentId({...target,sdkAgentId:id,sdkSessionKey:`agent:${id}:ios:test`}),/INVALID_TARGET/,id);
 }
 for(const tail of ['',':main',' main','ios:\nother'])assert.throws(()=>personalSdkAgentId({...target,sdkSessionKey:`agent:${target.sdkAgentId}:${tail}`}),/INVALID_TARGET/);
 const peer=await originalGatewayPeer(target);
 const valid={coreAgentId:target.agentId,sdkAgentId:target.sdkAgentId,runtimeBindingSHA256:target.runtimeBindingSHA256};
 try{
  for(const route of [undefined,{...valid,coreAgentId:'personal-'+'b'.repeat(48)},{...valid,sdkAgentId:'foreign-owner'},{...valid,runtimeBindingSHA256:'f'.repeat(64)}]){
   const host=createNativePersonalChuckHost(target,peer.GatewayClient,peer.binding,async()=>({expectedSessionRoutingContract:'synthetic-existing',expectedLeafEntryId:null,expectedAgentRoute:route}));
   try{await assert.rejects(host.connect(),/CURRENT_MAPPING_REQUIRED/);assert.equal(peer.calls.length,0,'No socket/auth/send before current exact mapping');}
   finally{await host.close();}
  }
  assert.throws(()=>createNativePersonalChuckHost(target,peer.GatewayClient,{...peer.binding,sdkAgentId:'foreign-owner',sdkSessionKey:'agent:foreign-owner:ios:existing-personal'},async()=>{}),/BINDING_MISMATCH/);
 }finally{await peer.close();}
});

test('original SDK existing personal agent sends and returns into same canonical Core account and original conversation without replacing identity',async()=>{
 const {originalGatewayPeer}=await import('./original-gateway-peer.mjs');
 const {createNativePersonalChuckHost}=await import('../../src/lib/native-personal-chuck-host.ts');
 const {createNativePersonalRuntimeRepository}=await import('../../src/db/native-personal-runtime-repository.ts');
 const target={...runtimeRepositoryTarget,sdkAgentId:'synthetic-existing-owner',sdkSessionKey:'agent:synthetic-existing-owner:ios:existing-personal',sdkSessionId:'existing-personal-session',runtimeBindingSHA256:'e'.repeat(64)};
 const original=await repositoryOriginal('existing-personal-sdk-route','Original for existing personal SDK agent');
 const before=(await nativeAdminObserver.query('select canonical_person_id,account_id,agent_id from crays_core.personal_agent_standard_assignments order by account_id')).rows;
 let current=true;
 const admit=async()=>({expectedSessionRoutingContract:'synthetic-existing-route',expectedLeafEntryId:null,expectedAgentRoute:{coreAgentId:target.agentId,sdkAgentId:current?target.sdkAgentId:'foreign-owner',runtimeBindingSHA256:target.runtimeBindingSHA256}});
 const peer=await originalGatewayPeer(target),host=createNativePersonalChuckHost(target,peer.GatewayClient,peer.binding,admit);
 const repo=createNativePersonalRuntimeRepository(target,async()=>{await host.settled();});
 try{
  await host.connect();originalGatewayClientCases++;
  assert.equal((await host.dispatchReceipt(original.receipt.receiptId)).state,'acknowledged');
  const p=await repo.read(original.receipt.receiptId);assert.equal(p.agentId,target.agentId);assert.equal(p.sdkAgentId,target.sdkAgentId);
  const send=peer.calls.filter(c=>c.method==='chat.send');assert.equal(send.length,1);assert.equal(send[0].params.agentId,target.sdkAgentId);assert.equal(send[0].params.sessionKey,target.sdkSessionKey);
  const stored=(await nativeAdminObserver.query('select agent_id,sdk_session_key from crays_core.personal_messenger_runtime_attempts where attempt_id=$1',[p.attemptId])).rows[0];
  assert.equal(stored.agent_id,target.agentId,'Immutable Core assignment, not SDK alias');assert.equal(stored.sdk_session_key,target.sdkSessionKey);
  // Core identity in an SDK event is NOT an alias for its explicit SDK sender.
  const foreign=dispatchTerminal(p,'Wrong SDK sender');foreign.payload.agentId=target.agentId;peer.emit(foreign.event,foreign.payload);
  await host.reconcileReceipt(p.receiptId);await host.settled();
  assert.equal((await nativeAdminObserver.query('select count(*)::int n from crays_core.personal_messenger_agent_responses where attempt_id=$1',[p.attemptId])).rows[0].n,0);
  const event=dispatchTerminal(p,'Reply from the controlled existing personal SDK agent');event.payload.agentId=target.sdkAgentId;peer.emit(event.event,event.payload);
  await waitForCanonicalRequests([original.receipt.messageId]);await host.settled();
  const transcript=await personalCall('NativePersonalTranscript');assert.ok(transcript.body.data.nativePersonalTranscript.messages.some(m=>m.inReplyToMessageId===original.receipt.messageId&&m.authorKind==='CHUCK'&&m.body===event.payload.message.text));
  peer.setHistory([storedSdkTerminal(p,event.payload.message.text)]);
  assert.equal((await host.dispatchReceipt(p.receiptId)).state,'canonical_response');assert.equal(peer.calls.filter(c=>c.method==='chat.send').length,1);
  const after=(await nativeAdminObserver.query('select canonical_person_id,account_id,agent_id from crays_core.personal_agent_standard_assignments order by account_id')).rows;assert.deepEqual(after,before);
  current=false;
  await assert.rejects(host.reconcileReceipt(p.receiptId),/CURRENT_MAPPING_REQUIRED/);
  assert.equal(peer.calls.filter(c=>c.method==='chat.send').length,1,'Changed mapping never retries or retargets the original');
  await assert.rejects(runtimeRepository.read(p.receiptId),/ORIGINAL_RUNTIME_CHANGED/);
 }finally{await host.close();await peer.close();}
});

after(async () => {
 await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));await database.closeCoreDatabase();await (await import('../../src/db/core-identity-runtime-pool.ts')).closeCoreOriginalMemberIdentityRpcPool();if(nativeAdminObserver)await nativeAdminObserver.end();process.env.CRAYS_DATABASE_URL=originalDatabaseURL;if(originalPoolMax===undefined)delete process.env.CRAYS_DATABASE_POOL_MAX;else process.env.CRAYS_DATABASE_POOL_MAX=originalPoolMax;globalThis.fetch=originalFetch;
 assert.deepEqual(sdkSchemaSourcePins(),originalSdkSchemaPins,'original SDK source unchanged during qualification');
 writeFileSync(process.env.CRAYS_NATIVE_SQL_FIXTURE_RESULT,JSON.stringify({schema:'crays.native-http-sql-fixture.v1',httpOrigin:origin,
  httpTransport:'own protected AF_UNIX HTTP socket, no TCP listener',actualCoreRepository:true,actualInitialMigration:true,originalV2LookupAndParser:true,originalV2SQLTransport:'isolated PostgreSQL function/role under explicit test loader; NOT hosted original Core pool/TLS/DDL admission',actualGraphQLHandler:true,actualYoga:true,persistedPlatformBootstrapHash:nativeBootstrapHash,
  sdkSchemaSourcePins:originalSdkSchemaPins,originalGatewayClientExecuted:originalGatewayClientCases>0,originalGatewayClientCases,originalGatewayPeer:"controlled ephemeral loopback with generated memory-only device keys; not hosted real runtime/model",syntheticPersons:fixtures.length,provider:'Controlled JWT/JWKS fixture; no hosted Auth0 login',sourcePins:runtimeSourcePins(),fullNextBuild:false,physicalIphone:false,productAccepted:false},null,2)+'\n');
});

test('composed own-person host rejects foreign canonical TLS principal before SDK construction or database work',async()=>{
 const {createNativePersonalChuckHost}=await import('../../src/lib/native-personal-chuck-host.ts');
 let constructions=0;class ForbiddenClient{constructor(){constructions++;throw Error('MUST_NOT_CONSTRUCT');}}
 const binding={url:'wss://synthetic.invalid/own-chuck',serverBootId:'synthetic',deviceAuthScope:'synthetic',deviceToken:'synthetic',
  deviceIdentity:{deviceId:'synthetic',publicKeyPem:'synthetic',privateKeyPem:'synthetic'},
  agentId:runtimeRepositoryTarget.agentId,sdkAgentId:runtimeRepositoryTarget.sdkAgentId,sdkSessionKey:runtimeRepositoryTarget.sdkSessionKey,
  sdkSessionId:runtimeRepositoryTarget.sdkSessionId,runtimeBindingSHA256:runtimeRepositoryTarget.runtimeBindingSHA256,timeoutMs:1000,
  corePrincipal:{corePersonId:'another-canonical-person',sdkPrincipalId:'synthetic-principal',tlsFingerprint:Array(32).fill('AA').join(':'),authorization:'Bearer '+'a'.repeat(64),revoked:new AbortController().signal}};
 assert.throws(()=>createNativePersonalChuckHost(runtimeRepositoryTarget,ForbiddenClient,binding,async()=>{throw Error('MUST_NOT_ADMIT');}),/NATIVE_CHUCK_HOST_BINDING_MISMATCH/);
 assert.equal(constructions,0);
});

test('principal-mode host performs SDK IO outside actual Core SQL transactions and keeps the durable send claim',async()=>{
 const {createNativePersonalChuckHost}=await import('../../src/lib/native-personal-chuck-host.ts');
 const original=await repositoryOriginal('principal-sql-no-sdk-io'),revocation=new AbortController(),calls=[];
 let options,connected=false,profile='mapped-synthetic-profile';
 const target=runtimeRepositoryTarget,subject='synthetic-core-authenticated-subject';
 class ControlledPrincipalClient{
  constructor(value){options=value;}
  get connected(){return connected;}
  start(){connected=true;queueMicrotask(()=>options.onHelloOk({protocol:4,server:{bootId:'synthetic-principal-boot'},auth:{method:'trusted-proxy',role:'operator',scopes:['operator.sessions.read','operator.sessions.write']},features:{methods:['users.self','chat.history','chat.send'],events:['chat']}}));}
  async stopAndWait(){connected=false;}
  async request(method,params){
   // Real PostgreSQL observation, not a flag set by the implementation. SDK
   // is a test double here; original SDK/server coverage is a separate lane.
   const locked=(await nativeAdminObserver.query("select count(*)::int n from pg_stat_activity where datname=current_database() and usename='ios_native_personal_http_fixture' and state in ('idle in transaction','idle in transaction (aborted)')")).rows[0].n;
   assert.equal(locked,0,'No SDK request while the restricted Core role holds a transaction');
   calls.push({method,params});
   if(method==='users.self')return {profile:{id:profile}};
   if(method==='chat.history')return {sessionKey:target.sdkSessionKey,sessionId:target.sdkSessionId,messages:[],sessionInfo:{key:target.sdkSessionKey,sessionId:target.sdkSessionId,agentId:target.sdkAgentId??target.agentId,activeLeafEntryId:null},inputReceipts:[],hasMore:false,totalMessages:0};
   assert.equal(method,'chat.send');return {runId:params.idempotencyKey,status:'started',messageSeq:1};
  }
 }
 const binding={url:'wss://synthetic.invalid/own-chuck',serverBootId:'synthetic-principal-boot',deviceAuthScope:'synthetic',deviceToken:'synthetic',deviceIdentity:{deviceId:'synthetic',publicKeyPem:'synthetic',privateKeyPem:'synthetic'},
  agentId:target.agentId,sdkAgentId:target.sdkAgentId,sdkSessionKey:target.sdkSessionKey,sdkSessionId:target.sdkSessionId,runtimeBindingSHA256:target.runtimeBindingSHA256,timeoutMs:1000,
  corePrincipal:{corePersonId:target.canonicalPersonId,sdkPrincipalId:subject,sdkProfileId:profile,tlsFingerprint:Array(32).fill('AA').join(':'),authorization:'Bearer '+'a'.repeat(64),revoked:revocation.signal}};
 const guards={expectedSessionRoutingContract:'synthetic-sql-principal',expectedLeafEntryId:null,expectedGatewayPrincipal:{corePersonId:target.canonicalPersonId,sdkPrincipalId:subject,sdkProfileId:profile,runtimeBindingSHA256:target.runtimeBindingSHA256}};
 const host=createNativePersonalChuckHost(target,ControlledPrincipalClient,binding,async()=>guards);
 try{
  await host.connect();assert.equal((await host.dispatchReceipt(original.receipt.receiptId)).state,'acknowledged');
  const attempt=await runtimeRepository.read(original.receipt.receiptId);assert.ok(attempt);
  assert.equal((await host.dispatchReceipt(original.receipt.receiptId)).state,'reconciliation_required');
  assert.equal(calls.filter(c=>c.method==='chat.send').length,1);
  assert.equal((await runtimeRepository.read(original.receipt.receiptId)).sdkRunId,attempt.sdkRunId);
  profile='unexpected-merged-profile';await assert.rejects(()=>host.reconcileReceipt(original.receipt.receiptId),/SDK_PROFILE_MISMATCH/);
  assert.equal(connected,false);assert.equal(calls.filter(c=>c.method==='chat.send').length,1);
 }finally{await host.close();}
});

test('admitted-host worker consumes the existing own Core outbox and restart never resends a canonical reply',async()=>{
 const {createNativePersonalChuckHost}=await import('../../src/lib/native-personal-chuck-host.ts');
 const {createNativePersonalChuckWorker}=await import('../../src/lib/native-personal-chuck-worker.ts');
 const {createNativePersonalRuntimeRepository}=await import('../../src/db/native-personal-runtime-repository.ts');
 const {originalGatewayPeer}=await import('./original-gateway-peer.mjs');
 const person=fixtures[2],subject={subject:person.authIdentity.providerSubject};
 const current=await personalCall('NativePersonalConversation',{},subject);assert.ok(!current.body.errors,JSON.stringify(current.body));
 const b=current.body.data.nativePersonalConversation;
 const revision=String((await nativeAdminObserver.query('select primary_contact_revision from crays_core.crays_accounts where account_id=$1',[person.account.accountId])).rows[0].primary_contact_revision);
 const input={bindingId:b.bindingId,expectedBindingRevision:b.revision,expectedContactRevision:revision,idempotencyKey:'worker-own-original',body:'Worker original · café 🌊'};
 const accepted=await personalCall('ReceiveScopedAgentMessage',input,subject);assert.ok(!accepted.body.errors,JSON.stringify(accepted.body));
 const original=accepted.body.data.receiveScopedAgentMessage,agentId='personal-'+'c'.repeat(48);
 const target={accountId:person.account.accountId,canonicalPersonId:'native-personal-2',agentId,bindingId:b.bindingId,bindingRevision:b.revision,contactRevision:revision,expectedIssuer:issuer,
  runtimeBindingSHA256:'d'.repeat(64),sdkSessionId:'worker-synthetic-session',sdkSessionKey:`agent:${agentId}:ios:worker`};
 const repo=createNativePersonalRuntimeRepository(target,async()=>{}),revoked=new AbortController(),peer=await originalGatewayPeer(target);
 const guard=async()=>({expectedSessionRoutingContract:'synthetic-worker-only',expectedLeafEntryId:null});
 const host=createNativePersonalChuckHost(target,peer.GatewayClient,peer.binding,guard);
 const worker=createNativePersonalChuckWorker(host,{expiresAtMs:Date.now()+10000,revoked:revoked.signal,pageSize:3,pollIntervalMs:1000}),running=worker.run();
 let second;
 try{
  for(let i=0;i<100 && !peer.calls.some(c=>c.method==='chat.send');i++)await new Promise(resolve=>setTimeout(resolve,20));
  assert.equal(peer.calls.filter(c=>c.method==='chat.send').length,1);originalGatewayClientCases++;
  const attempt=await repo.read(original.receiptId);assert.ok(attempt);
  const event=dispatchTerminal(attempt,'Controlled worker reply in the same original conversation');peer.emit(event.event,event.payload);
  await waitForCanonicalRequests([original.messageId]);await host.settled();
  await worker.stop();assert.equal((await running).reason,'stopped');
  const transcript=await personalCall('NativePersonalTranscript',{},subject);assert.ok(!transcript.body.errors,JSON.stringify(transcript.body));
  const response=transcript.body.data.nativePersonalTranscript.messages.find(m=>m.authorKind==='CHUCK'&&m.inReplyToMessageId===original.messageId);
  assert.equal(response?.body,'Controlled worker reply in the same original conversation');
  const peer2=await originalGatewayPeer(target),host2=createNativePersonalChuckHost(target,peer2.GatewayClient,peer2.binding,guard);
  const worker2=createNativePersonalChuckWorker(host2,{expiresAtMs:Date.now()+10000,revoked:new AbortController().signal,pageSize:3,pollIntervalMs:1000});
  second={peer:peer2,worker:worker2,running:worker2.run()};
  for(let i=0;i<100 && worker2.state().completedPages<1;i++)await new Promise(resolve=>setTimeout(resolve,20));
  assert.equal(worker2.state().completedPages,1);originalGatewayClientCases++;
  await worker2.stop();await second.running;assert.equal(peer2.calls.filter(c=>c.method==='chat.send').length,0);
  assert.equal((await repo.read(original.receiptId)).sdkRunId,attempt.sdkRunId);
  assert.equal((await nativeAdminObserver.query('select count(*)::int n from crays_core.personal_messenger_agent_responses where request_message_id=$1',[original.messageId])).rows[0].n,1);
  writeFileSync(process.env.CRAYS_NATIVE_SQL_FIXTURE_RESULT+'.worker.json',JSON.stringify({status:'PASS_CONTROLLED_WORKER_NOT_MODEL_OR_LIVE_ADMISSION',originalGatewayClientCases,workerConnections:2,firstHostSends:1,restartHostSends:0,sameCoreOriginalReply:true,canonicalResponses:1,sourcePins:runtimeSourcePins(),actualOwnerGrant:false,realModelCalled:false},null,2)+'\n');
 }finally{
  await worker.stop();await running;await peer.close();
  if(second){await second.worker.stop();await second.running;await second.peer.close();}
 }
});




test('first native binding prepares one own baseline intent without a second signup or optional channel',async()=>{
 console.log('WAITING_REAL_RATE_LIMIT_WINDOW_FOR_FIRST_NATIVE_ASSIGNMENT');
 await new Promise(resolve=>setTimeout(resolve,61000));
 const person=fixtures[3],subject={subject:person.authIdentity.providerSubject};
 const rows=async()=> (await nativeAdminObserver.query('select canonical_person_id,agent_id,assignment_proposal from crays_core.personal_agent_standard_assignments where account_id=$1',[person.account.accountId])).rows;
 assert.deepEqual(await rows(),[]);
 const read=await personalCall('NativePersonalConversation',{},subject);assert.ok(read.body.errors?.length);assert.deepEqual(await rows(),[]);
 const revision=String((await nativeAdminObserver.query('select primary_contact_revision from crays_core.crays_accounts where account_id=$1',[person.account.accountId])).rows[0].primary_contact_revision);
 const denied=await personalCall('BindPersonalMessenger',{expectedContactRevision:String(Number(revision)+1)},subject);assert.ok(denied.body.errors?.length);assert.deepEqual(await rows(),[]);
 await nativeAdminObserver.query('update crays_core.account_email_verifications set revoked_at=now() where account_id=$1',[person.account.accountId]);
 try{const revoked=await personalCall('BindPersonalMessenger',{expectedContactRevision:revision},subject);assert.ok(revoked.body.errors?.length);assert.deepEqual(await rows(),[]);}
 finally{await nativeAdminObserver.query('update crays_core.account_email_verifications set revoked_at=null where account_id=$1',[person.account.accountId]);}
 // Two actual native requests, backed by two available restricted SQL clients.
 // Neither request carries a caller-selected account/person/agent.
 await database.closeCoreDatabase();process.env.CRAYS_DATABASE_POOL_MAX='2';
 let response,parallel;
 try{[response,parallel]=await Promise.all([
  personalCall('BindPersonalMessenger',{expectedContactRevision:revision},subject),
  personalCall('BindPersonalMessenger',{expectedContactRevision:revision},subject),
 ]);}
 finally{await database.closeCoreDatabase();process.env.CRAYS_DATABASE_POOL_MAX='1';}
 assert.ok(!parallel.body.errors,JSON.stringify(parallel.body));
 assert.equal(parallel.body.data.bindPersonalMessenger.bindingId,response.body.data?.bindPersonalMessenger?.bindingId);

 assert.equal(response.status,200,JSON.stringify(response.body));assert.ok(!response.body.errors,JSON.stringify(response.body));
 const assigned=await rows();assert.equal(assigned.length,1);assert.equal(assigned[0].canonical_person_id,'native-personal-3');
 assert.match(assigned[0].agent_id,/^personal-[a-f0-9]{48}$/);
 const deliveries=(await nativeAdminObserver.query('select agent_id,package_version from crays_core.personal_agent_baseline_deliveries where account_id=$1',[person.account.accountId])).rows;
 assert.equal(deliveries.length,1);assert.equal(deliveries[0].agent_id,assigned[0].agent_id);
 const again=await personalCall('BindPersonalMessenger',{expectedContactRevision:revision},subject);
 assert.ok(!again.body.errors,JSON.stringify(again.body));assert.equal(again.body.data.bindPersonalMessenger.bindingId,response.body.data.bindPersonalMessenger.bindingId);
 assert.deepEqual(await rows(),assigned);
 assert.equal((await nativeAdminObserver.query('select count(*)::int n from crays_core.personal_agent_baseline_deliveries where account_id=$1',[person.account.accountId])).rows[0].n,1);
 assert.equal((await nativeAdminObserver.query('select count(*)::int n from crays_core.personal_messenger_ingress_receipts where account_id=$1',[person.account.accountId])).rows[0].n,0);
});


test('native HTTP ingress automatically wakes its admitted existing Chuck lifecycle and returns one canonical SDK response', {skip:!process.env.CRAYS_NATIVE_REAL_GATEWAY_ROOT},async()=>{
 const {originalSdkServerFixture}=await import('./original-sdk-server-fixture.mjs');
 const {startNativePersonalChuckLifecycle,notifyCommittedNativePersonalOutbox}=await import('../../src/lib/native-personal-chuck-lifecycle.ts');
 const person=fixtures[3],subject={subject:person.authIdentity.providerSubject},canonicalPerson='native-personal-3';
 const current=await personalCall('NativePersonalConversation',{},subject);assert.ok(!current.body.errors,JSON.stringify(current.body));
 const b=current.body.data.nativePersonalConversation;
 const row=(await nativeAdminObserver.query('select a.primary_contact_revision::text revision,s.agent_id from crays_core.crays_accounts a join crays_core.personal_agent_standard_assignments s on s.account_id=a.account_id where a.account_id=$1',[person.account.accountId])).rows[0];
 const revision=row.revision;
 assert.equal((await nativeAdminObserver.query('select count(*)::int n from crays_core.personal_messenger_ingress_receipts where account_id=$1',[person.account.accountId])).rows[0].n,0);
 const fixture=await originalSdkServerFixture({root:process.env.CRAYS_NATIVE_REAL_GATEWAY_ROOT,corePerson:canonicalPerson,agent:'synthetic-existing-owner'});
 let lifecycle;
 try{
  originalSdkModelOrigin=new URL(fixture.model.baseUrl).origin;
  const target={accountId:person.account.accountId,canonicalPersonId:canonicalPerson,agentId:row.agent_id,sdkAgentId:'synthetic-existing-owner',bindingId:b.bindingId,bindingRevision:b.revision,contactRevision:revision,expectedIssuer:issuer,
   runtimeBindingSHA256:'e'.repeat(64),sdkSessionId:fixture.sessionId,sdkSessionKey:fixture.sessionKey};
  const calls=[];class ObservedOriginalClient extends fixture.GatewayClient{request(method,params,options){calls.push({method});return super.request(method,params,options);}}
  const binding={...fixture.gateway,agentId:target.agentId,sdkAgentId:target.sdkAgentId,sdkSessionKey:target.sdkSessionKey,sdkSessionId:target.sdkSessionId,runtimeBindingSHA256:target.runtimeBindingSHA256};
  const guards={expectedSessionRoutingContract:fixture.routingContract,expectedLeafEntryId:null,
   expectedAgentRoute:{coreAgentId:target.agentId,sdkAgentId:target.sdkAgentId,runtimeBindingSHA256:target.runtimeBindingSHA256},
   expectedGatewayPrincipal:{corePersonId:target.canonicalPersonId,sdkPrincipalId:fixture.coreSubject,sdkProfileId:fixture.sdkProfileId,runtimeBindingSHA256:target.runtimeBindingSHA256}};
  const policy={expiresAtMs:Date.now()+90000,revoked:new AbortController().signal,pageSize:3,pollIntervalMs:60000};
  const admit=async()=>guards;
  lifecycle=await startNativePersonalChuckLifecycle(target,ObservedOriginalClient,binding,admit,policy);
  for(let i=0;i<100&&lifecycle.state().completedPages<1;i++)await new Promise(resolve=>setTimeout(resolve,10));
  assert.equal(lifecycle.state().completedPages,1);assert.equal(fixture.model.count(),0);
  assert.equal(notifyCommittedNativePersonalOutbox({...target,canonicalPersonId:'foreign-person'}),false);
  assert.equal(notifyCommittedNativePersonalOutbox({...target,bindingRevision:'999'}),false);
  assert.equal(fixture.model.count(),0);
  await assert.rejects(startNativePersonalChuckLifecycle(target,ObservedOriginalClient,binding,admit,policy),/EXISTING_LIFECYCLE_MUST_STOP_FIRST/);
  const input={bindingId:b.bindingId,expectedBindingRevision:b.revision,expectedContactRevision:revision,idempotencyKey:'automatic-existing-native-lifecycle',body:'CONTROLLED_NATIVE_INPUT'};
  const accepted=await personalCall('ReceiveScopedAgentMessage',input,subject);
  assert.ok(!accepted.body.errors,JSON.stringify(accepted.body));const original=accepted.body.data.receiveScopedAgentMessage;
  // No test calls dispatchReceipt/dispatchOutboxPage. The production commit
  // hook must interrupt the60second idle poll, after releasing its SQL client.
  for(let i=0;i<400;i++){
   const count=(await nativeAdminObserver.query('select count(*)::int n from crays_core.personal_messenger_agent_responses where request_message_id=$1',[original.messageId])).rows[0].n;
   if(count===1)break;await new Promise(resolve=>setTimeout(resolve,25));
  }
  await lifecycle.settled();
  const transcript=await personalCall('NativePersonalTranscript',{},subject);assert.ok(!transcript.body.errors,JSON.stringify(transcript.body));
  const responses=transcript.body.data.nativePersonalTranscript.messages.filter(m=>m.authorKind==='CHUCK'&&m.inReplyToMessageId===original.messageId);
  assert.equal(responses.length,1);assert.equal(responses[0].body,'CONTROLLED_NATIVE_REPLY');
  assert.equal(transcript.body.data.nativePersonalTranscript.conversationId,b.conversationId);
  const replay=await personalCall('ReceiveScopedAgentMessage',input,subject);assert.ok(!replay.body.errors,JSON.stringify(replay.body));assert.equal(replay.body.data.receiveScopedAgentMessage.receiptId,original.receiptId);assert.equal(replay.body.data.receiveScopedAgentMessage.replayed,true);
  await lifecycle.stop();assert.equal(notifyCommittedNativePersonalOutbox(target),false);
  lifecycle=await startNativePersonalChuckLifecycle(target,ObservedOriginalClient,binding,admit,{...policy,expiresAtMs:Date.now()+30000});
  for(let i=0;i<100&&lifecycle.state().completedPages<1;i++)await new Promise(resolve=>setTimeout(resolve,10));
  assert.equal(lifecycle.state().completedPages,1);
  assert.equal(calls.filter(c=>c.method==='chat.send').length,1);assert.equal(fixture.model.count(),1);
  assert.equal((await nativeAdminObserver.query('select count(*)::int n from crays_core.personal_messenger_agent_responses where request_message_id=$1',[original.messageId])).rows[0].n,1);
  writeFileSync(process.env.CRAYS_NATIVE_SQL_FIXTURE_RESULT+'.original-server.json',JSON.stringify({status:'PASS_NATIVE_HTTP_AUTOMATIC_LIFECYCLE_ACTUAL_SQL_ORIGINAL_SDK_NOT_OWNER_OR_DEVICE',canonicalResponses:1,originalSdkSends:1,controlledProviderRequests:1,sameTypedNativeConversation:true,reconciliationAndRestartSameResponse:true,noManualDispatchFromTest:true,idlePollInterruptedByProductionCommitHook:true,actualOriginalServer:true,repositoryIsRealRestrictedCoreSql:true,identityProvider:'Controlled JWT/JWKS, not hosted Auth0',admission:'Synthetic current guards, not production Core grant',realModelCalled:false,actualOwnerGrant:false,actualIosDevice:false,sourcePins:runtimeSourcePins(),sdkPins:fixture.sourcePins},null,2)+'\n');
 }finally{try{await lifecycle?.stop();}finally{try{await fixture.close();}finally{originalSdkModelOrigin=undefined;}}}
});

test('actual original V2 SQL transport role has no direct Core table privilege and no bypass',async()=>{
 const uri=new URL(originalDatabaseURL);uri.username='ios_native_original_rpc_fixture';
 const {Pool:RpcQualificationPool}=await import('pg');
 const restricted=new RpcQualificationPool({connectionString:uri.toString(),ssl:false,max:1});
 try{
  const role=(await restricted.query('select current_user name,rolsuper,rolbypassrls from pg_roles where rolname=current_user')).rows[0];
  assert.deepEqual(role,{name:'ios_native_original_rpc_fixture',rolsuper:false,rolbypassrls:false});
  await assert.rejects(restricted.query('select * from crays_core.auth_identities'),e=>e.code==='42501');
  const {createCoreOriginalMemberIdentityRuntimeRpcClient}=await import('../../src/db/core-identity-runtime-rpc.ts');
  const rpc=createCoreOriginalMemberIdentityRuntimeRpcClient((sql,args)=>restricted.query(sql,args));
  const result=await rpc.resolveAuth0IdentityBundleV2(issuer,fixtures[0].authIdentity.providerSubject,'native_http_fixture');
  assert.equal(result.account.account_id,fixtures[0].account.accountId);
 }finally{await restricted.end();}
});
test('a second Auth0-admitted client cannot use another clients exact Core binding through actual chat APQ',async()=>{
 const before=(await nativeAdminObserver.query('select count(*)::int n from crays_core.personal_messenger_ingress_receipts')).rows[0].n;
 const prior=process.env.CRAYS_NATIVE_AUTH_CLIENT_IDS;process.env.CRAYS_NATIVE_AUTH_CLIENT_IDS='native_http_fixture,native_other_fixture';
 try{
  const denied=await personalCall('NativePersonalConversation',{}, {claims:{azp:'native_other_fixture',accountId:fixtures[0].account.accountId,role:'admin'}});
  assert.ok(denied.body.errors?.length,JSON.stringify(denied.body));assert.equal(denied.body.data,null);
 }finally{process.env.CRAYS_NATIVE_AUTH_CLIENT_IDS=prior;}
 assert.equal((await nativeAdminObserver.query('select count(*)::int n from crays_core.personal_messenger_ingress_receipts')).rows[0].n,before);
 const own=await personalCall('NativePersonalConversation');assert.ok(!own.body.errors,JSON.stringify(own.body));
});
test('revoked exact original Core binding denies real chat reads and creates no new SQL receipt despite unchanged provider identity',async()=>{
 const current=await personalCall('NativePersonalConversation');assert.ok(!current.body.errors,JSON.stringify(current.body));const b=current.body.data.nativePersonalConversation;
 const contact=(await nativeAdminObserver.query('select primary_contact_revision::text revision from crays_core.crays_accounts where account_id=$1',[fixtures[0].account.accountId])).rows[0].revision;
 const before=(await nativeAdminObserver.query('select count(*)::int n from crays_core.personal_messenger_ingress_receipts')).rows[0].n;
 await nativeAdminObserver.query('update crays_native_qualification.exact_bindings set revoked=true where subject=$1',[fixtures[0].authIdentity.providerSubject]);
 try{
  const denied=await personalCall('NativePersonalTranscript');assert.ok(denied.body.errors?.length);assert.equal(denied.body.data,null);
  const write=await personalCall('ReceiveScopedAgentMessage',{bindingId:b.bindingId,expectedBindingRevision:b.revision,expectedContactRevision:contact,idempotencyKey:'denied-original-binding-no-receipt',body:'Must remain outside the private SQL chat'});
  assert.ok(write.body.errors?.length);assert.equal(write.body.data,null);
 }finally{await nativeAdminObserver.query('update crays_native_qualification.exact_bindings set revoked=false where subject=$1',[fixtures[0].authIdentity.providerSubject]);}
 assert.equal((await nativeAdminObserver.query('select count(*)::int n from crays_core.personal_messenger_ingress_receipts')).rows[0].n,before);
 const restored=await personalCall('NativePersonalConversation');assert.ok(!restored.body.errors,JSON.stringify(restored.body));
});

// v80 source candidate: same real disposable Core and restricted application
// pool. Explicit synthetic test principals are not Auth0/native customer grants.
if(process.env.CRAYS_NATIVE_PERSONAL_ATTACHMENT_CUSTODY_QUALIFICATION==='true'){
 test('Canonical own message attachment custody through actual Core SQL and RLS',async t=>{
  assert.ok(nativeAdminObserver,'Actual isolated administrative fixture observer required');
  const {qualifyPersonalAttachmentCustody}=await import('./personal-attachment-core-cases.mjs');
  await qualifyPersonalAttachmentCustody({t,admin:nativeAdminObserver,pool:database.getCorePgPool(),fixtures,issuer,personalCall,runtimeTarget:runtimeRepositoryTarget,originalsCall,originalReadCall});
 });
}

if(process.env.CRAYS_NATIVE_PERSONAL_FEED_QUALIFICATION==='true'){
 test('Typed own personal feed commands through actual Core SQL and non-bypass RLS',async t=>{
  const {qualifyPersonalFeedEffects}=await import('./personal-feed-core-cases.mjs');
  await qualifyPersonalFeedEffects({t,admin:nativeAdminObserver,pool:database.getCorePgPool(),fixtures,issuer,personalCall,runtimeTarget:runtimeRepositoryTarget});
 });
}
