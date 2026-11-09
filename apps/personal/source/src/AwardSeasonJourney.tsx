import {propsSeasonPhases} from './propsSeasonPhases';
import {Flag,Users,Trophy,Confetti,Star,ArrowUpRight} from '@phosphor-icons/react';
/** Planned annual process; current ranks never imply a completed stage or winner. */
export function AwardSeasonJourney({onNominate,onRace,onEvent}:{onNominate:()=>void;onRace:()=>void;onEvent:()=>void}){
 const icons={nomination:Flag,'category-race':Users,'top-100':Trophy,'top-3':Trophy,finals:Confetti,winner:Star};
 const actions={nomination:onNominate,race:onRace,event:onEvent};
 const steps=propsSeasonPhases.map(phase=>({...phase,icon:icons[phase.id],open:actions[phase.destination]}));
 return <section className="award-season-journey" aria-labelledby="award-season-title"><h2 id="award-season-title">From the first story<br/>to a lasting mark.</h2><div>{steps.map((s,i)=><button key={s.title} onClick={s.open}><span className="award-season-step">{String(i+1).padStart(2,'0')}</span><s.icon size={25}/><span><strong>{s.title}</strong><small>{s.detail}</small></span><ArrowUpRight size={17}/></button>)}</div><p>Annual process preview. Current positions are provisional; no winner or prize is confirmed.</p></section>;
}
