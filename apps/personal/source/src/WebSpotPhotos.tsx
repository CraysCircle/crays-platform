import {useEffect,useId,useRef,useState,type MouseEvent} from 'react';
import {ArrowLeft,ArrowRight,ArrowsOut,ArrowsIn,ChatCircle,ImageSquare,MapPin,SquaresFour,X} from '@phosphor-icons/react';
import {personalNavigationHref} from './webPersonalNavigation';
import './web-spot-photos.css';

type Props={name:string;venueId:string;city:string;image?:string;onBack:()=>void;onSpot:()=>void;onSpots:()=>void;onChuck:()=>void};
/** Original Venue image only. Presentation does not aggregate posts, private media or grant access. */
export default function WebSpotPhotos(p:Props){
 const [failed,setFailed]=useState(false),[attempt,setAttempt]=useState(0),[opened,setOpened]=useState(false),[fullscreen,setFullscreen]=useState(false),[notice,setNotice]=useState('');
 const root=useRef<HTMLElement>(null),dialog=useRef<HTMLDialogElement>(null),surface=useRef<HTMLDivElement>(null),opener=useRef<HTMLButtonElement>(null),retry=useRef<HTMLButtonElement>(null),heading=useRef<HTMLHeadingElement>(null),closeButton=useRef<HTMLButtonElement>(null),fullscreenRequest=useRef(0),id=useId();
 const count=p.image?1:0;
 const base=typeof window!=='undefined'&&window.location.pathname==='/__qa__/personal'?'/__qa__/personal':'/';
 const spotHref=personalNavigationHref({name:'spot',id:p.venueId},base),spotsHref=personalNavigationHref({name:'personalSpots'},base);
 const navigate=(event:MouseEvent<HTMLAnchorElement>,callback:()=>void)=>{if(event.button===0&&!event.metaKey&&!event.ctrlKey&&!event.altKey&&!event.shiftKey){event.preventDefault();callback();}};
 useEffect(()=>{
  const element=dialog.current,target=surface.current;if(!element||!target)return;
  const changed=()=>setFullscreen(document.fullscreenElement===target);
  document.addEventListener('fullscreenchange',changed);
  const scene=root.current?.closest('[data-flow-current]');
  const observer=new MutationObserver(()=>{if(scene?.getAttribute('data-flow-current')!=='true'&&element.open){fullscreenRequest.current++;if(document.fullscreenElement===target)void document.exitFullscreen().catch(()=>{});element.close();}});
  if(scene)observer.observe(scene,{attributes:true,attributeFilter:['data-flow-current']});
  return()=>{fullscreenRequest.current++;observer.disconnect();document.removeEventListener('fullscreenchange',changed);if(document.fullscreenElement===target)void document.exitFullscreen().catch(()=>{});if(element.open)element.close();};
 },[]);
 const open=()=>{if(!p.image||failed)return;setNotice('');dialog.current?.showModal();setOpened(true);closeButton.current?.focus();};
 const close=()=>{fullscreenRequest.current++;const element=dialog.current,target=surface.current;if(!element)return;
  // Complete the browser's fullscreen focus transition before the modal restores its opener.
  if(target&&document.fullscreenElement===target)void document.exitFullscreen().catch(()=>{}).finally(()=>{if(element.open)element.close();});
  else element.close();
 };
 const toggleFullscreen=async()=>{
  const element=dialog.current,target=surface.current;if(!element?.open||!target)return;const request=++fullscreenRequest.current;setNotice('');
  try{if(document.fullscreenElement===target)await document.exitFullscreen();else if(document.fullscreenEnabled&&target.requestFullscreen){await target.requestFullscreen();if((request!==fullscreenRequest.current||!element.open||!element.isConnected)&&document.fullscreenElement===target)await document.exitFullscreen();}else setNotice('Full screen is not available in this browser. You can still view the whole image here.');}
  catch{if(element.open&&request===fullscreenRequest.current)setNotice('Full screen could not be opened. You can still view the whole image here.');}
 };
 return <article ref={root} className="web-spot-gallery">
  <nav className="web-spot-gallery-path" aria-label="Page path"><a href={spotsHref} onClick={e=>navigate(e,p.onSpots)}>Your Spots</a><span aria-hidden="true">/</span><a href={spotHref} onClick={e=>navigate(e,p.onSpot)}>{p.name}</a><span aria-hidden="true">/</span><span aria-current="page">Photos</span></nav>
  <header className="web-spot-gallery-heading"><div><h1 ref={heading} tabIndex={-1}>Photos</h1><span>{count} {count===1?'photo':'photos'}</span></div><div><button type="button" onClick={p.onChuck}><ChatCircle size={20}/>Ask Chuck</button><button type="button" onClick={p.onBack}><ArrowLeft size={20}/>Back</button></div></header>
  <div className="web-spot-gallery-workspace">
   <section aria-label="Spot photographs"><h2 className="web-spot-gallery-collection"><SquaresFour size={20}/>All photos</h2>
    {p.image?<div className="web-spot-gallery-grid"><figure>
     {failed?<div className="web-spot-gallery-unavailable" role="status"><ImageSquare size={32}/><h3>This photo could not be loaded.</h3><p>Try again to view the image for this Spot.</p><button ref={retry} type="button" onClick={()=>{setAttempt(v=>v+1);setFailed(false);}}>Try again</button></div>:<button ref={opener} type="button" className="web-spot-gallery-tile" onClick={open} aria-label={'View photo of '+p.name}><img key={attempt} src={p.image} alt={'Illustrative view of '+p.name} onError={()=>setFailed(true)}/><span><ArrowsOut size={20}/>View photo</span></button>}
     <figcaption><strong>{p.name}</strong><span>Illustrative image.</span></figcaption>
    </figure></div>:<div className="web-spot-gallery-empty" role="status"><ImageSquare size={32}/><h3>No photos yet.</h3><p>Photos will appear here when this Spot provides them.</p><a href={spotHref} onClick={e=>navigate(e,p.onSpot)}>Return to Spot<ArrowRight size={20}/></a></div>}
   </section>
   <aside className="web-spot-gallery-context" aria-label="About this Spot"><h2>{p.name}</h2><p className="web-spot-gallery-location"><MapPin size={20}/>{p.city}</p><div><h3>A closer look at your Spot.</h3><p>{count?'Illustrative image for this Spot.':'Discover the Spot while its photo gallery is being prepared.'}</p></div><a href={spotHref} onClick={e=>navigate(e,p.onSpot)}>Return to Spot<ArrowRight size={20}/></a></aside>
  </div>
  <dialog ref={dialog} className="web-spot-gallery-viewer" aria-labelledby={id+'-title'} aria-describedby={id+'-description'} onCancel={e=>{e.preventDefault();close();}} onClose={()=>{fullscreenRequest.current++;setOpened(false);setNotice('');requestAnimationFrame(()=>{const current=root.current;if(!current?.closest('[data-flow-current="true"]')||current.closest('[inert],[aria-hidden="true"]'))return;const target=opener.current||retry.current||heading.current;if(target?.isConnected&&target.getClientRects().length)target.focus({preventScroll:true});});}}>
   <div ref={surface} className="web-spot-gallery-viewer-surface">
   <header><div><h2 id={id+'-title'}>{p.name}</h2><p id={id+'-description'}>Illustrative image · {count?1:0} of {count}</p></div><div className="web-spot-gallery-viewer-actions"><button type="button" onClick={()=>void toggleFullscreen()} aria-label={fullscreen?'Exit full screen':'Full screen'}>{fullscreen?<ArrowsIn size={24}/>:<ArrowsOut size={24}/>}<span>{fullscreen?'Exit full screen':'Full screen'}</span></button><button ref={closeButton} type="button" onClick={close} aria-label="Close photo viewer"><X size={24}/><span>Close</span></button></div></header>
   <div className="web-spot-gallery-stage">{opened&&p.image&&(!failed?<img src={p.image} alt={'Illustrative view of '+p.name} onError={()=>setFailed(true)}/>:<p role="status">This photo could not be loaded. Close the viewer and try again.</p>)}</div>
   <footer>{p.image&&!failed&&<img src={p.image} alt=""/>}<div><strong>{p.name}</strong><p>Illustrative image for this Spot.</p></div></footer>
   {notice&&<p className="web-spot-gallery-notice" role="status">{notice}</p>}
   </div>
  </dialog>
 </article>;
}
