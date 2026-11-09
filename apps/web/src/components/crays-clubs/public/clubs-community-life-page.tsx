"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowDown, ArrowUpRight, ShieldCheck } from "lucide-react";
import { JourneyShell } from "../journeys-phase8/journey-shell";
import { lifestyleCopy } from "./lifestyle-copy";
import { communityCopy, type CommunityBlock, type CommunityLocale } from "./community-life-copy";
import { communityLifeMedia, type CommunityLifeMedia } from "./community-life-media-v2";
import styles from "./clubs-community-life-page.module.css";

function SafeImage({ media, eager = false, className }: { media: CommunityLifeMedia; eager?: boolean; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <div className={`${styles.mediaGate} ${className ?? ""}`} role="img" aria-label={media.alt}><ShieldCheck aria-hidden="true" /><strong>CRAYS CLUB</strong><span>Media held back safely</span></div>;
  }
  return <img className={className} src={media.src} alt={media.alt} loading={eager ? "eager" : "lazy"} fetchPriority={eager ? "high" : "auto"} decoding="async" style={{ objectPosition: media.crop.replace("cover ", "") }} data-media-id={media.id} data-source={media.sourceUrl} data-creator={media.creator} onError={() => setFailed(true)} />;
}

function PillarStrip({ items }: { items: CommunityBlock[] }) {
  return <section className={styles.pillars} aria-label="Community pillars"><div className={styles.pillarGrid}>{items.map((item) => <article key={item.kicker}><span>{item.kicker}</span><h2>{item.title}</h2><p>{item.body}</p></article>)}</div></section>;
}

export function ClubsCommunityLifePage({ locale }: { locale: CommunityLocale }) {
  const copy = communityCopy[locale];
  return (
    <JourneyShell locale={locale} copy={lifestyleCopy[locale].shell}>
      <main id="community-life-main" className={styles.page}>
        <section className={styles.hero} aria-labelledby="community-title">
          <SafeImage media={communityLifeMedia[0]} eager className={styles.heroBackground} />
          <div className={styles.heroLayer} />
          <div className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>{copy.hero.eyebrow}</p>
              <h1 id="community-title">{copy.hero.title}</h1>
              <p className={styles.heroLead}>{copy.hero.body}</p>
              <nav className={styles.actions} aria-label="Community Life actions">
                <Link className={styles.primaryButton} href={`/${locale}/become-a-member`}>{copy.hero.primary}<ArrowUpRight aria-hidden="true" /></Link>
                <a className={styles.secondaryButton} href="#community-layer">{copy.hero.secondary}<ArrowDown aria-hidden="true" /></a>
              </nav>
            </div>
            <aside className={styles.heroMosaic} aria-label="Generic community scenes">
              <figure className={styles.heroLarge}><SafeImage media={communityLifeMedia[1]} /></figure>
              <figure><SafeImage media={communityLifeMedia[2]} /></figure>
              <figure><SafeImage media={communityLifeMedia[3]} /></figure>
              <div className={styles.heroNote}><strong>Work. Live. Play. Belong.</strong><span>{copy.hero.strap.split(". ").slice(4).join(". ") || copy.hero.strap}</span></div>
            </aside>
          </div>
        </section>

        <PillarStrip items={copy.modes} />

        <section className={styles.layerSection} id="community-layer" aria-labelledby="layer-title">
          <div className={styles.layerCopy}>
            <p className={styles.eyebrow}>{copy.layer.eyebrow}</p>
            <h2 id="layer-title">{copy.layer.title}</h2>
            <p className={styles.sectionLead}>{copy.layer.body}</p>
            <div className={styles.featureLines}>{copy.layer.features.map((item, index) => <article key={item.title}><span>{String(index + 1).padStart(2, "0")}</span><div><small>{item.kicker}</small><h3>{item.title}</h3><p>{item.body}</p></div></article>)}</div>
          </div>
          <div className={styles.layerMedia}>
            <figure><SafeImage media={communityLifeMedia[4]} /></figure>
            <figure><SafeImage media={communityLifeMedia[5]} /></figure>
            <span aria-hidden="true">COMMUNITY / EVERY DAY</span>
          </div>
        </section>

        <section className={styles.rhythm} id="rhythm" aria-labelledby="rhythm-title">
          <header className={styles.splitHeader}>
            <div><p className={styles.eyebrow}>{copy.rhythm.eyebrow}</p><h2 id="rhythm-title">{copy.rhythm.title}</h2></div>
            <p>{copy.rhythm.body}</p>
          </header>
          <div className={styles.rhythmGrid}>{copy.rhythm.stages.map((item, index) => <article key={item.title}>
            <figure><SafeImage media={communityLifeMedia[6 + index]} /></figure>
            <div><span>{item.kicker}</span><h3>{item.title}</h3><p>{item.body}</p></div>
          </article>)}</div>
        </section>

        <section className={styles.modesSection} aria-labelledby="modes-title">
          <div className={styles.modeIntro}>
            <p className={styles.eyebrow}>{copy.community.eyebrow}</p>
            <h2 id="modes-title">{copy.community.title}</h2>
            <p>{copy.community.body}</p>
          </div>
          <div className={styles.modeMosaic}>{copy.community.modes.map((item, index) => <article key={item.title} className={styles.modeCard}>
            <SafeImage media={communityLifeMedia[9 + index]} />
            <div><span>{item.kicker}</span><h3>{item.title}</h3><p>{item.body}</p></div>
          </article>)}</div>
        </section>

        <section className={styles.hosted} aria-labelledby="hosted-title">
          <div className={styles.hostedCollage}>
            <figure className={styles.hostedPrimary}><SafeImage media={communityLifeMedia[13]} /></figure>
            <figure><SafeImage media={communityLifeMedia[14]} /></figure>
            <figure><SafeImage media={communityLifeMedia[15]} /></figure>
          </div>
          <div className={styles.hostedCopy}>
            <p className={styles.eyebrow}>{copy.hosted.eyebrow}</p>
            <h2 id="hosted-title">{copy.hosted.title}</h2>
            <p className={styles.sectionLead}>{copy.hosted.body}</p>
            <div className={styles.hostedList}>{copy.hosted.features.map((item) => <article key={item.title}><span>{item.kicker}</span><h3>{item.title}</h3><p>{item.body}</p></article>)}</div>
          </div>
        </section>

        <section className={styles.citizen} aria-labelledby="citizen-title">
          <div className={styles.citizenCopy}>
            <p className={styles.eyebrow}>{copy.global.eyebrow}</p>
            <h2 id="citizen-title">{copy.global.title}</h2>
            <p>{copy.global.body}</p>
          </div>
          <div className={styles.citizenPrinciples}>{copy.global.features.map((item, index) => <article key={item.title}><span>{String(index + 1).padStart(2, "0")} / {item.kicker}</span><h3>{item.title}</h3><p>{item.body}</p></article>)}</div>
          <figure className={styles.citizenMedia}><SafeImage media={communityLifeMedia[16]} /></figure>
        </section>

        <section className={styles.closing} aria-labelledby="closing-title">
          <p className={styles.eyebrow}>{copy.closing.eyebrow}</p>
          <h2 id="closing-title">{copy.closing.title}</h2>
          <p>{copy.closing.body}</p>
          <nav className={styles.actions} aria-label="Closing actions">
            <Link className={styles.primaryButton} href={`/${locale}/become-a-member`}>{copy.closing.primary}<ArrowUpRight aria-hidden="true" /></Link>
            <Link className={styles.secondaryButton} href={`/${locale}/contact`}>{copy.closing.secondary}<ArrowUpRight aria-hidden="true" /></Link>
          </nav>
        </section>
      </main>
    </JourneyShell>
  );
}
