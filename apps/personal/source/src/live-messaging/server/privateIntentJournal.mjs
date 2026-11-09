import {mkdirSync,openSync,closeSync,readFileSync,writeFileSync,fstatSync,lstatSync,renameSync,linkSync,unlinkSync,readdirSync,constants,fsyncSync} from 'node:fs';
import {createHash,randomUUID} from 'node:crypto';
const queues=new Map(),sha=value=>createHash('sha256').update(value).digest('hex');
const failure=()=>Error('Encrypted message intent journal unavailable');
/** Host-only encrypted Nostr envelopes and public routing metadata. Never stores
 * a Nostr secret, message text or a replacement account. Request IDs are hashed
 * and never interpolated into filesystem paths. */
export function openPrivateIntentJournal({root,binding}){
 if(typeof root!=='string'||!root.startsWith('/')||!binding?.accountId||!binding.conversationId||!binding.pubkey)throw failure();
 const scope=JSON.stringify([binding.accountId,binding.pubkey,binding.conversationId,binding.membershipId]),directory=root+'/'+sha(scope);
 function checkDirectory(path){mkdirSync(path,{recursive:true,mode:0o700});const stat=lstatSync(path);if(!stat.isDirectory()||stat.uid!==process.getuid()||(stat.mode&511)!==448)throw failure();}
 checkDirectory(root);checkDirectory(directory);
 function path(id){if(typeof id!=='string'||!/^[a-zA-Z0-9:._-]{1,200}$/.test(id))throw failure();return directory+'/'+sha(id)+'.json';}
 function readPath(file){let bytes;const fd=openSync(file,constants.O_RDONLY|constants.O_NOFOLLOW);try{const stat=fstatSync(fd);if(!stat.isFile()||stat.uid!==process.getuid()||(stat.mode&511)!==384||stat.nlink!==1||stat.size>300000)throw failure();bytes=readFileSync(fd);const record=JSON.parse(bytes.toString('utf8'));if(record.scope!==scope||!record.intent||!Array.isArray(record.intent.events)||record.intent.events.length!==2||record.intent.events.some(e=>e.kind!==1059)||file!==path(record.intent.requestId))throw failure();return record;}finally{bytes?.fill(0);closeSync(fd);}}
 function save(file,record,exclusive){const bytes=Buffer.from(JSON.stringify(record));if(bytes.length>300000)throw failure();let fd,temp;
  try{temp=file+'.'+randomUUID()+'.tmp';fd=openSync(temp,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);writeFileSync(fd,bytes);fsyncSync(fd);closeSync(fd);fd=undefined;if(exclusive){linkSync(temp,file);unlinkSync(temp);}else renameSync(temp,file);temp=undefined;const dir=openSync(directory,constants.O_RDONLY|constants.O_DIRECTORY|constants.O_NOFOLLOW);try{fsyncSync(dir);}finally{closeSync(dir);}}
  finally{bytes.fill(0);if(fd!==undefined)closeSync(fd);if(temp){try{unlinkSync(temp);}catch{}}}}
 return Object.freeze({
  async exclusive(id,operation){const key=scope+':'+id,previous=queues.get(key)||Promise.resolve();let release;const gate=new Promise(resolve=>{release=resolve;}),tail=previous.catch(()=>{}).then(()=>gate);queues.set(key,tail);await previous.catch(()=>{});try{return await operation();}finally{release();if(queues.get(key)===tail)queues.delete(key);}},
  async read(id){try{const row=readPath(path(id));return {...row.intent,receipt:row.receipt};}catch(error){if(error.code==='ENOENT')return null;throw error;}},
  async writeIntent(id,intent){if(intent.requestId!==id)throw failure();save(path(id),{scope,intent,receipt:null,createdAt:Date.now()},true);},
  async writeReceipt(id,receipt){const file=path(id),row=readPath(file);if(receipt.requestId!==id||receipt.messageId!==row.intent.messageId||JSON.stringify(receipt.eventIds)!==JSON.stringify(row.intent.events.map(e=>e.id))||!['sent-to-relay','unconfirmed'].includes(receipt.status))throw failure();save(file,{...row,receipt},false);},
  async recent(){const files=readdirSync(directory).filter(n=>/^[a-f0-9]{64}\.json$/.test(n));if(files.length>1000)throw failure();return files.map(n=>readPath(directory+'/'+n)).sort((a,b)=>b.createdAt-a.createdAt).slice(0,100).map(r=>({...r.intent,receipt:r.receipt}));},
 });
}
