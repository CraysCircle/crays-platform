/** Atomic publication of a complete MDK database into the existing authenticated
 * account store. SQLite bytes never enter localStorage, a URL, logs or a relay.
 * Each chunk and both small manifests are encrypted by the supplied account
 * store. A root published LAST is the only committed generation. The caller
 * must await commit before releasing its corresponding MLS outbound events.
 */
const MAX=64*1024*1024,CHUNK=4*1024*1024;
const hex=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const problem=()=>Error('Private group storage is unavailable');
export function openMdkBrowserSnapshotStore({store,deviceSlot,bindingFingerprint,isCurrent,locks=globalThis.navigator?.locks,crypto=globalThis.crypto}){
 if(store?.durability!=='strict'||!store?.getItem||!store.setItem||!store.removeItem||!hex(deviceSlot)||!hex(bindingFingerprint)||typeof isCurrent!=='function'||typeof locks?.request!=='function'||!crypto?.subtle||!crypto.getRandomValues)throw problem();
 let closed=false;
 const check=()=>{if(closed||isCurrent()!==true)throw problem();};
 const prefix='crays:mdk-account-snapshot:v1:'+deviceSlot+':'+bindingFingerprint;
 const rootKey=prefix+':root',pendingKey=prefix+':pending';
 const digest=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
 const chunkKey=(generation,index)=>prefix+':'+generation+':'+index;
 const validGeneration=g=>typeof g==='string'&&/^[a-f0-9]{32}$/.test(g);
 const validate=value=>{
  if(value===null)return null;
  if(!value||value.version!==1||value.deviceSlot!==deviceSlot||value.bindingFingerprint!==bindingFingerprint||!validGeneration(value.generation)||!Number.isSafeInteger(value.revision)||value.revision<1||!Number.isSafeInteger(value.bytes)||value.bytes<512||value.bytes>MAX||!hex(value.sha256)||!Array.isArray(value.chunks)||value.chunks.length!==Math.ceil(value.bytes/CHUNK)||value.chunks.some(h=>!hex(h)))throw problem();
  return value;
 };
 const readRoot=async()=>{check();const value=await store.getItem(rootKey);check();return validate(value);};
 async function recover(root){
  check();const pending=await store.getItem(pendingKey);check();if(pending===null)return;
  if(!pending||pending.version!==1||!Array.isArray(pending.generations)||pending.generations.length>2)throw problem();
  for(const entry of pending.generations){
   if(!validGeneration(entry?.generation)||!Number.isInteger(entry.count)||entry.count<1||entry.count>16)throw problem();
   if(root?.generation===entry.generation)continue;
   for(let i=0;i<entry.count;i++){check();await store.removeItem(chunkKey(entry.generation,i));check();}
  }
  check();await store.removeItem(pendingKey);check();
 }
 const exclusive=work=>{try{check();}catch(error){return Promise.reject(error);}return locks.request(prefix,async()=>{check();return work();});};
 return Object.freeze({
  async load(){return exclusive(async()=>{
   const root=await readRoot();await recover(root);if(root===null)return{bytes:null,revision:0};
   const bytes=new Uint8Array(root.bytes);let offset=0;
   try{
    for(let i=0;i<root.chunks.length;i++){
     check();const chunk=await store.getItem(chunkKey(root.generation,i));check();
     try{if(!(chunk instanceof Uint8Array)||chunk.length!==Math.min(CHUNK,root.bytes-offset)||await digest(chunk)!==root.chunks[i])throw problem();check();bytes.set(chunk,offset);offset+=chunk.length;}finally{chunk?.fill?.(0);}
    }
    if(await digest(bytes)!==root.sha256)throw problem();check();return{bytes,revision:root.revision};
   }catch(error){bytes.fill(0);throw error;}
  });},
  async commit(bytes,expectedRevision){
   if(!(bytes instanceof Uint8Array)||bytes.length<512||bytes.length>MAX||!Number.isSafeInteger(expectedRevision)||expectedRevision<0||expectedRevision>=Number.MAX_SAFE_INTEGER)return Promise.reject(problem());
   const copy=bytes.slice();
   try{return await exclusive(async()=>{
    const old=await readRoot();await recover(old);
    if((old?.revision??0)!==expectedRevision)throw Error('Private group state changed; reopen this conversation');
    // A byte-identical snapshot is already durable only if its actual stored
    // chunks still verify. Never infer this from an operation name: reads may
    // hydrate or expire MLS state. Keep the original lock, revision CAS and
    // fresh account checks even for this no-write path.
    const sha256=await digest(copy);check();
    if(old?.bytes===copy.length&&old.sha256===sha256){
     let identical=true;
     for(let i=0;i<old.chunks.length;i++){
      check();const chunk=await store.getItem(chunkKey(old.generation,i));
      try{
       check();
       if(!(chunk instanceof Uint8Array)||chunk.length!==Math.min(CHUNK,copy.length-i*CHUNK)){identical=false;break;}
       const storedHash=await digest(chunk);check();
       if(storedHash!==old.chunks[i]){identical=false;break;}
       const inputHash=await digest(copy.subarray(i*CHUNK,Math.min(copy.length,(i+1)*CHUNK)));check();
       if(inputHash!==storedHash){identical=false;break;}
      }finally{chunk?.fill?.(0);}
     }
     check();if(identical)return Object.freeze({revision:old.revision,sha256});
     // A damaged stored generation is repaired by the unchanged root-last
     // commit below; it is never reported as a reusable durable snapshot.
    }
    const generation=Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');
    const count=Math.ceil(copy.length/CHUNK),chunks=[];
    const generations=[{generation,count},...(old?[{generation:old.generation,count:old.chunks.length}]:[])];
    await store.setItem(pendingKey,{version:1,generations});check();
    for(let i=0;i<count;i++){
     check();const chunk=copy.slice(i*CHUNK,Math.min(copy.length,(i+1)*CHUNK));
     try{chunks.push(await digest(chunk));check();await store.setItem(chunkKey(generation,i),chunk);check();}finally{chunk.fill(0);}
    }
    const root={version:1,deviceSlot,bindingFingerprint,generation,revision:expectedRevision+1,bytes:copy.length,chunks,sha256};
    check();await store.setItem(rootKey,root);check();
    // Keep the encrypted recovery journal until the next operation: a crash
    // before/after root publication can then clean only non-current chunks.
    return Object.freeze({revision:root.revision,sha256:root.sha256});
   });}finally{copy.fill(0);}
  },
  close(){closed=true;},
 });
}
