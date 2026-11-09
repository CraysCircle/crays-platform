import {openMessagingDeviceSlot} from './messagingDeviceSlot.mjs';
import {verifyEvent} from 'nostr-tools';
import {openEncryptedBrowserStore} from './encryptedBrowserStore.mjs';

const names=Object.freeze(['groupStateStore','keyPackageStore','ingestStateStore','inviteStore','rewindStore','removedMarkerStore','conversationStore','historyStore']);
const encoder=new TextEncoder();
const hex=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const failure=()=>Error('Current account private storage could not be unlocked');
const sameKeys=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).sort().join(',')===[...keys].sort().join(',');

/** Existing verified account + nonexporting signer unlocks its own browser MLS
 * state. No Nostr key generation, nsec ingestion, server key custody or relay
 * publication. Only a random local AES data key is wrapped to the SAME Nostr
 * identity. Its NIP44 ciphertext is authenticated by an actual signed event.
 * The signed envelope stays local; it confers neither chat nor Spot admission.
 */
export async function openAccountBrowserStores({account,isCurrent,indexedDB=globalThis.indexedDB,crypto=globalThis.crypto,locks=globalThis.navigator?.locks,durability='default',databaseName='crays.messaging.account-keys.v1',dataDatabaseName='crays.messaging.encrypted.v1',dataKeyCache}){
 const identity=account?.identity,signer=account?.signer;
 if(!identity||typeof identity.accountId!=='string'||!/^[^\x00-\x20\x7f]{1,200}$/.test(identity.accountId)||!hex(identity.pubkey)||!hex(identity.bindingFingerprint)||identity.publicBindingVerified!==true||identity.emailVerificationRequired!==false||account.accountId!==identity.accountId||signer?.binding?.accountId!==identity.accountId||signer.binding.pubkey!==identity.pubkey||signer.binding.bindingFingerprint!==identity.bindingFingerprint||typeof signer.getPublicKey!=='function'||typeof signer.signEvent!=='function'||typeof signer.nip44?.encrypt!=='function'||typeof signer.nip44?.decrypt!=='function'||!account.signal?.addEventListener||typeof isCurrent!=='function'||!indexedDB||!crypto?.subtle||typeof locks?.request!=='function'||[databaseName,dataDatabaseName].some(value=>typeof value!=='string'||!value||value.length>200))throw failure();
 if(!['default','strict'].includes(durability))throw failure();
 if(dataKeyCache!==undefined&&typeof dataKeyCache?.get!=='function')throw failure();
 const binding=Object.freeze({accountId:identity.accountId,pubkey:identity.pubkey,bindingFingerprint:identity.bindingFingerprint});
 const lifetime=new AbortController(),opened=[];let closed=false,closeWork=Promise.resolve();
 const current=()=>{try{return !closed&&!account.signal.aborted&&!lifetime.signal.aborted&&isCurrent(binding)===true;}catch{return false;}};
 function close(){if(closed)return;closed=true;lifetime.abort();account.signal.removeEventListener('abort',close);closeWork=Promise.allSettled(opened.map(store=>store.close())).then(()=>{});}
 const assertCurrent=()=>{if(!current()){close();throw failure();}};
 account.signal.addEventListener('abort',close,{once:true});if(account.signal.aborted)close();
 let db;
 try{
  // Reading the encrypted envelope does not unlock private data. Its exact
  // account/public binding is validated below; the NIP44 decrypt (or encrypt
  // and sign on first use) freshly revalidates Core on both sides before a
  // usable AES key can be imported. Do not add a metadata-only HTTP round
  // trip before that already mandatory cryptographic authorization.
  assertCurrent();
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(JSON.stringify(['crays-private-browser-owner-v1',binding.accountId])))),byte=>byte.toString(16).padStart(2,'0')).join('');assertCurrent();
  db=await new Promise((resolve,reject)=>{const request=indexedDB.open(databaseName,1);request.onupgradeneeded=()=>request.result.createObjectStore('envelopes');request.onerror=()=>reject(failure());request.onblocked=()=>reject(failure());request.onsuccess=()=>{if(!current()){request.result.close();reject(failure());}else resolve(request.result);};});
  const transaction=(mode,operation)=>new Promise((resolve,reject)=>{
   assertCurrent();const tx=db.transaction('envelopes',mode);let value;
   tx.oncomplete=()=>{try{assertCurrent();resolve(value);}catch{reject(failure());}};tx.onerror=tx.onabort=()=>reject(failure());
   try{const request=operation(tx.objectStore('envelopes'));request.onsuccess=()=>{value=request.result;if(!current())tx.abort();};}catch{tx.abort();reject(failure());}
  });
  const payloadSchema='crays.private-browser-data-key.v1';
  const checkEvent=event=>sameKeys(event,['kind','created_at','tags','content','pubkey','id','sig'])&&event.pubkey===binding.pubkey&&event.kind===30078&&Number.isSafeInteger(event.created_at)&&event.created_at>=0&&event.created_at<=Math.floor(Date.now()/1000)+300&&JSON.stringify(event.tags)===JSON.stringify([['d','crays-private-browser-key:'+hash]])&&typeof event.content==='string'&&event.content.length>=132&&event.content.length<=8192&&verifyEvent(event);
  const unlock=()=>locks.request('crays.messaging.account-key:'+hash,{signal:lifetime.signal},async()=>{
   assertCurrent();let record=await transaction('readonly',store=>store.get(hash));assertCurrent();
   if(record!==undefined){
    // A changed identity or corrupt envelope is a recovery problem, never a
    // reason to replace the key and silently orphan all existing conversations.
    if(!sameKeys(record,['version','event'])||record.version!==1||!checkEvent(record.event))throw failure();
    const plaintext=await signer.nip44.decrypt(binding.pubkey,record.event.content);assertCurrent();
    if(typeof plaintext!=='string'||plaintext.length>2048)throw failure();
    const value=JSON.parse(plaintext);
    if(!sameKeys(value,['schema','accountId','pubkey','key'])||value.schema!==payloadSchema||value.accountId!==binding.accountId||value.pubkey!==binding.pubkey||typeof value.key!=='string'||!/^[A-Za-z0-9+/]{43}=$/.test(value.key))throw failure();
    const raw=Uint8Array.from(atob(value.key),part=>part.charCodeAt(0));
    try{if(raw.byteLength!==32)throw failure();const key=await crypto.subtle.importKey('raw',raw,{name:'AES-GCM'},false,['encrypt','decrypt']);assertCurrent();return key;}finally{raw.fill(0);}
   }
   const raw=crypto.getRandomValues(new Uint8Array(32));
   try{
    const key=await crypto.subtle.importKey('raw',raw,{name:'AES-GCM'},false,['encrypt','decrypt']);assertCurrent();
    const encoded=btoa(String.fromCharCode(...raw));
    const content=await signer.nip44.encrypt(binding.pubkey,JSON.stringify({schema:payloadSchema,accountId:binding.accountId,pubkey:binding.pubkey,key:encoded}));assertCurrent();
    const event=await signer.signEvent({kind:30078,created_at:Math.floor(Date.now()/1000),tags:[['d','crays-private-browser-key:'+hash]],content});assertCurrent();
    if(!checkEvent(event))throw failure();
    // add, not put: even a non-cooperating competing writer cannot cause an
    // existing account's envelope to be overwritten by this creation attempt.
    await transaction('readwrite',store=>store.add({version:1,event},hash));assertCurrent();return key;
   }finally{raw.fill(0);}
  });
  const dataKey=dataKeyCache?await dataKeyCache.get({binding,namespace:databaseName,signal:lifetime.signal,isCurrent:current},unlock):await unlock();
  assertCurrent();db.close();db=null;
  const stores={};
  for(const name of names){
   const store=await openEncryptedBrowserStore({databaseName:dataDatabaseName,scope:JSON.stringify(['crays-current-messaging-v1',hash,binding.pubkey,name]),key:dataKey,authorize:current,indexedDB,crypto,durability});opened.push(store);assertCurrent();stores[name]=store;
  }
  const deviceSlot=await openMessagingDeviceSlot({store:stores.conversationStore,locks,scope:hash,isCurrent:current,crypto});assertCurrent();
  return Object.freeze({deviceSlot,stores:Object.freeze(stores),signal:lifetime.signal,close,async settled(){await closeWork;}});
 }catch{close();await closeWork;throw failure();}
 finally{db?.close();}
}
