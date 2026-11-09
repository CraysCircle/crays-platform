import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import type {ReactNode} from 'react';
import type {ConversationDraft,ConversationDraftSnapshot} from './conversationDraft.mjs';

/** Original parent lends its admitted controller. No local competing draft map,
 * plaintext persistence, send method or inferred membership is introduced. */
export function WebConversationDraft({controller,children}:{controller:ConversationDraft;children:(value:{draft:string;replyTo:string|null;onDraftChange:(text:string)=>void;onReplyToChange:(id:string|null)=>void;composerNotice:ReactNode})=>ReactNode}){
 const view=useSyncExternalStore(controller.subscribe,controller.getSnapshot,controller.getSnapshot);
 const [review,setReview]=useState<ConversationDraftSnapshot|null>(null),[approved,setApproved]=useState<ConversationDraftSnapshot|null>(null),[feedback,setFeedback]=useState(''),[busy,setBusy]=useState(false);
 const lifetime=useRef(0),reviewButton=useRef<HTMLButtonElement>(null);
 useEffect(()=>{lifetime.current++;return()=>{lifetime.current++;};},[controller]);
 const current=!!review&&review.version===view.version&&review.conflict===view.conflict&&!!view.conflict&&view.available;
 const edit=(change:{text?:string;replyTo?:string|null})=>{try{const value=controller.getSnapshot();controller.set({text:change.text??value.text,replyTo:change.replyTo===undefined?value.replyTo:change.replyTo});setFeedback('');}catch{setFeedback('Your draft could not be updated. Check this conversation’s access.');}};
 const action=async(kind:'retry'|'keep'|'saved')=>{
  if(busy||kind!=='retry'&&(!current||approved!==review))return;
  const captured=lifetime.current;setBusy(true);setFeedback('');
  try{if(kind==='retry')await controller.retry();else if(kind==='keep')await controller.keepCurrent(review!.version,review!.conflict!);else await controller.useSaved(review!.version,review!.conflict!);if(captured===lifetime.current){setReview(null);setApproved(null);}}
  catch{if(captured===lifetime.current){setApproved(null);setFeedback('The draft changed or could not be saved. Review it again before continuing.');}}
  finally{if(captured===lifetime.current)setBusy(false);}
 };
 if(!view.available)return <p className="private-workspace-notice" role="status">This conversation is unavailable. Check your connection and access.</p>;
 const notice=<>{view.conflict?<div className="private-media-feedback private-draft-notice" role="status"><p>A different draft was saved in another window. Your current text has been kept.</p><button ref={reviewButton} type="button" className="secondary" onClick={()=>{setReview(view);setApproved(null);setFeedback('');}}>Review draft conflict</button></div>:view.problem?<div className="private-media-feedback private-draft-notice" role="status"><p>Your draft could not be saved. Keep this conversation open.</p><button type="button" className="secondary" disabled={busy} onClick={()=>void action('retry')}>Retry draft save</button></div>:null}
 {review&&view.conflict&&<section className="private-media-feedback private-draft-review" aria-label="Review draft conflict" onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();setReview(null);setApproved(null);reviewButton.current?.focus({preventScroll:true});}}}>
 <h3>Choose which draft to keep</h3><p>Choose one version to save, including its selected reply. Nothing will be sent.</p>
 <div className="private-draft-versions"><div><strong>Your current draft</strong><p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',maxHeight:100,overflowY:'auto'}}>{view.text||'Empty draft'}</p>{view.replyTo&&<p>Includes a selected reply.</p>}
 </div><div><strong>Saved in the other window</strong><p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',maxHeight:100,overflowY:'auto'}}>{view.conflict.text||'Empty draft'}</p>{view.conflict.replyTo&&<p>Includes a selected reply.</p>}</div></div>
 {!current&&<p role="status">The draft changed while you were reviewing it. Open the review again.</p>}
 <label><input type="checkbox" checked={current&&approved===review} disabled={!current||busy} onChange={event=>setApproved(event.target.checked?review:null)}/>I have reviewed both drafts.</label>
 <div className="private-draft-actions"><button type="button" className="secondary" disabled={!current||approved!==review||busy} onClick={()=>void action('keep')}>Keep my current draft</button><button type="button" className="secondary" disabled={!current||approved!==review||busy} onClick={()=>void action('saved')}>Use the saved draft</button><button type="button" className="secondary" disabled={busy} onClick={()=>{setReview(null);setApproved(null);reviewButton.current?.focus({preventScroll:true});}}>Cancel</button></div>
 </section>}{feedback&&<p className="private-media-feedback private-draft-notice" role="status">{feedback}</p>}</>;
 return <>{children({draft:view.text,replyTo:view.replyTo,onDraftChange:text=>edit({text}),onReplyToChange:replyTo=>edit({replyTo}),composerNotice:notice})}</>;
}
