import {constants} from 'node:fs';
import {open,lstat,mkdir,unlink} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {nip19,getPublicKey,finalizeEvent,nip44,verifyEvent} from 'nostr-tools';
import {openEncryptedFileStore} from '../encryptedFileStore.mjs';
import {openOwnedGroupTestActor} from '../ownedGroupTestActor.mjs';
import {createRelayNetwork} from '../realRelayNetwork.mjs';
const hex=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const names=['groupStateStore','keyPackageStore','ingestStateStore','inviteStore','rewindStore','removedMarkerStore','conversationStore'];
async function privateDirectory(directory){try{await mkdir(directory,{mode:0o700});}catch(error){if(error.code!=='EEXIST')throw error;}const st=await lstat(directory);if(!st.isDirectory()||st.isSymbolicLink()||st.uid!==process.getuid()||(st.mode&0o077))throw Error('Protected test participant state required');}
async function readProtected(file,max){const handle=await open(file,constants.O_RDONLY|constants.O_NOFOLLOW);try{const st=await handle.stat();if(!st.isFile()||st.uid!==process.getuid()||(st.mode&0o077)||st.nlink!==1||st.size>max)throw Error('Protected existing test material required');return await handle.readFile();}finally{await handle.close();}}
/** Lazy real protocol actors for existing explicitly approved synthetic people.
 * Not a Core account provisioner, owner signer or user-facing permission port.
 * No public relay fallback; at most eight active actors, encrypted durable state.
 */
export function createOwnedGroupTestPeers({ownerPubkey,contacts,relays,readersBySpot,vaultPath,stateRoot,readGroups,assertRuntimeCurrent,createSocket=url=>new WebSocket(url),onApplication=async()=>{},maximumActive=8}){
 if(!hex(ownerPubkey)||!Array.isArray(contacts)||!Array.isArray(relays)||typeof readGroups!=='function'||typeof assertRuntimeCurrent!=='function'||!vaultPath?.startsWith('/')||!stateRoot?.startsWith('/')||!Number.isInteger(maximumActive)||maximumActive<1||maximumActive>8)throw Error('Explicit isolated participant context required');
 const peers=new Map(contacts.map(row=>[row.peerPubkey,row])),urls=new Map(relays.map(row=>[row.url,row.spotId])),active=new Map();let queue=Promise.resolve(),closed=false;
 const current=()=>{if(closed)throw Error('Test participant service closed');assertRuntimeCurrent();};
 async function stop(entry){entry.stop.abort();try{await entry.actor?.close();}finally{entry.network?.close();await Promise.all(Object.values(entry.stores).map(store=>store.close()));entry.key?.fill(0);if(entry.lock){const held=await entry.lock.stat(),actual=await lstat(entry.lockPath);if(held.dev!==actual.dev||held.ino!==actual.ino)throw Error('Test participant writer changed');await entry.lock.close();await unlink(entry.lockPath);}}}
 async function start(pubkey,requested){
  current();const row=peers.get(pubkey),spot=urls.get(requested);if(!row||!hex(pubkey)||pubkey===ownerPubkey||!spot||!readersBySpot[spot]?.includes(pubkey)||!/^ws:\/\/127\.0\.0\.1:18990\/spots\/crays-demo-01a1863a-v1-spot-[0-9]{4}$/.test(requested))throw Error('Existing admitted test participant required');
  const previous=active.get(pubkey);if(previous?.relays.includes(requested)){await previous.actor.refresh();active.delete(pubkey);active.set(pubkey,previous);return;}
  const selected=[...new Set([...(previous?.relays??[]),requested])];if(previous){active.delete(pubkey);await stop(previous);}
  if(active.size>=maximumActive){const [key,value]=active.entries().next().value;active.delete(key);await stop(value);}
  await privateDirectory(stateRoot);const directory=stateRoot+'/'+pubkey;await privateDirectory(directory);
  const entry={stop:new AbortController(),stores:{},relays:selected,lockPath:directory+'/.writer'};
  try{
   entry.lock=await open(entry.lockPath,'wx',0o600);await entry.lock.writeFile(String(process.pid));
   const raw=await readProtected(vaultPath,4*1024*1024);let document;
   try{document=JSON.parse(raw);if(document.syntheticOnly!==true||!Array.isArray(document.keys))throw Error('Existing isolated test vault required');const stored=document.keys.find(value=>value.id===row.peerId);const decoded=nip19.decode(stored?.nsec??'');if(decoded.type!=='nsec'||getPublicKey(decoded.data)!==pubkey)throw Error('Existing participant identity mismatch');entry.key=decoded.data;}finally{raw.fill(0);document=null;}
   current();const keyPath=directory+'/.state-key';let stateKey;
   try{stateKey=await readProtected(keyPath,32);}catch(error){if(error.code!=='ENOENT')throw error;stateKey=randomBytes(32);const file=await open(keyPath,'wx',0o600);try{await file.writeFile(stateKey);await file.sync();}finally{await file.close();}}
   if(stateKey.length!==32){stateKey.fill(0);throw Error('Protected participant state key required');}
   try{for(const name of [...names,'device'])entry.stores[name]=await openEncryptedFileStore({directory:directory+'/'+name,scope:'crays-existing-test-group:'+pubkey+':'+name,key:stateKey});}finally{stateKey.fill(0);}
   let slot=await entry.stores.device.getItem('publication-slot');if(slot===null){slot=randomBytes(32).toString('hex');await entry.stores.device.setItem('publication-slot',slot);}if(!hex(slot))throw Error('Stored test participant device required');
   const check=()=>{current();entry.stop.signal.throwIfAborted();};
   const signer={getPublicKey:async()=>{check();return pubkey;},signEvent:async event=>{check();return finalizeEvent(event,entry.key);},nip44:{encrypt:async(other,text)=>{check();return nip44.v2.encrypt(text,nip44.v2.utils.getConversationKey(entry.key,other));},decrypt:async(other,cipher)=>{check();return nip44.v2.decrypt(cipher,nip44.v2.utils.getConversationKey(entry.key,other));}}};
   entry.network=createRelayNetwork({relays:selected,createSocket,verifyEvent,onDisconnect:()=>{entry.reconnectPending=true;entry.actor?.requestReconnect();},expectedAuthPubkey:pubkey,signAuth:(relay,challenge)=>signer.signEvent({kind:22242,created_at:Math.floor(Date.now()/1000),content:'',tags:[['relay',relay],['challenge',challenge]]})});
   entry.actor=await openOwnedGroupTestActor({pubkey,ownerPubkey,deviceSlot:slot,signer,network:entry.network,stores:entry.stores,relays:selected,readGroups:async()=>{check();const groups=await readGroups(pubkey);check();return groups;},signal:entry.stop.signal,onApplication:async value=>{check();await onApplication({...value,pubkey});}});current();if(entry.reconnectPending)entry.actor.requestReconnect();active.set(pubkey,entry);
  }catch(error){await stop(entry);throw error;}
 }
 return Object.freeze({ensure(pubkey,relay){const work=queue.then(()=>start(pubkey,relay));queue=work.catch(()=>{});return work;},async close(){closed=true;await queue;const values=[...active.values()];active.clear();await Promise.all(values.map(stop));},getSnapshot:()=>Object.freeze({activeParticipants:active.size,connectedGroups:[...active.values()].reduce((sum,entry)=>sum+entry.actor.getSnapshot().connectedGroups,0),closed})});
}
