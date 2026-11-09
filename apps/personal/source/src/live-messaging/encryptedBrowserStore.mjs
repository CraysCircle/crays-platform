/** Browser MLS-state port. The caller supplies the current authorized scope and an unlocked,
 * non-exportable AES key. No implicit owner identity, password, recovery key or key persistence.
 * IndexedDB stores ciphertext only; browser/XSS/device and cross-device custody acceptance remain separate.
 */
const encoder=new TextEncoder(),decoder=new TextDecoder('utf-8',{fatal:true});
const LIMIT=16*1024*1024;
const nativeToBase64=Uint8Array.prototype.toBase64,nativeFromBase64=Uint8Array.fromBase64;
function pack(value,depth=0){
 if(depth>80)throw Error('Private record nesting exceeded');
 if(value===null||typeof value==='string'||typeof value==='boolean')return ['v',value];
 if(typeof value==='number'&&Number.isFinite(value))return ['v',value];
 if(value===undefined)return ['u'];
 if(typeof value==='bigint')return ['i',String(value)];
 if(value instanceof Uint8Array){if(value.byteLength>LIMIT)throw Error('Private record too large');if(typeof nativeToBase64==='function')return ['b',nativeToBase64.call(value)];let binary='';for(let i=0;i<value.length;i+=8192)binary+=String.fromCharCode(...value.subarray(i,i+8192));return ['b',btoa(binary)];}
 if(Array.isArray(value))return ['a',value.map(v=>pack(v,depth+1))];
 if(value instanceof Map)return ['m',[...value].map(([k,v])=>[pack(k,depth+1),pack(v,depth+1)])];
 if(value&&[Object.prototype,null].includes(Object.getPrototypeOf(value)))return ['o',Object.entries(value).map(([k,v])=>[k,pack(v,depth+1)])];
 throw Error('Unsupported private record type');
}
function unpack(node,depth=0){
 if(depth>80||!Array.isArray(node))throw Error('Invalid private record');
 const[tag,value]=node;
 if(tag==='v'&&(value===null||['string','boolean'].includes(typeof value)||typeof value==='number'&&Number.isFinite(value)))return value;
 if(tag==='u'&&node.length===1)return undefined;
 if(tag==='i'&&typeof value==='string'&&/^-?\d+$/.test(value))return BigInt(value);
 if(tag==='b'&&typeof value==='string'){if(typeof nativeFromBase64==='function')return nativeFromBase64.call(Uint8Array,value,{lastChunkHandling:'strict'});return Uint8Array.from(atob(value),s=>s.charCodeAt(0));}
 if(!Array.isArray(value))throw Error('Invalid private record');
 if(tag==='a')return value.map(v=>unpack(v,depth+1));
 if(tag==='m')return new Map(value.map(([k,v])=>[unpack(k,depth+1),unpack(v,depth+1)]));
 if(tag==='o'){const result={};for(const entry of value){if(!Array.isArray(entry)||entry.length!==2||typeof entry[0]!=='string')throw Error('Invalid private property');Object.defineProperty(result,entry[0],{value:unpack(entry[1],depth+1),enumerable:true,writable:true,configurable:true});}return result;}
 throw Error('Invalid private record');
}
export async function openEncryptedBrowserStore({databaseName='crays.messaging.encrypted.v1',scope,key,authorize,indexedDB=globalThis.indexedDB,crypto=globalThis.crypto,maxRecords=10000,durability='default'}){
 if(!['default','strict'].includes(durability))throw Error('Invalid private storage durability');
 if(typeof scope!=='string'||!scope||scope.length>300||typeof databaseName!=='string'||!databaseName||databaseName.length>200||typeof authorize!=='function'||!indexedDB||!crypto?.subtle||key?.type!=='secret'||key.extractable!==false||key.algorithm?.name!=='AES-GCM'||key.algorithm?.length!==256||!key.usages.includes('encrypt')||!key.usages.includes('decrypt')||!Number.isInteger(maxRecords)||maxRecords<1||maxRecords>10000)throw Error('Explicit authorized browser scope and non-exportable AES-256 key required');
 let closed=false,closing=false,queue=Promise.resolve(),directoryCacheBytes=0;const directoryCache=new Map();
 const admitted=()=>{if(closed||closing||authorize()!==true)throw Error('Private browser storage locked');};admitted();
 const hash=async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(text))),b=>b.toString(16).padStart(2,'0')).join('');
 const prefix=await hash(scope)+':';
 const db=await new Promise((resolve,reject)=>{let blocked=false;const request=indexedDB.open(databaseName,1);request.onupgradeneeded=()=>request.result.createObjectStore('records');request.onsuccess=()=>{if(blocked){request.result.close();return;}resolve(request.result);};request.onerror=()=>reject(Error('Private browser storage unavailable'));request.onblocked=()=>{blocked=true;reject(Error('Private browser storage blocked'));};});
 db.onversionchange=()=>{closed=true;db.close();};
 const range=()=>IDBKeyRange.bound(prefix,prefix+'\uffff');
 const transaction=(mode,work)=>new Promise((resolve,reject)=>{const tx=db.transaction('records',mode,mode==='readwrite'&&durability==='strict'?{durability:'strict'}:undefined),store=tx.objectStore('records');let result;tx.oncomplete=()=>resolve(result);tx.onabort=tx.onerror=()=>reject(Error('Private browser storage transaction failed'));try{work(store,tx,value=>result=value);}catch(error){tx.abort();reject(error);}});
 const read=address=>transaction('readonly',(store,tx,done)=>{const request=store.get(address);request.onsuccess=()=>done(request.result??null);});
 // The directory contains only encrypted record names. Listing must not
 // decrypt/deserialise full MLS snapshots and delivered application payloads.
 // Headers and values are written atomically in the same IndexedDB record.
 const directory=()=>transaction('readonly',(store,tx,done)=>{const rows=[],request=store.openCursor(range());request.onsuccess=()=>{const cursor=request.result;if(!cursor){done(rows);return;}if(rows.length>=maxRecords){tx.abort();return;}const record=cursor.value;rows.push({id:cursor.key,keyNonce:record?.keyNonce,keyCiphertext:record?.keyCiphertext});cursor.continue();};});
 const validate=k=>{if(typeof k!=='string'||!k||k.length>1000||!k.isWellFormed())throw Error('Invalid private record key');};
 const address=async k=>prefix+await hash(k);
 const aad=id=>encoder.encode(JSON.stringify(['crays.browser-state.aes-gcm.v1',scope,id]));
 async function decrypt(id,record){
  if(!record||record.version!==1||!(record.nonce instanceof Uint8Array)||record.nonce.length!==12||!(record.ciphertext instanceof ArrayBuffer)||record.ciphertext.byteLength>LIMIT+16)throw Error('Invalid encrypted browser record');
  const plaintext=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:record.nonce,additionalData:aad(id)},key,record.ciphertext));
  try{const value=unpack(JSON.parse(decoder.decode(plaintext)));if(!value||typeof value.key!=='string'||await address(value.key)!==id)throw Error('Private record identity mismatch');return value;}finally{plaintext.fill(0);}
 }
 const keyAAD=id=>encoder.encode(JSON.stringify(['crays.browser-state.directory.aes-gcm.v1',scope,id]));
 // Only authenticated small names are cached. Each lookup still obtains the
 // current IndexedDB header; nonce+ciphertext changes force authentication again.
 // No payload cache, cross-tab stale name cache or persistent plaintext index.
 const equalBytes=(a,b)=>a.length===b.length&&a.every((value,index)=>value===b[index]);
 const forget=id=>{const old=directoryCache.get(id);if(old){directoryCacheBytes-=old.bytes;directoryCache.delete(id);}};
 const remember=(row,name)=>{forget(row.id);const nonce=new Uint8Array(row.keyNonce),ciphertext=new Uint8Array(row.keyCiphertext),bytes=nonce.byteLength+ciphertext.byteLength+encoder.encode(name).byteLength+row.id.length*2;directoryCache.set(row.id,{name,nonce,ciphertext,bytes});directoryCacheBytes+=bytes;while(directoryCache.size>512||directoryCacheBytes>1024*1024)forget(directoryCache.keys().next().value);};
 async function directoryKey(row){
  // Retained v1 records are readable without an eager migration or rewrite.
  if(row.keyNonce===undefined&&row.keyCiphertext===undefined){const record=await read(row.id);return record===null?null:(await decrypt(row.id,record)).key;}
  if(!(row.keyNonce instanceof Uint8Array)||row.keyNonce.length!==12||!(row.keyCiphertext instanceof ArrayBuffer)||row.keyCiphertext.byteLength>4016)throw Error('Invalid encrypted browser directory');
  const cached=directoryCache.get(row.id);if(cached&&equalBytes(cached.nonce,row.keyNonce)&&equalBytes(cached.ciphertext,new Uint8Array(row.keyCiphertext))){directoryCache.delete(row.id);directoryCache.set(row.id,cached);return cached.name;}
  const plaintext=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:row.keyNonce,additionalData:keyAAD(row.id)},key,row.keyCiphertext));
  try{const name=decoder.decode(plaintext);validate(name);if(await address(name)!==row.id)throw Error('Private directory identity mismatch');remember(row,name);return name;}finally{plaintext.fill(0);}
 }
 const serial=fn=>{try{admitted();}catch(error){return Promise.reject(error);}const result=queue.then(async()=>{if(closed||authorize()!==true)throw Error('Private browser storage locked');return fn();});queue=result.catch(()=>{});return result;};
 return {
  durability,
  getItem:k=>serial(async()=>{validate(k);const id=await address(k),record=await read(id);const result=record===null?null:(await decrypt(id,record)).value;if(closed||authorize()!==true)throw Error('Private browser storage locked');return result;}),
  setItem:(k,value)=>{let copy;try{copy=structuredClone(value);}catch{return Promise.reject(Error('Unsupported private record type'));}return serial(async()=>{validate(k);const id=await address(k),plaintext=encoder.encode(JSON.stringify(pack({key:k,value:copy})));if(plaintext.length>LIMIT){plaintext.fill(0);throw Error('Private record too large');}const nonce=crypto.getRandomValues(new Uint8Array(12));let ciphertext;try{ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv:nonce,additionalData:aad(id)},key,plaintext);}finally{plaintext.fill(0);}const keyNonce=crypto.getRandomValues(new Uint8Array(12)),keyPlaintext=encoder.encode(k);let keyCiphertext;try{keyCiphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv:keyNonce,additionalData:keyAAD(id)},key,keyPlaintext);}finally{keyPlaintext.fill(0);}if(closed||authorize()!==true)throw Error('Private browser storage locked');await transaction('readwrite',(store,tx)=>{const existing=store.get(id);existing.onsuccess=()=>{const write=()=>{if(closed||authorize()!==true){tx.abort();return;}store.put({version:1,nonce,ciphertext,keyNonce,keyCiphertext},id);};if(existing.result!==undefined){write();return;}const count=store.count(range());count.onsuccess=()=>{if(count.result>=maxRecords)tx.abort();else write();};};});return copy;});},
  removeItem:k=>serial(async()=>{validate(k);const id=await address(k);if(closed||authorize()!==true)throw Error('Private browser storage locked');await transaction('readwrite',store=>store.delete(id));forget(id);}),
  keys:()=>serial(async()=>{const result=[];for(const row of await directory()){const name=await directoryKey(row);if(name!==null)result.push(name);if(closed||authorize()!==true)throw Error('Private browser storage locked');}return result;}),
  clear:()=>serial(async()=>{await transaction('readwrite',store=>store.delete(range()));directoryCache.clear();directoryCacheBytes=0;}),
  async close(){closing=true;await queue;closed=true;directoryCache.clear();directoryCacheBytes=0;db.close();},
 };
}
