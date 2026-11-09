import {useEffect,useRef,useState} from 'react';
import {Camera,Image,Trash} from '@phosphor-icons/react';
import {BottomSheet,useKeyboard} from './mobile';
import {useVoiceDraftIdentity} from './VoiceDraftControl';
import {chatPhotoExampleUrl} from './chatPhoto';

export function ChatCameraControl({onSelectExample,disabled=false}:{onSelectExample:()=>void;disabled?:boolean}){
 const keyboard=useKeyboard(),identity=useVoiceDraftIdentity(),file=useRef<HTMLInputElement>(null),url=useRef('');
 const [open,setOpen]=useState(false),[preview,setPreview]=useState(''),[error,setError]=useState('');
 const release=()=>{if(url.current)URL.revokeObjectURL(url.current);url.current='';};
 const close=()=>{release();setPreview('');setError('');setOpen(false);keyboard.hide();};
 useEffect(()=>{release();setPreview('');setError('');setOpen(false);return release;},[identity,disabled]);
 return <><button type="button" className="icon-button chat-camera" aria-label="Add a photo" disabled={disabled} onClick={()=>{keyboard.hide();setOpen(true);}}><Camera size={19}/></button>
 <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" aria-label="Choose a local chat photo" hidden onChange={e=>{const selected=e.target.files?.[0];e.target.value='';if(!selected)return;release();setPreview('');setError('');if(!['image/jpeg','image/png','image/webp'].includes(selected.type)||selected.size>10*1024*1024){setError('Choose a JPG, PNG or WebP image up to 10 MB. Nothing was uploaded.');return;}url.current=URL.createObjectURL(selected);setPreview(url.current);}}/>
 <BottomSheet open={open} onOpenChange={next=>{if(!next)close();}} title="A photo for this conversation" snap={0.83}><div className="chat-photo-review">
 <img src={preview||chatPhotoExampleUrl} alt={preview?'Your photo · local preview only':'Bundled CRAYS photo · illustrative example'} onError={()=>{release();setPreview('');setError('This image could not be opened. Nothing was uploaded or sent.');}}/>
 <p>{preview?'Your photo stays in this browser tab. Sending personal photo bytes is not connected in this clickdummy.':'Explore the photo-message flow with this labelled CRAYS example.'}</p>
 {error&&<p role="alert">{error}</p>}
 <button type="button" className="secondary" onClick={()=>file.current?.click()}><Camera size={19}/> Take or choose a photo</button>
 {preview&&<button type="button" className="secondary" onClick={()=>{release();setPreview('');}}><Trash size={19}/> Remove local preview</button>}
 <button type="button" className="primary" onClick={()=>{if(disabled)return;onSelectExample();close();}}><Image size={19}/> Add bundled photo example to draft</button>
 <button type="button" className="text-action" onClick={close}>Cancel & keep my text</button>
 <p>No message is sent here. Review the attachment in your draft, then send separately.</p>
 </div></BottomSheet></>;
}
