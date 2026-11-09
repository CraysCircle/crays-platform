import {verifyEvent} from 'nostr-tools/pure';
const path='/api/crays/personal/messaging/spot-relay';
const failure=()=>Error('This Spot conversation is unavailable');
const hex=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const copy=value=>JSON.parse(JSON.stringify(value));
/** Same-origin product data port. No fixture snapshot, URL-selected identity,
 * auto VIF creation, new keys or silent resend after an unknown write outcome.
 * Parent supplies the current original verified identity and encrypted journal.
 */
export function createCurrentSpotRelayClient({identity:input,spotId,rootId,isCurrent,signal,journal,fetcher=globalThis.fetch}){
 const identity=Object.freeze({accountId:input?.accountId,pubkey:input?.pubkey,bindingFingerprint:input?.bindingFingerprint});
 if(!identity.accountId||!hex(identity.pubkey)||!hex(identity.bindingFingerprint)||input.publicBindingVerified!==true||input.emailVerificationRequired!==false||typeof spotId!=='string'||!spotId||spotId.length>200||!hex(rootId)||typeof isCurrent!=='function'||!signal?.addEventListener||typeof fetcher!=='function'||['getItem','setItem','exclusive'].some(k=>typeof journal?.[k]!=='function'))throw failure();
 let closed=false,reading=0,writeBusy=false,state=Object.freeze({state:'idle',root:null,messages:[],receipt:null,problem:null,hasMore:null,loadingOlder:false,historyProblem:null,historyComplete:false,relay:null,ownPubkey:identity.pubkey});const listeners=new Set(),life=new AbortController();
 const current=()=>!closed&&!signal.aborted&&isCurrent(identity)===true;
 const check=()=>{if(!current())throw failure();};
 const emit=value=>{if(!current())return;state=Object.freeze({...state,...value});for(const listener of listeners)listener();};
 const close=()=>{if(closed)return;closed=true;life.abort();signal.removeEventListener('abort',close);state=Object.freeze({state:'closed',root:null,messages:[],receipt:null,problem:null,hasMore:null,loadingOlder:false,historyProblem:null,historyComplete:false,relay:null});listeners.clear();};check();signal.addEventListener('abort',close,{once:true});
 async function request(command){
  check();const response=await fetcher(path,{method:'POST',credentials:'same-origin',redirect:'error',headers:{'content-type':'application/json','x-crays-web-account-context':identity.accountId},body:JSON.stringify({...command,spotId}),cache:'no-store',signal:AbortSignal.any([life.signal,AbortSignal.timeout(8000)])});check();
  if(!response.ok||response.redirected||!response.headers.get('content-type')?.toLowerCase().startsWith('application/json')||!response.body)throw failure();
  const reader=response.body.getReader(),decoder=new TextDecoder('utf-8',{fatal:true});let text='',size=0;
  try{for(;;){const chunk=await reader.read();check();if(chunk.done)break;size+=chunk.value.byteLength;if(size>8*1024*1024)throw failure();text+=decoder.decode(chunk.value,{stream:true});}text+=decoder.decode();}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
  const body=JSON.parse(text);check();if(body?.status!=='ready'||body.bindingFingerprint!==identity.bindingFingerprint||!body.result)throw failure();return body.result;
 }
 const event=value=>{try{const e=copy(value);if(e.kind!==1||!Number.isSafeInteger(e.created_at)||e.created_at<0||!hex(e.id)||!hex(e.pubkey)||typeof e.content!=='string'||e.content.length>65536||!Array.isArray(e.tags)||e.tags.length>256||!verifyEvent(e))throw failure();return Object.freeze({...e,tags:Object.freeze(e.tags.map(t=>Object.freeze(t)))});}catch{throw failure();}};
 const key=requestId=>'spot-relay-reply:http-'+requestId;
 const validateId=id=>{if(typeof id!=='string'||id.startsWith('_')||!/^[a-zA-Z0-9:_-]{1,120}$/.test(id))throw failure();};
 const receipt=(value,id)=>{if(value.requestId!==id||value.rootId!==rootId||!(value.status==='prepared'?value.eventId===null:hex(value.eventId))||!['prepared','unconfirmed','not-accepted','sent-to-relay'].includes(value.status)||typeof value.relay!=='string')throw failure();return Object.freeze(copy(value));};
 const record=value=>{if(value?.schema!==1||value.accountId!==identity.accountId||value.pubkey!==identity.pubkey||value.bindingFingerprint!==identity.bindingFingerprint||value.spotId!==spotId||value.rootId!==rootId||value.command?.action!=='reply'||value.command.rootId!==rootId||value.command.approved!==true||!hex(value.command.replyTo)||typeof value.command.text!=='string'||!value.command.text.trim()||new TextEncoder().encode(value.command.text).length>8000)throw failure();validateId(value.command.requestId);if(value.receipt)receipt(value.receipt,value.command.requestId);return value;};
 const ordered=events=>Object.freeze([...new Map(events.map(e=>[e.id,e])).values()].sort((a,b)=>a.created_at-b.created_at||a.id.localeCompare(b.id)));
 function page(result,limit,until){
  const original=event(result.root);
  if(original.id!==rootId||original.tags.some(t=>t[0]==='e'&&t[3]==='root')||!original.tags.some(t=>t[0]==='t'&&t[1]===spotId)||!Array.isArray(result.messages)||result.messages.length>limit||typeof result.relay!=='string'||!result.relay||state.relay!==null&&state.relay!==result.relay||result.hasMore!==undefined&&typeof result.hasMore!=='boolean')throw failure();
  const seen=new Set(),messages=result.messages.map(event);
  for(const e of messages){const roots=e.tags.filter(t=>t[0]==='e'&&t[3]==='root');if(roots.length!==1||roots[0][1]!==rootId||roots[0][2]!==result.relay||seen.has(e.id)||until!==undefined&&e.created_at>until)throw failure();seen.add(e.id);}
  return {root:original,messages:ordered(messages),relay:result.relay,hasMore:result.hasMore??null};
 }
 // Drafts share the original encrypted, account-and-thread-scoped journal.
 // Reads are explicit writer intent; public load() never unlocks this store.
 const draftKey=key('_draft');
 const draft=value=>{
  if(value===undefined||value===null)return {revision:null,text:''};
  if(value.schema!=='crays.spot-draft.v1'||value.accountId!==identity.accountId||value.pubkey!==identity.pubkey||value.bindingFingerprint!==identity.bindingFingerprint||value.spotId!==spotId||value.rootId!==rootId||typeof value.revision!=='string'||!/^[a-f0-9-]{36}$/.test(value.revision)||typeof value.text!=='string'||new TextEncoder().encode(value.text).length>8000)throw failure();
  return {revision:value.revision,text:value.text};
 };
 async function readDraft(){check();const value=await journal.getItem(draftKey);check();return Object.freeze(draft(value));}
 async function saveDraft({text,expectedRevision}){
  check();if(typeof text!=='string'||new TextEncoder().encode(text).length>8000||!(expectedRevision===null||typeof expectedRevision==='string'&&/^[a-f0-9-]{36}$/.test(expectedRevision)))throw failure();
  return journal.exclusive(draftKey,async()=>{
   check();const previous=draft(await journal.getItem(draftKey));check();
   if(previous.revision!==expectedRevision)return Object.freeze({status:'conflict',...previous});
   const revision=crypto.randomUUID();
   await journal.setItem(draftKey,{schema:'crays.spot-draft.v1',...identity,spotId,rootId,revision,text});check();
   return Object.freeze({status:'saved',revision,text});
  });
 }
 return Object.freeze({
  readDraft,saveDraft,
  getSnapshot(){if(!current()){close();}return state;},
  subscribe(listener){check();if(typeof listener!=='function')throw failure();listeners.add(listener);return()=>listeners.delete(listener);},
  async load(){
   check();if(state.loadingOlder)throw failure();const generation=++reading;emit({state:state.root?'refreshing':'loading',problem:null});
   try{const result=page(await request({action:'read',rootId,limit:100}),100);check();if(generation!==reading)return;
    const overlap=new Set(result.messages.map(e=>e.id)),retained=state.messages.some(e=>overlap.has(e.id))&&(state.messages.length>result.messages.length||state.messages[0].created_at<=result.messages[0].created_at);
    emit({state:'ready',root:result.root,relay:result.relay,messages:retained?ordered([...state.messages,...result.messages]):result.messages,hasMore:retained?state.hasMore:result.hasMore,historyProblem:retained?state.historyProblem:null,problem:null});
   }catch(error){if(current()&&generation===reading)emit({state:state.root?'ready':'unavailable',problem:'read-unavailable'});throw error;}
  },
  async loadOlder(){
   check();if(state.state!=='ready'||state.loadingOlder||!state.messages.length||state.hasMore===false)throw failure();
   const generation=++reading,until=state.messages[0].created_at;emit({loadingOlder:true,historyProblem:null});
   try{const result=page(await request({action:'read',rootId,limit:200,until}),200,until);check();if(generation!==reading)return;
    const seen=new Set(state.messages.map(e=>e.id)),fresh=result.messages.filter(e=>!seen.has(e.id));
    // Inclusive timestamp overlap is essential. Never subtract one second to
    // hide a saturated boundary, which would silently skip unseen originals.
    const saturated=result.hasMore!==false&&!fresh.length;
    emit({messages:ordered([...state.messages,...fresh]),hasMore:result.hasMore,historyProblem:saturated?'boundary-saturated':null});
   }catch(error){if(current()&&generation===reading)emit({historyProblem:'read-unavailable'});throw error;}
   finally{if(current()&&generation===reading)emit({loadingOlder:false});}
  },
  async readPending(){check();const saved=await journal.getItem(key('_pending'));check();if(saved===undefined||saved===null)return null;const value=record(saved);validateId(value.command.requestId);return Object.freeze({requestId:value.command.requestId,text:value.command.text,replyTo:value.command.replyTo,receipt:value.receipt??null});},
  async send({requestId,text,replyTo=rootId,approved=false}){
   check();validateId(requestId);if(writeBusy||approved!==true||typeof text!=='string'||!text.trim()||new TextEncoder().encode(text).length>8000||!hex(replyTo))throw failure();writeBusy=true;
   try{return await journal.exclusive(key(requestId),async()=>{check();let saved=await journal.getItem(key(requestId));check();if(saved){saved=record(saved);if(saved.command.text!==text||saved.command.replyTo!==replyTo)throw failure();emit({receipt:saved.receipt??null,problem:saved.receipt?null:'write-unconfirmed'});return saved.receipt??{requestId,status:'unconfirmed'};}
    const command={action:'reply',rootId,replyTo,requestId,text,approved:true};saved={schema:1,...identity,spotId,rootId,command,receipt:null};await journal.setItem(key(requestId),saved);check();await journal.setItem(key('_pending'),saved);check();
    try{const received=receipt(await request(command),requestId);await journal.setItem(key(requestId),{...saved,receipt:received});check();await journal.setItem(key('_pending'),{...saved,receipt:received});check();emit({receipt:received,problem:received.status==='unconfirmed'?'write-unconfirmed':null});return received;}catch(error){if(current())emit({problem:'write-unconfirmed'});throw error;}
   });}finally{writeBusy=false;}
  },
  async retryOriginal(requestId,{approved=false}={}){check();validateId(requestId);if(approved!==true||writeBusy)throw failure();writeBusy=true;try{return await journal.exclusive(key(requestId),async()=>{check();const saved=record(await journal.getItem(key(requestId)));check();const received=receipt(await request(saved.command),requestId);await journal.setItem(key(requestId),{...saved,receipt:received});check();const pending=await journal.getItem(key('_pending'));check();if(pending?.command?.requestId===requestId){await journal.setItem(key('_pending'),{...saved,receipt:received});check();}emit({receipt:received,problem:received.status==='unconfirmed'?'write-unconfirmed':null});return received;});}finally{writeBusy=false;}},
  async recover(requestId,{republish=false}={}){check();validateId(requestId);if(typeof republish!=='boolean')throw failure();return journal.exclusive(key(requestId),async()=>{check();const saved=record(await journal.getItem(key(requestId)));check();const received=receipt(await request({action:'recover',requestId,republish}),requestId);await journal.setItem(key(requestId),{...saved,receipt:received});check();const pending=await journal.getItem(key('_pending'));check();if(pending?.command?.requestId===requestId){await journal.setItem(key('_pending'),{...saved,receipt:received});check();}emit({receipt:received,problem:received.status==='unconfirmed'?'write-unconfirmed':null});return received;});},
  close,
 });
}
