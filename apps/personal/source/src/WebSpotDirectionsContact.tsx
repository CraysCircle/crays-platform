import type {ReactNode} from 'react';
import {ArrowLeft,CaretRight,MapTrifold,Info} from '@phosphor-icons/react';
import {MobileScroll} from './mobile';
import './web-spot-directions-contact.css';
export const contactMethods=['Email','Phone','Share venue link'] as const;
export type SpotContactMethod=typeof contactMethods[number];
type Props={kind:'map'|'venue-contact';name:string;city:string;type:string;image?:string;breadcrumbs:ReactNode;back:()=>void;returnLink:ReactNode;related:ReactNode;feedback:ReactNode;prepare:()=>void;method:SpotContactMethod;onMethod:(method:SpotContactMethod)=>void};
/** Source-owned callbacks/data only. Neither a map provider nor a contact transport. */
export default function WebSpotDirectionsContact(p:Props){
 const map=p.kind==='map';
 const missing=p.method==='Email'?'Email address not available':p.method==='Phone'?'Phone number not available':'Share a Spot reference';
 const note=p.method==='Email'?'This Spot has not supplied an email address. You can still prepare a draft.':p.method==='Phone'?'This Spot has not supplied a phone number. You can still prepare a draft.':'Prepare a draft referring to this Spot. No link is shared automatically.';
 return <MobileScroll><article className="web-spot-destination">
  <nav className="web-spot-destination-path" aria-label="Page path">{p.breadcrumbs}</nav>
  <header className="web-spot-destination-heading"><h1>{map?'Map & directions':'Contact this Spot'}</h1><button onClick={p.back}><ArrowLeft size={20}/>Back</button></header>
  <div className="web-spot-destination-columns">
   <main>
    {map?<><section className="web-spot-destination-location"><h2>Your destination</h2><strong>{p.name}</strong><p>{p.city}</p></section>
     <section className="web-spot-destination-notice"><MapTrifold size={24}/><div><h2>Map not available</h2><p>An exact address and a map have not been supplied for this Spot.</p></div></section>
     <h2>Directions draft</h2><p>You can prepare a destination draft using the city. No map app will open.</p>
    </>:<><h2>Choose how to get in touch</h2><p>Prepare a contact draft for this Spot. Nothing is sent or opened automatically.</p>
     <label className="web-spot-destination-method"><span>Contact method</span><select value={p.method} onChange={e=>{const method=contactMethods.find(v=>v===e.target.value);if(method)p.onMethod(method);}}>{contactMethods.map(method=><option key={method}>{method}</option>)}</select></label>
     <section className="web-spot-destination-notice"><Info size={24}/><div><h2>{missing}</h2><p>{note}</p></div></section>
    </>}
    <button className="web-spot-destination-prepare" onClick={p.prepare}>{map?'Prepare directions draft':'Prepare contact draft'}<CaretRight size={20}/></button>
    {p.feedback}
    <nav className="web-spot-destination-related" aria-label="Related Spot information">{p.related}</nav>
   </main>
   <aside aria-label="About this Spot">{p.image&&<img src={p.image} alt={'Illustrative view of '+p.name}/>}<h2>{p.name}</h2><p>{p.city}</p><p>{p.type}</p><div className="web-spot-destination-return">{p.returnLink}</div></aside>
  </div>
 </article></MobileScroll>;
}
