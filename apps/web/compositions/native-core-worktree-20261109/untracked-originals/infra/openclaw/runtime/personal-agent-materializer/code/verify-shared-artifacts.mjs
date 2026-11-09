import assert from 'node:assert/strict';
import fs from 'node:fs/promises';import {constants as C}from'node:fs';import path from'node:path';import{createHash}from'node:crypto';
export const sha=b=>createHash('sha256').update(b).digest('hex');
const hex=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
export async function readRootFile(file,cap=16*1024*1024){
 assert(path.isAbsolute(file));for(let p=path.dirname(file);p!=='/';p=path.dirname(p)){const s=await fs.lstat(p);assert(s.isDirectory()&&!s.isSymbolicLink()&&s.uid===0&&(s.mode&0o022)===0,'ROOT_PARENT_REQUIRED');}
 const f=await fs.open(file,C.O_RDONLY|C.O_NOFOLLOW);try{const s=await f.stat();assert(s.isFile()&&s.nlink===1&&s.uid===0&&(s.mode&0o022)===0&&s.size<=cap,'ROOT_PINNED_FILE_REQUIRED');const b=await f.readFile();const after=await f.stat(),linked=await fs.lstat(file);assert(b.length===s.size&&after.size===s.size&&after.dev===s.dev&&after.ino===s.ino&&after.mtimeMs===s.mtimeMs&&after.ctimeMs===s.ctimeMs&&linked.dev===s.dev&&linked.ino===s.ino&&!linked.isSymbolicLink(),'ARTIFACT_CHANGED_DURING_READ');return b;}finally{await f.close();}
}
function name(r){const n=r.path??r.relative;assert(typeof n==='string'&&n.length<=512&&!path.isAbsolute(n)&&n.split('/').every(x=>x&&x!=='.'&&x!=='..'),'INVALID_ARTIFACT_MEMBER');return n;}
function canonicalRows(rows){return rows.map(r=>({relative:name(r),bytes:r.bytes,sha256:r.sha256})).sort((a,b)=>a.relative.localeCompare(b.relative));}
async function tree(root,prefix=''){const out=[];for(const d of await fs.readdir(path.join(root,prefix),{withFileTypes:true})){const n=prefix?prefix+'/'+d.name:d.name;assert(!d.isSymbolicLink(),'NO_ARTIFACT_SYMLINK');const s=await fs.lstat(path.join(root,n));assert(s.uid===0&&(s.mode&0o022)===0,'ROOT_NOT_UNTRUSTED_WRITABLE_REQUIRED');if(d.isDirectory())out.push(...await tree(root,n));else{assert(d.isFile()&&s.nlink===1,'REGULAR_ARTIFACT_REQUIRED');out.push(n);}}return out;}
async function verify(root,digest,expectedRows,manifestName='CRAYS_ARTIFACT_MANIFEST.json'){assert(['CRAYS_ARTIFACT_MANIFEST.json','CRAYS_SKILL_ARTIFACT_MANIFEST.json'].includes(manifestName));
 assert(root.startsWith('/opt/crays/openclaw/')&&hex(digest));const rootMeta=await fs.lstat(root);assert(rootMeta.isDirectory()&&!rootMeta.isSymbolicLink()&&rootMeta.uid===0&&(rootMeta.mode&0o022)===0,'ROOT_PINNED_DIRECTORY_REQUIRED');const raw=await readRootFile(root+'/'+manifestName,1024*1024);assert.equal(sha(raw),digest,'MANIFEST_HASH_MISMATCH');const m=JSON.parse(raw);assert(Array.isArray(m.files)&&m.files.length>0&&m.files.length<=4096,'ARTIFACT_FILE_LIMIT');
 const rows=canonicalRows(m.files);assert.equal(new Set(rows.map(r=>r.relative)).size,rows.length);if(expectedRows)assert.deepEqual(rows,canonicalRows(expectedRows),'DESCRIPTOR_FILES_MISMATCH');
 assert.deepEqual((await tree(root)).sort(),[...rows.map(r=>r.relative),manifestName].sort(),'ARTIFACT_FILESET_MISMATCH');let bytes=0;
 for(const r of rows){assert(Number.isSafeInteger(r.bytes)&&r.bytes>=0&&hex(r.sha256));bytes+=r.bytes;assert(bytes<=128*1024*1024,'ARTIFACT_TOTAL_LIMIT');const data=await readRootFile(root+'/'+r.relative);assert.equal(data.length,r.bytes);assert.equal(sha(data),r.sha256,'ARTIFACT_CONTENT_MISMATCH');}
 return {manifestSha256:digest,root,files:rows.length,bytes};
}
/** Trusted host catalogue only; never caller-selected paths or digests. UID0 checks have no test bypass. */
export async function verifySharedArtifacts(standard,catalog){
 assert.equal(catalog.packageSha256,standard.sha256);assert.equal(catalog.plugins.length,standard.descriptor.plugins.length);const plugins=[];
 for(const p of standard.descriptor.plugins){const c=catalog.plugins.filter(x=>x.pluginId===p.id);assert.equal(c.length,1,'UNKNOWN_ARTIFACT');const expected=p.expectedArtifactManifestSha256??p.knownInstalledManifestSha256;assert(hex(expected),'UNKNOWN_DESCRIPTOR_MANIFEST');assert.equal(c[0].manifestSha256,expected);assert.equal(c[0].root,p.artifactRoot+'/'+expected);plugins.push({pluginId:p.id,...await verify(c[0].root,expected,p.files)});}
 const skills=[];for(const s of catalog.skills){assert(!skills.some(x=>x.skillId===s.skillId));const v=await verify(s.root,s.manifestSha256,undefined,s.manifestName);const raw=await readRootFile(s.root+'/skills/'+s.skillId+'/SKILL.md',128*1024);assert.equal(sha(raw),s.contentSha256);skills.push({skillId:s.skillId,name:s.name??s.skillId,contentSha256:s.contentSha256,...v});}
 return {plugins,skills,sha256:sha(JSON.stringify({plugins,skills}))};
}
