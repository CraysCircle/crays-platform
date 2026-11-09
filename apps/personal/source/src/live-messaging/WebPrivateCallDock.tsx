import {useEffect,useLayoutEffect,useMemo,useRef,useState,useSyncExternalStore} from 'react';
import type {PrivateCallController,PrivateCallSnapshot} from './privateCallController.mjs';
import './human-messaging.css';

const active=(state:PrivateCallSnapshot['state'])=>['outgoing','ringing','acquiring','connecting','connected','disconnected'].includes(state);
function CallIcon({video=false}:{video?:boolean}){return <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{video?<><rect x="3" y="6" width="12" height="12" rx="2"/><path d="m15 10 6-3v10l-6-3"/></>:<path d="M8 3 4 5c-2 6 9 17 15 15l2-4-5-3-2 3c-3-1-5-3-6-6l3-2Z"/>}</svg>;}
export function WebPrivateCallButtons({controller,title}:{controller:PrivateCallController;title:string}){
 const view=useSyncExternalStore(controller.subscribe,controller.getSnapshot,controller.getSnapshot),disabled=active(view.state)||view.state==='unavailable'||view.state==='closed';
 return <><button className="icon-button" type="button" aria-label={'Voice call '+title} disabled={disabled} onClick={()=>void controller.initiate('voice').catch(()=>{})}><CallIcon/></button><button className="icon-button" type="button" aria-label={'Video call '+title} disabled={disabled} onClick={()=>void controller.initiate('video').catch(()=>{})}><CallIcon video/></button></>;
}

/** Keep this dock mounted in the original conversation while its compact view is used.
 * The canonical parent closes its controller on conversation/account permission loss.
 * This renderer never captures devices or synthesizes signaling/connected state. */
export function WebPrivateCallDock({controller,title,photo}:{controller:PrivateCallController;title:string;photo?:string}){
 const view=useSyncExternalStore(controller.subscribe,controller.getSnapshot,controller.getSnapshot),[expanded,setExpanded]=useState(true),[playbackBlocked,setPlaybackBlocked]=useState(false),[feedback,setFeedback]=useState('');
 const audio=useRef<HTMLAudioElement>(null),remoteVideo=useRef<HTMLVideoElement>(null),localVideo=useRef<HTMLVideoElement>(null);
 const generation=useRef(0),playbackAttempt=useRef(0);
 const audioStream=useMemo(()=>new MediaStream(),[controller,view.callId]),videoStream=useMemo(()=>new MediaStream(),[controller,view.callId]);
 useLayoutEffect(()=>{generation.current++;playbackAttempt.current++;setExpanded(true);setFeedback('');setPlaybackBlocked(false);return()=>{generation.current++;playbackAttempt.current++;};},[controller,view.callId]);
 useEffect(()=>{
  const target=audio.current;if(!target)return;const tracks=view.remoteTracks.filter(track=>track.kind==='audio'&&track.readyState==='live');
  for(const track of audioStream.getTracks())if(!tracks.includes(track))audioStream.removeTrack(track);for(const track of tracks)if(!audioStream.getTracks().includes(track))audioStream.addTrack(track);
  if(target.srcObject!==audioStream)target.srcObject=audioStream;
  const own=generation.current,attempt=++playbackAttempt.current;
  const current=()=>own===generation.current&&attempt===playbackAttempt.current&&audio.current===target&&target.srcObject===audioStream;
  if(tracks.length)void target.play().then(()=>{if(current())setPlaybackBlocked(false);}).catch(()=>{if(current())setPlaybackBlocked(true);});
  return()=>{playbackAttempt.current++;if(target.srcObject===audioStream)target.srcObject=null;};
 },[audioStream,view.remoteTracks]);
 useEffect(()=>{
  const target=remoteVideo.current;if(!target)return;const tracks=view.remoteTracks.filter(track=>track.kind==='video'&&track.readyState==='live');for(const track of videoStream.getTracks())if(!tracks.includes(track))videoStream.removeTrack(track);for(const track of tracks)if(!videoStream.getTracks().includes(track))videoStream.addTrack(track);target.srcObject=videoStream;if(tracks.length)void target.play().catch(()=>{});return()=>{if(target.srcObject===videoStream)target.srcObject=null;};
 },[videoStream,view.remoteTracks,expanded]);
 useEffect(()=>{const target=localVideo.current;if(!target)return;target.srcObject=view.localStream;if(view.localStream)void target.play().catch(()=>{});return()=>{target.srcObject=null;};},[view.localStream,expanded]);
 const running=active(view.state),visible=running||['ended','failed','unavailable'].includes(view.state)&&view.callId!==null;
 const labels:Record<PrivateCallSnapshot['state'],string>={idle:'Ready when you are.',outgoing:'Calling…',ringing:'Incoming '+(view.kind==='video'?'video':'voice')+' call',acquiring:'Waiting for device permission…',connecting:'Connecting…',connected:'Connected',disconnected:'Connection interrupted.',ended:'Call ended.',failed:'The call could not be connected.',unavailable:'This call is no longer available.',closed:'Call ended.'};
 const run=async(action:()=>Promise<void>|void)=>{const own=generation.current;setFeedback('');try{await action();}catch{if(own===generation.current)setFeedback('This action could not be completed. Check your connection and call access.');}};
 const playAudio=async()=>{const target=audio.current;if(!target)return;const own=generation.current,attempt=++playbackAttempt.current,stream=target.srcObject;
  const current=()=>own===generation.current&&attempt===playbackAttempt.current&&audio.current===target&&target.srcObject===stream;
  setFeedback('');try{await target.play();if(current())setPlaybackBlocked(false);}catch{if(current()){setPlaybackBlocked(true);setFeedback('Audio could not be started. Try again.');}}
 };
 if(!visible)return <audio ref={audio} aria-hidden="true"/>;
 return <section className="private-call-dock" aria-label={'Call with '+title} data-private-call-state={view.state}>
 <audio ref={audio} autoPlay aria-hidden="true"/>
 <header className="private-call-heading"><div>{photo&&<img src={photo} alt=""/>}<span><strong>{title}</strong><small role="status" aria-live="polite">{labels[view.state]}</small></span></div>{running&&<button type="button" className="secondary" onClick={()=>setExpanded(value=>!value)}>{expanded?'Back to conversation':'Show call'}</button>}</header>
 {expanded&&view.kind==='video'&&running&&<div className="private-call-video-stage"><video ref={remoteVideo} muted autoPlay playsInline aria-label={'Video from '+title}/>{!view.remoteTracks.some(track=>track.kind==='video')&&<p>{labels[view.state]}</p>}{view.localStream&&<video ref={localVideo} muted autoPlay playsInline aria-label="Your camera" className="private-call-self-view"/>}</div>}
 {playbackBlocked&&running&&<button type="button" className="secondary" onClick={()=>void playAudio()}>Play call audio</button>}
 {running&&<div className="private-call-actions">{view.state==='ringing'?<><button type="button" className="private-call-answer" onClick={()=>void run(()=>controller.accept())}>Answer</button><button type="button" className="private-call-end" onClick={()=>void run(()=>controller.hangup())}>Decline</button></>:<>{view.localStream&&<button type="button" className="secondary" aria-pressed={view.muted} onClick={()=>void run(()=>controller.setMuted(!view.muted))}>{view.muted?'Unmute':'Mute'}</button>}{view.kind==='video'&&view.localStream&&<button type="button" className="secondary" aria-pressed={view.cameraOff} onClick={()=>void run(()=>controller.setCameraOff(!view.cameraOff))}>{view.cameraOff?'Turn camera on':'Turn camera off'}</button>}<button type="button" className="private-call-end" onClick={()=>void run(()=>controller.hangup())}>End call</button></>}</div>}
 {(feedback||view.problem)&&<p role="status">{feedback||view.problem}</p>}<small className="private-call-privacy">Chuck is not included in this call.</small>
 </section>;
}
