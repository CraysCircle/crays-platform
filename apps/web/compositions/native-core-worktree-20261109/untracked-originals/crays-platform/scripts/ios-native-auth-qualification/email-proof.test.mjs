import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import { createNativeEmailProofReader } from '../../src/lib/native-auth/native-email-proof.mjs';

const issuer='https://email-proof-fixture.auth0.com/', audience='https://core.fixture.invalid/native';
const { publicKey, privateKey }=await generateKeyPair('RS256');
const jwk={...await exportJWK(publicKey),kid:'email-proof-fixture',alg:'RS256'};
const configuration={issuer,audience,nativeClientIds:['native_email_fixture'],requiredIdentityScope:'fixture:identity:read'};
async function request({claims={},age=0,headers={},signal,foreignKey=false}={}){
 const now=Math.floor(Date.now()/1000),key=foreignKey?(await generateKeyPair('RS256')).privateKey:privateKey;
 const token=await new SignJWT({sub:'auth0|email-proof-fixture',azp:'native_email_fixture',scope:'fixture:identity:read',...claims})
  .setProtectedHeader({alg:'RS256',typ:'JWT',kid:jwk.kid}).setIssuer(issuer).setAudience(audience)
  .setIssuedAt(now-age).setExpirationTime(now-age+3600).sign(key);
 return new Request('https://core.fixture.invalid/api/graphql',{method:'POST',headers:{authorization:'Bearer '+token,...headers},signal});
}
function fixture({userinfo={sub:'auth0|email-proof-fixture',email:'verified@example.invalid',email_verified:true},response,afterInfo}={}){
 const calls=[];
 const transport=async(url,options)=>{
  assert.ok([issuer+'.well-known/jwks.json',issuer+'userinfo'].includes(String(url)),'No dynamic network destination');
  if(String(url).endsWith('jwks.json'))return Response.json({keys:[jwk]});
  calls.push({url:String(url),options});if(afterInfo)afterInfo();
  return response?response():Response.json(userinfo);
 };
 return {reader:createNativeEmailProofReader(configuration,{fetch:transport}),calls};
}
const rejected=error=>{assert.equal(error.message,'NATIVE_EMAIL_PROOF_REQUIRED');return true;};
test('actual signed native token and same-subject verified provider email yield only request-bound opaque handle',async()=>{
 const {reader,calls}=fixture(),r=await request({claims:{email:'forged@example.invalid',email_verified:true,userinfo:'https://foreign.invalid'}});
 const proof=await reader.read(r);assert.deepEqual(proof,{kind:'verified-native-provider-email'});
 const value=reader.resolve(r,proof);assert.equal(value.email,'verified@example.invalid');assert.equal(value.providerSubject,'auth0|email-proof-fixture');assert.equal(value.issuer,issuer);assert.match(value.tokenDigest,/^[0-9a-f]{64}$/);
 assert.ok(!JSON.stringify(value).includes(r.headers.get('authorization').slice(7)));
 assert.equal(calls.length,1);const {url,options}=calls[0];assert.equal(url,issuer+'userinfo');assert.equal(options.headers.authorization,r.headers.get('authorization'));assert.equal(options.method,'GET');assert.equal(options.redirect,'error');assert.equal(options.credentials,'omit');assert.equal(options.cache,'no-store');assert.equal(options.headers.cookie,undefined);
});
test('unverified or mismatched provider email cannot be replaced by token/body assertions',async()=>{
 for(const userinfo of [{sub:'foreign',email:'verified@example.invalid',email_verified:true},{sub:'auth0|email-proof-fixture',email:'verified@example.invalid',email_verified:false},{sub:'auth0|email-proof-fixture',email:'verified@example.invalid',email_verified:'true'},{sub:'auth0|email-proof-fixture',email:'nsec-not-an-email',email_verified:true},{sub:'auth0|email-proof-fixture',email:'x@example.invalid\n',email_verified:true}]){
  const {reader}=fixture({userinfo});await assert.rejects(reader.read(await request({claims:{email:'claimed@example.invalid',email_verified:true}})),rejected);
 }
});
test('stale or wrongly signed credential, wrong client, missing scope and cookie mixture stop before userinfo',async()=>{
 for(const options of [{age:301},{age:3700},{foreignKey:true},{claims:{azp:'foreign_client'}},{claims:{scope:'fixture:bootstrap:read'}},{headers:{cookie:'untrusted=value'}}]){
  const {reader,calls}=fixture();await assert.rejects(reader.read(await request(options)),rejected);assert.equal(calls.length,0);
 }
});
test('forged/copied handle and another Request never acquire the email proof',async()=>{
 const {reader}=fixture(),r=await request(),proof=await reader.read(r);
 assert.throws(()=>reader.resolve(r,{...proof}),rejected);
 assert.throws(()=>reader.resolve(r.clone(),proof),rejected);
 const other=fixture().reader;assert.throws(()=>other.resolve(r,proof),rejected);
});
test('changed authorization during userinfo read invalidates the proof before return',async()=>{
 const r=await request();const {reader}=fixture({afterInfo:()=>r.headers.set('authorization','Bearer changed')});
 await assert.rejects(reader.read(r),rejected);
});
test('cancelled proof read or later cancelled Request cannot be used for a Core write',async()=>{
 const cancelled=new AbortController();cancelled.abort();const f=fixture();await assert.rejects(f.reader.read(await request({signal:cancelled.signal})),rejected);assert.equal(f.calls.length,0);
 const controller=new AbortController(),r=await request({signal:controller.signal}),{reader}=fixture();const proof=await reader.read(r);controller.abort();assert.throws(()=>reader.resolve(r,proof),rejected);
});
test('provider errors, HTML, malformed JSON and redirected or foreign responses stay sanitized',async()=>{
 const responses=[()=>Response.json({error:'private provider response'},{status:401}),()=>new Response('<html>private</html>',{headers:{'content-type':'text/html'}}),()=>new Response('{bad-json',{headers:{'content-type':'application/json'}}),()=>{const r=Response.json({});Object.defineProperty(r,'redirected',{value:true});return r;},()=>{const r=Response.json({});Object.defineProperty(r,'url',{value:'https://foreign.invalid/userinfo'});return r;}];
 for(const response of responses){const {reader}=fixture({response});await assert.rejects(reader.read(await request()),rejected);}
});
test('oversized provider stream is cancelled before full collection',async()=>{
 let cancelled=false;const response=()=>new Response(new ReadableStream({start(controller){controller.enqueue(new Uint8Array(16384));controller.enqueue(new Uint8Array(1));},cancel(){cancelled=true;}}),{headers:{'content-type':'application/json'}});
 const {reader}=fixture({response});await assert.rejects(reader.read(await request()),rejected);assert.equal(cancelled,true);
});
test('invalid configured freshness/scope fails construction instead of guessing permissions',()=>{
 for(const change of [{maximumProofAgeSeconds:0},{maximumProofAgeSeconds:601},{requiredIdentityScope:''},{requiredIdentityScope:'invalid scope'}])assert.throws(()=>createNativeEmailProofReader({...configuration,...change}),/INVALID_NATIVE_EMAIL_PROOF_CONFIGURATION/);
});
