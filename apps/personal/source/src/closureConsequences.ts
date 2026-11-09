import {ownCoachEvidence,coachingPurposes} from './coachingEvidence.ts';
import {ownCoachRequests} from './fitnessCoaching.ts';
import {ownChallengeParticipations,ownChallengeRecognitions} from './fitnessChallenges.ts';
import {ownFitnessMedia} from './fitnessMedia.ts';
import type {ProductWorld,Entity} from './productModel.ts';
import type {ClosureSource} from './accountClosure.ts';
import {privacyState} from './privacyOverview.ts';
import {ownFitnessGoals,ownFitnessMeasurements,fitnessMetrics} from './fitnessProgress.ts';
export type ClosureItem={ref:string;originalId:string;source:ClosureSource;name:string;status:string;responsibleSource:string;consequence:string;price?:string;term?:string;facts?:{label:string;value:string}[]};
export const closureItemChoices:Record<ClosureSource,readonly {value:string;label:string}[]>={
 contracts:[{value:'review-at-source',label:'Review with the original operator'},{value:'keep-contract',label:'Keep this contract unchanged'}],
 tasks:[{value:'review-at-source',label:'Review the original task'},{value:'stop-at-source',label:'Request a stop at its source'}],
 access:[{value:'review-at-source',label:'Review this access separately'},{value:'withdraw-at-source',label:'Request withdrawal at its source'}],
 data:[{value:'keep-copy',label:'Keep or export my own permitted copy'},{value:'delete-at-source',label:'Request deletion at its source'},{value:'restrict-at-source',label:'Request restricted processing'}],
 receipts:[{value:'retain-proof',label:'Keep the original evidence'},{value:'review-at-source',label:'Review retention or access at its source'}],
 nostr:[{value:'keep-identity',label:'Keep my independent Nostr identity'},{value:'review-at-source',label:'Review keys and relay access separately'}],
};
const text=(v:unknown,fallback:string)=>typeof v==='string'&&v.trim()?v.trim():fallback;
function group(o:Entity):ClosureSource{
 const k=String(o.kind||'');
 if(/invoice|receipt|payment|statement|licen/.test(k))return 'receipts';
 if(/membership-pass|permission|delegation|device|connection/.test(k))return 'access';
 if(/membership|subscription|booking|order|contract/.test(k))return 'contracts';
 if(/task|plan/.test(k))return 'tasks';
 return 'data';
}
function consequence(o:Entity,source:ClosureSource){
 if(source==='contracts')return o.cancelAtTerm===true?'A stop at the end of the current term is recorded. Existing access, charges and the actual final result still need the original contract; closure creates no refund.':o.renewal===true||o.autoRenew===true?'Renewal stays on until the original operator confirms a separate change. Closure does not cancel or refund this contract.':o.renewal===false||o.autoRenew===false?'No automatic renewal is recorded here. Existing term, booking, fulfilment and refund conditions still need their original operator.':'Renewal and cancellation terms are not confirmed here. Review them with the original operator; closure changes neither payment nor service status.';
 if(source==='tasks')return 'A saved plan or task is not automatically stopped. Review running work, scheduled actions and any unknown outcome before requesting a separate stop.';
 if(source==='access')return 'This access needs its own review. Membership, device sessions, app permissions and service rights do not replace one another; closure alone withdraws none of them.';
 if(source==='receipts')return 'Keep the original evidence. Retention reason, responsible operator and any release date require source confirmation. This is not a refund or transfer of a licence.';
 return 'Only your permitted data can be considered. Export, restriction and deletion need separate source decisions; no legal retention period or completed deletion is assumed.';
}
export function closureItems(w:ProductWorld):{items:ClosureItem[];ambiguous:boolean}{
 if(!w.identity.signedIn||typeof w.owner!=='string'||!w.owner.trim())return {items:[],ambiguous:false};
 const malformed=['objects','payments','venues','wallets'].some(k=>!Array.isArray(w[k as keyof ProductWorld])||(w[k as keyof ProductWorld] as unknown[]).some(x=>!x||typeof x!=='object'||Array.isArray(x)));
 w={...w,objects:(Array.isArray(w.objects)?w.objects:[]).filter(x=>x&&typeof x==='object'&&!Array.isArray(x)),payments:(Array.isArray(w.payments)?w.payments:[]).filter(x=>x&&typeof x==='object'&&!Array.isArray(x)),venues:(Array.isArray(w.venues)?w.venues:[]).filter(x=>x&&typeof x==='object'&&!Array.isArray(x)),wallets:(Array.isArray(w.wallets)?w.wallets:[]).filter(x=>x&&typeof x==='object'&&!Array.isArray(x))};
 const own=w.objects.filter(o=>o.owner===w.owner&&!/^account-closure(?:-|$)/.test(String(o.kind)));
 const ambiguous=malformed||own.some(o=>w.objects.filter(x=>x.id===o.id).length!==1)||w.payments.some(p=>p.owner===w.owner&&w.payments.filter(x=>x.id===p.id).length!==1)||w.venues.some(v=>(v.membership!=='none'||v.relayJoined||v.presence==='active')&&w.venues.filter(x=>x.id===v.id).length!==1)||w.wallets.some(v=>w.wallets.filter(x=>x.id===v.id).length!==1);
 const evidenceReviews=ownCoachEvidence(w),coachRequests=ownCoachRequests(w),fitnessGoals=ownFitnessGoals(w),fitnessMeasurements=ownFitnessMeasurements(w),fitnessMedia=ownFitnessMedia(w),challengeParticipations=ownChallengeParticipations(w),recognitions=challengeParticipations.flatMap(p=>ownChallengeRecognitions(w,p.id));
 const items:ClosureItem[]=own.filter(o=>w.objects.filter(x=>x.id===o.id).length===1).map(o=>{
  const source=group(o),end=o.currentPeriodEnd??o.endsAt,isPermission=['permission','delegation'].includes(String(o.kind)),fitnessGoal=fitnessGoals.find(g=>g.id===o.id),fitnessMeasurement=fitnessMeasurements.find(m=>m.id===o.id),fitnessName=(evidenceReviews.find(r=>r.id===o.id)?coachingPurposes[evidenceReviews.find(r=>r.id===o.id)!.purpose]:'')||coachRequests.find(r=>r.id===o.id)?.planSnapshot.name||challengeParticipations.find(p=>p.id===o.id)?.challenge.title||recognitions.find(r=>r.id===o.id)?.label||fitnessMedia.find(m=>m.id===o.id)?.brief.title||fitnessGoal?.brief.title||(fitnessMeasurement?`${fitnessMetrics[fitnessMeasurement.brief.metric].label} observation · ${fitnessMeasurement.brief.date}`:String(o.kind).startsWith('fitness-')?'Progress record needs source review':'');return {ref:`object:${o.id}`,originalId:o.id,source,name:fitnessName||text(o.name,text(o.title,'Saved record')),status:isPermission?privacyState(o):text(evidenceReviews.find(r=>r.id===o.id)?.state??coachRequests.find(r=>r.id===o.id)?.state??o.status,'Needs source review').replaceAll('-',' '),responsibleSource:text(o.storeName,text(o.sellerName,text(o.seller,source==='contracts'?'Original operator not confirmed':'Original data source needs confirmation'))),consequence:consequence(o,source),...(isPermission?{facts:[{label:'Recipient',value:text(o.recipient,'Not supplied')},{label:'Purpose',value:text(o.purpose,'Not supplied')},{label:'Data or action scope',value:text(o.dataType,text(o.scope,'Not supplied'))}]}:{}),...(source==='contracts'&&typeof end==='number'&&Number.isFinite(end)&&!Number.isNaN(new Date(end).getTime())?{term:`Recorded term end: ${new Date(end).toISOString().slice(0,10)} (UTC)`}:{}),...(o.amountMinor!==undefined?{price:o.currency==='USD'&&Number.isSafeInteger(o.amountMinor)&&Number(o.amountMinor)>=0?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(o.amountMinor)/100):'Price needs source review'}:{})};
 });
 for(const p of w.payments.filter(p=>p.owner===w.owner&&w.payments.filter(x=>x.id===p.id).length===1))items.push({ref:`payment:${p.id}`,originalId:p.id,source:'receipts',name:text(p.purpose,'Payment record'),status:text(p.status,'Needs source review').replaceAll('-',' '),responsibleSource:text(p.recipient,'Recipient needs source confirmation'),consequence:p.status==='unknown'?'Reconcile this same payment with its original provider. Closure does not confirm, repeat, cancel or refund it.':'Payment evidence stays linked to the original transaction. Closure does not refund or resend funds; retention needs source confirmation.'});
 for(const v of w.venues.filter(v=>(v.membership!=='none'||v.relayJoined||v.presence==='active')&&w.venues.filter(x=>x.id===v.id).length===1))items.push({ref:`space:${v.id}`,originalId:v.id,source:'access',name:v.name,status:v.membership==='none'?'Relay or presence context only':`${v.membership} membership`,responsibleSource:v.name,consequence:'Community membership, relay connection, presence and paid service access are separate. Review this Spot’s own access; account closure confirms no cancellation.'});
 for(const wallet of w.wallets.filter(x=>w.wallets.filter(y=>y.id===x.id).length===1))items.push({ref:`wallet:${wallet.id}`,originalId:wallet.id,source:'receipts',name:wallet.name,status:wallet.connected===true?'Connected wallet':wallet.connected===false?'Wallet not connected':'Wallet connection needs source review',responsibleSource:text(wallet.custody,'Custody needs source confirmation'),consequence:'Review custody, recovery and any pending transaction separately. Closing CRAYS does not move funds, restore keys or transfer RGB rights.'});
 items.push({ref:'identity:nostr',originalId:'nostr',source:'nostr',name:'Your independent Nostr identity',status:w.identity.signer==='revoked'?'Signing access withdrawn':w.identity.signer==='locked'?'Signer locked':'Preview signer connected',responsibleSource:'Your key custody and selected relays',consequence:'Keep control of your own keys independently of CRAYS. Public copies cannot be globally erased; a relay change does not transfer wallet funds or licences.'});
 return {items,ambiguous};
}
