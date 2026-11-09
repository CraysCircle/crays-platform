import '../web-nostr-post.css';
import {createContext,useContext,useEffect,useMemo,useState,useSyncExternalStore} from 'react';
import {PUBLIC_WRITE_RELAYS,createPublicActionController,publicPublicationDraftIdentity,publicReviewDraftIdentity,publicExternalURL,type PublicActionController,type PublicCommandAction,type PublicPublicationDraft,type VerifiedPublicOriginal,type PublicRelay} from './public-feed.mjs';

// Only the separately admitted CRAYS session wrapper may supply these ports.
// No window extension, localStorage identity, inferred Core person or default signer.
// Session owner retains controllers across action views. It must reconcile its
// protected receipt journal after reload before enabling new writes.
type ActionBoundaryValue={scope:string;controllerFor:(slot:string)=>PublicActionController}|null;
export const PublicActionBoundary=createContext<ActionBoundaryValue>(null);

type Props={publication?:PublicPublicationDraft;action:PublicCommandAction;target?:VerifiedPublicOriginal;relays:readonly PublicRelay[];onClose:()=>void};
export function PublicActionReview(props:Props){
 const boundary=useContext(PublicActionBoundary);
 const slot=useMemo(()=>props.publication?'publish:'+publicPublicationDraftIdentity(props.publication):`${props.action}:${props.target?.event.id||'new'}`,[props.publication,props.action,props.target?.event.id]);
 return <ScopedActionReview key={`${boundary?.scope||'public-read-only'}:${slot}`} {...props} relays={props.relays.filter(relay=>PUBLIC_WRITE_RELAYS.includes(relay))} boundary={boundary} slot={slot}/>;
}
function ScopedActionReview({action,target,publication,relays,onClose,boundary,slot}:Props&{boundary:ActionBoundaryValue;slot:string}){
 const controller=useMemo(()=>boundary?boundary.controllerFor(slot):createPublicActionController(),[boundary,slot]);
 const relayKey=JSON.stringify(relays),targetId=target?.event.id||'';
 const [content,setContent]=useState(''),[localProblem,setLocalProblem]=useState('');
 useEffect(()=>{
  const scope=boundary?.scope||'public-read-only';controller.setContext({scope,writeRelays:[...relays]});
  return()=>{if(controller.getSnapshot().phase!=='disposed')controller.setContext({scope,writeRelays:[]});};
 },[controller,boundary?.scope,relayKey]);
 // Session owner retains external controllers and pending receipts. The default
 // controller has no ports/timers/sockets and is garbage-collected after unsubscribe.
 // Disposing it in effect cleanup would break React StrictMode's effect replay.
 const state=useSyncExternalStore(controller.subscribe,controller.getSnapshot,controller.getSnapshot);
 const review=state.review;
 const pending=controller.getOutstanding();
 let reviewMatches=true;
 if(review){try{reviewMatches=review.action===action&&(publication?publicReviewDraftIdentity(review)===publicPublicationDraftIdentity(publication):!target||review.unsignedEvent.tags.some(tag=>tag[0]==='e'&&tag[1]===target.event.id));}catch{reviewMatches=false;}}

 useEffect(()=>{if(review&&(review.action==='reply'||review.action==='publish'))setContent(review.unsignedEvent.content);},[review?.reviewedEventFingerprint]);
 const busy=['checking','signing','publishing'].includes(state.phase);
 const uncertain=['unknown','partial','signed'].includes(state.phase);
 const editable=!review&&!busy&&!uncertain;
 const name=action==='reply'?'Reply':action==='publish'?'New public post':action==='like'?'Like':'Repost';
 const prepare=async()=>{setLocalProblem('');try{await controller.prepare({action,target,...(publication?{publication}:{content:action==='reply'||action==='publish'?content:undefined})});}catch{setLocalProblem('This action could not be prepared. Your text has not been published.');}};
 const approve=async()=>{if(!review||!reviewMatches)return;setLocalProblem('');try{await controller.approve(review.reviewedEventFingerprint);}catch{setLocalProblem('Review this action and choose a source before publishing.');}};
 const close=()=>{controller.setContext({scope:boundary?.scope||'public-read-only',writeRelays:[...relays]});onClose();};
 return <section className="public-action-review" aria-label={`${name} review`} data-public-action-review={targetId||'new'}>
  <h3>{name}</h3>
  {!publication&&(action==='reply'||action==='publish')&&<label>Your text<textarea autoFocus value={content} disabled={!editable} maxLength={65536} onChange={event=>setContent(event.target.value)} placeholder={action==='reply'?'Write your reply…':'What would you like to share?'}/></label>}
  <p className="source-caption">Public on Nostr. Other people can read and copy what you share.</p>
  <p className="source-caption">Selected sources: {relays.length?relays.map(relay=>relay.includes('primal')?'Primal':'Damus').join(', '):'None'}</p>
  {!boundary&&<p role="status">Your publishing account is not connected yet. Nothing has been sent.</p>}
  {review&&!reviewMatches&&<p role="alert">This recovered action belongs to a different original. Open that original before sharing it.</p>}
  {review&&<div className="public-action-approved-content"><PublicReviewDetails review={review}/><p>Review the exact action before sharing.</p>{(action==='reply'||action==='publish')&&review.unsignedEvent.content&&<p className="public-action-review-text">{review.unsignedEvent.content}</p>}<p className="source-caption">Using your connected Nostr profile · {review.pubkey.slice(0,12)}…{review.pubkey.slice(-6)}</p></div>}
  {state.phase==='accepted'&&<p role="status">Your selected sources accepted this action.</p>}
  {state.phase==='not-published'&&<p role="alert">The selected sources did not accept this action.</p>}
  {state.phase==='unknown'&&<p role="alert">The result is not confirmed. Check this same action before trying again.</p>}
  {state.phase==='partial'&&<p role="status">Some selected sources accepted this action. Other results are unconfirmed.</p>}
  {state.phase==='signed'&&<p role="status">Your signature was recovered. Sharing with the selected sources is not confirmed.</p>}
  {state.phase==='unavailable'&&boundary&&<p role="status">Publishing is currently unavailable for this account. Nothing new was sent.</p>}
  {state.phase==='failed'&&<p role="alert">This action could not be prepared. Nothing was published.</p>}
  {busy&&<p role="status">{state.phase==='checking'?'Checking your account…':state.phase==='signing'?'Signing your reviewed action…':'Waiting for the selected sources…'}</p>}
  {state.result&&'receipts' in state.result&&<ul aria-label="Publication results">{state.result.receipts.map(source=><li key={source.relay}>{source.relay.includes('primal')?'Primal':'Damus'}: {source.status==='accepted'?'Accepted':source.status==='rejected'?'Rejected':'Not confirmed'}</li>)}</ul>}
  {localProblem&&<p role="alert">{localProblem}</p>}
  {pending.length>0&&<section aria-label="Unconfirmed actions"><p>Check your previous unconfirmed action before sending it again.</p>{pending.map((operation,index)=><button key={operation.operationId} className="secondary" disabled={busy} onClick={()=>void controller.reconcile(operation.operationId)}>Check unconfirmed {operation.action==='publish'?'post':operation.action} {index+1}</button>)}</section>}
  <div className="public-action-review-controls">
   {!review&&<button className="secondary" disabled={busy||uncertain||!relays.length||(!publication&&(action==='reply'||action==='publish')&&!content.trim())} onClick={prepare}>Review {action==='reply'?'reply':action==='publish'?'post':action}</button>}
   {state.phase==='review'&&<button className="primary" disabled={busy||!relays.length||!reviewMatches} onClick={approve}>Confirm and share publicly</button>}
   {(state.phase==='unknown'||state.phase==='partial')&&boundary&&<button className="secondary" onClick={()=>void controller.reconcile()}>Check this same action</button>}
   {state.phase==='signed'&&review&&<button className="primary" disabled={!relays.length||!reviewMatches} onClick={()=>void controller.resumePublication(review.reviewedEventFingerprint)}>Share the same signed action</button>}
   <button className="text-action" onClick={close}>{busy||uncertain?'Leave and check later':'Close'}</button>
  </div>
 </section>;
}


function PublicReviewDetails({review}:{review:import('./public-feed.mjs').PublicCommandReview}){
 const event=review.unsignedEvent,tags=event.tags;
 const fields=[['Format',event.kind===30023?'Article':event.kind===20?'Photo gallery':[21,22].includes(event.kind)?event.kind===22?'Short video':'Video':event.kind===1111?'Public comment':event.kind===7?'Reaction':[6,16].includes(event.kind)?'Repost':'Text post'],...tags.filter(tag=>['title','summary','content-warning','published_at'].includes(tag[0])).map(tag=>[tag[0]==='title'?'Title':tag[0]==='summary'?'Summary':tag[0]==='content-warning'?'Content warning':'First publication time',tag[1]||'Sensitive content'])];
 const targets=tags.filter(tag=>['e','E','a','A','q'].includes(tag[0]));
 return <section aria-label="Exact reviewed content"><dl>{fields.map(([label,value],index)=><div key={index}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
  {tags.filter(tag=>tag[0]==='imeta').map((tag,index)=><div key={index} className="public-review-media"><strong>Media {index+1}</strong><dl>{tag.slice(1).map((part,i)=>{const split=part.indexOf(' '),name=part.slice(0,split),value=part.slice(split+1),url=name==='url'||name==='image'?publicExternalURL(value):null;return <div key={i}><dt>{name==='url'?'File':name==='m'?'File type':name==='alt'?'Description':name==='image'?'Preview':name==='x'?'Declared file hash':name==='dim'?'Dimensions':name}</dt><dd>{url?<a href={url} target="_blank" rel="noopener noreferrer">{value}</a>:value}</dd></div>;})}</dl></div>)}
  {targets.length>0&&<details><summary>Original references</summary><ul>{targets.map((tag,index)=><li key={index}>{tag[1]}</li>)}</ul></details>}
 </section>;
}
