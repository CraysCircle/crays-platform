import {openScopedRumorStore} from './scopedRumorStore.mjs';
import {openHistoryVisibility} from './historyVisibility.mjs';

/** SDK history storage boundary. The parent supplies the existing encrypted
 * journal, exact canonical-source proof and cross-instance exclusive lock.
 * No signer, key, person, group or membership is created here.
 *
 * Visibility is durable BEFORE destructive SDK mutations. Captures are written
 * only after a source-proven SDK save. A missing capture is concealed until the
 * original SDK recovery path replays it; it is never assigned today's generation.
 */
export async function openFencedSdkRumorStore({binding,journal,exclusive,authorize,authorizePurge,validateRumor,verifyOriginal,signal,crypto=globalThis.crypto,newId=()=>crypto.randomUUID()}){
 if(typeof exclusive!=='function'||typeof verifyOriginal!=='function'||typeof authorize!=='function'||!signal?.addEventListener||!crypto?.subtle)throw Error('Admitted SDK history fence ports required');
 const fields=['kind','accountId','conversationId','groupId','pubkey','membershipId'];
 if(!binding||Object.keys(binding).sort().join(',')!==[...fields].sort().join(','))throw Error('Exact SDK history scope required');
 binding=Object.freeze(Object.fromEntries(fields.map(key=>[key,binding[key]])));
 const scope=JSON.stringify(binding),digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(scope));
 const namespace='sdk-history-fence:'+Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('')+':';
 const capturePrefix=namespace+'capture:',retiredPrefix=namespace+'retired:',intentKey=namespace+'clear-intent';
 let closed=false,problem=null,queue=Promise.resolve();
 if(authorizePurge!==undefined&&typeof authorizePurge!=='function')throw Error('Exact scoped SDK purge permission required');
 const admitted=(action='read')=>!closed&&!signal.aborted&&(action==='purge'&&authorizePurge?authorizePurge(binding):authorize(binding))===true;
 const check=(action='read')=>{if(!admitted(action))throw Error('SDK history fence is no longer admitted');};
 const id=value=>{if(typeof value!=='string'||!/^[a-f0-9]{64}$/.test(value))throw Error('Exact SDK original ID required');return value;};
 const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 const sourcePin=async source=>{const text=JSON.stringify(source);if(!text||new TextEncoder().encode(text).byteLength>8192)throw Error('Bounded canonical SDK source proof required');const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));check();return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');};
 const openingAction=admitted()?'read':'purge';check(openingAction);
 const original=await openScopedRumorStore({binding,journal,authorize,authorizePurge,validateRumor,crypto});
 let visibility;
 try{visibility=await openHistoryVisibility({binding,journal,exclusive,authorize,authorizePurge,signal,verifyOriginal,newId});check(openingAction);}
 catch(error){original.close();throw error;}
 const capture=async(key,action='read')=>{
  check(action);const row=await journal.getItem(capturePrefix+id(key));check(action);
  if(row===null)return null;
  if(row.schema!==1||row.scope!==scope||row.id!==key||!Number.isSafeInteger(row.historyGeneration)||row.historyGeneration<0||typeof row.sourcePin!=='string'||!/^[a-f0-9]{64}$/.test(row.sourcePin))throw Error('SDK history capture needs recovery');
  return row;
 };
 const retired=async(key,action='read')=>{
  check(action);const row=await journal.getItem(retiredPrefix+id(key));check(action);if(row===null)return[];
  if(row.schema!==1||row.scope!==scope||row.id!==key||!Array.isArray(row.sourcePins)||row.sourcePins.length>32||row.sourcePins.some(pin=>typeof pin!=='string'||!/^[a-f0-9]{64}$/.test(pin))||new Set(row.sourcePins).size!==row.sourcePins.length)throw Error('Retired SDK source record needs recovery');
  return row.sourcePins;
 };
 async function metadataKeys(action){
  check(action);const keys=await journal.keys();check(action);
  if(!Array.isArray(keys)||keys.length>10000||keys.some(key=>typeof key!=='string'))throw Error('Bounded SDK history capture catalog required');return keys;
 }
 async function resumeClear(action='read'){
  check(action);const intent=await journal.getItem(intentKey);check(action);if(intent===null)return;
  if(intent.schema!==1||intent.scope!==scope||typeof intent.operationId!=='string'||!/^sdk-clear:[a-zA-Z0-9._:-]{1,160}$/.test(intent.operationId))throw Error('SDK history clear intent needs recovery');
  // Exact retained receipts reconcile a lost write response. The source body
  // is never opened under terminal-purge-only authority.
  await visibility.clear({operationId:intent.operationId});check(action);
  const rawPrefix='rumor-history:'+Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('')+':';
  const rawIds=(await metadataKeys(action)).filter(key=>key.startsWith(rawPrefix)).map(key=>id(key.slice(rawPrefix.length)));
  for(const key of rawIds){
   const marker=await capture(key,action);let source=null;
   if(admitted()){source=await verifyOriginal(key);check(action);}
   const pins=new Set(await retired(key,action));if(marker)pins.add(marker.sourcePin);if(source)pins.add(await sourcePin(source));
   if(pins.size>32)throw Error('Retired SDK source bound exceeded');
   const row={schema:1,scope,id:key,sourcePins:[...pins].sort()};await journal.setItem(retiredPrefix+key,row);check(action);
   if(!same(await retired(key,action),row.sourcePins))throw Error('Retired SDK source write unconfirmed');
  }
  await original.clear();check(action);
  for(const key of(await metadataKeys(action)).filter(key=>key.startsWith(capturePrefix))){id(key.slice(capturePrefix.length));check(action);await journal.removeItem(key);check(action);}
  await journal.removeItem(intentKey);check(action);
 }
 function run(operation,action='read'){
  try{check(action);}catch(error){return Promise.reject(error);}
  const work=queue.then(()=>exclusive(namespace+'operation',async()=>{
   check(action);if(problem)throw Error('SDK history needs recovery');await resumeClear(action);check(action);
   if(action==='read'){await visibility.refresh();check();if(!visibility.getSnapshot().available)throw Error('SDK history visibility needs recovery');}
   const value=await operation();check(action);return value;
  },signal));
  queue=work.catch(()=>{if(admitted(action))problem='SDK history needs recovery';});return work;
 }
 async function visibleRead(key){
  const marker=await capture(key);if(!marker||!visibility.isVisible(marker))return null;
  const source=await verifyOriginal(key);check();if(!source||await sourcePin(source)!==marker.sourcePin)return null;
  const row=await original.getItem(key);check();
  const after=await verifyOriginal(key);check();
  return row&&after&&same(after,source)&&visibility.isVisible(marker)?row:null;
 }
 const close=()=>{if(closed)return;closed=true;signal.removeEventListener('abort',close);visibility.close();original.close();};
 signal.addEventListener('abort',close,{once:true});if(signal.aborted)close();
 return Object.freeze({binding:original.binding,visibility,
  getItem:key=>run(()=>visibleRead(id(key))),
  keys:()=>run(async()=>{const result=[];for(const key of await original.keys())if(await visibleRead(key))result.push(key);return result;}),
  setItem:(key,value)=>run(async()=>{
   id(key);const source=await verifyOriginal(key);check();if(!source)throw Error('Current canonical SDK original required');
   const pin=await sourcePin(source);if((await retired(key)).includes(pin))throw Error('Cleared SDK source cannot be recaptured');
   await original.setItem(key,value);check();
   const after=await verifyOriginal(key);check();if(!after||!same(after,source))throw Error('SDK source changed during capture');
   const marker={schema:1,scope,id:key,historyGeneration:visibility.getSnapshot().generation,sourcePin:pin};
   await journal.setItem(capturePrefix+key,marker);check();
   if(!same(await capture(key),marker))throw Error('SDK history capture write unconfirmed');
   await visibility.restore(key);check();
   const final=await verifyOriginal(key);check();if(!final||!same(final,source))throw Error('SDK source changed after capture');
  }),
  removeItem:key=>run(async()=>{
   id(key);await visibility.withdraw(key);check();
   await original.removeItem(key);check();await journal.removeItem(capturePrefix+key);check();
  }),
  clear:()=>run(async()=>{
   const token=newId();if(typeof token!=='string'||!token||!/^[a-zA-Z0-9._:-]{1,160}$/.test(token))throw Error('Fresh SDK clear token required');
   const intent={schema:1,scope,operationId:'sdk-clear:'+token};
   await journal.setItem(intentKey,intent);check('purge');
   if(!same(await journal.getItem(intentKey),intent))throw Error('SDK history clear intent unconfirmed');check('purge');
   await resumeClear('purge');check('purge');
  },'purge'),
  recoveryDisposition:(key,expectedSource)=>run(async()=>{
   id(key);const source=await verifyOriginal(key);check();
   if(!source)return'unresolved';if(!same(source,expectedSource))throw Error('SDK recovery source changed');
   return(await retired(key)).includes(await sourcePin(source))?'cleared':'current';
  }),
  verifyRecoveredWrites:()=>run(async()=>{await original.verifyRecoveredWrites();check();await visibility.flush();}),
  // Reopening the exact scoped SDK provider after a failed destructive write
  // replays the durable intent. Send receipts outside this namespace remain.
  async flush(){await queue;check(admitted()?'read':'purge');await visibility.flush();await original.flush();if(problem)throw Error(problem);},
  getProblem:()=>problem||original.getProblem()||visibility.getSnapshot().problem,
  close,
 });
}
