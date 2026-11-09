import {matchingHumanConversationAddress} from './humanConversationAddress.mjs';
import {openConversationTimer} from './conversationTimer.mjs';
import {createTimedConversationView} from './timedConversationView.mjs';
import {openConversationPrivateNote} from './conversationPrivateNote.mjs';
import {openConversationLocalView,validateConversationLocalViewRecord} from './conversationLocalView.mjs';
import {createCurrentHostSigner} from './currentHostSigner.mjs';
import {openAccountBrowserStores} from './accountBrowserStores.mjs';
import {openConversationDraft} from './conversationDraft.mjs';
const fields=['kind','accountId','conversationId','groupId','pubkey','membershipId'];
const scope=b=>JSON.stringify(fields.map(k=>b[k]));
/** Reuses the existing same-account key-wrapping signer and encrypted browser
 * journal. A random local AES key is NOT a second Nostr identity. The signed
 * self-wrapped envelope stays local; nothing is published to any relay. */
export function createHttpConversationDrafts({identity,signal,isCurrent,fetcher,openStores=openAccountBrowserStores,locks=globalThis.navigator?.locks,crypto=globalThis.crypto}){
 let closed=false,storage,opening;const controllers=new Map();
 const current=()=>!closed&&!signal.aborted&&isCurrent()===true;
 const check=()=>{if(!current())throw Error('Current private draft unavailable');};
 const provider=createCurrentHostSigner({accountId:identity.accountId,signal,isCurrent:current,fetcher,verifiedIdentity:identity});
 const signer=Object.freeze({...provider,binding:Object.freeze({accountId:identity.accountId,pubkey:identity.pubkey,bindingFingerprint:identity.bindingFingerprint})});
 const account={identity,accountId:identity.accountId,signal,signer};
 const beforeUnload=event=>{if(current()&&[...controllers.values()].some(c=>{const s=c.getSnapshot();return s.available&&(s.saving||s.problem||s.conflict);})){event.preventDefault();event.returnValue='';}};
 globalThis.addEventListener?.('beforeunload',beforeUnload);
 const close=()=>{if(closed)return;closed=true;signal.removeEventListener('abort',close);globalThis.removeEventListener?.('beforeunload',beforeUnload);for(const c of controllers.values())c.close();controllers.clear();storage?.close();provider.close();};
 signal.addEventListener('abort',close,{once:true});if(signal.aborted)close();
 async function stores(){check();if(storage)return storage;if(!opening)opening=openStores({account,isCurrent:current}).then(value=>{if(!current()){value.close();throw Error('Private draft locked');}storage=value;return value;}).catch(error=>{opening=null;throw error;});return opening;}
 const exclusive=async(address,operation,abort)=>{check();if(typeof locks?.request!=='function')throw Error('Safe private draft locking unavailable');const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(address))),b=>b.toString(16).padStart(2,'0')).join('');check();return locks.request('crays.composer:'+digest,{signal:abort},operation);};
 const readAddress=b=>{check();if(!matchingHumanConversationAddress(b)||b.accountId!==identity.accountId||b.pubkey!==identity.pubkey||![b.groupId,b.membershipId].every(v=>/^[a-f0-9]{64}$/.test(v)))throw Error('Current admitted read state required');return 'crays.inbox-read.v1:'+scope(b);};
 const validRead=value=>value===null||value?.version===1&&Array.isArray(value.ids)&&value.ids.length<=1000&&value.ids.every(v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v));
 const preferenceAddress=b=>{readAddress(b);return 'crays.inbox-preferences.v1:'+scope(b);};
 const preference=(value,b)=>{if(value===null)return {schema:1,scope:scope(b),archived:false};if(value?.schema!==1||value.scope!==scope(b)||typeof value.archived!=='boolean')throw Error('Saved conversation settings need review');return value;};
 return Object.freeze({
  async readTimerChanges(binding){
   readAddress(binding);const store=await stores();check();const controller=await openConversationTimer({binding,journal:store.stores.conversationStore,exclusive,authorize:current,signal});
   try{return controller.getSnapshot().changes;}finally{controller.close();}
  },
  async openTimedView({binding,client,signal:conversationSignal,authorize}){
   readAddress(binding);const selectedSignal=AbortSignal.any([signal,conversationSignal]),store=await stores();check();
   const allowed=()=>current()&&!selectedSignal.aborted&&authorize()===true;
   const timer=await openConversationTimer({binding,journal:store.stores.conversationStore,exclusive,authorize:allowed,signal:selectedSignal});
   if(!allowed()){timer.close();throw Error('Current admitted message timer required');}
   return createTimedConversationView({client,timer,signal:selectedSignal,authorize:allowed});
  },
  async openPrivateNote(workspace){
   const binding=workspace.binding;readAddress(binding);workspace.recheck();check();
   if(workspace.signal.aborted||!workspace.getSnapshot().client?.getSnapshot().available)throw Error('Current admitted contact required');
   const selectedSignal=AbortSignal.any([signal,workspace.signal]),store=await stores();check();
   return openConversationPrivateNote({binding,journal:store.stores.conversationStore,exclusive,signal:selectedSignal,authorize:()=>{try{workspace.recheck();return current()&&!selectedSignal.aborted&&workspace.getSnapshot().client?.getSnapshot().available===true;}catch{return false;}}});
  },
  async readLocalViewMarkers(binding){readAddress(binding);const store=await stores(),value=validateConversationLocalViewRecord(await store.stores.conversationStore.getItem('local-view:v1:'+scope(binding)),binding);check();return value.hiddenIds;},
  async openLocalView({binding,client,signal:selectionSignal,authorize}){readAddress(binding);check();const store=await stores();check();if(selectionSignal.aborted||authorize(binding)!==true)throw Error('Current admitted local view required');return openConversationLocalView({binding,client,journal:store.stores.conversationStore,exclusive,authorize:b=>current()&&authorize(b)===true,signal:selectionSignal});},
  async loadInboxPreferences(){const store=await stores();if(!store.stores.conversationStore.keys)return [];const result=[];for(const key of await store.stores.conversationStore.keys()){if(!key.startsWith('crays.inbox-preferences.v1:'))continue;const parts=JSON.parse(key.slice('crays.inbox-preferences.v1:'.length));if(!Array.isArray(parts)||parts.length!==6||!['person','spot','circle'].includes(parts[0])||parts[1]!==identity.accountId||parts[4]!==identity.pubkey)continue;const binding=Object.fromEntries(fields.map((field,index)=>[field,parts[index]]));const saved=preference(await store.stores.conversationStore.getItem(preferenceAddress(binding)),binding);check();result.push({conversationId:binding.conversationId,archived:saved.archived});if(result.length>1000)throw Error('Saved conversation settings exceed the inbox limit');}return result;},
  async readInboxPreference(binding){const address=preferenceAddress(binding),store=await stores();const result=preference(await store.stores.conversationStore.getItem(address),binding);check();return {archived:result.archived};},
  async setInboxArchived(binding,archived){if(typeof archived!=='boolean')throw Error('Choose archive or restore');const address=preferenceAddress(binding),store=await stores();return exclusive(address,async()=>{check();const previous=preference(await store.stores.conversationStore.getItem(address),binding);check();if(previous.archived!==archived){await store.stores.conversationStore.setItem(address,{...previous,archived});check();const saved=preference(await store.stores.conversationStore.getItem(address),binding);check();if(saved.archived!==archived)throw Error('Conversation settings changed. Try again.');}return {archived};},signal);},
  async readInboxMarkers(binding){const address=readAddress(binding),store=await stores();check();const value=await store.stores.conversationStore.getItem(address);check();if(!validRead(value))throw Error('Stored read state needs review');return value?.ids||[];},
  async saveInboxMarkers(binding,ids){const address=readAddress(binding);if(!Array.isArray(ids)||ids.length>1000||!ids.every(v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v)))throw Error('Valid read markers required');const store=await stores();return exclusive(address,async()=>{check();const original=await store.stores.conversationStore.getItem(address);check();if(!validRead(original))throw Error('Stored read state needs review');const merged=[...new Set([...(original?.ids||[]),...ids])].slice(-1000);if(JSON.stringify(merged)!==JSON.stringify(original?.ids)){await store.stores.conversationStore.setItem(address,{version:1,ids:merged});check();}return merged;},signal);},
  async open(binding){check();if(binding.accountId!==identity.accountId||binding.pubkey!==identity.pubkey)throw Error('Canonical draft account required');const id=scope(binding);if(controllers.has(id))return controllers.get(id);if(controllers.size>=1000)throw Error('Private draft limit reached');const store=await stores();check();const controller=await openConversationDraft({binding,journal:store.stores.conversationStore,exclusive,authorize:current,signal});check();if(controllers.has(id)){controller.close();return controllers.get(id);}controllers.set(id,controller);return controller;},
  get(workspace){check();const b=workspace.binding;if(b.accountId!==identity.accountId||b.pubkey!==identity.pubkey||workspace.signal.aborted)throw Error('Current admitted workspace required');return controllers.get(scope(b));},
  getForBinding(binding){readAddress(binding);return controllers.get(scope(binding));},
  revoke(conversationId){for(const [id,c]of controllers)if(c.binding.conversationId===conversationId){c.close();controllers.delete(id);}},close,
 });
}
