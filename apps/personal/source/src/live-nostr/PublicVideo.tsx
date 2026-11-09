import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {publicExternalURL} from './public-feed.mjs';
import {usePublicPlayback} from './PublicPlayback';
import type Hls from './vendor/hls/hls.mjs';

type Mode='idle'|'native'|'loading'|'ready';
type Props={url:string;mimeType:string|null;poster?:string;dimensions?:{width:number;height:number};label:string;onError:()=>void;onElement:(node:HTMLVideoElement|null)=>void;ownedVideoURL?:(url:string,mime:string|null)=>string|null};
const isStream=(url:string,mime:string|null)=>{try{return /\.m3u8$/i.test(new URL(url).pathname)||['application/x-mpegurl','application/vnd.apple.mpegurl'].includes(mime||'');}catch{return false;}};
/** HLS needs explicit Load stream. MSE is preferred where supported; the
 * native media path remains a fallback for platforms without HLS.js support.
 * FetchLoader omits credentials/referrers and rejects redirects. Native media
 * uses anonymous CORS and the browser's media/referrer policy; it does not offer
 * the same fetch-level controls, and that platform path needs separate proof.
 * No automatic playback or inference of private media rights. */
export function PublicVideo({url,mimeType,poster,dimensions,label,onError,onElement,ownedVideoURL}:Props){
 // Only the prepared free-stock MP4 path can enter the owned branch. Public
 // URLs keep their existing policy; owned streams/HLS are never inferred.
 const safeURL=ownedVideoURL?(()=>{try{return mimeType==='video/mp4'&&/^(?:\/api\/crays\/personal\/nostr\/public-stock\/[a-f0-9]{64}|\/assets\/crays-demo-v1\/media\/[a-f0-9]{64}\.mp4)$/.test(url)&&ownedVideoURL(url,mimeType)===url?url:null;}catch{return null;}})():publicExternalURL(url),stream=!ownedVideoURL&&!!safeURL&&isStream(safeURL,mimeType);
 const [previewRequested,setPreviewRequested]=useState(false);
 const [measured,setMeasured]=useState<{url:string;width:number;height:number}|null>(null);
 const originalSize=measured?.url===url?measured:dimensions;
 const ratio=originalSize&&originalSize.width>0&&originalSize.height>0?originalSize.width/originalSize.height:16/9;
 const sizing={'--public-video-ratio':String(ratio)} as CSSProperties;
 const video=useRef<HTMLVideoElement|null>(null),player=useRef<Hls|null>(null),generation=useRef(0),active=useRef(false),visible=useRef(true),failed=useRef(false),timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const [appearance,setAppearance]=useState<{url:string|null;stream:boolean;mode:Mode}>({url:safeURL,stream,mode:stream?'idle':'native'});
 const mode=appearance.url===safeURL&&appearance.stream===stream?appearance.mode:stream?'idle':'native';
 const setMode=(next:Mode)=>setAppearance({url:safeURL,stream,mode:next});
 const problem=useRef(onError);problem.current=onError;
 const currentScene=()=>video.current?.closest('[data-flow-current]')?.getAttribute('data-flow-current')!=='false';
 const clearTimer=()=>{if(timer.current!==null){clearTimeout(timer.current);timer.current=null;}};
 const destroy=()=>{clearTimer();const current=player.current;player.current=null;current?.destroy();};
 usePublicPlayback(video,{
  identity:url,
  isAllowed:()=>active.current&&visible.current&&currentScene(),
  onPause:()=>player.current?.stopLoad(),
  onRelease:()=>{generation.current++;destroy();if(stream&&video.current?.isConnected)setMode('idle');},
 });
 useEffect(()=>{
  const element=video.current;if(!element)return;
  active.current=true;failed.current=false;
  if(!safeURL){failed.current=true;problem.current();return()=>{active.current=false;generation.current++;destroy();};}
  const native=!stream;setMode(native?'native':'idle');
  const stop=()=>{element.pause();player.current?.stopLoad();};
  const suspend=()=>{generation.current++;stop();if(!native){failed.current=true;destroy();setMode('idle');}};
  const hidden=()=>{if(document.hidden)suspend();};
  const observer=new IntersectionObserver(entries=>{visible.current=!!entries[0]?.isIntersecting;if(visible.current&&!stream)setPreviewRequested(true);if(!visible.current)suspend();});
  const play=()=>{if(document.hidden||!visible.current||!currentScene()){stop();return;}player.current?.startLoad();};
  const pause=()=>player.current?.stopLoad();
  const scene=element.closest('[data-flow-current]');const sceneObserver=new MutationObserver(()=>{if(!currentScene())suspend();});if(scene)sceneObserver.observe(scene,{attributes:true,attributeFilter:['data-flow-current']});
  observer.observe(element);document.addEventListener('visibilitychange',hidden);element.addEventListener('play',play);element.addEventListener('pause',pause);
  return()=>{active.current=false;generation.current++;observer.disconnect();sceneObserver.disconnect();document.removeEventListener('visibilitychange',hidden);element.removeEventListener('play',play);element.removeEventListener('pause',pause);element.pause();destroy();};
 },[url,stream,safeURL]);
 const fail=()=>{if(!active.current||failed.current)return;failed.current=true;generation.current++;destroy();problem.current();};
 const load=async()=>{
  const element=video.current;if(!element||!safeURL||document.hidden||!visible.current||!currentScene())return;
  const run=++generation.current;failed.current=false;destroy();
  setMode('loading');
  timer.current=setTimeout(()=>{if(active.current&&run===generation.current)fail();},10000);
  try{
   const {default:Hls,FetchLoader}=await import('./vendor/hls/hls.mjs');
   if(!active.current||run!==generation.current||document.hidden||!visible.current||!currentScene())return;
   if(!Hls.isSupported()){if(element.canPlayType('application/vnd.apple.mpegurl')){if(mode==='native')element.load();clearTimer();setMode('native');return;}fail();return;}
   const current=new Hls({loader:FetchLoader,enableWorker:false,autoStartLoad:true,capLevelToPlayerSize:true,maxBufferLength:20,maxMaxBufferLength:40,backBufferLength:5,maxBufferSize:16*1024*1024,debug:false,fetchSetup(context,options){
    const safe=publicExternalURL(context.url);if(!safe)throw new Error('Unsupported media URL');
    return new Request(safe,{...options,credentials:'omit',mode:'cors',referrerPolicy:'no-referrer',redirect:'error'});
   }});
   player.current=current;
   current.on(Hls.Events.MANIFEST_PARSED,()=>{if(active.current&&player.current===current){clearTimer();setMode('ready');}});
   current.on(Hls.Events.ERROR,(_event,data)=>{if(data.fatal&&active.current&&player.current===current)fail();});
   current.attachMedia(element);current.loadSource(safeURL);
  }catch{if(active.current&&run===generation.current)fail();}
 };
 return <><video className="public-original-video" style={sizing} crossOrigin={stream?"anonymous":undefined} ref={node=>{video.current=node;onElement(node);}} controls playsInline preload={!stream&&previewRequested?"metadata":"none"} src={!stream||mode==='native'?safeURL||undefined:undefined} poster={poster?publicExternalURL(poster)||undefined:undefined} aria-label={label} onLoadedMetadata={event=>{const node=event.currentTarget;if(node.videoWidth&&node.videoHeight)setMeasured({url,width:node.videoWidth,height:node.videoHeight});if(!poster&&node.currentTime===0&&Number.isFinite(node.duration)&&node.duration>0){try{node.currentTime=Math.min(.01,node.duration/2);}catch{/* Some streams do not allow seeking before data arrives. */}}}} onError={()=>{if(!stream||mode==='native'||mode==='loading'||mode==='ready')fail();}}/>
  {stream&&<div className="public-stream-controls"><button className="text-action" disabled={mode==='loading'} onClick={()=>void load()}>{mode==='loading'?'Loading stream…':(mode==='ready'||mode==='native')?'Reload stream':'Load stream'}</button><p role="status">{mode==='ready'||mode==='native'?'Stream ready. Use the video controls to play.':mode==='idle'?'Load this stream when you want to watch.':null}</p></div>}
 </>;
}
