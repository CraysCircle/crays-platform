import {mayRead,type Post,type ProductWorld} from './productModel.ts';
import type {AwardCampaign} from './awardPreview.ts';
import {storyCampaigns,type StoryCampaign} from './awardStorySeeds.ts';
import {storyCampaignsFor} from './awardStoryRegistry.ts';

const fixtureVersion='2026-10-23-public-contests-v1';
export const storyFeedPostId=(contestId:string)=>`award-story-post-${contestId}`;

/** Compatibility is presentation only; story orders keep their separate exact
 * contest/nomination/season binding and canonical ledger. No legacy vote write. */
export function storyCampaignCompatibility(c:StoryCampaign):AwardCampaign {
 return {id:c.id,creatorId:c.creatorId,name:c.name,category:c.category,title:c.title,
  description:c.description,image:c.image,target:c.target,reward:c.unlockTitle,
  baseVotes:c.baseVotes,version:1,status:c.status==='active'?'published-demo':'draft',season:c.seasonId};
}

/** An actual single current public original is required. A hashtag, cloned
 * input, repost author, private source or duplicate ID cannot invent a binding. */
export function storyPostBinding(w:ProductWorld,p:Post){
 const originals=w.posts.filter(row=>row.id===p.id);
 if(originals.length!==1)return undefined;
 const original=originals[0],published=original.publishing;
 if(!published?.awardCampaignId||published.mediaRights!==true||p.author!==original.author||p.audience!==original.audience||
    p.status!==original.status||p.publishing?.awardCampaignId!==published.awardCampaignId||
    p.publishing?.publisherId!==published.publisherId||p.publishing?.owner!==published.owner||
    original.audience!=='Public'||!['accepted','partial'].includes(original.status)||original.archived||
    original.protected||!original.mediaAvailable||!mayRead(w,original)||
    published.publisherId!==original.author||published.owner!==original.author||p.protected!==original.protected||
    p.mediaAvailable!==original.mediaAvailable||!!p.archived!==!!original.archived)return undefined;
 const people=w.people.filter(person=>person.id===original.author);
 if(people.length>1||people.some(person=>person.blocked||person.blockedByOther)||
    original.author!==w.owner&&people.length!==1)return undefined;
 const matches=storyCampaignsFor(w).filter(c=>c.id===published.awardCampaignId&&c.creatorId===original.author&&c.status==='active');
 if(matches.length!==1)return undefined;
 const campaign=matches[0];
 const local=campaign.id.startsWith('contest-local-');
 if(!published.receipts?.some(receipt=>published.targetIds.includes(receipt.targetId)&&
   (receipt.status==='accepted'||local&&receipt.status==='accepted-preview')))return undefined;
 if(original.id===storyFeedPostId(campaign.id))return {campaign,contestId:campaign.id,original};
 const action=campaign.creatorActions.find(action=>original.id===storyFeedPostId(action.contestId)&&
  action.parentCampaignId===campaign.id&&action.creatorId===original.author&&action.nominationId===campaign.nominationId&&
  action.competitionId===campaign.competitionId&&action.seasonId===campaign.seasonId);
 if(action)return {campaign,contestId:action.contestId,original};
 // A locally reviewed published own contest supplies an actual authored Post.
 // Its binding is its explicit campaign ID, never text or the current profile.
 if(!storyCampaigns.some(seed=>seed.id===campaign.id))return {campaign,contestId:campaign.id,original};
 return undefined;
}

/** Account-isolated rich fixture migration. Does not follow, connect, enrol,
 * enable a relay, select a feed source, fund a wallet or publish externally. */
export function withStoryAwardFeedExamples(input:ProductWorld):ProductWorld {
 if(input.owner!=='thorben'||!input.settings.demoHistory||input.settings.awardStoryFeedExamples===fixtureVersion)return input;
 const w:ProductWorld={...input,people:[...input.people],objects:[...input.objects],posts:[...input.posts],
  settings:{...input.settings,awardStoryFeedExamples:fixtureVersion}};
 const now=Date.now();let sequence=0;
 for(const campaign of storyCampaigns){
  let people=w.people.filter(person=>person.id===campaign.creatorId);
  if(!people.length){
   const person={id:campaign.creatorId,name:campaign.name,bio:`Fictional Props creator. ${campaign.description}`,avatar:campaign.image,
    following:false,contact:false,blocked:false,requestsEnabled:false,requestPurposes:[],purpose:'',request:'none' as const,
    consentSelf:false,consentOther:false,communityVenueIds:[],publicAffiliationIds:[],localPresence:false};
   w.people.push(person);people=[person];
  }
  if(people.length!==1||people[0].blocked||people[0].blockedByOther)continue;
  const profileId=`creator-profile-${campaign.creatorId}`;
  if(!w.objects.some(row=>row.id===profileId||row.kind==='creator-profile'&&row.personId===campaign.creatorId))
   w.objects.push({id:profileId,kind:'creator-profile',owner:campaign.creatorId,personId:campaign.creatorId,name:campaign.name,
    title:campaign.title,description:campaign.description,cover:campaign.image,status:'published-demo',audience:'Public',
    handle:campaign.creatorId,links:[],mock:true,source:'Fictional local Props creator; no real profile or publication',imageLabel:campaign.imageLabel});
  const entries=[{contestId:campaign.id,title:campaign.title,text:campaign.description,format:'Post' as const,image:campaign.image,video:campaign.videoTeaser},
   ...campaign.creatorActions.map(action=>{const chapter=campaign.chapters.find(chapter=>chapter.id===action.chapterId);
    return {contestId:action.contestId,title:action.title,text:action.description,
     format:action.format==='story'?'Story' as const:action.format==='reel'?'Reel' as const:'Post' as const,
     image:chapter?.image||campaign.image,video:action.format==='reel'?chapter?.video||campaign.videoTeaser:undefined};})];
  for(const entry of entries){
   const id=storyFeedPostId(entry.contestId);if(w.posts.some(post=>post.id===id))continue;
   const createdAt=now-(++sequence)*60_000,hasVideo=entry.format==='Reel'&&!!entry.video;
   const targetIds=['global',`creator:${campaign.creatorId}`];
   const media={id:`${id}-media`,name:hasVideo?'Animated local demo teaser, not actual creator footage':'Illustrative local Props campaign image',
    url:`/assets/crays/${hasVideo?entry.video:entry.image}`,kind:hasVideo?'video' as const:'image' as const,
    alt:campaign.imageLabel,state:'uploaded-preview' as const,...(hasVideo?{poster:`/assets/crays/${entry.image}`}:{})};
   w.posts.push({id,author:campaign.creatorId,title:entry.title,text:`${entry.text}\nFictional public local example · no external publication. ${campaign.imageLabel}`,
    type:hasVideo?'video':'image',audience:'Public',status:'accepted',createdAt,image:entry.image,alt:campaign.imageLabel,
    protected:false,mediaAvailable:true,liked:false,saved:false,reposted:false,license:false,replies:[],readPosition:0,
    publishing:{owner:campaign.creatorId,publisherId:campaign.creatorId,awardCampaignId:campaign.id,targetIds,revision:1,
     media:[media],mediaRights:true,venueTag:'',format:entry.format,...(entry.format==='Story'?{storyExpiresAt:createdAt+24*60*60_000}:{}),
     receipts:targetIds.map(targetId=>({targetId,status:'accepted'}))}});
  }
 }
 return w;
}
