import {useEffect,useState,type ReactNode} from 'react';
import {ArrowRight,ChatCircle,MapPin,MagnifyingGlass,SlidersHorizontal,Fingerprint,ChartBar,CirclesFour,UsersThree} from '@phosphor-icons/react';
import './web-spot-matching.css';
export type SpotMatchPerson={id:string;name:string;image:string;bio:string;connected:boolean;canMessage:boolean;reasons:string[]};
export type SpotMatchingProps={part:'main'|'context';venueName:string;viewer:{name:string;image:string};purpose:string;onPurpose:(s:string)=>void;query:string;onQuery:(s:string)=>void;people:SpotMatchPerson[];onPerson:(id:string)=>void;onMessage:(id:string)=>void;onIntroduction:(id:string)=>void;onLocal:()=>void;onPreferences:()=>void;onTest:(i:number)=>void;onTests:()=>void;testCounts:number[];wave:ReactNode};
/** The caller supplies only currently permitted people and factual relationship reasons. */
export default function WebSpotMatching(p:SpotMatchingProps){
 const[limit,setLimit]=useState(24);useEffect(()=>setLimit(24),[p.purpose,p.query,p.venueName]);
 if(p.part==='context')return <aside className="spot-matching-context" aria-label="Your matching context">
  <section className="spot-matching-viewer"><img src={p.viewer.image} alt=""/><div><h2>{p.viewer.name}</h2><h3>Your matching</h3><p><UsersThree size={19}/>Purpose: {p.purpose}</p><p><MapPin size={19}/>This Spot’s community</p><button onClick={p.onPreferences}><SlidersHorizontal size={19}/>Edit preferences<ArrowRight size={17}/></button></div></section>
  <section className="spot-matching-tests"><h2>More about you. More personal suggestions.</h2><p>Optional tests add another perspective. You choose what is used.</p>{['MBTI','OCEAN','Predictive Index','Enneagram'].map((name,i)=>{const Icon=[Fingerprint,ChartBar,UsersThree,CirclesFour][i];return <button key={name} onClick={()=>p.onTest(i)}><Icon size={25}/><strong>{name}</strong><small>{p.testCounts[i]?p.testCounts[i]+' private result'+(p.testCounts[i]>1?'s':''):'Not added'}</small><ArrowRight size={17}/></button>;})}<button className="spot-matching-tests-explore" onClick={p.onTests}>Explore tests<ArrowRight size={18}/></button><p className="spot-matching-note">Results stay private. Matching use and sharing are separate choices. You can connect without taking a test.</p></section>
  <section className="spot-matching-wave">{p.wave}</section>
 </aside>;
 return <section className="spot-matching-main" aria-label="People matching your selected purpose">
  <div className="spot-matching-heading"><div><h2>Find your kind of company.</h2><p>People open to {p.purpose.toLowerCase()} at {p.venueName}.</p></div><button onClick={p.onLocal}><MapPin size={18}/>Here now</button></div>
  <p className="spot-matching-note">This Spot’s community · membership does not show who is here now.</p>
  <div className="spot-matching-filters"><label><MagnifyingGlass size={21}/><input aria-label="Search people in this Spot" placeholder="Find a name or an interest…" value={p.query} onChange={e=>p.onQuery(e.target.value)}/></label><div role="group" aria-label="Matching purpose">{['Socializing','Business','Dating'].map(s=><button key={s} aria-pressed={p.purpose===s} onClick={()=>p.onPurpose(s)}>{s}</button>)}</div></div>
  <p className="spot-matching-count" role="status">{p.people.length} people · {p.purpose}</p>
  <div className="spot-matching-grid">{p.people.slice(0,limit).map(person=><article key={person.id}>
   <a className="spot-match-avatar" href={'#/people/'+encodeURIComponent(person.id)} onClick={e=>{if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;e.preventDefault();p.onPerson(person.id);}}><img src={person.image} alt={'View '+person.name+'’s profile'} loading="lazy" decoding="async"/></a>
   <div className="spot-match-copy"><a href={'#/people/'+encodeURIComponent(person.id)} onClick={e=>{if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;e.preventDefault();p.onPerson(person.id);}}><h3>{person.name}</h3></a><p>{person.bio}</p>{person.reasons.map(reason=><small key={reason}><UsersThree size={15}/>{reason}</small>)}</div>
   <div className="spot-match-actions"><button onClick={()=>p.onPerson(person.id)}>View profile<ArrowRight size={16}/></button><button onClick={()=>person.canMessage?p.onMessage(person.id):p.onIntroduction(person.id)}><ChatCircle size={17}/>{person.canMessage?'Message':'Review introduction'}</button></div>
  </article>)}</div>
  {!p.people.length&&<div className="spot-matching-empty"><h3>A little room for someone new.</h3><p>No visible profiles match this purpose and search. Try another purpose or clear your search.</p><button onClick={()=>p.onQuery('')}>Clear search</button></div>}
  {p.people.length>limit&&<button className="spot-matching-more" onClick={()=>setLimit(n=>n+24)}>Show more people</button>}
 </section>;
}
