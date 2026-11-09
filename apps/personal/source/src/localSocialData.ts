import {ownerPersonCorrections} from './ownerPersonCorrections';
import {craysVenueProgram} from './craysVenuePrograms';
import type {ProductWorld,Person,Venue,Post,Entity} from './productModel';
import type {OwnedPostView} from './live-nostr/OwnedPostTypes';
import type {StoryCampaign} from './awardStorySeeds';
import {awardCategories,awardSubcategories} from './awardCategories';
export type LocalPerson={id:string;pubkey:string;npub?:string;name:string;previousName?:string;homeSpotId:string;bio:string;picture:string|null;socialPreviews:{platform:string;handle:string}[]};
export type LocalSpot={id:string;pubkey:string;name:string;previousName?:string;city:string;country?:string;continent?:string;timezone?:string;type:string;relayURL:string;picture:string|null;banner:string|null};
export type LocalPost={view:OwnedPostView;contestId:string|null};
export type LocalOffer={id:string;creatorId:string;creatorPubkey:string;previewEventId:string;title:string;preview:string;format:string;price:{amount:string;currency:string}};
export type LocalContest={id:string;creatorId:string;creatorPubkey:string;category:string;seasonId:string;nominationId:string;previewEventId:string;goal:number;recordedDemoProps:number;eligibleOriginalEventIds:string[]};
export type LocalCatalog={fixtureVersion?:string;previousEventIds?:Record<string,string>;spots:LocalSpot[];people:LocalPerson[];originalSpots:Record<string,string>;addressOriginals:Record<string,string>;contestSpots:Record<string,string>;mediaPaths:Record<string,string>};
type Network={people:{id:string;relaySpotIds:string[];connectedToViewer:boolean;purpose:string}[];stats?:Record<string,{like:number;repost:number;reply:number}>};
export type LocalSpotData={posts:LocalPost[];offers:LocalOffer[];contests:LocalContest[]};
const base='/assets/crays-demo-v5/';
let catalog:LocalCatalog|null=null;
let bootstrap:Promise<{catalog:LocalCatalog;network:Network}>|null=null;
const spotReads=new Map<string,Promise<LocalSpotData>>();
const originals=new Map<string,LocalPost>();
let stats:NonNullable<Network['stats']>={};
async function read<T>(file:string,metadata=false,signal?:AbortSignal):Promise<T>{const r=await fetch((metadata?'/assets/crays-social-v2/':base)+file,{credentials:'omit',redirect:'error',...(signal?{signal}:{})});if(!r.ok)throw Error('This content could not be loaded. Try again.');return r.json();}
export function localCatalog(){return catalog;}
export function loadLocalSocial(options?:{bounded:boolean}){if(bootstrap)return bootstrap;const controller=options?.bounded?new AbortController():undefined;const timer=controller?setTimeout(()=>controller.abort(),12000):undefined;return bootstrap=(Promise.all([read<LocalCatalog>('catalog.json',false,controller?.signal),read<Network>('network.json',false,controller?.signal)]).then(([c,n])=>{if(c.people.length!==1000||c.spots.length!==100||n.people.length!==1000)throw Error('The local social catalogue is incomplete.');for(const p of c.people){const correction=ownerPersonCorrections[p.id];if(correction&&p.name===correction.previousName){p.previousName=p.name;p.name=correction.name;}}catalog=c;stats=n.stats||{};return {catalog:c,network:n};}).catch(e=>{controller?.abort();bootstrap=null;throw e;}).finally(()=>{if(timer!==undefined)clearTimeout(timer);}));}
export function registerLocalOriginals(rows:readonly LocalPost[]){for(const row of rows)originals.set(row.view.original.id,row);}
export function localOriginal(id:string){return originals.get(id);}
export function localOriginalCounts(id:string){return stats[id]||{like:0,repost:0,reply:0};}
export function localPerson(id:string){return catalog?.people.find(p=>p.id===id||p.pubkey===id);}
export function localSpot(id:string){const raw=catalog?.spots.find(p=>p.id===id||p.pubkey===id);if(!raw)return;const program=craysVenueProgram(raw);return program?{...raw,name:program.name,type:program.type}:raw;}
export function localMedia(url:string|null|undefined){return url?catalog?.mediaPaths[url]||url:'';}
export function localProfileId(pubkey:string){return localPerson(pubkey)?.id||localSpot(pubkey)?.id;}
// Explicit migration of fictional placeholder actors, never identity matching.
const legacyActors=['alex','antje-vif','leo','nina','sofia','jules','amina','marco','elena','theo','maya','sam','maya-creator','kai-creator','lena-creator'];
export function localCanonicalPerson(id:string){const i=legacyActors.indexOf(id);return i>=0?catalog?.people[i]?.id||id:id;}
export function localLegacyActor(id:string){return legacyActors.includes(id);}
export function localAlexPerson(){return catalog?.people[0]?.id;}
export function loadLocalSpot(id:string):Promise<LocalSpotData>{
 if(!catalog?.spots.some(s=>s.id===id))return Promise.reject(Error('Choose an available Spot.'));
 if(!spotReads.has(id))spotReads.set(id,Promise.all([read<{posts:LocalPost[]}>('spots/'+encodeURIComponent(id)+'.json'),read<{offers:LocalOffer[];contests:LocalContest[]}>('showcase/'+encodeURIComponent(id)+'.json')]).then(([p,s])=>{for(const row of p.posts)originals.set(row.view.original.id,row);return {...p,...s};}).catch(e=>{spotReads.delete(id);throw e;}));
 return spotReads.get(id)!;
}
/** Adds owner-requested fictional records to the existing preview model only.
 * Never changes Core identity, real session, signer, money or external grants.
 * Existing people, consent decisions, edits and originals always win on reload. */
export function withLocalSocial(w:ProductWorld,c:LocalCatalog,n:Network):ProductWorld{
 if(w.owner!=='thorben')return w;
 const network=new Map(n.people.map(p=>[p.id,p]));
 const ids=new Set(w.people.map(p=>p.id)),venueIds=new Set(w.venues.map(v=>v.id));
 const people:Person[]=[...c.people,...c.spots.map(s=>({id:s.id,pubkey:s.pubkey,name:craysVenueProgram(s)?.name||s.name,homeSpotId:s.id,bio:(craysVenueProgram(s)?.type||s.type)+' · '+s.city,picture:s.picture,socialPreviews:[]}))].filter(p=>!ids.has(p.id)).map(p=>{
  const relation=network.get(p.id),connected=relation?.connectedToViewer===true;
  return {id:p.id,name:p.name,bio:p.bio.replace(/\s*Fictional CRAYS test profile\.?/g,''),avatar:localMedia(p.picture),following:connected,contact:connected,blocked:false,purpose:relation?.purpose||'Business',request:connected?'accepted':'none',consentSelf:connected,consentOther:connected,requestsEnabled:true,requestPurposes:[relation?.purpose||'Business'],communityVenueIds:relation?.relaySpotIds||[p.homeSpotId],publicAffiliationIds:(relation?.relaySpotIds||[p.homeSpotId]).map(id=>'space:'+id),localPresence:false};
 });
 const venues:Venue[]=c.spots.filter(s=>!venueIds.has(s.id)).map(s=>({id:s.id,name:craysVenueProgram(s)?.name||s.name,type:craysVenueProgram(s)?.type||s.type,city:s.city,description:craysVenueProgram(s)?.description||localSpotDescription(s),image:localMedia(s.banner||s.picture),services:['Community','Experiences'],visited:true,membership:'active',grant:'fictional-on-site-visit',otherGrant:false,presence:'none',visibility:{Business:false,Socializing:false,Dating:false},area:s.city,operatorActive:true,role:'Member',relay:s.relayURL,relayJoined:true}));
 const objects:Entity[]=people.map(p=>({id:'local-social-profile:'+p.id,kind:'creator-profile',owner:p.id,personId:p.id,name:p.name,title:p.bio,cover:p.avatar,status:'published-demo',audience:'Public',mock:true,source:'owner-requested-fictional-local-preview',links:[]}));
 const existing=w.people.map(p=>{const source=c.spots.find(s=>s.id===p.id),program=source&&craysVenueProgram(source);if(program)return {...p,name:program.name,bio:program.type+' · '+source!.city};const target=c.people.find(t=>t.id===localCanonicalPerson(p.id));return target&&(localLegacyActor(p.id)||p.name===target.previousName)?{...p,name:target.name,bio:target.bio.replace(/\s*Fictional CRAYS test profile\.?/g,''),avatar:localMedia(target.picture)}:p;});
 const priorVersion=w.settings.localSocialFixtureVersion;const revisedVenues=w.venues.map(v=>{const target=c.spots.find(t=>t.id===v.id),program=target&&craysVenueProgram(target);if(program)return {...v,name:program.name,type:program.type,description:program.description};return target&&v.name===target.previousName?{...v,name:target.name,city:target.city,type:target.type,description:localSpotDescription(target)}:v;});
 const revisedPosts=priorVersion!==c.fixtureVersion?w.posts.filter(p=>!c.previousEventIds?.[p.id]||c.previousEventIds[p.id]===p.id||p.author===w.owner):w.posts;
 const revisedObjects=priorVersion!==c.fixtureVersion?w.objects.filter(o=>o.kind!=='local-social-contest'&&o.version!=='local-social-offer-v1'):w.objects;
 return {...w,people:[...existing,...people],venues:[...revisedVenues,...venues],posts:revisedPosts,objects:[...revisedObjects,...objects],settings:{...w.settings,localSocialFixtureVersion:c.fixtureVersion||'canonical-v1'}};
}
export function localModelPost(row:LocalPost):Post{
 const v=row.view,author=localProfileId(v.author.pubkey)!;
 const media=v.media.map((m,i)=>({id:v.original.id+'-media-'+i,name:m.alt||'Original media',url:localMedia(m.url),kind:m.kind,alt:m.alt||'',state:'uploaded-preview' as const}));
 const first=media[0],type=v.original.kind===30023?'article':first?.kind==='video'?'video':first?.kind==='audio'?'audio':first?'image':'note';
 // Story lifetime is read only from the retained original signed CRAYS tags.
 const formatTags=v.original.tags.filter(t=>t[0]==='crays-format');
 const expiryTags=v.original.tags.filter(t=>t[0]==='crays-story-expires');
 const storyExpiry=expiryTags.length===1?Number(expiryTags[0][1])*1000:NaN;
 const story=formatTags.length===1&&formatTags[0][1]==='Story'&&Number.isSafeInteger(storyExpiry)&&storyExpiry>v.createdAtSeconds*1000&&storyExpiry<=v.createdAtSeconds*1000+86400000;
 const publishingMedia=media.filter(m=>m.kind!=='audio').map(m=>({...m,kind:m.kind==='video'?'video' as const:'image' as const}));
 return {id:v.original.id,author,title:v.title||'',text:v.body.text,fullText:v.body.text,type,audience:'Public',venueId:v.spotId,status:'accepted',liked:false,saved:false,reposted:false,protected:false,license:false,mediaAvailable:true,createdAt:v.createdAtSeconds*1000,image:media.find(m=>m.kind==='image')?.url,images:media.filter(m=>m.kind==='image').map(m=>({file:m.url,alt:m.alt})),replies:[],readPosition:0,approvedOriginal:v.original.id,relay:v.spotId,publishing:{owner:author,publisherId:author,...(row.contestId?{awardCampaignId:row.contestId}:{}),targetIds:['space:'+v.spotId],receipts:[{targetId:'space:'+v.spotId,status:'accepted'}],revision:1,media:publishingMedia,mediaRights:true,venueTag:v.spotId,...(story?{storyExpiresAt:storyExpiry}:{}),format:story?'Story':[22,34236].includes(v.original.kind)?'Reel':'Post'}};
}
export function withLocalSpot(w:ProductWorld,data:LocalSpotData):ProductWorld{
 if(w.owner!=='thorben')return w;
 const ids=new Set(w.posts.map(p=>p.id)),objectIds=new Set(w.objects.map(o=>o.id));
 const posts=data.posts.filter(p=>!ids.has(p.view.original.id)&&localProfileId(p.view.author.pubkey)).map(localModelPost);
 const offers:Entity[]=data.offers.filter(o=>!objectIds.has(o.id)).map(o=>({id:o.id,kind:'public-creator-offer',owner:o.creatorId,sellerId:o.creatorId,postId:o.previewEventId,name:o.title,preview:o.preview,type:'single',term:'One-time access',price:o.price.amount,currency:o.price.currency,status:'published-demo',format:o.format,version:'local-social-offer-v1',sample:true,mock:true,conditions:'Preview the original and review the licence before payment. This local checkout uses simulated funds.'}));
 const campaigns:Entity[]=data.contests.filter(c=>!objectIds.has('local-social-contest:'+c.id)).map(c=>{
  const person=localPerson(c.creatorId),original=data.posts.find(p=>p.view.original.id===c.previewEventId)||data.posts.find(p=>p.contestId===c.id);
  const category=awardCategories.includes(c.category as typeof awardCategories[number])?c.category:'Lifestyle';
  const title=original?.view.title||person?.name+' · '+category;
  const image=localMedia(original?.view.media.find(m=>m.kind==='image')?.url||person?.picture);
  const campaign:StoryCampaign={id:c.id,nominationId:c.nominationId,competitionId:'competition-'+awardCategories.indexOf(category as typeof awardCategories[number]),seasonId:c.seasonId,creatorId:c.creatorId,name:person?.name||c.creatorId,category,subcategory:awardSubcategories[category][0],title,description:original?.view.body.text||'',image,imageLabel:'Illustrative stock photography',baseVotes:c.recordedDemoProps,annualBaseVotes:c.recordedDemoProps,defaultContestId:c.id,supporters:0,target:c.goal,unlockTitle:'Follow the next chapter',chapters:data.posts.filter(p=>c.eligibleOriginalEventIds.includes(p.view.original.id)).map((p,i)=>({id:p.view.original.id,title:p.view.title||'Chapter '+(i+1),summary:p.view.body.text,body:p.view.body.text,image:localMedia(p.view.media.find(m=>m.kind==='image')?.url)||image})),moments:[],seedCompetitors:[],ideas:[],creatorActions:[],cadence:'Props belong to this exact contest and its creator, category and season.',status:'active',seasonStatus:'open'};
  return {id:'local-social-contest:'+c.id,owner:c.creatorId,kind:'local-social-contest',mock:true,source:'owner-requested-fictional-local-preview',campaign};
 });
 return posts.length||offers.length||campaigns.length?{...w,posts:[...w.posts,...posts],objects:[...w.objects,...offers,...campaigns]}:w;
}
/** Typed projection from this adapter's original fixture records only. */
export function localStoryCampaigns(w:ProductWorld):StoryCampaign[]{const ids=new Map<string,number>(),people=new Map<string,number>();for(const o of w.objects)ids.set(o.id,(ids.get(o.id)||0)+1);for(const p of w.people)people.set(p.id,(people.get(p.id)||0)+1);return w.objects.filter(o=>o.kind==='local-social-contest'&&o.mock===true&&o.source==='owner-requested-fictional-local-preview'&&ids.get(o.id)===1).map(o=>o.campaign as StoryCampaign).filter(c=>!!c&&people.get(c.creatorId)===1);}
let campaignRead:Promise<StoryCampaign[]>|null=null;
export function loadLocalCampaigns(){return campaignRead??=(read<{campaigns:StoryCampaign[]}>('campaigns.json',true).then(r=>r.campaigns).catch(e=>{campaignRead=null;throw e;}));}
export function withLocalCampaigns(w:ProductWorld,rows:StoryCampaign[]):ProductWorld{
 if(w.owner!=='thorben')return w;
 const existing=new Set(w.objects.filter(o=>o.kind==='local-social-contest').map(o=>(o.campaign as StoryCampaign)?.id));
 const added=rows.filter(c=>!existing.has(c.id)&&!!localPerson(c.creatorId)).map(c=>({id:'local-social-contest:'+c.id,owner:c.creatorId,kind:'local-social-contest',mock:true,source:'owner-requested-fictional-local-preview',campaign:c}));
 return added.length?{...w,objects:[...w.objects,...added]}:w;
}

export function localSpotDescription(s:LocalSpot){const t=s.type.toLowerCase();return t.includes('hotel')?'A welcoming place to stay, settle in and meet over a shared table.':t.includes('beach')?'Slow afternoons by the water, shared tables and a reason to stay for sunset.':t.includes('cowork')?'Room for independent work, useful conversations and ideas made together.':t.includes('cruise')?'A community at sea, with shared discoveries and conversations between ports.':t.includes('wellness')||t.includes('spa')?'Space for movement, a quieter rhythm and time to reconnect.':t.includes('music')?'Live music, good listening and evenings that bring people together.':t.includes('restaurant')||t.includes('dining')?'Seasonal food, thoughtful hosting and room for one more at the table.':'Your place to meet familiar faces, share something new and return to.';}
