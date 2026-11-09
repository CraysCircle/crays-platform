import {useId,useState,type ReactNode,type KeyboardEvent} from 'react';
import {ArrowLeft,DotsThree,User} from '@phosphor-icons/react';
import './member-profile.css';

/** Presentation only. Original profile, offer, contact and media guards stay in the caller. */
export function MemberProfileWorkspace({name,photo,handle,bio,badges,links,actions,onMore,onBack,backLabel='Back',tabs,activeTab,onTab,aside,feedback,children}:{
 name:string;photo?:string|null;handle?:string;bio?:string|null;badges?:ReactNode;links?:ReactNode;
 actions?:ReactNode;onMore?:()=>void;onBack:()=>void;backLabel?:string;tabs:readonly string[];
 activeTab:string;onTab:(tab:string)=>void;aside?:ReactNode;feedback?:ReactNode;children:ReactNode;
}){
 const id=useId(),active=tabs.includes(activeTab)?activeTab:tabs[0];
 const [failedPhoto,setFailedPhoto]=useState<string|null>(null);
 const keys=(event:KeyboardEvent<HTMLDivElement>)=>{
  const buttons=Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
  const index=buttons.indexOf(document.activeElement as HTMLButtonElement);
  const next=event.key==='ArrowRight'?(index+1)%buttons.length:event.key==='ArrowLeft'?(index+buttons.length-1)%buttons.length:event.key==='Home'?0:event.key==='End'?buttons.length-1:-1;
  if(next<0||!buttons[next])return;
  event.preventDefault();buttons[next].focus();buttons[next].click();
 };
 return <main className="member-profile-workspace" aria-label={`${name}'s profile`}>
  <div className="mp-main">
   <button className="mp-back" onClick={onBack}><ArrowLeft size={18}/>{backLabel}</button>
   <header className="mp-header">
    <div className="mp-photo">{photo&&photo!==failedPhoto?<img src={photo} alt={`${name}'s profile photo`} referrerPolicy="no-referrer" onError={()=>setFailedPhoto(photo)}/>:<User size={42} role="img" aria-label={`${name}'s profile photo unavailable`}/>}</div>
    <div className="mp-identity"><h1>{name}</h1>{handle&&<p className="mp-handle">{handle}</p>}{badges}<p className="mp-bio">{bio}</p>{links}</div>
    <div className="mp-actions">{actions}{onMore&&<button className="mp-more" aria-label={`More about ${name}`} onClick={onMore}><DotsThree size={24}/></button>}</div>
   </header>
   {feedback}
   <div className="mp-tabs" role="tablist" aria-label={`${name}'s profile sections`} onKeyDown={keys}>
    {tabs.map((tab,index)=><button key={tab} id={`${id}-tab-${index}`} role="tab" aria-selected={active===tab} aria-controls={`${id}-content`} tabIndex={active===tab?0:-1} onClick={()=>onTab(tab)}>{tab}</button>)}
   </div>
   <section className="mp-content" id={`${id}-content`} role="tabpanel" aria-labelledby={`${id}-tab-${tabs.indexOf(active)}`} tabIndex={0}>{children}</section>
  </div>
  {aside&&<aside className="mp-aside" aria-label="Profile connections and content">{aside}</aside>}
 </main>;
}
