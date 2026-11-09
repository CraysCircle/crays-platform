/** Fixed published first-party instructions only. No arbitrary manifest-name extension,
 * authority, installation admission or native mount proof. Legacy verifier is unchanged. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {readRootFile,sha} from './verify-shared-artifacts.mjs';
import FIXED from './approved-general-baseline-composition-v5-translation-video/FIXED_THREE_GUIDE_BINDINGS.json' with {type:'json'};
import BATCH from './translation-video-batch-v1/TRANSLATION_VIDEO_BINDINGS.json' with {type:'json'};

function expectedRows() {
 const w=FIXED.weather;
 return [{name:w.name,root:w.root,extraDir:w.extraDir,
  manifest:{relativePath:path.basename(w.publishedManifest.path),bytes:w.publishedManifest.bytes,sha256:w.publishedManifest.sha256},
  skill:{relativePath:'skills/'+w.name+'/SKILL.md',bytes:w.publishedGuide.bytes,sha256:w.publishedGuide.sha256},
  contentAddressing:'sha256-of-manifest'},
 ...BATCH.artifacts.map(a=>({name:a.name,root:a.root,extraDir:a.extraDir,
  manifest:{relativePath:a.manifestRelativePath,bytes:a.manifestBytes,sha256:a.manifestSha256},
  skill:{relativePath:a.relativePath,bytes:a.bytes,sha256:a.sha256},
  contentAddressing:'sha256-of-exact-SKILL.md'}))];
}
export function fixedGeneralGuideBindings() { return structuredClone(expectedRows()); }
async function directory(p) {
 const s=await fs.lstat(p);
 assert(s.isDirectory()&&!s.isSymbolicLink()&&s.uid===0&&(s.mode&0o022)===0,'FIXED_GUIDE_ROOT_DIRECTORY_REQUIRED');
 return s;
}
function sameDirectory(a,b) {
 assert(a.dev===b.dev&&a.ino===b.ino&&a.mode===b.mode&&a.uid===b.uid&&a.mtimeMs===b.mtimeMs&&a.ctimeMs===b.ctimeMs,'FIXED_GUIDE_DIRECTORY_CHANGED');
}
async function exactTree(row) {
 const dirs=[row.root,row.root+'/skills',row.root+'/skills/'+row.name];
 const snapshots=await Promise.all(dirs.map(directory));
 for(let i=0;i<dirs.length;i++) {
  const expected=i===0?[row.manifest.relativePath,'skills']:i===1?[row.name]:['SKILL.md'];
  const actual=await fs.readdir(dirs[i]);
  assert.deepEqual(actual.sort(),expected.sort(),'FIXED_GUIDE_EXACT_FILESET_REQUIRED');
 }
 return async()=>{for(let i=0;i<dirs.length;i++)sameDirectory(snapshots[i],await directory(dirs[i]));};
}
/** The caller supplies deployment rows, never names/paths from request/model input.
 * Exact equality against the three source-pinned rows is checked before any I/O. */
export async function verifyFixedGeneralGuides(rows) {
 assert.deepEqual(rows,expectedRows(),'EXACT_THREE_FIXED_GUIDES_REQUIRED');
 const skills=[];
 for(const row of expectedRows()) {
  const checkTree=await exactTree(row);
  const m=await readRootFile(row.root+'/'+row.manifest.relativePath,1024*1024);
  assert.equal(m.length,row.manifest.bytes,'FIXED_GUIDE_MANIFEST_LENGTH_MISMATCH');
  assert.equal(sha(m),row.manifest.sha256,'FIXED_GUIDE_MANIFEST_HASH_MISMATCH');
  const manifest=JSON.parse(m);
  assert.equal(manifest.name,row.name);
  assert.deepEqual(manifest.files.map(f=>({relativePath:f.relative??f.path,bytes:f.bytes,sha256:f.sha256})),[row.skill],'FIXED_GUIDE_MANIFEST_MEMBER_MISMATCH');
  const b=await readRootFile(row.root+'/'+row.skill.relativePath,128*1024);
  assert.equal(b.length,row.skill.bytes,'FIXED_GUIDE_CONTENT_LENGTH_MISMATCH');
  assert.equal(sha(b),row.skill.sha256,'FIXED_GUIDE_CONTENT_HASH_MISMATCH');
  assert.equal(path.basename(row.root),row.contentAddressing==='sha256-of-manifest'?row.manifest.sha256:row.skill.sha256);
  await checkTree();
  skills.push({skillId:row.name,name:row.name,contentSha256:row.skill.sha256,manifestSha256:row.manifest.sha256,root:row.root,files:1,bytes:row.skill.bytes});
 }
 return {skills,sha256:sha(JSON.stringify(skills)),nativeReadonlyAliasesVerified:false,authorityGranted:false};
}
