import {Children,Fragment,cloneElement,isValidElement,type ReactNode} from 'react';
import {ArrowLeft} from '@phosphor-icons/react';
import {MobileScroll} from './mobile';
import './web-spot-community-access.css';
type Props={breadcrumbs:ReactNode;back:()=>void;city:string;type:string;returnVisit:ReactNode;children:ReactNode};
const flatten=(children:ReactNode,parent='access'):ReactNode[]=>Children.toArray(children).flatMap((child,index)=>{
 const key=parent+':'+(isValidElement(child)?child.key??index:index);
 if(isValidElement<{children?:ReactNode}>(child)&&child.type===Fragment)return flatten(child.props.children,key);
 return [isValidElement(child)?cloneElement(child,{key}):child];
});
const className=(node:ReactNode)=>isValidElement<{className?:string}>(node)?node.props.className||'':'';
/** Presentation only. The caller retains the original strict-own, unique-Spot reader and original action nodes. */
export default function WebSpotCommunityAccess({breadcrumbs,back,city,type,returnVisit,children}:Props){
 const nodes=flatten(children);
 const identity=nodes.find(n=>className(n)==='community-service-context');
 const heading=nodes.find(n=>isValidElement(n)&&n.type==='h1');
 const remaining=nodes.filter(n=>n!==identity&&n!==heading);
 return <MobileScroll><article className="web-spot-community-access">
  <nav className="web-spot-community-access-path" aria-label="Page path">{breadcrumbs}</nav>
  <div className="web-spot-community-access-columns"><main>
   <header className="web-spot-community-access-heading">{heading}<button onClick={back}><ArrowLeft size={20}/>Back</button></header>
   {remaining.map(node=>isValidElement<{children?:ReactNode}>(node)&&node.type==='p'&&typeof node.props.children==='string'&&node.props.children.startsWith('Your private conversations remain available')?cloneElement(node,undefined,'Your private conversations remain available. Local check-in and social visibility are separate choices.'):node)}
  </main><aside aria-label="About this Spot">{identity}<p className="web-spot-community-access-location">{city} · {type}</p><div className="web-spot-community-access-return">{returnVisit}</div></aside></div>
 </article></MobileScroll>;
}
