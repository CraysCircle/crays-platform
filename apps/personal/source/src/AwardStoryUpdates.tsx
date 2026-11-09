import {storyDelivery} from './awardStoryFulfilment';
import {Bell,CaretRight,FilmSlate,Trophy} from '@phosphor-icons/react';
import type {ProductWorld} from './productModel';
import {storyOrders} from './awardStoryLedger';
import {storyCampaignsFor} from './awardStoryRegistry';
import {storyContestStanding,storyStanding} from './awardStoryReporting';
/** Actual local order statuses and current campaign availability. Not a historical crossing claim. */
export function AwardStoryUpdates({world,onReceipt,onCampaign}:{world:ProductWorld;onReceipt:(id:string)=>void;onCampaign?:(id:string)=>void}){
 const orders=storyOrders(world).slice().reverse();
 const campaigns=storyCampaignsFor(world);
 const engagements=world.identity.signedIn?world.objects.filter(o=>o.kind==='award-story-engagement-v1'&&o.owner===world.owner&&o.mock===true):[];
 const followed=campaigns.filter(c=>engagements.some(o=>o.campaignId===c.id&&o.action==='follow'&&o.active===true));
 const experiences=engagements.filter(o=>['application','claim'].includes(String(o.action))&&campaigns.some(c=>c.id===o.campaignId));
 if(!orders.length&&!followed.length&&!experiences.length)return null;
 return <section className="award-story-updates" aria-label="Your Props updates"><div className="award-heading"><h2>Your stories are moving.</h2><Bell size={23}/></div>{orders.slice(0,8).map(o=>{
 const c=storyCampaignsFor(world).find(c=>c.id===o.campaignId);if(!c)return null;
 const contest=storyContestStanding(world,c.id,o.contestId),annual=storyStanding(world,c.id);
 const crossed=o.status==='counted'&&o.contestId===c.id&&contest.votes>=c.target;
 const title=crossed?`${c.name}: the shared chapter is currently open.`:o.status==='counted'?`${c.name}: your ${o.quantity} contest Props count.`:o.status==='reversed'?`${c.name}: this attempt was reversed.`:`${c.name}: ${o.status.replaceAll('_',' ')}.`;
 return <button className="award-row" key={o.id} onClick={()=>onReceipt(o.id)}>{crossed?<FilmSlate size={24}/>:<Trophy size={24}/>}<span><strong>{title}</strong><small>{o.status==='counted'?`${annual.votes.toLocaleString('en-US')} annual Props · ${annual.rank?`current #${annual.rank}`:'unranked'} · local demo`:'Continue the exact original. No new charge is started.'}</small></span><CaretRight size={18}/></button>;
 })}{onCampaign&&followed.slice(0,4).map(c=>{const progress=storyContestStanding(world,c.id,c.id),delivery=storyDelivery(world,c.id);return <button className="award-follow-update" key={`follow:${c.id}`} onClick={()=>onCampaign(c.id)}><img src={`/assets/crays/${c.image}`} alt="Illustrative creator story"/><span><small>FOLLOWING · CURRENT DEMO AVAILABILITY</small><strong>{c.name}</strong><span>{delivery?.note?`${delivery.status}: ${delivery.note}`:progress.remaining===0?c.unlockTitle:'Continue their next chapter'}</span><small>Open freely · following requires no Props</small></span><CaretRight size={18}/></button>})}{onCampaign&&experiences.slice(-4).reverse().map(o=><button className="award-row" key={`experience:${o.id}`} onClick={()=>onCampaign(String(o.campaignId))}><Bell size={22}/><span><strong>{String(o.title||'Your separate Experience')}</strong><small>{String(o.status||'Saved')} · local simulation, separate from voting</small></span><CaretRight size={18}/></button>)}</section>;
}
