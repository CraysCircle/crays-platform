import {createHumanMessagingSessionReader,createCurrentMessagingBindingReader} from './currentIdentity.mjs';
import {createHumanMessagingHttp} from '../humanMessagingHttp.mjs';

const origin='http://localhost:8990',prefix='/api/crays/personal/messaging/';
const failure=()=>Error('Current canonical messaging admission required');
/** Original SDK -> original Core account -> independently admitted conversation.
 * The host supplies its existing configuration and private conversation owner;
 * a fixture world, URL, name or shared relay is never substituted for either.
 * No credentials, key descriptors, Core writes or implicit signer creation.
 */
export function createCanonicalHumanMessagingHttp({Auth0Client,configuration,core,assertRuntimeCurrent,authorizeConversation,groupDirectory,groupRelay,groupBlossom}){
 if(typeof assertRuntimeCurrent!=='function'||typeof authorizeConversation!=='function'||['lookupNativeIdentityThroughOriginalCore','getNativeCurrentAccountContactRevision','getNativeCurrentAccountEmailVerification'].some(k=>typeof core?.[k]!=='function'))throw failure();
 const observeBinding=createCurrentMessagingBindingReader(core);
 const sdk=createHumanMessagingSessionReader({Auth0Client,configuration,assertConfigurationCurrent:assertRuntimeCurrent});
 return async function handle(req,res){
  let url;try{url=new URL(req.url,origin);}catch{return false;}
  if(![prefix+'conversation',prefix+'history',prefix+'send',prefix+'send-file',prefix+'attachment',prefix+'inbox',prefix+'destinations',prefix+'groups',prefix+'group-relay',prefix+'group-blob'].includes(url.pathname))return false;
  const deny=(status,code)=>{if(res.destroyed||res.writableEnded)return;res.writeHead(status,{'content-type':'application/json','cache-control':'private, no-store','vary':'Cookie','x-content-type-options':'nosniff'});res.end(JSON.stringify({status:code}));};
  const h=req.headers;
  if(h.host!=='localhost:8990'||h.authorization!==undefined||h.origin!==undefined&&h.origin!==origin||h['sec-fetch-site']!==undefined&&!['same-origin','none'].includes(h['sec-fetch-site'])||Object.keys(h).some(k=>k==='forwarded'||k.startsWith('x-forwarded-')||k.startsWith('x-crays-')&&k!=='x-crays-web-account-context')){deny(403,'origin_denied');return true;}
  const expected=h['x-crays-web-account-context'];
  if(expected!==undefined&&(typeof expected!=='string'||!/^[^\x00-\x20\x7f]{1,200}$/.test(expected))||h['content-encoding']!==undefined){deny(400,'invalid_request');return true;}
  const stop=new AbortController(),abort=()=>stop.abort(),close=()=>{if(!res.writableEnded)abort();};
  req.once('aborted',abort);res.once('close',close);const timer=setTimeout(abort,20000);timer.unref();
  const cancel=()=>{if(!res.writableEnded)res.destroy();};stop.signal.addEventListener('abort',cancel,{once:true});
  const wait=async promise=>{stop.signal.throwIfAborted();let listener;const cancelled=new Promise((resolve,reject)=>{listener=()=>reject(failure());stop.signal.addEventListener('abort',listener,{once:true});});try{return await Promise.race([promise,cancelled]);}finally{stop.signal.removeEventListener('abort',listener);}};
  const startedAt=performance.now(),timings=[];
  const measured=async(name,work)=>{const at=performance.now();try{return await work;}finally{timings.push({name,ms:Math.round(performance.now()-at)});}};
  const proofs=new WeakMap(),resources=new Set();let requestProof;
  async function readSession(){
   assertRuntimeCurrent();let proof;
   try{proof=requestProof??await wait(sdk.read(req,{signal:stop.signal}));}catch(error){if(error?.code==='MESSAGING_AUTHENTICATION_REQUIRED')return {kind:'signed_out'};throw error;}
   const current=()=>{stop.signal.throwIfAborted();sdk.assertCurrent(req,proof);};
   const provider=sdk.resolveVerifiedProviderBinding(req,proof),observe=()=>measured('core',observeBinding({provider,expected,current,wait}));
   await wait(sdk.revalidate(req,proof));const verified=await observe();
   if(verified.publicBindingVerified!==true||verified.emailVerificationRequired!==false)throw failure();current();
   const identity=Object.freeze({kind:'ready',accountId:verified.accountId,pubkey:verified.pubkey,bindingFingerprint:verified.bindingFingerprint});
   proofs.set(identity,{proof,current,observe,verifiedBinding:verified});return identity;
  }
  async function revalidateSession(identity){
   const state=proofs.get(identity);if(!state)throw failure();state.current();await wait(sdk.revalidate(req,state.proof));const latest=await state.observe();state.current();if(latest.bindingFingerprint!==identity.bindingFingerprint||latest.publicBindingVerified!==true||latest.emailVerificationRequired!==false)throw failure();
  }
  async function resolveConversation(accountId,conversationId,identity){
   if(!proofs.has(identity)||accountId!==identity.accountId)throw failure();
   const state=proofs.get(identity);state.current();const verifiedBinding=state.verifiedBinding;
   if(verifiedBinding.bindingFingerprint!==identity.bindingFingerprint)throw failure();
   const granted=await measured('conversation',wait(authorizeConversation({identity,verifiedBinding,conversationId,signal:stop.signal,operation:[prefix+'send',prefix+'send-file'].includes(url.pathname)?'send':url.pathname===prefix+'attachment'?'attachment':'read'})));
   if(typeof granted?.close==='function')resources.add(granted);
   // The HTTP adapter revalidates this grant immediately on return, before
   // exposing a snapshot or sending. Do not duplicate that same round trip.
   if(!granted||granted.accountId!==accountId||granted.pubkey!==identity.pubkey||granted.conversationId!==conversationId||!['person','spot','circle'].includes(granted.kind)||!/^[a-f0-9]{64}$/.test(granted.groupId)||!/^[a-f0-9]{64}$/.test(granted.membershipId)||typeof granted.isCurrent!=='function'||typeof granted.session?.getSnapshot!=='function'||typeof granted.session?.send!=='function')return null;
   const admitted=()=>!stop.signal.aborted&&granted.isCurrent()===true;
   return {...granted,session:{getSnapshot(){if(!admitted())return {available:false,messages:[]};return granted.session.getSnapshot();},async loadOlder(command){if(!admitted()||typeof granted.session.loadOlder!=='function')throw failure();const value=await granted.session.loadOlder(command);if(!admitted())throw failure();return value;},async loadAttachment(command){if(!admitted()||typeof granted.session.loadAttachment!=='function')throw failure();const data=await granted.session.loadAttachment(command);if(!admitted())throw failure();return data;},async send(command){if(!admitted()||granted.canSend!==true)throw failure();return measured('relay_send',granted.session.send(command));}}};
  }
  try{
   if(url.pathname===prefix+'group-blob'){
    if(url.search||req.method!=='POST'||typeof expected!=='string'||typeof groupBlossom!=='function'){deny(400,'invalid_group_request');return true;}
    try{requestProof=await wait(sdk.read(req,{signal:stop.signal}));}catch(error){if(error?.code==='MESSAGING_AUTHENTICATION_REQUIRED'){deny(401,'sign_in_required');return true;}throw error;}
    if(h['content-type']?.split(';')[0].trim().toLowerCase()!=='application/json'||h['content-length']!==undefined&&(!/^\d{1,7}$/.test(h['content-length'])||Number(h['content-length'])>8*1024*1024)){deny(400,'invalid_group_request');return true;}
    const chunks=[];let bytes=0;for await(const chunk of req){bytes+=chunk.length;if(bytes>8*1024*1024)throw failure();stop.signal.throwIfAborted();chunks.push(chunk);}
    const command=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks))),identity=await readSession();if(identity.kind!=='ready'){deny(401,'sign_in_required');return true;}const state=proofs.get(identity);await revalidateSession(identity);state.current();
    const result=await wait(groupBlossom({binding:state.verifiedBinding,command,signal:stop.signal,isCurrent:()=>{try{state.current();return true;}catch{return false;}}}));await revalidateSession(identity);state.current();
    if(command.action==='get'){if(!(result instanceof Uint8Array)||result.length<17||result.length>5*1024*1024)throw failure();res.writeHead(200,{'content-type':'application/octet-stream','content-length':String(result.length),'cache-control':'private, no-store','vary':'Cookie','x-content-type-options':'nosniff','x-crays-messaging-binding-fingerprint':identity.bindingFingerprint});res.end(result);}else{res.writeHead(200,{'content-type':'application/json','cache-control':'private, no-store','vary':'Cookie','x-content-type-options':'nosniff'});res.end(JSON.stringify({status:'ready',bindingFingerprint:identity.bindingFingerprint,descriptor:result}));}return true;
   }
   if(url.pathname===prefix+'group-relay'){
    if(url.search||req.method!=='POST'||typeof expected!=='string'||typeof groupRelay!=='function'){deny(400,'invalid_group_request');return true;}
    try{requestProof=await wait(sdk.read(req,{signal:stop.signal}));}catch(error){if(error?.code==='MESSAGING_AUTHENTICATION_REQUIRED'){deny(401,'sign_in_required');return true;}throw error;}
    if(h['content-type']?.split(';')[0].trim().toLowerCase()!=='application/json'||h['content-length']!==undefined&&(!/^\d{1,6}$/.test(h['content-length'])||Number(h['content-length'])>768*1024)){deny(400,'invalid_group_request');return true;}
    const chunks=[];let bytes=0;for await(const chunk of req){bytes+=chunk.length;if(bytes>768*1024)throw failure();stop.signal.throwIfAborted();chunks.push(chunk);}
    const command=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks))),identity=await readSession();if(identity.kind!=='ready'){deny(401,'sign_in_required');return true;}const state=proofs.get(identity);await revalidateSession(identity);state.current();
    const result=await wait(groupRelay({binding:state.verifiedBinding,command,signal:stop.signal,isCurrent:()=>{try{state.current();return true;}catch{return false;}}}));await revalidateSession(identity);state.current();
    res.writeHead(200,{'content-type':'application/json','cache-control':'private, no-store','vary':'Cookie','x-content-type-options':'nosniff'});res.end(JSON.stringify({status:'ready',bindingFingerprint:identity.bindingFingerprint,...result}));return true;
   }
   if(url.pathname===prefix+'groups'){
    if(url.search||!['GET','POST'].includes(req.method)||typeof expected!=='string'||!groupDirectory){deny(400,'invalid_group_request');return true;}
    // Read the original SDK before accepting input. Core is observed again
    // after the bounded body, immediately before this owner-only operation.
    try{requestProof=await wait(sdk.read(req,{signal:stop.signal}));}catch(error){if(error?.code==='MESSAGING_AUTHENTICATION_REQUIRED'){deny(401,'sign_in_required');return true;}throw error;}
    let input;
    if(req.method==='POST'){
     if(h['content-type']?.split(';')[0].trim().toLowerCase()!=='application/json'||h['content-length']!==undefined&&(!/^\d{1,5}$/.test(h['content-length'])||Number(h['content-length'])>8192)){deny(400,'invalid_group_request');return true;}
     const chunks=[];let bytes=0;for await(const chunk of req){bytes+=chunk.length;if(bytes>8192)throw failure();stop.signal.throwIfAborted();chunks.push(chunk);}
     input=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks)));
     const fields=input&&typeof input==='object'&&!Array.isArray(input)?Object.keys(input).sort().join(','):'';
     if(!(input?.action==='register'&&fields==='action,groupId,name,parentId,parentKind,routingId,spotId'||input?.action==='prepare-invitation'&&fields==='action,conversationId,pubkey,revision'||input?.action==='sync'&&fields==='action,conversationId,members,name,revision')){deny(400,'invalid_group_request');return true;}
    }
    const identity=await readSession();if(identity.kind!=='ready'){deny(401,'sign_in_required');return true;}const state=proofs.get(identity);await revalidateSession(identity);state.current();
    let result;
    if(req.method==='GET')result={groups:await wait(groupDirectory.list(state.verifiedBinding))};
    else{const {action,...command}=input;result={group:await wait(action==='register'?groupDirectory.register(state.verifiedBinding,command):action==='sync'?groupDirectory.sync(state.verifiedBinding,command):groupDirectory.prepareInvitation(state.verifiedBinding,command))};}
    await revalidateSession(identity);state.current();res.writeHead(200,{'content-type':'application/json','cache-control':'private, no-store','vary':'Cookie','x-content-type-options':'nosniff'});res.end(JSON.stringify({status:'ready',bindingFingerprint:identity.bindingFingerprint,...result}));return true;
   }
   if(url.pathname===prefix+'destinations'){
    if(req.method!=='GET'||url.search||typeof authorizeConversation.readDestinations!=='function'){deny(400,'invalid_destinations_request');return true;}
    const identity=await readSession();if(identity.kind!=='ready'){deny(401,'sign_in_required');return true;}const state=proofs.get(identity),verifiedBinding=state.verifiedBinding;
    if(verifiedBinding.bindingFingerprint!==identity.bindingFingerprint)throw failure();
    const destinations=await wait(authorizeConversation.readDestinations({identity,verifiedBinding,signal:stop.signal}));await revalidateSession(identity);
    if(!destinations){deny(403,'destinations_unavailable');return true;}state.current();res.writeHead(200,{'content-type':'application/json','cache-control':'private, no-store','vary':'Cookie','x-content-type-options':'nosniff'});res.end(JSON.stringify({status:'ready',destinations}));return true;
   }
   if(url.pathname===prefix+'inbox'){
    const parts=[...url.searchParams];if(req.method!=='GET'||parts.length!==1||parts[0][0]!=='cursor'||!/^(0|[1-9]\d{0,2})$/.test(parts[0][1])||Number(parts[0][1])%60!==0||typeof authorizeConversation.readInbox!=='function'){deny(400,'invalid_inbox_request');return true;}
    const identity=await readSession();if(identity.kind!=='ready'){deny(401,'sign_in_required');return true;}const state=proofs.get(identity),verifiedBinding=state.verifiedBinding;
    if(verifiedBinding.bindingFingerprint!==identity.bindingFingerprint)throw failure();
    const inbox=await wait(authorizeConversation.readInbox({identity,verifiedBinding,cursor:Number(parts[0][1]),signal:stop.signal}));await revalidateSession(identity);
    if(!inbox){deny(403,'inbox_unavailable');return true;}state.current();res.writeHead(200,{'content-type':'application/json','cache-control':'private, no-store','vary':'Cookie','x-content-type-options':'nosniff'});res.end(JSON.stringify({status:'ready',inbox}));return true;
   }
   // Authenticate the original SDK before accepting a potentially large body;
   // readSession resolves fresh Core state AFTER that body, not before a wait.
   try{requestProof=await wait(sdk.read(req,{signal:stop.signal}));}catch(error){if(error?.code==='MESSAGING_AUTHENTICATION_REQUIRED'){deny(401,'sign_in_required');return true;}throw error;}
   return await createHumanMessagingHttp({origin,readSession,resolveConversation,revalidateSession})(req,res);
  }
  catch{deny(503,'conversation_temporarily_unavailable');return true;}
  finally{console.info('crays.messaging.timing '+JSON.stringify({route:url.pathname,ms:Math.round(performance.now()-startedAt),stages:timings}));for(const resource of resources){try{resource.close();}catch{}}clearTimeout(timer);req.off('aborted',abort);res.off('close',close);stop.signal.removeEventListener('abort',cancel);}
 };
}
