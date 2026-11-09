import{resolveVerifiedLearningEvidence}from'./learning-evidence.mjs';
import {validateLearningRequest,validateLearningEntry} from './learning-format.mjs';
import {DatabaseSync} from 'node:sqlite';
import {constants,openSync,closeSync,lstatSync,realpathSync,linkSync,unlinkSync,fsyncSync,readdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash,randomBytes} from 'node:crypto';
const hash = value => createHash('sha256').update(value).digest('hex');
const fail = (code,validation) => {throw Object.assign(new Error(code),{safeCode:code,...validation?{safeValidation:validation}:{}});};
export function validateInput(input) {
  if (!input || typeof input!=='object' || Array.isArray(input) ||
    ![Object.prototype,null].includes(Object.getPrototypeOf(input))) fail('INVALID_INPUT');
  const descriptors=Object.getOwnPropertyDescriptors(input), keys=Reflect.ownKeys(descriptors);
  if (keys.some(k=>typeof k!=='string'||!Object.hasOwn(descriptors[k],'value'))) fail('INVALID_INPUT');
  const schemas={create:['operation','kind','title','text','idempotencyKey'],
    update:['operation','id','expectedVersion','title','text','state','idempotencyKey'],
    delete:['operation','id','expectedVersion','idempotencyKey'],read:['operation','id'],list:['operation','offset']};
  const op=input.operation,allowed=Object.hasOwn(schemas,op)?schemas[op]:null;
  if(!allowed) fail('INVALID_INPUT',{operation:null,invalidFields:['operation'],hint:'Choose create, update, delete, read or list.'});
  const required={create:['operation','kind','title','text','idempotencyKey'],update:['operation','id','expectedVersion','title','text','state','idempotencyKey'],delete:['operation','id','expectedVersion','idempotencyKey'],read:['operation','id'],list:['operation']}[op];
  const missingFields=required.filter(k=>!keys.includes(k)),extra=keys.filter(k=>!allowed.includes(k));
  const invalid=(field,hint)=>fail('INVALID_INPUT',{operation:op,invalidFields:[field],requiredFields:required,allowedFields:allowed,hint});
  if(extra.length)fail('INVALID_INPUT',{operation:op,forbiddenFields:extra.filter(k=>Object.values(schemas).some(row=>row.includes(k))),additionalFieldsPresent:true,requiredFields:required,allowedFields:allowed,hint:op==='update'?'Remove kind: a record kind is immutable. Update requires id, expectedVersion, title, text, state and idempotencyKey.':'Remove fields outside allowedFields.'});
  if(missingFields.length)fail('INVALID_INPUT',{operation:op,missingFields,requiredFields:required,allowedFields:allowed,hint:op==='update'?'Read the current record, preserve its title/text/state unless explicitly changed, then supply its exact current version. Notes/journal use state open; only tasks may be done.':'Supply the fields listed in requiredFields.'});
  for(const key of keys) {
    const v=input[key];
    if(typeof v==='string' && (v.length>8192 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(v) ||
      [...v].some(c=>{const n=c.codePointAt(0);return n>=0xd800&&n<=0xdfff;}))) fail('INVALID_INPUT');
    if(!['string','number'].includes(typeof v)) fail('INVALID_INPUT');
  }
  if(Buffer.byteLength(JSON.stringify(input),'utf8')>16384) fail('INPUT_LIMIT');
  if(['create','update'].includes(op)&&!(typeof input.title==='string'&&input.title.trim()&&input.title.length<=256))invalid('title','Supply a nonempty title up to 256 characters; preserve current title unless the user changed it.');
  if(['create','update'].includes(op)&&typeof input.text!=='string')invalid('text','Supply explicit user text, or preserve the current text from read.');
  if(op==='create'&&!['note','task','journal'].includes(input.kind))invalid('kind','Create requires note, task or journal. Kind is not an update field.');
  if(['update','delete','read'].includes(op)&&!(typeof input.id==='string'&&/^r_[a-f0-9]{64}$/.test(input.id)))invalid('id','Use the exact id returned by list/read/create.');
  if(['update','delete'].includes(op)&&!(Number.isSafeInteger(input.expectedVersion)&&input.expectedVersion>0&&input.expectedVersion<2147483647))invalid('expectedVersion','Read the current record and pass its exact integer version (1..2147483646). Never guess or bypass a version conflict.');
  if(['create','update','delete'].includes(op)&&!(typeof input.idempotencyKey==='string'&&/^[a-zA-Z0-9_-]{16,96}$/.test(input.idempotencyKey)))invalid('idempotencyKey','Use 16..96 letters, digits, underscore or hyphen; retry only the identical payload with the same key.');
  if(op==='update'&&!['open','done'].includes(input.state))invalid('state','Update always requires state. Preserve current state; note/journal must be open, only a task may be done.');
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
  const candidates=readdirSync(workspace).filter(name=>/^\.crays-personal-init-[a-f0-9]{32}\.sqlite$/.test(name)).map(name=>join(workspace,name))
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
export function executePersonalRecord(actor,raw){return executeOwnedRecord(actor,raw);}
/** Host-only entry; never added to public records tool operations or model schema. */
export function executeExplicitMemoryCapture(actor,command){
  const allowed=['action','text','messageKey','payloadSha256','routeSha256'];if(!command||Object.getPrototypeOf(command)!==Object.prototype||Object.keys(command).length!==allowed.length||Object.keys(command).some(k=>!allowed.includes(k))||!['remember','correct','forget','revoke'].includes(command.action)||!['messageKey','payloadSha256','routeSha256'].every(k=>typeof command[k]==='string'&&/^[a-f0-9]{64}$/.test(command[k])))fail('EXPLICIT_MEMORY_INPUT_REQUIRED');
  if(['remember','correct'].includes(command.action)){validateInput({operation:'create',kind:'note',title:'Explizit gemerkte Notiz',text:command.text,idempotencyKey:'explicit_validation_0001'});if(!command.text.trim())fail('EXPLICIT_MEMORY_INPUT_REQUIRED');}else if(command.text!==null)fail('EXPLICIT_MEMORY_INPUT_REQUIRED');
  return executeOwnedRecord(actor,null,Object.freeze({...command}));
}
/** Host-only entry. Public records operations/schema remain unchanged; no model event can call this export. */
export function executeOperationalLearning(actor,raw){return executeOwnedRecord(actor,null,null,validateLearningRequest(raw));}
export function executeOperationalLearningEvidenceReview(actor,{eventId,evidence}){if(typeof eventId!=='string'||!/^[a-f0-9]{64}$/.test(eventId))throw Error('LEARNING_EVENT_ID_REQUIRED');const checked=resolveVerifiedLearningEvidence(actor,evidence);const guarded={...actor,guard:()=>{actor.guard();resolveVerifiedLearningEvidence(actor,evidence);}};return executeOwnedRecord(guarded,null,null,{operation:'review',eventId,id:checked.recordId,expectedVersion:checked.recordVersion,evidence:checked});}
function executeOwnedRecord({agentId,agentDir,workspace,guard},raw,capture,learning) {
  const input=capture||learning?null:validateInput(raw); guard();
  privatePath(agentDir,'dir');privatePath(workspace,'dir');
  const directoryIdentity=path=>{const s=lstatSync(path,{bigint:true});return [s.dev.toString(),s.ino.toString()];};
  // Native paths can be different mount aliases between invocations; physical directories identify this store.
  const binding=hash(JSON.stringify(['crays.personal-records.physical-owner.v1',agentId,directoryIdentity(agentDir),directoryIdentity(workspace)]));
  const file=join(workspace,'.crays-personal-user-records.sqlite');
  // Never publish an unbound final DB: a crash can leave only an ignored private temporary file.
  try {lstatSync(file);} catch(e) {
    if(e.code!=='ENOENT')throw e;
    const temporary=join(workspace,'.crays-personal-init-'+randomBytes(16).toString('hex')+'.sqlite');
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
    // Lineage is host-owned metadata only. Preflight the entire bounded chain before any deletion.
    const learningHead=id=>{const r=db.prepare('SELECT result_json FROM receipts WHERE key_sha=?').get(hash('crays.operational-learning.head:v1:'+id));if(!r)return null;if(r.result_json.length>4096)fail('LEARNING_LINEAGE_UNAVAILABLE');const x=JSON.parse(r.result_json);if(x.schema!=='crays.private.operational-learning.head.v1'||x.recordId!==id)fail('LEARNING_LINEAGE_UNAVAILABLE');return x;};
    const withdrawDerived=(id,expectedVersion)=>{const nodes=[],seen=new Set();let next=id;while(next){guard();if(nodes.length>=256||seen.has(next)||!/^r_[a-f0-9]{64}$/.test(next))fail('LEARNING_LINEAGE_UNAVAILABLE');seen.add(next);const row=db.prepare('SELECT id,kind,version,state FROM records WHERE id=?').get(next),head=learningHead(next);if(!row||row.kind!=='journal'||!head||!Number.isSafeInteger(row.version)||row.version>=2147483647)fail('LEARNING_LINEAGE_UNAVAILABLE');if(nodes.length===0&&row.version!==expectedVersion&&!(row.state==='deleted'&&head.consolidatedSourceVersion===expectedVersion&&head.recordVersion===row.version))return null;if(head.consolidatedInto!==undefined&&(!/^r_[a-f0-9]{64}$/.test(head.consolidatedInto)||row.state!=='deleted'||!head.revoked))fail('LEARNING_LINEAGE_UNAVAILABLE');nodes.push({row,head});next=head.consolidatedInto??null;}for(const{row,head}of nodes){guard();const version=row.state==='deleted'?row.version:row.version+1;if(row.state!=='deleted'){const changed=db.prepare("UPDATE records SET version=?,title='',body='',state='deleted' WHERE id=? AND version=?").run(version,row.id,row.version);if(Number(changed.changes)!==1)fail('LEARNING_LINEAGE_UNAVAILABLE');}db.prepare('UPDATE receipts SET result_json=? WHERE key_sha=?').run(JSON.stringify({...head,recordVersion:version,payloadSha256:null,revoked:true}),hash('crays.operational-learning.head:v1:'+row.id));}return{status:'deleted',receipt:{id,version:nodes[0].row.state==='deleted'?nodes[0].row.version:nodes[0].row.version+1,operation:'delete'},withdrawn:nodes.map(({row})=>({id:row.id,version:row.state==='deleted'?row.version:row.version+1}))};};
    let result;
    if(learning){
      const eventKey=hash('crays.operational-learning.event:v1:'+learning.eventId),request=hash(JSON.stringify(learning)),prior=db.prepare('SELECT request_sha,result_json FROM receipts WHERE key_sha=?').get(eventKey);
      if(prior){if(prior.request_sha!==request)result={status:'conflict',code:'LEARNING_EVENT_CHANGED'};else{const saved=JSON.parse(prior.result_json),current=saved.receipt?db.prepare('SELECT version,state FROM records WHERE id=?').get(saved.receipt.id):null;result=saved.receipt?{status:!current||current.state==='deleted'?'forgotten':'replayed',receipt:saved.receipt,currentVersion:current?.version??null}:{...saved,replayed:true};}}
      else if(learning.operation==='consolidate'){
        const sourceRows=learning.sources.map(item=>{const row=db.prepare('SELECT id,kind,version,state,body FROM records WHERE id=?').get(item.id),hr=db.prepare('SELECT result_json FROM receipts WHERE key_sha=?').get(hash('crays.operational-learning.head:v1:'+item.id)),head=hr?JSON.parse(hr.result_json):null;return{item,row,head};});
        if(sourceRows.some(({item,row,head})=>!row||row.kind!=='journal'||row.state!=='open'||row.version!==item.expectedVersion||hash(row.body)!==item.expectedPayloadSha256||!head||head.revoked||head.recordVersion!==row.version||head.payloadSha256!==hash(row.body)))result={status:'conflict',code:'LEARNING_CONSOLIDATION_SOURCE_CHANGED'};
        else{const id='r_'+hash(binding+'\n'+eventKey),body=JSON.stringify(learning.entry);db.prepare('INSERT INTO records VALUES(?,?,1,?,?,?)').run(id,'journal','Lernhinweis · '+learning.entry.category,body,'open');const head=(id,version,payloadSha256,revoked,lineage={})=>db.prepare('INSERT INTO receipts VALUES(?,?,?) ON CONFLICT(key_sha) DO UPDATE SET request_sha=excluded.request_sha,result_json=excluded.result_json').run(hash('crays.operational-learning.head:v1:'+id),'host-operational-learning-v1',JSON.stringify({schema:'crays.private.operational-learning.head.v1',recordId:id,recordVersion:version,payloadSha256,revoked,...lineage}));head(id,1,hash(body),false);for(const{row}of sourceRows){guard();db.prepare("UPDATE records SET version=?,title='',body='',state='deleted' WHERE id=? AND version=?").run(row.version+1,row.id,row.version);head(row.id,row.version+1,null,true,{consolidatedInto:id,consolidatedSourceVersion:row.version});}result={status:'consolidated',receipt:{id,version:1,operation:'consolidate'},sources:sourceRows.map(({row})=>({id:row.id,oldVersion:row.version,deletedVersion:row.version+1}))};}
        db.prepare('INSERT INTO receipts VALUES(?,?,?)').run(eventKey,request,JSON.stringify(result));
      }else{
        const id=learning.operation==='create'?'r_'+hash(binding+'\n'+eventKey):learning.id,headKey=hash('crays.operational-learning.head:v1:'+id),existing=learning.operation==='create'?null:db.prepare('SELECT kind,version,state,body FROM records WHERE id=?').get(id),headRaw=db.prepare('SELECT result_json FROM receipts WHERE key_sha=?').get(headKey),head=headRaw?JSON.parse(headRaw.result_json):null;
        if(learning.operation==='delete'&&existing&&head){result=withdrawDerived(id,learning.expectedVersion)??{status:'conflict',code:'LEARNING_VERSION_CONFLICT'};}
        else if(learning.operation!=='create'&&(!existing||existing.state==='deleted'))result={status:'not_found'};
        else if(existing&&(existing.version!==learning.expectedVersion||!head||head.revoked||head.recordVersion!==existing.version||head.payloadSha256!==hash(existing.body)||existing.kind!=='journal'))result={status:'conflict',code:'LEARNING_VERSION_CONFLICT'};
        else{
          let entry=learning.entry;if(learning.operation==='review'){if(hash(existing.body)!==learning.evidence.payloadSha256)throw Error('EVIDENCE_LESSON_CHANGED');const prior=validateLearningEntry(JSON.parse(existing.body),{allowScopedVerified:true});entry=validateLearningEntry({...prior,claim:null,source:{...prior.source,kind:'host_review',versionSha256:learning.evidence.sourceVersionSha256},maintenance:{...prior.maintenance,type:'dependency',trigger:'Recheck this scoped operation if the source version or observed behavior changes; age alone is not expiry.',validation:'verified'},evidence:[learning.evidence]},{allowScopedVerified:true});}const version=(existing?.version??0)+1,body=learning.operation==='delete'?'':JSON.stringify(entry),title=learning.operation==='delete'?'':'Lernhinweis · '+entry.category;
          if(learning.operation==='create')db.prepare('INSERT INTO records VALUES(?,?,1,?,?,?)').run(id,'journal',title,body,'open');
          else if(['update','review'].includes(learning.operation))db.prepare("UPDATE records SET version=?,title=?,body=?,state='open' WHERE id=? AND version=?").run(version,title,body,id,learning.expectedVersion);
          else db.prepare("UPDATE records SET version=?,title='',body='',state='deleted' WHERE id=? AND version=?").run(version,id,learning.expectedVersion);
          result={status:learning.operation==='create'?'created':learning.operation==='update'?'updated':learning.operation==='review'?'reviewed':'deleted',receipt:{id,version,operation:learning.operation}};
          db.prepare('INSERT INTO receipts VALUES(?,?,?) ON CONFLICT(key_sha) DO UPDATE SET request_sha=excluded.request_sha,result_json=excluded.result_json').run(headKey,'host-operational-learning-v1',JSON.stringify({schema:'crays.private.operational-learning.head.v1',recordId:id,recordVersion:version,payloadSha256:learning.operation==='delete'?null:hash(body),revoked:learning.operation==='delete',...(learning.operation==='review'?{evidenceSha256:hash(JSON.stringify(entry.evidence)),verificationSourceSha256:learning.evidence.sourceVersionSha256}:{})}));
        }
        db.prepare('INSERT INTO receipts VALUES(?,?,?)').run(eventKey,request,JSON.stringify(result));
      }
    }else if(capture){
      // Host-only receipt keys contain ':'; public idempotency keys cannot enter this namespace.
      const headKey=hash('crays.explicit-memory.head:v1:'+capture.routeSha256),eventKey=hash('crays.explicit-memory.event:v1:'+capture.messageKey),prior=db.prepare('SELECT request_sha,result_json FROM receipts WHERE key_sha=?').get(eventKey),headRow=db.prepare('SELECT result_json FROM receipts WHERE key_sha=?').get(headKey),head=headRow?JSON.parse(headRow.result_json):null;
      if(head&&(head.schema!=='crays.explicit-memory.head.v1'||head.routeSha256!==capture.routeSha256))fail('EXPLICIT_MEMORY_RECEIPT_UNAVAILABLE');
      if(prior){
        if(prior.request_sha!==capture.payloadSha256)result={status:'conflict',code:'EXPLICIT_MEMORY_MESSAGE_CHANGED'};
        else{const saved=JSON.parse(prior.result_json);if(!saved.receipt)result={...saved,replayed:true};else{const row=db.prepare('SELECT version,state FROM records WHERE id=?').get(saved.receipt.id);result={status:!row||row.state==='deleted'?'forgotten':'replayed',originalStatus:saved.status,receipt:saved.receipt,currentVersion:row?.version??null};}}
      }else{
        let id,version,operation;
        if(capture.action==='remember'){
          id='r_'+hash(binding+'\n'+eventKey);version=1;operation='create';
          db.prepare('INSERT INTO records VALUES(?,?,1,?,?,?)').run(id,'note','Explizit gemerkte Notiz',capture.text,'open');
        }else{
          id=head?.recordId;const row=id?db.prepare('SELECT version,kind,state,body FROM records WHERE id=?').get(id):null;
          if(!head||head.revoked||!row||row.state==='deleted')result={status:'not_found',code:'NO_LAST_BRIDGE_MEMORY'};
          else if(row.kind!=='note'||row.version!==head.recordVersion||row.version>=2147483647||hash(row.body)!==head.payloadSha256)result={status:'conflict',code:'EXPLICIT_MEMORY_VERSION_CONFLICT'};
          else{version=row.version+1;operation=capture.action==='correct'?'update':'delete';if(operation==='update')db.prepare("UPDATE records SET version=?,title=?,body=?,state='open' WHERE id=? AND version=?").run(version,'Explizit gemerkte Notiz',capture.text,id,row.version);else db.prepare("UPDATE records SET version=?,title='',body='',state='deleted' WHERE id=? AND version=?").run(version,id,row.version);}
        }
        if(operation){
          result={status:capture.action==='remember'?'remembered':capture.action==='correct'?'corrected':capture.action==='revoke'?'revoked':'forgotten',receipt:{id,version,operation}};
          const metadata={schema:'crays.explicit-memory.head.v1',routeSha256:capture.routeSha256,recordId:id,recordVersion:version,payloadSha256:operation==='delete'?null:hash(capture.text),revoked:operation==='delete'};
          db.prepare('INSERT INTO receipts VALUES(?,?,?) ON CONFLICT(key_sha) DO UPDATE SET request_sha=excluded.request_sha,result_json=excluded.result_json').run(headKey,'host-explicit-memory-route-v1',JSON.stringify(metadata));
        }
        db.prepare('INSERT INTO receipts VALUES(?,?,?)').run(eventKey,capture.payloadSha256,JSON.stringify(result));
      }
    }else if(input.operation==='read') {
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
        if(input.operation==='delete'&&row&&row.kind==='journal'&&learningHead(id)){result=withdrawDerived(id,input.expectedVersion)??{status:'conflict',code:'VERSION_CONFLICT'};}
        else if(input.operation!=='create'&&(!row||row.state==='deleted'))result={status:'not_found'};
        else if(row&&row.version!==input.expectedVersion) result={status:'conflict',code:'VERSION_CONFLICT'};
        else {
          const version=(row?.version??0)+1;
          if(input.operation==='create')db.prepare('INSERT INTO records VALUES(?,?,1,?,?,?)').run(id,input.kind,input.title,input.text,'open');
          if(input.operation==='update') {
            if(row.kind!=='task'&&input.state!=='open')fail('INVALID_RECORD_STATE',{operation:'update',invalidFields:['state'],hint:'Only tasks may use done. Notes and journal entries require open; kind is immutable.'});
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
