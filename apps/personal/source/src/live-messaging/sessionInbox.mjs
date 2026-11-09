import {validHumanConversationId} from './humanConversationAddress.mjs';
import {conversationMessageExpiry} from './conversationTimer.mjs';
const empty=Object.freeze({rows:Object.freeze({}),preferences:Object.freeze({}),state:'idle',loaded:0,total:null,readStateProblem:false});
/** Actual admitted messages only. Session lifetime, never private plaintext in
 * the demo world or browser storage. An unloaded conversation has no summary. */
export function createSessionInbox({accountId,pubkey,signal}){
 if(!accountId||!pubkey||!signal?.addEventListener)throw Error('Canonical inbox scope required');
 let state=empty,closed=signal.aborted;const listeners=new Set(),seen=new Map(),bindings=new Map(),received=new Map(),hidden=new Map(),timerChanges=new Map(),messageTimes=new Map();let expiryAlarm;
 const expire=()=>{
  if(closed)return;clearTimeout(expiryAlarm);let next=Infinity,changed=false;const rows={...state.rows},time=Date.now();
  for(const [id,changes]of timerChanges){
   const known=received.get(id),times=messageTimes.get(id);if(known&&times)for(const key of known){const createdAt=times.get(key);if(createdAt===undefined)continue;const expiry=conversationMessageExpiry({createdAt},changes);if(expiry<=time){known.delete(key);times.delete(key);changed=true;}else next=Math.min(next,expiry);}
   const row=rows[id];if(row){const expiry=conversationMessageExpiry({createdAt:row.createdAt},changes);if(expiry<=time){delete rows[id];changed=true;}else{next=Math.min(next,expiry);const unread=[...(known||[])].filter(value=>!seen.get(id)?.has(value)).length;if(unread!==row.unread){rows[id]=Object.freeze({...row,unread});changed=true;}}}
  }
  if(changed)state=Object.freeze({...state,rows:Object.freeze(rows)});
  if(Number.isFinite(next)){expiryAlarm=setTimeout(()=>{expire();for(const fn of listeners)fn();},Math.min(Math.max(1,next-time),2147483647));expiryAlarm.unref?.();}
 };
 const emit=()=>{expire();for(const fn of listeners)fn();};
 // Only received IDs retained for unread accounting need timestamps. The row
 // has its own timestamp; historical/outgoing messages must not grow this map.
 const trimTimes=id=>{const times=messageTimes.get(id),known=received.get(id);if(times)for(const key of times.keys())if(!known?.has(key))times.delete(key);};
 function remove(id){if(!Object.hasOwn(state.rows,id))return;const rows={...state.rows};delete rows[id];seen.delete(id);bindings.delete(id);received.delete(id);timerChanges.delete(id);messageTimes.delete(id);state=Object.freeze({...state,rows:Object.freeze(rows)});emit();}
 function receive(id,snapshot){
  if(closed||!validHumanConversationId(id))return;
  if(!snapshot.available){remove(id);return;}
  if(snapshot.timerChanges)timerChanges.set(id,snapshot.timerChanges);
  const times=messageTimes.get(id)||new Map();for(const m of snapshot.messages)if(Number.isSafeInteger(m.createdAt))times.set(m.id,m.createdAt);messageTimes.set(id,times);
  const messages=snapshot.messages.filter(m=>['received','sent-to-relay','unconfirmed','sending'].includes(m.status));
  const last=messages.at(-1);if(!last){emit();return;}
  const read=seen.get(id)||new Set(),known=received.get(id)||new Set();for(const m of messages)if(m.author!==pubkey&&m.author!=='self')known.add(m.id);while(known.size>1000)known.delete(known.values().next().value);received.set(id,known);trimTimes(id);const unread=[...known].filter(value=>!read.has(value)).length;
  const a=last.attachments?.[0],type=typeof a?.mediaType==='string'?a.mediaType:'',media=a?(type.startsWith('image/')?'Photo':type.startsWith('video/')?'Video':type.startsWith('audio/')?'Audio':type==='application/pdf'?'PDF': 'File'):'';
  const preview=(media?media+(last.text?' · '+last.text:''):last.text||'').slice(0,300);
  const row=Object.freeze({preview,createdAt:Number.isSafeInteger(last.createdAt)&&last.createdAt>=0&&last.createdAt<=253402300799?last.createdAt:null,own:last.author===pubkey||last.author==='self',status:last.status,unread,messageId:last.id,offline:snapshot.state==='offline'});
  if(JSON.stringify(state.rows[id])===JSON.stringify(row)){expire();return;}
  state=Object.freeze({...state,rows:Object.freeze({...state.rows,[id]:row})});emit();
 }
 const close=()=>{if(closed)return;closed=true;state=empty;seen.clear();bindings.clear();received.clear();hidden.clear();timerChanges.clear();messageTimes.clear();clearTimeout(expiryAlarm);signal.removeEventListener('abort',close);emit();listeners.clear();};
 signal.addEventListener('abort',close,{once:true});
 return Object.freeze({getSnapshot:()=>{expire();return closed?empty:state;},subscribe(fn){if(closed)return()=>{};listeners.add(fn);return()=>listeners.delete(fn);},receive,
  receivePage(entries){if(closed)return;const rows={...state.rows};for(const entry of entries){const id=entry.conversationId,binding=entry.groupId+':'+entry.membershipId;if(bindings.has(id)&&bindings.get(id)!==binding){delete rows[id];seen.delete(id);received.delete(id);timerChanges.delete(id);messageTimes.delete(id);}bindings.set(id,binding);
   if(entry.state==='unavailable'){if(rows[id])rows[id]=Object.freeze({...rows[id],offline:true});continue;}
   if(entry.timerChanges)timerChanges.set(id,entry.timerChanges);const times=messageTimes.get(id)||new Map();for(const m of entry.receivedTimes||[])times.set(m.messageId,m.createdAt);messageTimes.set(id,times);
   const known=received.get(id)||new Set();for(const value of entry.receivedIds)if(!hidden.get(id)?.has(value))known.add(value);while(known.size>1000)known.delete(known.values().next().value);received.set(id,known);trimTimes(id);
   const m=entry.latest;if(!m)continue;const read=seen.get(id)||new Set(),unread=[...known].filter(value=>!read.has(value)).length,previous=rows[id];
   if(hidden.get(id)?.has(m.messageId)){rows[id]=previous&&!hidden.get(id)?.has(previous.messageId)?Object.freeze({...previous,unread,offline:false}):Object.freeze({preview:'Messages hidden on this device',createdAt:m.createdAt,own:false,status:m.status,unread,messageId:m.messageId,offline:false});continue;}
   if(previous&&(previous.createdAt>m.createdAt||previous.createdAt===m.createdAt&&previous.messageId.localeCompare(m.messageId)>0)){rows[id]=Object.freeze({...previous,unread,offline:false});continue;}
   const t=m.mediaType,media=t?(t.startsWith('image/')?'Photo':t.startsWith('video/')?'Video':t.startsWith('audio/')?'Audio':t==='application/pdf'?'PDF':'File'):'';
   rows[id]=Object.freeze({preview:(media?media+(m.text?' · '+m.text:''):m.text).slice(0,300),createdAt:m.createdAt,own:m.author===pubkey,status:m.status,unread,messageId:m.messageId,offline:false});
  }state=Object.freeze({...state,rows:Object.freeze(rows)});emit();},
  setHidden(id,ids){if(closed)return;const value=new Set(ids),before=hidden.get(id);if(before&&before.size===value.size&&[...value].every(x=>before.has(x)))return;hidden.set(id,value);const known=received.get(id);if(known)for(const key of value)known.delete(key);const row=state.rows[id];if(row){const unread=[...(known||[])].filter(x=>!seen.get(id)?.has(x)).length;state=Object.freeze({...state,rows:Object.freeze({...state.rows,[id]:Object.freeze({...row,unread,...(value.has(row.messageId)?{preview:'Messages hidden on this device'}:{})})})});emit();}},
  setStatus(part){if(closed)return;state=Object.freeze({...state,...part});emit();},
  hydratePreferences(values){if(closed)return;const preferences={...state.preferences};for(const value of values)if(!Object.hasOwn(preferences,value.conversationId)&&validHumanConversationId(value.conversationId)&&typeof value.archived==='boolean')preferences[value.conversationId]=Object.freeze({archived:value.archived});state=Object.freeze({...state,preferences:Object.freeze(preferences)});emit();},
  setPreference(id,value){if(closed||!validHumanConversationId(id)||typeof value?.archived!=='boolean')return;state=Object.freeze({...state,preferences:Object.freeze({...state.preferences,[id]:Object.freeze({archived:value.archived})})});emit();},
  clear(){if(closed)return;state=empty;seen.clear();bindings.clear();received.clear();hidden.clear();timerChanges.clear();messageTimes.clear();clearTimeout(expiryAlarm);emit();},
  restoreRead(id,ids,binding){if(closed)return;if(binding){if(bindings.has(id)&&bindings.get(id)!==binding){seen.delete(id);received.delete(id);}bindings.set(id,binding);}const read=seen.get(id)||new Set();for(const value of ids)read.add(value);while(read.size>1000)read.delete(read.values().next().value);seen.set(id,read);},
  markRead(id,messages){if(closed)return null;const ids=seen.get(id)||new Set(),before=[...ids].join();for(const known of received.get(id)||[])ids.add(known);for(const m of messages)if(m.author!==pubkey&&m.author!=='self')ids.add(m.id);while(ids.size>1000)ids.delete(ids.values().next().value);seen.set(id,ids);const row=state.rows[id];if(row?.unread){state=Object.freeze({...state,rows:Object.freeze({...state.rows,[id]:Object.freeze({...row,unread:0})})});emit();}return [...ids].join()!==before||state.readStateProblem?[...ids]:null;},close});
}
