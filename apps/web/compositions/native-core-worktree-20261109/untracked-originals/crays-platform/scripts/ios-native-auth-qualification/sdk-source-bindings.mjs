// Qualification-only immutable public SDK binding. Never discovers owner state,
// credentials, device identities or provider profiles; never connects to live18789.
import assert from 'node:assert/strict';
import {readFileSync,lstatSync,realpathSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
const manifest=JSON.parse(readFileSync(new URL('./sdk-source-bindings.json',import.meta.url),'utf8'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
assert.equal(manifest.schema,'crays.native-qualification.actual-owner-sdk-source.v1');
assert.equal(manifest.version,'2026.10.4');
assert.equal(manifest.root,'/opt/crays/openclaw/dependency-artifacts/sdk4-complete/2badb63c9d2ed692a4d2d71c63e1d96ac7453a9c5519348a8dc5a001d611afbb/node_modules/openclaw');
assert(manifest.files.length>0 && manifest.files.length<=64);
const files=new Map();
for(const row of manifest.files){
 assert(/^(?:package\.json|dist\/[A-Za-z0-9_.-]+\.mjs)$/.test(row.file));
 assert(!files.has(row.file));files.set(row.file,Object.freeze({...row}));
}
export function sdkSchemaSourcePins(){
 assert.equal(realpathSync(manifest.root),manifest.root,'Canonical SDK root');
 const pins={};
 for(const [relative,row] of files){
  const path=join(manifest.root,relative),stat=lstatSync(path);
  assert(stat.isFile()&&!stat.isSymbolicLink()&&stat.uid===0&&(stat.mode&0o022)===0,'Immutable public SDK member required');
  assert.equal(realpathSync(path),path);
  const bytes=readFileSync(path);assert.equal(bytes.length,row.bytes);assert.equal(sha(bytes),row.sha256,'Exact live-SDK public source pin');
  pins[path]=row.sha256;
 }
 assert.equal(JSON.parse(readFileSync(join(manifest.root,'package.json'),'utf8')).version,manifest.version);
 return pins;
}
sdkSchemaSourcePins();
export function qualifiedSdkURL(name){
 assert(files.has('dist/'+name),'Only explicitly pinned SDK entry modules');
 const path=join(manifest.root,'dist',name);assert.equal(dirname(path),join(manifest.root,'dist'));
 return pathToFileURL(path).href;
}
