import {useEffect,useRef} from 'react';
import {ArrowLeft,ArrowRight,BookOpen,FolderLock} from '@phosphor-icons/react';
import type {ProductWorld} from './productModel';
import {ownPrivateAccount} from './ownPrivateAccount';
import {bookDiscoveriesFor,bookDiscoveryBookFor,bookDiscoveryPickSaved} from './bookDiscovery';
import {MobileScroll,useKeyboard} from './mobile';
import {ClubAdjustableRegion} from './WebAdjustableRegion';
import './web-books-library.css';

export default function WebBooksLibrary({world,onOpen,onCreate,onBack}:{world:ProductWorld;onOpen:(id:string)=>void;onCreate:()=>void;onBack?:()=>void}){
 const keyboard=useKeyboard(),root=useRef<HTMLElement>(null);
 useEffect(()=>{root.current?.querySelector<HTMLElement>('h1')?.focus({preventScroll:true});},[]);
 const rows=bookDiscoveriesFor(world,{includeArchived:true});
 const saved=rows.flatMap(r=>r.shortlist.filter(p=>bookDiscoveryPickSaved(world,r.id,p.id)).flatMap(p=>{try{return [{discovery:r,pick:p,book:bookDiscoveryBookFor(world,r.id,p.id)}];}catch{return [];}}));
 const back=()=>{keyboard.hide();onBack?.();};
 if(!ownPrivateAccount(world))return <MobileScroll><article className="web-books-library" ref={root}><button className="web-books-back" onClick={back}><ArrowLeft size={22}/>Back to Library</button><FolderLock size={34}/><h1 tabIndex={-1}>Your reading stays yours.</h1><p>Sign in to review your own saved editions and reading discoveries.</p></article></MobileScroll>;
 const open=(id:string)=>{keyboard.hide();onOpen(id);};
 return <MobileScroll><article className="web-books-library" ref={root}>
  <button className="web-books-back" onClick={back}><ArrowLeft size={22}/>Back to Library</button>
  <ClubAdjustableRegion id="personal-web:library:books:invitation" labels={['Reading image','Reading invitation']} className="web-books-hero" minWidth={280}>
   <img className="web-books-photo" src="/assets/crays/web-books-reading-corner.png" alt="An open book beside a sunlit window and a comfortable reading chair"/>
   <section className="web-books-invitation"><p className="web-books-eyebrow"><BookOpen size={22}/>YOUR READING</p><h1 tabIndex={-1}>Your next chapter.</h1><h2>{rows.length?'Find another good read.':'What would you like to read?'}</h2><p>Start with a topic or reading goal, then choose your public catalogue. Compare the exact editions before saving one.</p><button className="web-books-primary" onClick={()=>{keyboard.hide();onCreate();}}>Find my next book<ArrowRight size={23}/></button></section>
  </ClubAdjustableRegion>
  {saved.length>0&&<section className="web-books-records" aria-label="Saved editions"><h2>Your saved editions</h2>{saved.map(({discovery,pick,book})=><button key={`${discovery.id}:${pick.id}`} onClick={()=>open(discovery.id)}><BookOpen size={30}/><span><strong>{book.title}</strong><small>{book.authors.join(', ')||'Author not supplied'} · {book.editionLabel||'Edition label not supplied'}</small></span><ArrowRight size={23}/></button>)}</section>}
  {rows.length>0&&<section className="web-books-records" aria-label="Reading discoveries"><h2>Continue a discovery</h2>{rows.map(r=><button key={r.id} onClick={()=>open(r.id)}><BookOpen size={30}/><span><strong>{r.name}</strong><small>{r.shortlist.length?`${r.shortlist.length} shortlisted edition${r.shortlist.length===1?'':'s'}`:'Reading goal and selected catalogue'} · {r.status}</small></span><ArrowRight size={23}/></button>)}</section>}
  {!rows.length&&<p className="web-books-empty">Your saved editions and reading discoveries will stay here.</p>}
 </article></MobileScroll>;
}
