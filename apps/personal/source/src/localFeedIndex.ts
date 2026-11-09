import type {Post,ProductWorld} from './productModel';
import {localCatalog,localSpot,localProfileId,localModelPost,registerLocalOriginals,type LocalPost} from './localSocialData';
import {relaySources} from './nostrSources';
import {localFeedPins} from './localFeedIndexPins';
export type FeedIndexRow={id:string;spotId:string;authorId:string;createdAt:number;title:string;text:string;type:Post['type'];format:string;storyExpiresAt?:number;contestId:string|null;mediaCount:number};
export type LocalFeedIndex={rows:FeedIndexRow[];models:Post[];byId:Map<string,FeedIndexRow>};
let pending:Promise<LocalFeedIndex>|undefined,storiesPending:Promise<LocalPost[]>|undefined;
const reads=new Map<string,Promise<LocalPost[]>>();
const digest=async(b:Uint8Array)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b as Uint8Array<ArrayBuffer>)),v=>v.toString(16).padStart(2,'0')).join('');
async function pinnedGzip<T>(file:string,pin:{bytes:number;sha256:string},expandedLimit:number):Promise<T>{
 const r=await fetch('/assets/crays-feed-index-v1/'+file,{credentials:'omit',redirect:'error'});if(!r.ok)throw Error('Your selected content could not be loaded. Try again.');
 const bytes=new Uint8Array(await r.arrayBuffer());if(bytes.length!==pin.bytes||await digest(bytes)!==pin.sha256)throw Error('This content snapshot could not be verified.');
 const body=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));const decoded=new Uint8Array(await new Response(body).arrayBuffer());if(decoded.length>expandedLimit)throw Error('This content snapshot is too large.');return JSON.parse(new TextDecoder().decode(decoded));
}
export function indexedPost(row:FeedIndexRow):Post{return {id:row.id,author:row.authorId,title:row.title,text:row.text,fullText:row.text,type:row.type,audience:'Public',venueId:row.spotId,status:'accepted',liked:false,saved:false,reposted:false,protected:false,license:false,mediaAvailable:row.mediaCount>0,createdAt:row.createdAt,replies:[],readPosition:0,approvedOriginal:row.id,relay:row.spotId,publishing:{owner:row.authorId,publisherId:row.authorId,...(row.contestId?{awardCampaignId:row.contestId}:{}),targetIds:['space:'+row.spotId],receipts:[{targetId:'space:'+row.spotId,status:'accepted'}],revision:1,media:[],mediaRights:true,venueTag:row.spotId,format:row.format==='Story'?'Story':row.format==='Reel'?'Reel':'Post',...(row.storyExpiresAt?{storyExpiresAt:row.storyExpiresAt}:{})}};}
export function loadLocalFeedIndex(){return pending??=(pinnedGzip<{schema:string;rows:FeedIndexRow[]}>('index.json.gz',localFeedPins.index,11000000).then(data=>{
 if(data.schema!=='crays.public-local-feed-index.v1'||data.rows.length!==13820)throw Error('This content index is incomplete.');const c=localCatalog();if(!c)throw Error('Load your communities first.');const actors=new Set([...c.people,...c.spots].map(p=>p.id)),ids=new Set<string>();
 for(const r of data.rows){if(!/^[a-f0-9]{64}$/.test(r.id)||ids.has(r.id)||c.originalSpots[r.id]!==r.spotId||!localSpot(r.spotId)||!actors.has(r.authorId)||!Number.isSafeInteger(r.createdAt))throw Error('This content index has an invalid reference.');ids.add(r.id);}
 return {rows:data.rows,models:data.rows.filter(r=>r.format!=='Story').map(indexedPost),byId:new Map(data.rows.map(r=>[r.id,r]))};
 }).catch(e=>{pending=undefined;throw e;}));}
/** A selected source can never add a visit, membership, consent or identity. */
export function permittedFeedSpots(w:ProductWorld,sourceIds:readonly string[]):Set<string>{
 if(w.owner!=='thorben'||!w.identity.signedIn)return new Set();const selected=new Set(sourceIds);const permitted=relaySources(w).filter(s=>selected.has(s.id)&&!s.removed&&s.read&&s.feed&&s.category==='Space').map(s=>s.venueId);
 return new Set(permitted.filter((id):id is string=>!!id&&!!localSpot(id)&&w.venues.filter(v=>v.id===id).length===1&&w.venues.some(v=>v.id===id&&v.operatorActive&&v.visited===true&&(v.relayJoined??v.visited)===true)));
}
export function indexedActorAllowed(w:ProductWorld,author:string){const people=w.people.filter(p=>p.id===author);return people.length===1&&!people[0].blocked&&!people[0].blockedByOther;}
export function takeMatchingPosts(rows:readonly Post[],predicate:(p:Post)=>boolean|undefined,limit:number){const result:Post[]=[];const seen=new Set<string>();for(const p of rows){const originalKey=p.publishing?.eventId||p.id;if(seen.has(originalKey))continue;seen.add(originalKey);if(predicate(p)){result.push(p);if(result.length>=limit)break;}}return result;}
export function loadLocalFeedStories(){return storiesPending??=(pinnedGzip<LocalPost[]>('stories.json.gz',localFeedPins.stories,4000000).then(rows=>{if(rows.length!==1200||rows.some(r=>localCatalog()?.originalSpots[r.view.original.id]!==r.view.spotId||!localProfileId(r.view.author.pubkey)))throw Error('These Stories could not be verified.');return rows;}).catch(e=>{storiesPending=undefined;throw e;}));}
/** Fetch originals only. Never append an entire Spot catalogue or its 100 offers to the feed world. */
export function loadIndexedOriginals(spotId:string){if(!reads.has(spotId))reads.set(spotId,(async()=>{
 const pin=localFeedPins.spots[spotId as keyof typeof localFeedPins.spots];if(!pin)throw Error('Choose an available community.');const response=await fetch('/assets/crays-demo-v5/spots/'+encodeURIComponent(spotId)+'.json',{credentials:'omit',redirect:'error'});if(!response.ok)throw Error('This post could not be loaded.');const b=new Uint8Array(await response.arrayBuffer());if(await digest(b)!==pin)throw Error('This original snapshot could not be verified.');const data=JSON.parse(new TextDecoder().decode(b)) as {spotId:string;posts:LocalPost[]};if(data.spotId!==spotId||data.posts.some(r=>r.view.spotId!==spotId||localCatalog()?.originalSpots[r.view.original.id]!==spotId))throw Error('This original belongs to another community.');registerLocalOriginals(data.posts);return data.posts;
 })().catch(e=>{reads.delete(spotId);throw e;}));return reads.get(spotId)!;}
export function appendVisibleOriginals(w:ProductWorld,rows:readonly LocalPost[],sourceIds:readonly string[]):ProductWorld{const permitted=permittedFeedSpots(w,sourceIds),ids=new Set(w.posts.map(p=>p.id));const posts=rows.filter(r=>permitted.has(r.view.spotId)&&indexedActorAllowed(w,localProfileId(r.view.author.pubkey)||'')&&!ids.has(r.view.original.id)).map(localModelPost);registerLocalOriginals(rows.filter(r=>posts.some(p=>p.id===r.view.original.id)));return posts.length?{...w,posts:[...w.posts,...posts]}:w;}
