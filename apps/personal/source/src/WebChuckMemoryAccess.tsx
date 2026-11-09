import {useEffect,useRef,type MouseEvent} from 'react';
import {ArrowLeft,ArrowRight,Brain,BookOpen,MessageCircle} from 'lucide-react';
import {personalNavigationHref} from './webPersonalNavigation';
import './web-account-delivery-status.css';

type Props={onBack:()=>void;onConversation:()=>void;onKnowledge:()=>void};
/** The live account has no admitted Memory-management port yet. Never mount
 * the local preview's records or confirm/correct/forget actions in its place. */
export default function WebChuckMemoryAccess(p:Props){
 const title=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{title.current?.focus({preventScroll:true});},[]);
 const follow=(event:MouseEvent<HTMLAnchorElement>,open:()=>void)=>{
  if(event.button===0&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey&&!event.altKey){event.preventDefault();open();}
 };
 return <main className="web-account-delivery-status" aria-label="Your Chuck memory">
  <button className="wad-back" type="button" onClick={p.onBack}><ArrowLeft size={20} aria-hidden="true"/>Back</button>
  <header><span className="wad-icon"><Brain size={28} aria-hidden="true"/></span><h1 ref={title} tabIndex={-1}>Your memory with Chuck.</h1><p>Review what Chuck remembers and stay in control of changes.</p></header>
  <section className="wad-connection" aria-label="Memory management status"><Brain size={26} aria-hidden="true"/><div><h2>Memory management is currently unavailable.</h2><p role="status">Your saved memories cannot be loaded or changed here yet.</p><p>You can continue your conversation with Chuck. A message alone is not confirmation that a memory was saved, corrected or forgotten.</p></div></section>
  <footer><a className="wad-primary" href={personalNavigationHref({name:'conversation',id:'chuck'})} onClick={event=>follow(event,p.onConversation)}><MessageCircle size={19} aria-hidden="true"/>Open your Chuck conversation<ArrowRight size={18} aria-hidden="true"/></a><a className="wad-secondary" href={personalNavigationHref({name:'chuckKnowledge'})} onClick={event=>follow(event,p.onKnowledge)}><BookOpen size={19} aria-hidden="true"/>Your knowledge &amp; sources</a></footer>
 </main>;
}
