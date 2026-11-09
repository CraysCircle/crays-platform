import {resolveCraysMedia} from "./craysMedia";
import type {Post,ProductWorld} from './productModel';
/** Fictional preview originals only. Never opens a relay, enrolls a member or republishes private data. */
export function withShortFormExamples(input:ProductWorld,now=Date.now()):ProductWorld{
 if(input.owner!=='thorben'||!input.settings.demoHistory||input.settings.shortFormExamples==='2026-10-20-v1')return input;
 const w={...input,posts:[...input.posts],settings:{...input.settings,shortFormExamples:'2026-10-20-v1'}};
 for(const [i,v] of w.venues.filter(v=>v.operatorActive&&(v.relayJoined??v.visited)).slice(0,4).entries())for(const format of ['Story','Reel'] as const)for(let part=0;part<2;part++){
  const id=`short-demo-v1-${v.id}-${format.toLowerCase()}-${part}`;if(w.posts.some(p=>p.id===id))continue;
  const video=['lifestyle-garden.mp4','lifestyle-waves.mp4','lifestyle-coast.mp4'][(i+part)%3],isVideo=format==='Reel';
  const p:Post={id,author:`venue:${v.id}`,venueId:v.id,title:format==='Story'?(part?'A moment worth keeping':'A little more life'):(part?'Find your kind of moment':'A different kind of day'),text:`Design example · ${v.name}. Illustrative ${format.toLowerCase()} media; not a live event, offer, current presence or verified recording at this Spot.`,type:isVideo?'video':'image',audience:'Community',status:'accepted',createdAt:now-(i*2+part+1)*60_000,protected:false,mediaAvailable:true,liked:false,saved:false,reposted:false,license:false,replies:[],readPosition:0,image:v.image,publishing:{owner:`venue:${v.id}`,publisherId:`venue:${v.id}`,targetIds:[`space:${v.id}`],revision:1,media:[{id:`${id}-media`,name:`Illustrative ${format} example`,url:isVideo?`/assets/crays/${video}`:resolveCraysMedia(v.image),kind:isVideo?'video':'image',alt:`Illustrative ${format.toLowerCase()} for ${v.name}; fictional preview`,state:'uploaded-preview'}],mediaRights:true,venueTag:v.id,format,receipts:[{targetId:`space:${v.id}`,status:'accepted'}],...(format==='Story'?{storyExpiresAt:now+24*3600_000}:{}),eventId:`preview-event:${id}`}};
  w.posts.push(p);
 }
 return w;
}
