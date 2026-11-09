import {validReplyId} from './conversationReply.mjs';
/** Per-tab durable attempt metadata; contains UUID + SHA256 only, no message text or signing material.
 * An unresolved attempt survives navigation/reload. A reopened process never gets permission to republish a dispatched attempt.
 */
export async function openBrowserAttemptOutbox({accountKey,conversationId,storage=globalThis.sessionStorage,crypto=globalThis.crypto,exclusive}){
 if(!accountKey||!conversationId||!storage||!crypto?.subtle)throw Error('Current account outbox unavailable');
 const digest=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),n=>n.toString(16).padStart(2,'0')).join('');
 const contentDigest=(text,replyTo)=>{if(replyTo!=null&&!validReplyId(replyTo))throw Error('Original reply identity required');return digest(replyTo==null?text:JSON.stringify([text,replyTo]));};
 const storageKey='crays.messaging.attempt.v1:'+await digest(JSON.stringify([accountKey,conversationId]));
 let queue=Promise.resolve();
 if(exclusive!==undefined&&typeof exclusive!=='function')throw Error('Exclusive attempt journal required');
 const serial=fn=>{const result=queue.then(()=>exclusive?exclusive(storageKey,fn):fn());queue=result.catch(()=>{});return result;};
 const read=async()=>{const raw=await storage.getItem(storageKey);if(raw===null)return null;if(raw.length>4096)throw Error('Outbox record needs review');const value=JSON.parse(raw);if(value?.schema!==1||typeof value.requestId!=='string'||value.requestId.length>200||!/^[0-9a-f]{64}$/.test(value.digest)||!['prepared','pending','sent-to-relay','unconfirmed'].includes(value.status))throw Error('Outbox record needs review');return value;};
 const write=value=>storage.setItem(storageKey,JSON.stringify(value));
 return {
  prepare:(text,replyTo=null)=>serial(async()=>{const hash=await contentDigest(text,replyTo),current=await read();if(current&&current.digest===hash)return{requestId:current.requestId};if(current&&!['prepared','sent-to-relay'].includes(current.status))throw Error('Resolve the previous message before sending another');const requestId=crypto.randomUUID();await write({schema:1,requestId,digest:hash,status:'prepared'});return{requestId};}),
  claim:(requestId,text,replyTo=null)=>serial(async()=>{const hash=await contentDigest(text,replyTo),current=await read();if(!current||current.requestId!==requestId||current.digest!==hash)throw Error('Exact saved message attempt required');const canPublish=current.status==='prepared';if(canPublish)await write({...current,status:'pending'});return{canPublish,result:current.status==='sent-to-relay'?{status:'sent-to-relay',requestId}:null};}),
  confirm:(requestId,result)=>serial(async()=>{const current=await read();if(current?.requestId===requestId&&result.status==='sent-to-relay')await write({...current,status:'sent-to-relay'});}),
  reconcile:messages=>serial(async()=>{const current=await read();if(!current)return;for(const row of messages){if(row.requestId===current.requestId&&row.status==='sent-to-relay'&&await contentDigest(row.text,row.replyTo)===current.digest){await write({...current,status:'sent-to-relay'});return;}}}),
  acknowledge:requestId=>serial(async()=>{const current=await read();if(current?.requestId===requestId&&current.status==='sent-to-relay'){await storage.removeItem(storageKey);return true;}}),
 };
}
