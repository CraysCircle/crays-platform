/** Actual group administration port. MLS admin status AND the original parent's
 * separate current manage permission are required. No Spot→VIF/contact grant.
 * Only exact reviewed metadata/removal operations are supported here. */
export async function openPrivateGroupController({binding:input,group,client,journal,authorize,signal,proposals,recovery,newId=()=>crypto.randomUUID()}){
 const binding=Object.freeze({...input});
 if(!['spot','circle'].includes(binding.kind)||!binding.accountId||!binding.conversationId||!binding.pubkey||binding.groupId!==group?.idStr||!journal?.getItem||!journal?.setItem||typeof authorize!=='function'||!signal?.addEventListener||typeof proposals?.rename!=='function'||typeof proposals?.remove!=='function')throw Error('Explicit admitted private group required');
 const lifetime=new AbortController(),listeners=new Set(),reviews=new WeakMap(),attempts=new Map();let closed=false,busy=false,snapshot;
 const current=()=>!closed&&!signal.aborted&&authorize(binding,'read')===true&&group.status==='active'&&!group.closedSignal?.aborted&&group.snapshot.members.includes(binding.pubkey);
 const manager=()=>current()&&group.snapshot.groupData?.adminPubkeys.includes(binding.pubkey)&&authorize(binding,'manage')===true;
 const notify=()=>{const available=current(),view=group.snapshot;snapshot=Object.freeze({available,busy,canManage:Boolean(manager()),canRetry:Boolean(manager()&&recovery),pendingChanges:Object.freeze(available?[...attempts.values()].filter(row=>row.status==='unconfirmed').map(row=>Object.freeze({...row})):[]),name:available?view.groupData?.name||'Group conversation':'',revision:available?group.session.parentToken:null,members:Object.freeze(available?view.members.map(pubkey=>Object.freeze({pubkey,admin:view.groupData?.adminPubkeys.includes(pubkey)===true})):[])});for(const fn of listeners)fn();};
 const close=()=>{if(closed)return;closed=true;lifetime.abort();signal.removeEventListener('abort',close);group.off('changed',changed);group.off('removed',changed);group.off('disposed',close);group.off('destroyed',close);notify();listeners.clear();};
 const changed=()=>{if(!current())close();else notify();};
 const currentOrThrow=()=>{if(!current()){close();throw Error('Private group is no longer available');}};
 const save=()=>journal.setItem('group-changes:'+binding.conversationId,{schema:1,binding,attempts:[...attempts.values()]});
 signal.addEventListener('abort',close,{once:true});group.on('changed',changed);group.on('removed',changed);group.on('disposed',close);group.on('destroyed',close);if(signal.aborted)close();
 try{
  currentOrThrow();const saved=await journal.getItem('group-changes:'+binding.conversationId);currentOrThrow();
  if(saved){if(saved.schema!==1||JSON.stringify(saved.binding)!==JSON.stringify(binding)||!Array.isArray(saved.attempts)||saved.attempts.length>1000)throw Error('Stored group change scope mismatch');for(const row of saved.attempts){if(!row||typeof row.requestId!=='string'||!row.requestId||row.requestId.length>200||!['rename','remove','promote','demote'].includes(row.type)||typeof row.value!=='string'||row.value.length>160||typeof row.expectedParent!=='string'||row.expectedParent.length>1024||!['publishing','sent-to-relay','unconfirmed'].includes(row.status)||attempts.has(row.requestId))throw Error('Stored group change unavailable');attempts.set(row.requestId,{...row,status:row.status==='publishing'?'unconfirmed':row.status});}}
  notify();
 }catch(error){close();throw error;}
 return Object.freeze({getSnapshot:()=>snapshot,subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},
  prepare(change){
   currentOrThrow();if(!manager()||busy)throw Error('Current group manager permission required');
   if(!change||Object.keys(change).sort().join(',')!=='type,value'||!['rename','remove','promote','demote'].includes(change.type)||typeof change.value!=='string')throw Error('Exact group change required');
   const value=change.type==='rename'?change.value.trim():change.value;
   if(change.type==='rename'?(!value||value.length>80||/[\x00-\x1f\x7f]/.test(value)):(!/^[a-f0-9]{64}$/.test(value)||(change.type==='remove'&&value===binding.pubkey)||!group.snapshot.members.includes(value)))throw Error('Group change unavailable');
   if(change.type==='rename'&&value===group.snapshot.groupData?.name)throw Error('This is already the group name');
   const admins=group.snapshot.groupData?.adminPubkeys??[];if(change.type==='promote'&&(typeof proposals.admins!=='function'||admins.includes(value)))throw Error('Role change unavailable');if(change.type==='demote'&&(typeof proposals.admins!=='function'||!admins.includes(value)||admins.filter(key=>group.snapshot.members.includes(key)).length<2))throw Error('Keep at least one active group admin');
   const expectedParent=group.session.parentToken;if(typeof expectedParent!=='string'||!expectedParent||expectedParent.length>1024)throw Error('Current group revision unavailable');
   const previous=[...attempts.values()].find(row=>row.status==='unconfirmed');
   if(previous)throw Error('Check the previous group change before trying again');
   const review=Object.freeze({requestId:newId(),type:change.type,value,expectedParent});if(typeof review.requestId!=='string'||!review.requestId||review.requestId.length>200||attempts.has(review.requestId))throw Error('Group change identity unavailable');reviews.set(review,true);return review;
  },
  async confirm(review){
   currentOrThrow();if(!review||!reviews.has(review))throw Error('Review this exact group change first');const prior=attempts.get(review.requestId);if(prior)return Object.freeze({...prior});
   if([...attempts.values()].some(row=>row.status==='unconfirmed'||row.status==='publishing'))throw Error('Check the previous group change before trying again');
   if(!manager()||busy||group.session.parentToken!==review.expectedParent)throw Error('Group changed; review it again');
   if(attempts.size>=1000)throw Error('Group change window exceeded');
   const entry={...review,status:'publishing'};attempts.set(entry.requestId,entry);busy=true;notify();
   try{
    // Persist the exact attempt before the irreversible commit. A reopened
    // uncertain attempt is never silently regenerated or re-signed.
    await save();currentOrThrow();if(!manager()||group.session.parentToken!==review.expectedParent)throw Error('Group changed; review it again');
    const admins=group.snapshot.groupData?.adminPubkeys??[];const extraProposals=[review.type==='rename'?proposals.rename(review.value):review.type==='remove'?proposals.remove(review.value):proposals.admins(review.type==='promote'?[...admins,review.value]:admins.filter(key=>key!==review.value))];
    const response=await client.groups.commit(group.id,{extraProposals,expectedParent:review.expectedParent,signal:lifetime.signal,proposalRefs:[]});
    entry.status=Object.values(response||{}).some(result=>result.ok===true)?'sent-to-relay':'unconfirmed';await save();return Object.freeze({...entry});
   }catch{if(entry.status!=='sent-to-relay')entry.status='unconfirmed';await save().catch(()=>{});return Object.freeze({...entry});}
   finally{busy=false;notify();}
  },
  async retryOriginal(requestId){
   currentOrThrow();if(!manager()||busy||typeof recovery?.retry!=='function')throw Error('Current group recovery permission required');
   const entry=attempts.get(requestId);if(!entry||entry.status!=='unconfirmed')throw Error('Exact unresolved group change required');busy=true;notify();
   try{await save();currentOrThrow();if(!manager())throw Error('Group management revoked');const result=await recovery.retry(Object.freeze({...entry}),{signal:lifetime.signal});if(result?.status==='sent-to-relay')entry.status='sent-to-relay';await save();return Object.freeze({...entry});}
   catch{await save().catch(()=>{});return Object.freeze({...entry});}finally{busy=false;notify();}
  },
  readAttempt(requestId){currentOrThrow();const row=attempts.get(requestId);return row?Object.freeze({...row}):null;},
  recheck:changed,close,
 });
}
