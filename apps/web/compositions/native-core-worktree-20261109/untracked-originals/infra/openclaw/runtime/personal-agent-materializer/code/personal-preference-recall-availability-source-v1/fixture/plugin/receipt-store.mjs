import {DatabaseSync} from 'node:sqlite';
import {constants,openSync,closeSync,lstatSync,realpathSync,linkSync,unlinkSync,fsyncSync,readdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash,randomBytes} from 'node:crypto';
const hash = value => createHash('sha256').update(value).digest('hex');
const fail = code => {throw Object.assign(new Error(code),{safeCode:code});};
export function validateInput(input) {
  if (!input || typeof input!=='object' || Array.isArray(input) ||
    ![Object.prototype,null].includes(Object.getPrototypeOf(input))) fail('INVALID_INPUT');
  const descriptors=Object.getOwnPropertyDescriptors(input), keys=Reflect.ownKeys(descriptors);
  if (keys.some(k=>typeof k!=='string'||!Object.hasOwn(descriptors[k],'value'))) fail('INVALID_INPUT');
  const schemas={create:['operation','kind','title','text','idempotencyKey'],
    update:['operation','id','expectedVersion','title','text','state','idempotencyKey'],
    delete:['operation','id','expectedVersion','idempotencyKey'],read:['operation','id'],list:['operation','offset']};
  const op=input.operation,allowed=Object.hasOwn(schemas,op)?schemas[op]:null;
  if(!allowed||keys.some(k=>!allowed.includes(k))) fail('INVALID_INPUT');
  for(const key of keys) {
    const v=input[key];
    if(typeof v==='string' && (v.length>8192 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(v) ||
      [...v].some(c=>{const n=c.codePointAt(0);return n>=0xd800&&n<=0xdfff;}))) fail('INVALID_INPUT');
    if(!['string','number'].includes(typeof v)) fail('INVALID_INPUT');
  }
  if(Buffer.byteLength(JSON.stringify(input),'utf8')>16384) fail('INPUT_LIMIT');
  if(['create','update'].includes(op)&&(!(typeof input.title==='string'&&input.title.trim()&&input.title.length<=256)||typeof input.text!=='string')) fail('INVALID_INPUT');
  if(op==='create'&&!['note','task','journal'].includes(input.kind)) fail('INVALID_INPUT');
  if(['update','delete','read'].includes(op)&&!(typeof input.id==='string'&&/^r_[a-f0-9]{64}$/.test(input.id))) fail('INVALID_INPUT');
  if(['update','delete'].includes(op)&&!(Number.isSafeInteger(input.expectedVersion)&&input.expectedVersion>0&&input.expectedVersion<2147483647)) fail('INVALID_INPUT');
  if(['create','update','delete'].includes(op)&&!(typeof input.idempotencyKey==='string'&&/^[a-zA-Z0-9_-]{16,96}$/.test(input.idempotencyKey))) fail('INVALID_INPUT');
  if(op==='update'&&!['open','done'].includes(input.state)) fail('INVALID_INPUT');
  if(op==='list'&&input.offset!==undefined&&!(Number.isSafeInteger(input.offset)&&input.offset>=0&&input.offset<=10000)) fail('INVALID_INPUT');
  return Object.fromEntries(keys.sort().map(k=>[k,input[k]]));
}
function privatePath(path,kind) {
  const s=lstatSync(path);
  if(s.isSymbolicLink()||realpathSync(path)!==resolve(path)||s.uid!==process.getuid()||
    (s.mode&0o077)!==0||(kind==='dir'?!s.isDirectory():!s.isFile()||s.nlink!==1)) fail('PRIVATE_STORAGE_REQUIRED');
  return s;
}
function createSchema(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS owner_binding(binding TEXT NOT NULL PRIMARY KEY) STRICT;
      CREATE TABLE IF NOT EXISTS records(id TEXT PRIMARY KEY,kind TEXT NOT NULL CHECK(kind IN ('note','task','journal')),
      version INTEGER NOT NULL CHECK(version>0),title TEXT NOT NULL,body TEXT NOT NULL,state TEXT NOT NULL CHECK(state IN ('open','done','deleted'))) STRICT;
      CREATE TABLE IF NOT EXISTS receipts(key_sha TEXT PRIMARY KEY,request_sha TEXT NOT NULL,result_json TEXT NOT NULL) STRICT;`);
}
// Recover only our fully committed initial DB published by link before a process died before unlink.
function finishInterruptedPublication(file,workspace,binding) {
  const final=lstatSync(file);
  if(final.nlink!==2)return;
  if(!final.isFile()||final.isSymbolicLink()||final.uid!==process.getuid()||(final.mode&0o077)!==0)fail('PRIVATE_STORAGE_REQUIRED');
  const candidates=readdirSync(workspace).filter(name=>/^\.crays-preference-confirmation-init-[a-f0-9]{32}\.sqlite$/.test(name)).map(name=>join(workspace,name))
    .filter(path=>{const st=lstatSync(path);return st.isFile()&&!st.isSymbolicLink()&&st.uid===final.uid&&(st.mode&0o077)===0&&st.dev===final.dev&&st.ino===final.ino&&st.nlink===2;});
  if(candidates.length!==1)fail('PRIVATE_STORAGE_REQUIRED');
  const db=new DatabaseSync(file,{readOnly:true});
  try {
    const owners=db.prepare('SELECT binding FROM owner_binding').all();
    if(owners.length!==1||owners[0].binding!==binding||
      db.prepare('SELECT count(*) AS n FROM records').get().n!==0||db.prepare('SELECT count(*) AS n FROM receipts').get().n!==0)fail('STORAGE_OWNER_MISMATCH');
  }finally {db.close();}
  const after=lstatSync(file),temp=lstatSync(candidates[0]);
  if(after.dev!==final.dev||after.ino!==final.ino||after.nlink!==2||temp.dev!==final.dev||temp.ino!==final.ino||temp.isSymbolicLink())fail('PRIVATE_STORAGE_REQUIRED');
  unlinkSync(candidates[0]);
  const fd=openSync(workspace,constants.O_RDONLY|constants.O_DIRECTORY);try{fsyncSync(fd);}finally{closeSync(fd);}
}
export function executePersonalRecord({agentId,agentDir,workspace,guard},raw) {
  const input=validateInput(raw); guard();
  privatePath(agentDir,'dir');privatePath(workspace,'dir');
  const directoryIdentity=path=>{const s=lstatSync(path,{bigint:true});return [s.dev.toString(),s.ino.toString()];};
  // Native paths can be different mount aliases between invocations; physical directories identify this store.
  const binding=hash(JSON.stringify(['crays.preference-confirmation-receipts.physical-owner.v1',agentId,directoryIdentity(agentDir),directoryIdentity(workspace)]));
  const file=join(workspace,'.crays-personal-preference-confirmation-receipts.sqlite');
  // Never publish an unbound final DB: a crash can leave only an ignored private temporary file.
  try {lstatSync(file);} catch(e) {
    if(e.code!=='ENOENT')throw e;
    const temporary=join(workspace,'.crays-preference-confirmation-init-'+randomBytes(16).toString('hex')+'.sqlite');
    let initialized,temporaryCreated=false;
    try {
      const fd=openSync(temporary,constants.O_CREAT|constants.O_EXCL|constants.O_WRONLY|constants.O_NOFOLLOW,0o600);
      temporaryCreated=true;closeSync(fd);
      initialized=new DatabaseSync(temporary,{timeout:1000});
      initialized.exec('PRAGMA journal_mode=DELETE; PRAGMA synchronous=FULL; BEGIN IMMEDIATE;');
      createSchema(initialized);
      initialized.prepare('INSERT INTO owner_binding(binding) VALUES(?)').run(binding);
      initialized.exec('COMMIT');initialized.close();initialized=null;
      const syncFd=openSync(temporary,constants.O_RDONLY|constants.O_NOFOLLOW);
      try {fsyncSync(syncFd);}finally {closeSync(syncFd);}
      try {linkSync(temporary,file);}catch(publishError){if(publishError.code!=='EEXIST')throw publishError;}
      // No replacement: a concurrent publisher wins, then receives the same normal owner validation.
      unlinkSync(temporary);temporaryCreated=false;
      const dirFd=openSync(workspace,constants.O_RDONLY|constants.O_DIRECTORY);
      try {fsyncSync(dirFd);}finally {closeSync(dirFd);}
    } finally {
      if(initialized)try{initialized.close();}catch{}
      if(temporaryCreated)try{unlinkSync(temporary);}catch{}
    }
  }
  finishInterruptedPublication(file,workspace,binding);
  const before=privatePath(file,'file');
  const db=new DatabaseSync(file,{timeout:1000});let inTransaction=false,committed=false;
  try {
    const after=privatePath(file,'file');if(after.dev!==before.dev||after.ino!==before.ino)fail('PRIVATE_STORAGE_REQUIRED');
    db.exec('PRAGMA foreign_keys=ON; PRAGMA secure_delete=ON; PRAGMA journal_mode=DELETE; PRAGMA busy_timeout=1000; BEGIN IMMEDIATE;');inTransaction=true;
    createSchema(db);
    const owner=db.prepare('SELECT binding FROM owner_binding').all();
    if(owner.length===0)fail('STORAGE_OWNER_UNBOUND');
    else if(owner.length!==1||owner[0].binding!==binding)fail('STORAGE_OWNER_MISMATCH');
    // Initial owner/schema metadata has no user content. Keep it durable even if a later request is revoked.
    db.exec('COMMIT');inTransaction=false;
    db.exec('BEGIN IMMEDIATE');inTransaction=true;guard();
    let result;
    if(input.operation==='read') {
      const row=db.prepare("SELECT id,kind,version,title,body AS text,state FROM records WHERE id=? AND state!='deleted'").get(input.id);
      result=row?{status:'read',record:row}:{status:'not_found'};
    } else if(input.operation==='list') {
      const records=db.prepare("SELECT id,kind,version,title,state FROM records WHERE state!='deleted' ORDER BY id LIMIT 51 OFFSET ?").all(input.offset??0);
      result={status:'listed',records:records.slice(0,50),hasMore:records.length>50,nextOffset:records.length>50?(input.offset??0)+50:null};
    } else {
      const key=hash(input.idempotencyKey),request=hash(JSON.stringify(input));
      const prior=db.prepare('SELECT request_sha,result_json FROM receipts WHERE key_sha=?').get(key);
      if(prior) {
        if(prior.request_sha!==request)result={status:'conflict',code:'IDEMPOTENCY_CONFLICT'};
        else {const previous=JSON.parse(prior.result_json);result=['created','updated','deleted'].includes(previous.status)?
          {status:'replayed',originalStatus:previous.status,receipt:previous.receipt}:{...previous,replayed:true};}
      }
      else {
        const id=input.operation==='create'?'r_'+hash(binding+'\n'+key):input.id;
        const row=input.operation==='create'?null:db.prepare('SELECT version,kind,state FROM records WHERE id=?').get(id);
        if(input.operation!=='create'&&(!row||row.state==='deleted'))result={status:'not_found'};
        else if(row&&row.version!==input.expectedVersion) result={status:'conflict',code:'VERSION_CONFLICT'};
        else {
          const version=(row?.version??0)+1;
          if(input.operation==='create')db.prepare('INSERT INTO records VALUES(?,?,1,?,?,?)').run(id,input.kind,input.title,input.text,'open');
          if(input.operation==='update') {
            if(row.kind!=='task'&&input.state!=='open')fail('INVALID_RECORD_STATE');
            db.prepare('UPDATE records SET version=?,title=?,body=?,state=? WHERE id=? AND version=?').run(version,input.title,input.text,input.state,id,input.expectedVersion);
          }
          if(input.operation==='delete')db.prepare("UPDATE records SET version=?,title='',body='',state='deleted' WHERE id=? AND version=?").run(version,id,input.expectedVersion);
          // Durable replay receipt stores no note/task/journal text, including after erasure.
          result={status:input.operation==='delete'?'deleted':input.operation==='create'?'created':'updated',receipt:{id,version,operation:input.operation}};
        }
        db.prepare('INSERT INTO receipts VALUES(?,?,?)').run(key,request,JSON.stringify(result));
      }
    }
    guard();db.exec('COMMIT');inTransaction=false;committed=true;
    try {guard();}catch {return {status:'unknown',code:'COMMIT_COMPLETED_RESPONSE_AUTHORITY_LOST'};}
    return result;
  } catch(e) {
    if(inTransaction)try{db.exec('ROLLBACK');}catch{}
    if(committed)return {status:'unknown',code:'COMMIT_COMPLETED_RESPONSE_AUTHORITY_LOST'};
    throw e;
  } finally {db.close();}
}
