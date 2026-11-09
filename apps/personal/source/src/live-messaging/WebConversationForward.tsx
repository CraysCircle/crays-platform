import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import type {HumanConversationClient} from './humanConversationClient.mjs';
import type {ConversationForwardingPort,ForwardDraft,ForwardReview,ForwardSource,ForwardTarget} from './conversationForward.mjs';
import {admittedForwardTargets,reviewConversationForward,stageConversationForward} from './conversationForward.mjs';
import {FORWARD_CATALOG_PAGE_SIZE} from './conversationCatalogLimits.mjs';

/** Existing selected-text review: one admitted destination, draft conflict review,
 * then its ORIGINAL composer. No automatic publication or copied media keys. */
export function WebConversationForward({client,source,port,review,onBack}:{client:HumanConversationClient;source:ForwardSource;port:ConversationForwardingPort;review:ForwardReview;onBack:()=>void}){
 const snapshot=useSyncExternalStore(client.subscribe,client.getSnapshot,client.getSnapshot);
 const destinations=useSyncExternalStore(port.subscribe,port.getSnapshot,port.getSnapshot);
 const [loadingDestinations,setLoadingDestinations]=useState(!!port.refresh&&!destinations.available);
 const [query,setQuery]=useState(''),[chosen,setChosen]=useState<{target:ForwardTarget;draft:ForwardDraft}|null>(null),[replace,setReplace]=useState(false),[feedback,setFeedback]=useState('');
 const [visibleCount,setVisibleCount]=useState<number>(FORWARD_CATALOG_PAGE_SIZE),[preparing,setPreparing]=useState<string|null>(null),preparation=useRef<AbortController|null>(null);
 const back=useRef<HTMLButtonElement>(null);
 useEffect(()=>{back.current?.focus({preventScroll:true});},[]);
 useEffect(()=>{if(!port.refresh||destinations.available)return;let mounted=true;setLoadingDestinations(true);void port.refresh().catch(()=>{if(mounted)setFeedback('Your permitted conversations are unavailable. Try again.');}).finally(()=>{if(mounted)setLoadingDestinations(false);});return()=>{mounted=false;};},[port]);
 useEffect(()=>{const cancel=()=>preparation.current?.abort();port.signal.addEventListener('abort',cancel);return()=>{cancel();port.signal.removeEventListener('abort',cancel);};},[port]);
 const current=reviewConversationForward({...source,snapshot,selectedIds:review.selectedIds});
 const readable=snapshot.available&&!port.signal.aborted&&!!current&&current.fingerprint===review.fingerprint&&current.text===review.text;
 const targets=admittedForwardTargets(port,source.accountId,source.conversationId);
 const matching=targets.filter(row=>row.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
 const choose=async(row:ForwardTarget)=>{
  preparation.current?.abort();const operation=new AbortController();preparation.current=operation;setChosen(null);setReplace(false);setFeedback('');setPreparing(row.conversationId);
  try{
   const draft=port.prepareDraft?await port.prepareDraft(row.conversationId,row.version,operation.signal):port.getDraft(row.conversationId,row.version);
   if(operation.signal.aborted||preparation.current!==operation)return;
   if(port.signal.aborted||!source.isCurrent()||!admittedForwardTargets(port,source.accountId,source.conversationId).some(current=>current.conversationId===row.conversationId&&current.version===row.version))throw Error('Destination changed.');
   setChosen({target:row,draft});
  }catch{if(!operation.signal.aborted&&preparation.current===operation){setChosen(null);setFeedback('This destination could not be opened. Choose it again to retry.');}}
  finally{if(!operation.signal.aborted&&preparation.current===operation)setPreparing(null);}
 };
 const target=chosen&&targets.find(row=>row.conversationId===chosen.target.conversationId&&row.version===chosen.target.version);
 let draft:ForwardDraft|null=null;
 try{if(target)draft=port.getDraft(target.conversationId,target.version);}catch{/* Changed authority is shown without stale draft content. */}
 const sameDraft=!!draft&&!!chosen&&draft.version===chosen.draft.version&&draft.text===chosen.draft.text&&(draft.replyTo??null)===(chosen.draft.replyTo??null)&&!!draft.hasAttachments===!!chosen.draft.hasAttachments;
 const conflict=!!draft&&(!!draft.text.length||!!draft.replyTo);
 const stage=()=>{try{
  if(!chosen)throw Error('Choose one permitted conversation.');
  const staged=stageConversationForward({client,source,port,review,target:chosen.target,expectedDraft:chosen.draft,replace});
  port.open(staged.conversationId);
 }catch(error){setReplace(false);setFeedback(error instanceof Error?error.message:'Your text copy could not be prepared. Nothing was sent.');}};
 return <aside className="private-conversation-export private-conversation-forward" aria-label="Forward selected text review" onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();onBack();}}}>
  <header><h2>Forward selected text</h2><button ref={back} type="button" aria-label="Back to selected messages" onClick={onBack}>×</button></header>
  <div className="web-vif-contact-scroll">{readable?<>
   <p>Choose one conversation. Review the text before sending.</p>
   <section><h3>Text to forward</h3><p>Text copy · attachments not included</p><pre className="private-forward-text">{review.text}</pre></section>
   <section><h3>Choose one conversation</h3><label className="private-forward-search">Search conversations<input type="search" value={query} onChange={event=>{setQuery(event.target.value);setVisibleCount(FORWARD_CATALOG_PAGE_SIZE);}} placeholder="Search conversations…"/></label>
   {matching.slice(0,visibleCount).map(row=><label className="private-forward-target" key={row.conversationId}><input type="radio" name="private-forward-target" aria-label={'Forward to '+row.title} checked={!!target&&sameDraft&&target.conversationId===row.conversationId} onChange={()=>void choose(row)}/><span><strong>{row.title}</strong><small>{row.kind==='person'?'Private conversation':row.kind==='spot'?'Spot conversation':'Circle conversation'}</small></span></label>)}
   {matching.length>visibleCount&&<button type="button" className="web-vif-export-cancel" onClick={()=>setVisibleCount(count=>count+FORWARD_CATALOG_PAGE_SIZE)}>Show more conversations</button>}
   {!destinations.available?<div role="status"><p>{loadingDestinations?'Loading permitted conversations…':'Your permitted conversations could not be loaded.'}</p>{port.refresh&&<button type="button" disabled={loadingDestinations} onClick={()=>{setFeedback('');setLoadingDestinations(true);void port.refresh!().catch(()=>setFeedback('Your permitted conversations are still unavailable. Try again.')).finally(()=>setLoadingDestinations(false));}}>Retry conversations</button>}</div>:!matching.length&&<p>No permitted conversations match your search.</p>}
   {preparing&&<p role="status">Opening the selected conversation…</p>}
   {chosen&&(!target||!sameDraft)&&<p role="status">The destination or draft changed. Choose it again to review the current version.</p>}</section>
   {target&&sameDraft&&draft&&<section>{conflict&&<><h3>Existing unsent text</h3><pre className="private-forward-text">{draft.text||'An existing reply is selected.'}</pre><label className="web-vif-export-choice"><input type="checkbox" checked={replace} onChange={event=>setReplace(event.target.checked)}/><span>Replace my existing unsent text and reply selection. Any attachment stays unchanged.</span></label></>}{draft.hasAttachments&&<p>Your existing attachment stays in the destination composer. Review it before sending.</p>}</section>}
   <button type="button" className="web-vif-export-download" disabled={!target||!sameDraft||conflict&&!replace} onClick={stage}>Review in conversation</button>
  </>:<p role="status">The original messages or permissions changed. Return and select the current originals again.</p>}
  <button type="button" className="web-vif-export-cancel" onClick={onBack}>Cancel</button>{feedback&&<p role="status">{feedback}</p>}
  <p>This creates an unsent text copy in one conversation you can already message. No original media or purchased content is forwarded. Nothing sends automatically.</p></div>
 </aside>;
}
