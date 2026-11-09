import {localPreviewId} from './localPreviewId.ts';
import {applyPublishing} from './publishing.ts';
import {mayRead,type ProductWorld,type ActionContext} from './productModel.ts';
function need(v:unknown,m:string):asserts v{if(!v)throw Error(m);}
export type SpotReview={id:string;venueId:string;author:string;rating:number;text:string;experienceDate:string;publishedAt:number;sourceId:string;postId?:string;example:boolean;historical?:boolean;state:'published'|'draft'|'needs-review'};
export function spotCommunitySource(w:ProductWorld,venueId:string,at=Date.now()){
 const venues=w.venues.filter(v=>v.id===venueId);if(venues.length!==1||!venues[0].operatorActive)return {state:'unavailable' as const};
 const sources=w.objects.filter(o=>o.kind==='spot-community-evidence-preview'&&o.owner===w.owner&&o.venueId===venueId);
 if(sources.length!==1||!w.identity.signedIn)return {state:'missing' as const};const s=sources[0];
 if(!unique(w,s.id)||s.publicScope!=='Public'||s.status!=='example-source'||!Number.isSafeInteger(s.memberCount)||Number(s.memberCount)<0||!Number.isSafeInteger(s.asOf)||!Number.isSafeInteger(s.validUntil)||Number(s.asOf)>at||Number(s.validUntil)<=Number(s.asOf))return {state:'unavailable' as const};
 return {state:Number(s.validUntil)<=at?'stale' as const:'current' as const,source:s};
}
const unique=(w:ProductWorld,id:string)=>w.objects.filter(o=>o.id===id).length===1;
export function spotReviews(w:ProductWorld,venueId:string):SpotReview[]{
 const source=spotCommunitySource(w,venueId);if(source.state==='unavailable'||!w.identity.signedIn)return [];
 const samples=source.source&&Array.isArray(source.source.reviews)?source.source.reviews as SpotReview[]:[];
 const real=w.objects.filter(o=>['venue-review','visit-review'].includes(String(o.kind))&&o.owner===w.owner&&o.venueId===venueId&&unique(w,o.id)).flatMap(o=>{
  if(!o.postId)return Number.isInteger(Number(o.rating))&&Number(o.rating)>=1&&Number(o.rating)<=5&&typeof o.text==='string'?[{id:o.id,venueId,author:w.profiles[w.owner]?.name||'You',rating:Number(o.rating),text:o.text,experienceDate:String(o.experienceDate||'Not recorded'),publishedAt:Number(o.createdAt)||0,sourceId:o.id,example:false,historical:true,state:'needs-review'} as SpotReview]:[];
  const posts=w.posts.filter(p=>p.id===o.postId),p=posts.length===1?posts[0]:undefined;if(!p||p.author!==w.owner||!mayRead(w,p)||p.archived)return [];
  const exact=p.text===o.postText&&p.title===o.postTitle&&p.publishing?.venueTag===venueId;
  return [{id:o.id,venueId,author:w.profiles[w.owner]?.name||'You',rating:Number(o.rating),text:String(o.text),experienceDate:String(o.experienceDate),publishedAt:p.createdAt,sourceId:p.publishing?.eventId||p.id,postId:p.id,example:false,state:exact&&p.audience==='Public'&&['accepted','partial'].includes(p.status)?'published':exact&&['draft','signed','unknown','submitted'].includes(p.status)?'draft':'needs-review'} as SpotReview];
 });
 // Missing/withdrawn or malformed sample originals are never replaced with a flattering rating.
 return [...real,...samples.filter(r=>typeof r.id==='string'&&typeof r.author==='string'&&typeof r.text==='string'&&typeof r.sourceId==='string'&&r.sourceId.startsWith(`example-public-review:${venueId}:`)&&Number.isFinite(r.publishedAt)&&r.publishedAt<=Date.now()&&typeof r.experienceDate==='string'&&r.example===true&&r.venueId===venueId&&r.state==='published'&&r.rating>=1&&r.rating<=5&&samples.filter(x=>x.id===r.id).length===1)].sort((a,b)=>b.publishedAt-a.publishedAt);
}
export function applySpotCommunityEvidence(w:ProductWorld,op:string,d:Record<string,string>,ctx:ActionContext){
 if(!op.startsWith('spot.community.')&&!op.startsWith('spot.review.'))return;
 need(w.identity.signedIn,'Sign in to use your own review workspace.');const venues=w.venues.filter(v=>v.id===ctx.venueId);need(venues.length===1&&venues[0].operatorActive,'This original Spot is unavailable.');const venue=venues[0];
 if(op==='spot.community.example'){
  need(d.approved==='Yes','Choose the labelled community example explicitly.');const existing=w.objects.filter(o=>o.owner===w.owner&&o.kind==='spot-community-evidence-preview'&&o.venueId===venue.id);need(existing.length<=1,'Resolve the duplicate original source.');if(existing.length)return {objectId:existing[0].id,message:'The same example source is retained; no membership or presence changed.'};
  const at=Date.now(),id=localPreviewId(),reviews=[['Jordan','4','A relaxed place to catch up. The team helped us choose a quiet table.'],['Sam','3','Good atmosphere. Service took longer during the busy hour.'],['Riley','5','The morning session was welcoming and easy to join.'],['Robin','4','I enjoyed the setting and would plan more time for my next visit.'],['Casey','2','A friendly welcome, but my booking question needed a second follow-up.']].map(([author,rating,text],i)=>({id:`${id}:review:${i}`,venueId:venue.id,author:`${author} · example`,rating:Number(rating),text,experienceDate:new Date(at-(i+2)*86400000).toISOString().slice(0,10),publishedAt:at-(i+1)*86400000,sourceId:`example-public-review:${venue.id}:${i}`,example:true,state:'published'}));
  w.objects.push({id,owner:w.owner,kind:'spot-community-evidence-preview',venueId:venue.id,publicScope:'Public',status:'example-source',name:`${venue.name} community example`,memberCount:1240,asOf:at,validUntil:at+3600000,sourceId:`example-public-community:${venue.id}`,reviews});return {objectId:id,message:'Labelled public community example opened. No live count, attendance, contact or membership was created.'};
 }
 need(op==='spot.review.prepare','Use the original review action.');need(venue.visited,'A recorded visit is required before preparing a visit review. No presence or attendance is inferred.');need(d.approved==='Yes'&&d.ownExperience==='Yes','Confirm that this is your own experience and review the public draft.');
 need(/^[1-5]$/.test(d.rating),'Choose a rating from1 to5.');const text=d.text?.trim();need(text&&text.length<=3000,'Write your own review, up to3000 characters.');
 need(/^\d{4}-\d{2}-\d{2}$/.test(d.date)&&Number.isFinite(Date.parse(d.date))&&new Date(d.date).toISOString().slice(0,10)===d.date&&d.date<=new Date().toISOString().slice(0,10),'Choose the actual experience date, no later than today.');
 need(!ctx.objectId,'Keep the original review and its separate publication history.');
 const postTitle=`My visit to ${venue.name}`,postText=`${text}\n\nVisit rating: ${d.rating}/5 · Experience: ${d.date}\nSpot: ${venue.name}`;
 const duplicate=w.objects.find(o=>o.owner===w.owner&&o.kind==='venue-review'&&o.venueId===venue.id&&o.text===text&&o.experienceDate===d.date&&o.rating===Number(d.rating));if(duplicate)return {objectId:duplicate.id,message:'The original matching review draft is retained. Open its publication status instead of creating a duplicate.'};
 const saved=applyPublishing(w,'complete.publishing.save',{publisherId:w.owner,title:postTitle,text:postText,audience:'Public',targets:'["global"]',media:'[]',mediaRights:'No',venueTag:venue.id},{featureId:'AL-053'});need(saved,'The original publication draft could not be prepared.');
 const id=localPreviewId();w.objects.push({id,owner:w.owner,kind:'venue-review',venueId:venue.id,postId:saved.objectId,postTitle,postText,text,rating:Number(d.rating),experienceDate:d.date,status:'draft',name:postTitle,createdAt:Date.now()});return {objectId:id,message:'Your public review draft is ready. Review its exact content and relay destinations before separately publishing. No verified attendance is implied.'};
}
