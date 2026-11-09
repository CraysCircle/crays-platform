/** Repair missing SDK rumors from its retained authenticated delivery evidence.
 * No new decryption/identity/membership authority. Never replay withdrawn payloads
 * from pending retractions, raw relay JSON, summaries or a guessed timestamp. */
export async function recoverSdkHistory({readEvidence,decodeEvidence,parseRumor,currentSource,history,store,isCurrent,signal}){
 if(![readEvidence,decodeEvidence,parseRumor,currentSource,isCurrent].every(value=>typeof value==='function')||!history?.saveRumor||!history?.removeMessage||!store?.getItem||!store?.verifyRecoveredWrites)throw Error('Original SDK recovery ports required');
 const check=()=>{if(signal?.aborted||isCurrent()!==true)throw Error('History recovery is no longer admitted');};
 check();const bytes=await readEvidence();check();
 let checked=0,repaired=0,unresolved=0,excluded=0;
 if(bytes!==null&&bytes!==undefined){
  if(!(bytes instanceof Uint8Array)||bytes.byteLength>16*1024*1024)throw Error('Bounded SDK delivery evidence required');
  const evidence=decodeEvidence(bytes);check();
  if(!Array.isArray(evidence?.entries)||evidence.entries.length>1000)throw Error('Bounded validated SDK delivery entries required');
  const seen=new Set();
  for(const entry of evidence.entries){
   check();const rumor=parseRumor(entry.payload);
   if(!rumor||rumor.id!==entry.rumorId||!/^[a-f0-9]{64}$/.test(rumor.id)||new TextEncoder().encode(JSON.stringify(rumor)).byteLength>256*1024)throw Error('Exact validated SDK original required');
   if(seen.has(rumor.id))continue;seen.add(rumor.id);checked++;
   const existing=await store.getItem(rumor.id);check();if(existing)continue;
   const source=await currentSource(rumor.id);check();if(!source){unresolved++;continue;}
   if(store.recoveryDisposition){
    const disposition=await store.recoveryDisposition(rumor.id,source);check();
    if(disposition==='cleared'){excluded++;continue;}
    if(disposition==='unresolved'){unresolved++;continue;}
    if(disposition!=='current')throw Error('Exact SDK recovery disposition required');
   }
   await history.saveRumor(rumor);check();
   const after=await currentSource(rumor.id);check();
   if(!after||JSON.stringify(after)!==JSON.stringify(source)){
    await history.removeMessage(rumor.id);throw Error('SDK delivery provenance changed during recovery');
   }
   const saved=await store.getItem(rumor.id);check();if(!saved||saved.id!==rumor.id)throw Error('Recovered original readback failed');repaired++;
  }
 }
 if(unresolved)throw Error('Some missing originals lack current SDK provenance');
 await store.verifyRecoveredWrites();check();
 return Object.freeze({checked,repaired,unresolved,...(store.recoveryDisposition?{excluded}:{} )});
}
