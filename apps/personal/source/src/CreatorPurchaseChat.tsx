import {PaidOriginalVideo} from './PaidOriginalVideo';
import {ContactConnectionContext} from './ContactConnectionContext';
import {BookOpen,PlayCircle,ChatCircle,Receipt,CaretRight,ShieldCheck,ShoppingBag} from '@phosphor-icons/react';
import {MobileScroll} from './mobile';
import {useState} from 'react';
import type {ProductWorld,ActionResult,ActionContext} from './productModel';
import {creatorChatContent} from './creatorChatContent';
import {readableOriginalMedia} from './paidContentAccess';
import {canDirectMessage} from './communicationPolicy';
import {MessageComposer} from './MessageComposer';
import {PaidMediaCover} from './PaidMediaCover';
import './creator-purchase-chat.css';
type Props={world:ProductWorld;personId:string;asset:(s:string)=>string;onOriginal:(id:string)=>void;onReceipt:(id:string)=>void};
export function CreatorPurchasedCards({world,personId,asset,onOriginal,onReceipt}:Props){
 const entries=creatorChatContent(world,personId);if(!entries.length)return null;
 return <section className="creator-chat-purchases" aria-label="Your purchased content"><div className="creator-chat-section-heading"><ShoppingBag size={18}/><h2>Your purchases</h2></div>{entries.map(e=>{const p=e.post,media=p&&e.canOpen?readableOriginalMedia(world,p):[],video=media.find(m=>m.kind==='video'),photo=media.find(m=>m.kind==='image');return <article className="creator-chat-purchase" key={e.sourceId} data-purchased-original={e.sourceId}>
 {p?.protected&&!e.canOpen?<PaidMediaCover/>:e.canOpen&&video&&p?<PaidOriginalVideo world={world} postId={p.id} source={{kind:'published-media',mediaId:video.id}}/>:e.canOpen&&(photo||p?.image)?<img src={asset(photo?.url||p!.image!)} alt={photo?.alt||p?.alt||'Purchased content'}/>:null}
 <div className="creator-chat-purchase-body"><small>{p?.type==='article'?'ARTICLE':video?'VIDEO':'PURCHASED ORIGINAL'}</small><h3>{p?.title||'Your original purchase record'}</h3><p className="creator-chat-access">{e.status}</p>{p&&<p>{p.text.slice(0,180)}{p.text.length>180?'…':''}</p>}
 {p&&<button className="creator-chat-open" onClick={()=>onOriginal(p.id)}>{p.type==='article'?<BookOpen size={19}/>:<PlayCircle size={19}/>}<span>{e.canOpen?p.type==='article'?'Read the complete article':'Open your content':'Review content access'}</span><CaretRight size={18}/></button>}
 {e.payments.map(payment=><button className="creator-chat-receipt" key={payment.id} onClick={()=>onReceipt(payment.id)}><Receipt size={17}/><span>Payment receipt · {payment.status}</span><CaretRight size={16}/></button>)}
 </div></article>;})}</section>;
}
export function CreatorPurchaseChat(props:Props&{run:(op:string,data:Record<string,string>,ctx:ActionContext)=>ActionResult;onProfile:()=>void;onMessage:()=>void;onPaidConversation?:(id:string)=>void}){
 const {world,personId,asset}=props,people=world.people.filter(p=>p.id===personId),person=people.length===1?people[0]:undefined,[draft,setDraft]=useState('');
 const available=world.identity.signedIn&&person,communicationBlocked=!!person&&(person.blocked||person.blockedByOther),entries=creatorChatContent(world,personId),canMessage=available&&canDirectMessage(world,personId);
 const sessions=world.identity.signedIn?world.objects.filter(o=>o.owner===world.owner&&o.kind==='paid-conversation'&&o.sellerId===personId&&world.objects.filter(n=>n.id===o.id).length===1):[];
 return <div className="chat-screen"><MobileScroll className="chat-scroll"><div className="creator-chat-privacy"><ShieldCheck size={13}/><span>Chuck cannot read this content chat. Private messaging needs separate acceptance.</span></div><main className="creator-content-conversation">
 {available?<>{communicationBlocked?<p className="creator-chat-intro"><ShieldCheck size={18}/> Messaging is unavailable. Your purchases and their original rights remain separate.</p>:<button className="chat-person" onClick={props.onProfile}><img className="avatar" src={asset(person.avatar)} alt=""/><span>{person.name}</span><CaretRight size={18}/></button>}<ContactConnectionContext key={`${world.owner}:${personId}`} world={world} personId={personId} run={props.run}/><p className="creator-chat-intro">Your purchases from this creator, with the same rights and receipts as your Library.</p><CreatorPurchasedCards {...props}/>{!!sessions.length&&props.onPaidConversation&&<section className="creator-chat-purchases" aria-label="Your purchased conversations"><div className="creator-chat-section-heading"><ChatCircle size={18}/><h2>Your purchased conversations</h2></div>{sessions.map(s=><button className="creator-chat-open" key={s.id} onClick={()=>props.onPaidConversation?.(s.id)}><ChatCircle size={21}/><span>{String(s.name||'Purchased conversation')}<small>{s.status==='active'&&Number(s.endsAt)>Date.now()?'Review scope & creator response':'Review original access & history'}</small></span><CaretRight size={18}/></button>)}</section>}{!entries.length&&!sessions.length&&<section className="creator-chat-empty"><ShoppingBag size={32}/><h2>Your content belongs here.</h2><p>{communicationBlocked?'No purchased content is available in this conversation. Your original payment records remain separate.':'When you buy this creator’s work, it will appear here. Explore their public profile to review offers.'}</p>{!communicationBlocked&&<button className="primary" onClick={props.onProfile}>View creator profile</button>}</section>}{canMessage&&<button className="secondary" onClick={props.onMessage}>Open your private conversation<CaretRight size={18}/></button>}</>:<section className="creator-chat-empty"><ShieldCheck size={32}/><h1>Your purchases stay private.</h1><p>Sign in and check the original creator. No other buyer’s content or messages are shown.</p></section>}
 </main></MobileScroll><MessageComposer value={draft} onChange={setDraft} onSend={()=>{}} label="Message" sendLabel="Send message" disabled navigationReserved={world.identity.signedIn}/></div>;
}
