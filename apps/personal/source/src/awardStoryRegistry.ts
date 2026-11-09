import {localStoryCampaigns} from './localSocialData';
import type {Entity, Post, ProductWorld} from './productModel';
import {awardCategories,awardSubcategories,awardSubcategoryValue} from './awardCategories';
import {storyCampaigns,type StoryCampaign,type StoryMomentType} from './awardStorySeeds';
import {storyRivalCampaigns} from './awardStoryRivals';

export type StoryDraftInput={title:string;story:string;delivery:string;fulfilment:string;goal:number;category:string;subcategory:string;image:string;inventory?:string;trailer?:string;startsOn?:string;endsOn?:string;episodes?:{title:string;body:string}[];sourceIdea?:string;format?:StoryMomentType;seasonId?:string};
export type StoryDraftStatus='draft'|'submitted'|'approved'|'changes-requested'|'published-demo';
export type StoryDraft=Entity&{kind:'award-story-draft-v1';mock:true;revision:number;status:StoryDraftStatus;input:StoryDraftInput;createdAt:number;updatedAt:number;history:{status:StoryDraftStatus;revision:number;at:number;terms:string}[];publishedCampaignId?:string;publishedPostId?:string;publishedTerms?:string;publishedName?:string;rightsConfirmed?:true;audience?:'Public'};
const idValid=(v:unknown):v is string=>typeof v==='string'&&/^[A-Za-z0-9][A-Za-z0-9._:-]{0,95}$/.test(v);
const timeValid=(v:unknown):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0&&v<=8640000000000000;
const text=(v:unknown,max=8000):v is string=>typeof v==='string'&&!!v.trim()&&v.length<=max;
const imageValid=(v:unknown)=>storyCampaigns.some(c=>c.image===v);
const dateValid=(v:string)=>/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
function validInput(v:unknown,complete=false):v is StoryDraftInput{
 if(!v||typeof v!=='object')return false;const i=v as StoryDraftInput;
 return text(i.title,180)&&text(i.story)&&typeof i.delivery==='string'&&i.delivery.length<=2000&&typeof i.fulfilment==='string'&&i.fulfilment.length<=2000&&(!complete||text(i.delivery,2000)&&text(i.fulfilment,2000))&&Number.isSafeInteger(i.goal)&&i.goal>0&&i.goal<=100000000&&awardCategories.some(c=>c===i.category)&&awardSubcategories[i.category]?.includes(awardSubcategoryValue(i.subcategory))&&imageValid(i.image)&&
 (i.inventory===undefined||typeof i.inventory==='string'&&i.inventory.length<=2000)&&(i.sourceIdea===undefined||typeof i.sourceIdea==='string'&&i.sourceIdea.length<=2000)&&
 (i.trailer===undefined||storyCampaigns.some(c=>c.videoTeaser===i.trailer&&!!i.trailer))&&
 (i.format===undefined||['community-unlock','guaranteed-benefit','creator-selection','prize-draw'].includes(i.format))&&
 (i.seasonId===undefined||/^season-demo-20\d\d$/.test(i.seasonId))&&
 (i.startsOn===undefined&&i.endsOn===undefined||typeof i.startsOn==='string'&&typeof i.endsOn==='string'&&dateValid(i.startsOn)&&dateValid(i.endsOn)&&i.startsOn<=i.endsOn&&i.startsOn.slice(0,4)===(i.seasonId||'season-demo-2026').slice(-4)&&i.endsOn.slice(0,4)===(i.seasonId||'season-demo-2026').slice(-4))&&
 (i.episodes===undefined||Array.isArray(i.episodes)&&i.episodes.length<=12&&(!complete||i.episodes.length>0)&&i.episodes.every(e=>e&&typeof e.title==='string'&&e.title.length<=180&&typeof e.body==='string'&&e.body.length<=8000&&(!complete||text(e.title,180)&&text(e.body))));
}
function copyInput(i:StoryDraftInput):StoryDraftInput{return {...i,...(i.episodes?{episodes:i.episodes.map(e=>({...e}))}:{})};}
function ownerCode(owner:string){return btoa(String.fromCharCode(...new TextEncoder().encode(owner))).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');}
function validDraft(row:Entity):row is StoryDraft{
 if(row.kind!=='award-story-draft-v1'||row.mock!==true||!idValid(row.id)||!text(row.owner,72)||ownerCode(row.owner).length>96||!Number.isSafeInteger(row.revision)||Number(row.revision)<1||!validInput(row.input)||!timeValid(row.createdAt)||!timeValid(row.updatedAt)||!Array.isArray(row.history)||!row.history.length)return false;
 let revision=0,at=row.createdAt;let status:StoryDraftStatus|undefined;
 for(const h of row.history){if(!h||!timeValid(h.at)||h.at<at||!Number.isSafeInteger(h.revision)||!text(h.terms,200000))return false;
  try{if(!validInput(JSON.parse(h.terms)))return false;}catch{return false;}
  if(h.status==='draft'){if(h.revision!==revision+1||status==='published-demo')return false;revision=h.revision;}
  else if(h.revision!==revision||!({draft:['submitted'],'changes-requested':['submitted'],submitted:['approved','changes-requested'],approved:['published-demo','changes-requested'],'published-demo':[]} as Record<string,string[]>)[status||'']?.includes(h.status))return false;
  if(h.status!=='draft'&&h.terms!==row.history[row.history.indexOf(h)-1]?.terms)return false;
  at=h.at;status=h.status;
 }
 if(revision!==row.revision||status!==row.status||at!==row.updatedAt||row.history[0].at!==row.createdAt||row.history.at(-1).terms!==JSON.stringify(row.input))return false;
 if((status==='submitted'||status==='approved'||status==='published-demo')&&!validInput(row.input,true))return false;
 if(status==='published-demo')return row.publishedCampaignId===`contest-local-${row.id}`&&row.publishedPostId===`post-local-${row.id}`&&row.publishedTerms===JSON.stringify(row.input)&&text(row.publishedName,180)&&row.rightsConfirmed===true&&row.audience==='Public';
 return row.publishedCampaignId===undefined&&row.publishedPostId===undefined&&row.publishedTerms===undefined;
}
function records(world:ProductWorld){const counts=new Map<string,number>();for(const o of world.objects)counts.set(o.id,(counts.get(o.id)||0)+1);return world.objects.filter((row):row is StoryDraft=>counts.get(row.id)===1&&validDraft(row));}
const snapshot=(row:StoryDraft):StoryDraft=>({...row,input:copyInput(row.input),history:row.history.map(h=>({...h}))});
export function ownStoryDrafts(world:ProductWorld):StoryDraft[]{return world.identity.signedIn?records(world).filter(row=>row.owner===world.owner).map(snapshot):[];}
function own(world:ProductWorld,id:string){if(!world.identity.signedIn)throw Error('Sign in to manage your own local Props draft.');const row=records(world).find(r=>r.id===id&&r.owner===world.owner);if(!row)throw Error('Open your exact original local draft.');return row;}
function replace(world:ProductWorld,row:StoryDraft){return {...world,objects:world.objects.map(o=>o.id===row.id?row:o)};}
export function saveStoryDraft(world:ProductWorld,input:StoryDraftInput,id=`story-draft-${globalThis.crypto.randomUUID()}`,now=Date.now()):ProductWorld{
 if(!world.identity.signedIn||!text(world.owner,72)||ownerCode(world.owner).length>96||!idValid(id)||!timeValid(now)||!validInput(input))throw Error('Review your original story, approved cover, category, goal and demo delivery terms.');
 const collision=world.objects.some(o=>o.id===id);const prior=collision?own(world,id):undefined;
 if(prior?.status==='published-demo'||world.objects.some(o=>o.kind==='award-story-order-v1'&&o.campaignId===`contest-local-${id}`))throw Error('Published contest terms and vote originals are immutable. Create a separate new contest.');
 if(prior&&now<prior.updatedAt)throw Error('Keep the original revision time.');
 const saved=copyInput(input),revision=(prior?.revision||0)+1;
 const row:StoryDraft={id,owner:world.owner,kind:'award-story-draft-v1',mock:true,revision,status:'draft',input:saved,createdAt:prior?.createdAt??now,updatedAt:now,history:[...(prior?.history||[]),{status:'draft',revision,at:now,terms:JSON.stringify(saved)}]};
 return prior?replace(world,row):{...world,objects:[...world.objects,row]};
}
export function reviewStoryDraft(world:ProductWorld,id:string,action:'submit'|'approve'|'request-changes',now=Date.now()):ProductWorld{
 if(!['submit','approve','request-changes'].includes(action))throw Error('Choose an explicit mock review action.');
 const row=own(world,id);const status:StoryDraftStatus=action==='submit'?'submitted':action==='approve'?'approved':'changes-requested';
 const allowed=action==='submit'?['draft','changes-requested']:action==='approve'?['submitted']:['submitted','approved'];
 if(!allowed.includes(row.status)||!timeValid(now)||action!=='request-changes'&&!validInput(row.input,true))throw Error('Use the separate submit and explicit mock editorial review steps.');
 const at=Math.max(now,row.updatedAt);return replace(world,{...row,status,updatedAt:at,history:[...row.history,{status,revision:row.revision,at,terms:JSON.stringify(row.input)}]});
}
export function publishStoryDraft(world:ProductWorld,id:string,options:{audience:'Public';rightsConfirmed:true},now=Date.now()):ProductWorld{
 const row=own(world,id);if(row.status==='published-demo'){if(options?.audience==='Public'&&options.rightsConfirmed===true)return world;throw Error('Confirm this exact local public publication.');}
 if(row.status!=='approved'||options?.audience!=='Public'||options.rightsConfirmed!==true||!timeValid(now)||now<row.updatedAt)throw Error('Approve the mock review, then explicitly confirm Public and your publication rights.');
 const publishedCampaignId=`contest-local-${id}`,publishedPostId=`post-local-${id}`;
 if(world.posts.some(p=>p.id===publishedPostId)||world.objects.some(o=>o.id===publishedCampaignId))throw Error('Keep the exact existing campaign and publication original.');
 const name=world.profiles?.[world.owner]?.name;
 const annualOriginal=records(world).find(r=>r.status==='published-demo'&&r.owner===world.owner&&r.input.category===row.input.category&&(r.input.seasonId||'season-demo-2026')===(row.input.seasonId||'season-demo-2026'));
 const publishedName=annualOriginal?.publishedName||(typeof name==='string'&&text(name,180)?name:world.owner);
 const changed:StoryDraft={...row,status:'published-demo',updatedAt:now,publishedCampaignId,publishedPostId,publishedName,publishedTerms:JSON.stringify(row.input),rightsConfirmed:true,audience:'Public',history:[...row.history,{status:'published-demo',revision:row.revision,at:now,terms:JSON.stringify(row.input)}]};
 const post:Post={id:publishedPostId,author:world.owner,title:row.input.title,text:row.input.story,type:row.input.trailer?'video':'image',audience:'Public',status:'accepted',liked:false,saved:false,reposted:false,protected:false,license:false,mediaAvailable:true,createdAt:now,image:row.input.image,alt:'Selected approved illustrative Props demo cover',replies:[],readPosition:0,publishing:{owner:world.owner,publisherId:world.owner,awardCampaignId:publishedCampaignId,targetIds:['global',`creator:${world.owner}`],revision:row.revision,media:[{id:`${publishedPostId}-media`,name:row.input.trailer?'Approved illustrative demo trailer':'Approved illustrative demo cover',url:`/assets/crays/${row.input.trailer||row.input.image}`,kind:row.input.trailer?'video':'image',alt:'Original creator demo contribution · illustrative media',state:'uploaded-preview'}],mediaRights:true,venueTag:'',format:'Post',receipts:[{targetId:'global',status:'accepted-preview'},{targetId:`creator:${world.owner}`,status:'accepted-preview'}]}};
 return {...replace(world,changed),posts:[post,...world.posts]};
}
function projection(row:StoryDraft):StoryCampaign{
 const i=row.input,seasonId=i.seasonId||'season-demo-2026',categoryIndex=awardCategories.findIndex(c=>c===i.category),id=row.publishedCampaignId!;
 const competitionId=storyCampaigns.find(c=>c.category===i.category)?.competitionId||`competition-${categoryIndex}`;
 const nominationId=`nomination-local-${categoryIndex}-${seasonId.slice(-4)}-${ownerCode(row.owner)}`;
 const episodes=i.episodes||[{title:i.title,body:i.story},{title:i.delivery,body:i.fulfilment}];
 return{id,nominationId,competitionId,seasonId,creatorId:row.owner,name:row.publishedName!,category:i.category,subcategory:i.subcategory,title:i.title,description:i.story,image:i.image,...(i.trailer?{videoTeaser:i.trailer}:{}),imageLabel:'Approved illustrative demo cover; original creator text',baseVotes:0,annualBaseVotes:0,defaultContestId:id,supporters:0,target:i.goal,unlockTitle:i.delivery,chapters:episodes.map((e,index)=>({id:`${id}-chapter-${index+1}`,title:e.title,summary:e.body,body:e.body,image:i.image,...(index?{lockedUntilVotes:i.goal}:{})})),moments:[{id:`${id}-moment`,type:i.format||'community-unlock',title:i.delivery,summary:i.fulfilment,terms:`Local mock proposal only. ${i.fulfilment}. No automatic draw entry, bonus votes, paid reach, ticket, ownership or final prize is granted.`,status:'Creator proposal · local demo'}],seedCompetitors:[],ideas:[],creatorActions:[],cadence:'Each exact local contest contributes once to the same creator/category/year nomination.',status:'active',seasonStatus:'open'};
}
export function storyCampaignsFor(world:ProductWorld):StoryCampaign[]{return [...localStoryCampaigns(world),...storyCampaigns,...storyRivalCampaigns,...records(world).filter(row=>row.status==='published-demo').map(projection)];}
