/** Server-only fixed OS credential consumer. No credential generation/delivery, env fallback or caller paths. */
import {constants} from 'node:fs';
import {open,readFile,realpath,stat,lstat} from 'node:fs/promises';
import {isAbsolute,resolve,join} from 'node:path';
const denied=()=>{throw Error('OS_CREDENTIAL_CUSTODY_UNAVAILABLE');};
const exact=(x,keys)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));
const same=(a,b)=>['dev','ino','uid','gid','mode','nlink','size','mtimeNs','ctimeNs'].every(k=>a[k]===b[k]);
const owner=s=>s.uid===0n||s.uid===BigInt(process.getuid());
const serviceName=s=>typeof s==='string'&&/^[A-Za-z0-9_.@:-]+\.service$/.test(s);
/** Pure parser, useful for synthetic metadata tests. The production reader supplies actual /proc metadata. */
export function hasExactReadonlyCredentialMount(directory,service,mountInfo){
 if(!serviceName(service)||directory!=='/run/credentials/'+service||typeof mountInfo!=='string'||mountInfo.length>4*1024*1024)return false;
 const rows=mountInfo.split('\n').map(x=>x.split(' ')).filter(x=>x[4]===directory);if(rows.length!==1)return false;
 const m=rows[0],sep=m.indexOf('-');return sep>5&&['tmpfs','ramfs'].includes(m[sep+1])&&['ro','nosuid','nodev','noexec'].every(flag=>m[5].split(',').includes(flag));
}
/** Bounded private-file primitive. Does not establish an OS mount or issue authority.
 * Production composition below ALWAYS requires a genuine exact readonly mount independently.
 * Callback owns no buffer past its await; every temporary material buffer is cleared in finally. */
export async function withPrivateCredentialFile({directory,filename,minimumBytes,maximumBytes,exactBytes=null,systemdAcl=false,assertCurrent},callback){
 if(typeof directory!=='string'||!isAbsolute(directory)||resolve(directory)!==directory||typeof filename!=='string'||!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/.test(filename)||!Number.isSafeInteger(minimumBytes)||!Number.isSafeInteger(maximumBytes)||minimumBytes<1||maximumBytes<minimumBytes||maximumBytes>16384||typeof assertCurrent!=='function'||typeof callback!=='function')denied();
 let file,bytes,view;try{
  await assertCurrent();if(await realpath(directory)!==directory)denied();const beforeDir=await lstat(directory,{bigint:true});
  if(!beforeDir.isDirectory()||!owner(beforeDir)||!((beforeDir.mode&0o077n)===0n||(systemdAcl&&beforeDir.uid===0n&&beforeDir.gid===0n&&(beforeDir.mode&0o027n)===0n)))denied();
  file=await open(join(directory,filename),constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);const before=await file.stat({bigint:true});
  if(!before.isFile()||!owner(before)||before.nlink!==1n||before.size<BigInt(minimumBytes)||before.size>BigInt(maximumBytes)||exactBytes!==null&&before.size!==BigInt(exactBytes)||!((before.mode&0o077n)===0n||(systemdAcl&&before.uid===0n&&before.gid===0n&&(before.mode&0o037n)===0n)))denied();
  bytes=Buffer.alloc(maximumBytes+1);let length=0;while(length<bytes.length){const r=await file.read(bytes,length,bytes.length-length,null);if(!r.bytesRead)break;length+=r.bytesRead;}
  const after=await file.stat({bigint:true}),pathStat=await lstat(join(directory,filename),{bigint:true}),afterDir=await lstat(directory,{bigint:true});
  if(!after.isFile()||!pathStat.isFile()||!same(before,after)||!same(before,pathStat)||!same(beforeDir,afterDir)||length!==Number(before.size)||length>maximumBytes)denied();
  await assertCurrent();view=bytes.subarray(0,length);const result=await callback(view);await assertCurrent();return result;
 }catch{denied();}finally{view?.fill(0);bytes?.fill(0);await file?.close().catch(()=>{});}
}
/** Trusted host-only constructor; never accept this policy or callbacks from model/browser JSON.
 * getPolicy returns the SAME frozen object until host rotation/revocation; replacing it revokes
 * every outstanding operation. Map keys are opaque references, values fixed basenames ONLY.
 * Old refs stay explicitly mapped for decrypt; currentKeyRef selects only the new write key.
 */
export function createOsCredentialCustody({getPolicy,assertHostCurrent}){
 if(typeof getPolicy!=='function'||typeof assertHostCurrent!=='function')denied();
 function capture(){const p=getPolicy();if(!exact(p,['schema','service','directory','currentKeyRef','keys','appSecrets'])||p.schema!=='crays.os-oauth-custody.v1'||!Object.isFrozen(p)||!Object.isFrozen(p.keys)||!Object.isFrozen(p.appSecrets)||!serviceName(p.service)||p.directory!=='/run/credentials/'+p.service||!exactMap(p.keys,'keyref:')||!exactMap(p.appSecrets,'appref:')||typeof p.currentKeyRef!=='string'||!Object.hasOwn(p.keys,p.currentKeyRef)||new Set([...Object.values(p.keys),...Object.values(p.appSecrets)]).size!==Object.keys(p.keys).length+Object.keys(p.appSecrets).length)denied();return p;}
 function exactMap(map,prefix){if(!map||typeof map!=='object'||Array.isArray(map)||Object.getPrototypeOf(map)!==Object.prototype||Object.keys(map).length>64)return false;return Object.entries(map).every(([ref,name])=>ref.startsWith(prefix)&&/^(keyref|appref):[A-Za-z0-9._/-]{1,200}$/.test(ref)&&typeof name==='string'&&/^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/.test(name))&&new Set(Object.values(map)).size===Object.keys(map).length;}
 async function current(p){await assertHostCurrent();if(getPolicy()!==p)denied();const d=await stat(p.directory,{bigint:true});if(d.uid!==0n||d.gid!==0n||!d.isDirectory()||await realpath(p.directory)!==p.directory||!hasExactReadonlyCredentialMount(p.directory,p.service,await readFile('/proc/self/mountinfo','utf8')))denied();await assertHostCurrent();if(getPolicy()!==p)denied();}
 async function consume(kind,ref,operation){const p=capture();if(typeof operation!=='function'||typeof ref!=='string'||!Object.hasOwn(p[kind],ref))denied();await current(p);return withPrivateCredentialFile({directory:p.directory,filename:p[kind][ref],minimumBytes:kind==='keys'?32:1,maximumBytes:kind==='keys'?32:16384,exactBytes:kind==='keys'?32:null,systemdAcl:true,assertCurrent:()=>current(p)},async bytes=>{
   if(kind==='keys')return await operation(bytes);
   // Canonical OAuth transport requires a JS string. It cannot be reliably zeroed by JS;
   // only short-lived callback scope is promised, never string-memory erasure.
   const secret=new TextDecoder('utf-8',{fatal:true}).decode(bytes);if(!secret.length||secret.length>16384||secret.includes('\0'))denied();return await operation(secret);
 });}
 return Object.freeze({keys:Object.freeze({async currentKeyRef(){const p=capture();await current(p);return p.currentKeyRef;},withKey:(ref,operation)=>consume('keys',ref,operation)}),readAppSecret:(ref,operation)=>consume('appSecrets',ref,operation)});
}
