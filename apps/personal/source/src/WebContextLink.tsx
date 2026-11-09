import type {MouseEvent,ReactNode} from 'react';
import {personalNavigationHref,type PersonalNavigationRoute} from './webPersonalNavigation';
import './web-context-link.css';

/** One original destination: normal SPA activation and ordinary browser link behaviour. */
export function WebContextLink({route,onOpen,children}:{route:PersonalNavigationRoute;onOpen:()=>void;children:ReactNode}){
 const base=window.location.pathname==='/__qa__/personal'?'/__qa__/personal':'/';
 const activate=(event:MouseEvent<HTMLAnchorElement>)=>{
  if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  event.preventDefault();onOpen();
 };
 return <a className="web-context-link" href={personalNavigationHref(route,base)} onClick={activate}>{children}</a>;
}
