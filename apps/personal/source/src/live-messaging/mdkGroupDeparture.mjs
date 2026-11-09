import {originalMdkFormat,validBoundGroupId} from './groupStorageFormat.mjs';
const fields=['kind','accountId','conversationId','groupId','membershipId','pubkey','storageFormat'];
const hex=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const failure=()=>Error('Leaving this group could not be confirmed');
const keyOf=row=>{const bytes=row?.id;if(!Array.isArray(bytes)||bytes.length!==32||bytes.some(v=>!Number.isInteger(v)||v<0||v>255))throw failure();return bytes.map(v=>v.toString(16).padStart(2,'0')).join('');};
/** Self-only departure through the original runtime. The parent supplies a
 * distinct leave permission; being a member is not a manage grant. Original
 * SelfRemove publication/convergence/maintenance determines when access ends.
 * A queued proposal or relay ACK alone NEVER becomes a successful departure.
 */
export async function openMdkGroupDeparture({binding:input,runtime,journal,getAdmission,authorize,signal,onLeft=async()=>{},newId=()=>crypto.randomUUID()}){
 const binding=Object.freeze({...input}),listeners=new Set(),reviews=new WeakSet();
 if(binding.storageFormat!==originalMdkFormat||!validBoundGroupId(binding)||runtime?.storageFormat!==originalMdkFormat||runtime.accountPubkey!==binding.pubkey||!signal?.addEventListener||[getAdmission,authorize,onLeft].some(fn=>typeof fn!=='function')||['getItem','setItem','exclusive'].some(k=>typeof journal?.[k]!=='function'))throw failure();
 let closed=false,busy=false,summary=null,attempt=null,snapshot,unsubscribe,refreshing,observing,confirming;
 const address='device-departure:'+binding.groupId;
 const current=action=>{try{const grant=getAdmission();return !closed&&!signal.aborted&&fields.every(k=>grant?.[k]===binding[k])&&authorize(binding,action)===true;}catch{return false;}};
 const check=()=>{if(!current('read'))throw failure();};
 const active=()=>current('read')&&summary&&!summary.terminal&&!summary.removed&&!summary.unrecoverable&&summary.members.includes(binding.pubkey);
 const handover=()=>active()&&summary.admins.includes(binding.pubkey)&&summary.admins.length<2;
 const publicRow=()=>attempt?Object.freeze({requestId:attempt.requestId,expectedParent:attempt.expectedParent,status:attempt.status}):null;
 const notify=()=>{snapshot=Object.freeze({available:!!active(),canLeave:!!(active()&&current('leave')&&!handover()&&!attempt&&!busy),requiresAdminHandover:!!handover(),busy,status:attempt?.status??'idle',requestId:attempt?.requestId??null});for(const fn of listeners)try{fn();}catch{}};
 function close(){if(closed)return;closed=true;signal.removeEventListener('abort',close);unsubscribe?.();summary=null;notify();listeners.clear();}
 signal.addEventListener('abort',close,{once:true});
 const save=async()=>{check();await journal.setItem(address,{schema:'crays.original-mdk-departure.v1',binding,attempt});check();};
 async function refresh(){if(refreshing)return refreshing;check();const work=(async()=>{const raw=await runtime.summary(binding.groupId);check();if(raw?.groupId!==binding.groupId||!Array.isArray(raw.members)||raw.members.length>40||!Array.isArray(raw.admins)||raw.admins.some(v=>!hex(v))||typeof raw.terminal!=='boolean'||typeof raw.removed!=='boolean'||typeof raw.unrecoverable!=='boolean')throw failure();const members=raw.members.map(keyOf);if(new Set(members).size!==members.length||raw.admins.some(key=>!members.includes(key)))throw failure();summary={...raw,members};if(!raw.terminal&&(!raw.epochPin||JSON.stringify(raw.epochPin).length>1024))throw failure();notify();})();refreshing=work;try{await work;}finally{if(refreshing===work)refreshing=null;}}
 async function observeLeft(alreadyLocked=false){
  if(observing)return observing;
  const work=async()=>{await refresh();check();
   if(attempt&&summary.terminal&&summary.removed&&attempt.status!=='left'){
    const stored=await journal.getItem(address);check();
    if(!stored||stored.schema!=='crays.original-mdk-departure.v1'||JSON.stringify(stored.binding)!==JSON.stringify(binding)||JSON.stringify({...stored.attempt,status:stored.attempt.status==='publishing'?'unconfirmed':stored.attempt.status})!==JSON.stringify(attempt))throw failure();
    // Original terminal removal is necessary; no ACK or optimistic state suffices.
    // Keep recovery pending until the independent canonical callback succeeds.
    attempt.status='unconfirmed';await save();
    await onLeft(Object.freeze({groupId:binding.groupId,requestId:attempt.requestId}));check();
    attempt.status='left';try{await save();}catch(error){attempt.status='unconfirmed';throw error;}notify();
   }return publicRow();
  };
  const task=alreadyLocked?work():journal.exclusive('device-group-management',work);observing=task;
  try{return await task;}finally{if(observing===task)observing=null;}
 }
 async function confirmReviewed(review){check();if(!reviews.has(review))throw failure();if(attempt){if(attempt.requestId!==review.requestId)throw failure();return publicRow();}if(busy||!active()||!current('leave')||handover())throw failure();busy=true;notify();try{return await journal.exclusive('device-group-management',async()=>{
   await refresh();check();if(!active()||!current('leave')||handover()||JSON.stringify(summary.epochPin)!==review.expectedParent||summary.queuedIntents||summary.pendingFanouts||summary.pendingConvergence||await journal.getItem(address))throw failure();check();attempt={...review,status:'publishing',wireIds:[]};await save();
   try{await runtime.manage(binding.groupId,JSON.parse(review.expectedParent),{action:'leave'},{beforePublication:async metadata=>{check();if(metadata.kind!=='group'||metadata.groupId!==binding.groupId||!hex(metadata.transportId))throw failure();if(!attempt.wireIds.includes(metadata.transportId)){if(attempt.wireIds.length>=20)throw failure();attempt.wireIds.push(metadata.transportId);await save();}}});}catch{/* Unknown outcome: original runtime retains its frozen intent. */}
   if(attempt.status!=='left'){attempt.status='unconfirmed';await save();}return await observeLeft(true);
  });}finally{busy=false;notify();}}
 try{
  check();await refresh();const stored=await journal.getItem(address);check();if(stored){const row=stored.attempt;if(stored.schema!=='crays.original-mdk-departure.v1'||JSON.stringify(stored.binding)!==JSON.stringify(binding)||!row||typeof row.requestId!=='string'||!/^[a-zA-Z0-9:_-]{1,200}$/.test(row.requestId)||typeof row.expectedParent!=='string'||row.expectedParent.length>1024||!['publishing','unconfirmed','left'].includes(row.status)||!Array.isArray(row.wireIds)||row.wireIds.length>20||row.wireIds.some(v=>!hex(v)))throw failure();attempt={...row,status:row.status==='publishing'?'unconfirmed':row.status};}if(!active()&&!attempt)throw failure();await observeLeft().catch(()=>{check();});notify();
  unsubscribe=runtime.subscribeTimeline(change=>{if(change?.kind==='closed'||!current('read'))close();else if(change?.kind!=='append'&&!busy)void observeLeft().catch(()=>{summary=null;notify();});});
 }catch(error){close();throw error;}
 return Object.freeze({getSnapshot(){if(!current('read'))close();return snapshot;},subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},
  prepare(){check();if(!active()||!current('leave')||handover()||busy||attempt||summary.queuedIntents||summary.pendingFanouts||summary.pendingConvergence)throw failure();const review=Object.freeze({requestId:newId(),expectedParent:JSON.stringify(summary.epochPin)});if(!/^[a-zA-Z0-9:_-]{1,200}$/.test(review.requestId))throw failure();reviews.add(review);return review;},
  confirm(review){if(confirming)return confirmReviewed(review);const task=confirmReviewed(review);confirming=task;return task.finally(()=>{if(confirming===task)confirming=null;});},
  async settled(){await confirming?.catch(()=>{});if(current('read'))await observeLeft();},
  recheck(){if(!current('read'))close();else if(!busy)void observeLeft().catch(()=>{summary=null;notify();});},close,
 });
}
