import type {Entity,ProductWorld} from './productModel';
import {storyCampaignsFor} from './awardStoryRegistry';

export const storyDeliveryStatuses=['announced','preparing','ready','delivered'] as const;
export type StoryDeliveryStatus=typeof storyDeliveryStatuses[number];
export type StoryDelivery={campaignId:string;status:StoryDeliveryStatus;note:string;updatedAt?:number;termsSummary:string;inventory:string;needsReview?:true};
type Entry={status:StoryDeliveryStatus;note:string;at:number};
type DeliveryRecord=Entity&{kind:'award-story-delivery-v1';mock:true;campaignId:string;termsSnapshot:string;status:StoryDeliveryStatus;note:string;createdAt:number;updatedAt:number;history:Entry[]};
const validTime=(v:unknown):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0&&v<=8640000000000000;
const validNote=(v:unknown):v is string=>typeof v==='string'&&v.length<=2000;
const validStatus=(v:unknown):v is StoryDeliveryStatus=>storyDeliveryStatuses.some(s=>s===v);
function context(world:ProductWorld,campaignId:string){
 const campaigns=storyCampaignsFor(world).filter(c=>c.id===campaignId);if(campaigns.length!==1)return;
 const campaign=campaigns[0];
 const originals=world.objects.filter(o=>o.kind==='award-story-draft-v1'&&o.status==='published-demo'&&o.publishedCampaignId===campaignId&&o.owner===campaign.creatorId);
 if(originals.length!==1||campaignId!==`contest-local-${originals[0].id}`)return;
 const original=originals[0];
 // The registry has already checked publication, review history and exact input terms.
 if(typeof original.publishedTerms!=='string')return;
 const terms=JSON.parse(original.publishedTerms) as {delivery:string;fulfilment:string;inventory?:string};
 return{campaign,original,terms,termsSnapshot:original.publishedTerms};
}
const recordId=(campaignId:string)=>`story-delivery:${campaignId}`;
function validRecord(row:Entity,ctx:NonNullable<ReturnType<typeof context>>):row is DeliveryRecord{
 if(row.id!==recordId(ctx.campaign.id)||row.kind!=='award-story-delivery-v1'||row.mock!==true||row.owner!==ctx.campaign.creatorId||row.campaignId!==ctx.campaign.id||row.termsSnapshot!==ctx.termsSnapshot||!validStatus(row.status)||!validNote(row.note)||!validTime(row.createdAt)||!validTime(row.updatedAt)||!Array.isArray(row.history)||!row.history.length)return false;
 let previous:Entry|undefined;
 for(const item of row.history as unknown[]){
  if(!item||typeof item!=='object'||!('status'in item)||!('note'in item)||!('at'in item)||!validStatus(item.status)||!validNote(item.note)||!validTime(item.at))return false;
  const entry:Entry={status:item.status,note:item.note,at:item.at};
  if(!previous){if(entry.status!=='announced'||entry.at!==row.createdAt)return false;}
  else if(entry.at<previous.at||(entry.status===previous.status?entry.note===previous.note:storyDeliveryStatuses.indexOf(entry.status)!==storyDeliveryStatuses.indexOf(previous.status)+1))return false;
  previous=entry;
 }
 return previous?.status===row.status&&previous?.note===row.note&&previous?.at===row.updatedAt;
}
function originals(world:ProductWorld,campaignId:string){return world.objects.filter(o=>o.id===recordId(campaignId)||o.kind==='award-story-delivery-v1'&&o.campaignId===campaignId);}
/** Public allowlist for a local published creator proposal. No payer, owner or private draft history. */
export function storyDelivery(world:ProductWorld,campaignId:string):StoryDelivery|undefined{
 const ctx=context(world,campaignId);if(!ctx)return;
 const rows=originals(world,campaignId),row=rows.length===1&&validRecord(rows[0],ctx)?rows[0]:undefined;
 const review=rows.length>0&&!row;
 return{campaignId,status:row?.status||'announced',note:review?'The local delivery evidence needs review.':row?.note||'',...(row?{updatedAt:row.updatedAt}:{}),termsSummary:`${ctx.terms.delivery} · ${ctx.terms.fulfilment}`,inventory:ctx.terms.inventory||'',...(review?{needsReview:true as const}:{})};
}
/** Only an explicit local creator action changes this mock delivery status; no benefits or rights change. */
export function setStoryDelivery(world:ProductWorld,campaignId:string,status:StoryDeliveryStatus,note:string,now=Date.now()):ProductWorld{
 const ctx=context(world,campaignId);
 if(!world.identity.signedIn||!ctx||ctx.campaign.creatorId!==world.owner||ctx.original.owner!==world.owner)throw Error('Only the original local creator can update this published demo fulfilment.');
 if(!validStatus(status)||!validNote(note))throw Error('Choose a known demo delivery status and a public note of at most 2,000 characters.');
 const rows=originals(world,campaignId),prior=rows.length===1&&validRecord(rows[0],ctx)?rows[0]:undefined;
 if(rows.length&&!prior)throw Error('Retain and review the ambiguous original delivery record.');
 if(prior?.history.some(h=>h.status===status&&h.note===note))return world;
 if(!validTime(now)||now<Number(ctx.original.updatedAt)||prior&&now<prior.updatedAt)throw Error('Retain the exact original delivery timeline.');
 const current=prior?.status||'announced';
 if(status!==current&&storyDeliveryStatuses.indexOf(status)!==storyDeliveryStatuses.indexOf(current)+1)throw Error('Move through announced, preparing, ready and delivered in order.');
 const history:Entry[]=prior?[...prior.history]:status==='announced'?[]:[{status:'announced',note:'',at:now}];
 history.push({status,note,at:now});
 const row:DeliveryRecord={id:recordId(campaignId),owner:world.owner,kind:'award-story-delivery-v1',mock:true,campaignId,termsSnapshot:ctx.termsSnapshot,status,note,createdAt:prior?.createdAt??now,updatedAt:now,history};
 return{...world,objects:prior?world.objects.map(o=>o===prior?row:o):[...world.objects,row]};
}
