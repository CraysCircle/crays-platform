"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, ExternalLink } from "lucide-react";

import { ClubsPublicShell } from "./clubs-public-shell";
import {
  forestCityPublicCopy,
  type ForestCityPublicLocale,
} from "./forest-city-public-copy";
import styles from "./clubs-forest-city-public-page.module.css";
import { getClubsCopy } from "@/lib/clubs/public-site-copy";

type ForestCityPublicPageProps = {
  locale: ForestCityPublicLocale;
};

const englishOnly = ["en"] as const;
const localizedLocales = ["en", "de", "es", "ca", "fr", "pt", "it"] as const;
const heroBody =
  "CRAYS is a new international living and working community in Forest City, Malaysia — a waterfront city and Special Financial Zone at the gateway to Singapore. Here, founders, remote professionals and their families live, work and grow together, steps from the sea.";

const featureMedia = [
  {
    src: "/__crays-clubs/phase9-owner/forest-city-v16/community-events-forest-city-sunset.webp",
    alt: "Forest City waterfront at sunset",
    position: "center 56%",
  },
  {
    src: "/__crays-clubs/phase9-owner/forest-city-v16/work-forest-city-aerial.webp",
    alt: "Aerial view across Forest City",
    position: "center",
  },
  {
    src: "/__crays-clubs/phase9-owner/forest-city-v16/forest-city-tropical-walkway.webp",
    alt: "Tropical walkway in Forest City",
    position: "center",
  },
  {
    src: "/__crays-clubs/phase9-owner/forest-city-v16/forest-city-beach-boats.webp",
    alt: "Boats on the Forest City shoreline",
    position: "center",
  },
  {
    src: "/__crays-clubs/phase9-owner/forest-city-v16/forest-city-marina-pool.webp",
    alt: "Forest City marina and pool setting",
    position: "center",
  },
  {
    src: "/__crays-clubs/phase9-owner/forest-city-v16/host-forest-city-base.webp",
    alt: "Forest City waterfront base",
    position: "center",
  },
] as const;

export function ClubsForestCityPublicPage({
  locale,
}: ForestCityPublicPageProps) {
  const safeLocale = locale;
  const copy = forestCityPublicCopy[safeLocale];
  const homepageCopy = getClubsCopy(safeLocale);
  const localized = safeLocale !== "en";
  const root = `/${safeLocale}`;

  return (
    <ClubsPublicShell availableLocales={localized ? localizedLocales : englishOnly} locale={safeLocale}>
      <main className={styles.page} id="clubs-forest-city-content">
        <section className={styles.hero} aria-labelledby="forest-city-title">
          <Image
            alt={localized ? copy.title : "Forest City waterfront, beach and skyline"}
            className={styles.heroImage}
            fill
            priority
            sizes="100vw"
            src="/__crays-clubs/forest-city-public/forest-city-hero-option1.png"
          />
          <div className={styles.heroShade} aria-hidden="true" />
          <div className={styles.heroContent}>
            <p className={styles.kicker}>{localized ? copy.eyebrow : "CRAYS CLUBS · FOREST CITY"}</p>
            <h1 id="forest-city-title">Forest City</h1>
            <p className={styles.heroClaim}>
              {localized ? copy.title : "A New Era of Work, Live, and Play"}
            </p>
            <p className={styles.heroLead}>
              {localized
                ? homepageCopy.hero.body
                : "Work, live, play, and build your next chapter with us in an invitation-led community by the sea."}
            </p>
            <div className={styles.heroActions}>
              <Link
                className={styles.primaryButton}
                href={`${root}/become-a-member`}
              >
                {localized ? copy.inquiryAction : "Apply"}{" "}
                <ArrowRight aria-hidden="true" size={18} strokeWidth={1.6} />
              </Link>
            </div>
            <p className={styles.heroBody}>{localized ? copy.intro : heroBody}</p>
          </div>
          <a className={styles.scrollCue} href="#forest-city-context">
            <ArrowDown aria-hidden="true" size={17} strokeWidth={1.5} />
            <span>{localized ? copy.exploreAction : "Scroll to explore"}</span>
          </a>
        </section>

        <section
          className={styles.context}
          id="forest-city-context"
          aria-labelledby="context-title"
        >
          <header className={styles.sectionIntro}>
            <p className={styles.kicker}>{copy.contextEyebrow}</p>
            <h2 id="context-title">{copy.contextTitle}</h2>
            <p>{copy.contextBody}</p>
          </header>
          <div className={styles.factGrid}>
            {copy.contextFacts.map((fact) => (
              <article key={fact.label}>
                <span>{fact.label}</span>
                <h3>{fact.title}</h3>
                <p>{fact.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.hotelStories} aria-labelledby="paths-title">
          <header className={styles.hotelIntro}>
            <p className={styles.kicker}>{copy.pathsEyebrow}</p>
            <h2 id="paths-title">{copy.pathsTitle}</h2>
            <p>{copy.pathsBody}</p>
          </header>

          <article className={styles.golfStory}>
            <div className={styles.hotelImage}>
              <Image
                alt={localized ? copy.golf.title : "Forest City Golf Hotel exterior"}
                fill
                loading="eager"
                sizes="(max-width: 760px) 100vw, 62vw"
                src="/__crays-clubs/forest-city-public/golf-hotel-exterior.jpg"
              />
            </div>
            <div className={styles.hotelCopy}>
              <p className={styles.kicker}>{copy.golf.eyebrow}</p>
              <h3>{copy.golf.title}</h3>
              <p>{copy.golf.body}</p>
              <strong>{copy.golf.boundary}</strong>
              <Link href={`${root}/hospitality`}>
                {copy.golf.action}
                <ArrowRight aria-hidden="true" size={18} strokeWidth={1.6} />
              </Link>
            </div>
          </article>

          <article className={styles.marinaStory} id="marina-admission">
            <div className={styles.hotelCopy}>
              <p className={styles.kicker}>{copy.marina.eyebrow}</p>
              <h3>{copy.marina.title}</h3>
              <p>{copy.marina.body}</p>
              <strong>{copy.marina.boundary}</strong>
              <a href="#journey-states">
                {copy.marina.action}
                <ArrowDown aria-hidden="true" size={18} strokeWidth={1.6} />
              </a>
            </div>
            <div className={styles.hotelImage}>
              <Image
                alt={localized ? copy.marina.title : "Forest City Marina Hotel exterior"}
                fill
                loading="eager"
                sizes="(max-width: 760px) 100vw, 58vw"
                src="/__crays-clubs/forest-city-public/marina-hotel-exterior.jpg"
              />
            </div>
          </article>
        </section>

        <section className={styles.everyday} aria-labelledby="everyday-title">
          <header className={styles.sectionIntro}>
            <p className={styles.kicker}>{copy.everydayEyebrow}</p>
            <h2 id="everyday-title">{copy.everydayTitle}</h2>
            <p>{copy.everydayBody}</p>
          </header>
          <div className={styles.featureGrid}>
            {copy.functions.map((feature, index) => {
              const media = featureMedia[index];
              return (
                <article className={styles.featureCard} key={feature.label}>
                  <div className={styles.featureImage}>
                    <Image
                      alt={localized ? feature.title : media.alt}
                      fill
                      loading="eager"
                      sizes="(max-width: 760px) 100vw, (max-width: 1100px) 50vw, 33vw"
                      src={media.src}
                      style={{ objectPosition: media.position }}
                    />
                  </div>
                  <div className={styles.featureCopy}>
                    <span>
                      {String(index + 1).padStart(2, "0")} / {feature.label}
                    </span>
                    <h3>{feature.title}</h3>
                    <p>{feature.body}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section
          className={styles.states}
          id="journey-states"
          aria-labelledby="states-title"
        >
          <header className={styles.statesIntro}>
            <p className={styles.kicker}>{copy.statesEyebrow}</p>
            <h2 id="states-title">{copy.statesTitle}</h2>
            <p>{copy.statesBody}</p>
          </header>
          <ol>
            {copy.states.map((state) => (
              <li key={state.label}>
                <span>{state.label}</span>
                <h3>{state.title}</h3>
                <p>{state.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.faq} aria-labelledby="faq-title">
          <header>
            <p className={styles.kicker}>{copy.faqEyebrow}</p>
            <h2 id="faq-title">{copy.faqTitle}</h2>
          </header>
          <div className={styles.faqList}>
            {copy.faqs.map((item, index) => (
              <details key={item.question}>
                <summary>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  {item.question}
                </summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className={styles.closing} aria-labelledby="closing-title">
          <p className={styles.kicker}>{copy.closingEyebrow}</p>
          <h2 id="closing-title">{copy.closingTitle}</h2>
          <p>{copy.closingBody}</p>
          <Link
            className={styles.primaryButton}
            href={`${root}/contact#contact-form`}
          >
            {copy.closingAction}
            <ArrowRight aria-hidden="true" size={18} strokeWidth={1.6} />
          </Link>
        </section>

        <section
          className={styles.association}
          aria-labelledby="association-title"
        >
          <div className={styles.associationImage}>
            <Image
              alt={localized ? copy.closingTitle : "Forest City beach boardwalk"}
              fill
              loading="eager"
              sizes="(max-width: 760px) 100vw, 58vw"
              src="/__crays-clubs/phase9-owner/forest-city-v16/forest-city-beach-boardwalk.webp"
            />
          </div>
          <div>
            <p className={styles.kicker}>CRAYS CLUBS</p>
            <h2 id="association-title">Crays Association</h2>
            <p>
              Meet friends, colleagues and business partners in the new Crays
              Club world.
            </p>
            <a
              href="https://www.crays.org/"
              rel="noreferrer noopener"
              target="_blank"
            >
              Visit Crays Association
              <ExternalLink aria-hidden="true" size={17} strokeWidth={1.6} />
            </a>
          </div>
        </section>
      </main>
    </ClubsPublicShell>
  );
}
