/** Account-keyed local preview persistence only; never a Core account or remote store. */
const DATABASE='crays-personal-preview-storage-v1',STORE='snapshots',POINTER='crays-personal-preview-indexeddb-v1';
type Snapshot={schema:1;key:string;serialized:string};
const durableKeys=new Set<string>(),queues=new Map<string,Promise<void>>();
function keyAllowed(key:string){if(key!=='crays-unified-web-personal-v1'&&!key.startsWith('crays-unified-web-personal-v1:interactive-preview:'))throw Error('Invalid preview storage key.');}
function database():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{let finished=false;const request=indexedDB.open(DATABASE,1);request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(STORE))request.result.createObjectStore(STORE,{keyPath:'key'});};request.onerror=()=>{finished=true;reject(request.error||Error('Preview storage unavailable.'));};request.onblocked=()=>{finished=true;reject(Error('Close the other preview before retrying local storage.'));};request.onsuccess=()=>{if(finished){request.result.close();return;}finished=true;resolve(request.result);};});}
async function readSnapshot(key:string):Promise<Snapshot|undefined>{const db=await database();try{return await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly'),request=tx.objectStore(STORE).get(key);tx.oncomplete=()=>resolve(request.result);tx.onerror=tx.onabort=()=>reject(tx.error||Error('Preview read did not complete.'));});}finally{db.close();}}
async function writeSnapshot(record:Snapshot){const db=await database();try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(record);tx.oncomplete=()=>resolve();tx.onerror=tx.onabort=()=>reject(tx.error||Error('Preview save did not complete.'));});}finally{db.close();}}
/** Read durable originals before mounting; never let an old mirror replace them. */
export async function readPreviewSerialized(key:string):Promise<string|null>{
 keyAllowed(key);await queues.get(key)?.catch(()=>{});const record=await readSnapshot(key);
 if(record!==undefined){if(!record||record.schema!==1||record.key!==key||typeof record.serialized!=='string')throw Error('Saved preview needs review.');durableKeys.add(key);return record.serialized;}
 const raw=localStorage.getItem(key);if(raw!==null){let value:unknown;try{value=JSON.parse(raw);}catch{return raw;}if(value&&typeof value==='object'&&'storage'in value&&(value as {storage:unknown}).storage===POINTER)throw Error('The original saved preview is unavailable.');}return raw;
}
/** Commit complete snapshots in invocation order. Failed saves retain the prior original. */
export function writePreviewSerialized(key:string,serialized:string):Promise<void>{
 keyAllowed(key);const pending=(queues.get(key)||Promise.resolve()).catch(()=>{}).then(async()=>{
  if(!durableKeys.has(key)){try{localStorage.setItem(key,serialized);return;}catch{/* Atomic larger-store fallback; no history or private bytes removed. */}}
  await writeSnapshot({schema:1,key,serialized});durableKeys.add(key);
  // This small locator is only a mirror. Successful IDB commit remains authoritative.
  try{localStorage.setItem(key,JSON.stringify({storage:POINTER,key}));}catch{/* Read always checks the exact account key in IDB first. */}
 });queues.set(key,pending);void pending.finally(()=>{if(queues.get(key)===pending)queues.delete(key);}).catch(()=>{});return pending;
}
