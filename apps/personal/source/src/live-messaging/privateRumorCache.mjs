import {unwrapPrivateInboxEvent} from './ownedPrivateInbox.mjs';

/** Process-local verified originals, never a source of account or relay rights.
 * Every reuse requires the current admission, signer identity, exact ciphertext
 * and a caller-owned scope including its custody/admission version. No disk IO.
 */
export function createPrivateRumorCache({maxEntries=1024,maxBytes=8*1024*1024,ttlMs=120000,now=Date.now}={}){
 if(!Number.isInteger(maxEntries)||maxEntries<1||maxEntries>4096||!Number.isInteger(maxBytes)||maxBytes<1||maxBytes>32*1024*1024||!Number.isInteger(ttlMs)||ttlMs<1||ttlMs>300000||typeof now!=='function')throw Error('Invalid private cache limits');
 const rows=new Map();let bytes=0;
 function remove(key){const row=rows.get(key);if(row){bytes-=row.bytes;rows.delete(key);}}
 function prune(){const time=now();for(const [key,row]of rows)if(row.expires<=time)remove(key);while(rows.size>maxEntries||bytes>maxBytes)remove(rows.keys().next().value);}
 const check=fn=>{if(typeof fn!=='function'||fn()!==true)throw Error('Private conversation unavailable');};
 const freeze=value=>{if(value&&typeof value==='object'){for(const item of Object.values(value))freeze(item);Object.freeze(value);}return value;};
 return Object.freeze({
  async unwrap({scope,event,recipient,signer,isCurrent}){
   check(isCurrent);if(!Array.isArray(scope)||scope.length<1||scope.length>16||scope.some(v=>typeof v!=='string'||!v||v.length>512))throw Error('Invalid private cache scope');
   // Reading the signer identity also checks existing custody/file pins. A
   // previous decryption must never keep a revoked/replaced signer usable.
   if(await signer.getPublicKey()!==recipient)throw Error('Private conversation unavailable');check(isCurrent);
   const encoded=JSON.stringify(event);if(typeof encoded!=='string'||encoded.length>128*1024)throw Error('Private conversation unavailable');
   const key=JSON.stringify([scope,recipient,event?.id]);prune();const prior=rows.get(key);
   if(prior&&prior.encoded===encoded){check(isCurrent);rows.delete(key);rows.set(key,prior);return prior.rumor;}
   // Clone before verification: no inherited verifier Symbol or caller mutation.
   const rumor=freeze(await unwrapPrivateInboxEvent({event:JSON.parse(encoded),recipient,signer,isCurrent}));check(isCurrent);
   const size=new TextEncoder().encode(encoded+JSON.stringify(rumor)+key).length;remove(key);
   if(size<=maxBytes){rows.set(key,{encoded,rumor,bytes:size,expires:now()+ttlMs});bytes+=size;prune();}
   return rumor;
  },
  clear(){rows.clear();bytes=0;},
 });
}
