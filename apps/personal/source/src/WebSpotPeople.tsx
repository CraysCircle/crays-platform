import type {ReactNode} from 'react';
import {MapPin,QrCode,UsersThree,CaretRight} from '@phosphor-icons/react';
import {ClubAdjustableRegion} from './WebAdjustableRegion';
import './web-spot-people.css';

type Person={id:string;name:string;image:string;label:string};
type Props={people:Person[];localPresence:boolean;onLocal:()=>void;onExplore:()=>void;onConnect:()=>void;onPerson:(id:string)=>void;wave:ReactNode;layoutScope:string};

/** Presentation only. Source discovery, presence and communication policies stay in the caller. */
export default function WebSpotPeople(p:Props){
 return <section className="web-spot-people" aria-label="People in this Spot">
  <ClubAdjustableRegion id={'personal-web:spot-people:'+p.layoutScope} itemIds={['community','local']} labels={['Community between visits','Local discovery']} className="web-spot-people-columns" basis={['61%','39%']} minWidth={250}>
   <section className="web-spot-people-community">
    <p className="web-spot-people-eyebrow">Your community, between visits</p>
    <h2>Good company.</h2>
    <p className="web-spot-people-caption">Shared Spot membership · not a live attendance list</p>
    {p.people.length?<div className="web-spot-people-members">{p.people.map(person=><button key={person.id} onClick={()=>p.onPerson(person.id)}><img src={person.image} alt=""/><span><strong>{person.name}</strong><small>{person.label}</small></span><CaretRight size={21}/></button>)}</div>:<div className="web-spot-people-empty"><UsersThree size={44} weight="light"/><div><h3>Connections take a little time.</h3><p>No permitted member profiles are available here yet. Join a house conversation or ask Chuck for an introduction.</p></div></div>}
    <div className="web-spot-people-next"><button className="web-spot-people-explore" onClick={p.onExplore}>Explore this community</button><button className="web-spot-people-connect" onClick={p.onConnect}><QrCode size={24}/>Connect in person</button></div>
   </section>
   <aside className="web-spot-people-local" aria-label="Discover nearby">
    <section className="web-spot-people-presence"><MapPin size={35} weight="light"/><div><h3>People here now</h3><p>{p.localPresence?'Meet people who chose to be visible.':'Scan at the Spot to discover who’s here.'}</p><button onClick={p.onLocal}>People here now<CaretRight size={21}/></button></div></section>
    <div className="web-spot-people-wave">{p.wave}</div>
   </aside>
  </ClubAdjustableRegion>
 </section>;
}
