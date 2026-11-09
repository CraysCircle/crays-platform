import {useLayoutEffect,useRef,useState,type ReactNode} from 'react';
import {ArrowLeft,ArrowRight,ArrowUpRight,House,Camera,ChatCircle,Images,Info,MagnifyingGlass,UsersThree,MapPin,Newspaper,Briefcase} from '@phosphor-icons/react';
import './web-personal-spots.css';
export type OwnWebSpot={id:string;name:string;city:string;type:string;image:string;status:string;country?:string;region?:string;description?:string;home?:boolean;people?:{id:string;name:string;image:string}[]};
type Props={detail?:boolean;onBack:()=>void;collectionKey:string;region:string;type:string;craysOnly:boolean;onRegion:(s:string)=>void;onType:(s:string)=>void;onCrays:(v:boolean)=>void;regions:string[];types:string[];total:number;places:OwnWebSpot[];selected?:OwnWebSpot;query:string;city:string;cities:string[];onQuery:(s:string)=>void;onCity:(s:string)=>void;onSelect:(id:string)=>void;onDiscover:()=>void;onQr:()=>void;onPhotos:()=>void;onInfo:()=>void;onChuck:()=>void;tab:string;onTab:(s:string)=>void;content:ReactNode;context?:ReactNode;signedIn:boolean;onSignIn:()=>void;problem:boolean;showChatPlaceLinks?:boolean};
const indexPositions=new Map<string,number>();
const sections=[['Feed',Newspaper],['Chats',ChatCircle],['People',UsersThree],['Visit',MapPin],['Services',Briefcase]] as const;
export default function WebPersonalSpots(p:Props){
 const root=useRef<HTMLElement>(null),[limit,setLimit]=useState(24);
 useLayoutEffect(()=>{if(!p.detail&&root.current)root.current.scrollTop=indexPositions.get(p.collectionKey)||0;},[p.detail,p.collectionKey]);
 useLayoutEffect(()=>setLimit(24),[p.query,p.city,p.region,p.type,p.craysOnly]);
 if(!p.signedIn)return <main className="web-desktop-page web-personal-spots-private"><h1>Your Spots stay yours.</h1><p>Sign in to open your own places and conversations.</p><button onClick={p.onSignIn}>Sign in to CRAYS</button></main>;
 if(!p.detail)return <main ref={root} className="web-desktop-page web-personal-spots web-spots-editorial web-spots-collection" onScroll={e=>indexPositions.set(p.collectionKey,e.currentTarget.scrollTop)}>
  <header className="web-spots-heading"><div><h1>Your Spots</h1><p>Your places. Your people. Your conversations.</p></div></header>
  <div className="spot-collection-toolbar">
   <div className="spot-collection-scope" role="group" aria-label="Your Spot collection"><button aria-pressed={!p.craysOnly} onClick={()=>p.onCrays(false)}><House size={18}/>All your Spots</button><button aria-pressed={p.craysOnly} onClick={()=>p.onCrays(true)}><img className="spot-collection-crays-mark" src="/crays-mark.svg" alt="" width={18} height={18}/>Crays Spots</button></div>
   <label><span className="sr-only">Region</span><select aria-label="Filter your Spots by region" value={p.region} onChange={e=>p.onRegion(e.target.value)}><option>All regions</option>{p.regions.map(r=><option key={r}>{r}</option>)}</select></label>
   <label><span className="sr-only">Spot type</span><select aria-label="Filter your Spots by type" value={p.type} onChange={e=>p.onType(e.target.value)}><option>All types</option>{p.types.map(t=><option key={t}>{t}</option>)}</select></label>
   <label className="web-own-spot-search"><MagnifyingGlass size={21}/><input aria-label="Search your Spots" placeholder="Search your Spots…" value={p.query} onChange={e=>p.onQuery(e.target.value)}/></label>
  </div>
  <p className="spot-collection-count" role="status">{p.places.length===p.total?p.total+' Spots':p.places.length+' of '+p.total+' Spots'}</p>
  <section className="spot-collection-grid" aria-label="Your Spots selection">{p.places.slice(0,limit).map(place=><article className="spot-collection-card" key={place.id}>
   <a href={'#/personal/spots/'+encodeURIComponent(place.id)} aria-label={'Open '+place.name} onClick={e=>{if(e.button||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;e.preventDefault();p.onSelect(place.id);}}>
    <div className="spot-collection-photo"><img src={place.image} alt={place.type+' in '+place.city} loading="lazy"/>{place.home&&<span><House size={16}/>Home Spot</span>}</div>
    <h2>{place.name}</h2><p className="spot-collection-meta">{place.city}{place.country?', '+place.country:''} · {place.type}</p>
    <p className="spot-collection-description">{place.description}</p>
    <footer><span className="spot-collection-people" aria-label="Shared community members">{place.people?.slice(0,4).map(person=><img key={person.id} src={person.image} alt={person.name} loading="lazy"/>)}{(place.people?.length||0)>4&&<span>+{place.people!.length-4}</span>}</span><span className="spot-collection-open">Open Spot<ArrowUpRight size={18}/></span></footer>
   </a>
  </article>)}</section>
  {!p.places.length&&<div className="web-own-spots-empty"><h2>No matching Spots</h2><p>Try another region, type or search.</p><button onClick={()=>{p.onQuery('');p.onRegion('All regions');p.onType('All types');p.onCrays(false);p.onCity('All cities');}}>Clear filters</button></div>}
  {p.places.length>limit&&<button className="spot-collection-more" onClick={()=>setLimit(v=>v+24)}>Show more Spots</button>}
  {p.problem&&<p role="status">Some place records need review. Their originals have been kept.</p>}
  <footer className="web-spots-context-links"><button onClick={p.onDiscover}>Discover new Spots<ArrowRight size={21}/></button><button onClick={p.onQr}><Camera size={21}/>Scan a venue QR</button></footer>
 </main>;
 return <main className="web-desktop-page web-personal-spots web-spots-editorial web-spot-detail">
  <button className="spot-collection-back" onClick={p.onBack}><ArrowLeft size={20}/>Your Spots</button>
   <div className={p.context?"spot-detail-composition":""}><section className="web-own-spot-workspace" aria-label="Selected Spot">{p.selected?<>
    <header className="spot-detail-header"><img className="spot-detail-identity-photo" src={p.selected.image} alt=""/><div className="web-own-spot-identity"><div><h1>{p.selected.name}</h1><p>{p.selected.city}{p.selected.country?', '+p.selected.country:''} · {p.selected.type}<span className="web-own-spot-status"> · {p.selected.status}</span></p></div><button onClick={p.onChuck}><ChatCircle size={22}/>Ask Chuck</button></div>
     <div className="web-own-spot-tabs" role="tablist" aria-label="Your Spot sections">{sections.map(([name,Icon])=><button key={name} id={'web-spot-tab-'+name} aria-controls={'web-spot-panel-'+name} role="tab" aria-selected={p.tab===name} tabIndex={p.tab===name?0:-1} onClick={()=>p.onTab(name)} onKeyDown={e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const nodes=[...e.currentTarget.parentElement!.querySelectorAll<HTMLButtonElement>('[role=tab]')],i=nodes.indexOf(e.currentTarget),next=e.key==='Home'?0:e.key==='End'?nodes.length-1:(i+(e.key==='ArrowRight'?1:-1)+nodes.length)%nodes.length;nodes[next].click();nodes[next].focus();}}><Icon size={23}/>{name}</button>)}</div>
    </header>
    <div id={'web-spot-panel-'+p.tab} className={'web-own-spot-content web-own-spot-section-'+p.tab.toLowerCase()} role="tabpanel" aria-labelledby={'web-spot-tab-'+p.tab}>{p.content}</div>
    {(p.tab!=='Chats'||p.showChatPlaceLinks)&&<div className="web-spots-place-links"><button onClick={p.onPhotos}><Images size={21}/>Photos</button><button onClick={p.onInfo}><Info size={21}/>Space info</button></div>}
   </>:<div className="web-own-spots-empty"><MapPin size={42}/><h2>Spot unavailable</h2><p>This Spot is not available in your collection.</p><button onClick={p.onDiscover}>Discover new Spots</button></div>}</section>{p.context&&<aside className="spot-detail-context" aria-label="Spot context">{p.context}</aside>}</div>

  <footer className="web-spots-context-links"><button onClick={p.onDiscover}>Discover new Spots<ArrowRight size={21}/></button><button onClick={p.onQr}><Camera size={21}/>Scan a venue QR</button></footer>
 </main>;
}
