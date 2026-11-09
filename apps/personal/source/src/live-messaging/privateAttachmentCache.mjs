// Only authenticated ciphertext is stored. No filenames, keys, plaintext or URLs.
const LIMIT=128*1024*1024;
export function createPrivateAttachmentCache({indexedDB=globalThis.indexedDB,crypto=globalThis.crypto,maxBytes=LIMIT}={}){
 let opening;
 const digest=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
 const open=()=>opening??=(new Promise((resolve,reject)=>{
  if(!indexedDB){reject(Error('Storage unavailable'));return;}
  const request=indexedDB.open('crays-private-attachment-ciphertext-v1',1);
  request.onupgradeneeded=()=>request.result.createObjectStore('files',{keyPath:'id'});
  request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>{db.close();opening=undefined;};resolve(db);};
  request.onerror=()=>reject(request.error);request.onblocked=()=>reject(Error('Storage blocked'));
 })).catch(error=>{opening=undefined;throw error;});
 const key=scope=>digest(new TextEncoder().encode(JSON.stringify(scope)));
 async function transaction(mode,action){const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('files',mode);let result;tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);action(tx.objectStore('files'),value=>{result=value;});});}
 // Usage is advisory: never redownload verified bytes just because this write
 // failed, and never resurrect a row evicted while its hash was being checked.
 async function touch(id){try{await transaction('readwrite',store=>{const request=store.get(id);request.onsuccess=()=>{if(request.result)store.put({...request.result,used:Date.now()});};});}catch{}}
 return Object.freeze({
  async readBounded(scope,hash,limit){try{if(!/^[a-f0-9]{64}$/.test(hash)||!Number.isSafeInteger(limit)||limit<17||limit>maxBytes)return null;const id=await key(scope),row=await transaction('readonly',(store,done)=>{const request=store.get(id);request.onsuccess=()=>done(request.result);});if(!row)return null;const bytes=new Uint8Array(row.data);if(bytes.length<17||bytes.length>limit||await digest(bytes)!==hash){await transaction('readwrite',store=>store.delete(id));return null;}await touch(id);return bytes;}catch{return null;}},
  async read(scope,hash,size){try{const id=await key(scope);const row=await transaction('readonly',(store,done)=>{const r=store.get(id);r.onsuccess=()=>done(r.result);});if(!row)return null;const bytes=new Uint8Array(row.data);if(bytes.length!==size||await digest(bytes)!==hash){await transaction('readwrite',store=>store.delete(id));return null;}await touch(id);return bytes;}catch{return null;}},
  async write(scope,hash,data){try{if(!(data instanceof Uint8Array)||data.length>maxBytes||await digest(data)!==hash)return false;const id=await key(scope),copy=data.slice().buffer;await transaction('readwrite',store=>{const r=store.getAll();r.onsuccess=()=>{const rows=r.result.filter(row=>row.id!==id).sort((a,b)=>a.used-b.used);let total=rows.reduce((n,row)=>n+row.data.byteLength,0)+copy.byteLength;for(const row of rows){if(total<=maxBytes)break;store.delete(row.id);total-=row.data.byteLength;}store.put({id,data:copy,used:Date.now()});};});return true;}catch{return false;}},
 });
}
export const privateAttachmentCache=createPrivateAttachmentCache();
