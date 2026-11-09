/** Bounded NIP-01 inbox traversal for an already admitted private conversation.
 * Gift-wrap timestamps are intentionally NOT chronological message timestamps.
 * Callers unwrap, check the exact peer and sort original rumors independently.
 * A cursor grants no authority and must never be placed in a navigation URL.
 */
const hex=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const fields=['accountId','conversationId','kind','groupId','membershipId','pubkey'];
const fail=code=>Object.assign(Error('Private conversation history unavailable'),{code});
function scopeOf(binding){
 if(!binding||!fields.every(k=>typeof binding[k]==='string'&&binding[k].length>0&&binding[k].length<=240)||!hex(binding.pubkey))throw fail('HISTORY_SCOPE_INVALID');
 return JSON.stringify(fields.map(k=>binding[k]));
}
export const PRIVATE_INBOX_HISTORY_PAGE_SIZE=200;
export const PRIVATE_INBOX_HISTORY_RELAY_LIMIT=500;
export const PRIVATE_INBOX_HISTORY_MAX_PAGE_BYTES=2*1024*1024;
const pointerOrder=(a,b)=>b.created_at-a.created_at||b.id.slice(32,48).localeCompare(a.id.slice(32,48));
async function keysetPage({peer,binding,scope,check,cursor,pageSize}){
 if(cursor!==null&&(!cursor||Object.keys(cursor).sort().join(',')!=='beforeId,scope,until,version'||cursor.version!==2||cursor.scope!==scope||!hex(cursor.beforeId)||!Number.isSafeInteger(cursor.until)||cursor.until<0||cursor.until>4294967295))throw fail('HISTORY_CURSOR_INVALID');
 if(typeof peer.readInboxBefore!=='function'||await peer.supportsHistoryCursor()!==true)throw fail('HISTORY_CURSOR_UNSUPPORTED');check();
 const before=cursor===null?null:{id:cursor.beforeId,created_at:cursor.until};
 const rows=await peer.readInboxBefore({limit:pageSize,before});check();
 if(!Array.isArray(rows)||rows.length>pageSize||new Set(rows.map(e=>e?.id)).size!==rows.length||rows.some(e=>!hex(e?.id)||e.kind!==1059||!Number.isSafeInteger(e.created_at)||e.created_at<0||e.created_at>4294967295||e.tags?.filter(t=>t[0]==='p').length!==1||!e.tags.some(t=>t[0]==='p'&&t[1]===binding.pubkey)||before!==null&&pointerOrder(e,before)<=0))throw fail('HISTORY_RELAY_INVALID');
 const ordered=[...rows].sort(pointerOrder),events=[];let bytes=0;
 for(const e of ordered){const size=new TextEncoder().encode(JSON.stringify(e)).length;if(size>128*1024)throw fail('HISTORY_RELAY_INVALID');if(bytes+size>PRIVATE_INBOX_HISTORY_MAX_PAGE_BYTES)break;bytes+=size;events.push(e);}
 let nextCursor=null;if(rows.length===pageSize||events.length<rows.length){const last=events.at(-1);if(!last)throw fail('HISTORY_RELAY_INVALID');nextCursor=Object.freeze({version:2,scope,until:last.created_at,beforeId:last.id});}
 check();return Object.freeze({events:Object.freeze(events),nextCursor,exhausted:nextCursor===null});
}
/** Returns ciphertext originals only. One authenticated bounded relay request.
 * Re-reads the inclusive boundary with room for previously seen originals.
 * Never jumps to until-1: that would silently omit same-second gift wraps.
 * If the relay cap makes that second unenumerable, fail explicitly rather than
 * reporting a complete history. The cursor is unchanged and can be retried.
 */
export async function readPrivateInboxHistoryPage({peer,binding,isCurrent,cursor=null,pageSize=PRIVATE_INBOX_HISTORY_PAGE_SIZE}){
 const check=()=>{if(typeof isCurrent!=='function'||isCurrent()!==true)throw fail('HISTORY_ADMISSION_LOST');};
 check();const scope=scopeOf(binding);
 if(typeof peer?.readInbox!=='function'||!Number.isInteger(pageSize)||pageSize<1||pageSize>200)throw fail('HISTORY_REQUEST_INVALID');
 // Capability-gated owned extension. An older relay that ignores search must
 // never turn an empty result into an apparent complete private history.
 if(cursor?.version===2||cursor===null&&typeof peer.supportsHistoryCursor==='function'&&await peer.supportsHistoryCursor()===true){check();return keysetPage({peer,binding,scope,check,cursor,pageSize});}
 let until,seen=[];
 if(cursor!==null){
  if(!cursor||typeof cursor!=='object'||Array.isArray(cursor)||Object.keys(cursor).sort().join(',')!=='boundaryIds,scope,until,version'||cursor.version!==1||cursor.scope!==scope||!Number.isSafeInteger(cursor.until)||cursor.until<0||!Array.isArray(cursor.boundaryIds)||cursor.boundaryIds.length<1||cursor.boundaryIds.length>500||!cursor.boundaryIds.every(hex)||new Set(cursor.boundaryIds).size!==cursor.boundaryIds.length)throw fail('HISTORY_CURSOR_INVALID');
  until=cursor.until;seen=[...cursor.boundaryIds];
 }
 const limit=Math.min(PRIVATE_INBOX_HISTORY_RELAY_LIMIT,pageSize+seen.length);
 const rows=await peer.readInbox({limit,...(until===undefined?{}:{until})});check();
 if(!Array.isArray(rows)||rows.length>limit||new Set(rows.map(e=>e?.id)).size!==rows.length||rows.some(e=>!hex(e?.id)||e.kind!==1059||!Number.isSafeInteger(e.created_at)||e.created_at<0||until!==undefined&&e.created_at>until||e.tags?.filter(t=>t[0]==='p').length!==1||!e.tags.some(t=>t[0]==='p'&&t[1]===binding.pubkey)))throw fail('HISTORY_RELAY_INVALID');
 const ordered=[...rows].sort((a,b)=>b.created_at-a.created_at||a.id.localeCompare(b.id));
 const seenSet=new Set(seen),fresh=ordered.filter(e=>e.created_at!==until||!seenSet.has(e.id)),events=[];
 let bytes=0;
 for(const event of fresh){const size=new TextEncoder().encode(JSON.stringify(event)).length;if(size>128*1024)throw fail('HISTORY_RELAY_INVALID');if(events.length>=pageSize||bytes+size>PRIVATE_INBOX_HISTORY_MAX_PAGE_BYTES)break;events.push(event);bytes+=size;}
 let nextCursor=null;
 if(rows.length===limit||events.length<fresh.length){
  if(!events.length)throw fail('HISTORY_BOUNDARY_SATURATED');
  const boundary=events.at(-1).created_at;
  const boundaryIds=[...new Set([...(boundary===until?seen:[]),...events.filter(e=>e.created_at===boundary).map(e=>e.id)])].sort();
  if(boundary===until&&(!events.length||boundaryIds.length>=PRIVATE_INBOX_HISTORY_RELAY_LIMIT))throw fail('HISTORY_BOUNDARY_SATURATED');
  nextCursor=Object.freeze({version:1,scope,until:boundary,boundaryIds:Object.freeze(boundaryIds)});
 }
 check();return Object.freeze({events:Object.freeze(events),nextCursor,exhausted:nextCursor===null});
}
