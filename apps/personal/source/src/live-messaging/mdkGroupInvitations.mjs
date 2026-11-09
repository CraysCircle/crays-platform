import {verifyEvent} from 'nostr-tools/pure';
import {originalMdkFormat,validBoundGroupId} from './groupStorageFormat.mjs';
const fields=['kind','accountId','conversationId','groupId','membershipId','pubkey','storageFormat'];
const hex=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const fail=()=>Error('This group invitation could not be confirmed');
const memberKey=row=>{const bytes=row?.id;if(!Array.isArray(bytes)||bytes.length!==32||bytes.some(v=>!Number.isInteger(v)||v<0||v>255))throw fail();return bytes.map(v=>v.toString(16).padStart(2,'0')).join('');};
/** Existing invitation UI port over original AccountDeviceRuntime. Candidate
 * eligibility remains the independent canonical parent's decision. Signed
 * KeyPackages are validated again by the original Rust implementation.
 * Commit and recipient Welcome have separate actual publication receipts.
 */
export async function openMdkGroupInvitations({binding:input,runtime,journal,getAdmission,authorize,candidates,resolvePackage,signal,onConfirmed=async()=>{},prepareRetry=async()=>{},newId=()=>crypto.randomUUID()}){
 const binding=Object.freeze({...input}),listeners=new Set(),reviews=new WeakMap(),attempts=new Map();
 if(binding.storageFormat!==originalMdkFormat||!validBoundGroupId(binding)||runtime?.storageFormat!==originalMdkFormat||runtime.accountPubkey!==binding.pubkey||!signal?.addEventListener||[getAdmission,authorize,candidates,resolvePackage,onConfirmed,prepareRetry].some(fn=>typeof fn!=='function')||['getItem','setItem','exclusive'].some(k=>typeof journal?.[k]!=='function'))throw fail();
 let closed=false,busy=false,summary=null,snapshot,unsubscribe,refreshing;
 const address='device-invitations:'+binding.groupId;
 const current=action=>{try{const actual=getAdmission();return !closed&&!signal.aborted&&fields.every(k=>actual?.[k]===binding[k])&&authorize(binding,action)===true;}catch{return false;}};
 const check=()=>{if(!current('read'))throw fail();};
 const active=()=>current('read')&&summary&&!summary.terminal&&!summary.removed&&!summary.unrecoverable&&summary.members.includes(binding.pubkey);
 const manager=()=>active()&&summary.admins.includes(binding.pubkey)&&current('manage');
 const eligible=()=>{if(!manager())return[];const rows=candidates();if(!Array.isArray(rows)||rows.length>1000)throw fail();const seen=new Set();return rows.filter(row=>{if(!row||!hex(row.pubkey)||typeof row.name!=='string'||!row.name.trim()||row.name.length>160||summary.members.includes(row.pubkey)||seen.has(row.pubkey)||authorize(binding,'invite',row.pubkey)!==true)return false;seen.add(row.pubkey);return true;}).map(row=>Object.freeze({pubkey:row.pubkey,name:row.name}));};
 const sameStoredAttempts=stored=>stored?.schema==='crays.original-mdk-invitations.v1'&&JSON.stringify(stored.binding)===JSON.stringify(binding)&&Array.isArray(stored.attempts)&&JSON.stringify(stored.attempts.map(row=>({...row,welcomeConfirmed:row.welcomeConfirmed===true,status:row.status==='publishing'?'unconfirmed':row.status})))===JSON.stringify([...attempts.values()]);
 const pending=()=>[...attempts.values()].some(row=>row.status!=='welcome-published');
 const pin=()=>summary?JSON.stringify(summary.epochPin):null;
 const publicRow=row=>Object.freeze({requestId:row.requestId,pubkey:row.pubkey,keyPackageEventId:row.keyPackageEventId,expectedParent:row.expectedParent,status:row.status});
 const notify=()=>{snapshot=Object.freeze({available:!!active(),canInvite:!!manager(),busy,candidates:Object.freeze(eligible()),attempts:Object.freeze(active()?[...attempts.values()].map(publicRow):[])});for(const fn of listeners)try{fn();}catch{}};
 function close(){if(closed)return;closed=true;signal.removeEventListener('abort',close);unsubscribe?.();summary=null;notify();listeners.clear();}
 signal.addEventListener('abort',close,{once:true});
 const save=async()=>{check();await journal.setItem(address,{schema:'crays.original-mdk-invitations.v1',binding,attempts:[...attempts.values()]});check();};
 async function refresh(){if(refreshing)return refreshing;check();const work=(async()=>{const raw=await runtime.summary(binding.groupId);check();if(raw?.groupId!==binding.groupId||!Array.isArray(raw.members)||raw.members.length>40||!Array.isArray(raw.admins)||raw.admins.some(v=>!hex(v))||typeof raw.terminal!=='boolean'||typeof raw.removed!=='boolean'||typeof raw.unrecoverable!=='boolean')throw fail();const members=raw.members.map(memberKey);if(new Set(members).size!==members.length||raw.admins.some(key=>!members.includes(key)))throw fail();summary={...raw,members};if(!raw.terminal&&(!raw.epochPin||pin().length>1024))throw fail();notify();})();refreshing=work;try{await work;}finally{if(refreshing===work)refreshing=null;}}
 async function publishOutcome(row,effects){
  check();if(!Array.isArray(effects?.fanoutOutcomes)||!Array.isArray(effects?.publicationReports))throw fail();
  const ack=id=>effects.publicationReports.some(report=>report.transportId===id&&report.metRequiredAcks===true);
  const commit=row.commits.some(id=>ack(id)&&effects.fanoutOutcomes.some(outcome=>outcome.transportId===id&&outcome.mlsConfirmationRequired===false&&outcome.mlsConfirmed===true&&outcome.acceptedTargets>0));
  if(commit&&effects.supersededIntents===0)row.commitConfirmed=true;
  if(row.commitConfirmed&&row.welcomes.some(ack))row.welcomeConfirmed=true;
  const welcomeConfirmed=row.commitConfirmed&&row.welcomeConfirmed===true;
  // Keep the exact invitation recoverable until the canonical membership
  // callback has succeeded. A crash or failed callback must not persist a
  // terminal UI receipt while the directory still lacks the new member.
  row.status=row.commitConfirmed?'commit-confirmed':'unconfirmed';
  await save();await refresh();if(row.commitConfirmed&&active()){
   await onConfirmed(Object.freeze({groupId:binding.groupId,name:summary.name,members:Object.freeze([...summary.members])}));check();
   if(welcomeConfirmed){row.status='welcome-published';await save();}
  }
 }
 try{
  check();await refresh();if(!active())throw fail();const stored=await journal.getItem(address);check();if(stored){if(stored.schema!=='crays.original-mdk-invitations.v1'||JSON.stringify(stored.binding)!==JSON.stringify(binding)||!Array.isArray(stored.attempts)||stored.attempts.length>1000)throw fail();for(const raw of stored.attempts){if(!raw||!hex(raw.pubkey)||!hex(raw.keyPackageEventId)||typeof raw.requestId!=='string'||!/^[a-zA-Z0-9:_-]{1,200}$/.test(raw.requestId)||typeof raw.expectedParent!=='string'||raw.expectedParent.length>1024||!['publishing','unconfirmed','commit-confirmed','welcome-published'].includes(raw.status)||typeof raw.commitConfirmed!=='boolean'||raw.welcomeConfirmed!==undefined&&typeof raw.welcomeConfirmed!=='boolean'||raw.welcomeConfirmed===true&&raw.commitConfirmed!==true||['commits','welcomes'].some(k=>!Array.isArray(raw[k])||raw[k].length>20||raw[k].some(id=>!hex(id)))||attempts.has(raw.requestId))throw fail();attempts.set(raw.requestId,{...raw,welcomeConfirmed:raw.welcomeConfirmed===true,status:raw.status==='publishing'?'unconfirmed':raw.status});}}notify();
  unsubscribe=runtime.subscribeTimeline(change=>{if(change?.kind==='closed'||!current('read'))close();else if(change?.kind!=='append')void refresh().catch(()=>{summary=null;notify();});});
 }catch(error){close();throw error;}
 return Object.freeze({getSnapshot(){if(!current('read'))close();return snapshot;},subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},
  async prepare(pubkey){check();if(!manager()||busy||pending()||attempts.size>=1000)throw fail();busy=true;notify();try{await refresh();const person=eligible().find(row=>row.pubkey===pubkey);if(!person||summary.queuedIntents||summary.pendingFanouts||summary.pendingConvergence)throw fail();const expectedParent=pin(),event=structuredClone(await resolvePackage(pubkey,{signal}));check();await refresh();if(!manager()||pin()!==expectedParent||!eligible().some(row=>row.pubkey===pubkey)||!verifyEvent(event)||event.kind!==30443||event.pubkey!==pubkey||event.content.length>87380)throw fail();const review=Object.freeze({requestId:newId(),pubkey,keyPackageEventId:event.id,expectedParent,name:person.name});if(!/^[a-zA-Z0-9:_-]{1,200}$/.test(review.requestId)||attempts.has(review.requestId))throw fail();reviews.set(review,event);return review;}finally{busy=false;notify();}},
  async confirm(review){check();if(!reviews.has(review))throw fail();const prior=attempts.get(review.requestId);if(prior)return publicRow(prior);if(busy||!manager()||pending())throw fail();busy=true;notify();try{return await journal.exclusive('device-group-management',async()=>{
   await refresh();check();if(!manager()||pin()!==review.expectedParent||!eligible().some(row=>row.pubkey===review.pubkey)||summary.queuedIntents||summary.pendingFanouts||summary.pendingConvergence)throw fail();const stored=await journal.getItem(address);check();if(stored&&!sameStoredAttempts(stored))throw fail();
   const row={requestId:review.requestId,pubkey:review.pubkey,keyPackageEventId:review.keyPackageEventId,expectedParent:review.expectedParent,status:'publishing',commitConfirmed:false,welcomeConfirmed:false,commits:[],welcomes:[]};attempts.set(row.requestId,row);await save();
   try{const effects=await runtime.manage(binding.groupId,JSON.parse(review.expectedParent),{action:'invite',packages:[reviews.get(review)]},{beforePublication:async metadata=>{check();let ids;if(metadata.kind==='group'&&metadata.groupId===binding.groupId)ids=row.commits;else if(metadata.kind==='welcome'&&metadata.recipient===row.pubkey)ids=row.welcomes;else throw fail();if(!hex(metadata.transportId))throw fail();if(!ids.includes(metadata.transportId)){if(ids.length>=20)throw fail();ids.push(metadata.transportId);await save();}}});await publishOutcome(row,effects);}catch{if(row.status==='publishing')row.status='unconfirmed';await save().catch(()=>{});await refresh().catch(()=>{});}return publicRow(row);
  });}finally{busy=false;notify();}},
  async retryOriginal(id){
   check();const row=attempts.get(id);if(!row||!['unconfirmed','commit-confirmed'].includes(row.status)||busy||!manager())throw fail();busy=true;notify();
   try{return await journal.exclusive('device-group-management',async()=>{
    const stored=await journal.getItem(address);check();if(!sameStoredAttempts(stored))throw fail();
    await refresh();check();if(!manager())throw fail();
    const suppliedPackage=await prepareRetry(publicRow(row),{signal,needsCommitProof:row.commits.length===0||row.welcomes.length===0});check();
    // Drop library verification-cache Symbols and retain an independent wire
    // value before asynchronous proof checks. A copied cache is not a signature.
    const recoveryPackage=suppliedPackage==null?null:JSON.parse(JSON.stringify(suppliedPackage));
    await refresh();if(!manager())throw fail();
    const recoverCommit=async transportId=>{
     if(row.commits.length>0)return row.commits.includes(transportId);
     if(!hex(transportId)||!recoveryPackage||!verifyEvent(recoveryPackage)||recoveryPackage.kind!==30443||recoveryPackage.pubkey!==row.pubkey||recoveryPackage.id!==row.keyPackageEventId||typeof runtime.verifyInvitationCommit!=='function')return false;
     if(await runtime.verifyInvitationCommit(binding.groupId,transportId,row.expectedParent,recoveryPackage)!==true)return false;
     check();if(!manager())throw fail();row.commits.push(transportId);await save();check();return true;
    };
    if((row.commits.length===0||row.welcomes.length===0)&&recoveryPackage&&verifyEvent(recoveryPackage)&&recoveryPackage.kind===30443&&recoveryPackage.pubkey===row.pubkey&&recoveryPackage.id===row.keyPackageEventId&&typeof runtime.invitationPublicationIds==='function'){
     const original=await runtime.invitationPublicationIds(binding.groupId,row.expectedParent,recoveryPackage);check();if(!manager())throw fail();
     if(original!==null){
      if(!original||!hex(original.commit)||!Array.isArray(original.welcomes)||original.welcomes.length!==1||original.welcomes.some(id=>!hex(id)))throw fail();
      if(row.commits.length&&!row.commits.includes(original.commit)||row.welcomes.length&&!original.welcomes.every(id=>row.welcomes.includes(id)))throw fail();
      if(typeof runtime.verifyInvitationCommit!=='function'||await runtime.verifyInvitationCommit(binding.groupId,original.commit,row.expectedParent,recoveryPackage)!==true)throw fail();
      check();if(!manager())throw fail();
      // Both IDs belong to the same durable original. Commit them together;
      // interruption must not create another half-correlated journal record.
      if(row.commits.length===0)row.commits.push(original.commit);
      if(row.welcomes.length===0)row.welcomes=[...original.welcomes];await save();
     }
    }
    // Only advance the original runtime's frozen fanout. Do not invite again,
    // resolve another package, or substitute an unrelated new transport ID.
    const effects=await runtime.reconcile(binding.groupId,{beforePublication:async metadata=>{
     check();const isWelcome=metadata.kind==='welcome'&&metadata.recipient===row.pubkey;
     // Recover the first missing UI correlation only from the original
     // account's persisted own Commit intent and exact reviewed KeyPackage.
     // Never adopt an arbitrary retry frame or create another invitation.
     if(metadata.kind==='group'&&metadata.groupId===binding.groupId&&row.commits.length===0)await recoverCommit(metadata.transportId);

     // The original engine may release its already staged Welcome only after
     // this retry confirms the Commit. Bind its first ID durably BEFORE I/O.
     if(isWelcome&&row.welcomes.length===0&&row.commits.length>0&&hex(metadata.transportId)){row.welcomes.push(metadata.transportId);await save();check();}
     const known=metadata.kind==='group'&&metadata.groupId===binding.groupId?row.commits:isWelcome?row.welcomes:[];if(!known.includes(metadata.transportId))throw fail();
    }});
    // A persisted fanout may be in the original engine's retry backoff and
    // emit no publication callback. Its ID is a candidate only: the independent
    // original intent proof is still required. Pending state never grants ACK.
    if(row.commits.length===0){
     if(!Array.isArray(effects?.fanoutOutcomes)||effects.fanoutOutcomes.length>20)throw fail();
     for(const outcome of effects.fanoutOutcomes){if(await recoverCommit(outcome?.transportId))break;}
    }
    // Recover only a positively retained original engine receipt for an ID
    // correlated before dispatch. Absence of an owed fanout is never success.
    if(!row.welcomeConfirmed&&typeof runtime.welcomeDeliveryConfirmed==='function'){
     for(const welcome of row.welcomes){
      if(await runtime.welcomeDeliveryConfirmed(binding.groupId,welcome,row.pubkey)===true){
       check();if(!manager())throw fail();row.commitConfirmed=true;row.welcomeConfirmed=true;await save();break;
      }
     }
    }
    await publishOutcome(row,effects);
    if(row.status==='commit-confirmed'&&typeof runtime.redeliverWelcome==='function'){
     for(const id of row.welcomes){
      check();const result=await runtime.redeliverWelcome(binding.groupId,id,row.pubkey,{beforePublication:metadata=>{check();if(metadata.kind!=='welcome'||metadata.recipient!==row.pubkey||metadata.transportId!==id)throw fail();}});
      await publishOutcome(row,result);if(row.status==='welcome-published')break;
     }
    }
    return publicRow(row);
   });}finally{busy=false;notify();}
  },
  recheck(){if(!current('read'))close();else void refresh().catch(()=>{summary=null;notify();});},close,
 });
}
