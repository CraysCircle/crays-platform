import {openMdkControlReceipts} from './mdkControlReceipts.mjs';
import {openAccountBrowserStores} from './accountBrowserStores.mjs';
import {openMdkBrowserSnapshotStore} from './mdkBrowserSnapshotStore.mjs';
import {openMdkBrowserAccount} from './mdkBrowserAccount.mjs';
import {openMdkMembershipJournal} from './mdkMembershipJournal.mjs';
import {openMdkCreationJournal} from './mdkCreationJournal.mjs';

/** Explicit original-MDK account backend, sharing the existing Core-bound
 * nonexporting signer and encrypted account key envelope. No automatic fallback
 * from failed legacy groups, no migration, enrollment or membership grant.
 * Callers supply the verified account and the pinned initialized WASM class.
 */
export async function openCurrentMdkBrowserAccount({account,AccountClass,isCurrentBinding,storage={},locks=globalThis.navigator?.locks,crypto=globalThis.crypto}){
 if(typeof isCurrentBinding!=='function')throw Error('Verified messaging account required');
 let closed=false,stores,snapshots,runtime,closing;const journals=new Set();
 const current=()=>!closed&&!account.signal.aborted&&isCurrentBinding(account.identity)===true;
 const close=()=>{
  if(closing)return closing;
  closed=true;account.signal.removeEventListener('abort',close);
  for(const journal of journals)journal.close();journals.clear();
  // The driver must finish/cancel before the encrypted storage is closed.
  closing=Promise.resolve().then(async()=>{
   try{await runtime?.close();}finally{snapshots?.close();stores?.close();await stores?.settled();}
  });return closing;
 };
 account.signal.addEventListener('abort',close,{once:true});
 try{
  if(!current())throw Error('Verified messaging account required');
  const openedStores=await openAccountBrowserStores({...storage,account,isCurrent:()=>current(),locks,crypto,durability:'strict'});
  if(!current()){openedStores.close();await openedStores.settled();throw Error('Verified messaging account required');}
  stores=openedStores;
  snapshots=openMdkBrowserSnapshotStore({store:stores.stores.conversationStore,deviceSlot:stores.deviceSlot,bindingFingerprint:account.identity.bindingFingerprint,isCurrent:current,locks,crypto});
  const controlReceipts=await openMdkControlReceipts({store:stores.stores.conversationStore,identity:account.identity,deviceSlot:stores.deviceSlot,isCurrent:current,crypto});
  const openedRuntime=await openMdkBrowserAccount({account,snapshots,AccountClass,isCurrent:current,deviceSlot:stores.deviceSlot,locks,controlReceipts});
  if(!current()){await openedRuntime.close();throw Error('Verified messaging account required');}
  runtime=openedRuntime;
  return Object.freeze({storageFormat:runtime.storageFormat,accountPubkey:runtime.accountPubkey,mlsSignaturePublicKey:runtime.mlsSignaturePublicKey,run:runtime.run,invitationCommitMatches:runtime.invitationCommitMatches,invitationPublicationIds:runtime.invitationPublicationIds,welcomeDeliveryConfirmed:runtime.welcomeDeliveryConfirmed,managementPublicationId:runtime.managementPublicationId,recordControlEffects:runtime.recordControlEffects,managementDeliveryConfirmed:runtime.managementDeliveryConfirmed,checkpointDuringOperation:runtime.checkpointDuringOperation,readTimeline:runtime.readTimeline,ingestTimeline:runtime.ingestTimeline,subscribeTimeline:runtime.subscribeTimeline,
   async openCreationJournal({binding,getAdmission,signal}){
    const journal=await openMdkCreationJournal({binding,identity:account.identity,store:stores.stores.conversationStore,getAdmission,isCurrent:current,signal,locks,crypto});
    if(!current()){journal.close();throw Error('Verified messaging creation context required');}
    let ended=false;const closeJournal=()=>{if(ended)return;ended=true;journal.close();signal.removeEventListener('abort',closeJournal);journals.delete(handle);};
    const handle=Object.freeze({...journal,close:closeJournal});journals.add(handle);signal.addEventListener('abort',closeJournal,{once:true});
    if(signal.aborted){closeJournal();throw Error('Current creation journal required');}return handle;
   },
   async openGroupJournal({binding,getAdmission,signal}){
    const journal=await openMdkMembershipJournal({binding,identity:account.identity,store:stores.stores.conversationStore,getAdmission,isCurrent:current,signal,locks,crypto});
    if(!current()){journal.close();throw Error('Verified messaging account required');}
    let ended=false;
    const closeJournal=()=>{if(ended)return;ended=true;journal.close();signal.removeEventListener('abort',closeJournal);journals.delete(handle);};
    const handle=Object.freeze({...journal,close:closeJournal});journals.add(handle);signal.addEventListener('abort',closeJournal,{once:true});
    if(signal.aborted){closeJournal();throw Error('Current group journal required');}return handle;
   },close,async settled(){if(closing)await closing;else await runtime.settled();}});
 }catch{await close();throw Error('Private group account could not be opened');}
}
