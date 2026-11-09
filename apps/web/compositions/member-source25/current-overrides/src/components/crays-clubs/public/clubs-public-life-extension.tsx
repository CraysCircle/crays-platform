"use client";

import { ArrowRight, Circle } from "lucide-react";
import type { PointerEvent } from "react";
import { getHomepageEvolutionCopy } from "./homepage-current-translation";
import type { CraysPublicLocale } from "./clubs-public-locale-contract";
import styles from "./clubs-public-life-extension.module.css";
import { AGENTIC_LIFE_HREF } from "./clubs-public-agentic-teaser";

const experienceMedia = [
  {
    name: "Work",
    width: 1200,
    height: 1200,
    image: "work-welcome.webp",
    alt: "A smiling man in a Crays cap and shirt giving a thumbs up",
    title: <>Earn from what you do best.<br />{" "}Go further together.</>,
    body: "Find your next role, client or co-founder. Meet investors and mentors. Build with people who see your value.",
    details: "Workshops · Hackathons · Pitch rounds",
  },
  {
    name: "Live",
    width: 1672,
    height: 941,
    image: "live-together.webp",
    alt: "Two people laughing together over a relaxed conversation",
    title: <>Live independently.<br />{" "}Not alone.</>,
    body: "Find real friends, share everyday moments and make room for your wellbeing. Be seen. Be valued. Be yourself.",
    details: "Friendship · Healthy routines · A sense of home",
  },
  {
    name: "Play",
    width: 1254,
    height: 1254,
    image: "play-together.webp",
    alt: "A group of friends enjoying a sunny day together outdoors",
    title: <>Make memories,<br />{" "}not just money.</>,
    body: "Find people to explore with, laugh with and celebrate with. Meet your people. Maybe even your person.",
    details: "Shared adventures · Music · Moments that stay",
  },
] as const;

// Transient pointer values stay out of React state; the image moves inside its frame.
function movePhoto(event: PointerEvent<HTMLElement>) {
  if (event.pointerType !== "mouse" || !window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)").matches) return;
  const bounds = event.currentTarget.getBoundingClientRect();
  event.currentTarget.style.setProperty("--photo-x", `${((event.clientX - bounds.left) / bounds.width - 0.5) * 8}px`);
  event.currentTarget.style.setProperty("--photo-y", `${((event.clientY - bounds.top) / bounds.height - 0.5) * 6}px`);
}

function resetPhoto(event: PointerEvent<HTMLElement>) {
  event.currentTarget.style.removeProperty("--photo-x");
  event.currentTarget.style.removeProperty("--photo-y");
}

export function ClubsPublicLifeExtension({ ambassadorHref, locale = "en" }: { ambassadorHref: string; locale?: CraysPublicLocale }) {
  const copy = getHomepageEvolutionCopy(locale);
  const experiences = experienceMedia.map((media, index) => ({...media, ...copy.experiences[index], title: <>{copy.experiences[index].title[0]}<br />{" "}{copy.experiences[index].title[1]}</>}));
  return (
    <section className={styles.extension} aria-labelledby="work-live-play-heading" id="work-live-play">
      <div className={styles.inner}>
        <header className={styles.heading}>
          <p className={styles.kicker}>{copy.lifeKicker}</p>
          <h2 id="work-live-play-heading">{copy.lifeTitle[0]}<br />{" "}{copy.lifeTitle[1]}</h2>
          <p className={styles.introduction} style={{ whiteSpace: "pre-line" }}>{copy.lifeIntro}</p>
        </header>

        <div className={styles.experiences}>
          {experiences.map((experience, index) => (
            <article className={styles.experience} key={experience.name} aria-labelledby={`life-${experienceMedia[index].name.toLowerCase()}`}>
              <figure className={`${styles.photo} ${styles[`photo${index}`]}`} onPointerMove={movePhoto} onPointerLeave={resetPhoto}>
                <img src={`/__crays-clubs/life-extension/${experience.image}`} alt={experience.alt} width={experience.width} height={experience.height} loading="lazy" decoding="async" />
              </figure>
              <div className={`${styles.copy} ${styles[`copy${index}`]}`}>
                <p className={styles.kicker}>{experience.name}</p>
                <h3 id={`life-${experienceMedia[index].name.toLowerCase()}`}>{experience.title}</h3>
                <p className={styles.body}>{experience.body}</p>
                <p className={styles.details}>{experience.details}</p>
              </div>
            </article>
          ))}
        </div>

        <div className={styles.bridge}>
          <div className={styles.rule} aria-hidden="true"><Circle size={24} strokeWidth={1.5} /></div>
          <p>{copy.bridge}</p>
        </div>

        <section className={styles.network} aria-labelledby="network-for-life-heading">
          <img className={styles.networkImage} src="/__crays-clubs/life-extension/network-palms.webp" alt="" aria-hidden="true" loading="lazy" decoding="async" data-crays-photo-treatment="none" />
          <div className={styles.networkCopy}>
            <h2 id="network-for-life-heading">{copy.networkTitle}</h2>
            <p>{copy.networkBody[0]}<br />{" "}{copy.networkBody[1]}</p>
            <a href={ambassadorHref} className={styles.ambassadorCta}>{copy.ambassadorAction} <ArrowRight size={18} aria-hidden="true" /></a>
            <p className={styles.invitation}>{copy.networkInvitation}</p>
          </div>
        </section>
      </div>
    </section>
  );
}

// The compact invitation and the lower concept section share one information page.
export function ClubsPublicAppTeaser({ locale = "en" }: { locale?: CraysPublicLocale }) {
  const copy = getHomepageEvolutionCopy(locale);
  const [connection, together] = copy.appBody.split(" — ");
  return (
    <section className={styles.appTeaser} aria-labelledby="crays-app-heading" id="crays-app">
      <div className={styles.appVisual}>
        <img src="/__crays-clubs/life-extension/keep-your-circle-close.webp?v=1" alt={copy.appAlt} width={600} height={600} loading="lazy" />
      </div>
      <div className={styles.appCopy}>
        <p className={styles.kicker}>{copy.appKicker}</p>
        <h2 id="crays-app-heading">{copy.appTitle}</h2>
        <p><span className={styles.appBodyLine}>{connection} —</span>{" "}<span className={styles.appBodyLine}>{together}</span></p>
      </div>
      <div className={styles.appDetails}>
        <a className={styles.appLink} href={locale === "en" ? AGENTIC_LIFE_HREF : `/${locale}/agentic-life`}>{copy.appAction} <ArrowRight size={16} aria-hidden="true" /></a>
      </div>
    </section>
  );
}
