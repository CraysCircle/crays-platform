import type {ReactNode} from 'react';
import {ClubAdjustableRegion} from './WebAdjustableRegion';
import './web-spot-place.css';
type Props={mode:'Visit'|'Services';layoutScope:string;name:string;image?:string;description?:string;primaryDescription?:string;status?:ReactNode;arrival?:ReactNode;primary?:ReactNode;news?:ReactNode;community?:ReactNode;info?:ReactNode;catalogue:ReactNode;services:ReactNode;plans:ReactNode;bookings?:ReactNode;manage?:ReactNode;perks?:ReactNode;help?:ReactNode;lostFound?:ReactNode};
/** Desktop composition only. Every interactive slot and eligibility check belongs to the original PlaceExperience. */
export default function WebSpotPlace(p:Props){
 const visit=p.mode==='Visit';
 return <section className={'web-spot-place web-spot-place-'+p.mode.toLowerCase()} aria-label={visit?'Your visit to '+p.name:'Services at '+p.name}>
  <ClubAdjustableRegion id={'personal-web:spot-'+p.mode.toLowerCase()+':'+p.layoutScope} itemIds={['main','context']} labels={[visit?'Your visit and plans':'Services and experiences',visit?'House information':'Bookings and help']} className="web-spot-place-columns" basis={['72%','28%']} minWidth={250}>
   <section className="web-spot-place-main">
    {visit&&<><header className="web-spot-visit-heading"><div><h2>Your visit</h2>{p.status}</div>{p.arrival}</header><div className="web-spot-visit-welcome"><img src={p.image} alt={'Illustrative view of '+p.name}/><div>{p.primaryDescription&&<p className="web-spot-primary-description">{p.primaryDescription}</p>}{p.primary}</div></div></>}
    {p.manage}{p.catalogue}
    <section className="web-spot-place-services" aria-label="More services at this Spot">{p.services}</section>
    <div className="web-spot-place-plans">{p.plans}</div>
   </section>
   <aside className="web-spot-place-context" aria-label={visit?'House information':'Bookings and help'}>
    {visit?<>{p.info}{p.news}{p.community}</>:<>{p.bookings}{p.perks}<section className="web-spot-place-support">{p.help}{p.lostFound}</section></>}
   </aside>
  </ClubAdjustableRegion>
 </section>;
}
