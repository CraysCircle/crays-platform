import {Children,Fragment,cloneElement,isValidElement,type ReactNode} from 'react';
import {WebSpotLayout} from './WebExploreLayouts';
import {useSpotCreatePlacement} from './SpotCreatePlacement';
import './web-personal-spots.css';
import './web-spot-detail.css';

type Props={web:boolean;legacyWeb:boolean;name:string;location:string;parent:string;onBack:()=>void;children:ReactNode};
const flatten=(children:ReactNode):ReactNode[]=>Children.toArray(children).flatMap(child=>isValidElement<{children?:ReactNode}>(child)&&child.type===Fragment?flatten(child.props.children):[child]);
const className=(child:ReactNode)=>isValidElement<{className?:string}>(child)?child.props.className||'':'';

/** Presentation of the same original Venue Spot. All actions and access stay in PlaceExperience. */
export default function WebSpotDetail(p:Props){
 const placement=useSpotCreatePlacement();
 if(!p.web)return <WebSpotLayout web={p.legacyWeb} name={p.name} parent={p.parent} onBack={p.onBack}>{p.children}</WebSpotLayout>;
 const nodes=flatten(p.children),hero=nodes.find(n=>className(n)==='space-hero'),identity=nodes.find(n=>className(n)==='space-community-identity'),tabs=nodes.find(n=>className(n).includes('venue-sections'));
 const identityChildren=isValidElement<{children?:ReactNode}>(identity)?flatten(identity.props.children):[],chuck=identityChildren.find(n=>className(n)==='space-chuck-button');
 const title=isValidElement<{children?:ReactNode}>(identity)?cloneElement(identity,undefined,...identityChildren.filter(n=>n!==chuck)):identity;
 return <article className="web-spots-editorial web-desktop-page web-spot-detail">
  <header className="web-spot-detail-intro"><div><nav className="web-spot-detail-path" aria-label="Page path"><button onClick={p.onBack}>{p.parent}</button><span aria-hidden="true">/</span><span>{p.name}</span></nav>{title}<p>{p.location}</p></div>{hero}{chuck}</header>
  {tabs}
  <div className="web-spot-detail-create-target" ref={placement?.setTarget}/>
  <div className="web-spot-detail-body">{nodes.filter(n=>n!==hero&&n!==identity&&n!==tabs)}</div>
 </article>;
}
