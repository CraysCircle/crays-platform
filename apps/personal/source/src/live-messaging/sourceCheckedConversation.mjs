/** Current SDK source is authoritative over cached bubbles and reply pins.
 * The parent supplies its admitted fenced history; this wrapper grants no
 * identity/membership and never changes or republishes retained send receipts.
 */
export async function openSourceCheckedConversation({client,history,sourceFor,isCurrent,signal}) {
 if (!client?.getSnapshot || !client?.subscribe || !history?.queryRumors || !history?.on || !history?.off || typeof sourceFor !== 'function' || typeof isCurrent !== 'function' || !signal?.addEventListener) throw Error('Admitted current SDK projection required');
 const listeners = new Set();
 let closed=false, generation=0, work=Promise.resolve(), unsubscribe;
 let snapshot=Object.freeze({...client.getSnapshot(),available:false,messages:Object.freeze([]),pinnedReply:null});
 const current=()=>{try{return !closed&&!signal.aborted&&isCurrent()===true;}catch{return false;}};
 const check=()=>{if(!current())throw Error('Conversation source is unavailable');};
 const emit=value=>{snapshot=Object.freeze(value);for(const listener of listeners)listener();};
 const conceal=()=>emit({...snapshot,available:false,messages:Object.freeze([]),pinnedReply:null});
 async function project(token) {
  check(); const base=client.getSnapshot();
  if(!base.available){if(token===generation)emit({...base,messages:Object.freeze([]),pinnedReply:null});return;}
  const candidates=[...base.messages,...(base.pinnedReply?[base.pinnedReply]:[])];
  if(candidates.length>1001)throw Error('Bounded conversation source window required');
  const ids=[...new Set(candidates.map(row=>row.id).filter(id=>typeof id==='string'&&/^[a-f0-9]{64}$/.test(id)))],verified=new Map();
  for(let offset=0;offset<ids.length;offset+=100){
   check();if(token!==generation)return;
   const batch=ids.slice(offset,offset+100),before=new Map();
   for(const id of batch){const source=await sourceFor(id);check();if(source)before.set(id,JSON.stringify(source));}
   const originals=await history.queryRumors({ids:batch,kinds:[9],limit:100});check();
   if(!Array.isArray(originals)||originals.length>100)throw Error('Bounded SDK originals required');
   for(const original of originals){
    if(!batch.includes(original.id)||!before.has(original.id)||original.kind!==9)continue;
    const after=await sourceFor(original.id);check();
    if(after&&JSON.stringify(after)===before.get(original.id))verified.set(original.id,original);
   }
  }
  check();if(token!==generation)return;
  const matches=row=>{const original=verified.get(row.id);return !!original&&original.content===row.text&&original.pubkey===row.author&&(row.createdAt===undefined||row.createdAt===original.created_at);};
  emit({...base,messages:Object.freeze(base.messages.filter(matches)),pinnedReply:base.pinnedReply&&matches(base.pinnedReply)?base.pinnedReply:null});
 }
 function refreshProjection({withdraw=false}={}) {
  if(closed)return Promise.resolve();
  const token=++generation;
  if(withdraw)conceal();
  const next=work.catch(()=>{}).then(()=>project(token));work=next;
  void next.catch(()=>{if(current()&&token===generation)emit({...snapshot,available:false,messages:Object.freeze([]),pinnedReply:null,problem:'Message history could not be verified. Try again.'});});
  return next;
 }
 const changed=()=>{void refreshProjection().catch(()=>{});};
 const withdrawn=()=>{void refreshProjection({withdraw:true}).catch(()=>{});};
 function close(){
  if(closed)return;closed=true;generation++;signal.removeEventListener('abort',close);unsubscribe?.();
  history.off('rumor',changed);history.off('removed',withdrawn);history.off('cleared',withdrawn);
  emit({...snapshot,state:'closed',available:false,messages:Object.freeze([]),pinnedReply:null});listeners.clear();client.close();
 }
 signal.addEventListener('abort',close,{once:true});
 history.on('rumor',changed);history.on('removed',withdrawn);history.on('cleared',withdrawn);unsubscribe=client.subscribe(changed);
 try{await refreshProjection();check();}catch(error){close();throw error;}
 const invoke=async(method,...args)=>{check();const result=await client[method](...args);check();await refreshProjection();check();return result;};
 return Object.freeze({
  ...(client.localView?{localView:client.localView}:{}),
  getSnapshot(){if(!current())close();return snapshot;},
  subscribe(listener){if(closed)return()=>{};listeners.add(listener);return()=>listeners.delete(listener);},
  refresh:()=>invoke('refresh'),
  prepareAttempt:(...args)=>invoke('prepareAttempt',...args),
  acknowledgeAttempt:(...args)=>invoke('acknowledgeAttempt',...args),
  send:(...args)=>invoke('send',...args),
  ...(client.loadOlder?{loadOlder:()=>invoke('loadOlder')}:{}),
  ...(client.showLatest?{showLatest:()=>invoke('showLatest')}:{}),
  ...(client.flushLocalView?{flushLocalView:()=>client.flushLocalView()}:{}),
  ...(client.pinReplyOriginal?{pinReplyOriginal(id){check();if(!snapshot.messages.some(row=>row.id===id))throw Error('Choose a current visible original');client.pinReplyOriginal(id);changed();}}:{}),
  ...(client.clearReplyOriginal?{clearReplyOriginal(){check();client.clearReplyOriginal();changed();}}:{}),
  isPinnedReplyOriginal:id=>current()&&snapshot.pinnedReply?.id===id,
  close,
 });
}
