import {WebConversationArchiveAction} from './WebConversationArchive';
import {sessionConversationDrafts} from './sessionConversationDrafts.mjs';
import {ConversationPositionContext} from './useSessionMessagingDrafts';
import {LoaderCircle,X} from 'lucide-react';
import {WebConversationDraft} from './WebConversationDraft';
import {isConversationDraftForWorkspace} from './conversationDraft.mjs';
import type {ConversationDraft} from './conversationDraft.mjs';
import {useLayoutEffect,useState,useSyncExternalStore} from 'react';
import type {ReactNode} from 'react';
import type {ConversationForwardingPort} from './conversationForward.mjs';
import {createAdmittedConversationSelection} from './admittedConversationSelection.mjs';
import type {AdmittedHumanMessagingPort,AdmittedConversationSelection} from './admittedConversationSelection.mjs';
import {WebHumanConversationWorkspace} from './WebHumanConversationWorkspace';

export type AdmittedConversationProps={composer?:ConversationDraft;forwarding?:ConversationForwardingPort;port:AdmittedHumanMessagingPort;accountId:string;conversationId:string;title:string;photo?:string;ownPhoto?:string;subtitle:string;authorName:(pubkey:string)=>string;onProfile:()=>void;profileHref?:string;memberProfile?:(pubkey:string)=>{name:string;photo?:string}|undefined;onMemberProfile?:(pubkey:string)=>void;onClose?:()=>void;headerActions?:ReactNode;replyTo?:string|null;onReplyToChange?:(id:string|null)=>void;draft:string;onDraftChange:(value:string)=>void};
/** Original VIF/Spot parent retains navigation and presentation. Only the canonical
 * port resolves rights/identity/transport. No demo fallback after an admission error. */
export function WebAdmittedConversation(props:AdmittedConversationProps){
 const {port,accountId,conversationId}=props;
 const [attempt,setAttempt]=useState(0);const retry=()=>setAttempt(value=>value+1);
 const [owned,setOwned]=useState<{port:AdmittedHumanMessagingPort;accountId:string;conversationId:string;selection:AdmittedConversationSelection|null}|null>(null);
 useLayoutEffect(()=>{
  const lifetime=new AbortController();let selection:AdmittedConversationSelection;
  try{selection=createAdmittedConversationSelection({port,accountId,conversationId,signal:lifetime.signal});}
  catch{setOwned({port,accountId,conversationId,selection:null});return;}
  setOwned({port,accountId,conversationId,selection});void selection.start();
  return()=>{lifetime.abort();};
 },[port,accountId,conversationId,attempt]);
 if(!owned||owned.port!==port||owned.accountId!==accountId||owned.conversationId!==conversationId)return port.accountId===accountId&&!port.signal.aborted?<OpeningConversation {...props}/>:<p className="private-workspace-notice" role="status">This conversation is no longer available.</p>;
 if(!owned.selection)return <div className="private-workspace-notice" role="status">Your conversation could not be opened.<button className="secondary" type="button" onClick={retry}>Retry conversation</button></div>;
 return <ConversationPositionContext.Provider value={sessionConversationDrafts(port).viewFor(conversationId)}><AdmittedReader key={accountId+':'+conversationId} {...props} selection={owned.selection} onRetry={retry}/></ConversationPositionContext.Provider>;
}
function AdmittedReader({selection,onRetry,...props}:AdmittedConversationProps&{selection:AdmittedConversationSelection;onRetry:()=>void}){
 const view=useSyncExternalStore(selection.subscribe,selection.getSnapshot,selection.getSnapshot);
 if(!view.workspace&&(view.state==='loading'||view.state==='idle'))return <OpeningConversation {...props}/>;
 if(!view.workspace)return <div className="private-workspace-notice" role="status">{view.state==='closed'?'This conversation is no longer available.':'Your conversation could not be opened.'}{view.state!=='closed'&&<button className="secondary" type="button" onClick={onRetry}>Retry conversation</button>}</div>;
 let composer:ConversationDraft|undefined;try{composer=props.composer??props.port.getComposer?.(view.workspace);}catch{return <p className="private-workspace-notice" role="status">This conversation’s saved draft could not be opened.</p>;}
 if(composer&&!isConversationDraftForWorkspace(composer,view.workspace)||props.port.getComposer&&!composer)return <p className="private-workspace-notice" role="status">This conversation is unavailable. Check your connection and access.</p>;
 const workspace=view.workspace;
 const render=(controlled:Pick<Parameters<typeof WebHumanConversationWorkspace>[0],'draft'|'onDraftChange'|'replyTo'|'onReplyToChange'|'composerNotice'>)=><WebHumanConversationWorkspace openPrivateNote={props.port.openPrivateNote} forwarding={props.forwarding??props.port.forwarding} workspace={workspace} title={props.title} photo={props.photo} profileHref={props.profileHref} ownPhoto={props.ownPhoto} subtitle={props.subtitle} authorName={props.authorName} memberProfile={props.memberProfile?(pubkey=>props.memberProfile?.(pubkey)??null):undefined} onMemberProfile={props.onMemberProfile} onProfile={props.onProfile} onClose={props.onClose} archiveAction={onMessage=><WebConversationArchiveAction port={props.port} conversationId={props.conversationId} onMessage={onMessage}/>} headerActions={props.headerActions} replyTo={controlled.replyTo} onReplyToChange={controlled.onReplyToChange} draft={controlled.draft} onDraftChange={controlled.onDraftChange} composerNotice={controlled.composerNotice}/>;
 return composer?<WebConversationDraft key={JSON.stringify([composer.binding.accountId,composer.binding.conversationId,composer.binding.membershipId])} controller={composer}>{render}</WebConversationDraft>:render({replyTo:props.replyTo,onReplyToChange:props.onReplyToChange,draft:props.draft,onDraftChange:props.onDraftChange});
}

function OpeningConversation({title,photo,onProfile,onClose}:AdmittedConversationProps){return <section className="web-vifs-reader private-human-workspace" aria-label={'Conversation with '+title} aria-busy="true"><header className="web-vifs-reader-header"><button className="web-vifs-reader-person" type="button" onClick={onProfile}>{photo&&<img src={photo} alt=""/>}<span><strong>{title}</strong><small>Connecting securely…</small></span></button>{onClose&&<button type="button" className="icon-button" aria-label="Close conversation" onClick={onClose}><X size={20} aria-hidden="true"/></button>}</header><div className="private-opening-conversation" role="status"><LoaderCircle size={22} aria-hidden="true"/><span>Opening this conversation…</span></div></section>;}
