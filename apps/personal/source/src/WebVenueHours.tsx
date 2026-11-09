import {Children,Fragment,cloneElement,isValidElement,type ReactNode} from 'react';
import {ArrowLeft,CaretDown} from '@phosphor-icons/react';
import {MobileScroll} from './mobile';
import './web-venue-hours.css';

export type VenueHoursDesktop = {breadcrumbs:ReactNode;back:()=>void;returnLink:ReactNode};
type Props={desktop?:VenueHoursDesktop;name:string;location?:string;children:ReactNode};
const flatten=(children:ReactNode,parent='hours'):ReactNode[]=>Children.toArray(children).flatMap((child,index)=>{
 const key=parent+':'+(isValidElement(child)?child.key??index:index);
 if(isValidElement<{children?:ReactNode}>(child)&&child.type===Fragment)return flatten(child.props.children,key);
 return [isValidElement(child)?cloneElement(child,{key}):child];
});
const cls=(node:ReactNode)=>isValidElement<{className?:string}>(node)?node.props.className||'':'';
const present=(node:ReactNode)=>{
 if(cls(node)!=='hours-examples'||!isValidElement<{children?:ReactNode}>(node))return node;
 return cloneElement(node,undefined,...Children.toArray(node.props.children).map(child=>isValidElement(child)&&child.type==='summary'
  ?cloneElement(child,undefined,<span><strong>Schedule examples</strong><small>Clearly labelled fictional examples. They do not replace published hours.</small></span>,<CaretDown size={20}/>):child));
};

/** Rearranges original hours elements only. Source evaluation and actions stay in the workspace. */
export function WebVenueHours({desktop,name,location,children}:Props){
 if(!desktop)return <MobileScroll>{children}</MobileScroll>;
 const main=Children.toArray(children)[0];
 const nodes=isValidElement<{children?:ReactNode}>(main)?flatten(main.props.children):[];
 const photo=nodes.find(n=>cls(n)==='venue-hours-photo');
 const heading=nodes.find(n=>isValidElement(n)&&n.type==='h1');
 return <MobileScroll><article className="web-venue-hours">
  <nav className="web-venue-hours-path" aria-label="Page path">{desktop.breadcrumbs}</nav>
  <header className="web-venue-hours-heading"><h1>Opening hours</h1><button onClick={desktop.back}><ArrowLeft size={20}/>Back</button></header>
  <div className="web-venue-hours-columns">
   <main className="venue-hours web-venue-hours-main">
    {isValidElement<{children?:ReactNode}>(heading)&&<h2>{heading.props.children}</h2>}
    {nodes.filter(n=>n!==photo&&n!==heading&&cls(n)!=='eyebrow').map(present)}
   </main>
   <aside className="web-venue-hours-context" aria-label="About this location">
    {photo}<h2>{name}</h2>{location&&<p>{location}</p>}
    <div className="web-venue-hours-return">{desktop.returnLink}</div>
   </aside>
  </div>
 </article></MobileScroll>;
}
