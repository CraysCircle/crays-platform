import {mayRead,type ProductWorld} from './productModel.ts';
import {currentCreatorOffer} from './creatorUSDPreview.ts';
import {awardCampaigns} from './awardPreview.ts';
import {storyCampaignsFor} from './awardStoryRegistry.ts';
import {storyCampaignCompatibility} from './awardStoryFeed.ts';
export type CreatorRevenueIntent='zap'|'content'|'award';
/** Public links expose only qualified public originals, never a private draft or customer ledger. */
export function creatorRevenueSources(w:ProductWorld,personId:string){
 const profiles=w.objects.filter(o=>o.kind==='creator-profile'&&o.personId===personId&&o.status==='published-demo');
 const profile=profiles.length===1&&w.objects.filter(o=>o.id===profiles[0].id).length===1?profiles[0]:undefined;
 const people=w.people.filter(p=>p.id===personId);
 const person=people.length===1&&!people[0].blocked&&!people[0].blockedByOther?people[0]:undefined;
 const available=!!profile&&(!!person||personId===w.owner)&&!people.some(p=>p.blocked||p.blockedByOther);
 const posts=available?w.posts.filter(p=>p.author===personId&&p.audience==='Public'&&['accepted','partial'].includes(p.status)&&!p.archived&&w.posts.filter(x=>x.id===p.id).length===1&&mayRead(w,p)):[];
 const offers=available?w.objects.filter(o=>o.sellerId===personId&&currentCreatorOffer(w,o)&&w.objects.filter(x=>x.id===o.id).length===1&&posts.some(p=>p.id===o.postId)):[];
 const campaigns=available?[...awardCampaigns(w).filter(c=>c.creatorId===personId&&c.status==='published-demo'),...storyCampaignsFor(w).filter(c=>c.creatorId===personId&&c.status==='active').map(storyCampaignCompatibility)].filter((c,i,all)=>all.findIndex(other=>other.id===c.id)===i):[];
 const publicProfile=available&&profile?{id:profile.id,personId,name:profile.name,title:profile.title,cover:profile.cover,status:profile.status}:undefined;
 return {available,profile:publicProfile,posts,offers,campaigns};
}
export function creatorBioUrl(origin:string,personId:string){
 const url=new URL(origin);if(!['https:','http:'].includes(url.protocol)||!personId||personId.length>200)throw Error('A valid public creator identity is required.');
 url.pathname='/';url.search='';url.hash='';url.searchParams.set('creator',personId);return url.toString();
}
