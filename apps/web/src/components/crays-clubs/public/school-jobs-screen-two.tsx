"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ChevronDown, Expand, X } from "lucide-react";
import { ClubsPublicShell } from "./clubs-public-shell";
import { getSchoolJobsPublicContent, schoolJobsLocales, type SchoolJobsLocale } from "./school-jobs-public-copy";
import { schoolJobsMedia, type SchoolJobsMediaKey } from "./school-jobs-public-media";
import { interactionText } from "./localized-interaction-copy";
import styles from "./school-jobs-screen-two.module.css";

type Item = { title: string; text: string };
function Rows({ items, prefix, firstOpen=false }: {items:readonly Item[];prefix:string;firstOpen?:boolean}) {
  return <div className={styles.rows}>{items.map((item,index)=><details key={item.title} id={`${prefix}-${index+1}`} open={firstOpen&&index===0}>
    <summary><span className={styles.number}>{String(index+1).padStart(2,"0")}</span><span>{item.title}</span><ChevronDown size={17} aria-hidden="true" /></summary><p>{item.text}</p>
  </details>)}</div>;
}

function Photo({locale,name,className="",priority=false,alts,onOpen}:{locale:SchoolJobsLocale;name:SchoolJobsMediaKey;caption:string;className?:string;priority?:boolean;alts:Record<SchoolJobsMediaKey,string>;onOpen:(key:SchoolJobsMediaKey)=>void}) {
    const media=schoolJobsMedia[name];
    return <figure className={`${styles.photo} ${className}`} data-school-media={name}>
      <button type="button" className={styles.photoButton} onClick={()=>onOpen(name)} aria-label={`${interactionText(locale,"Enlarge image")}: ${alts[name]}`}>
        <Image src={media.assetUrl} alt={alts[name]} fill priority={priority} sizes={priority?"100vw":"(max-width:760px) 100vw, 65vw"}/><span className={styles.expand}><Expand size={17} aria-hidden="true" /></span>
      </button>

    </figure>;
  }

export function SchoolJobsScreenTwo({locale}:{locale:SchoolJobsLocale}) {
  const c=getSchoolJobsPublicContent(locale);
  const t=(key:string)=>interactionText(locale,key);
  const [step,setStep]=useState(0);
  const [requirement,setRequirement]=useState(0);
  const [zoom,setZoom]=useState<SchoolJobsMediaKey|null>(null);
  const dialogRef=useRef<HTMLDialogElement>(null);
  const openerRef=useRef<HTMLElement|null>(null);
  const prefix=`/${locale}`;
  const galleryKeys:SchoolJobsMediaKey[]=["skillsPractice","learningRoom","assessmentStudio","employerExchange"];
  const nextStep=(step+1)%c.four.items.length;
  const move=(direction:number)=>setStep(current=>(current+direction+4)%4);
  function openPhoto(key:SchoolJobsMediaKey){openerRef.current=document.activeElement as HTMLElement;setZoom(key);}
  useEffect(()=>{if(zoom)dialogRef.current?.showModal();},[zoom]);
  function closePhoto(){dialogRef.current?.close();setZoom(null);openerRef.current?.focus();}
  return <ClubsPublicShell availableLocales={schoolJobsLocales} headerTone="overlay" locale={locale}>
    <main className={styles.page} id="clubs-school-jobs-content">
      <section className={styles.hero} aria-labelledby="school-jobs-title">
        <div className={styles.heroImage}><Image src={schoolJobsMedia.heroWorkshop.assetUrl} alt={c.alts.heroWorkshop} fill priority sizes="100vw" data-school-media="heroWorkshop"/></div>
        <div className={styles.heroCopy}><p className={styles.kicker}>{c.hero.eyebrow}</p><h1 id="school-jobs-title" aria-label={c.hero.title}>{c.hero.title.replace("Learn here. ","Learn here.| ").replace("discovered ","discovered| ").split("|").map(line=><span key={line}>{line}</span>)}</h1><p>{c.hero.lead}</p><p className={styles.heroBoundary}>{c.hero.boundary}</p>
          <div className={styles.actions}><a className={styles.primary} href="#four-step">{c.hero.primary}<ArrowRight size={18} aria-hidden="true"/></a><a className={styles.secondary} href="#states">{c.hero.secondary}<ArrowRight size={18} aria-hidden="true"/></a></div>
        </div>

      </section>
      <nav className={styles.chapterNav} aria-label={c.navLabel}>{c.nav.map(item=><a key={item.href} href={item.href}>{item.label}</a>)}</nav>
      <section className={`${styles.section} ${styles.wide}`} id="four-step" aria-labelledby="four-title">
        <header className={styles.heading}><p className={styles.kicker}>{c.four.kicker}</p><h2 id="four-title">{c.four.title}</h2><p>{c.four.lead}</p></header>
        <p className={styles.galleryHint}>{t("Select a step or use the arrows to explore the journey.")}</p>
        <div className={styles.gallery} role="group" aria-label={t("Explore the four learning steps")}>
          <div className={styles.galleryMain} key={step}><Photo locale={locale} alts={c.alts} onOpen={openPhoto} name={galleryKeys[step]} caption=""/></div>
          <button className={styles.galleryPreview} type="button" onClick={()=>move(1)} aria-label={`${t("Next learning step")}: ${c.four.items[nextStep].title}`}><span className={styles.previewImage}><Image src={schoolJobsMedia[galleryKeys[nextStep]].assetUrl} alt={c.alts[galleryKeys[nextStep]]} fill sizes="(max-width:760px) 100vw, 35vw"/></span><span className={styles.previewLabel}><span>{t("Next:")}</span><strong>{c.four.items[nextStep].title}</strong><ArrowRight size={18}/></span></button>
          <button className={`${styles.galleryArrow} ${styles.previous}`} type="button" onClick={()=>move(-1)} aria-label={t("Previous learning step")}><ArrowLeft size={20}/></button><button className={`${styles.galleryArrow} ${styles.next}`} type="button" onClick={()=>move(1)} aria-label={t("Next learning step")}><ArrowRight size={20}/></button>
        </div>
        <p className={styles.galleryCount} aria-live="polite">{String(step+1).padStart(2,"0")} / 04</p>
        <div className={styles.stepTabs} role="tablist" aria-label={c.four.kicker} onKeyDown={event=>{if(event.key==="ArrowRight"||event.key==="ArrowLeft"){event.preventDefault();const next=(step+(event.key==="ArrowRight"?1:-1)+4)%4;setStep(next);document.getElementById(`school-step-${next}`)?.focus();}}}>
          {c.four.items.map((item,index)=><button type="button" role="tab" id={`school-step-${index}`} aria-selected={step===index} aria-controls={`school-step-panel-${index}`} tabIndex={step===index?0:-1} onClick={()=>setStep(index)} key={item.title}><span>{String(index+1).padStart(2,"0")}</span>{item.title}</button>)}
        </div>
        {c.four.items.map((item,index)=><div className={styles.stepPanel} role="tabpanel" tabIndex={0} id={`school-step-panel-${index}`} aria-labelledby={`school-step-${index}`} hidden={step!==index} key={item.title}><h3>{item.title}</h3><p>{item.text}</p><p className={styles.smallBoundary}>{item.gate}</p></div>)}
      </section>
      <section className={`${styles.section} ${styles.narrow} ${styles.states}`} id="states" aria-labelledby="states-title">
        <header className={styles.heading}><p className={styles.kicker}>{c.states.kicker}</p><h2 id="states-title">{c.states.title}</h2><p>{c.states.lead}</p></header>
        <ol className={styles.stateChain}>{c.states.items.map((item,index)=><li key={item.title}><span className={styles.stateNumber}>{String(index+1).padStart(2,"0")}</span><div><h3>{item.title}</h3><p>{item.text}</p></div>{index!==3&&index!==7&&<ArrowRight size={18} className={styles.stateArrow} aria-hidden="true"/>}</li>)}</ol>
      </section>
      <section className={`${styles.section} ${styles.narrow} ${styles.skills}`} id="evidence" aria-labelledby="evidence-title"><header><p className={styles.kicker}>{c.skills.kicker}</p><h2 id="evidence-title">{c.skills.title}</h2><p>{c.skills.lead}</p></header><div><Rows items={c.skills.items} prefix="school-skill"/><p className={styles.notice}>{c.skills.boundary}</p></div></section>
      <section className={`${styles.section} ${styles.wide} ${styles.programme}`} id="programmes" aria-labelledby="programmes-title">
        <div className={styles.programmeStage}><Photo locale={locale} alts={c.alts} onOpen={openPhoto} name="programmeWorkshop" caption={c.programme.caption} className={styles.programmePhoto}/><header className={styles.programmeCopy}><p className={styles.kicker}>{c.programme.kicker}</p><h2 id="programmes-title">{c.programme.title}</h2><p>{c.programme.lead}</p><p className={styles.smallBoundary}>{c.programme.gate}</p></header></div>
        <div className={styles.requirementTabs} role="tablist" aria-label={c.programme.kicker} onKeyDown={event=>{if(event.key==="ArrowRight"||event.key==="ArrowLeft"){event.preventDefault();const next=(requirement+(event.key==="ArrowRight"?1:-1)+6)%6;setRequirement(next);document.getElementById(`school-requirement-${next}`)?.focus();}}}>{c.programme.requirements.map((item,index)=><button type="button" role="tab" key={item.title} id={`school-requirement-${index}`} aria-selected={requirement===index} aria-controls={`school-requirement-panel-${index}`} tabIndex={requirement===index?0:-1} onClick={()=>setRequirement(index)}>{item.title}</button>)}</div>
        {c.programme.requirements.map((item,index)=><div className={styles.requirementPanel} role="tabpanel" key={item.title} hidden={index!==requirement} id={`school-requirement-panel-${index}`} aria-labelledby={`school-requirement-${index}`}><h3>{item.title}</h3><p>{item.text}</p></div>)}
      </section>
      <section className={`${styles.section} ${styles.narrow} ${styles.assessment}`} aria-labelledby="assessment-title"><div><p className={styles.kicker}>{c.assessment.kicker}</p><h2 id="assessment-title">{c.assessment.title}</h2><p>{c.assessment.text}</p><Rows items={c.assessment.items} prefix="school-assessment" firstOpen/></div><Photo locale={locale} alts={c.alts} onOpen={openPhoto} name="assessmentStudio" caption={c.assessment.caption} className={styles.assessmentPhoto}/></section>
      <section className={`${styles.section} ${styles.wide} ${styles.employer}`} id="employers" aria-labelledby="employers-title"><Photo locale={locale} alts={c.alts} onOpen={openPhoto} name="employerExchange" caption={c.employer.caption} className={styles.employerPhoto}/><div className={styles.employerIntro}><p className={styles.kicker}>{c.employer.kicker}</p><h2 id="employers-title">{c.employer.title}</h2><p>{c.employer.lead}</p></div><Rows items={c.employer.items} prefix="school-employer"/></section>
      <section className={`${styles.section} ${styles.narrow} ${styles.roles}`} aria-labelledby="roles-title"><header className={styles.heading}><p className={styles.kicker}>{c.roles.kicker}</p><h2 id="roles-title">{c.roles.title}</h2><p>{c.roles.lead}</p></header><div className={styles.rolesLayout}><div className={styles.roleSurface}><div className={styles.roleColumns}>{c.roles.columns.map(column=><span key={column}>{column}</span>)}</div><div className={styles.emptyRoles}><span aria-hidden="true">00</span><div><h3>{c.roles.emptyTitle}</h3><p>{c.roles.emptyText}</p></div></div></div><p className={styles.notice}>{c.roles.gate}</p></div></section>
      <section className={`${styles.section} ${styles.narrow} ${styles.nextAndQuestions}`}><div className={styles.interest} aria-labelledby="interest-title"><p className={styles.kicker}>{c.interest.kicker}</p><h2 id="interest-title">{c.interest.title}</h2><p>{c.interest.lead}</p><div className={styles.actions}><button type="button" disabled>{c.interest.disabled}</button><a className={styles.primary} href={`${prefix}/contact`}>{c.interest.contact}<ArrowRight size={17}/></a><a className={styles.secondary} href={`${prefix}/become-a-member`}>{c.interest.membership}<ArrowRight size={17}/></a></div></div><div id="questions" aria-labelledby="faq-title"><p className={styles.kicker}>{c.faq.kicker}</p><h2 id="faq-title">{c.faq.title}</h2><p>{c.faq.lead}</p><div className={styles.faq}>{c.faq.items.map((item,index)=><details key={item.question} id={`school-jobs-faq-${index+1}`}><summary>{item.question}<ChevronDown size={17}/></summary><p>{item.answer}</p><a href={`#school-jobs-faq-${index+1}`}>{c.faq.permalink}</a></details>)}</div></div></section>
      <section className={styles.closing} aria-labelledby="closing-title"><div><header><p className={styles.kicker}>{c.closing.kicker}</p><h2 id="closing-title">{c.closing.title}</h2></header><p>{c.closing.text}</p><div className={styles.actions}><a className={styles.primary} href={`${prefix}/contact`}>{c.closing.primary}<ArrowRight size={17}/></a><a className={styles.secondary} href={prefix}>{c.closing.secondary}<ArrowRight size={17}/></a></div></div></section>
    </main>
    <dialog className={styles.lightbox} ref={dialogRef} aria-label={zoom?c.alts[zoom]:t("Image viewer")} onCancel={()=>{setZoom(null);openerRef.current?.focus();}} onClick={event=>{if(event.target===event.currentTarget)closePhoto();}}><button className={styles.closePhoto} type="button" onClick={closePhoto} aria-label={t("Close image")}><X size={24}/></button>{zoom&&<div><Image src={schoolJobsMedia[zoom].assetUrl} alt={c.alts[zoom]} width={2400} height={1600} sizes="95vw"/></div>}</dialog>
  </ClubsPublicShell>;
}
