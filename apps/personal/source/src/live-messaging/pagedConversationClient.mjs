/** Bounded presentation/history window over the original conversation client.
 * The original parent still owns sending, drafts, local-view state and lifetime.
 * queryPage must be its already admitted SDK history port, newest-first, using
 * exact timestamp+ID continuation. No guessed relay, membership or send retry. */
export async function openPagedConversationClient({client,queryPage,decodeRow,isCurrent,signal,pageSize=50,maxVisible=500}){
 if(!client?.getSnapshot||!client.subscribe||typeof queryPage!=='function'||typeof decodeRow!=='function'||typeof isCurrent!=='function'||!Number.isInteger(pageSize)||pageSize<1||pageSize>200||!Number.isInteger(maxVisible)||maxVisible<pageSize||maxVisible>1000)throw Error('Original admitted paged history ports required');
 const coord=row=>({created_at:row.createdAt,id:row.id});
 const compare=(a,b)=>b.created_at-a.created_at||(a.id<b.id?1:a.id>b.id?-1:0);
 const valid=row=>row&&typeof row.id==='string'&&/^[a-f0-9]{64}$/.test(row.id)&&typeof row.author==='string'&&/^[a-f0-9]{64}$/.test(row.author)&&typeof row.text==='string'&&['received','sending','sent-to-relay','unconfirmed'].includes(row.status)&&Number.isSafeInteger(row.createdAt)&&row.createdAt>=0;
 const listeners=new Set();let closed=false,busy=false,problem=null,snapshot,unsubscribe,inFlight,generation=0,pinnedReply=null;
 let state={rows:new Map(),cursor:null,tail:null,started:false,more:true,desired:pageSize,ceiling:null};
 const admitted=()=>!closed&&!signal?.aborted&&isCurrent()===true&&client.getSnapshot().available===true;
 const check=()=>{if(!admitted())throw Error('Paged history is no longer available');};
 function candidates(selected){
  const rows=new Map(selected.rows);
  // Current originals win over history: preserve request IDs, local pending/ACK
  // status and attachment metadata instead of inventing a publication verdict.
  for(const row of client.getSnapshot().messages){if(!valid(row))throw Error('Exact dated conversation originals required');rows.set(row.id,{...rows.get(row.id),...row});}
  return [...rows.values()].filter(row=>!selected.ceiling||compare(coord(row),selected.ceiling)>=0).sort((a,b)=>compare(coord(a),coord(b)));
 }
 function emit(){const base=client.getSnapshot(),available=admitted();let rows=[];if(available)rows=candidates(state);snapshot=Object.freeze({...base,state:closed?'closed':base.state,available,messages:available?rows.slice(0,state.desired).reverse():[],hasEarlierMessages:available&&(rows.length>state.desired||state.more),hasNewerMessages:available&&!!state.ceiling,historyExpanded:available&&(!!state.ceiling||state.desired>pageSize),loadingEarlier:available&&busy,historyWindowLimit:maxVisible,pinnedReply:available?pinnedReply:null,problem:available?(problem||base.problem):null});for(const fn of listeners)fn();}
 async function ensure(next,token){
  const current=()=>{check();if(token!==undefined&&token!==generation)throw Error('History window changed');};
  let pages=0;
  while(true){
   current();const rows=candidates(next),boundary=rows[Math.min(next.desired,rows.length)-1];
   if(next.started&&(!next.more||boundary&&next.tail&&compare(next.tail,coord(boundary))>=0))break;
   if(++pages>40)throw Error('History source did not reach the bounded window');
   const page=await queryPage({cursor:next.cursor,limit:pageSize});current();
   if(!page||!Array.isArray(page.messages)||page.messages.length>pageSize||typeof page.hasMore!=='boolean'||page.hasMore&&(!page.cursor||JSON.stringify(page.cursor)===JSON.stringify(next.cursor)))throw Error('Exact bounded SDK history page required');
   const decoded=page.messages.map(decodeRow);if(decoded.some(row=>!valid(row)||new TextEncoder().encode(JSON.stringify(row)).byteLength>256*1024)||new TextEncoder().encode(JSON.stringify(decoded)).byteLength>2*1024*1024)throw Error('Invalid or oversized SDK conversation page');
   for(let i=0;i<decoded.length;i++){if(i&&compare(coord(decoded[i-1]),coord(decoded[i]))>0)throw Error('Unordered SDK history page');next.rows.set(decoded[i].id,decoded[i]);}
   next.tail=decoded.length?coord(decoded.at(-1)):next.tail;next.started=true;next.cursor=page.cursor;next.more=page.hasMore;
   if(!decoded.length&&next.more)throw Error('Empty SDK history page cannot advance');
   const kept=[...next.rows.values()].filter(row=>!next.ceiling||compare(coord(row),next.ceiling)>=0).sort((a,b)=>compare(coord(a),coord(b))).slice(0,maxVisible+pageSize);next.rows=new Map(kept.map(row=>[row.id,row]));
  }
  current();return next;
 }
 function run(change,replace=false){
  if(inFlight&&!replace)return inFlight;if(replace){generation++;inFlight=null;}try{check();}catch(error){return Promise.reject(error);}
  const token=++generation;busy=true;emit();
  const work=(async()=>{try{const next=change({...state,rows:new Map(state.rows)});const prepared=await ensure(next,token);check();if(token!==generation)throw Error('History window changed');state=prepared;problem=null;}catch(error){if(admitted()&&token===generation)problem='Older messages could not be loaded. Try again.';throw error;}finally{if(token===generation){busy=false;if(!closed)emit();}}})();inFlight=work;void work.finally(()=>{if(inFlight===work)inFlight=null;}).catch(()=>{});return work;
 }
 const close=()=>{if(closed)return;closed=true;unsubscribe?.();signal?.removeEventListener('abort',close);state.rows.clear();pinnedReply=null;emit();listeners.clear();client.close();};
 signal?.addEventListener('abort',close,{once:true});
 try{state=await ensure(state);check();emit();unsubscribe=client.subscribe(emit);}catch(error){signal?.removeEventListener('abort',close);closed=true;throw error;}
 return Object.freeze({
  getSnapshot:()=>snapshot,subscribe(fn){if(closed)return()=>{};listeners.add(fn);return()=>listeners.delete(fn);},
  pinReplyOriginal:id=>{check();const original=snapshot.messages.find(row=>row.id===id&&['received','sent-to-relay'].includes(row.status));if(!original)throw Error('Choose a visible confirmed original');pinnedReply=Object.freeze({...original});emit();},
  clearReplyOriginal:()=>{pinnedReply=null;if(!closed)emit();},
  isPinnedReplyOriginal:id=>admitted()&&pinnedReply?.id===id,
  loadOlder:()=>run(next=>{const rows=candidates(next);if(next.desired>=maxVisible){if(rows.length<pageSize+1)throw Error('No older window available');next.ceiling=coord(rows[pageSize]);}else next.desired=Math.min(maxVisible,next.desired+pageSize);return next;}),
  showLatest:()=>run(()=>({rows:new Map(),cursor:null,tail:null,started:false,more:true,desired:pageSize,ceiling:null}),true),
  async refresh(){check();await client.refresh();check();return run(next=>next);},
  prepareAttempt:(...args)=>{check();return client.prepareAttempt(...args);},acknowledgeAttempt:(...args)=>{check();return client.acknowledgeAttempt(...args);},
  send:value=>{check();if(state.ceiling||busy){generation++;inFlight=null;busy=false;problem=null;state={rows:new Map(),cursor:null,tail:null,started:false,more:true,desired:pageSize,ceiling:null};emit();}return client.send(value);},flushLocalView:()=>client.flushLocalView?.(),close,
 });
}
