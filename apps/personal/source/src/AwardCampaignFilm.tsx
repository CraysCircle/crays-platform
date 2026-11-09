import {useEffect,useRef,useState} from 'react';
import {Play,ArrowClockwise} from '@phosphor-icons/react';
const playbackPositions=new Map<string,number>();
/** Real local MP4 playback. Explicitly an animated demo teaser, never claimed creator footage. */
export function AwardCampaignFilm({src,poster,label,pauseRequested=false,resumeKey=src}:{src:string;poster:string;label:string;pauseRequested?:boolean;resumeKey?:string}){
 const ref=useRef<HTMLVideoElement>(null),[started,setStarted]=useState(false),[failed,setFailed]=useState(false);
 useEffect(()=>{if(pauseRequested)ref.current?.pause();},[pauseRequested]);
 useEffect(()=>{const video=ref.current;return()=>{if(video){playbackPositions.set(resumeKey,video.currentTime);video.pause();}};},[resumeKey]);
 const play=async()=>{setFailed(false);try{await ref.current?.play();setStarted(true);}catch{setFailed(true);}};
 return <figure className="award-campaign-film">
  <div><video ref={ref} src={src} poster={poster} aria-label={label} controls={started} playsInline preload="metadata" onError={()=>setFailed(true)} onPlay={()=>setStarted(true)} onLoadedMetadata={e=>{const video=e.currentTarget,position=playbackPositions.get(resumeKey)||0;if(position>0&&position<video.duration)video.currentTime=position;}} onTimeUpdate={e=>playbackPositions.set(resumeKey,e.currentTarget.currentTime)} controlsList="nodownload"/>
   {!started&&!failed&&<button type="button" aria-label={`Play ${label}`} onClick={play}><Play size={28} weight="fill"/><span>Play demo teaser</span></button>}
  </div><figcaption>{failed?<><span>This teaser could not be loaded.</span><button onClick={()=>{ref.current?.load();void play();}}><ArrowClockwise size={17}/>Try again</button></>:<><strong>12-second animated demo teaser</strong><span>Original illustrative imagery in motion · not filmed creator footage</span></>}</figcaption>
 </figure>;
}
