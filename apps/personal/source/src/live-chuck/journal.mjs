import{fail}from'./protocol.mjs';
import{captureOriginalUploadCommand,captureOriginalUploadBytes}from'./upload-command.mjs';
// Controller captures reorder object fields. CAS compares complete JSON data,
// preserving ordered arrays and all fields, rather than serializer key order.
function canonical(value){
 if(value===null)return'null';
 if(['string','boolean'].includes(typeof value)||typeof value==='number'&&Number.isFinite(value))return JSON.stringify(value);
 if(!value||typeof value!=='object')throw fail('pending-storage');
 const descriptors=Object.getOwnPropertyDescriptors(value),keys=Reflect.ownKeys(descriptors);
 if(Array.isArray(value)){
  if(keys.length!==value.length+1)throw fail('pending-storage');
  return'['+Array.from({length:value.length},(_,i)=>{const d=descriptors[i];if(!d||!Object.hasOwn(d,'value'))throw fail('pending-storage');return canonical(d.value);}).join(',')+']';
 }
 if(keys.some(key=>typeof key!=='string'||!Object.hasOwn(descriptors[key],'value')))throw fail('pending-storage');
 return'{'+keys.sort().map(key=>JSON.stringify(key)+':'+canonical(descriptors[key].value)).join(',')+'}';
}
const equal=(a,b)=>{try{return canonical(a)===canonical(b);}catch{return false;}};
/** One bounded unresolved command per authenticated account partition. IndexedDB
 * protects origin/transaction isolation; this makes NO encryption-at-rest claim.
 * Account partitioning is local hygiene, never server authorization. */
function createPendingJournal({indexedDB,databaseName}){
 if(!indexedDB)throw fail('pending-storage');
 let db;
 const database=()=>db??=(new Promise((resolve,reject)=>{const open=indexedDB.open(databaseName,databaseName==='crays-personal-chuck-pending-v1'?4:3);open.onupgradeneeded=()=>{if(!open.result.objectStoreNames.contains('pending'))open.result.createObjectStore('pending');if(!open.result.objectStoreNames.contains('archive'))open.result.createObjectStore('archive');if(!open.result.objectStoreNames.contains('context'))open.result.createObjectStore('context');if(databaseName==='crays-personal-chuck-pending-v1'&&!open.result.objectStoreNames.contains('original-payloads'))open.result.createObjectStore('original-payloads');};open.onsuccess=()=>{open.result.onversionchange=()=>{open.result.close();db=undefined;};resolve(open.result);};open.onerror=()=>reject(fail('pending-storage'));open.onblocked=()=>reject(fail('pending-storage'));}));
 const scope=value=>{if(typeof value!=='string'||!value.length||value.length>200)throw fail('pending-storage');return value;};
 const copy=value=>{const text=JSON.stringify(value);if(new TextEncoder().encode(text).length>65536)throw fail('pending-storage');return JSON.parse(text);};
 return Object.freeze({
  async claimContext(loginScope,canonicalScope){const key=scope(loginScope),value=scope(canonicalScope),connection=await database();return new Promise((resolve,reject)=>{let matched=false;const tx=connection.transaction('context','readwrite'),store=tx.objectStore('context'),request=store.get(key);request.onsuccess=()=>{if(request.result!==undefined&&request.result!==value)return;matched=true;if(request.result===undefined)store.add(value,key);};tx.oncomplete=()=>resolve(matched);tx.onabort=tx.onerror=()=>reject(fail('pending-storage'));});},
  async read(accountScope){const connection=await database();return new Promise((resolve,reject)=>{let result;const tx=connection.transaction('pending','readonly'),request=tx.objectStore('pending').get(scope(accountScope));request.onsuccess=()=>{result=request.result??null;};tx.oncomplete=()=>resolve(result);tx.onabort=tx.onerror=()=>reject(fail('pending-storage'));});},
  /** Same pending row/CAS as text, with exact immutable upload metadata and
   * binary payload in ONE transaction. Never create a parallel send slot.
   * Account partitions are local custody only, not authorization/encryption. */
  async saveOriginals(accountScope,next,payloads,expected){
   if(databaseName!=='crays-personal-chuck-pending-v1'||next?.status!=='prepared'||next.receipt!==null||Object.keys(next).sort().join(',')!=='command,receipt,status'||expected!==null&&expected?.status!=='stored')throw fail('pending-storage');
   const key=scope(accountScope),command=captureOriginalUploadCommand(next.command),value=copy({...next,command}),prior=expected===null?null:copy(expected);
   if(prior?.command?.idempotencyKey===command.idempotencyKey)throw fail('pending-storage');
   const bytes=await captureOriginalUploadBytes(command,payloads),connection=await database();
   return new Promise((resolve,reject)=>{
    let matched=false;const tx=connection.transaction(['pending','archive','original-payloads'],'readwrite'),pending=tx.objectStore('pending'),archive=tx.objectStore('archive'),originals=tx.objectStore('original-payloads'),request=pending.get(key);
    request.onsuccess=()=>{
     if(!equal(request.result??null,prior))return;
     const fileKey=[key,command.idempotencyKey],found=originals.get(fileKey);
     found.onsuccess=()=>{
      if(found.result!==undefined)return;
      const replace=()=>{originals.add({command,payloads:bytes},fileKey);pending.put(value,key);matched=true;};
      if(prior){const archiveKey=[key,prior.command.idempotencyKey],previous=archive.get(archiveKey);previous.onsuccess=()=>{if(previous.result!==undefined){tx.abort();return;}archive.add({record:prior,archivedAt:new Date().toISOString(),coreActionCancelled:false},archiveKey);replace();};}else replace();
     };
    };
    tx.oncomplete=()=>resolve(matched);tx.onabort=tx.onerror=()=>reject(fail('pending-storage'));
   });
  },
  /** Exact current or archived record must still match in the same readonly
   * transaction; verify stored byte hashes after reading. No local grant. */
  async readOriginals(accountScope,expected){
   if(databaseName!=='crays-personal-chuck-pending-v1'||!expected?.command)throw fail('pending-storage');
   const key=scope(accountScope),command=captureOriginalUploadCommand(expected.command),value=copy(expected),connection=await database();
   const saved=await new Promise((resolve,reject)=>{
    let result=null;const tx=connection.transaction(['pending','archive','original-payloads'],'readonly'),request=tx.objectStore('pending').get(key);
    const read=()=>{const payload=tx.objectStore('original-payloads').get([key,command.idempotencyKey]);payload.onsuccess=()=>{result=payload.result??null;};};
    request.onsuccess=()=>{if(equal(request.result??null,value))read();else{const archived=tx.objectStore('archive').get([key,command.idempotencyKey]);archived.onsuccess=()=>{if(archived.result?.coreActionCancelled===false&&equal(archived.result.record,value))read();};}};
    tx.oncomplete=()=>resolve(result);tx.onabort=tx.onerror=()=>reject(fail('pending-storage'));
   });
   if(!saved||!equal(saved.command,command))throw fail('pending-storage');
   try{return await captureOriginalUploadBytes(command,saved.payloads);}catch{throw fail('pending-storage');}
  },
  async save(accountScope,next,expected){const key=scope(accountScope),value=copy(next);const connection=await database();return new Promise((resolve,reject)=>{let matched=false;const tx=connection.transaction(['pending','archive'],'readwrite'),store=tx.objectStore('pending'),request=store.get(key);request.onsuccess=()=>{if(!equal(request.result??null,expected))return;const replace=()=>{matched=true;if(value===null)store.delete(key);else store.put(value,key);};if(expected?.status==='stored'&&expected.command?.idempotencyKey!==value?.command?.idempotencyKey){const previous=copy(expected),archive=tx.objectStore('archive'),archiveKey=[key,previous.command.idempotencyKey],found=archive.get(archiveKey);found.onsuccess=()=>{if(found.result!==undefined){tx.abort();return;}archive.add({record:previous,archivedAt:new Date().toISOString(),coreActionCancelled:false},archiveKey);replace();};}else replace();};tx.oncomplete=()=>resolve(matched);tx.onabort=tx.onerror=()=>reject(fail('pending-storage'));});},
  async archive(accountScope,expected){const key=scope(accountScope),value=copy(expected);if(!value?.command?.idempotencyKey)throw fail('pending-storage');const connection=await database();return new Promise((resolve,reject)=>{let matched=false;const tx=connection.transaction(['pending','archive'],'readwrite'),pending=tx.objectStore('pending'),archive=tx.objectStore('archive'),request=pending.get(key);request.onsuccess=()=>{if(!equal(request.result??null,expected))return;const archiveKey=[key,value.command.idempotencyKey],existing=archive.get(archiveKey);existing.onsuccess=()=>{if(existing.result!==undefined){tx.abort();return;}archive.add({record:value,archivedAt:new Date().toISOString(),coreActionCancelled:false},archiveKey);pending.delete(key);matched=true;};};tx.oncomplete=()=>resolve(matched);tx.onabort=tx.onerror=()=>reject(fail('pending-storage'));});},
  async restoreArchived(accountScope,expected){const key=scope(accountScope),value=copy(expected),command=value?.record?.command;if(!['crays-personal-chuck-pending-v1','crays-personal-chuck-workspace-actions-v1'].includes(databaseName)||value?.coreActionCancelled!==false||!['prepared','unknown'].includes(value?.record?.status)||value.record.receipt!==null||typeof command?.idempotencyKey!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(command.idempotencyKey))throw fail('pending-storage');const connection=await database();return new Promise((resolve,reject)=>{let result='archive-changed';const tx=connection.transaction(['pending','archive'],'readwrite'),pending=tx.objectStore('pending'),archive=tx.objectStore('archive'),current=pending.get(key);current.onsuccess=()=>{if(current.result!==undefined){result='active-request';return;}const archiveKey=[key,command.idempotencyKey],saved=archive.get(archiveKey);saved.onsuccess=()=>{if(!equal(saved.result,value))return;pending.add(value.record,key);archive.delete(archiveKey);result='restored';};};tx.oncomplete=()=>resolve(result);tx.onabort=tx.onerror=()=>reject(fail('pending-storage'));});},
  async readArchive(accountScope){const key=scope(accountScope),connection=await database();return new Promise((resolve,reject)=>{let result=[];const tx=connection.transaction('archive','readonly'),request=tx.objectStore('archive').getAll(IDBKeyRange.bound([key,''],[key,'\uffff']),50);request.onsuccess=()=>{result=request.result;};tx.oncomplete=()=>resolve(result);tx.onabort=tx.onerror=()=>reject(fail('pending-storage'));});},
  async readArchivePage(accountScope,{afterId}={}){const key=scope(accountScope);if(afterId!==undefined&&(typeof afterId!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(afterId)))throw fail('pending-storage');const connection=await database();return new Promise((resolve,reject)=>{let result=[];const tx=connection.transaction('archive','readonly'),request=tx.objectStore('archive').getAll(IDBKeyRange.bound([key,afterId??''],[key,'\uffff'],afterId!==undefined,false),51);request.onsuccess=()=>{result=request.result;};tx.oncomplete=()=>{const records=result.slice(0,50),hasMore=result.length>50;resolve({records,hasMore,nextAfterId:hasMore?records.at(-1).record.command.idempotencyKey:null});};tx.onabort=tx.onerror=()=>reject(fail('pending-storage'));});},
  async close(){const pending=db;db=undefined;if(pending){try{(await pending).close();}catch{/* An unsuccessful open has no connection to close. */}}},
 });
}

export function createChuckPendingJournal({indexedDB=globalThis.indexedDB,databaseName='crays-personal-chuck-pending-v1'}={}){if(databaseName!=='crays-personal-chuck-pending-v1')throw fail('pending-storage');return createPendingJournal({indexedDB,databaseName});}
export function createChuckTaskDecisionJournal({indexedDB=globalThis.indexedDB}={}){return createPendingJournal({indexedDB,databaseName:'crays-personal-chuck-task-decisions-v1'});}

export function createChuckWorkspaceActionJournal({indexedDB=globalThis.indexedDB}={}){return createPendingJournal({indexedDB,databaseName:'crays-personal-chuck-workspace-actions-v1'});}
