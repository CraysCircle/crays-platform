import {MarmotClient} from '../../.qualification/marmot-pilot-v1/node_modules/@internet-privacy/marmot-ts-welcome-context-v1/dist/index.js';
import {openCurrentAccountMessaging} from './currentAccountMessaging.mjs';
import {openAccountBrowserStores} from './accountBrowserStores.mjs';

const fail=()=>Error('Current private messaging runtime unavailable');

/** Actual pinned browser engine; no synthetic identity/vault, generated Nostr
 * key, fallback relay, automatic key-package publication or new Core account.
 * The canonical parent supplies its existing signer, independent admission,
 * dedicated relay network and current-source history implementation.
 */
export async function openCurrentBrowserMls(options){
 const {isCurrentBinding,openNetwork,authorizeEvent,admitConversation,createHistoryFactory}=options;
 if(options.prepareAccount!==undefined&&typeof options.prepareAccount!=='function'||typeof isCurrentBinding!=='function'||typeof openNetwork!=='function'||typeof authorizeEvent!=='function'||typeof admitConversation!=='function'||createHistoryFactory!==undefined&&typeof createHistoryFactory!=='function')throw fail();
 let account,storage,rawNetwork,network,client,historyFactory,publication,closed=false,closeWork=Promise.resolve();
 const loaded=new Set(),subscriptions=new Set();
 const current=()=>{try{return !closed&&account&&!account.signal.aborted&&options.isCurrent(account.accountId)===true&&isCurrentBinding(account.identity)===true;}catch{return false;}};
 const collect=work=>{closeWork=Promise.allSettled([closeWork,work]).then(()=>{});};
 function close(){
  if(closed)return;closed=true;account?.signal.removeEventListener('abort',close);
  try{collect(publication?.close?.());collect(publication?.settled?.());}catch{}
  try{collect(historyFactory?.close?.());}catch{}
  for(const stop of [...subscriptions]){try{stop();}catch{}}try{rawNetwork?.close?.();}catch{}
  for(const id of [...loaded]){try{collect(client.groups.unload(id));}catch{}}
  try{account?.close();}catch{}try{storage?.close();}catch{}if(account)collect(account.settled());if(storage)collect(storage.settled());
 }
 const assertCurrent=()=>{if(!current()){close();throw fail();}};
 const groupCurrent=group=>current()&&group.status==='active'&&!group.closedSignal?.aborted&&group.snapshot.members.includes(account.identity.pubkey);
 try{
  // Only public directory metadata may overlap the fresh account/signer check.
  // Settle both before touching encrypted account stores or constructing MLS.
  // Capture rejection immediately so a failed signer cannot leave an unhandled
  // directory promise, and the original close path still owns account cleanup.
  const prepared=options.prepareAccount===undefined?null:Promise.resolve().then(options.prepareAccount).then(()=>({ok:true}),()=>({ok:false}));
  account=await openCurrentAccountMessaging({...options,admitConversation:async request=>{
   assertCurrent();if(!client||!historyFactory)throw fail();
   const grant=await admitConversation({...request,client,stores:storage.stores,network});assertCurrent();
   if(!grant)return null;
   const group=await client.groups.get(grant.groupId);assertCurrent();
   if(!group||group.idStr!==grant.groupId||!groupCurrent(group)||typeof grant.isCurrent!=='function')throw fail();
   historyFactory.admit?.({grant,group});
   if(historyFactory.recover)await historyFactory.recover(grant.groupId);assertCurrent();
   return {...grant,isCurrent:binding=>groupCurrent(group)&&grant.isCurrent(binding)===true,
    openResources:context=>grant.openResources({...context,client,group,stores:storage.stores,network}),
    ...(grant.openCalls?{openCalls:context=>grant.openCalls({...context,client,group,stores:storage.stores,network})}:{})};
  }});
  account.signal.addEventListener('abort',close,{once:true});assertCurrent();
  if(prepared&&(await prepared).ok!==true)throw fail();assertCurrent();
  storage=await openAccountBrowserStores({...options.storage,account,isCurrent:isCurrentBinding});assertCurrent();
  const openedNetwork=openNetwork({identity:account.identity,signer:account.signer,signal:account.signal,stores:storage.stores});
  if(typeof openedNetwork?.then==='function'){void openedNetwork.then(value=>{try{value?.close?.();}catch{}},()=>{});throw fail();}rawNetwork=openedNetwork;
  if(!rawNetwork||['publish','request','subscription','getUserInboxRelays','close'].some(name=>typeof rawNetwork[name]!=='function'))throw fail();
  let transport=rawNetwork;
  if(options.openPublicationGate){
   if(typeof options.openPublicationGate!=='function')throw fail();
   const prepared=await options.openPublicationGate({network:rawNetwork,identity:account.identity,signer:account.signer,stores:storage.stores,signal:account.signal,isCurrent:current,getClient:()=>client});
   if(!current()){try{prepared?.close?.();await prepared?.settled?.();}catch{}throw fail();}
   publication=prepared;if(!publication?.network||typeof publication.close!=='function'||typeof publication.settled!=='function')throw fail();transport=publication.network;
  }
  network=Object.freeze({
   async publish(relays,event,request={}){
    assertCurrent();if(event?.kind===30078||authorizeEvent({identity:account.identity,relays,event,client})!==true)throw fail();
    const beforeSend=()=>current()&&authorizeEvent({identity:account.identity,relays,event,client})===true&&(!request.beforeSend||request.beforeSend()===true);
    const result=await transport.publish(relays,event,{...request,beforeSend});assertCurrent();return result;
   },
   ...(typeof transport.publishWelcome==='function'?{async publishWelcome(relays,event,context){assertCurrent();if(authorizeEvent({identity:account.identity,relays,event,client})!==true)throw fail();const result=await transport.publishWelcome(relays,event,context);assertCurrent();return result;}}:{}),
   async request(...args){assertCurrent();const result=await transport.request(...args);assertCurrent();return result;},
   async getUserInboxRelays(...args){assertCurrent();const result=await transport.getUserInboxRelays(...args);assertCurrent();return result;},
   subscription(...args){assertCurrent();return {subscribe(observer){assertCurrent();let inner,ended=false;const stop=()=>{if(ended)return;ended=true;inner?.unsubscribe();subscriptions.delete(stop);};subscriptions.add(stop);try{inner=transport.subscription(...args).subscribe({next:value=>{if(ended)return;if(!current()){stop();observer.error?.(fail());return;}observer.next?.(value);},eose:()=>{if(!ended&&current())observer.eose?.();},error:error=>{if(ended)return;stop();observer.error?.(current()?error:fail());},complete:()=>{if(ended)return;stop();if(current())observer.complete?.();}});if(ended)inner.unsubscribe();}catch(error){stop();throw error;}return {unsubscribe:stop};}};},
  });
  historyFactory=createHistoryFactory?.({identity:account.identity,signer:account.signer,stores:storage.stores,network,getClient:()=>client,isCurrent:current,signal:account.signal});
  if(historyFactory!==undefined&&typeof historyFactory!=='function')throw fail();
  client=new MarmotClient({signer:account.signer,network,clientId:storage.deviceSlot,...storage.stores,...(historyFactory?{historyFactory}:{})});
  if(client.ingestPersistence.kind!=='durable')throw fail();
  const track=group=>{if(!current()){collect(client.groups.unload(group.idStr));return;}loaded.add(group.idStr);options.onGroupLoaded?.(group);};
  for(const event of ['loaded','created','joined','imported'])client.groups.on(event,track);
  client.groups.on('unloaded',id=>{const groupId=Array.from(id,byte=>byte.toString(16).padStart(2,'0')).join('');loaded.delete(groupId);options.onGroupUnloaded?.(groupId);if(historyFactory?.release)collect(historyFactory.release(groupId));});
  assertCurrent();
  return Object.freeze({account:account.identity,messaging:account,client,network,storage,historyReady:!!historyFactory,close,
   async settled(){let previous;do{previous=closeWork;await previous;}while(previous!==closeWork);}});
 }catch{close();await closeWork;throw fail();}
}
