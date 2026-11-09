"use client";

import Link from "next/link";
import { ArrowRight, ExternalLink, ShieldCheck, Users, Landmark, Globe2, Building2 } from "lucide-react";
import { useRef, useState } from "react";
import { ClubsPublicShell } from "./clubs-public-shell";
import { lifestyleCopy, lifestyleLocales, type LifestyleLocale } from "./lifestyle-copy";
import {
  lifestyleMediaGroups,
  type LifestyleMediaAsset,
} from "./clubs-lifestyle-media-v2";
import styles from "./clubs-lifestyle-page.module.css";

type MediaItem = {
  label: string;
  media: "community" | "work" | "studio" | "food" | "blocked";
};

type Card = {
  kicker: string;
  title: string;
  body: string;
  href?: string;
  external?: boolean;
};

function Gate({ title, detail }: { title: string; detail: string }) {
  return (
    <div className={styles.gate} role="img" aria-label={detail}>
      <ShieldCheck aria-hidden="true" />
      <strong>{title}</strong>
      <small>{detail}</small>
    </div>
  );
}

function Picture({
  asset,
  title,
  detail,
  decorative = false,
}: {
  asset?: LifestyleMediaAsset;
  title: string;
  detail: string;
  decorative?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  if (!asset || failed) return <Gate title={title} detail={detail} />;
  return (
    <div className={styles.picture}>
      <img
        src={asset.src}
        alt={decorative ? "" : asset.alt}
        loading={asset.section === "hero" ? "eager" : "lazy"}
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        style={{ objectPosition: asset.crop }}
      />
    </div>
  );
}

function MediaStrip({
  items,
  assets,
  blockedTitle,
  blockedDetail,
}: {
  items: readonly MediaItem[];
  assets: readonly LifestyleMediaAsset[];
  blockedTitle: string;
  blockedDetail: string;
}) {
  let assetIndex = 0;
  return (
    <div className={styles.mediaStrip}>
      {items.map((item, index) => {
        const asset = item.media === "blocked" ? undefined : assets[assetIndex++];
        return (
          <figure key={item.label} className={styles[`media${(index % 3) + 1}`]}>
            <Picture asset={asset} title={blockedTitle} detail={blockedDetail} />
            <figcaption>{item.label}</figcaption>
          </figure>
        );
      })}
    </div>
  );
}

function EditorialRail({
  cards,
  href,
  withIcons = false,
}: {
  withIcons?: boolean;
  cards: readonly Card[];
  href: (value: string) => string;
}) {
  return (
    <div className={styles.editorialRail}>
      {cards.map((card, index) => {
        const Icon = [Users, Landmark, Globe2, Building2][index % 4] ?? Users;
        const content = (
          <>
            {!/^\d+$/.test(card.kicker) ? <span>{card.kicker}</span> : null}
            {withIcons ? <Icon className={styles.portalIcon} aria-hidden="true" size={28} strokeWidth={1.6} /> : null}
            <h3>{card.title}</h3>
            <p>{card.body}</p>
            {card.href ? <ArrowRight aria-hidden="true" size={18} /> : null}
          </>
        );
        if (!card.href) return <article key={card.title}>{content}</article>;
        if (card.external) {
          return <a href={card.href} target="_blank" rel="noreferrer noopener" key={card.title}>{content}</a>;
        }
        return <Link href={href(card.href)} key={card.title}>{content}</Link>;
      })}
    </div>
  );
}

function Story({
  id,
  eyebrow,
  title,
  body,
  cards,
  pictures,
  assets,
  blockedTitle,
  blockedDetail,
  href,
  dark = false,
}: {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  cards: readonly Card[];
  pictures: readonly MediaItem[];
  assets: readonly LifestyleMediaAsset[];
  blockedTitle: string;
  blockedDetail: string;
  href: (value: string) => string;
  dark?: boolean;
}) {
  return (
    <section id={id} className={dark ? styles.storyDark : styles.story}>
      <header>
        <p>{eyebrow}</p>
        <h2>{title}</h2>
        <div>{body}</div>
      </header>
      <MediaStrip items={pictures} assets={assets} blockedTitle={blockedTitle} blockedDetail={blockedDetail} />
      <EditorialRail cards={cards} href={href} />
    </section>
  );
}

function Action({
  label,
  to,
  locale,
  external = false,
}: {
  label: string;
  to: string;
  locale: LifestyleLocale;
  external?: boolean;
}) {
  if (external) {
    return (
      <a className={styles.button} href={to} target="_blank" rel="noreferrer noopener">
        {label}<ExternalLink aria-hidden="true" size={17} />
      </a>
    );
  }
  return (
    <Link className={styles.button} href={`/${locale}/${to}`}>
      {label}<ArrowRight aria-hidden="true" size={18} />
    </Link>
  );
}

export function ClubsLifestylePage({ locale }: { locale: LifestyleLocale }) {
  const safe = lifestyleLocales.includes(locale) ? locale : "en";
  const c = lifestyleCopy[safe];
  const page = (slug: string) => `/${safe}/${slug}`;
  const href = (value: string) => value.startsWith("http") ? value : page(value);
  const [activeMoment, setActiveMoment] = useState(0);
  const timelineRef = useRef<HTMLDivElement>(null);
  const selectMoment = (index: number) => {
    setActiveMoment(index);
    const track = timelineRef.current;
    const tile = track?.children[index] as HTMLElement | undefined;
    if (!track || !tile || track.scrollWidth <= track.clientWidth + 1) return;
    const start = (track.children[0] as HTMLElement).offsetLeft;
    track.scrollTo({ left: tile.offsetLeft - start, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };
  const readMomentScroll = () => {
    const track = timelineRef.current;
    if (!track || track.scrollWidth <= track.clientWidth + 1) return;
    const start = (track.children[0] as HTMLElement).offsetLeft;
    const maximum = track.scrollWidth - track.clientWidth;
    let closest = 0;
    let distance = Infinity;
    Array.from(track.children).forEach((element, index) => {
      const target = Math.min((element as HTMLElement).offsetLeft - start, maximum);
      const next = Math.abs(target - track.scrollLeft);
      if (next < distance) { closest = index; distance = next; }
    });
    setActiveMoment(current => current === closest ? current : closest);
  };


  return (
    <div className={styles.lifestyleFrame}>
    <ClubsPublicShell availableLocales={lifestyleLocales} locale={safe}>
      <main id="lifestyle-main" className={styles.page}>
        <section className={styles.hero}>
          <div className={styles.heroInner}>
          <div className={styles.heroAtmosphere} aria-hidden="true">
            <div className={styles.heroStage}>
              <Picture
                asset={lifestyleMediaGroups.hero[0]}
                title={c.mediaBlocked}
                detail={c.mediaBlockedDetail}
                decorative
              />
            </div>
            {lifestyleMediaGroups.hero.slice(1).map((asset, index) => (
              <div key={asset.id} className={`${styles.heroFrame} ${styles[`heroFrame${index + 1}`]}`}>
                <Picture
                  asset={asset}
                  title={c.mediaBlocked}
                  detail={c.mediaBlockedDetail}
                  decorative
                />
              </div>
            ))}
          </div>
          <div className={styles.heroCopy}>
            <p>{c.firstHero.eyebrow}</p>
            <h1>{c.firstHero.title}</h1>
            <div>{c.firstHero.body}</div>
            <nav>
              <Action locale={safe} label={c.firstHero.ctas[0]} to="become-a-member" />
              <Action locale={safe} label={c.firstHero.ctas[1]} to="hospitality" />
              <Action locale={safe} label={c.firstHero.ctas[2]} to="contact" />
            </nav>
          </div>
          </div>
          <nav className={styles.momentRail} aria-label={c.firstHero.eyebrow}>
            {c.anchors.map((anchor, index) => (
              <a key={anchor} href={["#layer", "#rhythm", "#doors", "#build"][index]}>
                
                <strong>{anchor}</strong>
              </a>
            ))}
          </nav>
        </section>

        <section id="layer" className={styles.layer}>
          <div className={styles.layerSignals} aria-label={c.firstHero.eyebrow}>
            {c.firstHero.signals.map((signal, index) => (
              <span key={signal}>{signal}</span>
            ))}
          </div>
          <header>
            <p>{c.layer.eyebrow}</p>
            <h2>{c.layer.title}</h2>
            <div>{c.layer.body}</div>
          </header>
          <EditorialRail cards={c.layer.cards} href={href} withIcons />
        </section>

        <section id="rhythm" className={styles.rhythm}>
          <header><p>{c.rhythm.eyebrow}</p><h2>{c.rhythm.title}</h2></header>
          <div className={styles.timeline} ref={timelineRef} onScroll={readMomentScroll}>
            {c.rhythm.stages.map((stage, index) => (
              <article key={stage.title} id={`lifestyle-moment-${index}`} role="button" tabIndex={0}
                aria-label={`${stage.marker}: ${stage.title}`} aria-pressed={activeMoment === index}
                data-active={activeMoment === index} onClick={() => selectMoment(index)}
                onPointerMove={event => {
                  if (event.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
                  const box = event.currentTarget.getBoundingClientRect();
                  event.currentTarget.style.setProperty("--life-image-x", `${((event.clientX - box.left) / box.width - 0.5) * 10}px`);
                  event.currentTarget.style.setProperty("--life-image-y", `${((event.clientY - box.top) / box.height - 0.5) * 10}px`);
                }}
                onPointerLeave={event => {
                  event.currentTarget.style.removeProperty("--life-image-x");
                  event.currentTarget.style.removeProperty("--life-image-y");
                }}
                onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectMoment(index); } }}>
                <Picture
                  asset={lifestyleMediaGroups.rhythm[index]}
                  title={c.mediaBlocked}
                  detail={c.mediaBlockedDetail}
                />
                <span>{stage.marker}</span>
                <h3>{stage.title}</h3>
                <p>{stage.body}</p>
              </article>
            ))}
          </div>
          <div className={styles.rhythmControls} aria-label={c.rhythm.eyebrow}>
            {c.rhythm.stages.slice(1).map((stage, index) => (
              <button type="button" key={stage.marker} aria-label={`${c.rhythm.stages[index].marker} to ${stage.marker}`} aria-controls={`lifestyle-moment-${index + 1}`} onClick={() => selectMoment(index + 1)}><ArrowRight aria-hidden="true" size={20} /></button>
            ))}
          </div>
          <div className={styles.rhythmPositions}>
            {c.rhythm.stages.map((stage, index) => <button key={stage.marker} type="button" aria-label={`${stage.marker}: ${stage.title}`} aria-pressed={activeMoment === index} onClick={() => selectMoment(index)}><span aria-hidden="true" /></button>)}
          </div>
          <p className={styles.srOnly} role="status" aria-live="polite">{c.rhythm.stages[activeMoment].marker}: {c.rhythm.stages[activeMoment].title}</p>
          <footer><strong>{c.rhythm.outcome}</strong><span>{c.rhythm.mood}</span></footer>
        </section>

        <section className={styles.feed}>
          <div className={styles.feedPhoto}><Picture asset={lifestyleMediaGroups.hero[2]} title={c.mediaBlocked} detail={c.mediaBlockedDetail} /></div>
          <header><p>{c.feed.eyebrow}</p><h2>{c.feed.title}</h2><div>{c.feed.body}</div></header>
          <div className={styles.steps}>
            {c.feed.stages.map((stage) => (
              <article key={stage.marker}><h3>{stage.title}</h3><p>{stage.body}</p></article>
            ))}
          </div>
        </section>

        <section id="doors" className={styles.doors}>
          <header><p>{c.doors.eyebrow}</p><h2>{c.doors.title}</h2></header>
          <EditorialRail cards={c.doors.cards} href={href} withIcons />
        </section>

        <section id="build" className={styles.build}>
          <div>
            <p>{c.build.eyebrow}</p>
            <h2>{c.build.title}</h2>
            <div>{c.build.body}</div>
            <nav>
              <Action locale={safe} label={c.build.ctas[0]} to="https://www.crays.org/" external />
              <Action locale={safe} label={c.build.ctas[1]} to="hospitality" />
              <Action locale={safe} label={c.build.ctas[2]} to="contact" />
            </nav>
          </div>
          <aside>
            {c.build.values.map((value, index) => (
              <span key={value}>{value}</span>
            ))}
          </aside>
        </section>

        <div hidden aria-hidden="true">
        <section className={styles.secondHero}>
          <div>
            <p>{c.secondHero.eyebrow}</p>
            <h2>{c.secondHero.title}</h2>
            <div>{c.secondHero.body}</div>
            <nav>
              <Action locale={safe} label={c.secondHero.ctas[0]} to="become-a-member" />
              <a className={styles.button} href="#architecture">{c.secondHero.ctas[1]}<ArrowRight aria-hidden="true" size={18} /></a>
            </nav>
          </div>
          <MediaStrip
            items={c.secondHero.media}
            assets={lifestyleMediaGroups.secondHero}
            blockedTitle={c.mediaBlocked}
            blockedDetail={c.mediaBlockedDetail}
          />
          <EditorialRail cards={c.secondHero.signals} href={href} />
        </section>

        <section id="architecture" className={styles.architecture}>
          <header><h2>{c.architecture.title}</h2><div>{c.architecture.body}</div></header>
          <MediaStrip
            items={c.architecture.media}
            assets={lifestyleMediaGroups.architecture}
            blockedTitle={c.mediaBlocked}
            blockedDetail={c.mediaBlockedDetail}
          />
          <EditorialRail cards={c.architecture.pillars} href={href} />
        </section>

        <Story id="founder" eyebrow={c.founder.eyebrow} title={c.founder.title} body={c.founder.body}
          cards={c.founder.cards} pictures={c.founder.media} assets={lifestyleMediaGroups.founder}
          blockedTitle={c.mediaBlocked} blockedDetail={c.mediaBlockedDetail} href={href} />
        <Story id="world" eyebrow={c.world.eyebrow} title={c.world.title} body={c.world.body}
          cards={c.world.cards} pictures={c.world.media} assets={lifestyleMediaGroups.world}
          blockedTitle={c.mediaBlocked} blockedDetail={c.mediaBlockedDetail} href={href} dark />
        <Story id="ecosystem" eyebrow={c.ecosystem.eyebrow} title={c.ecosystem.title} body={c.ecosystem.body}
          cards={c.ecosystem.cards} pictures={c.ecosystem.media} assets={lifestyleMediaGroups.ecosystem}
          blockedTitle={c.mediaBlocked} blockedDetail={c.mediaBlockedDetail} href={href} />

        <section className={styles.social}>
          <header><p>{c.social.eyebrow}</p><h2>{c.social.title}</h2><div>{c.social.body}</div></header>
          <div className={styles.steps}>
            {c.social.stages.map((stage) => (
              <article key={stage.marker}><span>{stage.marker}</span><h3>{stage.title}</h3><p>{stage.body}</p></article>
            ))}
          </div>
          <MediaStrip
            items={c.social.media}
            assets={lifestyleMediaGroups.social}
            blockedTitle={c.mediaBlocked}
            blockedDetail={c.mediaBlockedDetail}
          />
        </section>

        <section className={styles.creators}>
          <header><p>{c.creators.eyebrow}</p><h2>{c.creators.title}</h2><div>{c.creators.body}</div></header>
          <EditorialRail cards={c.creators.cards} href={href} />
        </section>

        <section className={styles.seeking}>
          <header>
            <p>{c.seeking.eyebrow}</p><h2>{c.seeking.title}</h2><div>{c.seeking.body}</div>
            <nav>
              <Action locale={safe} label={c.seeking.ctas[0]} to="https://www.crays.org/" external />
              <Action locale={safe} label={c.seeking.ctas[1]} to="contact" />
            </nav>
          </header>
          <EditorialRail cards={c.seeking.cards} href={href} />
        </section>

        <section className={styles.vision}>
          <p>{c.vision.eyebrow}</p><h2>{c.vision.title}</h2><div>{c.vision.body}</div>
          <strong>{c.vision.closing}</strong>
          <nav>
            <Action locale={safe} label={c.vision.ctas[0]} to="https://www.crays.org/" external />
            <Action locale={safe} label={c.vision.ctas[1]} to="hospitality" />
          </nav>
        </section>

        <section className={styles.credits}>
          <p>{c.credits}</p>
        </section>
        </div>
      </main>
    </ClubsPublicShell>
    </div>
  );
}
