import {constants,lstatSync} from 'node:fs';
import {lstat,open,rename,unlink} from 'node:fs/promises';
import {createHash,randomBytes} from 'node:crypto';
import path from 'node:path';
const schema='crays.owned-spot-group-routing.v1',namespace='crays-demo-01a1863a-v1';
const hex=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const fail=()=>Error('This group is unavailable');
const exact=(object,fields)=>object&&typeof object==='object'&&!Array.isArray(object)&&Object.keys(object).sort().join(',')===fields.split(',').sort().join(',');
/** Explicit owner-created groups in the isolated CRAYS test network. The file
 * is the SAME atomic routing decision read by the actual owned Spot relays.
 * It never creates production Core contacts, visits, MLS membership or calls.
 * Original SDK/Core verification must precede every entry to this owner port;
 * browser MLS membership remains an additional, independent opening condition.
 */
export function createOwnedGroupDirectory({file,ownerAccountId,ownerPubkey,relays,readersBySpot,contacts,contexts=[],assertRuntimeCurrent,ensureTestPeer}){
 if(!path.isAbsolute(file)||!ownerAccountId||!hex(ownerPubkey)||typeof assertRuntimeCurrent!=='function'||!Array.isArray(relays)||!relays.length||!Array.isArray(contacts))throw fail();
 const urls=new Map(relays.map(row=>[row.spotId,row.url])),readers=new Map(Object.entries(readersBySpot??{}).map(([id,keys])=>[id,new Set(keys)])),eligible=new Set(contacts),circleContexts=new Set(contexts),relayScopes=new WeakSet();let queue=Promise.resolve(),cached=null;
 if(urls.size!==relays.length||[...urls].some(([id,url])=>!readers.get(id)?.has(ownerPubkey)||!/^ws:\/\/127\.0\.0\.1:18990\/spots\/crays-demo-01a1863a-v1-spot-[0-9]{4}$/.test(url)||url.split('/').at(-1)!==id)||[...eligible].some(key=>!hex(key)))throw fail();
 const version=stat=>[stat.dev,stat.ino,stat.size,stat.mtimeNs,stat.ctimeNs,stat.mode].join(':');
 const current=binding=>{assertRuntimeCurrent();if(binding?.accountId!==ownerAccountId||binding.pubkey!==ownerPubkey||!hex(binding.bindingFingerprint)||binding.publicBindingVerified!==true||binding.emailVerificationRequired!==false)throw fail();};
 const bounded=raw=>{if(raw.length>4*1024*1024)throw fail();return raw;};
 async function read(){
  const home=await lstat(path.dirname(file));if(!home.isDirectory()||home.isSymbolicLink()||(home.mode&0o077)||home.uid!==process.getuid())throw fail();
  let before;try{before=await lstat(file,{bigint:true});}catch(error){if(error.code==='ENOENT')return{document:{schema,namespace,tenants:{}},version:null};throw error;}
  if(!before.isFile()||before.isSymbolicLink()||(before.mode&0o077n)||before.uid!==BigInt(process.getuid())||before.size>4n*1024n*1024n)throw fail();
  const descriptor=await open(file,constants.O_RDONLY|constants.O_NOFOLLOW);let raw;
  try{if(version(await descriptor.stat({bigint:true}))!==version(before))throw fail();raw=bounded(await descriptor.readFile());}finally{await descriptor.close();}
  if(version(await lstat(file,{bigint:true}))!==version(before))throw fail();
  const document=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw));
  if(!exact(document,'schema,namespace,tenants')||document.schema!==schema||document.namespace!==namespace||!document.tenants||Array.isArray(document.tenants)||Object.keys(document.tenants).length>100)throw fail();
  const ids=new Set(),routes=new Set();
  for(const [spot,entry] of Object.entries(document.tenants)){
   if(!urls.has(spot)||!exact(entry,'groups,invitePairs')||!Array.isArray(entry.groups)||entry.groups.length>100||!Array.isArray(entry.invitePairs)||entry.invitePairs.length>100)throw fail();
   for(const pair of entry.invitePairs)if(!Array.isArray(pair)||pair.length!==2||pair[0]===pair[1]||pair.some(key=>!readers.get(spot).has(key)))throw fail();
   for(const row of entry.groups){
    if(!exact(row,'routingId,members,application')||!hex(row.routingId)||routes.has(row.routingId)||!Array.isArray(row.members)||!row.members.length||row.members.length>40||new Set(row.members).size!==row.members.length||row.members.some(key=>!readers.get(spot).has(key)))throw fail();routes.add(row.routingId);
    const app=row.application;
    if(!exact(app,'schema,ownerAccountId,ownerPubkey,groupId,conversationId,kind,parentKind,parentId,name,revision,membershipId')||app.schema!=='crays.owner-group-context.v1'||app.ownerAccountId!==ownerAccountId||app.ownerPubkey!==ownerPubkey||!hex(app.groupId)||!hex(app.membershipId)||ids.has(app.conversationId)||!Number.isSafeInteger(app.revision)||app.revision<1||!readable(app.name))throw fail();
    validateContext(app,spot);if(app.conversationId!==address(app.kind,spot,app.groupId)||app.membershipId!==founderId(app.groupId))throw fail();ids.add(app.conversationId);
   }
  }
  cached={document:structuredClone(document),version:version(before)};return{document,version:version(before)};
 }
 const address=(kind,spot,id)=>kind==='circle'?'circle:'+id:'spot:'+spot+':'+id;
 const readable=name=>typeof name==='string'&&name.trim()===name&&name.length>0&&name.length<=80&&!/[\x00-\x1f\x7f]/.test(name);
 const founderId=id=>createHash('sha256').update(JSON.stringify(['crays-actual-creation-v1',id,ownerPubkey])).digest('hex');
 function validateContext(app,spot){
  if(app.parentKind==='vifs'){if(app.parentId!=='personal-vifs'||app.kind!=='circle')throw fail();}
  else if(app.parentKind==='spot'){if(app.parentId!==spot||app.kind!=='spot')throw fail();}
  else if(app.parentKind==='circle'){if(app.kind!=='circle'||!circleContexts.has(app.parentId))throw fail();}
  else throw fail();
 }
 function rows(document){return Object.entries(document.tenants).flatMap(([spotId,entry])=>entry.groups.map(row=>({...row.application,routingId:row.routingId,spotId,relay:urls.get(spotId),members:[...row.members],origin:'creation'})));}
 async function write(document,expected){
  const raw=bounded(Buffer.from(JSON.stringify(document))),temp=file+'.'+randomBytes(12).toString('hex')+'.tmp';let descriptor;
  try{descriptor=await open(temp,'wx',0o600);await descriptor.writeFile(raw);await descriptor.sync();await descriptor.close();descriptor=null;const actual=await read();if(actual.version!==expected)throw fail();await rename(temp,file);const home=await open(path.dirname(file),'r');try{await home.sync();}finally{await home.close();}await read();}
  finally{await descriptor?.close();await unlink(temp).catch(error=>{if(error.code!=='ENOENT')throw error;});}
 }
 const serial=work=>{const result=queue.then(async()=>{
  // A second host/port instance must not silently overwrite this authority.
  // A stranded lock is not auto-stolen; the operator must prove its own writer
  // terminal before recovery. Failed requests retain the original group.
  await read();const lockPath=file+'.writer',lock=await open(lockPath,'wx',0o600),identity=version(await lock.stat({bigint:true}));
  try{await lock.writeFile(String(process.pid));return await work();}finally{await lock.close();const latest=await lstat(lockPath,{bigint:true});if(latest.dev.toString()+':'+latest.ino.toString()!==identity.split(':').slice(0,2).join(':'))throw fail();await unlink(lockPath);}
 });queue=result.catch(()=>{});return result;};
 return Object.freeze({
  async relayScope(binding,requested){current(binding);if(!Array.isArray(requested)||requested.length!==1)throw fail();const saved=await read(),all=rows(saved.document).filter(row=>row.members.includes(ownerPubkey)),selected=all.filter(row=>requested.includes(row.relay));if(!selected.length)throw fail();const invitees=[...new Set(selected.flatMap(row=>(saved.document.tenants[row.spotId].invitePairs??[]).filter(pair=>pair.includes(ownerPubkey)).map(pair=>pair.find(key=>key!==ownerPubkey))))];const scope=Object.freeze({version:saved.version,relays:Object.freeze([...requested]),routingIds:Object.freeze(selected.map(row=>row.routingId)),invitees:Object.freeze(invitees),allRelays:Object.freeze([...new Set(all.map(row=>row.relay))])});current(binding);relayScopes.add(scope);return scope;},
  isRelayScopeCurrent(binding,scope){try{current(binding);return relayScopes.has(scope)&&version(lstatSync(file,{bigint:true}))===scope.version;}catch{return false;}},
  authorizeRelayOperation(binding,operation){try{
   current(binding);if(!cached||version(lstatSync(file,{bigint:true}))!==cached.version||operation?.kind!=='sign')return false;
   const event=operation.event,now=Math.floor(Date.now()/1000),groups=rows(cached.document),allowed=new Set(groups.filter(row=>row.members.includes(ownerPubkey)).map(row=>row.relay));
   if(!allowed.size||!event||!Number.isSafeInteger(event.created_at)||Math.abs(event.created_at-now)>60||event.content!==''||!Array.isArray(event.tags)||event.pubkey!==undefined&&event.pubkey!==ownerPubkey)return false;
   if(event.kind===22242)return event.tags.length===2&&event.tags[0]?.length===2&&event.tags[0][0]==='relay'&&allowed.has(event.tags[0][1])&&event.tags[1]?.length===2&&event.tags[1][0]==='challenge'&&typeof event.tags[1][1]==='string'&&event.tags[1][1].length>=16&&event.tags[1][1].length<=512;
   if(event.kind===10050)return event.tags.length>0&&event.tags.length<=allowed.size&&new Set(event.tags.map(tag=>tag[1])).size===event.tags.length&&event.tags.every(tag=>Array.isArray(tag)&&tag.length===2&&tag[0]==='relay'&&allowed.has(tag[1]));
   return false;
  }catch{return false;}},
  async list(binding){current(binding);const value=rows((await read()).document).filter(row=>row.members.includes(ownerPubkey));current(binding);return value;},
  async testParticipantGroups(pubkey){assertRuntimeCurrent();if(!eligible.has(pubkey))throw fail();const value=rows((await read()).document).filter(row=>row.members.includes(pubkey)&&row.members.includes(ownerPubkey));assertRuntimeCurrent();return value;},
  async get(binding,conversationId){const all=await this.list(binding);return all.find(row=>row.conversationId===conversationId)??null;},
  register(binding,input){return serial(async()=>{
   current(binding);if(!exact(input,'groupId,routingId,name,spotId,parentKind,parentId')||!hex(input.groupId)||!hex(input.routingId)||!urls.has(input.spotId)||!readable(input.name))throw fail();
   const kind=input.parentKind==='spot'?'spot':'circle',app={schema:'crays.owner-group-context.v1',ownerAccountId,ownerPubkey,groupId:input.groupId,conversationId:address(kind,input.spotId,input.groupId),kind,parentKind:input.parentKind,parentId:input.parentId,name:input.name,revision:1,membershipId:founderId(input.groupId)};validateContext(app,input.spotId);
   const saved=await read(),previous=rows(saved.document).find(row=>row.groupId===input.groupId||row.routingId===input.routingId);
   if(previous){if(!previous.members.includes(ownerPubkey)||previous.groupId!==input.groupId||previous.routingId!==input.routingId||previous.spotId!==input.spotId||previous.name!==input.name||previous.parentKind!==input.parentKind||previous.parentId!==input.parentId)throw fail();current(binding);return previous;}
   if(rows(saved.document).length>=100)throw fail();
   const entry=saved.document.tenants[input.spotId]??={groups:[],invitePairs:[]};entry.groups.push({routingId:input.routingId,members:[ownerPubkey],application:app});current(binding);await write(saved.document,saved.version);current(binding);return rows(saved.document).find(row=>row.groupId===input.groupId);
  });},
  sync(binding,input){return serial(async()=>{
   current(binding);if(!exact(input,'conversationId,revision,name,members')||!readable(input.name)||!Number.isSafeInteger(input.revision)||!Array.isArray(input.members)||input.members.length>40||new Set(input.members).size!==input.members.length)throw fail();
   const saved=await read(),row=rows(saved.document).find(row=>row.conversationId===input.conversationId);
   if(!row||!row.members.includes(ownerPubkey)||row.revision!==input.revision||input.members.some(key=>!readers.get(row.spotId).has(key)||key!==ownerPubkey&&!eligible.has(key)))throw fail();
   const entry=saved.document.tenants[row.spotId],source=entry.groups.find(group=>group.routingId===row.routingId);
   for(const key of input.members)if(key!==ownerPubkey&&!row.members.includes(key)&&!entry.invitePairs.some(pair=>pair.includes(ownerPubkey)&&pair.includes(key)))throw fail();
   if(!input.members.length)entry.groups=entry.groups.filter(group=>group!==source);
   else {source.members=[...input.members];source.application.name=input.name;source.application.revision++;}
   current(binding);await write(saved.document,saved.version);current(binding);return rows(saved.document).find(group=>group.conversationId===input.conversationId&&group.members.includes(ownerPubkey))??null;
  });},
  prepareInvitation(binding,{conversationId,pubkey,revision}){return serial(async()=>{
   current(binding);if(!hex(pubkey)||pubkey===ownerPubkey||!eligible.has(pubkey)||!Number.isSafeInteger(revision))throw fail();const saved=await read(),row=rows(saved.document).find(row=>row.conversationId===conversationId);
   if(!row||!row.members.includes(ownerPubkey)||row.revision!==revision||row.members.includes(pubkey)||!readers.get(row.spotId).has(pubkey))throw fail();const entry=saved.document.tenants[row.spotId];
   if(!entry.invitePairs.some(pair=>pair.includes(ownerPubkey)&&pair.includes(pubkey))){if(entry.invitePairs.length>=100)throw fail();entry.invitePairs.push([ownerPubkey,pubkey]);current(binding);await write(saved.document,saved.version);}current(binding);return{conversationId,pubkey,revision,relay:row.relay};
  }).then(async result=>{current(binding);if(ensureTestPeer)await ensureTestPeer(pubkey,result.relay);current(binding);return result;});},
 });
}
