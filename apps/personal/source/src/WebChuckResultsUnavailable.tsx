import {ArrowRight,ChatCircle,Folder} from '@phosphor-icons/react';
import {personalNavigationHref} from './webPersonalNavigation';
import type {MouseEvent,ReactNode} from 'react';
type Props={canonicalNavigation?:boolean;onConversation:()=>void;onFiles:()=>void};
/** Uses existing conversation/source routes only; no output record is inferred. */
export default function WebChuckResultsUnavailable({canonicalNavigation,onConversation,onFiles}:Props){
 const action=(label:string,href:string,onOpen:()=>void,icon:ReactNode)=>canonicalNavigation?<a className="chuck-s1-link chuck-s1-route-link" href={href} onClick={(event:MouseEvent<HTMLAnchorElement>)=>{if(event.button===0&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey&&!event.altKey){event.preventDefault();onOpen();}}}>{icon}{label}<ArrowRight size={18}/></a>:<button type="button" className="chuck-s1-link" onClick={onOpen}>{icon}{label}<ArrowRight size={18}/></button>;
 return <section className="chuck-s1-insights" aria-label="Find your Chuck work"><Folder size={26} aria-hidden="true"/><div><h3>Continue with your work</h3><p role="status">Your completed task results are currently unavailable.</p><p>You can open your Chuck conversation to review your requests. Files you have saved are available in Knowledge.</p><nav className="chuck-results-recovery-actions" aria-label="Continue from Results">{action('Open Chuck conversation',personalNavigationHref({name:'conversation',id:'chuck'}),onConversation,<ChatCircle size={20} aria-hidden="true"/>)}{action('View saved files',personalNavigationHref({name:'chuckKnowledgeSources'}),onFiles,<Folder size={20} aria-hidden="true"/>)}</nav></div></section>;
}
