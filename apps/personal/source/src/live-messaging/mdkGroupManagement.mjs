import {originalMdkFormat,validBoundGroupId} from './groupStorageFormat.mjs';
const fields=['kind','accountId','conversationId','groupId','membershipId','pubkey','storageFormat'];
const hex=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const failure=()=>Error('The current group change could not be confirmed');
const keyOf=bytes=>{if(!Array.isArray(bytes)||bytes.length!==32||bytes.some(v=>!Number.isInteger(v)||v<0||v>255))throw failure();return bytes.map(v=>v.toString(16).padStart(2,'0')).join('');};
/** Existing group-info controller interface over normal original MDK runtime.
 * Original MLS admin status and independent parent rights are BOTH mandatory.
 * The exact reviewed attempt and validated wire ID are encrypted before send.
 * Retry reconciles that frozen original; it never creates another MLS commit.
 */
export async function openMdkGroupManagement({binding:input,runtime,journal,getAdmission,authorize,signal,onConfirmed=async()=>{},newId=()=>crypto.randomUUID()}){
 const binding=Object.freeze({...input});
 if(binding.storageFormat!==originalMdkFormat||!validBoundGroupId(binding)||runtime?.storageFormat!==originalMdkFormat||runtime.accountPubkey!==binding.pubkey||!signal?.addEventListener||typeof getAdmission!=='function'||typeof authorize!=='function'||typeof onConfirmed!=='function'||['getItem','setItem','exclusive'].some(k=>typeof journal?.[k]!=='function'))throw failure();
 const listeners=new Set(),reviews=new WeakSet(),attempts=new Map();let closed=false,busy=false,summary=null,snapshot,unsubscribe,refreshing;
 const address='device-management:'+binding.groupId;
 const current=action=>{try{const grant=getAdmission();return !closed&&!signal.aborted&&fields.every(k=>grant?.[k]===binding[k])&&authorize(binding,action)===true;}catch{return false;}};
 const check=()=>{if(!current('read'))throw failure();};
 const active=()=>current('read')&&summary&&!summary.terminal&&!summary.removed&&!summary.unrecoverable&&summary.members.includes(binding.pubkey);
 const manager=()=>active()&&summary.admins.includes(binding.pubkey)&&current('manage');
 const recoverable=row=>row.status==='unconfirmed'&&active()&&current('manage')&&(row.commitConfirmed===true||manager());
 const sameStored=stored=>stored?.schema==='crays.original-mdk-management.v1'&&JSON.stringify(stored.binding)===JSON.stringify(binding)&&Array.isArray(stored.attempts)&&JSON.stringify(stored.attempts.map(validate))===JSON.stringify([...attempts.values()]);
 const blocked=()=>[...attempts.values()].some(row=>row.status!=='sent-to-relay');
 const pin=()=>summary?JSON.stringify(summary.epochPin):null;
 function notify(){snapshot=Object.freeze({available:!!active(),busy,canManage:!!manager(),canRetry:!!(manager()||[...attempts.values()].some(recoverable)),pendingChanges:Object.freeze(active()?[...attempts.values()].filter(r=>r.status!=='sent-to-relay').map(publicRow):[]),name:active()?summary.name:'',revision:active()?pin():null,members:Object.freeze(active()?summary.members.map(pubkey=>Object.freeze({pubkey,admin:summary.admins.includes(pubkey)})):[])});for(const fn of listeners)try{fn();}catch{}}
 const publicRow=row=>Object.freeze({requestId:row.requestId,type:row.type,value:row.value,expectedParent:row.expectedParent,status:row.status});
 function close(){if(closed)return;closed=true;signal.removeEventListener('abort',close);unsubscribe?.();summary=null;notify();listeners.clear();}
 signal.addEventListener('abort',close,{once:true});
 const save=async()=>{check();await journal.setItem(address,{schema:'crays.original-mdk-management.v1',binding,attempts:[...attempts.values()]});check();};
 async function refresh(){
  if(refreshing)return refreshing;check();
  const work=(async()=>{const raw=await runtime.summary(binding.groupId);check();
   if(raw?.groupId!==binding.groupId||typeof raw.name!=='string'||!Array.isArray(raw.members)||raw.members.length>40||!Array.isArray(raw.admins)||raw.admins.some(v=>!hex(v))||typeof raw.removed!=='boolean'||typeof raw.unrecoverable!=='boolean'||typeof raw.terminal!=='boolean')throw failure();
   const members=raw.members.map(row=>keyOf(row.id));if(new Set(members).size!==members.length||new Set(raw.admins).size!==raw.admins.length||raw.admins.some(key=>!members.includes(key)))throw failure();
   const revision=JSON.stringify(raw.epochPin);if(!raw.terminal&&(typeof revision!=='string'||revision.length>1024||raw.epochPin===null))throw failure();
   summary={...raw,members};notify();return summary;
  })();refreshing=work;try{return await work;}finally{if(refreshing===work)refreshing=null;}
 }
 function validate(row){
  if(!row||typeof row.requestId!=='string'||!/^[a-zA-Z0-9:_-]{1,200}$/.test(row.requestId)||!['rename','remove','promote','demote'].includes(row.type)||typeof row.value!=='string'||row.value.length>160||typeof row.expectedParent!=='string'||row.expectedParent.length>1024||!['publishing','unconfirmed','sent-to-relay'].includes(row.status)||row.actionJson!==undefined&&(typeof row.actionJson!=='string'||row.actionJson.length>32768)||row.commitConfirmed!==undefined&&typeof row.commitConfirmed!=='boolean'||!Array.isArray(row.wireIds)||row.wireIds.length>20||row.wireIds.some(id=>!hex(id))||new Set(row.wireIds).size!==row.wireIds.length)throw failure();
  return {...row,commitConfirmed:row.commitConfirmed===true,status:row.status==='publishing'?'unconfirmed':row.status};
 }
 async function applyOutcome(row,effects){
  check();if(!effects||!Array.isArray(effects.fanoutOutcomes)||!Array.isArray(effects.publicationReports))throw failure();
  // Only the exact commit journaled before dispatch may establish success.
  // Original MLS confirmation is distinct from an ACK or optimistic epoch.
  // In the original outcome(), confirmationRequired becomes FALSE when
  // Pending advances to Confirmed; requiring both true is contradictory.
  const confirmed=row.wireIds.some(id=>effects.fanoutOutcomes.some(outcome=>outcome.transportId===id&&outcome.mlsConfirmationRequired===false&&outcome.mlsConfirmed===true&&outcome.acceptedTargets>0)&&effects.publicationReports.some(report=>report.transportId===id&&report.metRequiredAcks===true));
  if(confirmed&&effects.supersededIntents===0)row.commitConfirmed=true;
  // The original ACK/MLS proof survives a failed canonical sync or reload.
  // Retrying this callback never stages or publishes another management commit.
  row.status='unconfirmed';await save();await refresh();
  if(row.commitConfirmed===true){
   if(!active()||!current('manage'))throw failure();
   await onConfirmed(Object.freeze({groupId:binding.groupId,name:summary.name,members:Object.freeze([...summary.members])}));check();
   row.status='sent-to-relay';try{await save();}catch(error){row.status='unconfirmed';throw error;}
  }
 }
 try{
  check();await refresh();if(!active())throw failure();
  const stored=await journal.getItem(address);check();if(stored){if(stored.schema!=='crays.original-mdk-management.v1'||JSON.stringify(stored.binding)!==JSON.stringify(binding)||!Array.isArray(stored.attempts)||stored.attempts.length>1000)throw failure();for(const raw of stored.attempts){const row=validate(raw);if(attempts.has(row.requestId))throw failure();attempts.set(row.requestId,row);}}notify();
  unsubscribe=runtime.subscribeTimeline(change=>{if(change?.kind==='closed'||!current('read'))close();else if(change?.kind!=='append')void refresh().catch(()=>{summary=null;notify();});});
 }catch(error){close();throw error;}
 return Object.freeze({getSnapshot(){if(!current('read'))close();return snapshot;},subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},
  prepare(change){
   check();if(!manager()||busy||blocked()||summary.queuedIntents||summary.pendingFanouts||summary.pendingConvergence)throw failure();
   if(!change||Object.keys(change).sort().join(',')!=='type,value'||!['rename','remove','promote','demote'].includes(change.type)||typeof change.value!=='string')throw failure();
   const value=change.type==='rename'?change.value.trim():change.value;
   if(change.type==='rename'?!value||value.length>80||/[\x00-\x1f\x7f]/.test(value)||value===summary.name:!hex(value)||!summary.members.includes(value))throw failure();
   if(change.type==='remove'&&value===binding.pubkey||change.type==='promote'&&summary.admins.includes(value)||change.type==='demote'&&(!summary.admins.includes(value)||summary.admins.length<2)||change.type==='remove'&&summary.admins.includes(value)&&summary.admins.length<2)throw failure();
   const review=Object.freeze({requestId:newId(),type:change.type,value,expectedParent:pin()});if(!/^[a-zA-Z0-9:_-]{1,200}$/.test(review.requestId)||attempts.has(review.requestId))throw failure();reviews.add(review);return review;
  },
  async confirm(review){
   check();if(!reviews.has(review))throw failure();const previous=attempts.get(review.requestId);if(previous)return publicRow(previous);if(busy||!manager()||blocked()||attempts.size>=1000)throw failure();busy=true;notify();
   try{return await journal.exclusive('device-group-management',async()=>{
    await refresh();check();if(!manager()||pin()!==review.expectedParent||summary.queuedIntents||summary.pendingFanouts||summary.pendingConvergence)throw failure();
    // Prevent a second window from staging another change from the same review.
    const stored=await journal.getItem(address);check();if(stored&&!sameStored(stored))throw failure();
    const action=review.type==='rename'?{action:'rename',name:review.value}:review.type==='remove'?{action:'remove',members:[review.value]}:{action:'admins',members:review.type==='promote'?[...summary.admins,review.value]:summary.admins.filter(k=>k!==review.value)};
    const row={...review,status:'publishing',wireIds:[],commitConfirmed:false,actionJson:JSON.stringify(action)};attempts.set(row.requestId,row);await save();
    try{const effects=await runtime.manage(binding.groupId,JSON.parse(review.expectedParent),action,{beforePublication:async metadata=>{check();if(metadata.kind!=='group'||metadata.groupId!==binding.groupId||!hex(metadata.transportId))throw failure();if(!row.wireIds.includes(metadata.transportId)){if(row.wireIds.length>=20)throw failure();row.wireIds.push(metadata.transportId);await save();}}});await applyOutcome(row,effects);}
    catch{if(row.status!=='sent-to-relay')row.status='unconfirmed';await save().catch(()=>{});await refresh().catch(()=>{});}
    return publicRow(row);
   });}finally{busy=false;notify();}
  },
  async retryOriginal(id){
   check();const row=attempts.get(id);if(!row||busy||!recoverable(row))throw failure();busy=true;notify();
   try{return await journal.exclusive('device-group-management',async()=>{
    const stored=await journal.getItem(address);check();if(!sameStored(stored))throw failure();
    await refresh();if(!recoverable(row))throw failure();
    if(row.wireIds.length===0&&typeof row.actionJson==='string'&&typeof runtime.managementPublicationId==='function'){
     const original=await runtime.managementPublicationId(binding.groupId,row.expectedParent,row.actionJson);check();
     if(!recoverable(row))throw failure();
     if(original!==null){if(!hex(original))throw failure();row.wireIds.push(original);await save();}
    }
    if(!row.commitConfirmed&&typeof runtime.managementDeliveryConfirmed==='function'){
     for(const original of row.wireIds){if(await runtime.managementDeliveryConfirmed(binding.groupId,original)===true){check();if(!recoverable(row))throw failure();row.commitConfirmed=true;await save();break;}}
    }
    // A positively retained original receipt only needs canonical synchronization.
    // Reconcile otherwise; NEVER invoke manage again or bind a new frame.
    const effects=row.commitConfirmed===true?{fanoutOutcomes:[],publicationReports:[],supersededIntents:0}:await runtime.reconcile(binding.groupId,{beforePublication:metadata=>{check();if(metadata.kind!=='group'||metadata.groupId!==binding.groupId||!row.wireIds.includes(metadata.transportId))throw failure();}});await applyOutcome(row,effects);return publicRow(row);
   });}finally{busy=false;notify();}
  },
  readAttempt(id){check();const row=attempts.get(id);return row?publicRow(row):null;},recheck(){if(!current('read'))close();else void refresh().catch(()=>{summary=null;notify();});},close,
 });
}
