import type {ProductWorld,Entity} from './productModel.ts';
import type {AwardVote} from './awardPreview.ts';
import {awardReportExample,unassignedAwardCategory,type AwardReportSource,type AwardReportVote} from './awardReporting.ts';
/** One labelled fictional public baseline. Never a live global payment/RGB index. */
export const awardPreviewSeason='Preview season';
export type AwardVoteReportingBinding={source:'award-vote-binding-v1';originalId:string;owner:string;paymentId:string;proofId:string;terms:string;invoice:string};
export function awardVoteTerms(v:AwardVote){return JSON.stringify({id:v.id,campaignId:v.campaignId,campaignVersion:v.campaignVersion,creatorId:v.creatorId,nomineeName:v.nomineeName,payeeName:v.payeeName,venueId:v.venueId,quantity:v.quantity,asset:v.asset,unit:v.unit,total:v.total,creator:v.creator,prizes:v.prizes,event:v.event,createdAt:v.createdAt,reward:v.reward,category:v.category,season:v.season,checkout:v.checkout});}
export function bindAwardVoteReport(v:AwardVote,owner:string):AwardVoteReportingBinding{return {source:'award-vote-binding-v1',originalId:v.id,owner,paymentId:`preview-award-payment:${v.id}`,proofId:'',terms:awardVoteTerms(v),invoice:JSON.stringify(v.invoice)};}
export function validAwardVoteReport(v:AwardVote,owner:string){const b=v.reporting;return !!b&&b.source==='award-vote-binding-v1'&&b.originalId===v.id&&b.owner===owner&&b.paymentId===`preview-award-payment:${v.id}`&&b.terms===awardVoteTerms(v)&&b.invoice===JSON.stringify(v.invoice)&&!!v.invoice&&(b.proofId===''||b.proofId===`preview-award-rgb:${v.id}`);}
function fingerprint(text:string){let a=0x811c9dc5,b=0x9e3779b9;for(let i=0;i<text.length;i++){a=Math.imul(a^text.charCodeAt(i),0x01000193)>>>0;b=Math.imul(b^(text.charCodeAt(i)+i),0x85ebca6b)>>>0;}return a.toString(16).padStart(8,'0')+b.toString(16).padStart(8,'0');}
function baseline(w:ProductWorld):AwardReportVote[]{
 const seed=awardReportExample().votes.filter(v=>v.payment==='confirmed'&&v.proof==='verified'&&v.category==='Content Creator');
 const fixed=[['award-maya',1200],['award-kai',1100],['award-lena',900]] as const;
 const votes:AwardReportVote[]=seed.map((row,i)=>{
  const quantity=i<3?fixed[i][1]:895-(i-3)*5;
  return {...row,id:`award-baseline:${i+1}`,paymentId:`award-baseline-payment:${i+1}`,proofId:`award-baseline-rgb:${i+1}`,nomineeId:i<3?['maya-creator','kai-creator','lena-creator'][i]:`preview-global-creator:${i+1}`,nominee:i<3?(w.people.find(p=>p.id===['maya-creator','kai-creator','lena-creator'][i])?.name||['Maya Bennett','Kai Andersen','Lena Fischer'][i]):`Community creator ${i+1}`,season:awardPreviewSeason,quantity,usdMinor:quantity*100,ecosystemFeeMicros:quantity*2500};
 });
 const venues=[['harbor-house','Harbor House',1000],['coast','Coast Club',900],['move','Move Together',800],['forest-city','Crays Club Forest City',700]] as const;
 for(const [id,name,quantity]of venues)votes.push({id:`award-baseline-spot:${id}`,paymentId:`award-baseline-payment-spot:${id}`,proofId:`award-baseline-rgb-spot:${id}`,nomineeId:`venue:${id}`,nominee:name,category:'Lifestyle',season:awardPreviewSeason,quantity,usdMinor:quantity*100,payment:'confirmed',proof:'verified',providerFeeMicros:0,ecosystemFeeMicros:quantity*2500});
 return votes;
}
export function canonicalAwardSource(w:ProductWorld,validate:(v:unknown,id:string,owner:string)=>boolean):AwardReportSource{
 const votes=baseline(w),counts=new Map<string,number>();for(const o of w.objects)counts.set(o.id,(counts.get(o.id)||0)+1);let asOf=Date.parse('2026-10-21T00:00:00Z');
 for(const o of w.objects.filter(o=>o.kind==='award-preview-vote')){
  const v=o.vote as AwardVote|undefined,qualified=counts.get(o.id)===1&&!!v&&validate(v,o.id,o.owner)&&validAwardVoteReport(v,o.owner);
  // All originals enter reconciliation. Unqualified/ambiguous evidence is held, never silently dropped.
  const row:AwardReportVote={id:o.id,paymentId:typeof v?.reporting?.paymentId==='string'&&v.reporting.paymentId?v.reporting.paymentId:`held-original:${o.id}`,proofId:typeof v?.reporting?.proofId==='string'?v.reporting.proofId:'',nomineeId:qualified?v!.creatorId:`held-nominee:${o.id}`,nominee:qualified?v!.nomineeName||'Nominee needs review':'Original needs review',category:qualified?v!.category:unassignedAwardCategory,season:qualified?v!.season:awardPreviewSeason,quantity:qualified?v!.quantity:0,usdMinor:qualified?v!.invoice!.totalMinor:0,payment:qualified?({prepared:'unknown',unknown:'unknown','confirmed-demo':'confirmed',failed:'failed','refunded-demo':'refunded'} as const)[v!.status]:'unknown',proof:qualified?(v!.proof==='verified-preview'&&v!.reporting!.proofId?'verified':v!.proof==='problem'?'invalid':'missing'):'invalid',providerFeeMicros:qualified&&v!.checkout?Math.round(Number(v!.checkout.providerFee)*(v!.checkout.asset==='sats'?1000:v!.checkout.asset==='BTC'?100000000000:1000000)):0,ecosystemFeeMicros:qualified?v!.invoice!.totalMinor*25:0};
  votes.push(row);if(qualified)asOf=Math.max(asOf,v!.createdAt,v!.updatedAt||0);
 }
 votes.sort((a,b)=>a.id.localeCompare(b.id));
 // Local noncryptographic change detector. Exact source JSON is also checked for result publication.
 return {id:`award-local-source-v1:${fingerprint(JSON.stringify(votes))}`,authority:'fictional-reporting-example',asOf:new Date(asOf).toISOString(),season:awardPreviewSeason,coverage:'complete-example',votes};
}
export type AwardResultRecord=Entity&{kind:'award-report-result-preview';sourceSnapshot:string;category:string;status:'draft'|'published-example';result:unknown;revision:number;createdAt:number;publishedAt?:number};
