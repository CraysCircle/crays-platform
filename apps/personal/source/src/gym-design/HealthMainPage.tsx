import {useEffect,useId,useRef} from 'react';
import {HealthSectionContent} from './HealthSectionContent';
import {ArrowRight,ArrowsLeftRight,Barbell,Devices,DownloadSimple,GenderFemale,Heart,Heartbeat,Lock,Moon,PersonSimpleWalk,ShieldCheck,UploadSimple,Watch,ForkKnife} from '@phosphor-icons/react';
import type {GymDesignPorts,GymRoute} from './GymPrototype';
import navigation from './original-navigation.json';
import hero from './source-media/health-unique-wellbeing-hero.png';
import body from './source-media/health-original-body-deadlift.jpg';
import metabolic from './source-media/health-original-metabolic-bowl.webp';
import assessment from './source-media/health-original-assessment.png';
import sleep from './source-media/health-sleep-recovery-generated.png';
import cardio from './source-media/health-original-cardio.jpg';
import mind from './source-media/health-original-mind.jpg';
import mobility from './source-media/health-original-mobility.jpg';
import women from './source-media/member-training-hero-v2.png';
import './health-main.css';

/** Overview presentation only. No original readings, source authorization or health records are inferred. */
export function HealthMainPage({ports,onNavigate,active,tab,globalAccountId,onSessionInvalidated}:{ports:GymDesignPorts;onNavigate:(route:GymRoute)=>void;active:boolean;tab?:string;globalAccountId?:string;onSessionInvalidated?:()=>void}){
 const A=ports.AdjustableRegion,id=useId(),root=useRef<HTMLDivElement>(null);
 const selected=navigation.subtabs.health.includes(tab??'')?tab!:"Overview";
 useEffect(()=>{if(!active)return;const frame=requestAnimationFrame(()=>{const heading=root.current?.querySelector<HTMLElement>("[data-selected-health-view] h2");if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true})}root.current?.closest("article.gym-design-page")?.scrollTo({top:0,left:0,behavior:"instant"});});return()=>cancelAnimationFrame(frame)},[active,selected]);
 const go=(surface:string,tab?:string)=>onNavigate({surface,tab});
 const connection=(tab='Devices')=>go('connections',tab);
 const domains=[
  {key:'sleep',title:'Sleep & recovery',description:'Explore sleep patterns, recovery and the records shared by your sources.',image:sleep,alt:'Illustrative restful sleep in warm morning light',Icon:Moon,position:'center 45%'},
  {key:'heart',title:'Heart & cardio',description:'Review how movement and your recorded heart measurements fit together.',image:cardio,alt:'An athlete running on a treadmill',Icon:Heartbeat,position:'center 32%'},
  {key:'body',title:'Body & age',description:'Follow your recorded body measurements and physical activity over time.',image:body,alt:'An athlete lifting a barbell in a gym',Icon:PersonSimpleWalk,position:'center 30%'},
  {key:'mind',title:'Stress & mind',description:'Explore how activity, rest and everyday habits support your wellbeing.',image:mind,alt:'A person stretching on a mat',Icon:Heart,position:'center 58%'},
  {key:'mobility',title:'Mobility',description:'Review your movement records and explore assessment options in Book.',image:mobility,alt:'A gym member stretching on a mat',Icon:PersonSimpleWalk,position:'center 35%'},
  {key:'women',title:"Women's health",description:'This area is not supported by the current health sources. No cycle or fertility estimates are provided.',image:women,alt:'An athlete in a gym',Icon:GenderFemale,position:'center top',unavailable:true},
  {key:'metabolic',title:'Metabolic',description:'Review the available activity, nutrition and lifestyle records from your sources.',image:metabolic,alt:'A balanced bowl with chicken, grains and vegetables',Icon:ForkKnife,position:'center'},
 ];
 const dataLinks=[
  {key:'devices',title:'Device connections',description:'Review your wearable devices and health sources.',tab:'Devices',label:'Review sources',Icon:Devices},
  {key:'apple-import',title:'Apple Health import',description:'Review file import options and your existing import records.',tab:'Apple Health import',label:'Review import',Icon:UploadSimple},
  {key:'permissions',title:'Data-sharing permissions',description:'Choose the purpose, access and duration of your permissions.',tab:'Permissions',label:'Manage permissions',Icon:ShieldCheck},
  {key:'privacy',title:'Export or delete data',description:'Review your privacy options, exports and deletion choices.',tab:'Privacy',label:'See options',Icon:DownloadSimple},
 ];

 const domainCards=(<A id="personal-web:gym:health:domains" itemIds={domains.map(d=>d.key)} retainedItemIds={domains.map(d=>d.key)} labels={domains.map(d=>d.title)} className="gym-health-domains" minWidth={220}>{domains.map(({key,title,description,image,alt,Icon,position,unavailable})=><button type="button" key={key} className="gym-health-domain" onClick={()=>go('health',title)} aria-label={'View '+title}><img src={image} alt={alt} style={{objectPosition:position}} loading="lazy"/><span className="gym-health-domain-copy"><Icon size={28} aria-hidden/><strong>{title}</strong><span>{description}</span><span className="gym-health-domain-action">{unavailable?'View availability':'Explore '+title.toLowerCase()}<ArrowRight size={18}/></span></span></button>)}</A>);
 const assessmentCard=(<div className="gym-health-assessment"><img src={assessment} alt="An illustrative body assessment with a trainer" style={{objectPosition:'center top'}} loading="lazy"/><div><h3>Understand more. Train smarter.</h3><p>Explore movement assessments, body measurements and training support. Available sessions and terms are shown in Book.</p><button type="button" className="gym-design-action primary" onClick={()=>go('book')}>Explore assessment options<ArrowRight size={18}/></button></div></div>);
 const connectionLinks=(<A id="personal-web:gym:health:data-links" itemIds={dataLinks.map(d=>d.key)} labels={dataLinks.map(d=>d.title)} className="gym-health-data-links" minWidth={240}>{dataLinks.map(({key,title,description,tab,label,Icon})=><button type="button" key={key} onClick={()=>connection(tab)}><Icon size={28} aria-hidden/><span><strong>{title}</strong><small>{description}</small></span><span className="gym-health-link-label">{label}</span><ArrowRight size={18}/></button>)}</A>);
 return <div ref={root} className="gym-health-main gym-health-selected" hidden={!active}>
 <A id="personal-web:gym:health:main-sections" itemIds={["hero","navigation","sources","privacy"]} retainedItemIds={["hero","navigation","sources","domains","twin","assessments","connections","privacy","selected"]} labels={["Health welcome","Health sections","Selected health view","Your data and privacy"]} basis={["100%","100%","100%","100%"]} className="gym-health-sections" minWidth={260}>
<section className="gym-lifestyle-hero gym-health-hero" aria-labelledby={id+'-title'}><img src={hero} alt="An athlete taking a restful moment in a wellness studio" style={{objectPosition:'center top'}}/><div className="gym-lifestyle-hero-copy"><h1 id={id+'-title'}>Feel better.<br/>Know your rhythm.</h1><p>Review your health data and choose the sources you want to bring together.</p><button type="button" className="gym-design-action primary" onClick={()=>connection()}>Connect your data<ArrowRight size={18}/></button></div></section>
<nav className="gym-design-tabs gym-health-tabs" aria-label="Health sections">{navigation.subtabs.health.map(tab=><button type="button" key={tab} aria-current={tab===selected?'page':undefined} aria-pressed={tab===selected} onClick={()=>go('health',tab)}>{tab}</button>)}</nav>
 <HealthSectionContent active={active} globalAccountId={globalAccountId} onSessionInvalidated={onSessionInvalidated} tab={selected} ports={ports} onNavigate={onNavigate} domains={domainCards} assessment={assessmentCard} dataLinks={connectionLinks}/>
<footer className="gym-health-privacy"><Lock size={32} aria-hidden/><div><h3>Your data. Your choice.</h3><p>You control which sources you connect and which permissions you share.</p></div><button type="button" className="gym-health-text-action" onClick={()=>go('profile','Privacy')}>Review your privacy<ArrowRight size={18}/></button></footer>
 </A></div>;
}
