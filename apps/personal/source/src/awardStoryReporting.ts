import {localStoryCampaigns} from './localSocialData';
import type {ProductWorld} from './productModel';
import {awardReport, unassignedAwardCategory, type AwardReportSource, type AwardReportVote} from './awardReporting';
import {storyCampaignsFor} from './awardStoryRegistry';
import {allValidStoryOrders} from './awardStoryLedger';

/** Annual nominations are the only standings grain. Chapters and posts are attribution. */
export function storyGlobalSource(world:ProductWorld):AwardReportSource {
  const votes:AwardReportVote[]=[];
  const storyCampaigns=storyCampaignsFor(world);
  const seen=new Set<string>();
  for(const c of storyCampaigns){
    const nominees=[{id:c.nominationId,name:c.name,votes:c.annualBaseVotes},...c.seedCompetitors];
    for(const n of nominees){
      const key=`${c.seasonId}:${c.competitionId}:${n.id}`;
      if(seen.has(key))continue;seen.add(key);
      if(n.votes<=0)continue;
      votes.push({id:`story-baseline:${key}`,paymentId:`story-baseline-payment:${key}`,proofId:`story-baseline-proof:${key}`,nomineeId:n.id,nominee:n.name,category:c.category,season:c.seasonId,quantity:n.votes,usdMinor:n.votes*100,payment:'confirmed',proof:'verified',providerFeeMicros:0,ecosystemFeeMicros:0});
    }
  }
  const validOrders=allValidStoryOrders(world);
  for(const order of validOrders){
    const c=storyCampaignsFor(world).find(c=>c.id===order.campaignId&&c.nominationId===order.nominationId&&c.competitionId===order.competitionId&&c.seasonId===order.seasonId);
    if(!c)continue;
    votes.push({id:`story-order:${order.id}`,paymentId:`story-order-payment:${order.mockPaymentId||order.id}`,proofId:order.status==='counted'?`story-order-proof:${order.mockProofId||order.id}`:'',nomineeId:order.nominationId,nominee:c.name,category:c.category,season:order.seasonId,quantity:order.quantity,usdMinor:order.quantity*100,payment:order.status==='reversed'?'refunded':['failed','cancelled','expired'].includes(order.status)?'failed':order.mockPaymentId?'confirmed':'unknown',proof:order.status==='counted'?'verified':order.status==='invalid_proof'?'invalid':'missing',providerFeeMicros:0,ecosystemFeeMicros:0});
  }
  const validIds=new Set(validOrders.map(o=>o.id));
  for(const original of world.objects.filter(o=>o.kind==='award-story-order-v1'&&!validIds.has(o.id))){
    votes.push({id:`story-held:${original.id}`,paymentId:`story-held-payment:${original.id}`,proofId:'',nomineeId:`story-held-nominee:${original.id}`,nominee:'Original needs review',category:unassignedAwardCategory,season:'season-demo-2026',quantity:0,usdMinor:0,payment:'unknown',proof:'invalid',providerFeeMicros:0,ecosystemFeeMicros:0});
  }
  votes.sort((a,b)=>a.id.localeCompare(b.id));
  let fingerprint=2166136261;for(const char of JSON.stringify(votes))fingerprint=Math.imul(fingerprint^char.charCodeAt(0),16777619)>>>0;
  const latest=Math.max(Date.parse('2026-10-23T00:00:00Z'),...validOrders.map(o=>o.updatedAt));
  return {id:`award-story-annual-local-v1:${fingerprint.toString(16)}`,authority:'fictional-reporting-example',asOf:new Date(latest).toISOString(),season:localStoryCampaigns(world)[0]?.seasonId||'season-demo-2026',coverage:'complete-example',feePolicy:'mock-zero-fees',votes};
}
export function storyRace(world:ProductWorld,campaignId:string){
 const c=storyCampaignsFor(world).find(c=>c.id===campaignId);if(!c)return[];
 const source=storyGlobalSource(world);return awardReport({...source,season:c.seasonId},c.category).standings;
}
export function storyStanding(world:ProductWorld,campaignId:string){
 const c=storyCampaignsFor(world).find(c=>c.id===campaignId);if(!c)throw Error('Choose a published Props campaign.');
 const race=storyRace(world,campaignId),row=race.find(r=>r.nomineeId===c.nominationId);
 const votes=row?.votes??0;
 return {votes,rank:row?.rank??0,tied:row?.tied??false,thirdPlaceVotes:race[2]?.votes??0,supporters:c.supporters+new Set(allValidStoryOrders(world).filter(o=>o.nominationId===c.nominationId&&o.seasonId===c.seasonId&&o.status==='counted').map(o=>o.owner)).size,remaining:Math.max(0,c.target-votes)};
}

/** Contest goals are not the annual category score. No source-view duplication. */
export function storyContestStanding(world:ProductWorld,campaignId:string,contestId:string){
 const c=storyCampaignsFor(world).find(c=>c.id===campaignId);if(!c)throw Error('Choose a known Props contest.');
 const action=c.creatorActions.find(a=>a.id===contestId);
 if(contestId!==c.id&&!action)throw Error('This contest does not belong to the selected creator.');
 const metadata=action as (typeof action & {baseVotes?:number;target?:number});
 const base=contestId===c.id?c.baseVotes:metadata?.baseVotes??0;
 const target=contestId===c.id?c.target:metadata?.target??c.target;
 const votes=base+allValidStoryOrders(world).filter(o=>o.contestId===contestId&&o.seasonId===c.seasonId&&o.status==='counted').reduce((n,o)=>n+o.quantity,0);
 return{votes,target,remaining:Math.max(0,target-votes),title:action?.title??c.title,contestId};
}
