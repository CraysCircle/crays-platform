import {awardCategories} from './awardCategories';
export const unassignedAwardCategory='Unassigned · needs review';
/** Source contract for organiser reporting. Fictional snapshots never claim global backend coverage. */
export type AwardReportVote={id:string;paymentId:string;proofId:string;nomineeId:string;nominee:string;category:string;season:string;quantity:number;usdMinor:number;payment:'confirmed'|'unknown'|'failed'|'refunded';proof:'verified'|'missing'|'invalid';providerFeeMicros:number;ecosystemFeeMicros:number};
export type AwardReportSource={id:string;authority:'fictional-reporting-example';asOf:string;season:string;coverage:'complete-example'|'partial-example';feePolicy?:'mock-zero-fees';votes:AwardReportVote[]};
export type AwardStanding={nomineeId:string;nominee:string;category:string;season:string;votes:number;rank:number;tied:boolean};
export function awardReport(source:AwardReportSource,category:string){
 if(source.authority!=='fictional-reporting-example'||!source.id||!source.season||!Number.isFinite(Date.parse(source.asOf)))throw Error('The reporting source needs review.');
 const ids=new Map<string,number>(),payments=new Map<string,number>(),proofs=new Map<string,number>();
 for(const v of source.votes){ids.set(v.id,(ids.get(v.id)||0)+1);payments.set(v.paymentId,(payments.get(v.paymentId)||0)+1);if(v.proofId)proofs.set(v.proofId,(proofs.get(v.proofId)||0)+1);}
 const valid:AwardReportVote[]=[],held:AwardReportVote[]=[],excluded:AwardReportVote[]=[];
 const nominees=new Map<string,string>();
 for(const v of source.votes){if(v.season!==source.season||(category!=='All categories'&&v.category!==category&&v.category!==unassignedAwardCategory))continue;
  const key=`${v.category}\u0000${v.nomineeId}`,metadata=`${v.nominee}\u0000${v.season}`;if(nominees.has(key)&&nominees.get(key)!==metadata)nominees.set(key,'CONFLICT');else if(!nominees.has(key))nominees.set(key,metadata);
 }
 for(const v of source.votes){if(v.season!==source.season||(category!=='All categories'&&v.category!==category&&v.category!==unassignedAwardCategory))continue;
  const malformed=v.category===unassignedAwardCategory||!v.id||!v.paymentId||!v.nomineeId||!v.nominee||!v.category||!Number.isSafeInteger(v.quantity)||v.quantity<1||!Number.isSafeInteger(v.usdMinor)||v.usdMinor!==v.quantity*100||!Number.isSafeInteger(v.providerFeeMicros)||v.providerFeeMicros<0||!Number.isSafeInteger(v.ecosystemFeeMicros)||v.ecosystemFeeMicros!==(source.feePolicy==='mock-zero-fees'?0:v.usdMinor*25)||!['confirmed','unknown','failed','refunded'].includes(v.payment)||!['verified','missing','invalid'].includes(v.proof)||ids.get(v.id)!==1||payments.get(v.paymentId)!==1||(v.proofId&&proofs.get(v.proofId)!==1)||nominees.get(`${v.category}\u0000${v.nomineeId}`)==='CONFLICT';
  if(malformed){held.push(v);continue;}
  if(v.payment==='failed'||v.payment==='refunded'){excluded.push(v);continue;}
  if(v.payment!=='confirmed'||v.proof!=='verified'||!v.proofId){held.push(v);continue;}
  valid.push(v);
 }
 const grouped=new Map<string,AwardStanding>();for(const v of valid){const key=`${v.category}\u0000${v.nomineeId}`,old=grouped.get(key);if(old)old.votes+=v.quantity;else grouped.set(key,{nomineeId:v.nomineeId,nominee:v.nominee,category:v.category,season:v.season,votes:v.quantity,rank:0,tied:false});}
 const standings=[...grouped.values()].sort((a,b)=>a.category.localeCompare(b.category)||b.votes-a.votes||a.nominee.localeCompare(b.nominee));
 const byCategory=new Map<string,AwardStanding[]>();for(const s of standings){const list=byCategory.get(s.category)||[];list.push(s);byCategory.set(s.category,list);}
 for(const list of byCategory.values())for(let i=0;i<list.length;i++){const s=list[i];s.rank=i&&s.votes===list[i-1].votes?list[i-1].rank:i+1;s.tied=(i>0&&s.votes===list[i-1].votes)||(i+1<list.length&&s.votes===list[i+1].votes);}
 const countedVotes=valid.reduce((n,v)=>n+v.quantity,0),nominalMinor=valid.reduce((n,v)=>n+v.usdMinor,0);
 const settled=source.votes.filter(v=>v.season===source.season&&(category==='All categories'||v.category===category)&&v.payment==='confirmed'&&Number.isSafeInteger(v.usdMinor)&&v.usdMinor===v.quantity*100&&ids.get(v.id)===1&&payments.get(v.paymentId)===1);
 const receivedMinor=settled.reduce((n,v)=>n+v.usdMinor,0);
 return {valid,held,excluded,standings,countedVotes,nominalMinor,receivedMinor,unreconciledMinor:receivedMinor-nominalMinor,ecosystemFeeMicros:valid.reduce((n,v)=>n+v.ecosystemFeeMicros,0),providerFeeMicros:valid.reduce((n,v)=>n+v.providerFeeMicros,0),nomineeMinor:nominalMinor/2,prizesMinor:nominalMinor/4,eventMinor:nominalMinor/4,complete:source.coverage==='complete-example'};
}
export function awardPublicTop100(source:AwardReportSource,category:string){
 if(category==='All categories')throw Error('Choose one category before preparing its Top100.');
 const report=awardReport(source,category);if(!report.complete||report.held.length)throw Error('Reconcile the complete season source before preparing publication.');
 const ordered=report.standings;
 if((ordered[2]&&ordered[3]&&ordered[2].votes===ordered[3].votes)||(ordered[99]&&ordered[100]&&ordered[99].votes===ordered[100].votes))throw Error('Review the published tie rules at the Top3 or Top100 boundary first.');
 // Explicit public field allowlist: never publish vote/payment/proof/buyer records.
 return {sourceId:source.id,asOf:source.asOf,season:source.season,category,nominees:report.standings.filter(s=>s.rank<=100).map(s=>({nomineeId:s.nomineeId,nominee:s.nominee,rank:s.rank,votes:s.votes,tied:s.tied})),ceremonyCandidates:report.standings.filter(s=>s.rank<=3).map(s=>({nomineeId:s.nomineeId,nominee:s.nominee,rank:s.rank,votes:s.votes,tied:s.tied})),finalQualification:'not-confirmed' as const};
}
export function awardReportExample():AwardReportSource{
 const first=['Maya','Lena','Kai','Amira','Noah','Sofia','Leo','Zara','Elena','Jonas'],last=['Bennett','Fischer','Andersen','Moreau','Kim','Rossi','Santos','Rivera','Chen','Ali','Novak'];const votes:AwardReportVote[]=[];
 for(let i=0;i<110;i++){const quantity=900-i*5;votes.push({id:`report-vote-${i+1}`,paymentId:`report-payment-${i+1}`,proofId:`report-rgb-${i+1}`,nomineeId:`report-creator-${i+1}`,nominee:`${first[i%10]} ${last[Math.floor(i/10)]}`,category:'Content Creator',season:'Illustrative season',quantity,usdMinor:quantity*100,payment:'confirmed',proof:'verified',providerFeeMicros:0,ecosystemFeeMicros:quantity*2500});}
 for(const [i,category] of awardCategories.filter(c=>c!=='Content Creator').entries()){votes.push({...votes[0],id:`report-category-${i}`,paymentId:`report-category-payment-${i}`,proofId:`report-category-rgb-${i}`,nomineeId:`report-nominee-${i}`,nominee:['Harbour House','Studio North','The Morning Table','Coast Collective','Everyday Stories','Frame and Form','Live Together','Local Voices'][i]||'Community nominee',category,quantity:200+i,usdMinor:(200+i)*100,ecosystemFeeMicros:(200+i)*2500});}
 votes.push({...votes[0],id:'report-unknown',paymentId:'report-payment-unknown',proofId:'',quantity:3,usdMinor:300,ecosystemFeeMicros:7500,payment:'unknown',proof:'missing'},{...votes[1],id:'report-refund',paymentId:'report-payment-refund',proofId:'report-rgb-refund',quantity:2,usdMinor:200,ecosystemFeeMicros:5000,payment:'refunded'});
 return{id:'report-example-v1',authority:'fictional-reporting-example',asOf:'2026-10-21T10:00:00Z',season:'Illustrative season',coverage:'complete-example',votes};
}
