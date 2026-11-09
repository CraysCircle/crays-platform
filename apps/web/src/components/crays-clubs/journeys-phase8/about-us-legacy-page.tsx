"use client";

import Image from "next/image";
import { ArrowDown, ArrowLeft, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ClubsPublicShell } from "../public/clubs-public-shell";
import { aboutCopy, type AboutLocale } from "./about-us-copy";
import { ABOUT_US_MEDIA_V2, type AboutMediaKey } from "./about-us-media-v2";
import styles from "./about-us-page.module.css";

type Props = { locale: AboutLocale };

const ABOUT_LOCALES = ["en", "de", "es", "ca", "fr", "pt", "it"] as const;
const CHAPTER_TARGETS = ["about-idea", "about-beliefs", "about-vision", "about-flow"] as const;
const FILM_CONTROL_LABELS: Record<AboutLocale, { previous: string; next: string }> = {
  en: { previous: "Previous image", next: "Next image" },
  de: { previous: "Vorheriges Bild", next: "Nächstes Bild" },
  es: { previous: "Imagen anterior", next: "Imagen siguiente" },
  ca: { previous: "Imatge anterior", next: "Imatge següent" },
  fr: { previous: "Image précédente", next: "Image suivante" },
  pt: { previous: "Imagem anterior", next: "Imagem seguinte" },
  it: { previous: "Immagine precedente", next: "Immagine successiva" },
};
const FILM_MEDIA: readonly AboutMediaKey[] = [
  "filmCoast",
  "filmCommunity",
  "filmSkyline",
  "filmInterior",
  "filmOutlook",
];

function Picture({
  name,
  alt,
  className,
  eager = false,
}: {
  name: AboutMediaKey;
  alt?: string;
  className: string;
  eager?: boolean;
}) {
  const asset = ABOUT_US_MEDIA_V2[name];
  const resolvedAlt = alt === undefined ? asset.altRole : alt;

  return (
    <figure className={[styles.picture, className].join(" ")}>
      <Image
        alt={resolvedAlt}
        data-about-media={asset.id}
        fill
        priority={eager}
        sizes="(max-width: 820px) 100vw, (max-width: 1120px) 70vw, 50vw"
        src={asset.src}
      />
    </figure>
  );
}

export function AboutUsLegacyPage({ locale }: Props) {
  const c = aboutCopy[locale];
  const filmLabels = FILM_CONTROL_LABELS[locale];
  const filmRef = useRef<HTMLDivElement>(null);
  const [activeChapter, setActiveChapter] = useState(0);

  useEffect(() => {
    const targets = CHAPTER_TARGETS.map((target) => document.getElementById(target)).filter(
      (target): target is HTMLElement => Boolean(target),
    );
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const index = CHAPTER_TARGETS.indexOf(visible.target.id as (typeof CHAPTER_TARGETS)[number]);
        if (index >= 0) setActiveChapter(index);
      },
      { rootMargin: "-28% 0px -52%", threshold: [0.1, 0.25, 0.5] },
    );
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, []);

  const moveFilm = (direction: -1 | 1) => {
    filmRef.current?.scrollBy({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      left: direction * Math.max(260, filmRef.current.clientWidth * 0.58),
    });
  };

  return (
    <ClubsPublicShell
      availableLocales={ABOUT_LOCALES}
      headerTone="overlay"
      locale={locale}
    >
      <main className={styles.page} id="about-us-main">
        <section className={styles.hero} aria-labelledby="about-hero-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>{c.hero.eyebrow}</p>
            <h1 id="about-hero-title">{c.hero.title}</h1>
            <p className={styles.heroBody}>{c.hero.body}</p>
            <div className={styles.heroActions}>
              <a className={styles.primaryAction} href={"/" + locale + "/become-a-member"}>
                {c.hero.primary}<ArrowRight aria-hidden="true" size={17} strokeWidth={2} />
              </a>
              <a className={styles.secondaryAction} href="#about-idea">
                {c.hero.secondary}<ArrowDown aria-hidden="true" size={17} strokeWidth={2} />
              </a>
            </div>
          </div>

          <div className={styles.heroVisual}>
            <Picture name="heroCinematic" className={styles.heroCinematic} eager />
            <nav className={styles.chapterRail} aria-label={`${c.hero.eyebrow}: ${c.shell.primaryNav}`}>
              {c.hero.signals.map((signal, index) => (
                <a
                  className={index === activeChapter ? styles.chapterActive : undefined}
                  href={"#" + CHAPTER_TARGETS[index]}
                  key={signal}
                  onClick={() => setActiveChapter(index)}
                  aria-current={index === activeChapter ? "location" : undefined}
                >
                  <i>0{index + 1}</i><span>{signal}</span>
                </a>
              ))}
            </nav>
            <p className={styles.heroCaption}>{c.hero.caption}</p>
          </div>

          <a className={styles.splitHandle} href="#about-idea" aria-label={c.hero.secondary}>
            <span className={styles.splitHandleGlyph} aria-hidden="true">
              <ChevronLeft size={13} strokeWidth={2} />
              <ChevronRight size={13} strokeWidth={2} />
            </span>
          </a>

          <div className={styles.filmBar}>
            <span className={styles.filmIndex} aria-hidden="true"><i />01</span>
            <div className={styles.filmStrip} ref={filmRef}>
              {FILM_MEDIA.map((name) => (
                <Picture name={name} className={styles.filmFrame} key={name} />
              ))}
            </div>
            <div className={styles.filmControls}>
              <button type="button" onClick={() => moveFilm(-1)} aria-label={filmLabels.previous}>
                <ArrowLeft aria-hidden="true" size={18} strokeWidth={1.8} />
              </button>
              <button type="button" onClick={() => moveFilm(1)} aria-label={filmLabels.next}>
                <ArrowRight aria-hidden="true" size={18} strokeWidth={1.8} />
              </button>
            </div>
          </div>
        </section>

        <section className={styles.idea} id="about-idea" aria-labelledby="idea-title">
          <div className={styles.ideaCopy}>
            <p className={styles.chapterNumber}>01</p>
            <p className={styles.eyebrow}>{c.idea.eyebrow}</p>
            <h2 id="idea-title">{c.idea.title}</h2>
            <p className={styles.ideaBody}>{c.idea.body}</p>
          </div>
          <div className={styles.ideaVisual}>
            <Picture name="ideaWide" className={styles.ideaWideImage} />
            <p>{c.idea.caption}</p>
          </div>
        </section>

        <section className={styles.beliefs} id="about-beliefs" aria-labelledby="beliefs-title">
          <header className={styles.sectionHeader}>
            <div>
              <p className={styles.chapterNumber}>02</p>
              <p className={styles.eyebrow}>{c.beliefs.eyebrow}</p>
            </div>
            <h2 id="beliefs-title">{c.beliefs.title}</h2>
          </header>
          <div className={styles.beliefSequence}>
            {c.beliefs.items.map((belief, index) => {
              const image: AboutMediaKey = index === 0 ? "beliefLiving" : index === 1 ? "beliefNomads" : "beliefRemote";
              return (
                <article key={belief.title}>
                  <Picture name={image} className={styles.beliefImage} />
                  <div>
                    <span>0{index + 1}</span>
                    <h3>{belief.title}</h3>
                    <p>{belief.body}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className={styles.vision} id="about-vision" aria-labelledby="vision-title">
          <div className={styles.visionLead}>
            <div>
              <p className={styles.chapterNumber}>03</p>
              <p className={styles.eyebrow}>{c.vision.eyebrow}</p>
              <h2 id="vision-title">{c.vision.title}</h2>
            </div>
            <div className={styles.visionText}>
              <p>{c.vision.body}</p>
              <strong>{c.vision.statement}</strong>
            </div>
          </div>
          <div className={styles.visionScenes}>
            <div>
              <Picture name="visionCity" className={styles.visionWideImage} />
              <p>{c.vision.cityCaption}</p>
            </div>
            <div>
              <Picture name="visionNomad" className={styles.visionPortraitImage} />
              <p>{c.vision.nomadCaption}</p>
            </div>
          </div>
          <div className={styles.visionPillars}>
            {c.vision.pillars.map((pillar, index) => (
              <article key={pillar.title}>
                <span>0{index + 1}</span><h3>{pillar.title}</h3><p>{pillar.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.nomads} aria-labelledby="nomads-title">
          <Picture name="nomadWork" className={styles.nomadImage} />
          <div className={styles.nomadCopy}>
            <p className={styles.eyebrow}>{c.nomads.eyebrow}</p>
            <h2 id="nomads-title">{c.nomads.title}</h2>
            <p>{c.nomads.body}</p>
            <div className={styles.nomadPrinciples}>
              {c.nomads.items.map((principle, index) => (
                <article key={principle.title}>
                  <span>0{index + 1}</span><h3>{principle.title}</h3><p>{principle.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.remote} aria-labelledby="remote-title">
          <div className={styles.remoteCopy}>
            <p className={styles.eyebrow}>{c.remote.eyebrow}</p>
            <h2 id="remote-title">{c.remote.title}</h2>
            <p>{c.remote.body}</p>
            <ul className={styles.remoteList}>
              {c.remote.items.map((entry, index) => (
                <li key={entry}><span>0{index + 1}</span><p>{entry}</p></li>
              ))}
            </ul>
          </div>
          <div className={styles.remoteStrip} aria-hidden="true">
            <Picture name="remoteTeam" alt="" className={styles.remoteMainImage} />
            <Picture name="remoteNetwork" alt="" className={styles.remoteImage} />
            <Picture name="remoteRoutine" alt="" className={styles.remoteImage} />
          </div>
        </section>

        <section className={styles.flow} id="about-flow" aria-labelledby="flow-title">
          <header className={styles.flowHeader}>
            <div>
              <p className={styles.chapterNumber}>04</p>
              <p className={styles.eyebrow}>{c.flow.eyebrow}</p>
            </div>
            <h2 id="flow-title">{c.flow.title}</h2>
          </header>
          <div className={styles.flowSteps}>
            {c.flow.items.map((step, index) => {
              const image: AboutMediaKey = index === 0 ? "flowArrival" : index === 1 ? "flowWork" : "flowBelong";
              return (
                <article key={step.title}>
                  <Picture name={image} alt="" className={styles.flowImage} />
                  <div><span>0{index + 1}</span><h3>{step.title}</h3><p>{step.body}</p></div>
                </article>
              );
            })}
          </div>
        </section>

        <section className={styles.short} aria-labelledby="short-title">
          <Picture name="shortBackdrop" alt="" className={styles.shortBackdrop} />
          <div className={styles.shortPanel}>
            <p className={styles.eyebrow}>{c.short.eyebrow}</p>
            <h2 id="short-title">{c.short.title}</h2>
            <p>{c.short.body}</p>
            <a
              className={styles.primaryAction}
              href={"https://www.craysclub.com/" + locale + "/team"}
              rel="noreferrer"
              target="_blank"
            >
              {c.short.cta}<ArrowRight aria-hidden="true" size={17} strokeWidth={2} />
            </a>
          </div>
        </section>
      </main>
    </ClubsPublicShell>
  );
}
