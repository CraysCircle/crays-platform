import {createContext,useContext,useEffect,useRef,useState} from 'react';
import {Microphone,Stop,Check,X} from '@phosphor-icons/react';
import {BottomSheet,KeyboardTextarea,useKeyboard} from './mobile';
import './voice-draft.css';
const VoiceIdentity=createContext('');
export const VoiceDraftScope=VoiceIdentity.Provider;
export function useVoiceDraftIdentity(){return useContext(VoiceIdentity);}

/** Local recording only. No ASR provider, automatic upload or send is implied. */
export function VoiceDraftControl({label,value,onChange,compact=false,subtle=false,maxLength}:{label:string;value:string;onChange:(value:string)=>void;compact?:boolean;subtle?:boolean;maxLength?:number}){
 const identity=useContext(VoiceIdentity);
 const opener=useRef<HTMLButtonElement|null>(null);
 const keyboard=useKeyboard();
 const [open,setOpen]=useState(false),[phase,setPhase]=useState<'ready'|'requesting'|'recording'|'review'>('ready');
 const [text,setText]=useState(''),[audio,setAudio]=useState(''),[error,setError]=useState(''),[example,setExample]=useState(false);
 const recorder=useRef<MediaRecorder|null>(null),stream=useRef<MediaStream|null>(null),url=useRef(''),generation=useRef(0),timer=useRef<ReturnType<typeof setTimeout>|null>(null),base=useRef(''),openedIdentity=useRef('');
 function release(){
  generation.current++;
  if(timer.current)clearTimeout(timer.current);
  timer.current=null;
  const current=recorder.current;recorder.current=null;
  if(current&&current.state!=='inactive')current.stop();
  stream.current?.getTracks().forEach(track=>track.stop());stream.current=null;
  if(url.current)URL.revokeObjectURL(url.current);url.current='';
 }
 useEffect(()=>{release();setOpen(false);setAudio('');setText('');setError('');setPhase('ready');},[identity]);
 useEffect(()=>()=>release(),[]);
 useEffect(()=>{
  if(!open)return;
  const background=()=>{if(document.visibilityState==='hidden'){release();setAudio('');setPhase('ready');setError('Recording stopped because the app moved into the background. Your written draft is unchanged.');}};
  const leave=()=>release();
  document.addEventListener('visibilitychange',background);window.addEventListener('pagehide',leave);
  return ()=>{document.removeEventListener('visibilitychange',background);window.removeEventListener('pagehide',leave);};
 },[open]);
 function close(){release();keyboard.hide();setOpen(false);setAudio('');setText('');setError('');setPhase('ready');}
 function begin(){release();base.current=value;openedIdentity.current=identity;setText('');setAudio('');setError('');setExample(false);setPhase('ready');keyboard.hide();setOpen(true);}
 async function record(){
  setError('');
  if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined'){
   setError('Recording is unavailable in this browser or insecure preview. You can keep typing, or explore the labelled example.');return;
  }
  const attempt=++generation.current;setPhase('requesting');
  try{
   const input=await navigator.mediaDevices.getUserMedia({audio:true});
   if(attempt!==generation.current){input.getTracks().forEach(track=>track.stop());return;}
   stream.current=input;
   const capture=new MediaRecorder(input),chunks:Blob[]=[];recorder.current=capture;
   capture.ondataavailable=event=>{if(attempt===generation.current&&event.data.size)chunks.push(event.data);};
   capture.onerror=()=>{if(attempt!==generation.current)return;release();setAudio('');setPhase('ready');setError('Recording failed. Your written draft is unchanged.');};
   capture.onstop=()=>{
    if(attempt!==generation.current)return;
    if(timer.current)clearTimeout(timer.current);timer.current=null;
    input.getTracks().forEach(track=>track.stop());stream.current=null;recorder.current=null;
    const blob=new Blob(chunks,{type:capture.mimeType});
    if(!blob.size){setPhase('ready');setError('No audio was captured. Your written draft is unchanged.');return;}
    url.current=URL.createObjectURL(blob);setAudio(url.current);setPhase('review');
   };
   capture.start();setPhase('recording');
   timer.current=setTimeout(()=>{if(attempt===generation.current&&capture.state==='recording')capture.stop();},60000);
  }catch{
   if(attempt!==generation.current)return;release();setPhase('ready');setError('Microphone access was declined or is unavailable. You can continue typing; your draft is unchanged.');
  }
 }
 const changed=value!==base.current||identity!==openedIdentity.current;
 const combined=[base.current,text.trim()].filter(Boolean).join('\n');
 const tooLong=typeof maxLength==='number'&&maxLength>=0&&combined.length>maxLength;
 // Never offer dictation for credentials even if a future form uses a textarea.
 if(/nsec|private key|password|secret|access token|recovery phrase|seed phrase|card number|cvv/i.test(label))return null;
 return <><button ref={opener} type="button" className={`voice-draft-trigger${compact?' voice-draft-compact':''}${subtle?' voice-draft-subtle':''}`} aria-label={`Speak: ${label}`} onClick={begin}><Microphone size={19}/>{!compact&&<span>{label.includes('Chuck')?'Say it to Chuck':'Use voice'}</span>}</button>
 <BottomSheet onRestoreFocus={()=>{const node=opener.current;if(openedIdentity.current===identity&&node?.isConnected&&node.getClientRects().length&&!node.closest('[data-flow-current="false"]'))node.focus({preventScroll:true});}} open={open} onOpenChange={next=>{if(!next)close();}} title="Say it your way" description={label} snap={0.8}>
 <div className="voice-draft-sheet">
 <p className="voice-draft-context">Your words. Your review.</p>
 <p>Audio stays in this browser until you close this panel. It is not sent to Chuck or a transcription service.</p>
 <p role="status" aria-live="polite">{phase==='requesting'?'Waiting for microphone permission…':phase==='recording'?'Recording · microphone on · stops after 60 seconds':phase==='review'?(example?'Example transcript · no audio recorded':'Recording stopped · microphone off'):'Microphone off'}</p>
 {(phase==='ready'||phase==='requesting')&&<button type="button" className="voice-draft-primary" disabled={phase==='requesting'} onClick={record}><Microphone size={21}/> Start recording</button>}
 {phase==='recording'&&<button type="button" className="voice-draft-stop" onClick={()=>{if(recorder.current?.state==='recording')recorder.current.stop();}}><Stop size={21}/> Stop & review</button>}
 {error&&<p role="alert">{error}</p>}
 {audio&&<audio aria-label="Listen to your local recording" controls src={audio}/>}
 {phase==='review'&&<><p>{example?'This editable example demonstrates the review step.':'Automatic transcription is not connected in this clickdummy. Listen to your recording and enter or correct the words below.'}</p><label className="voice-draft-label">Review your words<KeyboardTextarea aria-label="Review your words" rows={4} maxLength={12000} value={text} onChange={event=>setText(event.target.value)} onBlur={()=>keyboard.hide()}/></label>
 {changed&&<p role="alert">The original field changed while this panel was open. Close and reopen it before adding words.</p>}
 {tooLong&&<p role="alert">This field allows {maxLength} characters. Shorten your transcript before adding it; your existing text is kept.</p>}
 <button type="button" className="voice-draft-primary" disabled={!text.trim()||changed||tooLong} onClick={()=>{if(changed||tooLong||!text.trim())return;onChange(combined);close();}}><Check size={20}/> Add to my draft</button><p>Existing text is kept. Adding words does not send, publish, book or approve anything.</p></>}
 {phase==='ready'&&<button type="button" className="voice-draft-example" onClick={()=>{setExample(true);setText('Please help me review my options before I decide.');setPhase('review');}}>Explore an example transcript</button>}
 <button type="button" className="voice-draft-cancel" onClick={close}><X size={19}/> Cancel & keep my draft</button>
 </div></BottomSheet></>;
}
