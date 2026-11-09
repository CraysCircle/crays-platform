import assert from'node:assert/strict';import{DatabaseSync}from'node:sqlite';import fs from'node:fs/promises';import{constants as C}from'node:fs';
const at=d=>'/proc/self/fd/'+d.fd;
async function regular(p,cap){const s=await fs.lstat(p);assert(s.isFile()&&!s.isSymbolicLink()&&s.nlink===1&&s.uid===process.getuid()&&(s.mode&0o077)===0&&s.size<=cap,'OWN_JOURNAL_FILE_REQUIRED');return s;}
/** SQLite EXCLUSIVE locking mode retains its kernel file lock across journal commits until close.
 * Original SQLite docs https://www.sqlite.org/pragma.html#pragma_locking_mode; no PID-staleness guessing.
 */
export async function acquireRuntimeJournal(agentRoot,binding){
 const file=at(agentRoot)+'/.runtime-materializer.sqlite';let f;try{f=await fs.open(file,C.O_WRONLY|C.O_CREAT|C.O_EXCL|C.O_NOFOLLOW,0o600);await f.sync();await agentRoot.sync();}catch(e){if(e.code!=='EEXIST')throw e;}finally{await f?.close();}
 const before=await regular(file,1024*1024);let db;
 try{db=new DatabaseSync(file,{timeout:0});const after=await regular(file,1024*1024);assert(after.dev===before.dev&&after.ino===before.ino,'JOURNAL_REBOUND');
  db.exec('PRAGMA busy_timeout=0; PRAGMA journal_mode=DELETE; PRAGMA synchronous=FULL; PRAGMA locking_mode=EXCLUSIVE; BEGIN EXCLUSIVE; CREATE TABLE IF NOT EXISTS owner_binding(binding TEXT PRIMARY KEY) STRICT; CREATE TABLE IF NOT EXISTS pending(name TEXT PRIMARY KEY,kind TEXT NOT NULL CHECK(kind IN (\'stage\',\'pointer\'))) STRICT;');
  const owners=db.prepare('SELECT binding FROM owner_binding').all();if(!owners.length)db.prepare('INSERT INTO owner_binding VALUES(?)').run(binding);else assert(owners.length===1&&owners[0].binding===binding,'JOURNAL_OWNER_MISMATCH');db.exec('COMMIT');
 }catch(e){try{db?.close();}catch{}if(e.errcode===5||e.errcode===6)return null;throw e;}
 const check=async()=>{const s=await regular(file,1024*1024);assert(s.dev===before.dev&&s.ino===before.ino,'JOURNAL_REBOUND');assert.equal(db.prepare('PRAGMA locking_mode').get().locking_mode,'exclusive');};
 const valid=(name,kind)=>assert(kind==='stage'?/^\.pending-[a-f0-9]{24}$/.test(name):kind==='pointer'&&/^\.current-[a-f0-9]{24}$/.test(name),'FIXED_OWN_TEMP_NAME_REQUIRED');
 return{check,close:()=>db.close(),register:async(name,kind)=>{valid(name,kind);await check();assert(db.prepare('SELECT count(*) n FROM pending').get().n<64,'OWN_TEMP_LIMIT');db.prepare('INSERT INTO pending VALUES(?,?)').run(name,kind);},complete:async name=>{await check();db.prepare('DELETE FROM pending WHERE name=?').run(name);},
  recover:async(admissions)=>{await check();const rows=db.prepare('SELECT name,kind FROM pending ORDER BY name').all();assert(rows.length<=64,'OWN_TEMP_LIMIT');for(const r of rows){valid(r.name,r.kind);const parent=r.kind==='stage'?admissions:agentRoot,p=at(parent)+'/'+r.name;let s;try{s=await fs.lstat(p);}catch(e){if(e.code!=='ENOENT')throw e;db.prepare('DELETE FROM pending WHERE name=?').run(r.name);continue;}
   if(r.kind==='pointer'){await regular(p,128*1024);await fs.unlink(p);}else{assert(s.isDirectory()&&!s.isSymbolicLink()&&s.uid===process.getuid()&&(s.mode&0o077)===0,'OWN_TEMP_DIRECTORY_REQUIRED');const d=await fs.open(p,C.O_RDONLY|C.O_DIRECTORY|C.O_NOFOLLOW);try{const a=await d.stat();assert(a.dev===s.dev&&a.ino===s.ino);const names=await fs.readdir(at(d));assert(names.length<=2&&names.every(n=>['config.json','receipt.json'].includes(n)),'UNKNOWN_TEMP_CONTENT');for(const n of names){await regular(at(d)+'/'+n,128*1024);await fs.unlink(at(d)+'/'+n);}await d.sync();const last=await fs.lstat(p);assert(last.dev===s.dev&&last.ino===s.ino);await fs.rmdir(p);}finally{await d.close();}}
   await parent.sync();db.prepare('DELETE FROM pending WHERE name=?').run(r.name);
  }} };
}
