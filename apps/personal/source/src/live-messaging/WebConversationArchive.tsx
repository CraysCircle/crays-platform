import {useState} from 'react';
import {Archive,ArrowLeft,ArrowUpRight} from 'lucide-react';
import type {AdmittedHumanMessagingPort} from './admittedConversationSelection.mjs';
import {useSessionInboxState} from './useSessionInbox';

export function WebConversationArchiveAction({port,conversationId,onMessage}:{port:AdmittedHumanMessagingPort;conversationId:string;onMessage?:(message:string)=>void}){
 const inbox=useSessionInboxState(port.inbox),archived=inbox.preferences[conversationId]?.archived===true;
 const [busy,setBusy]=useState(false);
 return <button type="button" disabled={busy||port.signal.aborted||!port.setArchived} aria-busy={busy} onClick={async event=>{
  const details=event.currentTarget.closest('details'),opener=details?.querySelector('summary');details?.removeAttribute('open');if(busy)return;setBusy(true);
  try{await port.setArchived!(conversationId,!archived);if(!port.signal.aborted)onMessage?.(archived?'Conversation returned to your inbox.':'Conversation archived. You can find it in Archived.');}
  catch{if(!port.signal.aborted)onMessage?.('The archive setting could not be saved. Open the menu to try again.');}
  finally{if(!port.signal.aborted)setBusy(false);if(opener instanceof HTMLElement&&opener.isConnected)opener.focus({preventScroll:true});}
 }}>{busy?'Saving…':archived?'Unarchive conversation':'Archive conversation'}</button>;
}

export type ArchivedPerson={id:string;name:string;photo?:string};
/** Same canonical VIF originals and existing Archived route, never a second
 * conversation, world-message preview or permission from a profile label. */
export function WebArchivedConversations({port,people,onOpen,onBack}:{port:AdmittedHumanMessagingPort;people:readonly ArchivedPerson[];onOpen:(id:string)=>void;onBack:()=>void}){
 const inbox=useSessionInboxState(port.inbox),[problem,setProblem]=useState(''),[busy,setBusy]=useState<string|null>(null);
 const profiles=new Map(people.map(person=>['person:'+person.id,person]));
 const ids=Object.keys(inbox.preferences).filter(id=>inbox.preferences[id].archived&&profiles.has(id)).sort((a,b)=>(inbox.rows[b]?.createdAt||0)-(inbox.rows[a]?.createdAt||0));
 return <section className="private-archived-conversations" aria-label="Archived conversations"><header><button type="button" className="text-action" onClick={onBack}><ArrowLeft size={18}/> Back to VIFs</button><h1>Archived</h1><p>Your conversations stay here until you bring them back. Messages and connections are kept.</p></header>
 {['loading','idle'].includes(inbox.state)&&<p role="status">Updating your archived conversations…</p>}
 {['partial','offline','unavailable'].includes(inbox.state)&&<p className="private-archive-status" role="status">Some conversations could not be updated. <button type="button" onClick={()=>void port.refreshInbox?.()}>Retry</button></p>}
 {problem&&<p role="status">{problem}</p>}
 <div className="private-archived-list">{ids.map(id=>{const person=profiles.get(id)!,row=inbox.rows[id];return <div className="private-archived-row" key={id}><button type="button" className="private-archived-open" onClick={()=>onOpen(person.id)} aria-label={'Open archived conversation with '+person.name}>{person.photo?<img className="avatar" src={person.photo} alt=""/>:<span className="private-archive-initials" aria-hidden="true">{person.name.slice(0,1)}</span>}<span><strong>{person.name}</strong><small>{row?.preview||'Open conversation'}</small></span><ArrowUpRight size={19}/></button><button type="button" className="text-action" disabled={busy!==null||!port.setArchived||port.signal.aborted} onClick={async()=>{setBusy(id);setProblem('');try{await port.setArchived!(id,false);}catch{setProblem('This conversation could not be restored. Try again.');}finally{if(!port.signal.aborted)setBusy(null);}}}>{busy===id?'Saving…':'Unarchive'}</button></div>;})}</div>
 {!ids.length&&inbox.state==='ready'&&<div className="private-archive-empty"><Archive size={30}/><h2>No archived conversations</h2><p>Use a conversation’s menu to archive it.</p></div>}
 </section>;
}
