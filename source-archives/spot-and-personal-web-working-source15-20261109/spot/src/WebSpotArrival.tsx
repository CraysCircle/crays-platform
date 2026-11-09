import {Children,Fragment,cloneElement,isValidElement,type ReactNode} from 'react';
import {ArrowLeft} from '@phosphor-icons/react';
import {MobileScroll} from './mobile';
import './web-spot-arrival.css';
type Props={back:()=>void;breadcrumbs:ReactNode;venue?:{name:string;city:string;image?:string};contextNote?:string;children:ReactNode};
const flatten=(children:ReactNode,parent='arrival'):ReactNode[]=>Children.toArray(children).flatMap((child,index)=>{
 const key=parent+':'+(isValidElement(child)?child.key??index:index);
 if(isValidElement<{children?:ReactNode}>(child)&&child.type===Fragment)return flatten(child.props.children,key);
 return [isValidElement(child)?cloneElement(child,{key}):child];
});
const title=(node:ReactNode)=>isValidElement<{title?:string}>(node)?node.props.title:undefined;
/** Pure composition of the existing SpotArrival nodes. All actions and guards remain in their original source. */
export default function WebSpotArrival({back,breadcrumbs,venue,contextNote,children}:Props){
 const source=Children.toArray(children)[0];
 const nodes=isValidElement<{children?:ReactNode}>(source)?flatten(source.props.children):[];
 const quick=nodes.filter(n=>['Food & drinks','Shop this Spot','Your bookings & orders','Payments & receipts'].includes(title(n)||''));
 const context=nodes.filter(n=>['Explore this Spot','Ask Chuck here'].includes(title(n)||''));
 const heading=nodes.find(n=>isValidElement(n)&&n.type==='h2');
 const disclosure=nodes.find(n=>isValidElement(n)&&n.type==='details');
 const offers=nodes.find(n=>isValidElement<{onOffer?:unknown;world?:unknown}>(n)&&typeof n.props.onOffer==='function'&&!!n.props.world);
 const unavailableHeading=nodes.find(n=>isValidElement(n)&&n.type==='h1');
 return <MobileScroll><main className="web-spot-arrival"><div className="web-spot-arrival-layout">
  <nav className="web-spot-arrival-path" aria-label="Page path">{breadcrumbs}</nav>
  <header className="web-spot-arrival-heading">{venue?<h1>Your Spot</h1>:unavailableHeading}<button onClick={back}><ArrowLeft size={20}/>Back</button></header>
  {venue?<><section className="web-spot-arrival-quick" aria-label="What would you like?">{heading}<div>{quick}</div></section>
   <div className="web-spot-arrival-services">{disclosure}</div>
   <aside className="web-spot-arrival-context" aria-label="About this Spot">{venue.image&&<img className="web-spot-arrival-photo" src={venue.image} alt={`${venue.name}, illustrative Spot image`}/>}<div className="web-spot-arrival-identity"><h2>{venue.name}</h2><p>{venue.city}</p></div><p className="web-spot-arrival-note">{contextNote}</p><div className="web-spot-arrival-context-links">{context}</div></aside>
   <div className="web-spot-arrival-catalogue">{isValidElement<{desktop?:boolean}>(offers)?cloneElement(offers,{desktop:true}):offers}</div>
  </>:<section className="web-spot-arrival-unavailable">{nodes.filter(n=>n!==unavailableHeading)}</section>}
 </div></main></MobileScroll>;
}
