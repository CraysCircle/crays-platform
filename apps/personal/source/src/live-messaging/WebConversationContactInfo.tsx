import {useEffect,useId,useRef,useState,useSyncExternalStore,type MouseEvent} from 'react';
import {parsePersonalNavigationPath,personalNavigationHref} from '../webPersonalNavigation';
import {ArrowUpRight,ChevronRight,House,LockKeyhole,MapPin,Pencil,X} from 'lucide-react';
import type {HumanConversationClient} from './humanConversationClient.mjs';
import type {HumanConversationWorkspace} from './humanConversationWorkspace.mjs';
import type {ConversationPrivateNote} from './conversationPrivateNote.mjs';

export type OpenPrivateNote=(workspace:HumanConversationWorkspace)=>Promise<ConversationPrivateNote>;
/** Read from the currently admitted conversation. The note uses the same
 * account-encrypted journal as drafts, never the peer's messaging transport. */
export function WebConversationContactInfo({workspace,client,title,photo,profileHref,onProfile,onClose,openPrivateNote}:{workspace:HumanConversationWorkspace;client:HumanConversationClient;title:string;photo?:string;profileHref?:string;onProfile:()=>void;onClose:()=>void;openPrivateNote?:OpenPrivateNote}){
 const snapshot=useSyncExternalStore(client.subscribe,client.getSnapshot,client.getSnapshot);
 const [note,setNote]=useState<ConversationPrivateNote|null>(null),[problem,setProblem]=useState(''),[attempt,setAttempt]=useState(0);
 const [dirty,setDirty]=useState(false),[saving,setSaving]=useState(false),[leave,setLeave]=useState<(()=>void)|null>(null);
 const close=useRef<HTMLButtonElement>(null),heading=useId();
 useEffect(()=>{close.current?.focus({preventScroll:true});},[]);
 useEffect(()=>{
  let active=true;let controller:ConversationPrivateNote|undefined;
  setNote(null);setProblem('');
  if(openPrivateNote)void openPrivateNote(workspace).then(value=>{if(!active){value.close();return;}controller=value;setNote(value);}).catch(()=>{if(active)setProblem('Your private note could not be opened.');});
  return()=>{active=false;controller?.close();};
 },[workspace,openPrivateNote,attempt]);
 useEffect(()=>{if(!snapshot.available){setNote(previous=>{previous?.close();return null;});setDirty(false);setSaving(false);setLeave(null);}},[snapshot.available]);
 const navigate=(action:()=>void)=>{if(saving)return;if(dirty)setLeave(()=>action);else action();};
 const info=snapshot.available?snapshot.contactInfo:null;
 // The original parent supplies a public canonical route, never an identity or grant.
 const profileRoute=typeof profileHref==='string'&&profileHref.startsWith('/#')?parsePersonalNavigationPath(profileHref.slice(2)):undefined;
 const profileLink=profileRoute?.name==='memberProfile'&&personalNavigationHref(profileRoute)===profileHref?profileHref:undefined;
 const mayNavigate=()=>!workspace.signal.aborted&&client.getSnapshot().available&&!saving;
 const nativeLink=(event:MouseEvent<HTMLAnchorElement>,action:()=>void)=>{if(!mayNavigate()){event.preventDefault();return;}if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();navigate(action);};
 const auxiliary=(event:MouseEvent<HTMLAnchorElement>)=>{if(!mayNavigate())event.preventDefault();};
 const spotLink=(spot:{id:string;name:string;city:string},home=false)=><a className="private-contact-spot" aria-disabled={saving||!snapshot.available} href={'/#/personal/spots/'+encodeURIComponent(spot.id)} onAuxClick={auxiliary} onClick={event=>nativeLink(event,()=>{onClose();window.location.hash='/personal/spots/'+encodeURIComponent(spot.id);})}><span className="private-contact-spot-icon">{home?<House size={18} aria-hidden="true"/>:<MapPin size={18} aria-hidden="true"/>}</span><span><strong>{spot.name}</strong><small>{spot.city}</small></span><ChevronRight size={17} aria-hidden="true"/></a>;
 return <aside className="private-contact-info" aria-labelledby={heading} onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();leave?setLeave(null):navigate(onClose);}}}>
 <header><h2 id={heading}>Contact info</h2><button ref={close} type="button" className="icon-button" aria-label="Close contact info" disabled={saving} onClick={()=>navigate(onClose)}><X size={20} aria-hidden="true"/></button></header>
 <div className="private-contact-scroll">
 <div className="private-contact-person">{photo&&<img src={photo} alt=""/>}<h3>{title}</h3>{profileLink&&snapshot.available&&!saving?<a className="private-contact-profile" href={profileLink} onAuxClick={auxiliary} onClick={event=>nativeLink(event,onProfile)}>View profile <ArrowUpRight size={16} aria-hidden="true"/></a>:<button type="button" className="private-contact-profile" disabled={!snapshot.available||saving} onClick={()=>{if(mayNavigate())navigate(onProfile);}}>View profile <ArrowUpRight size={16} aria-hidden="true"/></button>}</div>
 {!snapshot.available?<p role="status">This conversation is no longer available.</p>:<>
 <section className="private-contact-section"><h3>How you connected</h3><p className="private-contact-muted">Your first meeting hasn’t been recorded.</p><p className="private-contact-private"><LockKeyhole size={14} aria-hidden="true"/> Your note · only you</p>
 {note?<PrivateNoteEditor key={attempt} controller={note} onDirty={setDirty} onSaving={setSaving}/>:openPrivateNote?<p role="status">{problem||'Opening your private note…'}</p>:<p className="private-contact-muted">Private notes are unavailable for this account.</p>}
 {problem&&<button type="button" onClick={()=>setAttempt(value=>value+1)}>Retry private note</button>}
 </section>
 {info?<><section className="private-contact-section"><h3>Shared Spots <span>{info.sharedSpots.length}</span></h3>{info.sharedSpots.length?info.sharedSpots.map(spot=><div key={spot.id}>{spotLink(spot)}</div>):<p className="private-contact-muted">No shared Spots are available.</p>}</section><section className="private-contact-section"><h3>Home Spot</h3>{spotLink(info.homeSpot,true)}<p className="private-contact-muted">Where this person first joined CRAYS.</p></section></>:<p className="private-contact-muted">Shared Spots and connection details are unavailable.</p>}
 </>}
 </div>
 {leave&&<div className="private-contact-leave" role="alertdialog" aria-label="Discard private note changes"><strong>Discard your unsaved note?</strong><p>Your saved note will stay unchanged.</p><div><button type="button" onClick={()=>setLeave(null)}>Keep editing</button><button type="button" onClick={()=>{const action=leave;setLeave(null);setDirty(false);action();}}>Discard changes</button></div></div>}
 </aside>;
}

function PrivateNoteEditor({controller,onDirty,onSaving}:{controller:ConversationPrivateNote;onDirty:(dirty:boolean)=>void;onSaving:(saving:boolean)=>void}){
 const state=useSyncExternalStore(controller.subscribe,controller.getSnapshot,controller.getSnapshot);
 const [editing,setEditing]=useState(false),[text,setText]=useState(state.note),[problem,setProblem]=useState(''),[saved,setSaved]=useState(false);
 const input=useRef<HTMLTextAreaElement>(null);
 useEffect(()=>{onDirty(editing&&text!==state.note);},[editing,text,state.note,onDirty]);
 useEffect(()=>{onSaving(state.saving);},[state.saving,onSaving]);
 useEffect(()=>{if(editing)input.current?.focus({preventScroll:true});},[editing]);
 const cancel=()=>{setText(state.note);setEditing(false);setProblem('');};
 const save=async()=>{try{setProblem('');await controller.save(text);setEditing(false);setSaved(true);}catch(error){setProblem(error instanceof Error?error.message:'Your note could not be saved.');}};
 const reload=async()=>{try{setProblem('');await controller.reload();setText(controller.getSnapshot().note);setSaved(false);}catch{setProblem('Your note could not be reloaded. Try again.');}};
 if(!state.available)return <p role="status">Your private note is no longer available.</p>;
 return <div className="private-contact-note">{editing?<><label><span>Private note</span><textarea ref={input} maxLength={2000} rows={4} value={text} disabled={state.saving} onChange={event=>{setText(event.target.value);setSaved(false);}}/></label><small>{text.length}/2,000</small><div className="private-contact-note-actions"><button type="button" disabled={state.saving} onClick={cancel}>Cancel</button><button type="button" disabled={state.saving||text===state.note} onClick={()=>void save()}>{state.saving?'Saving…':'Save note'}</button></div></>:<>{state.note&&<p className="private-contact-note-text">{state.note}</p>}<button type="button" className="private-contact-edit" onClick={()=>{setText(state.note);setEditing(true);setSaved(false);}}><Pencil size={14} aria-hidden="true"/>{state.note?'Edit private note':'Add a private note'}</button>{saved&&<span role="status" className="private-contact-muted">Saved privately</span>}</>}{(problem||state.problem)&&<div role="alert"><p>{problem||state.problem}</p><button type="button" disabled={state.saving} onClick={()=>void reload()}>Reload saved note</button></div>}</div>;
}
