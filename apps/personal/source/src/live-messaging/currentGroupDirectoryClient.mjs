import {groupStorageFormat} from './groupStorageFormat.mjs';
const endpoint='/api/crays/personal/messaging/groups';
const hex=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const fail=()=>Error('This group is unavailable');
/** Same-origin original SDK/Core owner directory, never an MLS-membership proof.
 * Opening the conversation still requires the actual account's durable MLS state.
 */
export function createCurrentGroupDirectoryClient({identity,isCurrent,signal,fetcher=globalThis.fetch}){
 if(!identity?.accountId||!hex(identity.pubkey)||!hex(identity.bindingFingerprint)||identity.publicBindingVerified!==true||identity.emailVerificationRequired!==false||typeof isCurrent!=='function'||!signal?.addEventListener||typeof fetcher!=='function')throw fail();
 const pending=new Set(),listeners=new Set();const closedSnapshot=Object.freeze({state:'closed',groups:Object.freeze([])});let closed=false,revision=0,refreshing=null,snapshot=Object.freeze({state:'idle',groups:Object.freeze([])});
 const current=()=>!closed&&!signal.aborted&&isCurrent(identity)===true;
 const emit=next=>{snapshot=Object.freeze(next);for(const fn of listeners)fn();};
 const check=()=>{if(!current())throw fail();};
 const row=value=>{
  check();const storageFormat=groupStorageFormat(value);if(!value||value.ownerAccountId!==identity.accountId||value.ownerPubkey!==identity.pubkey||value.origin!=='creation'||!['routingId','membershipId'].every(k=>hex(value[k]))||!['spot','circle'].includes(value.kind)||!['vifs','spot','circle'].includes(value.parentKind)||typeof value.parentId!=='string'||value.parentId.length>200||typeof value.name!=='string'||!value.name.trim()||value.name.length>80||/[\x00-\x1f\x7f]/.test(value.name)||!Number.isSafeInteger(value.revision)||value.revision<1||!Array.isArray(value.members)||value.members.length<1||value.members.length>40||new Set(value.members).size!==value.members.length||!value.members.every(hex)||!value.members.includes(identity.pubkey)||!/^crays-demo-01a1863a-v1-spot-[0-9]{4}$/.test(value.spotId)||value.relay!=='ws://127.0.0.1:18990/spots/'+value.spotId||value.conversationId!==(value.kind==='circle'?'circle:'+value.groupId:'spot:'+value.spotId+':'+value.groupId))throw fail();
  return Object.freeze(Object.fromEntries(['groupId','routingId','membershipId','conversationId','kind','parentKind','parentId','name','revision','spotId','relay','origin'].map(k=>[k,value[k]]).concat([['schema',value.schema],['storageFormat',storageFormat],['members',Object.freeze([...value.members])]])));
 };
 // Coalesce only overlapping reads, never a completed authorization result.
 // A mutation is an explicit boundary: invalidate reads from before AND during
 // it, including an unknown outcome. No old roster may win a later response.
 function invalidateReads(){revision++;const old=refreshing;refreshing=null;old?.stop.abort();}
 async function request(command,readSignal){
  check();const stop=new AbortController();if(command)invalidateReads();const cancelRead=()=>stop.abort();readSignal?.addEventListener('abort',cancelRead,{once:true});if(readSignal?.aborted)stop.abort();pending.add(stop);const timer=setTimeout(()=>stop.abort(),20000);let reader,cancelReader;
  try{
   const response=await fetcher(endpoint,{method:command?'POST':'GET',headers:{'x-crays-web-account-context':identity.accountId,...(command?{'content-type':'application/json'}:{})},...(command?{body:JSON.stringify(command)}:{}),credentials:'same-origin',cache:'no-store',redirect:'error',signal:stop.signal});
   check();stop.signal.throwIfAborted();if(!response.ok||response.redirected||!response.headers.get('content-type')?.toLowerCase().startsWith('application/json')||!response.body||Number(response.headers.get('content-length')||'0')>1024*1024)throw fail();
   reader=response.body.getReader();cancelReader=()=>{void reader.cancel().catch(()=>{});};stop.signal.addEventListener('abort',cancelReader,{once:true});if(stop.signal.aborted)cancelReader();const chunks=[];let size=0;
   for(;;){stop.signal.throwIfAborted();const part=await reader.read();check();if(part.done)break;size+=part.value.length;if(size>1024*1024)throw fail();chunks.push(part.value);}
   const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}const value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));check();stop.signal.throwIfAborted();if(value?.status!=='ready'||value.bindingFingerprint!==identity.bindingFingerprint)throw fail();return value;
  }finally{if(command)invalidateReads();readSignal?.removeEventListener('abort',cancelRead);clearTimeout(timer);if(cancelReader)stop.signal.removeEventListener('abort',cancelReader);await reader?.cancel().catch(()=>{});reader?.releaseLock();pending.delete(stop);}
 }
 const close=()=>{if(closed)return;closed=true;revision++;for(const controller of pending)controller.abort();signal.removeEventListener('abort',close);emit(closedSnapshot);listeners.clear();};
 signal.addEventListener('abort',close,{once:true});if(signal.aborted)close();
 return Object.freeze({getSnapshot:()=>current()?snapshot:closedSnapshot,subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},
  refresh(){
   check();if(refreshing)return refreshing.work;
   const own=++revision,record={stop:new AbortController(),work:null};refreshing=record;
   record.work=(async()=>{await Promise.resolve();try{
    const value=await request(undefined,record.stop.signal);
    if(own!==revision||!current()||record.stop.signal.aborted)throw fail();
    if(!Array.isArray(value.groups)||value.groups.length>100)throw fail();
    const groups=value.groups.map(row);if(new Set(groups.map(item=>item.conversationId)).size!==groups.length)throw fail();
    emit({state:'ready',groups:Object.freeze(groups)});
   }catch{if(own===revision&&current())emit({state:'unavailable',groups:Object.freeze([])});throw fail();}
   finally{if(refreshing===record)refreshing=null;}})();emit({state:'loading',groups:snapshot.groups});return record.work;
  },
  async register(input){check();const value=await request({...input,action:'register'}),group=row(value.group);if(group.groupId!==input.groupId||group.storageFormat!==groupStorageFormat({schema:Object.hasOwn(input,'storageFormat')?'crays.owner-group-context.v2':'crays.owner-group-context.v1',...input})||group.routingId!==input.routingId||group.name!==input.name||group.spotId!==input.spotId||group.parentKind!==input.parentKind||group.parentId!==input.parentId)throw fail();return group;},
  async sync(input){check();const value=await request({...input,action:'sync'});if(value.group===null){if(input.members.includes(identity.pubkey))throw fail();return null;}if(!input.members.includes(identity.pubkey))throw fail();const group=row(value.group);if(group.conversationId!==input.conversationId||group.revision!==input.revision+1||group.name!==input.name||JSON.stringify([...group.members].sort())!==JSON.stringify([...input.members].sort()))throw fail();return group;},
  async prepareInvitation(input){check();const value=await request({...input,action:'prepare-invitation'}),invite=value.group;if(!invite||invite.conversationId!==input.conversationId||invite.pubkey!==input.pubkey||invite.revision!==input.revision||invite.keyPackageEventId!==undefined&&!hex(invite.keyPackageEventId)||!/^ws:\/\/127\.0\.0\.1:18990\/spots\/crays-demo-01a1863a-v1-spot-[0-9]{4}$/.test(invite.relay))throw fail();return Object.freeze({...invite});},
  async resumeInvitation(input){check();const value=await request({...input,action:'resume-invitation'}),invite=value.group;if(!invite||invite.conversationId!==input.conversationId||invite.pubkey!==input.pubkey||invite.revision!==input.revision||invite.keyPackageEventId!==undefined&&!hex(invite.keyPackageEventId)||!/^ws:\/\/127\.0\.0\.1:18990\/spots\/crays-demo-01a1863a-v1-spot-[0-9]{4}$/.test(invite.relay))throw fail();return Object.freeze({...invite});},close,
 });
}
