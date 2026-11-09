"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { BriefcaseBusiness, Heart, Maximize2, UsersRound, X } from "lucide-react";
import styles from "@/app/en/agentic-life/page.module.css";
import { agenticLifeTranslator } from "./agentic-life-translation";
import type { CraysPublicLocale } from "./clubs-public-locale-contract";

function movePhoto(event: PointerEvent<HTMLElement>) {
  if (event.pointerType !== "mouse" || !window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)").matches) return;
  const rect = event.currentTarget.getBoundingClientRect();
  event.currentTarget.style.setProperty("--photo-x", `${((event.clientX - rect.left) / rect.width - .5) * 5}px`);
  event.currentTarget.style.setProperty("--photo-y", `${((event.clientY - rect.top) / rect.height - .5) * 5}px`);
  event.currentTarget.style.setProperty("--photo-rx", `${((event.clientY - rect.top) / rect.height - .5) * -3}deg`);
  event.currentTarget.style.setProperty("--photo-ry", `${((event.clientX - rect.left) / rect.width - .5) * 3}deg`);
}
function resetPhoto(event: PointerEvent<HTMLElement>) {
  event.currentTarget.style.removeProperty("--photo-x");
  event.currentTarget.style.removeProperty("--photo-y");
  event.currentTarget.style.removeProperty("--photo-rx");
  event.currentTarget.style.removeProperty("--photo-ry");
}
export function AgenticPhoto({ locale, name, alt, width = 1600, height = 900, priority = false, className = "" }: {
  locale: CraysPublicLocale; name: string; alt: string; width?: number; height?: number; priority?: boolean; className?: string;
}) {
  const t = agenticLifeTranslator(locale);
  const [expanded, setExpanded] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!expanded) return;
    dialog.current?.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; trigger.current?.focus({ preventScroll: true }); };
  }, [expanded]);
  return <figure className={`${styles.photo} ${className}`} onPointerMove={movePhoto} onPointerLeave={resetPhoto}>
    <button ref={trigger} className={styles.photoButton} type="button" aria-label={`${t("View full photo:")} ${alt}`} onClick={() => setExpanded(true)}>
    <img src={`/__crays-clubs/agentic-life/page/${name}.webp`} alt={alt} width={width} height={height} loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"} decoding="async" />
    <span className={styles.photoExpand}><Maximize2 size={18} aria-hidden="true" /></span>
    </button>
    {expanded && createPortal(<dialog ref={dialog} className={styles.photoDialog} aria-label={alt} onCancel={() => setExpanded(false)} onClick={event => { if (event.target === event.currentTarget) setExpanded(false); }}>
      <button type="button" className={styles.closePhoto} aria-label={t("Close photo")} onClick={() => setExpanded(false)} autoFocus><X size={24} /></button>
      <img src={`/__crays-clubs/agentic-life/page/${name}.webp`} alt={alt} width={width} height={height} />
    </dialog>, document.body)}
  </figure>;
}

const intentions = [
  { name: "Socializing", icon: UsersRound, caption: "Meet people who share your interests.", wish: "“I’d like company for dinner tonight.”", detail: "Choose a person, a small group or an activity. Your agent will look at shared interests, available time and the communities you select." },
  { name: "Business", icon: BriefcaseBusiness, caption: "Co-founders, clients, mentors and investors.", wish: "“Help me find a co-founder who complements my skills.”", detail: "Describe your project and what you can offer. Your agent will explain why an introduction may be useful to both of you, before either person decides." },
  { name: "Dating", icon: Heart, caption: "Connect with intention, when you’re ready.", wish: "“I’d like to meet someone who shares my interests.”", detail: "Choose to be discoverable for dating, with separate preferences and visibility. A private conversation starts only when both people want to connect." },
] as const;

export function MatchingIntentions({ locale }: { locale: CraysPublicLocale }) {
  const t = agenticLifeTranslator(locale);
  const [active, setActive] = useState<number | null>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  function changeWithKeyboard(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % intentions.length;
    else if (event.key === "ArrowLeft") next = (index + intentions.length - 1) % intentions.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = intentions.length - 1;
    else return;
    event.preventDefault();
    setActive(next);
    tabs.current[next]?.focus();
  }
  return <div className={styles.matchingInteraction}>
    <div className={styles.intentionPanel} role="tabpanel" id="intention-panel" aria-labelledby={active === null ? "matching-title" : `intention-tab-${active}`} aria-live="polite">
      <p>{t(active === null ? "Friends. Co-founders. Mentors. Maybe your person. Choose Socializing, Business or Dating, with separate intentions and visibility. Both people agree before a private conversation begins." : intentions[active].detail)}</p>
    </div>
    <div className={styles.intentions} role="tablist" aria-label={t("Explore connection intentions")}>
      {intentions.map(({ name, icon: Icon, caption }, index) => <button
        key={t(name)} ref={node => { tabs.current[index] = node; }}
        type="button" role="tab" id={`intention-tab-${index}`}
        aria-selected={active === index} aria-controls="intention-panel"
        tabIndex={(active ?? 0) === index ? 0 : -1} onClick={() => setActive(index)}
        onKeyDown={event => changeWithKeyboard(event, index)}
      ><Icon size={36} strokeWidth={1.6} aria-hidden="true" /><strong>{t(name)}</strong><span>{t(caption)}</span></button>)}
    </div>
  </div>;
}

