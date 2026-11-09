import {useCallback,useEffect,useId,useState} from 'react';
import {ArrowRight} from '@phosphor-icons/react';
import type {GymDesignPorts,GymRoute} from '../gym-design/GymPrototype';
import {useHealthAccess} from './useHealthData';
import {useMemberProgress} from './useMemberProgress';
import {ProgressSectionLayout} from './ProgressSectionLayout';
import {ProgressProvider,ProgressReadStatus} from './ProgressWidgets';
import hero from './progress-original-hero.jpg';
import './progress-main.css';
export const memberProgressTabs=['Overview','Goals','Habits','Measurements','Gallery','Weekly review','Challenges','Sharing','Privacy'] as const;
export function MemberProgressPage({tab,onNavigate,ports,globalAccountId,onSessionInvalidated}:{tab?:string;onNavigate:(route:GymRoute)=>void;ports:GymDesignPorts;globalAccountId?:string;onSessionInvalidated?:()=>void}){
 const access=useHealthAccess(true,globalAccountId,onSessionInvalidated);
 const owner=access.access?.kind==='ready'?access.access.ownerKey:globalAccountId??'';
 // All drafts, local photo previews and selections unmount on an account change.
 return <ProgressOwner key={owner} tab={tab} onNavigate={onNavigate} ports={ports} access={access}/>;
}
function ProgressOwner({tab,onNavigate,ports,access}:{tab?:string;onNavigate:(route:GymRoute)=>void;ports:GymDesignPorts;access:ReturnType<typeof useHealthAccess>}){
 const selected=memberProgressTabs.find(x=>x===tab)??'Overview',A=ports.AdjustableRegion,id=useId();
 const data=useMemberProgress(true,access.access,access.invalidate);
 const [drafts,setDrafts]=useState<Record<string,string>>({}),[selection,setSelection]=useState<Record<string,string>>({}),[notice,setNotice]=useState('');
 const setDraft=useCallback((key:string,value:string)=>setDrafts(previous=>({...previous,[key]:value})),[]);
 const select=useCallback((key:string,value:string)=>setSelection(previous=>({...previous,[key]:value})),[]);
 const navigate=useCallback((next:string)=>onNavigate({surface:'progress',tab:next}),[onNavigate]);
 useEffect(()=>setNotice(''),[selected]);
 return <div className="pg-mock" data-member-progress-page>
  <ProgressProvider value={{data,drafts,setDraft,selected:selection,select,navigate,notice:setNotice}}>
   <A id="personal-web:gym:progress:main-sections" itemIds={['navigation','hero','body','support']} retainedItemIds={['navigation','hero','body','support']} labels={['Training navigation','Progress welcome',selected,'Progress support']} className="pg-main-frame" minWidth={260} basis={['100%','100%','100%','100%']}>
    <div><nav className="pg-tabs" aria-label="Training and progress"><button type="button" aria-pressed={false} onClick={()=>onNavigate({surface:'training'})}>My training</button><button type="button" aria-pressed onClick={()=>navigate('Overview')}>My progress</button></nav><nav className="pg-tabs" aria-label="Progress tasks">{memberProgressTabs.map(name=><button key={name} type="button" aria-pressed={selected===name} onClick={()=>navigate(name)}>{name}</button>)}</nav></div>
    <header className="pg-hero"><img src={hero} alt=""/><div className="pg-hero-copy"><small>MY PROGRESS · {selected.toUpperCase()}</small><h1 id={id}>Progress that feels like you.</h1><p>Your goals, your rhythm.<br/>A clear view of the progress you choose to record.</p></div></header>
    <div data-progress-tab={selected} aria-labelledby={id}><ProgressReadStatus data={data}/>{notice&&<p role="status">{notice}</p>}<ProgressSectionLayout key={selected} tab={selected} ports={ports}/></div>
    <footer className="pg-footer"><div><strong>Your progress stays personal.</strong><p>Your records and permissions remain under your control.</p></div><div className="pg-actions"><button type="button" className="pg-button" onClick={()=>onNavigate({surface:'support'})}>Help with progress<ArrowRight size={18}/></button></div></footer>
   </A>
  </ProgressProvider>
 </div>;
}
