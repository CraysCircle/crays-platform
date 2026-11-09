import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import { sourcePins } from './source-loader.mjs';
const issuer = 'https://crays-qualification.auth0.com/';
const audience = 'https://core.crays.example/native';
const env = { CRAYS_NATIVE_AUTH_ENABLED: 'true', CRAYS_NATIVE_AUTH_ISSUER: issuer,
 CRAYS_NATIVE_AUTH_AUDIENCE: audience, CRAYS_NATIVE_AUTH_CLIENT_IDS: 'native_fixture_client',
 CRAYS_NATIVE_AUTH_IDENTITY_SCOPE: 'fixture:identity:read', CRAYS_NATIVE_AUTH_BOOTSTRAP_SCOPE: 'fixture:bootstrap:read' };
Object.assign(process.env, env);
const { publicKey, privateKey } = await generateKeyPair('RS256');
const jwk = { ...await exportJWK(publicKey), kid: 'native-context-fixture', alg: 'RS256' };
const originalFetch = globalThis.fetch;
const transport = async url => { assert.equal(String(url), issuer + '.well-known/jwks.json'); return Response.json({ keys: [jwk] }); };
globalThis.fetch = transport;
globalThis[Symbol.for('crays.native.fixture.browserCalls')] = 0;
let value;
globalThis[Symbol.for('crays.native.fixture.emailProofLookup')] = async () => value?.emailVerification ?? null;
globalThis[Symbol.for('crays.native.fixture.contactRevisionLookup')] = async () => value?.account?.primary_contact_revision ?? null;
globalThis[Symbol.for('crays.native.fixture.lookup')] = async (provider, subject) => {
 assert.equal(provider, 'auth0'); assert.equal(subject, 'auth0|native-qualification'); return value;
};
const api = await import('../../src/lib/native-core-auth.ts');
const { resolveCraysRouteContext } = await import('../../src/lib/dal/server-trust.ts');
const key = 'ab'.repeat(32);
function bundle() {
 return { emailVerification: {receipt_id:'fixture-email-receipt',account_id:'fixture-existing-person',contact_revision:'1',verified_at:new Date()}, account: { account_id: 'fixture-existing-person', primary_contact_revision:'1', primary_contact: 'synthetic@example.invalid', primary_contact_type: 'contact', default_role: 'guest', status: 'active' },
  accessIdentities: [{ identity_id: 'fixture-existing-provider', account_id: 'fixture-existing-person', provider_key: 'auth0', method_type: 'social', verified: true }],
  nostrIdentity: { account_id: 'fixture-existing-person', pubkey_hex: key, npub: 'fixture-existing-npub', access_enabled: true, signer_status: 'verified' },
  memberships: [], roleAssignments: [{ assignment_id: 'fixture-existing-role', account_id: 'fixture-existing-person', role_key: 'guest', organization_id: 'fixture-canonical-organization', status: 'active', nostr_binding_status: 'verified', nostr_pubkey_hex: key }] };
}
function body() { return { operationName: 'PlatformBootstrap', extensions: { persistedQuery: { version: 1, sha256Hash: api.nativeBootstrapHash } } }; }
async function request({ claims = {}, payload = body(), headers = {}, url = 'https://core.crays.example/api/graphql', method = 'POST' } = {}) {
 const now = Math.floor(Date.now()/1000);
 const token = await new SignJWT({ sub: 'auth0|native-qualification', azp: 'native_fixture_client',
  scope: 'fixture:identity:read fixture:bootstrap:read', ...claims }).setProtectedHeader({ alg: 'RS256', typ: 'JWT', kid: jwk.kid })
  .setIssuer(issuer).setAudience(audience).setIssuedAt(now).setExpirationTime(now + 300).sign(privateKey);
 return new Request(url, { method, headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json', ...headers },
  ...(method === 'GET' ? {} : { body: typeof payload === 'string' ? payload : JSON.stringify(payload) }) });
}
function resolver(b = bundle(), environment = env, lookup) {
 return api.createNativeCoreRequestResolver({ environment, fetch: transport,
  lookupContactVerification: async()=>b?.emailVerification ?? null,
  lookupContactRevision: async()=>b?.account?.primary_contact_revision ?? null,
  lookup: lookup ?? (async (provider, subject) => { assert.equal(provider, 'auth0'); assert.equal(subject, 'auth0|native-qualification'); return b; }) });
}
async function resolved(r, options = {}) { const q = await request(options); await r.admit(q); return r.resolve(q); }
const code = expected => error => { assert.equal(error.code, expected); return true; };
test('actual admitted Core path uses canonical person, key, role and organization; ignores JWT role/tenant claims', async () => {
 const actual = await resolved(resolver(), { claims: { role: 'admin', tenant: 'foreign', npub: 'forged' } });
 assert.equal(actual.role, 'guest'); assert.equal(actual.tenantId, 'fixture-canonical-organization');
 assert.equal(actual.session.account.id, 'fixture-existing-person'); assert.equal(actual.session.account.nostrIdentity.pubkeyHex, key);
 assert.equal(actual.reviewPersona.allowed, false);
});
for (const scope of ['fixture:identity:read', 'fixture:bootstrap:read', '']) test('missing required OAuth scope rejects before lookup: ' + scope, async () => {
 await assert.rejects(resolved(resolver(bundle(), env, async () => assert.fail('lookup before scope')), { claims: { scope } }), code('NATIVE_AUTHENTICATION_REQUIRED'));
});
test('unconfigured native branch does not fall back', async () => { await assert.rejects(resolved(resolver(bundle(), {})), code('NATIVE_AUTH_NOT_CONFIGURED')); });
for (const reason of ['missing-email','unverified-contact','signer-only','foreign-account-contact','nip05-is-not-email']) test('verified Nostr cannot bypass mandatory registered email: '+reason, async () => {
 const b=bundle();
 if(reason==='missing-email') delete b.account.primary_contact;
 if(reason==='unverified-contact') {b.accessIdentities[0].verified=false;b.emailVerification=null;}
 if(reason==='signer-only') {b.accessIdentities[0].method_type='nostr';b.emailVerification=null;}
 if(reason==='foreign-account-contact') {b.accessIdentities[0].account_id='other-account';b.emailVerification.account_id='other-account';}
 if(reason==='nip05-is-not-email') b.account.primary_contact_type='nip05';
 await assert.rejects(resolved(resolver(b),{claims:{email:'forged@example.invalid',email_verified:true}}),code('NATIVE_EMAIL_VERIFICATION_REQUIRED'));
});
test('identity and bootstrap must have distinct configured scopes', async()=>{
 await assert.rejects(resolved(resolver(bundle(),{...env,CRAYS_NATIVE_AUTH_BOOTSTRAP_SCOPE:env.CRAYS_NATIVE_AUTH_IDENTITY_SCOPE})),code('NATIVE_AUTH_NOT_CONFIGURED'));
});
test('unknown subject does not create a person, key or membership', async () => { await assert.rejects(resolved(resolver(null)), code('NATIVE_CORE_MAPPING_REQUIRED')); });
for (const state of ['review', 'blocked']) test('canonical account ' + state + ' stays denied', async () => {
 const b = bundle(); b.account.status = state; await assert.rejects(resolved(resolver(b)), code('NATIVE_CORE_MAPPING_REQUIRED'));
});
for (const state of ['review', 'revoked']) test('canonical role ' + state + ' stays denied', async () => {
 const b = bundle(); b.roleAssignments[0].status = state; await assert.rejects(resolved(resolver(b)), code('NATIVE_CORE_MAPPING_REQUIRED'));
});
for (const state of ['pending', 'revoked']) test('unverified or revoked signer stays denied: ' + state, async () => {
 const b = bundle(); b.nostrIdentity.signer_status = state; await assert.rejects(resolved(resolver(b)), code('NATIVE_CORE_MAPPING_REQUIRED'));
});
test('role/key mismatch rejects', async () => {
 const b = bundle(); b.roleAssignments[0].nostr_pubkey_hex = 'cd'.repeat(32);
 await assert.rejects(resolved(resolver(b)), code('NATIVE_CORE_MAPPING_REQUIRED'));
});
test('foreign account assignment rejects', async () => {
 const b = bundle(); b.roleAssignments[0].account_id = 'foreign-person';
 await assert.rejects(resolved(resolver(b)), code('NATIVE_CONTEXT_SELECTION_REQUIRED'));
});
test('multiple active organization assignments require explicit context selection', async () => {
 const b = bundle(); b.roleAssignments.push({ ...b.roleAssignments[0], assignment_id: 'second', organization_id: 'other-org' });
 await assert.rejects(resolved(resolver(b)), code('NATIVE_CONTEXT_SELECTION_REQUIRED'));
});
test('personal/global context without admitted canonical organization remains explicit gap', async () => {
 const b = bundle(); delete b.roleAssignments[0].organization_id;
 await assert.rejects(resolved(resolver(b)), code('NATIVE_CONTEXT_SELECTION_REQUIRED'));
});
test('repository unavailability is503, not login success or a preview fallback', async () => {
 await assert.rejects(resolved(resolver(null, env, async () => { throw new Error('database offline'); })), error => {
  assert.equal(error.code, 'NATIVE_CORE_LOOKUP_UNAVAILABLE'); assert.equal(error.status, 503); return true;
 });
});
for (const change of ['query', 'hash', 'name', 'variables']) test('unadmitted GraphQL envelope rejects: ' + change, async () => {
 const b = body(); if (change === 'query') b.query = 'mutation { forbidden }';
 if (change === 'hash') b.extensions.persistedQuery.sha256Hash = '00'.repeat(32);
 if (change === 'name') b.operationName = 'AnotherOperation'; if (change === 'variables') b.variables = { role: 'admin' };
 await assert.rejects(resolved(resolver(), { payload: b }), code('NATIVE_OPERATION_NOT_ADMITTED'));
});
for (const options of [{ method: 'GET' }, { url: 'https://core.crays.example/api/graphql?role=admin' },
 { url: 'https://core.crays.example/api/crays/personal-accounts/status' }, { headers: { cookie: 'crays-role=admin' } }]) {
 test('wrong method/path/query or mixed cookie is never admitted: ' + JSON.stringify(options), async () => {
  await assert.rejects(resolved(resolver(), options), code('NATIVE_REQUEST_NOT_ADMITTED'));
 });
}
test('oversized native body rejects promptly', { timeout: 2000 }, async () => {
 await assert.rejects(resolved(resolver(), { payload: ' '.repeat(32769) }), code('NATIVE_REQUEST_NOT_ADMITTED'));
});
test('admission cannot be replayed on a different Request or changed Authorization', async () => {
 const r = resolver(); const q = await request(); await r.admit(q);
 await assert.rejects(r.resolve(await request()), code('NATIVE_REQUEST_NOT_ADMITTED'));
 q.headers.set('authorization', 'Bearer changed'); await assert.rejects(r.resolve(q), code('NATIVE_REQUEST_NOT_ADMITTED'));
});
function identityBody(){return {operationName:'NativeIdentityStatus',extensions:{persistedQuery:{version:1,sha256Hash:'ddd997fbe168bf5e721b39f37712421e7f02676cac75287cc09ec0e68d6e0073'}}};}
async function identityResolved(r,claims={}){const q=await request({payload:identityBody(),claims:{scope:'fixture:identity:read',...claims}});await r.admit(q);return r.resolveIdentity(q);}
test('identity-only scope reads own existing setup without bootstrap or domain rights',async()=>{
 const r=resolver();const p=await identityResolved(r,{role:'admin',accountId:'foreign'});assert.equal(p.accountId,'fixture-existing-person');assert.equal(p.emailVerificationRequired,false);assert.equal(p.nostrPublicKeyHex,key);assert.equal(p.nostrSignerVerified,true);assert.equal(p.role,undefined);
});
test('identity lookup returns unmapped instead of creating a replacement account',async()=>{const p=await identityResolved(resolver(null));assert.equal(p.accountMapped,false);assert.equal(p.accountId,null);assert.equal(p.nostrPublicKeyHex,null);});
test('pending signer and missing email retain existing identity without granting access',async()=>{const b=bundle();delete b.account.primary_contact;b.nostrIdentity.signer_status='pending';const p=await identityResolved(resolver(b));assert.equal(p.nostrPublicKeyHex,key);assert.equal(p.nostrSignerVerified,false);assert.equal(p.emailVerificationRequired,true);assert.ok(p.requiredActions.includes('verify_contact'));});
test('identity read requires identity scope before canonical lookup',async()=>{await assert.rejects(identityResolved(resolver(null,env,async()=>assert.fail('lookup without scope')),{scope:'fixture:bootstrap:read'}),code('NATIVE_AUTHENTICATION_REQUIRED'));});
test('identity admission cannot be reused as domain context or on another Request',async()=>{const r=resolver(),q=await request({payload:identityBody(),claims:{scope:'fixture:identity:read'}});await r.admit(q);await assert.rejects(r.resolve(q),code('NATIVE_REQUEST_NOT_ADMITTED'));await assert.rejects(r.resolveIdentity(await request({payload:identityBody()})),code('NATIVE_REQUEST_NOT_ADMITTED'));q.headers.set('authorization','Bearer changed');await assert.rejects(r.resolveIdentity(q),code('NATIVE_REQUEST_NOT_ADMITTED'));});
test('actual DAL uses native branch before portal/browser/review fallbacks', async () => {
 value = bundle(); const q = await request(); await api.admitNativeCoreGraphQLRequest(q);
 const actual = await resolveCraysRouteContext(q); assert.equal(actual.session.account.id, 'fixture-existing-person');
 assert.equal(globalThis[Symbol.for('crays.native.fixture.browserCalls')], 0);
 const bad = await request({ headers: { cookie: 'crays-portal-issued=1;crays-role=admin', authorization: 'Bearer broken' } });
 await assert.rejects(resolveCraysRouteContext(bad), code('NATIVE_REQUEST_NOT_ADMITTED'));
 assert.equal(globalThis[Symbol.for('crays.native.fixture.browserCalls')], 0);
});
test('actual DAL maps current account status after envelope admission', async () => {
 const q = await request(); await api.admitNativeCoreGraphQLRequest(q); value = bundle(); value.account.status = 'blocked';
 await assert.rejects(resolveCraysRouteContext(q), code('NATIVE_CORE_MAPPING_REQUIRED'));
});
test('Authorization absent preserves existing browser/review path', async () => {
 process.env.CRAYS_ALLOW_REVIEW_PERSONAS = 'true';
 const actual = await resolveCraysRouteContext(new Request('https://core.crays.example/api/graphql?role=guest'));
 assert.equal(actual.authoritySource, 'server-authorized-review-persona');
 assert.equal(globalThis[Symbol.for('crays.native.fixture.browserCalls')], 1);
});
after(() => {
 globalThis.fetch = originalFetch;
 const output=process.env.CRAYS_NATIVE_ADMISSION_PINS_PATH;
 if(output)assert.match(output,/^\/srv\/crays\/worktrees\/ios-core-native-01a14a1b\/crays-platform\/\.qualification\/(?:native-http-sql-(?:v6[12345678]|v75|v76|v77|v78|v79|v80|v81|v82|v83|v84|v85|v86|v87|v88|v89|v90|v91|v92|v93|v94|v95|v96|v97|v98|v99|v100)|native-provider-binding-v69|native-original-rpc-v7[012345])\/ADMISSION_SOURCE_PINS\.json$/);
 writeFileSync(output??new URL('./source-pins.json', import.meta.url), JSON.stringify({ scope: 'Actual native admission + DAL + mapper/permissions; DB/Auth0browser ports controlled, no live acceptance', files: sourcePins() }, null, 2) + '\n');
});

test('legacy generic verified=true cannot replace an address-bound receipt',async()=>{const b=bundle();b.emailVerification=null;await assert.rejects(resolved(resolver(b)),code('NATIVE_EMAIL_VERIFICATION_REQUIRED'));});
test('current purpose-specific email receipt is independent of generic auth verified flag',async()=>{const b=bundle();b.accessIdentities[0].verified=false;assert.equal((await resolved(resolver(b))).session.account.id,'fixture-existing-person');});
test('contact proof lookup failure cannot fall back to generic verified or anonymous',async()=>{const r=api.createNativeCoreRequestResolver({environment:env,fetch:transport,lookup:async()=>bundle(),lookupContactVerification:async()=>{throw Error('synthetic unavailable');}});await assert.rejects(resolved(r),code('NATIVE_EMAIL_PROOF_LOOKUP_UNAVAILABLE'));});
test('authorization changed during contact lookup is rejected after that await',async()=>{let q;const r=api.createNativeCoreRequestResolver({environment:env,fetch:transport,lookup:async()=>bundle(),lookupContactVerification:async()=>{q.headers.set('authorization','Bearer changed');return bundle().emailVerification;}});q=await request();await r.admit(q);await assert.rejects(r.resolve(q),code('NATIVE_AUTHENTICATION_REQUIRED'));});

test('Core lookup receives exact verified issuer/subject/client binding, never forwarded identity hints',async()=>{
 let observed;
 const r=resolver(bundle(),env,async(provider,subject,binding)=>{
  assert.equal(provider,'auth0');assert.equal(subject,'auth0|native-qualification');
  observed=binding;
  assert.equal(Object.isFrozen(binding),true);
  assert.deepEqual(binding,{providerKey:'auth0',providerSubject:subject,issuer,clientId:'native_fixture_client'});
  return bundle();
 });
 const result=await resolved(r,{headers:{'x-auth0-issuer':'https://foreign.example/','x-auth0-client-id':'foreign-client','x-crays-provider-subject':'foreign-owner'},claims:{email:'foreign@example.invalid',providerSubject:'foreign-owner'}});
 assert.equal(result.session.account.id,'fixture-existing-person');
 assert.deepEqual(Object.keys(observed).sort(),['clientId','issuer','providerKey','providerSubject']);
});
test('two admitted native clients retain distinct exact Core binding tuples for the same subject',async()=>{
 const seen=[];
 const r=resolver(bundle(),{...env,CRAYS_NATIVE_AUTH_CLIENT_IDS:'native_fixture_client,native_fixture_second'},async(_provider,_subject,binding)=>{seen.push(binding);return bundle();});
 await resolved(r);await resolved(r,{claims:{azp:'native_fixture_second'}});
 assert.deepEqual(seen.map(v=>v.clientId),['native_fixture_client','native_fixture_second']);
 assert.notEqual(seen[0],seen[1]);assert.equal(seen[0].issuer,seen[1].issuer);
});
test('conflicting signed azp/client_id never reaches exact Core lookup',async()=>{
 let called=0;
 const r=resolver(bundle(),env,async()=>{called++;return bundle();});
 await assert.rejects(resolved(r,{claims:{client_id:'foreign-client'}}),code('NATIVE_AUTHENTICATION_REQUIRED'));
 assert.equal(called,0);
});
test('exact Core binding denial has one lookup and no subject-only fallback',async()=>{
 let called=0;
 const r=resolver(bundle(),env,async(_provider,_subject,binding)=>{called++;assert.equal(binding.clientId,'native_fixture_client');return null;});
 await assert.rejects(resolved(r),code('NATIVE_CORE_MAPPING_REQUIRED'));assert.equal(called,1);
});
test('Authorization replacement during exact Core binding lookup rejects the returned mapping',async()=>{
 let q;
 const r=resolver(bundle(),env,async()=>{q.headers.set('authorization','Bearer replaced');return bundle();});
 q=await request();await r.admit(q);await assert.rejects(r.resolve(q),code('NATIVE_AUTHENTICATION_REQUIRED'));
});
test('exact provider binding cannot be recovered with another Request or forged principal handle',async()=>{
 const {createNativeAuth0Verifier}=await import('../../src/lib/native-auth/native-auth0-verifier.mjs');
 const v=createNativeAuth0Verifier({issuer,audience,nativeClientIds:['native_fixture_client']},{fetch:transport});
 const q=await request(),p=await v.authenticate(q);
 const binding=v.resolveVerifiedProviderBinding(q,p);
 assert.equal(binding.issuer,issuer);assert.equal(binding.clientId,'native_fixture_client');
 assert.throws(()=>v.resolveVerifiedProviderBinding(q.clone(),p),/NATIVE_AUTHENTICATION_REQUIRED/);
 assert.throws(()=>v.resolveVerifiedProviderBinding(q,{...p}),/NATIVE_AUTHENTICATION_REQUIRED/);
 q.headers.set('authorization','Bearer replaced');
 assert.throws(()=>v.resolveVerifiedProviderBinding(q,p),/NATIVE_AUTHENTICATION_REQUIRED/);
});

test('V2 wire account without legacy revision uses only current own contact reader, including unverified email setup',async()=>{
 const b=bundle();delete b.account.primary_contact_revision;
 let calls=0;
 const r=api.createNativeCoreRequestResolver({environment:env,fetch:transport,lookup:async()=>b,lookupContactVerification:async()=>null,
  lookupContactRevision:async(account,contact,type)=>{calls++;assert.equal(account,b.account.account_id);assert.equal(contact,b.account.primary_contact);assert.equal(type,'contact');return '27';}});
 const result=await identityResolved(r);assert.equal(result.contactRevision,'27');assert.equal(result.emailVerificationRequired,true);assert.equal(calls,1);
});
test('mismatched or changed current contact state never invents a setup revision from the wire account',async()=>{
 const b=bundle();b.account.primary_contact_revision='999';
 const r=api.createNativeCoreRequestResolver({environment:env,fetch:transport,lookup:async()=>b,lookupContactVerification:async()=>b.emailVerification,lookupContactRevision:async()=>null});
 await assert.rejects(identityResolved(r),code('NATIVE_CONTACT_STATE_CHANGED'));
});
test('authorization changed during current contact revision IO suppresses the native identity result',async()=>{
 const b=bundle();let q;
 const r=api.createNativeCoreRequestResolver({environment:env,fetch:transport,lookup:async()=>b,lookupContactVerification:async()=>b.emailVerification,lookupContactRevision:async()=>{q.headers.set('authorization','Bearer changed-during-contact-read');return '1';}});
 q=await request({payload:identityBody(),claims:{scope:'fixture:identity:read'}});await r.admit(q);
 await assert.rejects(r.resolveIdentity(q),code('NATIVE_AUTHENTICATION_REQUIRED'));
});
