import{randomBytes,createHash}from'node:crypto';
import{PROVIDERS,actionScopes}from'./providers.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex'),random=()=>randomBytes(32).toString('base64url');
const fail=c=>{throw Error(c);};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const publicRow=r=>({handle:r.handle,provider:r.provider,version:r.version,state:r.state,actions:[...r.actions],grantedScopes:[...r.grantedScopes],expiresAt:r.expiresAt});
function object(x,keys){if(!x||Object.getPrototypeOf(x)!==Object.prototype||Reflect.ownKeys(x).some(k=>typeof k!=='string'||!keys.includes(k)||!Object.hasOwn(Object.getOwnPropertyDescriptor(x,k),'value')))fail('INVALID_INPUT');}
function text(x,max=2048){if(typeof x!=='string'||!x.length||x.length>max)fail('INVALID_INPUT');return x;}
function appConfig(provider,apps){
 const p=Object.hasOwn(PROVIDERS,provider)?PROVIDERS[provider]:null,a=Object.hasOwn(apps??{},provider)?apps[provider]:null;if(!p||!a)fail('APP_NOT_CONFIGURED');
 text(a.clientId);text(a.secretRef);const u=new URL(text(a.redirectUri));
 if(u.protocol!=='https:'||u.username||u.password||u.hash||u.search)fail('REGISTERED_HTTPS_REDIRECT_REQUIRED');
 if(!Array.isArray(a.approvedScopes)||!a.approvedScopes.every(x=>typeof x==='string'))fail('APP_APPROVAL_REQUIRED');
 return{clientId:a.clientId,secretRef:a.secretRef,redirectUri:u.href,approvedScopes:[...a.approvedScopes],fingerprint:sha(JSON.stringify([provider,a.clientId,a.secretRef,u.href,[...a.approvedScopes].sort()]))};
}
/** Server-only object. resolvePerson is createCorePersonResolver, never supplied by request/model.
 * Durable store and vault contracts are in HOST_CONTRACT.md; absent adapters fail at construction.
 * verifyIdToken MUST be an actual OIDC cryptographic verifier (iss/aud/nonce/exp/signature/tenant).
 * transport accepts only this module's fixed endpoints, no caller URL. No token is returned publicly.
 */
export function createOAuthConnectionService({resolvePerson,store,vault,transport,verifyIdToken,apps,now=Date.now}){
 for(const f of[resolvePerson,resolvePerson?.assertResolvedPerson,transport,verifyIdToken,store?.createAttempt,store?.claimAttempt,store?.commitConnection,store?.getConnection,store?.revokeConnection,store?.getAttemptOutcome,vault?.withAppSecret,vault?.seal,vault?.destroy])if(typeof f!=='function')fail('HOST_ADAPTER_REQUIRED');
 const json=async(url,options)=>{
  const r=await transport(url,{...options,redirect:'error',signal:AbortSignal.timeout(15000)});
  if(!r?.ok)fail('PROVIDER_REQUEST_FAILED');
  // Host transport implements streaming response byte cap; do not call unbounded response.json().
  const value=await r.readJsonBounded(65536);if(!value||typeof value!=='object'||Array.isArray(value))fail('PROVIDER_RESPONSE_INVALID');return value;
 };
 const getPerson=async request=>{const person=await resolvePerson(request);await resolvePerson.assertResolvedPerson(person);return person;};
 const authorityFingerprint=p=>sha(JSON.stringify([p.accountId,p.canonicalPersonId,p.personVersion,p.accountStatus,p.personLifecycle,p.authSubjectSha256,p.sessionBinding]));
 const bound=(a,p)=>a.coreFingerprint===authorityFingerprint(p)&&a.accountId===p.accountId&&a.canonicalPersonId===p.canonicalPersonId&&a.sessionBinding===p.sessionBinding;
 return Object.freeze({
  async begin(request,input){
   object(input,['provider','actions']);const provider=text(input.provider,20),p=Object.hasOwn(PROVIDERS,provider)?PROVIDERS[provider]:null;
   if(!p)fail('PROVIDER_NOT_SUPPORTED');const scopes=actionScopes(provider,input.actions),a=appConfig(provider,apps);
   for(const s of[...p.identity,...scopes])if(!a.approvedScopes.includes(s))fail('APP_SCOPE_NOT_APPROVED');
   const person=await getPerson(request),state=random(),nonce=random(),verifier=p.pkce?random():null,createdAt=now(),expiresAt=createdAt+600000;
   const attempt={id:random(),stateSha256:sha(state),accountId:person.accountId,canonicalPersonId:person.canonicalPersonId,sessionBinding:person.sessionBinding,coreFingerprint:authorityFingerprint(person),provider,clientId:a.clientId,redirectUri:a.redirectUri,appFingerprint:a.fingerprint,actions:[...input.actions].sort(),resourceScopes:scopes,nonce,verifier,createdAt,expiresAt};
   await person.assertCurrent();await store.createAttempt(attempt);await person.assertCurrent();
   const u=new URL(p.authorization);for(const[k,v]of Object.entries({response_type:'code',client_id:a.clientId,redirect_uri:a.redirectUri,state,nonce,scope:[...p.identity,...scopes].join(' ')}))u.searchParams.set(k,v);
   if(p.pkce){u.searchParams.set('code_challenge',createHash('sha256').update(verifier).digest('base64url'));u.searchParams.set('code_challenge_method','S256');}
   if(provider==='google'){u.searchParams.set('access_type','offline');u.searchParams.set('prompt','consent');}
   return{status:'CONSENT_REQUIRED',authorizationUrl:u.href,expiresAt,provider,actions:attempt.actions,attemptHandle:attempt.id};
  },
  async callback(request,input){
   object(input,['provider','state','code','error']);const provider=text(input.provider,20),state=text(input.state,128);
   if(!/^[A-Za-z0-9_-]{43}$/.test(state))fail('STATE_INVALID');
   const person=await getPerson(request),a=appConfig(provider,apps),p=PROVIDERS[provider];
   // Atomic server-side claim checks ALL bindings + expiry before consuming. Foreign claims never consume.
   await person.assertCurrent();const attempt=await store.claimAttempt({stateSha256:sha(state),accountId:person.accountId,canonicalPersonId:person.canonicalPersonId,sessionBinding:person.sessionBinding,coreFingerprint:authorityFingerprint(person),provider,clientId:a.clientId,redirectUri:a.redirectUri,appFingerprint:a.fingerprint,now:now()});
   if(!attempt||!bound(attempt,person)||attempt.provider!==provider||attempt.appFingerprint!==a.fingerprint||attempt.redirectUri!==a.redirectUri||attempt.expiresAt<=now())fail('ATTEMPT_DENIED');
   if(input.error!==undefined)fail('PROVIDER_CONSENT_DENIED');const code=text(input.code,8192);
   let credentialRef,commitStarted=false;
   try{
    const tokens=await vault.withAppSecret(a.secretRef,async secret=>{
     text(secret,16384);const body=new URLSearchParams({grant_type:'authorization_code',code,client_id:a.clientId,client_secret:secret,redirect_uri:a.redirectUri});if(p.pkce)body.set('code_verifier',attempt.verifier);
     return json(p.token,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:body.toString()});
    });
    await person.assertCurrent();const tokenReceivedAt=now();text(tokens.access_token,32768);text(tokens.id_token,32768);if(String(tokens.token_type).toLowerCase()!=='bearer')fail('TOKEN_TYPE_DENIED');
    if(!Number.isSafeInteger(tokens.expires_in)||tokens.expires_in<1||tokens.expires_in>31536000)fail('TOKEN_EXPIRY_INVALID');
    const claims=await verifyIdToken({provider,token:tokens.id_token,clientId:a.clientId,nonce:attempt.nonce,now:now()});
    await person.assertCurrent();if(!claims||claims.aud!==a.clientId||claims.nonce!==attempt.nonce||!Number.isFinite(claims.exp)||claims.exp*1000<=now())fail('ID_TOKEN_INVALID');
    text(claims.sub);text(claims.iss);
    if(provider==='microsoft'){
     if(!/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(claims.tid??'')||claims.iss!==`https://login.microsoftonline.com/${claims.tid}/v2.0`)fail('ISSUER_DENIED');
    }else if(claims.iss!==p.issuer)fail('ISSUER_DENIED');
    const profile=await json(p.userinfo,{method:'GET',headers:{Authorization:'Bearer '+tokens.access_token}});
    await person.assertCurrent();if(profile.sub!==claims.sub)fail('PROVIDER_SUBJECT_MISMATCH');
    // OIDC scope response may omit identity scopes; resources never inferred from request/profile.
    if(tokens.scope!==undefined)text(tokens.scope,8192);const granted=typeof tokens.scope==='string'?tokens.scope.split(/\s+/).filter(Boolean):[];
    const normalized=x=>provider==='microsoft'?x.replace(/^https:\/\/graph\.microsoft\.com\//,'').toLowerCase():x;
    const grantedSet=new Set(granted.map(normalized));for(const s of attempt.resourceScopes)if(!grantedSet.has(normalized(s)))fail('REQUESTED_SCOPE_NOT_GRANTED');
    if(tokens.refresh_token!==undefined)text(tokens.refresh_token,32768);
    await person.assertCurrent();if(attempt.expiresAt<=now())fail('ATTEMPT_EXPIRED');
    const expiresAt=tokenReceivedAt+tokens.expires_in*1000,providerSubject=claims.iss+'\n'+claims.sub;
    const handle='cn_'+random();
    credentialRef=await vault.seal({accountId:person.accountId,canonicalPersonId:person.canonicalPersonId,provider,handle,credentials:{accessToken:tokens.access_token,refreshToken:tokens.refresh_token??null},expiresAt});
    text(credentialRef,4096);await person.assertCurrent();
    commitStarted=true;const result=await store.commitConnection({attemptId:attempt.id,now:now(),accountId:person.accountId,canonicalPersonId:person.canonicalPersonId,sessionBinding:person.sessionBinding,coreFingerprint:authorityFingerprint(person),handle,provider,clientId:a.clientId,appFingerprint:a.fingerprint,providerSubjectSha256:sha(providerSubject),credentialRef,actions:attempt.actions,grantedScopes:granted,expiresAt,createdAt:now()});
    if(!result||result.handle!==handle||result.state!=='CONNECTED'||result.accountId!==person.accountId||result.canonicalPersonId!==person.canonicalPersonId||!Number.isSafeInteger(result.version))fail('COMMIT_NOT_CONFIRMED');
    credentialRef=undefined;await person.assertCurrent();return publicRow(result);
   }catch(e){if(credentialRef&&!commitStarted)await vault.destroy(credentialRef).catch(()=>{});if(commitStarted)throw Error('COMMIT_OUTCOME_UNKNOWN');throw Error(['PROVIDER_SUBJECT_MISMATCH','REQUESTED_SCOPE_NOT_GRANTED','ATTEMPT_EXPIRED','CORE_PERSON_CHANGED','ID_TOKEN_INVALID','ISSUER_DENIED','TOKEN_TYPE_DENIED','TOKEN_EXPIRY_INVALID'].includes(e?.message)?e.message:'CONNECTION_NOT_CONFIRMED');}
  },
  async reconcileAttempt(request,input){
   object(input,['attemptHandle']);text(input.attemptHandle,80);const person=await getPerson(request);await person.assertCurrent();
   const r=await store.getAttemptOutcome({attemptId:input.attemptHandle,accountId:person.accountId,canonicalPersonId:person.canonicalPersonId,sessionBinding:person.sessionBinding});
   await person.assertCurrent();if(!r)return{status:'ATTEMPT_NOT_FOUND'};
   if(r.state!=='CONNECTED')return{status:'NOT_CONNECTED',attemptState:r.state};
   if(r.accountId!==person.accountId||r.canonicalPersonId!==person.canonicalPersonId)fail('CONNECTION_ACTION_DENIED');
   return publicRow(r);
  },
  async withConnection(request,input,execute){
   object(input,['handle','action','version']);text(input.handle,80);text(input.action,40);if(!Number.isSafeInteger(input.version)||input.version<1||typeof execute!=='function')fail('HANDLE_DENIED');
   const person=await getPerson(request),read=()=>store.getConnection({handle:input.handle,accountId:person.accountId,canonicalPersonId:person.canonicalPersonId});
   const row=await read();if(!row||row.state!=='CONNECTED'||row.version!==input.version||row.expiresAt<=now()||row.accountId!==person.accountId||row.canonicalPersonId!==person.canonicalPersonId||!row.actions.includes(input.action))fail('CONNECTION_ACTION_DENIED');
   const app=appConfig(row.provider,apps);if(row.appFingerprint!==app.fingerprint)fail('APP_CHANGED');
   const need=actionScopes(row.provider,[input.action]),norm=x=>row.provider==='microsoft'?x.replace(/^https:\/\/graph\.microsoft\.com\//,'').toLowerCase():x;
   for(const s of need)if(!row.grantedScopes.map(norm).includes(norm(s)))fail('CONNECTION_ACTION_DENIED');
   const assertCurrent=async()=>{await person.assertCurrent();const fresh=await read();if(!same(fresh,row)||fresh.expiresAt<=now())fail('CONNECTION_CHANGED');};
   await assertCurrent();
   // Host operation, never model-supplied callback; must invoke assertCurrent immediately before IO.
   return execute({credentialRef:row.credentialRef,canonicalPersonId:person.canonicalPersonId,provider:row.provider,action:input.action,assertCurrent});
  },
  async disconnect(request,input){
   object(input,['handle','version']);text(input.handle,80);if(!Number.isSafeInteger(input.version)||input.version<1)fail('HANDLE_DENIED');
   const person=await getPerson(request);await person.assertCurrent();
   // Atomic local revocation first; old handles immediately fail even when remote revocation is unavailable.
   const r=await store.revokeConnection({handle:input.handle,version:input.version,accountId:person.accountId,canonicalPersonId:person.canonicalPersonId,now:now()});
   if(!r||r.state!=='REVOKED'||r.accountId!==person.accountId||r.canonicalPersonId!==person.canonicalPersonId)fail('REVOCATION_NOT_CONFIRMED');
   let credentialCleanupPending=false;try{await vault.destroy(r.credentialRef);}catch{credentialCleanupPending=true;}return{handle:r.handle,state:'REVOKED',version:r.version,credentialCleanupPending,providerRevocationConfirmed:false};
  }
 });
}
