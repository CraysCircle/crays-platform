import {BookOpen,CalendarBlank,ChartBar,Gear,House,UsersThree} from '@phosphor-icons/react';
import type {KeyboardEvent} from 'react';
import {personalNavigationHref} from './webPersonalNavigation';
const tabs=[['Overview',House,'chuck'],['Tasks & planning',CalendarBlank,'chuckTasks'],['People',UsersThree,'chuckPeople'],['Knowledge',BookOpen,'chuckKnowledge'],['Results',ChartBar,'chuckResults']] as const;
export default function ChuckWorkspaceHeader({selected,onTab,onApps,canonicalNavigation=false,panelId}:{selected:string;onTab:(tab:string)=>void;onApps:()=>void;canonicalNavigation?:boolean;panelId?:string}){
 const move=(event:KeyboardEvent<HTMLElement>,index:number)=>{
  if(event.key===' '&&!event.ctrlKey&&!event.metaKey&&!event.altKey){event.preventDefault();event.currentTarget.click();return;}
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
  event.preventDefault();const nodes=[...event.currentTarget.parentElement!.querySelectorAll<HTMLElement>('[role=tab]')];
  const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
  const target=nodes[next],href=target.getAttribute('href');target.click();
  if(!href){target.focus();return;}
  const destination=new URL(href,window.location.href).href;
  // The original flow first restores destination focus. A keyboard tab change
  // then focuses its active tab, without overriding subsequent typing/navigation.
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
   if(window.location.href!==destination)return;
   const root=document.querySelector('[data-testid="flow-current"]'),active=document.activeElement;
   if(!root||active instanceof HTMLElement&&root.contains(active)&&active.matches('input,textarea,select,[contenteditable=true]'))return;
   root.querySelector<HTMLElement>('nav[aria-label="Chuck workspace"] [role=tab][aria-selected=true]')?.focus({preventScroll:true});
  }));
 };
 return <header className="chuck-s1-header"><div className="chuck-s1-brand"><img src="/assets/crays/chuck.png" alt=""/><h1>Chuck</h1><span>Your personal workspace</span></div>{canonicalNavigation?<a className="chuck-s1-link chuck-s1-route-link" href={personalNavigationHref({name:'apps'})} onClick={event=>{if(event.button===0&&!event.metaKey&&!event.ctrlKey&&!event.shiftKey&&!event.altKey){event.preventDefault();onApps();}}}><Gear size={20}/>Apps &amp; permissions</a>:<button className="chuck-s1-link" onClick={onApps}><Gear size={20}/>Apps &amp; permissions</button>}<nav role="tablist" aria-label="Chuck workspace">{tabs.map(([label,Icon,name],index)=>canonicalNavigation?<a key={label} href={personalNavigationHref({name})} role="tab" aria-controls={panelId} aria-selected={selected===label} aria-current={selected===label?'page':undefined} tabIndex={selected===label?0:-1} onClick={event=>{if(event.button===0&&!event.metaKey&&!event.ctrlKey&&!event.shiftKey&&!event.altKey){event.preventDefault();if(selected!==label||event.currentTarget.href!==window.location.href)onTab(label);}}} onKeyDown={event=>move(event,index)}><Icon size={21}/>{label}</a>:<button key={label} role="tab" aria-controls={panelId} aria-selected={selected===label} tabIndex={selected===label?0:-1} onClick={()=>onTab(label)} onKeyDown={event=>move(event,index)}><Icon size={21}/>{label}</button>)}</nav></header>;
}
