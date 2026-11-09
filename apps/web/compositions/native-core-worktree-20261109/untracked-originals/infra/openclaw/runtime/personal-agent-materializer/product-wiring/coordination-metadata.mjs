import assert from 'node:assert/strict';
const integer=value=>{assert(typeof value==='bigint'||(typeof value==='number'&&Number.isSafeInteger(value)),'EXACT_COORDINATION_METADATA_REQUIRED');return BigInt(value);};
/** Only the five fixed original shared coordination files use this exact policy.
 * It is NOT a Root artifact/private-file permission relaxation and never chmods anything. */
export function assertOriginalCoordinationMetadata(observed,linked,kind='lock'){
 assert(kind==='lock'||kind==='registry','EXACT_COORDINATION_KIND_REQUIRED');
 const check=s=>{assert(s&&s.isFile()&&!s.isSymbolicLink(),'REGULAR_NOFOLLOW_COORDINATION_FILE_REQUIRED');assert.equal(integer(s.uid),BigInt(1000),'EXACT_COORDINATION_OWNER_REQUIRED');assert.equal(integer(s.gid),BigInt(1000),'EXACT_COORDINATION_GROUP_REQUIRED');assert.equal(integer(s.nlink),BigInt(1),'EXACT_COORDINATION_LINK_COUNT_REQUIRED');assert.equal(integer(s.mode)&BigInt('0o7777'),kind==='registry'?BigInt('0o600'):BigInt('0o664'),'EXACT_EXISTING_COORDINATION_MODE_REQUIRED');};
 check(observed);
 if(linked){check(linked);for(const key of['dev','ino','uid','gid','mode','nlink','size','mtimeMs','ctimeMs'])assert.equal(linked[key],observed[key],'COORDINATION_FILE_IDENTITY_CHANGED');}
 return true;
}

// The original append-only coordination history exceeds the former 1MiB cap.
// Keep a finite allocation/read bound, and detect growth or truncation before
// parsing. The caller still validates descriptor/path metadata after this read
// and all four original parent-held kernel locks; this function grants nothing.
export const MAX_COORDINATION_REGISTRY_BYTES=8*1024*1024;
export async function readOriginalCoordinationRegistry(opened,observed){
 assertOriginalCoordinationMetadata(observed,undefined,'registry');
 const size=integer(observed.size);
 assert(size>0n&&size<=BigInt(MAX_COORDINATION_REGISTRY_BYTES),'BOUNDED_COORDINATION_REGISTRY_REQUIRED');
 const buffer=Buffer.alloc(Number(size)+1);let offset=0;
 while(offset<buffer.length){const {bytesRead}=await opened.read(buffer,offset,buffer.length-offset,offset);if(bytesRead===0)break;offset+=bytesRead;}
 assert.equal(offset,Number(size),'COORDINATION_REGISTRY_SIZE_CHANGED');
 return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(buffer.subarray(0,offset)));
}
