import {createPrivateBlossomStore,authorizePrivateBlossomOperation} from './privateBlossomStore.mjs';
const hex=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value),fail=()=>Error('This group attachment is unavailable');
/** Bytes here are already MLS-encrypted media. No plaintext, filename, group
 * encryption key or external destination is accepted by this server bridge. */
export function createOwnedGroupBlossomBridge({directory,openCustody,fetcher=globalThis.fetch}){
 if(typeof directory?.get!=='function'||typeof directory?.relayScope!=='function'||typeof openCustody!=='function')throw fail();
 return async({binding,command,signal,isCurrent})=>{
  const fields=command&&typeof command==='object'&&!Array.isArray(command)?Object.keys(command).sort().join(','):'';
  if(!signal?.addEventListener||typeof isCurrent!=='function'||!['get','upload'].includes(command?.action)||fields!==(command.action==='get'?'action,conversationId,hash':'action,conversationId,data,hash')||!hex(command.hash))throw fail();
  const check=()=>{if(signal.aborted||isCurrent()!==true)throw fail();};check();const row=await directory.get(binding,command.conversationId);check();if(!row)throw fail();const scope=await directory.relayScope(binding,[row.relay]);check();
  const current=()=>{try{check();return directory.isRelayScopeCurrent(binding,scope)===true;}catch{return false;}};
  let bytes,signer;
  try{
   if(command.action==='upload'){if(typeof command.data!=='string'||command.data.length>7*1024*1024||!/^[A-Za-z0-9+/]+={0,2}$/.test(command.data))throw fail();bytes=new Uint8Array(Buffer.from(command.data,'base64'));if(bytes.length<17||bytes.length>5*1024*1024||Buffer.from(bytes).toString('base64')!==command.data)throw fail();const {createHash}=await import('node:crypto');if(createHash('sha256').update(bytes).digest('hex')!==command.hash)throw fail();}
   if(!current())throw fail();signer=await openCustody({binding,signal,isCurrent:current,authorizeOperation:(actual,operation)=>current()&&authorizePrivateBlossomOperation(actual,operation)});
   const store=createPrivateBlossomStore({signer,pubkey:binding.pubkey,isCurrent:current,signal,fetch:fetcher});
   if(command.action==='upload'){const hash=await store.write(bytes);if(!current()||hash!==command.hash)throw fail();return{url:'http://127.0.0.1:18994/'+hash+'.bin',sha256:hash,size:bytes.length,type:'application/octet-stream'};}
   const result=await store.read(command.hash);if(!current())throw fail();return result;
  }finally{bytes?.fill(0);signer?.close();}
 };
}
