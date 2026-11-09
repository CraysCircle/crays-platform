import {createHash} from 'node:crypto';
const PATH='/api/crays/personal/messaging/identity',ORIGIN='http://localhost:8990',ISSUER='https://login.crays.pro/',CLIENT='gVA7ECS4WDjweQjtjZFbyNoxaVXnH2vl';
const fail=code=>Object.assign(Error(code),{code});
const bounded=value=>typeof value==='string'&&value.length>0&&value.length<=512&&!/[\x00-\x20\x7f]/.test(value);
/** Same original Auth0 Node SDK, a separate narrow read path. No request rewriting to a Chuck path.
 * Host supplies original pinned SDK/private configuration; no configuration or credentials are loaded here. */
export function createMessagingIdentitySessionReader(options){return createScopedMessagingSessionReader(options,request=>request.url===PATH&&request.method==='POST');}
/** Separate exact existing-custody RPC; never rewrite a signer request as identity/Chuck. */
export function createMessagingSignerSessionReader(options){return createScopedMessagingSessionReader(options,request=>request.url==='/api/crays/personal/messaging/signer'&&request.method==='POST');}
/** Authentication for actual human read/send requests, without rewriting them
 * into identity/Chuck requests. It authenticates an account, never a chat ACL. */
export function createHumanMessagingSessionReader(options){
 return createScopedMessagingSessionReader(options,request=>{
  if(['GET','POST'].includes(request.method)&&request.url==='/api/crays/personal/messaging/groups')return true;
  if(request.method==='GET'&&request.url==='/api/crays/personal/messaging/destinations')return true;
  if(request.method==='GET'&&typeof request.url==='string'&&request.url.startsWith('/api/crays/personal/messaging/inbox?')){try{const u=new URL(request.url,ORIGIN),entries=[...u.searchParams];return u.pathname==='/api/crays/personal/messaging/inbox'&&entries.length===1&&entries[0][0]==='cursor'&&/^(0|[1-9]\d{0,2})$/.test(entries[0][1])&&Number(entries[0][1])%60===0&&!u.hash;}catch{return false;}}
  if(request.method==='POST')return ['/api/crays/personal/messaging/group-blob','/api/crays/personal/messaging/group-relay','/api/crays/personal/messaging/send','/api/crays/personal/messaging/send-file','/api/crays/personal/messaging/attachment','/api/crays/personal/messaging/history'].includes(request.url);
  if(request.method!=='GET'||typeof request.url!=='string'||!request.url.startsWith('/api/crays/personal/messaging/conversation?'))return false;
  try{const url=new URL(request.url,ORIGIN),entries=[...url.searchParams];return url.pathname==='/api/crays/personal/messaging/conversation'&&entries.length===1&&entries[0][0]==='conversationId'&&/^[a-zA-Z0-9:._-]{1,200}$/.test(entries[0][1])&&!['chuck','person:chuck'].includes(entries[0][1])&&!url.hash;}catch{return false;}
 });
}
function createScopedMessagingSessionReader({Auth0Client,configuration,assertConfigurationCurrent,now=Date.now},admittedRequest){
 if(typeof Auth0Client!=='function'||typeof assertConfigurationCurrent!=='function'||!configuration||Object.keys(configuration).sort().join(',')!=='clientId,clientSecret,domain,secret')throw fail('MESSAGING_IDENTITY_NOT_CONFIGURED');
 const{domain,clientId,clientSecret,secret}=configuration;if(clientId!==CLIENT||!['login.crays.pro','https://login.crays.pro','https://login.crays.pro/'].includes(domain)||!bounded(clientSecret)||typeof secret!=='string'||secret.length<32)throw fail('MESSAGING_IDENTITY_NOT_CONFIGURED');
 const sdk=new Auth0Client({domain,clientId,clientSecret,secret,appBaseUrl:ORIGIN,enableParallelTransactions:true}),proofs=new WeakMap();
 const current=(request,state)=>{assertConfigurationCurrent();if(request!==state.request||!admittedRequest(request)||request.url!==state.url||request.method!==state.method||request.headers.host!=='localhost:8990'||request.headers.cookie!==state.cookie||request.headers['x-crays-web-account-context']!==state.context||request.headers.origin!==state.origin||state.signal.aborted||now()>=state.deadline)throw fail('MESSAGING_IDENTITY_NOT_CURRENT');};
 const verified=async request=>{let value;try{value=await sdk.getSession(request);}catch{throw fail('MESSAGING_AUTHENTICATION_REQUIRED');}const user=value?.user,mcd=value?.internal?.mcd;
  // The fixed original SDK authenticates the encrypted session and issuer.
  // Its normal finalizer removes user.iss; only conflicting retained claims
  // are denied. This authenticates an account, never a conversation grant.
  if(!user||!bounded(user.sub)||(Object.hasOwn(user,'iss')&&user.iss!==ISSUER)||(mcd!=null&&(mcd.domain!=='login.crays.pro'||mcd.issuer!==ISSUER)))throw fail('MESSAGING_AUTHENTICATION_REQUIRED');return Object.freeze({providerKey:'auth0',providerSubject:value.user.sub,issuer:ISSUER,clientId:CLIENT});};
 return Object.freeze({
  runtimeGuard:assertConfigurationCurrent,
  async read(request,{signal}){assertConfigurationCurrent();if(!signal||!admittedRequest(request)||request.headers?.host!=='localhost:8990')throw fail('MESSAGING_AUTHENTICATION_REQUIRED');const state={request,url:request.url,method:request.method,cookie:request.headers.cookie,context:request.headers['x-crays-web-account-context'],origin:request.headers.origin,signal,deadline:now()+20000};current(request,state);state.binding=await verified(request);current(request,state);const proof=Object.freeze({});proofs.set(proof,state);return proof;},
  resolveVerifiedProviderBinding(request,proof){const state=proofs.get(proof);if(!state)throw fail('MESSAGING_AUTHENTICATION_REQUIRED');current(request,state);return state.binding;},
  assertCurrent(request,proof){const state=proofs.get(proof);if(!state)throw fail('MESSAGING_AUTHENTICATION_REQUIRED');current(request,state);},
  async revalidate(request,proof){const state=proofs.get(proof);if(!state)throw fail('MESSAGING_AUTHENTICATION_REQUIRED');current(request,state);const observed=await verified(request);current(request,state);if(JSON.stringify(observed)!==JSON.stringify(state.binding))throw fail('MESSAGING_AUTHENTICATION_REQUIRED');},
 });
}
/** Only original canonical self-identity reads. No signer grant, person/relay membership, chat plaintext,
 * key descriptor, key creation, policy write, Native-token bridge, or Club SaaS role is supplied here. */
export function createMessagingIdentityHandler({sdkReader,core,assertRuntimeCurrent}){
 if(!sdkReader||typeof assertRuntimeCurrent!=='function'||['lookupNativeIdentityThroughOriginalCore','getNativeCurrentAccountContactRevision','getNativeCurrentAccountEmailVerification'].some(name=>typeof core?.[name]!=='function'))throw fail('MESSAGING_IDENTITY_NOT_CONFIGURED');
 const readBinding=createCurrentMessagingBindingReader(core);
 const response=(res,status,value)=>{if(res.destroyed)return;res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','Vary':'Cookie','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});res.end(JSON.stringify(value));};
 return async function handle(request,res){
  if(request.url!==PATH)return false;
  if(request.method!=='POST'){response(res,405,{error:'MESSAGING_IDENTITY_REQUEST_NOT_ADMITTED'});return true;}
  const h=request.headers;
  if(h.host!=='localhost:8990'||h.origin!==ORIGIN||h.authorization!==undefined||h['sec-fetch-site']!==undefined&&h['sec-fetch-site']!=='same-origin'||Object.keys(h).some(k=>k==='forwarded'||k.startsWith('x-forwarded-')||k.startsWith('x-crays-')&&k!=='x-crays-web-account-context')){response(res,403,{error:'MESSAGING_AUTHENTICATION_REQUIRED'});return true;}
  const expected=h['x-crays-web-account-context'];if(expected!==undefined&&(!bounded(expected)||expected.length>200)||h['content-type']?.split(';')[0].trim().toLowerCase()!=='application/json'||h['content-encoding']!==undefined||h['content-length']!==undefined&&(!/^\d{1,2}$/.test(h['content-length'])||Number(h['content-length'])>64)){response(res,400,{error:'MESSAGING_IDENTITY_REQUEST_NOT_ADMITTED'});return true;}
  const stop=new AbortController(),abort=()=>stop.abort(),close=()=>{if(!res.writableEnded)abort();},timer=setTimeout(abort,20000);timer.unref();stop.signal.addEventListener('abort',()=>{request.destroy();if(!res.writableEnded)res.destroy();},{once:true});request.once('aborted',abort);res.once('close',close);
  const wait=async promise=>{stop.signal.throwIfAborted();let listener;const cancelled=new Promise((resolve,reject)=>{listener=()=>reject(fail('MESSAGING_IDENTITY_UNAVAILABLE'));stop.signal.addEventListener('abort',listener,{once:true});});try{return await Promise.race([promise,cancelled]);}finally{stop.signal.removeEventListener('abort',listener);}};
  try{
   assertRuntimeCurrent();const proof=await wait(sdkReader.read(request,{signal:stop.signal}));const current=()=>{stop.signal.throwIfAborted();if(sdkReader.runtimeGuard!==assertRuntimeCurrent)assertRuntimeCurrent();sdkReader.assertCurrent(request,proof);};current();let bytes=0,parts=[];for await(const chunk of request){bytes+=chunk.length;if(bytes>64)throw fail('MESSAGING_IDENTITY_REQUEST_NOT_ADMITTED');parts.push(chunk);current();}let input;try{input=JSON.parse(Buffer.concat(parts).toString('utf8'));}catch{throw fail('MESSAGING_IDENTITY_REQUEST_NOT_ADMITTED');}if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length)throw fail('MESSAGING_IDENTITY_REQUEST_NOT_ADMITTED');
   const provider=sdkReader.resolveVerifiedProviderBinding(request,proof);
   const observe=()=>readBinding({provider,expected,current,wait});
   const first=await observe();await wait(sdkReader.revalidate(request,proof));current();const second=await observe();if(first.bindingFingerprint!==second.bindingFingerprint)throw fail('MESSAGING_IDENTITY_NOT_CURRENT');current();response(res,200,{identity:second});
  }catch(error){const code=error?.code||error?.message;const known=new Set(['MESSAGING_AUTHENTICATION_REQUIRED','MESSAGING_CURRENT_OWNER_REQUIRED','MESSAGING_CONTACT_CHANGED','MESSAGING_IDENTITY_NOT_CURRENT','MESSAGING_IDENTITY_REQUEST_NOT_ADMITTED']);response(res,known.has(code)?code==='MESSAGING_IDENTITY_REQUEST_NOT_ADMITTED'?400:code==='MESSAGING_AUTHENTICATION_REQUIRED'?401:409:503,{error:known.has(code)?code:'MESSAGING_IDENTITY_UNAVAILABLE'});
  }finally{clearTimeout(timer);request.off('aborted',abort);res.off('close',close);}
  return true;
 };
}

/** Shared original Core self-binding read. Provider must come from an opaque
 * SDK request proof; this function grants neither signing nor conversation ACLs. */
export function createCurrentMessagingBindingReader(core){
 // A routing hint is NOT an authorization or a cached proof. Every invocation
 // re-runs all three original Core reads. Only an exact match of the freshly
 // resolved account and primary contact may consume parallel read results.
 let hint;
 return async options=>{
  const providerKey=JSON.stringify(options.provider);
  const candidate=hint?.providerKey===providerKey&&(options.expected===undefined||options.expected===hint.account.account_id)?hint.account:null;
  return readCurrentMessagingBindingWithHint({...options,core},candidate,account=>{hint={providerKey,account:Object.freeze({account_id:account.account_id,primary_contact:account.primary_contact,primary_contact_type:account.primary_contact_type})};});
 };
}
export async function readCurrentMessagingBinding(options){return readCurrentMessagingBindingWithHint(options);}
async function readCurrentMessagingBindingWithHint({core,provider,expected,current,wait},hint,remember){
    current();
    const readChecks=account=>Promise.all([
     core.getNativeCurrentAccountContactRevision(account.account_id,account.primary_contact,account.primary_contact_type),
     core.getNativeCurrentAccountEmailVerification(account.account_id,provider.issuer),
    ]);
    // Never expose speculative results. Catch the speculative promise even if
    // the provider lookup rejects, so revoked/changed bindings cannot leak or
    // leave an unhandled rejection. No write/signing operation occurs here.
    const parallel=hint?readChecks(hint).then(value=>({value}),()=>({failed:true})):null;
    const bundle=await wait(core.lookupNativeIdentityThroughOriginalCore(provider.providerKey,provider.providerSubject,provider));current();const account=bundle?.account;
    if(!account||account.status!=='active'||!bounded(account.account_id)||account.account_id.length>200||expected!==undefined&&account.account_id!==expected)throw fail('MESSAGING_CURRENT_OWNER_REQUIRED');
    const identity=bundle.nostrIdentity;if(identity&&identity.account_id!==account.account_id)throw fail('MESSAGING_CURRENT_OWNER_REQUIRED');
    const sameHint=hint&&['account_id','primary_contact','primary_contact_type'].every(key=>account[key]===hint[key]);
    const speculative=sameHint?await wait(parallel):null;
    const [contactRevision,verification]=speculative?.value??await wait(readChecks(account));current();if(!bounded(contactRevision))throw fail('MESSAGING_CONTACT_CHANGED');
    const emailVerificationRequired=!verification||String(verification.contact_revision)!==contactRevision;
    const pubkey=identity?.pubkey_hex;if(pubkey!==null&&pubkey!==undefined&&!/^[a-f0-9]{64}$/.test(pubkey))throw fail('MESSAGING_IDENTITY_UNAVAILABLE');
    const verified=Boolean(pubkey&&identity.access_enabled===true&&identity.signer_status==='verified'&&identity.issuance_status!=='revoked');
    const fingerprint=createHash('sha256').update(JSON.stringify([provider,account.account_id,account.status,contactRevision,emailVerificationRequired,pubkey??null,identity?.access_enabled??false,identity?.signer_status??null,identity?.issuance_status??null,identity?.linked_at??null])).digest('hex');
    remember?.(account);
    return Object.freeze({accountId:account.account_id,pubkey:pubkey??null,publicBindingVerified:verified,emailVerificationRequired,bindingFingerprint:fingerprint,signerAvailable:false,canCreateIdentity:false,capabilities:[]});
}
