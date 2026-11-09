import {useEffect,useRef,useState} from 'react';
import {Carousel} from '../mobile';
import {PublicVideo} from './PublicVideo';
import {usePublicPlayback} from './PublicPlayback';
import type {PublicMedia} from './public-feed.mjs';

type OwnedVideoURL=(url:string,mime:string|null)=>string|null;
function Attachment({media,onExpand,ownedVideoURL}:{media:PublicMedia;onExpand?:()=>void;ownedVideoURL?:OwnedVideoURL}){
 const urls=[media.url,...media.fallbackURLs];
 const [position,setPosition]=useState(0),[failed,setFailed]=useState(false);
 const element=useRef<HTMLMediaElement|null>(null);
 usePublicPlayback(element,{enabled:media.kind==='audio',identity:urls[position]});
 useEffect(()=>{
  const player=element.current;if(!player||media.kind!=='audio')return;
  const observer=new IntersectionObserver(entries=>{if(!entries[0]?.isIntersecting)player.pause();});
  const hidden=()=>{if(document.hidden)player.pause();};
  const scene=player.closest('[data-flow-current]');const sceneObserver=new MutationObserver(()=>{if(scene?.getAttribute('data-flow-current')==='false')player.pause();});if(scene)sceneObserver.observe(scene,{attributes:true,attributeFilter:['data-flow-current']});
  observer.observe(player);document.addEventListener('visibilitychange',hidden);
  return()=>{observer.disconnect();sceneObserver.disconnect();document.removeEventListener('visibilitychange',hidden);player.pause();};
 },[media.kind,position]);
 const error=()=>{if(position+1<urls.length)setPosition(n=>n+1);else setFailed(true);};
 return <figure>{failed?<p role="status">This {media.kind} is currently unavailable. <a href={media.url} target="_blank" rel="noopener noreferrer">Open original media</a></p>:
  media.kind==='image'?onExpand?<button className="nostr-image-open" onClick={onExpand} aria-label={media.alt||'Enlarge original image'}><img src={urls[position]} alt={media.alt||''} draggable={false} loading="lazy" referrerPolicy="no-referrer" onError={error}/></button>:<img src={urls[position]} alt={media.alt||''} draggable={false} referrerPolicy="no-referrer" onError={error}/>:
  media.kind==='audio'?<audio ref={node=>{element.current=node;}} controls preload="none" src={urls[position]} aria-label={media.alt||'Original audio'} onError={error}/>:
  <PublicVideo ownedVideoURL={ownedVideoURL} key={urls[position]} url={urls[position]} mimeType={position===0?media.mimeType:media.fallbackMimeTypes?.[urls[position]]??null} poster={media.previewURL||undefined} dimensions={position===0?media.declaredDimensions:media.fallbackDeclaredDimensions?.[urls[position]]||undefined} label={media.alt||'Original video'} onElement={node=>{element.current=node;}} onError={error}/>}</figure>;
}

export function PublicMediaGallery({media,feedPreview=false,ownedVideoURL}:{media:readonly PublicMedia[];feedPreview?:boolean;ownedVideoURL?:OwnedVideoURL}){
 const [selected,setSelected]=useState<number|null>(null),[zoomed,setZoomed]=useState(false);
 const dialog=useRef<HTMLDialogElement>(null),track=useRef<HTMLDivElement>(null);
 const change=(next:number)=>{dialog.current?.querySelectorAll('video,audio').forEach(player=>(player as HTMLMediaElement).pause());setZoomed(false);setSelected((next+media.length)%media.length);};
 useEffect(()=>{
  const modal=dialog.current;if(!modal)return;
  if(selected!==null){track.current?.querySelectorAll('video,audio').forEach(player=>(player as HTMLMediaElement).pause());if(!modal.open)modal.showModal();}
  else if(modal.open)modal.close();
 },[selected]);
 if(!media.length)return null;
 const current=selected===null?null:media[selected];
 const photoGrid=feedPreview&&media.length>1&&media.every(item=>item.kind==='image');
 return <>{photoGrid?<div ref={track} className={`public-photo-grid public-photo-grid-${Math.min(media.length,4)}`} aria-label={`${media.length} original photos`}>
  {media.slice(0,4).map((item,index)=><div className="public-photo-cell" key={item.url}><Attachment ownedVideoURL={ownedVideoURL} media={item} onExpand={()=>{setZoomed(false);setSelected(index);}}/>{index===Math.min(media.length,4)-1&&media.length>4&&<button className="public-photo-more" onClick={()=>{setZoomed(false);setSelected(4);}}>View all {media.length} photos</button>}</div>)}
 </div>:<Carousel className="publishing-media-carousel" ariaLabel="Post media"><div ref={track} className={`publishing-media-track ${media.length===1?'single-media':''}`}>
  {media.map((item,index)=><div className="nostr-media-item" key={item.url}><Attachment ownedVideoURL={ownedVideoURL} media={item} onExpand={()=>{setZoomed(false);setSelected(index);}}/>{media.length>1&&<span className="nostr-media-count">{index+1} / {media.length}</span>}{item.kind!=='image'&&<button className="text-action" onClick={()=>{setZoomed(false);setSelected(index);}}>Open {item.kind} viewer</button>}</div>)}
 </div></Carousel>}
 <dialog ref={dialog} className="nostr-media-dialog" aria-label="Original media viewer" onClose={()=>{setSelected(null);setZoomed(false);}} onKeyDown={event=>{if(event.target instanceof HTMLVideoElement||event.target instanceof HTMLAudioElement)return;if(event.key==='ArrowLeft'&&media.length>1){event.preventDefault();change((selected??0)-1);}if(event.key==='ArrowRight'&&media.length>1){event.preventDefault();change((selected??0)+1);}}}>
  <div className="nostr-media-toolbar"><span role="status">{selected===null?'':`${selected+1} / ${media.length}`}</span>{current?.kind==='image'&&<button onClick={()=>setZoomed(value=>!value)} aria-pressed={zoomed}>{zoomed?'Fit image':'Zoom in'}</button>}<button autoFocus onClick={()=>setSelected(null)}>Close</button></div>
  {current&&<div className={`nostr-media-stage ${zoomed?'is-zoomed':''}`}><Attachment ownedVideoURL={ownedVideoURL} key={current.url} media={current}/></div>}
  {media.length>1&&<div className="nostr-media-toolbar"><button onClick={()=>change((selected??0)-1)}>Previous media</button><button onClick={()=>change((selected??0)+1)}>Next media</button></div>}
 </dialog></>;
}
