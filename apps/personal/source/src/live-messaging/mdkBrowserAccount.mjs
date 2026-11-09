import {authorizeMdkBrowserIdentity} from './mdkBrowserIdentity.mjs';
import {openMdkBrowserSigner} from './mdkBrowserSigner.mjs';

const unavailable=()=>Error('Private group account is unavailable');
/** Own one original MDK device database for the verified account. This is a
 * distinct storage format, never an implicit import/replacement of legacy TS
 * groups. The caller retains the existing Core membership/publication gates.
 * Serialize engine borrows and await durable state before returning wire data.
 */
export async function openMdkBrowserAccount({account,snapshots,AccountClass,isCurrent,locks=globalThis.navigator?.locks,deviceSlot,controlReceipts}){
 if(typeof AccountClass!=='function'||typeof AccountClass.restore!=='function'||typeof isCurrent!=='function'||typeof locks?.request!=='function'||!account?.signal?.addEventListener||!snapshots?.load||!snapshots.commit||typeof deviceSlot!=='string'||! /^[a-f0-9]{64}$/.test(deviceSlot))throw unavailable();
 const fingerprint=account.identity?.bindingFingerprint;
 if(typeof fingerprint!=='string'||! /^[a-f0-9]{64}$/.test(fingerprint))throw unavailable();
 let closed=false,ram,bridge,identity,driver,revision=0,pending=Promise.resolve(),release,leaseTask,leaseHeld=false,closeTask;
 const timelineListeners=new Set();
 const timelineChanged=kind=>{const change=Object.freeze({kind});for(const listener of timelineListeners)try{listener(change);}catch{}};
 const current=()=>!closed&&!account.signal.aborted&&isCurrent()===true;
 const check=()=>{if(!current())throw unavailable();};
 const releaseLease=()=>{release?.();release=undefined;};
 const close=()=>{
  if(closeTask)return closeTask;
  closed=true;account.signal.removeEventListener('abort',close);driver?.close();timelineChanged('closed');timelineListeners.clear();
  // Never close/free the mutably borrowed WASM account while an async engine
  // call is suspended. The independent signer bridge cancels that call first.
  closeTask=Promise.resolve().then(async()=>{
   await pending.catch(()=>{});
   await checkpointTail.catch(()=>{});
   try{identity?.close();}finally{
    try{bridge?.close();ram?.close();}finally{
     try{bridge?.free();ram?.free();}finally{releaseLease();}
    }
   }
   await leaseTask?.catch(()=>{});
  });
  return closeTask;
 };
 account.signal.addEventListener('abort',close,{once:true});
 let checkpointTail=Promise.resolve();
 const persist=()=>{
  const work=checkpointTail.then(async()=>{
   check();const bytes=typeof bridge?.snapshot==='function'?bridge.snapshot():ram.snapshot();
   try{const committed=await snapshots.commit(bytes,revision);check();revision=committed.revision;}finally{bytes.fill(0);}
  });
  checkpointTail=work.catch(()=>{void close();});return work;
 };
 try{
  check();
  // ifAvailable prevents another tab from indefinitely waiting on the same
  // physical device leaf. It may use another enrolled device, not clone this.
  let admit;
  const admitted=new Promise((resolve,reject)=>{admit={resolve,reject};});
  leaseTask=locks.request('crays:mdk-account-runtime:v1:'+deviceSlot+':'+fingerprint,{mode:'exclusive',ifAvailable:true},async lock=>{
   if(!lock){admit.reject(unavailable());return;}
   if(!current()){admit.reject(unavailable());return;}
   leaseHeld=true;
   const retained=new Promise(resolve=>{release=resolve;});admit.resolve();await retained;
  });
  void leaseTask.catch(admit.reject);await admitted;check();
  const saved=await snapshots.load();
  try{check();revision=saved.revision;ram=saved.bytes?AccountClass.restore(saved.bytes):new AccountClass();}finally{saved.bytes?.fill(0);}
  identity=await authorizeMdkBrowserIdentity({account,ram,snapshots,isCurrent:current,revision});check();revision=identity.revision;
  bridge=ram.signer_bridge();
  driver=openMdkBrowserSigner({account,bridge,isCurrent:current,persist});
  await persist();check();
  const run=work=>{
   if(typeof work!=='function')return Promise.reject(unavailable());
   const operation=pending.then(async()=>{check();return driver.run(()=>{check();return work(ram);});});
   pending=operation.catch(()=>{void close();});
   return operation;
  };
  return Object.freeze({
   storageFormat:'crays-original-mdk-current-v1',
   accountPubkey:identity.accountPubkey,mlsSignaturePublicKey:identity.mlsSignaturePublicKey,
   run,
   invitationCommitMatches(groupId,transportId,expectedParent,keyPackage){
    check();if(typeof bridge?.invitation_commit_matches!=='function')return false;
    if(!/^[a-f0-9]{32}$/.test(groupId)||!/^[a-f0-9]{64}$/.test(transportId)||typeof expectedParent!=='string'||expectedParent.length>1024)throw unavailable();
    const encoded=JSON.stringify(keyPackage);if(typeof encoded!=='string'||encoded.length>100000)throw unavailable();
    const result=bridge.invitation_commit_matches(groupId,transportId,expectedParent,encoded);check();return result===true;
   },
   invitationPublicationIds(groupId,expectedParent,keyPackage){
    check();if(typeof bridge?.invitation_publication_ids!=='function')return null;
    if(!/^[a-f0-9]{32}$/.test(groupId)||typeof expectedParent!=='string'||expectedParent.length>1024)throw unavailable();
    const encoded=JSON.stringify(keyPackage);if(typeof encoded!=='string'||encoded.length>100000)throw unavailable();
    const raw=bridge.invitation_publication_ids(groupId,expectedParent,encoded);check();
    if(typeof raw!=='string'||raw.length>4096)throw unavailable();const value=JSON.parse(raw);if(value===null)return null;
    if(!value||typeof value.commit!=='string'||!/^[a-f0-9]{64}$/.test(value.commit)||!Array.isArray(value.welcomes)||value.welcomes.length!==1||value.welcomes.some(id=>typeof id!=='string'||!/^[a-f0-9]{64}$/.test(id)))throw unavailable();
    return Object.freeze({commit:value.commit,welcomes:Object.freeze([...value.welcomes])});
   },
   async recordControlEffects(groupId,effects){check();if(controlReceipts)await controlReceipts.capture(groupId,effects);check();},
   async managementDeliveryConfirmed(groupId,transportId){check();const confirmed=controlReceipts?await controlReceipts.confirmed(groupId,transportId):false;check();return confirmed===true;},
   managementPublicationId(groupId,expectedParent,actionJson){
    check();if(typeof bridge?.management_publication_id!=='function')return null;
    if(!/^[a-f0-9]{32}$/.test(groupId)||typeof expectedParent!=='string'||expectedParent.length>1024||typeof actionJson!=='string'||actionJson.length>32768)throw unavailable();
    const raw=bridge.management_publication_id(groupId,expectedParent,actionJson);check();
    if(typeof raw!=='string'||raw.length>128)throw unavailable();const value=JSON.parse(raw);if(value===null)return null;
    if(typeof value!=='string'||!/^[a-f0-9]{64}$/.test(value))throw unavailable();return value;
   },
   welcomeDeliveryConfirmed(groupId,transportId,recipient){
    check();if(typeof bridge?.welcome_delivery_confirmed!=='function')return false;
    if(!/^[a-f0-9]{32}$/.test(groupId)||![transportId,recipient].every(value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value)))throw unavailable();
    const result=bridge.welcome_delivery_confirmed(groupId,transportId,recipient);check();return result===true;
   },
   checkpointDuringOperation(){
    check();if(typeof bridge?.snapshot!=='function')return Promise.reject(unavailable());
    return persist();
   },
   readTimeline(groupId,{before,limit=50}={}){
    if(typeof groupId!=='string'||! /^(?:[a-f0-9]{2}){1,64}$/.test(groupId)||!Number.isSafeInteger(limit)||limit<1||limit>200||before&&(!Number.isSafeInteger(before.at)||before.at<0||typeof before.messageId!=='string'||! /^[a-f0-9]{64}$/.test(before.messageId)))return Promise.reject(unavailable());
    return run(value=>JSON.parse(value.timeline(groupId,before?BigInt(before.at):undefined,before?.messageId,limit)));
   },
   ingestTimeline(eventJSON){
    if(typeof eventJSON!=='string'||eventJSON.length>2*1024*1024)return Promise.reject(unavailable());
    // Rust verifies the signed transport, MLS sender, canonical application
    // id and projection. No raw internal GroupEvent/exporter secret escapes.
    return run(async value=>JSON.parse(await value.ingest_timeline(eventJSON))).then(result=>{check();if(result.timelineChange!=='none')timelineChanged(result.timelineChange==='append'?'append':'withdrawal');return result;});
   },
   subscribeTimeline(listener){check();if(typeof listener!=='function')throw unavailable();timelineListeners.add(listener);return()=>timelineListeners.delete(listener);},
   close,
   async settled(){if(closed)await closeTask;else await pending;},
  });
 }catch(error){
  // Initialization has no queued engine work; release its lock even when a
  // proof, corrupt snapshot or current account check fails before ready.
  if(!leaseHeld)releaseLease();await close();throw unavailable();
 }
}
