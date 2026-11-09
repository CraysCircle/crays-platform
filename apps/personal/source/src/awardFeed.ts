import type {Post,ProductWorld} from './productModel';
import {awardCampaigns} from './awardPreview';
import {storyPostBinding,storyCampaignCompatibility,withStoryAwardFeedExamples} from './awardStoryFeed.ts';
/** Explicit original-to-campaign binding, never keyword/hashtag matching or a new access grant. */
export function awardPostCampaign(w:ProductWorld,p:Post){
 const story=storyPostBinding(w,p);if(story)return storyCampaignCompatibility(story.campaign);
 const id=p.publishing?.awardCampaignId;if(!id)return undefined;
 return awardCampaigns(w).find(c=>c.id===id&&c.status==='published-demo'&&c.creatorId===p.author);
}
export function awardPostContestId(w:ProductWorld,p:Post){return storyPostBinding(w,p)?.contestId;}
export function withAwardFeedExamples(original:ProductWorld):ProductWorld{
 const input=withStoryAwardFeedExamples(original);
 if(input.owner!=='thorben'||!input.settings.demoHistory||input.settings.awardFeedExamples==='2026-10-23-props-v1')return input;
 const w={...input,posts:[...input.posts],settings:{...input.settings,awardFeedExamples:'2026-10-23-props-v1'}};
 for(const c of awardCampaigns(w).filter(c=>['award-maya','award-kai','award-lena'].includes(c.id)||c.id.startsWith('award-space-'))){
  const id=`award-post-${c.id}`;if(w.posts.some(p=>p.id===id)){w.posts=w.posts.map(p=>p.id===id&&p.author===c.creatorId&&p.publishing?.revision===1?{...p,text:`${c.description}\n${c.reward}`}:p);continue;}
  w.posts.push({id,author:c.creatorId,title:c.title,text:`${c.description}\n${c.reward}`,type:'image',venueId:c.venueId,audience:'Public',status:'accepted',createdAt:Date.now()-60_000,protected:false,mediaAvailable:true,liked:false,saved:false,reposted:false,license:false,replies:[],readPosition:0,publishing:{owner:c.creatorId,publisherId:c.creatorId,targetIds:['global',c.venueId?`space:${c.venueId}`:`creator:${c.creatorId}`],revision:1,media:[{id:`${id}-image`,name:'Illustrative campaign photograph',url:`/assets/crays/${c.image}`,kind:'image',alt:`${c.name} · fictional Props campaign`,state:'uploaded-preview'}],mediaRights:true,venueTag:'',format:'Post',receipts:[{targetId:'global',status:'accepted'},{targetId:c.venueId?`space:${c.venueId}`:`creator:${c.creatorId}`,status:'accepted'}],awardCampaignId:c.id}});
 }
 return w;
}
