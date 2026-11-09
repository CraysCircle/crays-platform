import {createCipheriv,createDecipheriv,createHash,randomBytes} from 'node:crypto';
import {serialize,deserialize} from 'node:v8';
import {constants} from 'node:fs';
import {mkdir,lstat,open,rename,readdir,unlink} from 'node:fs/promises';
import path from 'node:path';

/** Node-side SDK state port. Caller must supply an admitted account/device namespace and protected key custody.
 * No password derivation, implicit key generation, owner-key discovery or browser export.
 * This is a candidate port, not production storage acceptance or cross-device synchronization.
 */
export async function openEncryptedFileStore({directory,scope,key,maxRecords=10000}){
 if(!Number.isInteger(maxRecords)||maxRecords<1||maxRecords>10000||!path.isAbsolute(directory)||typeof scope!=='string'||!scope||scope.length>300||!(key instanceof Uint8Array)||key.byteLength!==32)throw Error('Explicit private store scope and 256-bit key required');
 try{await mkdir(directory,{mode:0o700});}catch(e){if(e.code!=='EEXIST')throw e;}
 const info=await lstat(directory);if(!info.isDirectory()||info.isSymbolicLink()||(info.mode&0o077)||info.uid!==process.getuid())throw Error('Private store directory required');
 const scopePath=path.join(directory,'.scope-v1'),scopeDigest=createHash('sha256').update(scope).digest('hex');
 try{const marker=await open(scopePath,'wx',0o600);try{await marker.writeFile(scopeDigest);await marker.sync();}finally{await marker.close();}}catch(error){if(error.code!=='EEXIST')throw error;}
 const marker=await open(scopePath,constants.O_RDONLY|constants.O_NOFOLLOW);try{const info=await marker.stat();if(!info.isFile()||(info.mode&0o077)||info.uid!==process.getuid()||info.size!==64||await marker.readFile('utf8')!==scopeDigest)throw Error('Private directory belongs to another scope');}finally{await marker.close();}
 const secret=Buffer.from(key),maxBytes=16*1024*1024;let closed=false,closing=false,queue=Promise.resolve();
 const valid=k=>{if(typeof k!=='string'||!k||k.length>1000)throw Error('Invalid private record key');};
 const filename=k=>createHash('sha256').update(k).digest('hex')+'.enc';
 const assertOpen=()=>{if(closed||closing)throw Error('Private storage closed');};
 const aad=name=>Buffer.from(JSON.stringify(['crays.marmot-state.aes-gcm.v1',scope,name]));
 async function read(name){
  let f;try{f=await open(path.join(directory,name),constants.O_RDONLY|constants.O_NOFOLLOW);}catch(e){if(e.code==='ENOENT')return null;throw e;}
  try{
   const stat=await f.stat();if(!stat.isFile()||stat.size>maxBytes+32||stat.size<32||(stat.mode&0o077)||stat.uid!==process.getuid())throw Error('Invalid private storage record');
   const data=await f.readFile(),decipher=createDecipheriv('aes-256-gcm',secret,data.subarray(4,16));
   if(data.subarray(0,4).toString()!=='CRY1')throw Error('Unknown private record version');
   decipher.setAAD(aad(name));decipher.setAuthTag(data.subarray(16,32));
   let plaintext;let value;
   try{plaintext=Buffer.concat([decipher.update(data.subarray(32)),decipher.final()]);value=structuredClone(deserialize(plaintext));}finally{plaintext?.fill(0);}
   if(!value||typeof value.key!=='string'||filename(value.key)!==name)throw Error('Private record identity mismatch');
   return value;
  }finally{await f.close();}
 }
 const serializeWork=fn=>{try{assertOpen();}catch(e){return Promise.reject(e);}const work=queue.then(fn);queue=work.catch(()=>{});return work;};
 const syncDirectory=async()=>{const dir=await open(directory,'r');try{await dir.sync();}finally{await dir.close();}};
 const files=async()=>{const names=(await readdir(directory)).filter(n=>/^[0-9a-f]{64}\.enc$/.test(n));if(names.length>maxRecords)throw Error('Private store record bound exceeded');return names;};
 return {
  getItem:k=>serializeWork(async()=>{valid(k);const record=await read(filename(k));return record?record.value:null;}),
  setItem:(k,value)=>serializeWork(async()=>{
   valid(k);const names=await files();if(!names.includes(filename(k))&&names.length>=maxRecords)throw Error('Private store record bound exceeded');const plaintext=serialize({key:k,value});if(plaintext.length>maxBytes){plaintext.fill(0);throw Error('Private record too large');}
   const name=filename(k),nonce=randomBytes(12),cipher=createCipheriv('aes-256-gcm',secret,nonce);cipher.setAAD(aad(name));
   let ciphertext;try{ciphertext=Buffer.concat([cipher.update(plaintext),cipher.final()]);}finally{plaintext.fill(0);}
   const data=Buffer.concat([Buffer.from('CRY1'),nonce,cipher.getAuthTag(),ciphertext]);
   const temporary=path.join(directory,name+'.'+randomBytes(8).toString('hex')+'.tmp');
   try{
    const f=await open(temporary,'wx',0o600);try{await f.writeFile(data);await f.sync();}finally{await f.close();}
    await rename(temporary,path.join(directory,name));await syncDirectory();
   }catch(e){await unlink(temporary).catch(()=>{});throw e;}
   return value;
  }),
  removeItem:k=>serializeWork(async()=>{valid(k);await unlink(path.join(directory,filename(k))).catch(e=>{if(e.code!=='ENOENT')throw e;});await syncDirectory();}),
  keys:()=>serializeWork(async()=>{const keys=[];for(const name of await files()){const record=await read(name);if(record)keys.push(record.key);}return keys;}),
  clear:()=>serializeWork(async()=>{for(const name of await files())await unlink(path.join(directory,name));await syncDirectory();}),
  async close(){closing=true;await queue;closed=true;secret.fill(0);},
 };
}
