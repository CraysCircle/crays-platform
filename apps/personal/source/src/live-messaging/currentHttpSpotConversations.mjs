import {createCurrentHostSigner} from './currentHostSigner.mjs';
import {openAccountBrowserStores} from './accountBrowserStores.mjs';
import {createCurrentSpotRelayClient} from './currentSpotRelayClient.mjs';
/** Lazy sibling of private conversations. Only the verified account and its
 * existing encrypted data-key custody are shared; never VIF or MLS admission.
 * Reading a public Spot thread does not unlock private browser storage.
 */
export function createCurrentHttpSpotConversations({identity,signal,isCurrent,fetcher=globalThis.fetch,dataKeyCache,locks=globalThis.navigator?.locks,crypto=globalThis.crypto}){
 let closed=false,storage,opening,provider;const clients=new Set();
 const current=()=>!closed&&!signal.aborted&&isCurrent()===true;
 const check=()=>{if(!current())throw Error('This Spot conversation is unavailable');};check();
 const close=()=>{if(closed)return;closed=true;signal.removeEventListener('abort',close);for(const c of [...clients])c.close();clients.clear();storage?.close();provider?.close();};signal.addEventListener('abort',close,{once:true});
 async function stores(){check();if(storage)return storage;if(!opening){
  const signerPort=createCurrentHostSigner({accountId:identity.accountId,signal,isCurrent:current,fetcher,verifiedIdentity:identity});provider=signerPort;
  const signer=Object.freeze({...signerPort,binding:Object.freeze({accountId:identity.accountId,pubkey:identity.pubkey,bindingFingerprint:identity.bindingFingerprint})});
  const work=openAccountBrowserStores({account:{identity,accountId:identity.accountId,signal,signer},isCurrent:current,dataKeyCache}).then(value=>{if(!current()){value.close();throw Error('This Spot conversation is unavailable');}storage=value;return value;}).catch(error=>{signerPort.close();if(provider===signerPort)provider=null;if(opening===work)opening=null;throw error;});opening=work;
 }return opening;}
 return Object.freeze({
  async open({spotId,rootId,signal:selection}){
   check();if(typeof spotId!=='string'||!spotId||spotId.length>200||typeof rootId!=='string'||!/^[a-f0-9]{64}$/.test(rootId)||!selection?.addEventListener||selection.aborted||!locks?.request||!crypto?.subtle)throw Error('This Spot conversation is unavailable');
   const combined=AbortSignal.any([signal,selection]),allowed=()=>current()&&!combined.aborted;
   const scope=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(['crays.http-spot-journal.v1',identity.accountId,identity.pubkey,identity.bindingFingerprint,spotId,rootId])))),b=>b.toString(16).padStart(2,'0')).join('');if(!allowed())throw Error('This Spot conversation is unavailable');
   const keyOf=key=>{if(!allowed()||typeof key!=='string'||!/^spot-relay-reply:http-[a-zA-Z0-9:_-]{1,120}$/.test(key))throw Error('This Spot journal is unavailable');return 'http-spot:'+scope+':'+key;};
   const journal={async getItem(key){const scoped=keyOf(key),account=await stores();if(!allowed())throw Error('This Spot journal is unavailable');const value=await account.stores.conversationStore.getItem(scoped);if(!allowed())throw Error('This Spot journal is unavailable');return value;},async setItem(key,value){const scoped=keyOf(key),account=await stores();if(!allowed())throw Error('This Spot journal is unavailable');await account.stores.conversationStore.setItem(scoped,value);if(!allowed())throw Error('This Spot journal is unavailable');},exclusive:(key,work)=>locks.request(keyOf(key),{signal:combined},async()=>{if(!allowed())throw Error('This Spot journal is unavailable');const value=await work();if(!allowed())throw Error('This Spot journal is unavailable');return value;})};
   const original=createCurrentSpotRelayClient({identity,spotId,rootId,isCurrent:allowed,signal:combined,journal,fetcher});let disposed=false;
   const dispose=()=>{if(disposed)return;disposed=true;combined.removeEventListener('abort',dispose);original.close();clients.delete(client);};
   const client=Object.freeze({...original,close:dispose});clients.add(client);combined.addEventListener('abort',dispose,{once:true});if(!allowed())dispose();return client;
  },close,
 });
}
