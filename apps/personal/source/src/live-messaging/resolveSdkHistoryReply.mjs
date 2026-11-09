/** Resolve one original reply target through the admitted SDK. Own archive rows
 * additionally need the exact original request/media ACK; archive presence is
 * never a publication receipt. No identity discovery or grant is performed. */
export async function resolveSdkHistoryReply({id,binding,history,sourceFor,readMediaJournal,isCurrent,ownTextConfirmed=false}){
 const fields=['kind','accountId','conversationId','groupId','pubkey','membershipId'];
 if(typeof id!=='string'||!/^[a-f0-9]{64}$/.test(id)||!binding||!['person','spot','circle'].includes(binding.kind)||typeof isCurrent!=='function'||typeof sourceFor!=='function'||!history?.queryRumors)throw Error('Original admitted SDK reply scope required');
 const check=()=>{if(isCurrent()!==true)throw Error('Reply original is no longer admitted');};
 check();const source=await sourceFor(id);check();if(!source)return null;
 const rows=await history.queryRumors({ids:[id],kinds:[9],limit:1});check();const original=rows[0];if(!original||original.id!==id||original.kind!==9||!/^[a-f0-9]{64}$/.test(original.pubkey))return null;
 let status='received';
 if(original.pubkey===binding.pubkey){
  let confirmed=ownTextConfirmed===true;
  if(!confirmed&&typeof readMediaJournal==='function'){
   const record=await readMediaJournal();check();
   if(record?.schema===1&&record.binding&&Object.keys(record.binding).length===fields.length&&fields.every(key=>record.binding[key]===binding[key])&&Array.isArray(record.attempts)&&record.attempts.length<=1000)confirmed=record.attempts.some(row=>row?.messageId===id&&row.status==='sent-to-relay'&&typeof row.id==='string'&&row.id.length>0&&row.id.length<=200&&/^[a-f0-9]{64}$/.test(row.fingerprint||''));
  }
  if(!confirmed)return null;status='sent-to-relay';
 }
 const after=await sourceFor(id);check();if(!after||JSON.stringify(after)!==JSON.stringify(source))return null;
 return Object.freeze({id,status});
}
