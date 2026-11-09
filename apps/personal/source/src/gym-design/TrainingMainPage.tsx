import {useEffect,useId,useState} from 'react';
import {ArrowRight,DeviceMobile} from '@phosphor-icons/react';
import type {GymDesignPorts,GymRoute,GymHistoryContext} from './GymPrototype';
import navigation from './original-navigation.json';
import {TrainingSectionContent} from './TrainingSectionContent';
import hero from './source-media/training-unique-cable-hero.png';
import './training-main.css';
import './training-sections.css';

const sectionKeys=['navigation','hero','week','library','history','strength','settings','progress','support'];
const aliases:Record<string,string>={Plan:'Training plan',Exercises:'Exercise library'};

/** Six approved TRAIN views. Original sessions and provider permissions remain separate. */
export function TrainingMainPage({ports,onNavigate,onWorkout,hasLocalWorkout,hasFinishedWorkout,active,tab,globalAccountId,onSessionInvalidated,historyContext}:{historyContext?:GymHistoryContext;globalAccountId?:string;onSessionInvalidated?:()=>void;ports:GymDesignPorts;onNavigate:(route:GymRoute)=>void;onWorkout:(title:string)=>void;hasLocalWorkout:boolean;hasFinishedWorkout:boolean;active:boolean;tab?:string}){
 const A=ports.AdjustableRegion,id=useId();
 const resolved=aliases[tab||'']||tab||'Training home';
 const selected=navigation.subtabs.training.includes(resolved)?resolved:'Training home';
 const go=(surface:string,nextTab?:string)=>onNavigate({surface,tab:nextTab});
 const [focusFree,setFocusFree]=useState(false);
 const focusWorkout=()=>{const section=document.getElementById('gym-training-home-workouts');section?.scrollIntoView({block:'start',behavior:'auto'});section?.focus({preventScroll:true});};
 useEffect(()=>{if(active&&selected==='Training home'&&focusFree){focusWorkout();setFocusFree(false);}},[active,selected,focusFree]);
 const requestFree=()=>{if(selected==='Training home')focusWorkout();else{setFocusFree(true);go('training','Training home');}};
 return <div className="gym-training-main training-selected" hidden={!active} data-training-selected-tab={selected}>
  <A id="personal-web:gym:training:main-sections" itemIds={['navigation','hero','week','support']} retainedItemIds={sectionKeys} labels={['Training navigation','Training welcome',selected,'Training support']} className="training-selected-frame" minWidth={260} basis={['100%','100%','100%','100%']}>
   <nav className="gym-training-navigation" aria-label="Training navigation">
    <div className="gym-training-tabs" role="group" aria-label="Training and progress"><button type="button" aria-pressed onClick={()=>go('training')}>My training</button><button type="button" aria-pressed={false} onClick={()=>go('progress')}>My progress</button></div>
    <div className="gym-training-tabs" role="group" aria-label="Training tasks">{navigation.subtabs.training.map(item=><button type="button" key={item} aria-pressed={selected===item} onClick={()=>go('training',item)}>{item}</button>)}</div>
   </nav>
   <section className="gym-lifestyle-hero gym-training-hero" aria-labelledby={id+'-title'}>
    <img src={hero} alt="An athlete training with a cable machine"/>
    <div className="gym-lifestyle-hero-copy"><span className="gym-training-kicker">TRAINING</span><h1 id={id+'-title'}>Train your way.</h1><p>Build strength, move better and feel great with your training plan, or jump into a workout anytime.</p><div className="gym-training-actions"><button type="button" className="gym-design-action primary" onClick={()=>go('training','Training plan')}>Open training plan<ArrowRight size={18}/></button><button type="button" className="gym-design-action gym-training-hero-secondary" onClick={requestFree}>Start free workout<ArrowRight size={18}/></button></div></div>
   </section>
   <TrainingSectionContent historyContext={historyContext} active={active} globalAccountId={globalAccountId} onSessionInvalidated={onSessionInvalidated} hasLocalWorkout={hasLocalWorkout} hasFinishedWorkout={hasFinishedWorkout} ports={ports} tab={selected} onNavigate={onNavigate} onWorkout={onWorkout}/>
   <footer className="gym-training-support"><DeviceMobile size={32}/><div><h3>Your training, connected.</h3><p>Review your wearable sources, recovery and support options.</p></div><div className="gym-training-actions"><button type="button" className="gym-training-text-action" onClick={()=>go('connections','Devices')}>Connections<ArrowRight size={18}/></button><button type="button" className="gym-training-text-action" onClick={()=>go('health')}>Health &amp; recovery<ArrowRight size={18}/></button><button type="button" className="gym-training-text-action" onClick={()=>go('support')}>Get help<ArrowRight size={18}/></button></div></footer>
  </A>
 </div>;
}
