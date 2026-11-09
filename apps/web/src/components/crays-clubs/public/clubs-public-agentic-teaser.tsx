"use client";

import { ArrowRight, AudioLines, Circle, House, Utensils, UsersRound } from "lucide-react";
import { useEffect, useRef, type PointerEvent } from "react";
import { getHomepageEvolutionCopy } from "./homepage-current-translation";
import type { CraysPublicLocale } from "./clubs-public-locale-contract";
import styles from "./clubs-public-agentic-teaser.module.css";

export const AGENTIC_LIFE_HREF = "/en/agentic-life";

const possibilityMedia = [
  { name: "people", title: "Someone to build with", status: "Introduction to review", icon: UsersRound, alt: "People sharing ideas around laptops at a Crays gathering", width: 1200, height: 1138 },
  { name: "place", title: "Your place in Forest City", status: "Stay + workspace options", icon: House, alt: "Forest City homes and shoreline seen from a green balcony", width: 1200, height: 900 },
  { name: "together", title: "An evening together", status: "Plans to choose from", icon: Utensils, alt: "People sharing a buffet at a Crays community gathering", width: 1200, height: 675 },
] as const;

function moveImage(event: PointerEvent<HTMLElement>) {
  if (event.pointerType !== "mouse" || !window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)").matches) return;
  const rect = event.currentTarget.getBoundingClientRect();
  event.currentTarget.style.setProperty("--agentic-x", `${((event.clientX - rect.left) / rect.width - .5) * 8}px`);
  event.currentTarget.style.setProperty("--agentic-y", `${((event.clientY - rect.top) / rect.height - .5) * 6}px`);
}

function resetImage(event: PointerEvent<HTMLElement>) {
  event.currentTarget.style.removeProperty("--agentic-x");
  event.currentTarget.style.removeProperty("--agentic-y");
}

export function ClubsPublicAgenticTeaser({ locale = "en" }: { locale?: CraysPublicLocale }) {
  const copy = getHomepageEvolutionCopy(locale);
  const possibilities = possibilityMedia.map((media, index) => ({...media, ...copy.possibilities[index]}));
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || !window.matchMedia("(prefers-reduced-motion: no-preference)").matches) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      section.dataset.entered = "true";
      observer.disconnect();
    }, { threshold: .15 });
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} id="agentic-life" className={styles.section} aria-labelledby="agentic-life-heading">
      <div className={styles.inner}>
      <div className={styles.copy}>
        <p className={styles.kicker}>{copy.agenticKicker}</p>
        <h2 id="agentic-life-heading">{copy.agenticTitle}</h2>
        <p className={styles.description}>{copy.agenticBody}</p>
        <p className={styles.control}>{copy.agenticControl}</p>
        <a className={styles.cta} href={locale === "en" ? AGENTIC_LIFE_HREF : `/${locale}/agentic-life`}>{copy.agenticAction} <ArrowRight size={19} aria-hidden="true" /></a>
      </div>
      <div className={styles.preview} role="group" aria-label={copy.previewAria}>
        <p className={styles.previewLabel}>{copy.previewLabel}</p>
        <blockquote className={styles.intention}>
          <AudioLines size={42} strokeWidth={1.8} aria-hidden="true" />
          <p>{copy.intention}</p>
        </blockquote>
        <div className={styles.possibilities}>
          {possibilities.map(({ name, title, status, icon: Icon, alt, width, height }) => (
            <figure key={name} className={`${styles.possibility} ${styles[name]}`} onPointerMove={moveImage} onPointerLeave={resetImage}>
              <Circle className={styles.junction} size={13} strokeWidth={1.6} aria-hidden="true" />
              <div className={styles.imageFrame}>
                <img src={`/__crays-clubs/agentic-life/${name === "together" ? "dinner" : name}.webp`} alt={alt} width={width} height={height} loading="lazy" decoding="async" />
              </div>
              <figcaption><Icon size={31} strokeWidth={1.6} aria-hidden="true" /><div><h3>{title}</h3><p>{status}</p></div></figcaption>
            </figure>
          ))}
        </div>
      </div>
      </div>
    </section>
  );
}
