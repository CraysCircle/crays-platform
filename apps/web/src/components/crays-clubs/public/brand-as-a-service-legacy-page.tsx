import Image from "next/image";
import { BadgeDollarSign, Boxes, ChartNoAxesCombined, ConciergeBell, Puzzle, ShieldCheck, Sparkles } from "lucide-react";

import type { CraysPublicLocale } from "./clubs-public-locale-contract";
import { ClubsPublicShell } from "./clubs-public-shell";
import styles from "./brand-as-a-service-page.module.css";

const AVAILABLE_LOCALES = ["en", "de", "es", "ca", "fr", "pt", "it"] as const;
const MEDIA_ROOT = "/__crays-clubs/phase9-owner";
const FOREST_CITY = `${MEDIA_ROOT}/forest-city-v16`;
const BRAND_MEDIA = `${MEDIA_ROOT}/brand-as-a-service-wireframe`;

const SUPPORT = [
  ["Brand & Demand", "Global brand power, member demand, booking infrastructure and a tokenized partner network.", ChartNoAxesCombined],
  ["Technology", "Hospitality OS, CRM, revenue tools and centralized member marketing.", ConciergeBell],
  ["Distribution", "Crays Club platform exposure, campaigns and member referrals.", Puzzle],
  ["Revenue & Quality", "Pricing, yield, service standards, reviews and quality frameworks.", BadgeDollarSign],
] as const;

const PLATFORM = [
  ["Brand Power & Member Demand", "Global brand, real member demand, booking infrastructure and tokenized partner network.", "wireframe-platform-pool-women-v2.webp"],
  ["Technology & Playbook", "Hospitality OS, CRM, revenue tools, operations playbooks and member marketing.", "wireframe-seaview-pool-terrace.jpeg"],
  ["Distribution & Exposure", "Crays Club platform exposure, campaigns and member referrals.", "prime-location-city-terrace.png"],
  ["Revenue & Yield Management", "Pricing, yield management, ancillary revenue and financial reporting.", "wireframe-club-lounge.jpg"],
  ["Quality & Guest Experience", "Service standards, reviews, guest feedback loops and quality frameworks.", "tropical-resort-pool.png"],
  ["Independence & Ownership", "You own and run your place. Crays amplifies it without classic royalty traps.", "wireframe-platform-night-women-v2.webp"],
] as const;

const JOURNEY = [
  ["Express Interest", "Share your property or idea. We’ll open the conversation."],
  ["Discovery & Fit", "We review your asset, goals and market potential together."],
  ["Design & Plan", "Concept, scope, CAPEX, timeline and operating model."],
  ["Build & Launch", "We build it out. You get ready. We plan the grand opening."],
  ["Open & Operate", "Go live with brand power, tech, playbooks and member demand."],
  ["Optimize & Grow", "Continuous revenue management, quality, marketing and community."],
] as const;

const PROPERTY_FIT = [
  ["Beach, mountain, wellness or retreat property.", "We check seasonality, arrival flow, programming space, F&B potential and whether the place can carry curated Crays weeks.", "wireframe-property-coastal-women-v2.webp"],
  ["Hospitality plus public ground-floor energy.", "Cafe, lounge, coworking, events or retail space can turn the building into a local node instead of only a bed inventory.", "wireframe-seaside-restaurant.webp"],
  ["Prime location with room for a club layer.", "This is for assets that can justify deeper design, members areas, events, partnerships and a stronger launch campaign.", "prime-location-city-terrace.png"],
  ["Your independence is protected.", "You own and operate your asset. Crays activates demand, systems and standards.", "owner-operator-conversation.png"],
  ["Stronger operations, happier guests.", "Playbooks, training and technology help you deliver consistent quality and better reviews.", "wireframe-night-restaurant.webp"],
  ["Better economics, real upside.", "Revenue management, ancillary income and brand exposure drive stronger results.", "wireframe-coastal-property.webp"],
] as const;

const OWNER_STEPS = [
  ["The Right Property", "Check if your asset fits.", ShieldCheck],
  ["The Right Format", "Match the work scope.", Sparkles],
  ["What We Bring", "What Crays brings into your house.", Boxes],
] as const;

const PACKAGES = [
  ["Essentials Refresh", "Smart upgrades, brand layer, tech setup and operating playbooks.", "wireframe-club-lounge.jpg"],
  ["Club Upgrade", "Deeper design, members areas, events and stronger F&B program.", "wireframe-seaside-restaurant.webp"],
  ["Full Club Transformation", "Full redesign, club spaces, programming and brand integration.", "prime-location-city-terrace.png"],
  ["Mixed-Use Activation", "Hospitality, living, wellness, work and community under one roof.", "serviced-apartment.jpg"],
] as const;

function ActionPair() {
  return (
    <div className={styles.actions}>
      <a className={styles.primaryAction} href="https://www.crays.org/en/association/">Go to Association</a>
      <a className={styles.secondaryAction} href="mailto:info@crays.org?subject=Crays%20Brand%20as%20a%20Service%20Application">Start Application</a>
    </div>
  );
}

function ImageCard({ body, image, index, title }: { body: string; image: string; index?: number; title: string }) {
  return (
    <article className={styles.imageCard}>
      <div className={styles.cardImage}>
        <Image alt="" fill sizes="(max-width: 760px) 84vw, 24vw" src={`${BRAND_MEDIA}/${image}`} />
      </div>
      {typeof index === "number" ? <span>{String(index + 1).padStart(2, "0")}</span> : null}
      <h3>{title}</h3>
      <p>{body}</p>
    </article>
  );
}

export function BrandAsAServiceLegacyPage({ locale }: { locale: CraysPublicLocale }) {
  return (
    <ClubsPublicShell availableLocales={AVAILABLE_LOCALES} headerTone="overlay" locale={locale}>
      <main className={styles.page}>
        <section className={styles.hero} aria-labelledby="brand-hero-title">
          <Image alt="Aerial view of the Forest City waterfront destination" className={styles.coverImage} fill priority sizes="(max-width: 640px) 340vw, (max-width: 900px) 180vw, 100vw" src={`${BRAND_MEDIA}/brand-as-a-service-hero-forest-city-1920.webp`} />
          <div className={styles.heroShade} aria-hidden="true" />
          <div className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <p className={styles.kicker}>Crays Brand as a Service with no classic royalty trap</p>
              <h1 id="brand-hero-title">Open<br />your own<br />Crays Club!</h1>
              <p className={styles.heroLead}>Got a property? Bring it. Don&apos;t have one yet? Let&apos;s find it together. You run it, we build it out, Crays plugs you into a global brand, shared tech, cooperative marketing and sales, hospitality playbooks, and a community that actually shows up — no classic royalty fees, no gatekeepers.</p>
              <ActionPair />
            </div>
            <aside className={styles.heroNote}>
              <strong>No classic fee buy-in.</strong>
              <p>Approved operators qualify through the Crays Association, which governs and protects the Crays brand. The Swiss Crays Cooperative Society coordinates shared sales, marketing and hospitality standards — bringing together independent entrepreneurs with voting rights under one global Work, Live & Play standard while every location remains independently owned and operated.</p>
            </aside>
          </div>
        </section>

        <section className={styles.supportBand} aria-labelledby="support-title">
          <div className={styles.sectionInner}>
            <div className={styles.supportIntro}>
              <div><p className={styles.kicker}>Built to help you win</p><h2 id="support-title">Crays partners with you from<br /> day one — and stays with you.</h2></div>
              <div className={styles.supportGrid}>
                {SUPPORT.map(([title, body, Icon]) => <article key={title}><Icon aria-hidden="true" size={28} strokeWidth={1.6} /><h3>{title}</h3><p>{body}</p></article>)}
              </div>
            </div>
          </div>
        </section>

        <section className={styles.lightSection} aria-labelledby="platform-title">
          <div className={styles.sectionInner}>
            <header className={styles.sectionHeader}>
              <div><p className={styles.kicker}>A platform that serves you</p><h2 id="platform-title">Everything you need. Nothing<br /> you don&apos;t.</h2></div>
              <p>Crays Brand as a Service gives independent operators the power of a global hospitality ecosystem without giving up control.</p>
            </header>
            <div className={styles.sixGrid}>{PLATFORM.map(([title, body, image], index) => <ImageCard body={body} image={image} index={index} key={title} title={title} />)}</div>
          </div>
        </section>

        <section className={styles.journeySection} aria-labelledby="journey-title">
          <Image alt="Forest City waterfront towers" className={styles.coverImage} fill sizes="100vw" src={`${FOREST_CITY}/hero-forest-city-coast.webp`} />
          <div className={styles.journeyShade} aria-hidden="true" />
          <div className={styles.sectionInner}>
            <p className={styles.kicker}>A platform that routes</p>
            <h2 id="journey-title">From idea to a thriving<br /> Crays Club.</h2>
            <ol className={styles.timeline}>{JOURNEY.map(([title, body], index) => <li key={title}><span>{String(index + 1).padStart(2, "0")}</span><h3>{title}</h3><p>{body}</p></li>)}</ol>
          </div>
        </section>

        <section className={styles.lightSection} aria-labelledby="property-title">
          <div className={styles.sectionInner}>
            <header className={styles.sectionHeader}>
              <div><p className={styles.kicker}>Your six-step route works</p><h2 id="property-title">The right place makes all<br /> the difference.</h2></div>
              <p>Turn your independent hospitality operation into a Crays network node. If you run a hotel, co-living house, serviced apartment, retreat venue, or mixed-use asset, you can add brand power, a full Hospitality OS, real member demand, booking infrastructure, and a tokenized partner network without giving up your property, your team, or what makes your place yours.</p>
            </header>
            <div className={styles.sixGrid}>{PROPERTY_FIT.map(([title, body, image]) => <ImageCard body={body} image={image} key={title} title={title} />)}</div>
          </div>
        </section>

        <section className={styles.ownerSection} aria-labelledby="owner-title">
          <div className={styles.ownerInner}>
            <div className={styles.ownerImage}><Image alt="Two future Crays Club owners celebrating together" fill sizes="(max-width: 760px) 100vw, 42vw" src={`${BRAND_MEDIA}/wireframe-owner-party-women-v2.webp`} /></div>
            <div className={styles.ownerCopy}>
              <p className={styles.kicker}>Are you the right owner?</p>
              <h2 id="owner-title">Start with the building,<br /> not the buzzword.</h2>
              <p>Crays Club Brand as a Service fits properties that already have location, structure and soul. We check what should be protected, what must be upgraded, and whether the building can carry hospitality, community and repeat demand without becoming a chain conversion.</p>
              <div className={styles.ownerSteps}>{OWNER_STEPS.map(([title, body, Icon], index) => <article key={title}><span>{String(index + 1).padStart(2, "0")}</span><Icon aria-hidden="true" size={22} strokeWidth={1.6} /><div><h3>{title}</h3><p>{body}</p></div></article>)}</div>
            </div>
          </div>
        </section>

        <section className={styles.lightSection} aria-labelledby="package-title">
          <div className={styles.sectionInner}>
            <header className={styles.sectionHeader}>
              <div><p className={styles.kicker}>Your operating package</p><h2 id="package-title">How deep do you want<br /> to go?</h2></div>
              <p>Choose the level of transformation that fits your asset, budget and ambition. You stay in control. Crays brings the system.</p>
            </header>
            <div className={styles.fourGrid}>{PACKAGES.map(([title, body, image]) => <ImageCard body={body} image={image} key={title} title={title} />)}</div>
          </div>
        </section>

        <section className={styles.finalCta} id="application" aria-labelledby="application-title">
          <Image alt="Forest City waterfront destination" className={styles.coverImage} fill sizes="100vw" src={`${BRAND_MEDIA}/brand-as-a-service-hero-forest-city-1920.webp`} />
          <div className={styles.finalShade} aria-hidden="true" />
          <div className={styles.finalInner}>
            <div><h2 id="application-title">Let&apos;s build a Crays Club that your market loves.</h2><p>Bring your property or your idea. We&apos;ll help you turn it into a Crays Club — with global brand power, smart technology and a community that fills your rooms and your calendar.</p></div>
            <ActionPair />
          </div>
        </section>
      </main>
    </ClubsPublicShell>
  );
}
