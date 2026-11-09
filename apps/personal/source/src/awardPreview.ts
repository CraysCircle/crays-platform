import {canonicalAwardSource,bindAwardVoteReport,validAwardVoteReport,type AwardVoteReportingBinding} from './awardCanonical.ts';
import {awardReport} from './awardReporting.ts';
import {buildUSDCheckoutQuote,requireUSDCheckoutQuote,type USDCheckoutBinding,type USDCheckoutQuote} from './usdCheckout';
import {verifiedVenueOperator} from "./venueAuthority";
import {mayRead,type ProductWorld,type Entity} from './productModel';
export {awardCategories,awardSubcategories} from './awardCategories';
import {awardCategories} from './awardCategories';
import {ownAwardRecords,assertAwardSlot,awardRecord,awardText,awardVersion} from './awardRecords';

// Clickdummy records only: no wallet, relay, RGB or real draw is called.
export type AwardAsset='USDT'|'BTC'|'USD'|'USDB'|'BTC-onchain';
export const awardAssets:AwardAsset[]=['USD','USDT','USDB','BTC-onchain','BTC'];
export const awardRailLabels:Record<AwardAsset,string>={USD:'USD · Stripe',USDT:'USDT · Utexo',USDB:'USDB · Spark',BTC:'Bitcoin · Lightning','BTC-onchain':'Bitcoin · on-chain'};
function awardRailSource(asset:AwardAsset){
 if(!awardAssets.includes(asset))throw Error('Choose an available Props payment route.');
 return asset==='USD'?{asset:'USD',network:'Stripe · USD',ids:['usd','stripe-usd']}:asset==='USDB'?{asset:'USDB',network:'Spark · Brale USDB',ids:['usdb-spark']}:asset==='USDT'?{asset:'USDT',network:'Bitcoin / RGB · Utexo path',ids:['utexo']}:asset==='BTC'?{asset:'sats',network:'Lightning',ids:['ln']}:{asset:'BTC',network:'Bitcoin',ids:['btc']};
}
export function awardCheckoutBinding(w:ProductWorld,c:AwardCampaign,quantity:number,asset:AwardAsset):USDCheckoutBinding{
 awardTotal(quantity,asset);const expected=awardRailSource(asset);
 const wallets=w.wallets.filter(a=>a.asset===expected.asset&&a.network===expected.network&&expected.ids.includes(a.id));
 if(wallets.length!==1)throw Error('Review the exact payment account for this Props route.');
 const wallet=wallets[0];return{owner:w.owner,sourceId:c.id,recipient:c.creatorId,purpose:'Award vote',offerId:c.id,offerVersion:String(c.version),walletId:wallet.id,asset:wallet.asset,network:wallet.network,usdAmount:String(quantity)};
}
export function awardCheckoutQuote(w:ProductWorld,c:AwardCampaign,quantity:number,asset:AwardAsset,providerFee:string,now=Date.now()){return buildUSDCheckoutQuote(awardCheckoutBinding(w,c,quantity,asset),providerFee,now);}
export function awardWalletId(v:AwardVote){return v.checkout?.walletId||(v.asset==='USDT'?'utexo':v.asset==='BTC'?'ln':v.asset==='USDB'?'usdb-spark':v.asset==='BTC-onchain'?'btc':'usd');}

export type AwardCampaign={nomineeType?:'Creator'|'Club'|'Hotel'|'Restaurant'|'Space'|'Brand';venueId?:string;payeeName?:string;id:string;creatorId:string;name:string;category:string;title:string;description:string;image:string;target:number;reward:string;baseVotes:number;version:number;status:'draft'|'published-demo';season:string};
export type AwardUSDInvoice={currency:'USD';unitMinor:100;totalMinor:number;nomineeMinor:number;prizesMinor:number;eventMinor:number;quote:{id:string;sourceAuthority:'fictional-preview';provider:'CRAYS local scenario';network:string;asset:AwardAsset;amount:number;createdAt:number;expiresAt:number;fees:'not-connected'}};
export type AwardVote={reporting?:AwardVoteReportingBinding;updatedAt?:number;checkout?:USDCheckoutQuote;invoice?:AwardUSDInvoice;nomineeName?:string;payeeName?:string;venueId?:string;id:string;campaignId:string;campaignVersion:number;creatorId:string;quantity:number;asset:AwardAsset;unit:number;total:number;creator:number;prizes:number;event:number;status:'prepared'|'unknown'|'confirmed-demo'|'failed'|'refunded-demo';proof:'not-issued'|'verified-preview'|'problem';createdAt:number;reward:string;category:string;season:string;sourcePostId?:string;publicSupport?:boolean};
const kind='award-preview-campaign',voteKind='award-preview-vote';
function storedCampaign(value:unknown,id:string):value is AwardCampaign{
 if(!awardRecord(value))return false;
 return value.id===id&&['creatorId','name','title','description','image','reward','season'].every(k=>awardText(value[k]))&&awardCategories.includes(value.category as typeof awardCategories[number])&&awardVersion(value.version)&&awardVersion(value.target)&&Number.isSafeInteger(value.baseVotes)&&Number(value.baseVotes)>=0&&['draft','published-demo'].includes(String(value.status));
}
export function storedAwardVote(value:unknown,id:string,owner:string):value is AwardVote{
 if(!awardRecord(value)||value.id!==id||!['campaignId','creatorId','reward','category','season'].every(k=>awardText(value[k]))||!awardVersion(value.campaignVersion)||!awardAssets.includes(value.asset as AwardAsset)||!Number.isSafeInteger(value.quantity)||Number(value.quantity)<1||Number(value.quantity)>1000||!Number.isFinite(value.createdAt)||Number(value.createdAt)<0||Number(value.createdAt)>8640000000000000-300000||!['prepared','unknown','confirmed-demo','failed','refunded-demo'].includes(String(value.status))||!['not-issued','verified-preview','problem'].includes(String(value.proof))||(value.publicSupport!==undefined&&typeof value.publicSupport!=='boolean'))return false;
 if(value.updatedAt!==undefined&&(!Number.isFinite(value.updatedAt)||Number(value.updatedAt)<Number(value.createdAt)||Number(value.updatedAt)>8640000000000000))return false;
 const amounts=awardTotal(Number(value.quantity),value.asset as AwardAsset);
 if(value.checkout!==undefined){
  if(!awardRecord(value.checkout))return false;
  const q=value.checkout,rail=awardRailSource(value.asset as AwardAsset);
  if(!rail.ids.includes(String(q.walletId))||typeof q.createdAt!=='number'||q.createdAt>Number(value.createdAt))return false;
  try{requireUSDCheckoutQuote(q,{owner,sourceId:String(value.campaignId),recipient:String(value.creatorId),purpose:'Award vote',offerId:String(value.campaignId),offerVersion:String(value.campaignVersion),walletId:String(q.walletId),asset:rail.asset,network:rail.network,usdAmount:String(value.quantity)});}catch{return false;}
 }

 if(value.invoice!==undefined){
  const invoice=value.invoice;
  if(!awardRecord(invoice)||invoice.currency!=='USD'||!['unitMinor','totalMinor','nomineeMinor','prizesMinor','eventMinor'].every(k=>Number.isSafeInteger(invoice[k])&&Number(invoice[k])>=0)||!awardRecord(invoice.quote))return false;
  if(JSON.stringify(invoice)!==JSON.stringify(awardInvoice(Number(value.quantity),value.asset as AwardAsset,id,Number(value.createdAt))))return false;
  const q=invoice.quote;
  if(!['id','sourceAuthority','provider','network','asset','fees'].every(k=>awardText(q[k]))||!['amount','createdAt','expiresAt'].every(k=>typeof q[k]==='number'&&Number.isFinite(q[k]))||Number(q.amount)<0)return false;
 }
 return Object.entries(amounts).every(([key,n])=>value[key]===n);
}
export function awardCampaigns(w:ProductWorld):AwardCampaign[]{
 const seeds:AwardCampaign[]=[
  {id:'award-maya',creatorId:'maya-creator',name:'Maya Bennett',category:'Content Creator',title:'Behind the story.',description:'Help bring the next travel film to life. Every valid preview vote supports Maya and her place in the final.',image:'person-maya-creator.webp',target:1500,reward:'At 1,500 Props: an exclusive behind-the-scenes film for this campaign’s voters.',baseVotes:1200,version:1,status:'published-demo',season:'Preview season'},
  {id:'award-kai',creatorId:'kai-creator',name:'Kai Andersen',category:'Content Creator',title:'Move together.',description:'A movement challenge made with the community. Follow the campaign and help Kai reach the final.',image:'person-kai-creator.webp',target:1300,reward:'At 1,300 Props: a recorded community movement session for this campaign’s voters.',baseVotes:1100,version:1,status:'published-demo',season:'Preview season'},
  {id:'award-lena',creatorId:'lena-creator',name:'Lena Moreau',category:'Content Creator',title:'Make something worth sharing.',description:'A creative challenge, fresh ideas and a community-made finale.',image:'person-lena-creator.webp',target:1000,reward:'At 1,000 Props: a private campaign film for this campaign’s voters.',baseVotes:900,version:1,status:'published-demo',season:'Preview season'},
 ];
 const venues:AwardCampaign[]=w.venues.filter(v=>['harbor-house','coast','work','move','forest-city'].includes(v.id)).map((v,i)=>({id:`award-space-${v.id}`,creatorId:`venue:${v.id}`,venueId:v.id,nomineeType:/hotel/i.test(v.type)?'Hotel':/restaurant/i.test(v.type)?'Restaurant':/club/i.test(v.type)?'Club':'Space',name:v.name,payeeName:v.name,category:'Lifestyle',title:'Your place. Your people.',description:`What makes ${v.name} special? Share your favourite moments and help the community choose the places to celebrate at the Props.`,image:v.image,target:1500,reward:'At the milestone: a community celebration proposal, subject to the venue’s published availability and conditions. No table, ticket or visit is guaranteed.',baseVotes:1000-i*100,version:1,status:'published-demo',season:'Preview season'}));
 return [...seeds.filter(c=>!w.objects.some(o=>o.id===c.id)&&w.people.some(p=>p.id===c.creatorId&&!p.blocked)).map(c=>({...c,name:w.people.find(p=>p.id===c.creatorId)!.name})),...venues.filter(c=>!w.objects.some(o=>o.id===c.id)),...ownAwardRecords(w,kind).filter(o=>storedCampaign(o.campaign,o.id)&&(w.identity.signedIn||(o.campaign as AwardCampaign).status==='published-demo')).map(o=>o.campaign as AwardCampaign)];
}
function ownVoteRecords(w:ProductWorld):AwardVote[]{return ownAwardRecords(w,voteKind).filter(o=>storedAwardVote(o.vote,o.id,w.owner)).map(o=>o.vote as AwardVote);}
export function awardVotes(w:ProductWorld):AwardVote[]{return w.identity.signedIn?ownVoteRecords(w):[];}
export function heldAwardOriginals(w:ProductWorld){
 if(!w.identity.signedIn)return false;
 return w.objects.some(o=>o.owner===w.owner&&((o.kind===kind&&!awardCampaigns(w).some(c=>c.id===o.id))||(o.kind===voteKind&&!ownVoteRecords(w).some(v=>v.id===o.id&&validAwardVoteReport(v,w.owner)))));
}
export function awardGlobalSource(w:ProductWorld){return canonicalAwardSource(w,storedAwardVote);}
export function awardQualifiedVotes(w:ProductWorld){const valid=new Set(awardReport(awardGlobalSource(w),'All categories').valid.map(v=>v.id));return awardVotes(w).filter(v=>valid.has(v.id));}
export function awardCount(w:ProductWorld,c:AwardCampaign|undefined){if(!c)return 0;return awardReport(awardGlobalSource(w),c.category).standings.find(s=>s.nomineeId===c.creatorId&&s.season===c.season)?.votes||0;}
export function awardPosition(w:ProductWorld,c:AwardCampaign){return awardReport(awardGlobalSource(w),c.category).standings.find(s=>s.nomineeId===c.creatorId&&s.season===c.season)?.rank;}
export function awardThirdPlaceVotes(w:ProductWorld,category:string){return awardReport(awardGlobalSource(w),category).standings[2]?.votes||0;}
export function awardRanking(w:ProductWorld,category:string,nomineeType?:AwardCampaign['nomineeType']){const standings=awardReport(awardGlobalSource(w),category).standings;return awardCampaigns(w).filter(c=>(!nomineeType||c.nomineeType===nomineeType)&&c.category===category&&c.status==='published-demo').sort((a,b)=>(standings.find(s=>s.nomineeId===b.creatorId)?.votes||0)-(standings.find(s=>s.nomineeId===a.creatorId)?.votes||0)||a.name.localeCompare(b.name));}
export function awardMoney(value:number,asset:AwardAsset){return asset==='BTC'?`${value.toLocaleString('en')} sats`:asset==='BTC-onchain'?`${(value/100_000_000).toFixed(8)} BTC`:`${(value/1_000_000).toFixed(2)} ${asset}`;}
function awardInvoiceNetwork(asset:AwardAsset){return asset==='USDT'?'Utexo route preview':asset==='BTC'?'Lightning preview':asset==='USD'?'Stripe · USD':asset==='USDB'?'Spark · Brale USDB':'Bitcoin';}
export function awardUSD(minor:number){return `${(minor/100).toFixed(2)} USD`;}
export function awardInvoice(quantity:number,asset:AwardAsset,id:string,now=Date.now()):AwardUSDInvoice{
 const rail=awardTotal(quantity,asset),totalMinor=quantity*100;
 return {currency:'USD',unitMinor:100,totalMinor,nomineeMinor:totalMinor/2,prizesMinor:totalMinor/4,eventMinor:totalMinor/4,quote:{id:`preview-quote:${id}`,sourceAuthority:'fictional-preview',provider:'CRAYS local scenario',network:awardInvoiceNetwork(asset),asset,amount:rail.total,createdAt:now,expiresAt:now+5*60_000,fees:'not-connected'}};
}
export function awardTotal(quantity:number,asset:AwardAsset){
 if(!awardAssets.includes(asset))throw Error('Choose one of the five USD payment routes.');
 if(!Number.isSafeInteger(quantity)||quantity<1||quantity>1000)throw Error('Choose a whole number from 1 to 1,000 for this preview.');
 const unit=asset==='BTC'||asset==='BTC-onchain'?1000:1_000_000,total=unit*quantity;
 return{unit,total,creator:total/2,prizes:total/4,event:total/4};
}
function campaign(w:ProductWorld,id:string){const c=awardCampaigns(w).find(c=>c.id===id&&c.status==='published-demo');if(!c)throw Error('This campaign is no longer available.');return c;}
export function prepareAwardVote(w:ProductWorld,campaignId:string,quantity:number,asset:AwardAsset,id:string,sourcePostId?:string,now=Date.now(),checkout?:unknown):ProductWorld{
 if(!w.identity.signedIn)throw Error('Sign in before preparing your preview vote.');
 if(!awardAssets.includes(asset))throw Error('Choose an available preview asset.');
 if(w.objects.some(o=>o.id===id))throw Error('This attempt already exists. Open its receipt before trying again.');
 const c=campaign(w,campaignId),amounts=awardTotal(quantity,asset);
 if(awardVotes(w).some(v=>v.campaignId===c.id&&['prepared','unknown'].includes(v.status)))throw Error('Review the same unresolved Props attempt before preparing another.');
 if(sourcePostId&&!w.posts.some(p=>p.id===sourcePostId&&p.author===c.creatorId&&p.audience==='Public'&&mayRead(w,p)))throw Error('The source post is not available for this creator’s campaign.');
 let quote:USDCheckoutQuote|undefined;
 if(checkout!==undefined){quote=requireUSDCheckoutQuote(checkout,awardCheckoutBinding(w,c,quantity,asset),now);if(awardVotes(w).some(v=>v.campaignId===c.id&&['prepared','unknown'].includes(v.status)))throw Error('Review the same unresolved Props attempt before preparing another.');}
 const vote:AwardVote={...(quote?{checkout:quote}:{}),invoice:awardInvoice(quantity,asset,id,now),id,campaignId,nomineeName:c.name,payeeName:c.payeeName||c.name,venueId:c.venueId,creatorId:c.creatorId,campaignVersion:c.version,quantity,asset,...amounts,status:'prepared',proof:'not-issued',createdAt:now,reward:c.reward,category:c.category,season:c.season,sourcePostId,publicSupport:false};
 vote.reporting=bindAwardVoteReport(vote,w.owner);
 return{...w,objects:[...w.objects,{id,owner:w.owner,kind:voteKind,vote}]};
}
export function setAwardPublicSupport(w:ProductWorld,id:string,visible:boolean){
 if(!w.identity.signedIn)throw Error('Sign in before changing public support.');
 const original=awardVotes(w).find(v=>v.id===id);if(!original||(visible&&!awardQualifiedVotes(w).some(v=>v.id===id)))throw Error('Only your own confirmed, verified preview votes can be shown.');
 return{...w,objects:w.objects.map(o=>o.id===id?{...o,vote:{...original,publicSupport:visible}}:o)};
}
export function updateAwardVote(w:ProductWorld,id:string,action:'unknown'|'confirm'|'fail'|'refund'|'verify-proof'|'proof-problem',now=Date.now()):ProductWorld{
 if(!w.identity.signedIn)throw Error('Sign in before changing this preview attempt.');
 const original=awardVotes(w).find(v=>v.id===id);if(!original)throw Error('Your original vote attempt could not be found.');
 const vote={...original,...(original.reporting?{reporting:{...original.reporting}}:{})};
 if(vote.checkout&&['unknown','confirm'].includes(action)){const c=campaign(w,vote.campaignId);requireUSDCheckoutQuote(vote.checkout,awardCheckoutBinding(w,c,vote.quantity,vote.asset),vote.status==='prepared'?now:undefined);}
 // Expiry prevents starting a new attempt; an unknown outcome reconciles the same original.
 if(['prepared','unknown'].includes(vote.status)&&['confirm','unknown'].includes(action)&&(vote.status==='prepared'||vote.invoice)){
  const invoice=vote.invoice,q=invoice?.quote;
  if(!invoice||!q)throw Error('This older attempt needs a new USD review. Its original currency evidence is retained.');
  const expected=awardTotal(vote.quantity,vote.asset);
  if(invoice.currency!=='USD'||invoice.unitMinor!==100||invoice.totalMinor!==vote.quantity*100||invoice.nomineeMinor!==invoice.totalMinor/2||invoice.prizesMinor!==invoice.totalMinor/4||invoice.eventMinor!==invoice.totalMinor/4||q.id!==`preview-quote:${vote.id}`||q.sourceAuthority!=='fictional-preview'||q.provider!=='CRAYS local scenario'||q.asset!==vote.asset||q.amount!==vote.total||vote.total!==expected.total||vote.unit!==expected.unit||vote.creator!==expected.creator||vote.prizes!==expected.prizes||vote.event!==expected.event||q.network!==awardInvoiceNetwork(vote.asset)||q.createdAt!==vote.createdAt||q.fees!=='not-connected'||!Number.isFinite(q.expiresAt)||q.expiresAt!==q.createdAt+5*60_000||(vote.status==='prepared'&&(now<q.createdAt||now>=q.expiresAt)))throw Error(vote.status==='unknown'?'The USD payment preview changed or expired. Keep this unknown original and reconcile its source before another attempt.':'The USD payment preview changed or expired. This prepared local example was not executed; review its source before another attempt.');
 }
 if(action==='verify-proof'||action==='proof-problem'){
  if(vote.status!=='confirmed-demo')throw Error('A confirmed preview payment is required before reviewing the voting proof.');
  if(action==='verify-proof'&&vote.proof==='verified-preview')throw Error('This exact proof is already verified; no second vote is created.');
  const c=campaign(w,vote.campaignId);if(c.version!==vote.campaignVersion)throw Error('The original campaign terms need reconciliation.');
  if(!validAwardVoteReport(vote,w.owner))throw Error('This historical voting proof needs its original qualified payment and campaign evidence.');
  vote.proof=action==='verify-proof'?'verified-preview':'problem';vote.reporting!.proofId=action==='verify-proof'?`preview-award-rgb:${vote.id}`:vote.reporting!.proofId;
 }else if(action==='refund'){
  if(vote.status!=='confirmed-demo')throw Error('Only a confirmed preview vote can be refunded.');vote.status='refunded-demo';
 }else{
  if(!['prepared','unknown'].includes(vote.status))throw Error('This attempt already has a final outcome. It cannot be counted or charged again.');
  const c=campaign(w,vote.campaignId);if(c.version!==vote.campaignVersion)throw Error('Campaign terms changed. This attempt needs review; it has not been counted.');
  vote.status=action==='confirm'?'confirmed-demo':action==='fail'?'failed':'unknown';
 }
 vote.updatedAt=now;
 return{...w,objects:w.objects.map(o=>o.id===id?{...o,vote}:o)};
}
export function saveAwardCampaign(w:ProductWorld,input:Pick<AwardCampaign,'title'|'description'|'category'|'reward'|'target'>&{venueId?:string},publish=false):ProductWorld{
 if(!w.identity.signedIn)throw Error('Sign in before managing your campaign.');
 const profile=ownAwardRecords(w,'creator-profile').find(o=>o.personId===w.owner&&o.status==='published-demo');
 const venue=input.venueId?w.venues.find(v=>v.id===input.venueId):undefined;
 if(input.venueId&&(!venue||!verifiedVenueOperator(w,input.venueId)))throw Error('Verified operator authority is required for this exact Spot. A nomination or paid badge is not authority.');
 if(!venue&&!profile)throw Error('Create and publish your own preview creator page first.');
 if(!awardCategories.includes(input.category as typeof awardCategories[number]))throw Error('Choose an award category.');
 if(!input.title.trim()||!input.description.trim()||!input.reward.trim()||!Number.isSafeInteger(input.target)||input.target<1)throw Error('Add a title, campaign story, specific milestone reward and whole-number target.');
 const id=venue?`award-own-space-${venue.id}`:`award-own-${w.owner}`,existing=awardCampaigns(w).find(c=>c.id===id);
 assertAwardSlot(w,id,kind,Boolean(existing));
 if(existing&&w.objects.some(o=>o.kind===voteKind&&awardRecord(o.vote)&&o.vote.campaignId===id))throw Error('This preview campaign already has vote attempts. Its terms remain fixed so every receipt keeps the original promise.');
 const c:AwardCampaign={...input,id,creatorId:venue?`venue:${venue.id}`:w.owner,venueId:venue?.id,nomineeType:venue?(/hotel/i.test(venue.type)?'Hotel':/restaurant/i.test(venue.type)?'Restaurant':/club/i.test(venue.type)?'Club':'Space'):'Creator',name:venue?.name||String(profile?.name||w.profiles[w.owner]?.name||'Your creator page'),payeeName:(venue?String((w.objects.find(o=>o.kind==='venue-setup'&&o.venueId===venue.id&&o.owner===w.owner)?.config as Record<string,unknown>)?.organisation||venue.name):undefined)||String(profile?.name||w.profiles[w.owner]?.name||'Your creator page'),image:venue?.image||w.profiles[w.owner]?.photo||'chuck.png',baseVotes:0,version:(existing?.version||0)+1,status:publish?'published-demo':'draft',season:'Preview season'};
 const record:Entity={id,owner:w.owner,kind,campaign:c};return{...w,objects:[...w.objects.filter(o=>o.id!==id),record]};
}
export function nominateForAward(w:ProductWorld,name:string,category:string):ProductWorld{
 if(!w.identity.signedIn||!name.trim()||!awardCategories.includes(category as typeof awardCategories[number]))throw Error('Add a nominee name and category while signed in.');
 const duplicate=w.objects.some(o=>o.owner===w.owner&&o.kind==='award-preview-nomination'&&o.name===name.trim()&&o.category===category);if(duplicate)throw Error('This nomination is already saved.');
 return{...w,objects:[...w.objects,{id:crypto.randomUUID(),owner:w.owner,kind:'award-preview-nomination',name:name.trim(),category,status:'submitted-preview'}]};
}

export function canManageAward(w:ProductWorld,c:AwardCampaign){return w.identity.signedIn&&(c.venueId?verifiedVenueOperator(w,c.venueId):c.creatorId===w.owner);}
