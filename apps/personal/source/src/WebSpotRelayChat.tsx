import './spot-relay-live.css';
import {useSpotReplyDraft} from './live-messaging/useSpotReplyDraft';
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {ChatCircle,ArrowRight,ArrowUp,ArrowClockwise} from '@phosphor-icons/react';
import type {RelayDiscussion} from './spotRelayConversations';
import type {AdmittedHumanMessagingPort} from './live-messaging/admittedConversationSelection.mjs';
import type {SpotRelayClientSnapshot} from './live-messaging/currentSpotRelayClient.mjs';
type Client=Awaited<ReturnType<NonNullable<AdmittedHumanMessagingPort['openSpotDiscussion']>>>;
type Person={name:string;image:string;pubkey?:string};
type Props={thread:RelayDiscussion;people:Record<string,Person>;onPerson:(id:string)=>void;onOriginal:()=>void;onReply:()=>void;messaging?:AdmittedHumanMessagingPort;ownPersonId?:string};
const initial:SpotRelayClientSnapshot={state:'idle',root:null,messages:[],receipt:null,problem:null};
/** Existing approved Spot discussion surface, backed by the current same-origin
 * account port. Relay activity never creates a private conversation or VIF.
 */
export default function WebSpotRelayChat(p:Props){
 const [state,setState]=useState<SpotRelayClientSnapshot>(initial),[draftClient,setDraftClient]=useState<Client|null>(null),[busy,setBusy]=useState(false),[feedback,setFeedback]=useState(''),[pending,setPending]=useState<{requestId:string;text:string;replyTo:string}|null>(null);
 const {text,setText,status:draftStatus,focus:restoreDraft,useSaved,keepMine,clearSent}=useSpotReplyDraft(draftClient);
 const selected=useRef<Client|null>(null),generation=useRef(0),lock=useRef(false),composer=useRef<HTMLTextAreaElement>(null),messageScroll=useRef<HTMLDivElement>(null),historyAnchor=useRef<{id:string;top:number;epoch:number}|null>(null);
 const live=!!p.messaging?.openSpotDiscussion,tooLong=new TextEncoder().encode(text).length>8000;
 useEffect(()=>{
  const epoch=++generation.current,abort=new AbortController();let port:Client|undefined,unsubscribe:undefined|(()=>void);
  const current=()=>generation.current===epoch&&!abort.signal.aborted;
  selected.current=null;historyAnchor.current=null;lock.current=false;setState(initial);setDraftClient(null);setBusy(false);setFeedback('');setPending(null);
  const revoked=()=>{if(current()){generation.current++;selected.current=null;port?.close();setState({...initial,state:'closed'});setDraftClient(null);setPending(null);setBusy(false);setFeedback('');}};p.messaging?.signal.addEventListener('abort',revoked,{once:true});
  if(p.messaging?.openSpotDiscussion){
   setState({...initial,state:'loading'});
   void p.messaging.openSpotDiscussion({spotId:p.thread.spotId,rootId:p.thread.id,signal:abort.signal}).then(async value=>{
    if(!current()){value.close();return;}port=value;selected.current=value;setDraftClient(value);
    const publish=()=>{if(current())setState(value.getSnapshot());};unsubscribe=value.subscribe(publish);publish();
    await value.load();
   }).catch(()=>{if(current())setState(s=>({...s,state:s.root?'ready':'unavailable',problem:'read-unavailable'}));});
  }
  return()=>{p.messaging?.signal.removeEventListener('abort',revoked);if(generation.current===epoch)generation.current++;abort.abort();unsubscribe?.();port?.close();if(selected.current===port)selected.current=null;};
 },[p.messaging,p.thread.spotId,p.thread.id]);
 const act=async(work:(client:Client,epoch:number)=>Promise<void>)=>{
  const client=selected.current,epoch=generation.current;if(!client||lock.current)return;lock.current=true;setBusy(true);setFeedback('');
  try{await work(client,epoch);}catch{if(generation.current===epoch)setFeedback('The request could not be confirmed. Check the saved reply before trying to send it again.');}
  finally{if(generation.current===epoch){lock.current=false;setBusy(false);}}
 };
 useLayoutEffect(()=>{
  const anchor=historyAnchor.current,scroll=messageScroll.current;if(!anchor||!scroll||anchor.epoch!==generation.current)return;
  const original=scroll.querySelector<HTMLElement>('[data-relay-message="'+anchor.id+'"]');
  if(original)scroll.scrollTop+=original.getBoundingClientRect().top-anchor.top;
  historyAnchor.current=null;
 },[state.messages]);
 const loadOlder=()=>void act(async(client,epoch)=>{
  const scroll=messageScroll.current;
  if(scroll){const top=scroll.getBoundingClientRect().top,visible=[...scroll.querySelectorAll<HTMLElement>('[data-relay-message]')].find(el=>el.getBoundingClientRect().bottom>top);if(visible)historyAnchor.current={id:visible.dataset.relayMessage!,top:visible.getBoundingClientRect().top,epoch};}
  try{await client.loadOlder();}catch(error){historyAnchor.current=null;throw error;}
 });
 const send=()=>{const value=text;if(!value.trim()||draftStatus==='conflict'||lock.current||pending||!selected.current||!state.root||new TextEncoder().encode(value).length>8000)return;const requestId=crypto.randomUUID();setPending({requestId,text:value,replyTo:p.thread.id});void act(async(client,epoch)=>{
  const receipt=await client.send({requestId,text:value,approved:true});if(generation.current!==epoch)return;
  if(receipt.status==='sent-to-relay'){setPending(null);setFeedback('Sent to this Spot relay.');await clearSent(value).catch(()=>{});await client.load().catch(()=>{});}
  else setFeedback(receipt.status==='not-accepted'?'The Spot relay did not accept this reply.':'The relay has not confirmed this reply. Check its status before resending.');
 });};
 const recover=()=>void act(async(client,epoch)=>{
  const saved=pending||await client.readPending();if(generation.current!==epoch)return;
  if(!saved){setFeedback('There is no saved reply to check.');return;}setPending(saved);
  const receipt=await client.recover(saved.requestId);if(generation.current!==epoch)return;
  if(receipt.status==='sent-to-relay'){setPending(null);setFeedback('The saved reply is on this Spot relay.');await clearSent(saved.text).catch(()=>{});await client.load().catch(()=>{});}
  else {setText(current=>current||saved.text);setFeedback(receipt.status==='prepared'?'This reply has not been sent yet. Its original is saved.':receipt.status==='not-accepted'?'The relay did not accept the saved reply.':'Its delivery is still unconfirmed. Nothing has been sent again.');}
 });
 const resend=()=>{if(!pending)return;const saved=pending;void act(async(client,epoch)=>{
  let receipt=await client.retryOriginal(saved.requestId,{approved:true});if(receipt.status!=='sent-to-relay')receipt=await client.recover(saved.requestId,{republish:true});if(generation.current!==epoch)return;
  if(receipt.status==='sent-to-relay'){setPending(null);setFeedback('Sent to this Spot relay.');await clearSent(saved.text).catch(()=>{});await client.load().catch(()=>{});}else setFeedback('Delivery is still unconfirmed. Your original reply is saved.');
 });};
 const byKey=new Map(Object.entries(p.people).filter(([,person])=>person.pubkey).map(([id,person])=>[person.pubkey!,{id,...person}]));
 if(state.ownPubkey&&p.ownPersonId&&p.people[p.ownPersonId])byKey.set(state.ownPubkey,{id:p.ownPersonId,...p.people[p.ownPersonId]});
 const events=live?(state.root?[state.root,...state.messages]:[]):[];
 const messages=live?events.map(event=>{const person=byKey.get(event.pubkey);return person?{id:event.id,personId:person.id,text:event.content,createdAt:event.created_at*1000,previewOnly:false}:null;}).filter((m):m is NonNullable<typeof m>=>m!==null):p.thread.messages.filter(m=>p.people[m.personId]);
 return <section className="spot-relay-thread" aria-label="Spot relay conversation" aria-busy={busy}>
  <header><div><h2>{p.thread.title}</h2><small>Spot community discussion</small></div><button onClick={p.onOriginal}>Original<ArrowRight size={18}/></button></header>
  {live&&<div className="spot-relay-live-status" role="status">{state.state==='loading'?'Opening this Spot conversation…':state.problem==='read-unavailable'?'This Spot could not be refreshed.':state.root?'Messages from this Spot relay.':''}<button disabled={busy||state.loadingOlder||state.state==='loading'} onClick={()=>void act(async client=>client.load())} aria-label="Refresh Spot conversation"><ArrowClockwise size={18}/>Refresh</button></div>}
  {live&&state.root&&state.messages.length>0&&state.hasMore!==false&&<div className="spot-relay-live-status"><button disabled={busy||state.loadingOlder||state.state==='refreshing'} onClick={loadOlder}>{state.loadingOlder?'Loading older messages…':state.historyProblem==='read-unavailable'?'Retry older messages':'Load older messages'}</button>{state.historyProblem==='boundary-saturated'&&<span role="status">More messages share this timestamp than this relay returned. Earlier messages may be missing; no time range has been skipped.</span>}</div>}
  <div className="spot-relay-messages" ref={messageScroll}>{messages.map(m=><article key={m.id} data-relay-message={m.id} data-own={m.personId===p.ownPersonId}><button aria-label={'View '+p.people[m.personId].name+'’s profile'} onClick={()=>p.onPerson(m.personId)}><img src={p.people[m.personId].image} alt="" loading="lazy"/></button><div><button className="spot-relay-author" onClick={()=>p.onPerson(m.personId)}>{p.people[m.personId].name}</button><p>{m.text}</p>{m.previewOnly&&<small className="spot-relay-preview-label">Local preview · not delivered to the relay</small>}<small>{new Date(m.createdAt).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</small></div></article>)}</div>
  {live?<footer className="spot-relay-composer"><form onSubmit={event=>{event.preventDefault();send();}}><label className="spot-relay-composer-label" htmlFor={'spot-reply-'+p.thread.id}>Reply to this Spot conversation</label><textarea ref={composer} id={'spot-reply-'+p.thread.id} placeholder="Reply to this Spot…" value={text} disabled={busy||!state.root||!!pending} rows={2} maxLength={8000} onFocus={restoreDraft} onChange={event=>setText(event.target.value)} onKeyDown={event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.nativeEvent.isComposing){event.preventDefault();send();}}}/><button type="submit" aria-label="Send reply to Spot" disabled={busy||!state.root||!text.trim()||!!pending||tooLong||draftStatus==='conflict'}><ArrowUp size={20}/></button></form><div className="spot-relay-recovery">{draftStatus==='conflict'&&<><span>A saved draft changed in another tab.</span><button type="button" onClick={()=>void useSaved()}>Use saved draft</button><button type="button" onClick={()=>void keepMine()}>Keep my draft</button></>}{draftStatus!=='conflict'&&<span role="status">{draftStatus==='loading'?'Opening saved draft…':draftStatus==='saving'?'Saving draft…':draftStatus==='saved'?'Draft saved on this device.':draftStatus==='unavailable'?'Draft could not be saved. Keep this conversation open or retry.':''}</span>}{draftStatus==='unavailable'&&<button type="button" onClick={()=>void keepMine()}>Retry saving draft</button>}<button onClick={recover} disabled={busy}>Check saved reply</button>{pending&&<button onClick={resend} disabled={busy}>Resend original reply</button>}<span role="status">{busy?'Working…':tooLong?'This reply is too long. Please shorten it before sending.':feedback}</span></div></footer>:<footer><ChatCircle size={22}/><span>Continue this Spot conversation</span><button onClick={p.onReply}>Write a reply<ArrowRight size={18}/></button></footer>}
  <p className="spot-relay-boundary">Replies belong to this Spot. Taking part does not add anyone to your VIFs.</p>
 </section>;
}
