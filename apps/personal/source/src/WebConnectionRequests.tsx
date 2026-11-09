import {useLayoutEffect,useRef,type MouseEvent} from 'react';
import {ArrowLeft,ArrowRight,MagnifyingGlass,X,UserPlus} from '@phosphor-icons/react';
import {ClubAdjustableRegion} from './WebAdjustableRegion';
import './web-connection-requests.css';

export type ConnectionRequestPreview={id:string;name:string;bio:string;purpose:string;photo:string;sharedPlaces:string[]};
type Props={
  available:boolean;layoutScope:string;backLabel:string;query:string;
  requests:ConnectionRequestPreview[];selected?:ConnectionRequestPreview;selectionUnavailable:boolean;
  connectedPeople:ConnectionRequestPreview[];unavailableRecords:boolean;
  feedback:{ok:boolean;message:string}|null;sentHref:string;discoverHref:string;
  onQuery:(value:string)=>void;onSelect:(id:string)=>void;onBack:()=>void;onSignIn:()=>void;
  onProfile:()=>void;onConnectedProfile:(id:string)=>void;
  onRespond:(response:'Accept'|'Decline'|'Block')=>void;onSent:()=>void;onDiscover:()=>void;
};

export default function WebConnectionRequests(p:Props){
  const heading=useRef<HTMLHeadingElement>(null);
  useLayoutEffect(()=>{if(p.feedback)heading.current?.focus({preventScroll:true});},[p.feedback]);
  const follow=(event:MouseEvent<HTMLAnchorElement>,action:()=>void)=>{
    if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    event.preventDefault();action();
  };
  if(!p.available)return <main className="web-desktop-page web-connection-requests web-requests-private"><button className="web-request-back" onClick={p.onBack}><ArrowLeft size={20}/>Back to Overview</button><h1 ref={heading} tabIndex={-1}>Your requests stay private.</h1><p>Sign in to your own account to review connection requests.</p><button className="web-request-primary" onClick={p.onSignIn}>Sign in to CRAYS</button></main>;
  const person=p.selected;
  return <main className="web-desktop-page web-connection-requests">
    <button className="web-request-back" onClick={p.onBack}><ArrowLeft size={20}/>{p.backLabel}</button>
    <header className="web-request-heading"><h1 ref={heading} tabIndex={-1}>Connection requests</h1><p>A good connection starts with your choice.</p></header>
    <div className="web-request-working-header">
      <nav className="web-request-inboxes" aria-label="Connection request inboxes"><span aria-current="page">Received</span><a href={p.sentHref} onClick={e=>follow(e,p.onSent)}>Sent introductions</a></nav>
      <label className="web-request-search"><MagnifyingGlass size={21}/><input type="search" aria-label="Find a connection request" placeholder="Find a request…" value={p.query} onChange={e=>p.onQuery(e.target.value)}/>{p.query&&<button aria-label="Clear request search" onClick={()=>p.onQuery('')}><X size={20}/></button>}</label>
    </div>
    {(p.requests.length>1||(!person&&p.requests.length>0))&&<label className="web-request-chooser">Choose a request<select aria-label="Choose a connection request" value={person?.id||''} onChange={e=>p.onSelect(e.target.value)}><option value="" disabled>Choose a person</option>{p.requests.map(value=><option key={value.id} value={value.id}>{value.name} · {value.purpose}</option>)}</select></label>}
    {p.unavailableRecords&&<p className="web-request-feedback" role="status">Some request records need review at their original source. They are not available for a decision here.</p>}
    {p.feedback&&<p className={'web-request-feedback'+(p.feedback.ok?'':' web-request-error')} role={p.feedback.ok?'status':'alert'}>{p.feedback.message}</p>}
    {person?<ClubAdjustableRegion id={'personal-web:connection-requests:'+p.layoutScope} itemIds={['portrait','request','choice']} labels={['Request portrait','Connection request','Your choice']} className="web-request-grid" basis={['25%','44%','27%']} minWidth={160}>
      <div className="web-request-portrait"><img src={person.photo} alt={person.name}/></div>
      <article className="web-request-decision" aria-label={'Connection request from '+person.name}>
        <p className="web-request-kicker">Would like to connect</p><h2>{person.name}</h2><p className="web-request-purpose">{person.purpose}</p><p className="web-request-bio">{person.bio}</p>
        <div className="web-request-about"><p>{person.name} would like to connect for {person.purpose.toLowerCase()}. Review the profile and decide whether you’d like a private conversation.</p>{person.sharedPlaces.length>0&&<p className="web-request-shared">Shared Spots: {person.sharedPlaces.join(' · ')}</p>}<button className="web-request-text-link" onClick={p.onProfile}>View profile &amp; public work<ArrowRight size={20}/></button></div>
        <div className="web-request-actions"><button className="web-request-primary" onClick={()=>p.onRespond('Accept')}>Accept connection</button><button className="web-request-secondary" onClick={()=>p.onRespond('Decline')}>Decline</button><button className="web-request-block" onClick={()=>p.onRespond('Block')}>Block</button></div>
      </article>
      <aside className="web-request-choice"><h2>Your choice. Your conversation.</h2><p>Accepting does not invite Chuck or share your private history.</p><p>A private chat opens only after the required membership checks and both people’s agreement.</p></aside>
    </ClubAdjustableRegion>:<section className="web-request-empty"><UserPlus size={36} weight="light"/><h2>{p.selectionUnavailable?'This request is no longer available.':p.requests.length?'Choose a request.':p.query?'No matching requests.':'No new requests.'}</h2><p>{p.selectionUnavailable?'The original request changed or is no longer available. Review another current request before deciding.':p.requests.length?'Choose a person above to review the original request.':p.query?'Try another name or clear your search.':'Your connection decisions will appear here. Nothing is sent automatically.'}</p>{p.query&&<button className="web-request-secondary" onClick={()=>p.onQuery('')}>Clear search</button>}</section>}
    {p.connectedPeople.length>0&&<section className="web-request-connected"><h2>Connected VIFs</h2>{p.connectedPeople.map(person=><button key={person.id} onClick={()=>p.onConnectedProfile(person.id)}><img src={person.photo} alt=""/><span><strong>{person.name}</strong><span>Connected VIF · open profile</span></span><ArrowRight size={20}/></button>)}</section>}
    <footer className="web-request-context-links"><a href={p.discoverHref} onClick={e=>follow(e,p.onDiscover)}>Discover CRAYS Spots<ArrowRight size={21}/></a><a href={p.sentHref} onClick={e=>follow(e,p.onSent)}>Sent introductions<ArrowRight size={21}/></a></footer>
  </main>;
}
