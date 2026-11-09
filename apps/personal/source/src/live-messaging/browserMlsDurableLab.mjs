/** Synthetic-only browser recovery fixture. The harness vault stores a non-exportable CryptoKey
 * locally solely to test IndexedDB MLS recovery. This is NOT the production unlock/recovery policy. */
import {openEncryptedBrowserStore} from './encryptedBrowserStore.mjs';
import {createSyntheticBrowserMlsActor} from './browserMlsLab.mjs';
import {generateSecretKey} from 'nostr-tools';
export async function openDurableSyntheticBrowserMlsActor(options){
 if(globalThis.__CRAYS_SYNTHETIC_MARMOT_LAB__!==true)throw Error('Synthetic browser lab only');
 const vault=await new Promise((resolve,reject)=>{const request=indexedDB.open('crays-synthetic-qualification-key-only',1);request.onupgradeneeded=()=>request.result.createObjectStore('test-key');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(Error('Synthetic fixture key unavailable'));});
 const read=()=>new Promise((resolve,reject)=>{const tx=vault.transaction('test-key'),r=tx.objectStore('test-key').get('synthetic-only');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
 let key=await read();if(!key){key=await crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);await new Promise((resolve,reject)=>{const tx=vault.transaction('test-key','readwrite');tx.objectStore('test-key').put(key,'synthetic-only');tx.oncomplete=resolve;tx.onabort=()=>reject(Error('Synthetic fixture key not saved'));});}vault.close();
 let active=true;const stores={};const open=name=>openEncryptedBrowserStore({scope:'synthetic-browser-lab:'+name,key,authorize:()=>active});
 let identity,secret;try{
  identity=await open('identity');secret=await identity.getItem('synthetic-identity');if(!secret){secret=generateSecretKey();await identity.setItem('synthetic-identity',secret);}await identity.close();identity=null;
  for(const name of ['groupStateStore','keyPackageStore','ingestStateStore','inviteStore','rewindStore','removedMarkerStore','conversationStore','historyStore'])stores[name]=await open(name);
  const actor=createSyntheticBrowserMlsActor({...options,identityKey:secret,durableStores:stores});
  const close=actor.close;actor.close=async()=>{try{await close();}finally{active=false;}};return actor;
 }catch(error){active=false;await Promise.allSettled([...(identity?[identity]:[]),...Object.values(stores)].map(store=>store.close()));throw error;}finally{secret?.fill(0);}
}
