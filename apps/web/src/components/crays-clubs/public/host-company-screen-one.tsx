"use client";

import Image from "next/image";
import Link from "next/link";
import { type TouchEvent, useRef, useState } from "react";
import { Activity, ArrowLeft, ArrowRight, BedDouble, BriefcaseBusiness, Building2, CalendarRange, Camera, CheckCircle2, ChevronDown, ClipboardCheck, Handshake, LockKeyhole, Maximize2, ShieldCheck, UsersRound, UtensilsCrossed, Wifi, X } from "lucide-react";
import { ClubsPublicShell } from "./clubs-public-shell";
import { interactionText } from "./localized-interaction-copy";
import { hostCompanyCopy, hostCompanyLocales, type HostCompanyLocale } from "./host-company-copy";
import { hostCompanyClosingMedia, hostCompanyFacilityMedia, hostCompanyFormatMedia, hostCompanyProgramMedia, type HostCompanyMediaAsset } from "./clubs-host-company-media";
import styles from "./host-company-screen-one.module.css";

const benefitIcons = [Building2, CalendarRange, ClipboardCheck, ShieldCheck, BriefcaseBusiness, Wifi, BedDouble, UtensilsCrossed, Activity, Camera, UsersRound, CheckCircle2];
const formatIcons = [CalendarRange, UsersRound, Building2, Handshake];
// Keep each scene tied to its actual subject, rather than mockup-generated captions.
const programPhotos = [hostCompanyProgramMedia[2], hostCompanyFacilityMedia[5], hostCompanyProgramMedia[0], hostCompanyFacilityMedia[1]];

function Photo({ asset, className = "", eager = false }: { asset: HostCompanyMediaAsset; className?: string; eager?: boolean }) {
  return <div className={`${styles.photo} ${className}`} data-media-id={asset.id}><Image src={asset.src} alt={asset.alt} fill sizes={eager ? "100vw" : "(max-width: 760px) 100vw, 60vw"} unoptimized loading={eager ? "eager" : "lazy"} fetchPriority={eager ? "high" : "auto"} style={{ objectPosition: asset.crop }} /></div>;
}

export function HostCompanyScreenOne({locale="en"}:{locale?:HostCompanyLocale}) {
  const copy = hostCompanyCopy[locale];
  const t=(key:string)=>interactionText(locale,key);
  const [formatIndex, setFormatIndex] = useState(1);
  const [programIndex, setProgramIndex] = useState(0);
  const [facilityIndex, setFacilityIndex] = useState(0);
  const [expandedPhoto, setExpandedPhoto] = useState<HostCompanyMediaAsset | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const swipeRef = useRef<{x: number; y: number} | null>(null);
  const startSwipe = (event: TouchEvent) => { swipeRef.current = {x: event.touches[0].clientX, y: event.touches[0].clientY}; };
  const finishSwipe = (event: TouchEvent, gallery: "program" | "facility") => {
    const start = swipeRef.current;
    swipeRef.current = null;
    if (!start) return;
    const dx = event.changedTouches[0].clientX - start.x;
    const dy = event.changedTouches[0].clientY - start.y;
    if (Math.abs(dx) < 50 || Math.abs(dx) <= Math.abs(dy)) return;
    event.preventDefault();
    const direction = dx < 0 ? 1 : -1;
    if (gallery === "program") setProgramIndex(value => (value + direction + 4) % 4);
    else setFacilityIndex(value => (value + direction + 11) % 11);
  };
  const facility = copy.facilities[facilityIndex];
  const inquiry = `/${locale}/contact#host-company-inquiry`;
  const openPhoto = (asset: HostCompanyMediaAsset, trigger: HTMLButtonElement) => {
    triggerRef.current = trigger;
    setExpandedPhoto(asset);
    dialogRef.current?.showModal();
  };
  const closePhoto = () => { dialogRef.current?.close(); triggerRef.current?.focus(); };
  return <ClubsPublicShell locale={locale} availableLocales={hostCompanyLocales}>
    <main id="clubs-host-company-content" className={styles.page}>
      <section className={styles.hero} aria-labelledby="host-company-title">
        <Photo asset={hostCompanyClosingMedia} eager className={styles.heroPhoto} />
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>{copy.eyebrow}</p>
          <h1 id="host-company-title">{locale==="en"?<>Make room<br />for company<br />progress.</>:t("Make room for company progress.")}</h1>
          <p>{copy.heroBody}</p>
          <div className={styles.actions}><Link href={inquiry} className={styles.primary}>{copy.primaryCta}<ArrowRight size={18} /></Link><a href="#company-formats" className={styles.secondary}>{copy.secondaryCta}<ArrowRight size={18} /></a></div>
          <p className={styles.note}><LockKeyhole size={16} />{t("Request only. No availability or commitment is created here.")}</p>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="benefits-title">
        <p className={styles.eyebrow}>{t("Why host with Crays")}</p>
        <header className={styles.heading}><h2 id="benefits-title">{t("Twelve ways we can make hosting simpler and more effective.")}</h2><p>{copy.benefitIntro}</p></header>
        <div className={styles.benefits}>{copy.benefits.map((item, i) => { const Icon = benefitIcons[i]; return <article key={item.title}><Icon size={34} strokeWidth={1.4} /><div><h3>{item.title}</h3><p>{item.text}</p></div></article>; })}</div>
      </section>

      <section className={`${styles.section} ${styles.formats}`} id="company-formats" aria-labelledby="formats-title">
        <p className={styles.eyebrow}>{t("Hosting formats")}</p><header className={styles.heading}><h2 id="formats-title">{copy.formatsTitle}</h2><p>{copy.formatsBody}</p></header>
        <div className={styles.formatStage}>
          <button key={formatIndex} className={styles.formatPhoto} aria-label={`${t("Enlarge image")}: ${copy.formats[formatIndex].title}`} onClick={event => openPhoto(hostCompanyFormatMedia[formatIndex], event.currentTarget)}><Photo asset={hostCompanyFormatMedia[formatIndex]} /><span className={styles.expand}><Maximize2 size={18} /></span></button>
          <div className={styles.formatList}>{copy.formats.map((item, i) => { const Icon = formatIcons[i]; const selected = formatIndex === i; return <div key={item.title} className={styles.formatItem} data-selected={selected}>
            <button aria-expanded={selected} aria-controls={`format-panel-${i}`} onClick={() => setFormatIndex(i)}><Icon size={28} strokeWidth={1.5} /><span><strong>{item.duration} — {item.title}</strong><small>{item.intro}</small></span><ChevronDown size={20} /></button>
            <div id={`format-panel-${i}`} hidden={!selected} className={styles.formatDetail}><p>{item.fit}</p><ol>{item.sequence.map(step => <li key={step}>{step}</li>)}</ol><small>{item.boundary}</small><Link href={inquiry}>{t("Ask about this format")}<ArrowRight size={17} /></Link></div>
          </div>; })}</div>
        </div>
      </section>

      <section className={styles.program} aria-labelledby="program-title"><div className={styles.section}>
        <header className={styles.heading}><h2 id="program-title">{copy.programTitle}</h2><p>{copy.programBody}</p></header>
        <div className={styles.programStage} onTouchStart={startSwipe} onTouchEnd={event => finishSwipe(event, "program")}><button className={`${styles.circle} ${styles.previous}`} aria-label={t("Previous program moment")} onClick={() => setProgramIndex(value => (value + 3) % 4)}><ArrowLeft size={19} /></button>
          <div key={programIndex} className={styles.programGrid}>{copy.program.map((_, offset) => { const i = (programIndex + offset) % 4; const item = copy.program[i]; return <article key={i}><button className={styles.programPhoto} onClick={event => openPhoto(programPhotos[i], event.currentTarget)} aria-label={`${t("Enlarge image")}: ${item.title}`}><Photo asset={programPhotos[i]} /><span className={styles.expand}><Maximize2 size={17} /></span></button><h3>{item.title}</h3><p>{item.text}</p></article>; })}</div>
          <button className={`${styles.circle} ${styles.next}`} aria-label={t("Next program moment")} onClick={() => setProgramIndex(value => (value + 1) % 4)}><ArrowRight size={19} /></button>
        </div>
        <div className={styles.dots} aria-label={t("Program gallery position")}>{copy.program.map((item, i) => <button key={item.title} aria-label={`${t("Start gallery at")}: ${item.title}`} aria-current={programIndex === i ? "true" : undefined} onClick={() => setProgramIndex(i)} />)}</div>
      </div></section>

      <section className={styles.section} id="company-facilities" aria-labelledby="facilities-title">
        <header className={styles.heading}><h2 id="facilities-title">{copy.facilitiesTitle}</h2><p>{copy.facilitiesBody}</p></header>
        <div className={styles.facilityStage} onTouchStart={startSwipe} onTouchEnd={event => finishSwipe(event, "facility")}>
          <button key={facilityIndex} className={styles.facilityPhoto} onClick={event => openPhoto(hostCompanyFacilityMedia[facilityIndex], event.currentTarget)} aria-label={`${t("Enlarge image")}: ${facility.title}`}><Photo asset={hostCompanyFacilityMedia[facilityIndex]} /><span className={styles.expand}><Maximize2 size={18} /></span></button>
          <div className={styles.facilityCopy} aria-live="polite"><small>{String(facilityIndex + 1).padStart(2, "0")} / 11</small><h3>{facility.title}</h3><p>{facility.text}</p><small>{facility.state}</small><Link href={inquiry}>{t("Ask about this service")}<ArrowRight size={17} /></Link></div>
          <button className={`${styles.circle} ${styles.previous}`} aria-label={t("Previous facility")} onClick={() => setFacilityIndex(value => (value + 10) % 11)}><ArrowLeft size={19} /></button><button className={`${styles.circle} ${styles.next}`} aria-label={t("Next facility")} onClick={() => setFacilityIndex(value => (value + 1) % 11)}><ArrowRight size={19} /></button>
        </div>
        <div className={styles.dots} aria-label={t("Facility gallery position")}>{copy.facilities.map((item, i) => <button key={item.title} aria-label={`${t("Show")}: ${item.title}`} aria-current={facilityIndex === i ? "true" : undefined} onClick={() => setFacilityIndex(i)} />)}</div>
      </section>

      <section className={`${styles.section} ${styles.faq}`} aria-labelledby="faq-title"><p className={styles.eyebrow}>FAQ</p><h2 id="faq-title">{copy.faqTitle}</h2><div className={styles.faqGrid}>{copy.faqs.map(item => <details key={item.question}><summary>{item.question}<ChevronDown size={18} /></summary><p>{item.answer}</p></details>)}</div></section>

      <section className={styles.closing} aria-labelledby="closing-title"><div><p className={styles.eyebrow}>{copy.ctaEyebrow}</p><h2 id="closing-title">{copy.ctaTitle}</h2></div><div><p>{copy.ctaBody}</p><div className={styles.actions}><Link className={styles.primary} href={inquiry}>{copy.ctaButton}<ArrowRight size={18} /></Link><a className={styles.secondary} href="#company-formats">{copy.secondaryCta}<ArrowRight size={18} /></a></div></div></section>
    </main>
    <dialog ref={dialogRef} className={styles.dialog} aria-label={t("Enlarged host company photograph")} onCancel={() => triggerRef.current?.focus()} onClick={event => { if (event.target === event.currentTarget) closePhoto(); }}><button className={styles.dialogClose} onClick={closePhoto} aria-label={t("Close enlarged image")}><X size={24} /></button>{expandedPhoto && <Photo asset={expandedPhoto} className={styles.dialogPhoto} />}</dialog>
  </ClubsPublicShell>;
}




