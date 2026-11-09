import {Children,Fragment,cloneElement,isValidElement,type ReactNode} from 'react';
import {ArrowLeft,CaretDown,CaretRight} from '@phosphor-icons/react';
import {MobileScroll} from './mobile';
import './web-spot-house-rules.css';

type Props={ownContext:boolean;name:string;city:string;type:string;breadcrumbs:ReactNode;back:()=>void;chuck:ReactNode;children:ReactNode};
const flatten=(children:ReactNode,parent='rules'):ReactNode[]=>Children.toArray(children).flatMap((child,index)=>{
 const key=parent+':'+(isValidElement(child)?child.key??index:index);
 if(isValidElement<{children?:ReactNode}>(child)&&child.type===Fragment)return flatten(child.props.children,key);
 return [isValidElement(child)?cloneElement(child,{key}):child];
});
const cls=(node:ReactNode)=>isValidElement<{className?:string}>(node)?node.props.className||'':'';
const title=(node:ReactNode)=>isValidElement<{title?:string}>(node)?node.props.title:'';
const guidance=(node:ReactNode)=>{
 if(!isValidElement<{children?:ReactNode}>(node))return node;
 return cloneElement(node,undefined,...Children.toArray(node.props.children).flatMap<ReactNode>(child=>isValidElement<{children?:ReactNode}>(child)&&child.type==='h2'
  ?[cloneElement(child,undefined,'General guidance')]
  :isValidElement(child)&&child.type==='p'?[child,<p className="web-spot-rules-note" key="additional-rules">No additional rules from this Spot have been supplied.</p>]:[child]));
};
const disclosure=(node:ReactNode)=>isValidElement<{children?:ReactNode}>(node)?cloneElement(node,undefined,...Children.toArray(node.props.children).map(child=>isValidElement<{children?:ReactNode}>(child)&&child.type==='summary'?cloneElement(child,undefined,<span>{child.props.children}</span>,<CaretDown size={20} aria-hidden="true"/>):child)):node;
/** Presentation only: original rules, context, permissions and callbacks stay in VenuePanel. */
export default function WebSpotHouseRules({ownContext,name,city,type,breadcrumbs,back,chuck,children}:Props){
 const source=Children.toArray(children)[0];
 const nodes=isValidElement<{children?:ReactNode}>(source)?flatten(source.props.children):[];
 const photo=nodes.find(n=>cls(n)==='venue-cover');
 const about=nodes.find(n=>cls(n)==='venue-about-details');
 const rules=nodes.find(n=>cls(n)==='venue-rules');
 const access=nodes.find(n=>cls(n)==='venue-access-details');
 const status=nodes.find(n=>cls(n)==='venue-access-strip');
 const sideRows=nodes.filter(n=>['Map & directions','Contact this venue','Visit reviews'].includes(title(n)||''));
 const photos=nodes.find(n=>isValidElement<{children?:ReactNode}>(n)&&n.type==='button'&&String(n.props.children).trim()==='View all venue photos');
 const open=nodes.find(n=>isValidElement<{children?:ReactNode}>(n)&&n.type==='button'&&String(n.props.children).trim()==='Open Venue Spot');
 const extracted=new Set([photo,about,rules,access,status,photos,open,...sideRows]);
 const remaining=nodes.filter(n=>!extracted.has(n)&&cls(n)!=='eyebrow'&&!(isValidElement(n)&&n.type==='h1'));
 return <MobileScroll><article className="web-spot-rules">
  <nav className="web-spot-rules-path" aria-label="Page path">{breadcrumbs}</nav>
  <header className="web-spot-rules-heading"><h1>House rules &amp; access</h1><div>{chuck}<button className="web-spot-rules-back" onClick={back}><ArrowLeft size={20}/>Back</button></div></header>
  <div className="web-spot-rules-columns">
   <main className="web-spot-rules-main">
    {guidance(rules)}{ownContext?status:<p className="web-spot-rules-note" role="status">Sign in to review your community access and local check-in.</p>}{ownContext&&disclosure(access)}{remaining.map(n=>!ownContext&&isValidElement<{title?:string;subtitle?:string}>(n)&&n.props.title==='Community timeline'?cloneElement(n,{subtitle:'Review community access'}):!ownContext&&isValidElement<{title?:string;subtitle?:string}>(n)&&n.props.title==='People here now'?cloneElement(n,{subtitle:'Requires current local context'}):n)}
   </main>
   <aside className="web-spot-rules-context" aria-label="About this Spot">
    {photo}<h2>{name}</h2><p className="web-spot-rules-location">{city} · {type}</p>
    {disclosure(about)}<div className="web-spot-rules-links">{isValidElement<{className?:string}>(photos)?cloneElement(photos,{className:(photos.props.className||'')+' web-spot-rules-photos'},<span>Photos</span>,<CaretRight size={21}/>):photos}{sideRows.map(n=>isValidElement<{title?:string}>(n)&&n.props.title==='Contact this venue'?cloneElement(n,{title:'Contact this Spot'}):n)}{open}</div>
   </aside>
  </div>
 </article></MobileScroll>;
}
