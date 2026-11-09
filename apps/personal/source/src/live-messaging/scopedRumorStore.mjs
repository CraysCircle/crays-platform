/** GroupRumorHistory key/value adapter over an already admitted encrypted store.
 * No keys, identity discovery or membership grants. Each immutable rumor is one
 * durable record; the borrowed journal remains owned by its original parent. */
export async function openScopedRumorStore({binding,journal,authorize,authorizePurge,validateRumor,crypto=globalThis.crypto}){
 const fields=['kind','accountId','conversationId','groupId','pubkey','membershipId'];
 const scope=Object.freeze(Object.fromEntries(fields.map(key=>[key,binding?.[key]])));
 const hex=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
 if(!['person','spot','circle'].includes(scope.kind)||['chuck','person:chuck'].includes(scope.conversationId)||!['accountId','conversationId'].every(key=>typeof scope[key]==='string'&&scope[key]&&scope[key].length<=200)||!['groupId','pubkey','membershipId'].every(key=>hex(scope[key]))||!journal?.getItem||!journal?.setItem||!journal?.removeItem||!journal?.keys||typeof authorize!=='function'||typeof validateRumor!=='function'||!crypto?.subtle)throw Error('Admitted encrypted group history required');
 let closed=false,queue=Promise.resolve(),failure=null,unresolvedOtherFailure=false;const failedWrites=new Set();
 if(authorizePurge!==undefined&&typeof authorizePurge!=='function')throw Error('Explicit scoped history purge permission required');
 const check=(action='read')=>{if(closed||(action==='purge'&&authorizePurge?authorizePurge(scope):authorize(scope))!==true)throw Error('Group history is no longer admitted');};
 // An empty group's first storage call can be the SDK's post-ACK purge, after
 // read admission is closed. Constructing its opaque namespace grants no read.
 const checkOpen=()=>{if(closed||authorize(scope)!==true&&authorizePurge?.(scope)!==true)throw Error('Group history is no longer admitted');};checkOpen();
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(scope)));checkOpen();
 const prefix='rumor-history:'+Array.from(new Uint8Array(bytes),byte=>byte.toString(16).padStart(2,'0')).join('')+':';
 const id=value=>{if(!hex(value))throw Error('Exact original rumor identity required');return value;};
 const valid=value=>{const rumor=validateRumor(structuredClone(value));if(!rumor||!hex(rumor.id)||new TextEncoder().encode(JSON.stringify(rumor)).byteLength>256*1024)throw Error('Invalid or oversized application rumor');return Object.fromEntries(['id','pubkey','created_at','kind','tags','content'].map(key=>[key,rumor[key]]));};
 const read=async key=>{
  check();const row=await journal.getItem(prefix+id(key));check();if(row===null)return null;
  if(row?.schema!=='crays.scoped-rumor.v1'||JSON.stringify(row.binding)!==JSON.stringify(scope)||row.rumor?.id!==key)throw Error('Encrypted history record scope mismatch');return valid(row.rumor);
 };
 const keys=async(action='read')=>{check(action);const all=await journal.keys();check(action);if(!Array.isArray(all)||all.length>10000||all.some(key=>typeof key!=='string'))throw Error('Bounded encrypted history catalog required');return all.filter(key=>key.startsWith(prefix)).map(key=>id(key.slice(prefix.length)));};
 const serial=(operation,action='read',writeId=null,recoveryAttempt=false)=>{try{check(action);}catch(error){return Promise.reject(error);}const work=queue.then(async()=>{check(action);const result=await operation();check(action);return result;});queue=work.catch(error=>{failure=error;if(!recoveryAttempt){if(writeId&&failedWrites.size<10000)failedWrites.add(writeId);else unresolvedOtherFailure=true;}});return work;};
 return Object.freeze({binding:scope,
  getItem:key=>serial(()=>read(key)),
  setItem:(key,value)=>{let copy;try{copy=valid(value);if(copy.id!==id(key))throw Error('Original rumor identity mismatch');}catch(error){return Promise.reject(error);}return serial(async()=>{
   const previous=await read(key);if(previous){if(JSON.stringify(previous)!==JSON.stringify(copy))throw Error('Original rumor content changed');return;}
   check();await journal.setItem(prefix+key,{schema:'crays.scoped-rumor.v1',binding:scope,rumor:copy});
  },'read',key);},
  removeItem:key=>serial(async()=>{check();await journal.removeItem(prefix+id(key));}),
  keys:()=>serial(keys),
  // Deletion is limited to this exact incarnation. A failed purge is reported;
  // no account-wide clear or successful all-or-nothing purge is invented.
  clear:()=>serial(async()=>{for(const key of await keys('purge')){check('purge');await journal.removeItem(prefix+key);}},'purge'),
  // A successful unrelated write never clears the drain fault. Only read back
  // every exact failed original under the original validator/admission. Other
  // failed operations (remove/purge/read/catalog) retain their separate fault.
  verifyRecoveredWrites:()=>serial(async()=>{
   if(unresolvedOtherFailure)throw Error('Other history operations still need recovery');
   for(const key of failedWrites){const row=await read(key);if(!row||row.id!==key)throw Error('Failed original is not durably recovered');}
   failedWrites.clear();failure=null;
  },'read',null,true),
  async flush(){await queue;if(failure)throw failure;},
  getProblem:()=>failure?'Group history persistence needs recovery':null,
  close(){closed=true;},
 });
}
