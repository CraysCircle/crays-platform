import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {PaperPlaneTilt,X} from '@phosphor-icons/react';
import {KeyboardTextarea,useKeyboard,useKeyboardInsets} from './mobile';
import {VoiceDraftControl,useVoiceDraftIdentity} from './VoiceDraftControl';
import {ChatCameraControl} from './ChatCameraControl';
import {chatPhotoExampleName,chatPhotoExampleUrl} from './chatPhoto';

/** Shared fixed text/voice composer. Opening or editing never submits. */
export function MessageComposer({value,onChange,onSend,label,sendLabel,disabled,navigationReserved,maxLength,photoDraft,onPhotoChange}:{value:string;onChange:(text:string)=>void;onSend:(attachment?:string)=>boolean|void;label:string;sendLabel:string;disabled:boolean;navigationReserved:boolean;maxLength?:number;photoDraft?:string;onPhotoChange?:(value:string)=>void}){
 const ref=useRef<HTMLFormElement>(null),keyboard=useKeyboard();
 const [localPhoto,setLocalPhoto]=useState(''),identity=useVoiceDraftIdentity();
 const photo=onPhotoChange?(photoDraft===chatPhotoExampleName?photoDraft:''):localPhoto;
 const setPhoto=(value:string)=>onPhotoChange?onPhotoChange(value):setLocalPhoto(value);
 useEffect(()=>{if(!onPhotoChange)setLocalPhoto('');},[identity,onPhotoChange]);
 const {bottomInset,isKeyboardVisible}=useKeyboardInsets();
 useLayoutEffect(()=>{
  const form=ref.current,field=form?.querySelector('textarea');if(!form||!field)return;
  const resize=()=>{field.style.height='0px';field.style.height=`${Math.min(field.scrollHeight,132)}px`;};
  const measure=()=>form.parentElement?.style.setProperty('--chat-composer-height',`${form.getBoundingClientRect().height}px`);
  resize();measure();const observer=new ResizeObserver(()=>{resize();measure();});observer.observe(form);
  return()=>observer.disconnect();
 },[value,photo]);
 return <form ref={ref} className="chat-composer-wrap" style={{bottom:!isKeyboardVisible&&navigationReserved?0:bottomInset}} onSubmit={e=>{e.preventDefault();if(disabled||(!value.trim()&&!photo))return;keyboard.hide();if(onSend(photo||undefined)===true)setPhoto('');}}>
  {photo&&<div className="chat-photo-draft"><img src={chatPhotoExampleUrl} alt="Photo example"/><span>Photo example · local preview</span><button type="button" className="icon-button" aria-label="Remove photo from draft" onClick={()=>setPhoto('')}><X size={18}/></button></div>}
  <div className="chat-composer">
   <KeyboardTextarea rows={1} maxLength={maxLength} aria-label={label} placeholder={`${label}…`} value={value} disabled={disabled} onChange={e=>onChange(e.target.value)} onBlur={()=>keyboard.hide()} onKeyDown={event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.nativeEvent.isComposing&&event.nativeEvent.keyCode!==229){event.preventDefault();event.currentTarget.form?.requestSubmit();}}}/>
   <div className="chat-actions"><ChatCameraControl disabled={disabled} onSelectExample={()=>setPhoto(chatPhotoExampleName)}/>{!disabled&&<VoiceDraftControl compact subtle maxLength={maxLength} label={label} value={value} onChange={onChange}/>}
   {(value.trim()||photo)&&<button type="submit" className="icon-button chat-send" aria-label={sendLabel} disabled={disabled||(!value.trim()&&!photo)}><PaperPlaneTilt size={20}/></button>}</div>
  </div>
 </form>;
}
