import {useEffect,useRef} from 'react';
import {Carousel} from './mobile';
import {mayRead,type ProductWorld} from './productModel';
import {canReadPaidOriginal,readableOriginalMedia} from './paidContentAccess';
import {awardPostCampaign} from './awardFeed';
import './award.css';

/** The exact attributed original, with the same read/paid-media gates as its source. */
export function AwardPostContent({world,postId,campaignId,asset,pauseRequested=false}:{world:ProductWorld;postId?:string;campaignId:string;asset:(s:string)=>string;pauseRequested?:boolean}){
 const ref=useRef<HTMLElement>(null);
 useEffect(()=>{if(pauseRequested)ref.current?.querySelectorAll('video,audio').forEach(el=>(el as HTMLMediaElement).pause());},[pauseRequested]);
 useEffect(()=>{const el=ref.current;return()=>el?.querySelectorAll('video,audio').forEach(media=>(media as HTMLMediaElement).pause());},[postId]);
 if(!postId)return null;
 const post=world.posts.find(p=>p.id===postId);
 if(!post||!mayRead(world,post)||awardPostCampaign(world,post)?.id!==campaignId)return <p role="status">The original contribution is no longer available here. Voting does not restore access.</p>;
 if(!canReadPaidOriginal(world,post))return <p role="status">This original has separate content-access conditions. Giving Props does not unlock paid content.</p>;
 const media=readableOriginalMedia(world,post);
 return <section className="award-source-post" ref={ref} aria-label="Original creator contribution" data-source-post-id={post.id}>
  <small>{post.publishing?.format||post.type} · ORIGINAL CONTRIBUTION</small>
  {!post.mediaAvailable?<p role="status">The original media is currently unavailable. No replacement footage is shown.</p>:media.length?<Carousel ariaLabel="Original contest media" contentClassName="award-source-carousel-content"><div className="award-source-track">{media.map(m=><figure className="award-source-media" key={m.id}>{m.kind==='video'?<video src={m.url} poster={post.image?asset(post.image):undefined} aria-label={m.alt||post.title} controls playsInline preload="metadata"/>:<img src={m.url} alt={m.alt||post.title} draggable={false}/>}</figure>)}</div></Carousel>:post.image?<figure className="award-source-media"><img src={asset(post.image)} alt={post.alt||post.title} draggable={false}/></figure>:null}
 {post.text.length>200?<details className="award-details"><summary>Read the creator’s story</summary><p>{post.text}</p></details>:<p>{post.text}</p>}
 </section>;
}
