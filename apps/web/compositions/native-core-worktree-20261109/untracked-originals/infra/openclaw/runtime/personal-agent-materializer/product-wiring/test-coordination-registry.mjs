import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,open,rm,writeFile}from'node:fs/promises';
import {tmpdir}from'node:os';
import {join}from'node:path';
import {assertOriginalCoordinationMetadata,MAX_COORDINATION_REGISTRY_BYTES,readOriginalCoordinationRegistry}from'./coordination-metadata.mjs';
const metadata=(size=2)=>({isFile:()=>true,isSymbolicLink:()=>false,uid:1000,gid:1000,mode:0o100600,nlink:1,dev:1,ino:2,size,mtimeMs:1,ctimeMs:1});
function reader(bytes,chunk=Infinity){let read=0;return{get readCount(){return read;},async read(buffer,offset,length,position){read++;const n=Math.max(0,Math.min(length,bytes.length-position,chunk));bytes.copy(buffer,offset,position,position+n);return{bytesRead:n};}};}
test('registry requires original private0600; four lock files still require original0664',()=>{
 const registry=metadata();assert.equal(assertOriginalCoordinationMetadata(registry,{...registry},'registry'),true);
 assert.throws(()=>assertOriginalCoordinationMetadata(registry),/EXACT_EXISTING_COORDINATION_MODE_REQUIRED/);
 const lock={...registry,mode:0o100664};assert.equal(assertOriginalCoordinationMetadata(lock,{...lock}),true);
 assert.throws(()=>assertOriginalCoordinationMetadata(lock,undefined,'registry'),/EXACT_EXISTING_COORDINATION_MODE_REQUIRED/);
 assert.throws(()=>assertOriginalCoordinationMetadata(registry,undefined,'unexpected'),/EXACT_COORDINATION_KIND_REQUIRED/);
 for(const patch of[{uid:0},{gid:0},{mode:0o100640},{mode:0o104600},{nlink:2},{isSymbolicLink:()=>true},{isFile:()=>false}])assert.throws(()=>assertOriginalCoordinationMetadata({...registry,...patch},undefined,'registry'));
});
test('registry descriptor/path identity remains exact for registry policy',()=>{for(const patch of[{dev:2},{ino:3},{size:3},{mtimeMs:2},{ctimeMs:2}])assert.throws(()=>assertOriginalCoordinationMetadata(metadata(),{...metadata(),...patch},'registry'),/COORDINATION_FILE_IDENTITY_CHANGED/);});
test('actual private2.3MiB registry reads through real file descriptor without changing permissions',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'crays-coordination-test-'));let descriptor;
 try{const path=join(dir,'registry.json');const expected={heavy:[],padding:'x'.repeat(2331759)};await writeFile(path,JSON.stringify(expected),{mode:0o600});descriptor=await open(path,'r');const before=await descriptor.stat();assert.equal(before.uid,1000);assert.equal(before.mode&0o777,0o600);assert.deepEqual(await readOriginalCoordinationRegistry(descriptor,before),expected);const after=await descriptor.stat();assertOriginalCoordinationMetadata(before,after,'registry');}finally{if(descriptor)await descriptor.close();await rm(dir,{recursive:true,force:true});}
});
test('partial descriptor reads accumulate complete bounded JSON',async()=>{const bytes=Buffer.from(' {"heavy":[],"ok":true} ');assert.deepEqual(await readOriginalCoordinationRegistry(reader(bytes,3),metadata(bytes.length)),{heavy:[],ok:true});});
test('empty, oversized, negative and noninteger sizes reject before descriptor reads',async()=>{for(const size of[0,-1,MAX_COORDINATION_REGISTRY_BYTES+1,1.5]){const fd=reader(Buffer.from('{}'));await assert.rejects(readOriginalCoordinationRegistry(fd,metadata(size)));assert.equal(fd.readCount,0);}});
test('maximum admitted size is finite and parses exact original bytes',async()=>{const bytes=Buffer.alloc(MAX_COORDINATION_REGISTRY_BYTES,32);Buffer.from('{}').copy(bytes);assert.deepEqual(await readOriginalCoordinationRegistry(reader(bytes),metadata(bytes.length)),{});});
test('growth or truncation cannot silently adopt a different JSON body',async()=>{for(const bytes of[Buffer.from('{} '),Buffer.from('{')])await assert.rejects(readOriginalCoordinationRegistry(reader(bytes),metadata(2)),/COORDINATION_REGISTRY_SIZE_CHANGED/);});
test('invalid JSON and noncanonical invalid UTF8 reject',async()=>{for(const bytes of[Buffer.from('{broken}'),Buffer.from([0x7b,0x22,0x78,0x22,0x3a,0x22,0xff,0x22,0x7d])])await assert.rejects(readOriginalCoordinationRegistry(reader(bytes),metadata(bytes.length)));});
