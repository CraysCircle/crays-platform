import {originalMdkFormat} from './groupStorageFormat.mjs';
const identityFields=['accountId','pubkey','bindingFingerprint'];
const fields=[...identityFields,'contextId','kind','storageFormat'];
const failure=()=>Error('The current private group creation journal is unavailable');
/** Encrypted current-account persistence scoped to an independently admitted
 * creation context. This holds a pending public route, not MLS membership,
 * recipient admission or publication authority. No legacy journal fallback.
 */
export async function openMdkCreationJournal({binding:input,identity,store,getAdmission,isCurrent,signal,locks=globalThis.navigator?.locks,crypto=globalThis.crypto}){
 const binding=Object.freeze({...input,relays:Object.freeze([...(input?.relays??[])])});
 if(binding.storageFormat!==originalMdkFormat||!['spot','circle'].includes(binding.kind)||identityFields.some(key=>typeof binding[key]!=='string'||binding[key]!==identity?.[key])||!/^[a-f0-9]{64}$/.test(binding.pubkey)||!/^[a-f0-9]{64}$/.test(binding.bindingFingerprint)||!binding.accountId||binding.accountId.length>256||typeof binding.contextId!=='string'||!binding.contextId||binding.contextId.length>512||!binding.relays.length||binding.relays.length>20||new Set(binding.relays).size!==binding.relays.length||binding.relays.some(url=>{try{const value=new URL(url);return !['ws:','wss:'].includes(value.protocol)||value.username||value.password||value.hash;}catch{return true;}})||typeof getAdmission!=='function'||typeof isCurrent!=='function'||!signal?.addEventListener||!locks?.request||!crypto?.subtle||['getItem','setItem','removeItem'].some(key=>typeof store?.[key]!=='function'))throw failure();
 let closed=false;const lifetime=new AbortController();
 const close=()=>{if(closed)return;closed=true;lifetime.abort();signal.removeEventListener('abort',close);};
 const check=()=>{try{const grant=getAdmission();if(!closed&&!signal.aborted&&isCurrent()===true&&fields.every(key=>grant?.[key]===binding[key])&&JSON.stringify(grant.relays)===JSON.stringify(binding.relays))return;}catch{}close();throw failure();};
 signal.addEventListener('abort',close,{once:true});
 try{
  check();const scope=JSON.stringify(fields.map(key=>binding[key]).concat([binding.relays]));
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(scope));check();
  const prefix='mdk-current-creation:'+Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('')+':';
  const keyOf=key=>{check();if(typeof key!=='string'||!key||key.length>1024)throw failure();return prefix+key;};
  return Object.freeze({
   async getItem(key){const result=await store.getItem(keyOf(key));check();return result;},
   async setItem(key,value){const serialized=JSON.stringify(value);if(typeof serialized!=='string'||serialized.length>32768)throw failure();await store.setItem(keyOf(key),JSON.parse(serialized));check();},
   async removeItem(key){await store.removeItem(keyOf(key));check();},
   async exclusive(key,work){if(typeof work!=='function')throw failure();return locks.request(keyOf(key),{signal:lifetime.signal},async()=>{check();const result=await work();check();return result;});},
   close,
  });
 }catch(error){close();throw error;}
}
