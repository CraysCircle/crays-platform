/** Durable visibility fence for an already admitted SDK group incarnation.
 * This is not a delete/publish API. Only the SDK history adapter may call
 * withdraw/clear/restore; cached rows must carry their capture generation.
 * Original send receipts are deliberately outside this ledger.
 */
export async function openHistoryVisibility({binding,journal,exclusive,authorize,authorizePurge,signal,verifyOriginal,newId=()=>globalThis.crypto.randomUUID()}){
 const fields=['kind','accountId','conversationId','groupId','pubkey','membershipId'],hex=id=>typeof id==='string'&&/^[a-f0-9]{64}$/.test(id);
 if(!binding||Object.keys(binding).length!==fields.length||!['person','spot','circle'].includes(binding.kind)||!fields.slice(1,3).every(key=>typeof binding[key]==='string'&&binding[key]&&binding[key].length<=200)||!fields.slice(3).every(key=>hex(binding[key]))||!journal?.getItem||!journal?.setItem||typeof exclusive!=='function'||typeof authorize!=='function'||typeof verifyOriginal!=='function'||!signal?.addEventListener)throw Error('Admitted SDK history visibility ports required');
 if(authorizePurge!==undefined&&typeof authorizePurge!=='function')throw Error('Exact scoped metadata purge permission required');
 binding=Object.freeze({...binding});const scope=Object.freeze(fields.map(key=>binding[key])),address='history-visibility:v1:'+JSON.stringify(scope);
 const listeners=new Set(),pending=new Map(),failedOperations=new Set();let closed=false,problem=null,queue=Promise.resolve(),state={schema:1,scope,revision:0,generation:0,withdrawnIds:[],operationId:null,clearReceipts:[]};
 const admitted=(action='read')=>!closed&&!signal.aborted&&(action==='purge'&&authorizePurge?authorizePurge(binding):authorize(binding))===true;
 const check=(action='read')=>{if(!admitted(action))throw Error('History visibility is no longer admitted');};
 function validate(value){
  if(value==null)return{schema:1,scope,revision:0,generation:0,withdrawnIds:[],operationId:null,clearReceipts:[]};
  if(value.schema!==1||JSON.stringify(value.scope)!==JSON.stringify(scope)||!Number.isSafeInteger(value.revision)||value.revision<0||value.revision>=Number.MAX_SAFE_INTEGER||!Number.isSafeInteger(value.generation)||value.generation<0||value.generation>value.revision||!Array.isArray(value.withdrawnIds)||value.withdrawnIds.length>10000||value.withdrawnIds.some(id=>!hex(id))||new Set(value.withdrawnIds).size!==value.withdrawnIds.length||!Array.isArray(value.clearReceipts)||value.clearReceipts.length>1000||value.clearReceipts.length!==value.generation||value.clearReceipts.some(id=>typeof id!=='string'||!id||id.length>200)||new Set(value.clearReceipts).size!==value.clearReceipts.length||value.revision===0&&value.operationId!==null||value.revision>0&&(typeof value.operationId!=='string'||!value.operationId||value.operationId.length>200))throw Error('Stored history visibility needs recovery');
  return{schema:1,scope,revision:value.revision,generation:value.generation,withdrawnIds:[...value.withdrawnIds],operationId:value.operationId,clearReceipts:[...value.clearReceipts]};
 }
 const notify=()=>{for(const fn of listeners)fn();};
 const read=async(action='read')=>{check(action);const fresh=validate(await journal.getItem(address));check(action);return fresh;};
 function isVisible(row){
  if(!admitted()||problem||failedOperations.size||!row||!hex(row.id)||[...pending.values()].some(op=>op.type==='clear'||op.type==='withdraw'&&op.id===row.id))return false;
  return(row.historyGeneration??0)===state.generation&&!state.withdrawnIds.includes(row.id);
 }
 const snapshot=()=>Object.freeze({available:admitted()&&!problem&&!failedOperations.size,generation:admitted()?state.generation:null,revision:admitted()?state.revision:null,pending:admitted()?pending.size:0,problem:admitted()?problem:null});
 const serial=fn=>{const work=queue.then(fn);queue=work.catch(()=>{});return work;};
 async function apply(op){
  const action=op.type==='clear'?'purge':'read';check(action);return exclusive(address,async()=>{
   let fresh=await read(action);
   // A response may have been lost after the actual encrypted write. Re-read
   // this exact operation before deciding whether any further write is needed.
   let source=null;
   if(op.type==='restore'){
    source=await verifyOriginal(op.id);check();if(!source)throw Error('Current saved SDK original required');
    const after=await verifyOriginal(op.id);check();if(!after||JSON.stringify(after)!==JSON.stringify(source))throw Error('SDK original changed during visibility restoration');
   }
   const ids=new Set(fresh.withdrawnIds);
   const replayed=op.type==='clear'?fresh.clearReceipts.includes(op.operationId):fresh.operationId===op.operationId||op.type==='withdraw'&&ids.has(op.id)||op.type==='restore'&&!ids.has(op.id);
   if(replayed){state=fresh;pending.delete(op.operationId);failedOperations.delete(op.operationId);if(!failedOperations.size)problem=null;notify();return;}
   if(op.type==='withdraw')ids.add(op.id);else if(op.type==='restore')ids.delete(op.id);else ids.clear();
   if(ids.size>10000||fresh.revision>=Number.MAX_SAFE_INTEGER-1||op.type==='clear'&&fresh.clearReceipts.length>=1000)throw Error('History visibility bound exceeded');
   const next={...fresh,revision:fresh.revision+1,generation:fresh.generation+(op.type==='clear'?1:0),withdrawnIds:[...ids].sort(),operationId:op.operationId,clearReceipts:op.type==='clear'?[...fresh.clearReceipts,op.operationId]:fresh.clearReceipts};
   if(op.type==='restore'){const current=await verifyOriginal(op.id);check();if(!current||JSON.stringify(current)!==JSON.stringify(source))throw Error('SDK original changed during visibility restoration');}
   await journal.setItem(address,next);check(action);fresh=await read(action);
   if(JSON.stringify(fresh)!==JSON.stringify(next))throw Error('History visibility write could not be confirmed');
   if(op.type==='restore'){const current=await verifyOriginal(op.id);check();if(!current||JSON.stringify(current)!==JSON.stringify(source))throw Error('SDK original changed after visibility write');}
   state=fresh;pending.delete(op.operationId);failedOperations.delete(op.operationId);if(!failedOperations.size)problem=null;notify();
  },signal);
 }
 function execute(op){return serial(async()=>{try{await apply(op);}catch(error){if(admitted(op.type==='clear'?'purge':'read')){failedOperations.add(op.operationId);problem='Message history visibility could not be saved. Keep this conversation closed until recovery.';notify();}throw error;}});}
 function change(type,id,retainedOperationId){
  check(type==='clear'?'purge':'read');if(retainedOperationId!==undefined&&(type!=='clear'||typeof retainedOperationId!=='string'||!/^sdk-clear:[a-zA-Z0-9._:-]{1,160}$/.test(retainedOperationId)))throw Error('Exact retained SDK clear operation required');
  if(retainedOperationId!==undefined&&pending.has(retainedOperationId)){const prior=pending.get(retainedOperationId);if(prior.type!=='clear')throw Error('History visibility operation conflict');return execute(prior);}
  if(problem)throw Error('History visibility needs recovery before further changes');if(type!=='clear'&&!hex(id))throw Error('Exact original history ID required');if(pending.size>=1000)throw Error('History visibility pending bound exceeded');
  const operationId=retainedOperationId??newId();if(typeof operationId!=='string'||!operationId||operationId.length>200||pending.has(operationId))throw Error('Fresh history visibility operation required');const op=Object.freeze({type,id,operationId});pending.set(operationId,op);notify();return execute(op);
 }
 const close=()=>{if(closed)return;closed=true;signal.removeEventListener('abort',close);pending.clear();failedOperations.clear();state={...state,withdrawnIds:[]};notify();listeners.clear();};
 try{const openingAction=admitted()?'read':'purge';await exclusive(address,async()=>{state=await read(openingAction);},signal);check(openingAction);}catch(error){closed=true;throw error;}
 signal.addEventListener('abort',close,{once:true});if(signal.aborted)close();
 return Object.freeze({getSnapshot:snapshot,isVisible,subscribe(fn){if(closed)return()=>{};listeners.add(fn);return()=>listeners.delete(fn);},withdraw:id=>change('withdraw',id),clear:options=>{if(options!==undefined&&(!options||Object.keys(options).join(',')!=='operationId'))throw Error('Exact retained SDK clear operation required');return change('clear',null,options?.operationId);},restore:id=>change('restore',id),
  retry:()=>serial(async()=>{check();for(const op of [...pending.values()]){try{await apply(op);}catch(error){failedOperations.add(op.operationId);problem='Message history visibility still needs recovery.';notify();throw error;}}if(!pending.size){try{await exclusive(address,async()=>{state=await read();problem=null;},signal);notify();}catch(error){if(admitted()){problem='Stored message history visibility needs recovery.';notify();}throw error;}}}),
  refresh:()=>serial(async()=>{try{check();await exclusive(address,async()=>{state=await read();},signal);notify();}catch(error){if(admitted()){problem='Stored message history visibility needs recovery.';notify();}throw error;}}),async flush(){await queue;if(problem||failedOperations.size)throw Error('History visibility has unresolved changes');},close,
 });
}
