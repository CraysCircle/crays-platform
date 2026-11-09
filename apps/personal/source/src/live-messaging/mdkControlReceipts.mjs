const hex=(v,n=64)=>typeof v==='string'&&new RegExp('^[a-f0-9]{'+n+'}$').test(v);
const unavailable=()=>Error('The original group change receipt is unavailable');
/** Positive original runtime outcomes only. The supplied store is the existing
 * encrypted, canonical-account device store. Receipt retention is not a member,
 * admin, Core, relay-authority or successful-callback grant. */
export async function openMdkControlReceipts({store,identity,deviceSlot,isCurrent,crypto=globalThis.crypto}){
 if(!store?.getItem||!store?.setItem||typeof identity?.accountId!=='string'||!identity.accountId||!hex(identity.pubkey)||!hex(identity.bindingFingerprint)||!hex(deviceSlot)||typeof isCurrent!=='function'||!crypto?.subtle)throw unavailable();
 const check=()=>{if(isCurrent()!==true)throw unavailable();};check();
 const input=JSON.stringify([identity.accountId,identity.pubkey,identity.bindingFingerprint,deviceSlot]);
 const scope=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(input))),v=>v.toString(16).padStart(2,'0')).join('');check();
 const key=(group,id)=>{check();if(!hex(group,32)||!hex(id))throw unavailable();return 'mdk-original-control-receipt:'+scope+':'+group+':'+id;};
 return Object.freeze({
  async capture(group,effects){
   check();if(!hex(group,32))throw unavailable();
   if(!Array.isArray(effects?.fanoutOutcomes)||!Array.isArray(effects?.publicationReports))return;
   if(effects.fanoutOutcomes.length>1000||effects.publicationReports.length>1000)throw unavailable();
   if(effects.supersededIntents!==0)return;
   for(const row of effects.fanoutOutcomes){
    if(!hex(row?.transportId)||row.mlsConfirmationRequired!==false||row.mlsConfirmed!==true||!(row.acceptedTargets>0)||!effects.publicationReports.some(report=>report.transportId===row.transportId&&report.metRequiredAcks===true))continue;
    await store.setItem(key(group,row.transportId),{schema:'crays.original-control-receipt.v1',scope,groupId:group,transportId:row.transportId,mlsConfirmed:true,metRequiredAcks:true});check();
   }
  },
  async confirmed(group,id){
   const row=await store.getItem(key(group,id));check();if(row==null)return false;
   if(row.schema!=='crays.original-control-receipt.v1'||row.scope!==scope||row.groupId!==group||row.transportId!==id||row.mlsConfirmed!==true||row.metRequiredAcks!==true)throw unavailable();
   return true;
  },
 });
}
