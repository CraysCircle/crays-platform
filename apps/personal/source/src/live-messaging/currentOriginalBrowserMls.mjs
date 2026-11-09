import {openCurrentAccountMessaging} from './currentAccountMessaging.mjs';
import {openCurrentMdkBrowserAccount} from './currentMdkBrowserAccount.mjs';
import {openMdkDeviceRuntime} from './mdkDeviceRuntime.mjs';
import {originalMdkFormat,validBoundGroupId} from './groupStorageFormat.mjs';
const fail=()=>Error('The current original-format group is unavailable');
/** Original MDK backend for an EXPLICIT original-format Core directory entry.
 * Shares the existing same-origin account/signer admission. Never retries a
 * legacy group through another engine or turns a relay into membership.
 */
export async function openCurrentOriginalBrowserMls(options){
 const {loadEngine,openNetwork,currentInboxes,admitConversation,isCurrentBinding}=options;
 if([loadEngine,openNetwork,currentInboxes,admitConversation,isCurrentBinding,options.authorizeRuntimeOperation].some(fn=>typeof fn!=='function'))throw fail();
 let closed=false,account,store,runtime,network,closing;
 const current=()=>{try{return !closed&&account&&!account.signal.aborted&&options.isCurrent(account.accountId)===true&&isCurrentBinding(account.identity)===true;}catch{return false;}};
 const check=()=>{if(!current())throw fail();};
 const close=()=>{if(closing)return closing;closed=true;account?.signal.removeEventListener('abort',close);network?.close?.();account?.close();closing=Promise.resolve().then(async()=>{await runtime?.close();await store?.close();await account?.settled();});return closing;};
 try{
  account=await openCurrentAccountMessaging({...options,admitConversation:async request=>{
   check();const grant=await admitConversation({...request,runtime,accountStore:store,network});check();
   if(!grant||grant.storageFormat!==originalMdkFormat||!validBoundGroupId(grant)||grant.pubkey!==account.identity.pubkey||grant.accountId!==account.accountId||grant.conversationId!==request.conversationId||typeof grant.openResources!=='function'||!Array.isArray(grant.relays)||!grant.relays.length)return null;
   const summary=await runtime.summary(grant.groupId),route=await runtime.routing(grant.groupId);check();
   if(summary.terminal||summary.removed||summary.unrecoverable||!summary.members?.some(member=>Array.isArray(member.id)&&member.id.map(v=>v.toString(16).padStart(2,'0')).join('')===grant.pubkey)||route?.groupId!==grant.groupId||route.routingId!==grant.routingId||JSON.stringify([...route.relays].sort())!==JSON.stringify([...grant.relays].sort()))throw fail();
   const parentCurrent=grant.isCurrent;
   if(typeof parentCurrent!=='function'||parentCurrent(grant)!==true)throw fail();
   // Cold activation knows the inbox only. summary() has now hydrated this
   // exact directory-authorized group route; install its real receive plan
   // before opening the history/composer, including after a full page reload.
   await runtime.syncGroups();check();if(parentCurrent(grant)!==true)throw fail();
   return {...grant,isCurrent:binding=>current()&&parentCurrent(binding)===true,
    openResources:context=>grant.openResources({...context,runtime,accountStore:store,network})};
  }});
  check();account.signal.addEventListener('abort',close,{once:true});
  const AccountClass=await loadEngine();check();
  store=await openCurrentMdkBrowserAccount({account,AccountClass,isCurrentBinding:()=>current(),storage:options.storage,locks:options.locks,crypto:options.crypto});check();
  network=await openNetwork({account,signer:account.signer,signal:account.signal});check();
  runtime=await openMdkDeviceRuntime({account,runtime:store,network,inboxes:currentInboxes(),isCurrent:current,authorize:(operation,payload)=>current()&&options.authorizeRuntimeOperation(operation,payload)===true,onFailure:options.onFailure});check();
  // Actual original activation must succeed; no fabricated connected marker.
  await runtime.activate();check();
  return Object.freeze({storageFormat:originalMdkFormat,messaging:account,runtime,accountStore:store,network,close,async settled(){if(closing)await closing;else await runtime.settled();}});
 }catch(error){await close();throw error;}
}
