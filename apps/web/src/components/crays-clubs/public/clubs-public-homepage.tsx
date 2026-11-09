"use client";

import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronDown,
  Dumbbell,
  Flag,
  Globe2,
  HeartHandshake,
  HeartPulse,
  MapPin,
  Mic2,
  Presentation,
  Sparkles,
  Users,
  Waves,
  Wifi,
} from "lucide-react";
import {
  useEffect,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import styles from "./clubs-public-homepage.module.css";
import motionStyles from "./clubs-public-photo-motion.module.css";
import { ClubsPublicLifeExtension, ClubsPublicAppTeaser } from "./clubs-public-life-extension";
import { ClubsPublicAgenticTeaser } from "./clubs-public-agentic-teaser";
import tokens from "./clubs-public-design-tokens.module.css";
import { ClubsPublicShell } from "./clubs-public-shell";
import type { CraysPublicLocale } from "./clubs-public-locale-contract";
import { homepageMediaV10, type HomepageMediaV10Key } from "./homepage-media-v10";

type ClubsPublicHomepageProps = {
  locale: string;
  copy?: unknown;
};

type HeroTile = {
  first: string;
  second: string;
  alt: string;
};

const media = (key: HomepageMediaV10Key) => homepageMediaV10[key].deliveryUrl;

const PUBLIC_LOCALES = ["en", "de", "es", "ca", "fr", "pt", "it"] as const;

const HERO_TILES: HeroTile[] = [
  {
    first: "/__crays-clubs/phase9-owner/forest-city-v16/hero-forest-city-city-aerial.webp",
    second: "/__crays-clubs/phase9-owner/forest-city-v16/forest-city-domus.webp",
    alt: "Modern Asian city life close to the waterfront",
  },
  {
    first: "/__crays-clubs/phase9-owner/owner-forest-city-campus.png",
    second: "/__crays-clubs/phase9-owner/forest-city-v16/forest-city-beach-skyline.webp",
    alt: "Waterfront city views and tropical living",
  },
  {
    first: "/__crays-clubs/phase9-owner/forest-city-v16/forest-city-marina-pool.webp",
    second: "/__crays-clubs/phase9-owner/hero-stock/hero-tile-06.jpg",
    alt: "Forest City inspired waterfront lifestyle",
  },
  {
    first: "/__crays-clubs/phase9-owner/hero-stock/hero-tile-07.jpg",
    second: "/__crays-clubs/phase9-owner/hero-stock/hero-tile-08.jpg",
    alt: "Contemporary hospitality and club spaces",
  },
  {
    first: "/__crays-clubs/phase9-owner/hero-stock/hero-tile-09.jpg",
    second: "/__crays-clubs/phase9-owner/hero-stock/hero-tile-10.jpg",
    alt: "Members working while travelling",
  },
  {
    first: "/__crays-clubs/phase9-owner/hero-stock/hero-tile-11.jpg",
    second: "/__crays-clubs/phase9-owner/hero-stock/hero-tile-12.jpg",
    alt: "Friends and colleagues connecting",
  },
  {
    first: "/__crays-clubs/phase9-owner/hero-stock/hero-tile-13.jpg",
    second: "/__crays-clubs/phase9-owner/hero-stock/hero-tile-14.jpg",
    alt: "Music, technology and collaborative workshops",
  },
  {
    first: "/__crays-clubs/phase9-owner/hero-stock/hero-tile-15.jpg",
    second: "/__crays-clubs/phase9-owner/hero-stock/hero-tile-16.jpg",
    alt: "Meals shared by the community",
  },
  {
    first: "/__crays-clubs/phase9-owner/hero-stock-owner-v1/tile9-right-second.avif",
    second: "/__crays-clubs/phase9-owner/hero-stock/hero-tile-18.jpg",
    alt: "Group fitness and strength training",
  },
  {
    first: "/__crays-clubs/phase9-owner/hero-stock/hero-tile-19.jpg",
    second: "/__crays-clubs/phase9-owner/forest-city-v16/hero-forest-city-coast.webp",
    alt: "Forest City waterfront and coastal life",
  },
  {
    first: "/__crays-clubs/phase9-owner/hero-stock/hero-tile-21.jpg",
    second: "/__crays-clubs/phase9-owner/hero-stock/hero-tile-22.jpg",
    alt: "Families spending time together by the sea",
  },
  {
    first: "/__crays-clubs/phase9-owner/forest-city-v16/forest-city-beach-boats.webp",
    second: "/__crays-clubs/phase9-owner/forest-city-v16/forest-city-night.webp",
    alt: "Connected city life in Asia",
  },
  {
    first: "/__crays-clubs/phase9-owner/hero-stock/hero-tile-25.jpg",
    second: "/__crays-clubs/phase9-owner/hero-stock/hero-tile-26.jpg",
    alt: "Community events and celebrations",
  },
  {
    first: "/__crays-clubs/phase9-owner/forest-city-v16/forest-city-beach-boardwalk.webp",
    second: "/__crays-clubs/phase9-owner/hero-stock/hero-tile-28.jpg",
    alt: "Creators meeting in the city",
  },
  {
    first: "/__crays-clubs/phase9-owner/hero-stock/hero-tile-29.jpg",
    second: "/__crays-clubs/phase9-owner/hero-stock/hero-tile-30.jpg",
    alt: "International teams working together",
  },
  {
    first: "/__crays-clubs/phase9-owner/hero-stock/hero-tile-23.jpg",
    second: "/__crays-clubs/phase9-owner/forest-city-v16/forest-city-tropical-walkway.webp",
    alt: "Professionals building their next chapter",
  },
  {
    first: "/__crays-clubs/phase9-owner/hero-stock/hero-tile-33.jpg",
    second: "/__crays-clubs/phase9-owner/forest-city-v16/hero-forest-city-marina.webp",
    alt: "Life by the sea in Forest City",
  },
  {
    first: "/__crays-clubs/phase9-owner/hero-stock/hero-tile-35.jpg",
    second: "/__crays-clubs/phase9-owner/hero-stock/hero-tile-36.jpg",
    alt: "Wellness and active club life",
  },
  {
    first: "/__crays-clubs/phase9-owner/hero-stock/hero-tile-37.jpg",
    second: "/__crays-clubs/phase9-owner/forest-city-v16/hero-forest-city-waterfront.webp",
    alt: "Travel and waterfront connections",
  },
  {
    first: "/__crays-clubs/phase9-owner/hero-stock/hero-tile-39.jpg",
    second: "/__crays-clubs/phase9-owner/hero-stock/hero-tile-40.jpg",
    alt: "Planning the next chapter together",
  },
];

const HERO_FLIP_ORDER = [11, 5, 17, 3, 9, 14, 1, 18, 7, 13, 4, 16, 0, 10, 6, 19, 2, 15, 8, 12];

const FEATURES = [
  { icon: Waves, title: "LIVE DIFFERENT", body: "Island life, green spaces and Singapore next door." },
  { icon: Sparkles, title: "BUILD SOMETHING", body: "Start a business, join a project or build your own path." },
  { icon: Globe2, title: "GLOBAL NETWORK", body: "Founders, creators, talent and opportunities from around the world." },
  { icon: MapPin, title: "LEARN. WORK. LEVEL UP.", body: "Build real skills, gain experience and open new doors." },
];

const COMMUNITY = [
  { icon: CalendarDays, title: "Network & Community", image: "/__crays-clubs/phase9-owner/forest-city-v16/community-events-forest-city-sunset.webp?auto=format&fit=crop&w=900&q=84" },
  { icon: Wifi, title: "24/7 Coworking", image: "/__crays-clubs/phase9-owner/homepage-final-v1/community-coworking.jpg" },
  { icon: Flag, title: "Golf", image: "/__crays-clubs/search-v2695/01-forest-city-golf-tourism.png" },
  { icon: Dumbbell, title: "Gym & Fitness", image: "/__crays-clubs/phase9-owner/homepage-final-v1/community-gym.jpg" },
  { icon: HeartHandshake, title: "Healthy Meals", image: "/__crays-clubs/phase9-owner/homepage-final-v1/community-healthy-meals.jpg" },
  { icon: MapPin, title: "Social Living", image: "/__crays-clubs/forest-city-v2552/marina/010-8e9f49db19e3ce85.jpg" },
  { icon: Sparkles, title: "Content Studio", image: "/__crays-clubs/phase9-owner/homepage-final-v1/community-content-studio.jpg" },
  { icon: Wifi, title: "AI, Nostr, Bitcoin & Tech", image: "/__crays-clubs/phase9-owner/homepage-final-v1/community-wifi.jpg" },
  { icon: Users, title: "Workshops", image: "/__crays-clubs/phase9-owner/homepage-final-v1/community-workshops.jpg" },
  { icon: Presentation, title: "Conference & Event", image: "/__crays-clubs/phase9-owner/homepage-v38/community-conference-event-v2.png" },
  { icon: HeartPulse, title: "Mindset & Longevity", image: "/__crays-clubs/phase9-owner/homepage-v38/community-longevity-v1.png" },
  { icon: Mic2, title: "Guest Speakers", image: "/__crays-clubs/phase9-owner/homepage-v38/community-guest-speakers-v2.png" },
  { icon: Dumbbell, title: "Sport & Health", image: "/__crays-clubs/phase9-owner/homepage-final-v1/community-fitness-classes.jpg" },
  { icon: BriefcaseBusiness, title: "Job & Learning", image: "/__crays-clubs/phase9-owner/homepage-final-v1/community-tech-tutorials.jpg" },
];

const WORK_CARDS = [
  { title: "Coworking", body: "Focus with community.", image: "/__crays-clubs/phase9-owner/homepage-final-v1/work-coworking.jpg" },
  { title: "Community", body: "Real friendships, real support.", image: "/__crays-clubs/phase9-owner/homepage-final-v1/work-community.jpg" },
  { title: "Forest City", body: "Nature, sea and city.", image: "/__crays-clubs/phase9-owner/forest-city-v16/work-forest-city-aerial.webp" },
  { title: "Johor & Singapore", body: "Two hubs. Easy access.", image: "/__crays-clubs/phase9-owner/homepage-final-v1/work-johor-singapore.jpg" },
];

const HOST = [
  { title: "One-day events", body: "Inspire, connect and celebrate.", image: "/__crays-clubs/phase9-owner/homepage-final-v1/host-one-day-events.jpg" },
  { title: "One-week sprints", body: "Focus, build and ship together.", image: "/__crays-clubs/phase9-owner/homepage-final-v1/host-one-week-sprints.jpg" },
  { title: "One-month residencies", body: "Live, work and grow as a team.", image: "/__crays-clubs/phase9-owner/homepage-final-v1/host-one-month-residencies.jpg" },
  { title: "Build a Forest City base", body: "Make Forest City your home.", image: "/__crays-clubs/phase9-owner/forest-city-v16/host-forest-city-base.webp?auto=format&fit=crop&w=1200&q=84" },
];

const FAQS = [
  ["What is Crays?", "Crays is an invitation-led private members club for people building their next chapter."],
  ["Who can become an Ambassador?", "Approved creators, founders and community leaders can apply to prequalify people they know."],
  ["Do I need an invitation to join?", "You can apply directly. The final admission decision always remains with the Crays team."],
  ["Is Forest City a good place for families?", "Forest City combines homes, learning, wellness and daily life by the sea."],
  ["What is Crays Club?", "A real-world social layer for work, living, culture, hospitality and useful community."],
  ["How do I get started?", "Apply directly or use the invitation link shared by an approved Ambassador."],
];

function HeroMosaic() {
  const [flipped, setFlipped] = useState<boolean[]>(() => HERO_TILES.map(() => false));

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const forced = window.matchMedia("(forced-colors: active)").matches;
    const compact = window.matchMedia("(max-width: 679px)").matches;
    if (reduced || forced || compact) return;

    let cursor = 0;
    let timer: number;
    const intervals = [3000, 3400, 3800, 4200, 4400, 3200, 3600, 4000];
    const step = () => {
      const tileIndex = HERO_FLIP_ORDER[cursor];
      setFlipped((current) => current.map((value, index) => (index === tileIndex ? !value : value)));
      const delay = intervals[cursor % intervals.length];
      cursor = (cursor + 1) % HERO_FLIP_ORDER.length;
      timer = window.setTimeout(step, delay);
    };
    timer = window.setTimeout(step, 5700);
    return () => window.clearTimeout(timer);
  }, []);

  const flipTile = (index: number) => {
    setFlipped((current) => current.map((value, tileIndex) => (tileIndex === index ? !value : value)));
  };

  const tiltTile = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType === "touch") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    event.currentTarget.style.setProperty("--tile-rotate-x", `${(-y * 7).toFixed(2)}deg`);
    event.currentTarget.style.setProperty("--tile-rotate-y", `${(x * 9).toFixed(2)}deg`);
  };

  const resetTileTilt = (event: ReactPointerEvent<HTMLElement>) => {
    event.currentTarget.style.setProperty("--tile-rotate-x", "0deg");
    event.currentTarget.style.setProperty("--tile-rotate-y", "0deg");
  };

  const handleTileKeyDown = (event: ReactKeyboardEvent<HTMLElement>, index: number) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    flipTile(index);
  };

  return (
    <div className={styles.heroMosaic} aria-label="Life around the CRAYS community">
      {HERO_TILES.map((tile, index) => (
        <figure
          className={`${styles.heroTile} ${styles[`tile${index + 1}`]}`}
          key={tile.first}
          role="button"
          tabIndex={0}
          aria-label={`${tile.alt}. Flip image`}
          aria-pressed={flipped[index]}
          onClick={() => flipTile(index)}
          onKeyDown={(event) => handleTileKeyDown(event, index)}
          onPointerMove={tiltTile}
          onPointerLeave={resetTileTilt}
        >
          <div className={`${styles.heroFlip} ${flipped[index] ? styles.heroFlipBack : ""}`}>
            <div className={`${styles.heroFlipFace} ${styles.heroFlipFront}`}>
              <img className={styles.heroImage} src={tile.first} alt={tile.alt} />
            </div>
            <div className={`${styles.heroFlipFace} ${styles.heroFlipRear}`} aria-hidden="true">
              <img className={styles.heroImage} src={tile.second} alt="" />
            </div>
          </div>
        </figure>
      ))}
    </div>
  );
}

function ImageCard({ title, body, image }: { title: string; body: string; image: string }) {
  return (
    <article className={styles.imageCard} data-crays-photo-motion>
      <img src={image} alt="" aria-hidden="true" loading="lazy" />
      <div className={styles.cardShade} />
      <div className={styles.cardCopy}>
        <strong>{title}</strong>
        <span>{body}</span>
      </div>
    </article>
  );
}

export function ClubsPublicHomepage({ locale }: ClubsPublicHomepageProps) {
  const root = `/${locale}`;
  const applyHref = `${root}/become-a-member`;
  const ambassadorHref = "/en/ambassadors";
  const searchHref = `${root}/search`;
  const [activeSchoolStep, setActiveSchoolStep] = useState(1);

  const handleSchoolStepsPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch") return;

    const bounds = event.currentTarget.getBoundingClientRect();
    const relativeX = Math.min(Math.max(event.clientX - bounds.left, 0), bounds.width - 1);
    const nextStep = Math.min(3, Math.floor((relativeX / bounds.width) * 4));

    if (nextStep !== activeSchoolStep) setActiveSchoolStep(nextStep);
  };

  return (
    <ClubsPublicShell
      availableLocales={PUBLIC_LOCALES}
      locale={locale as CraysPublicLocale}
    >
      <main className={`${tokens.theme} ${styles.page} ${motionStyles.photography}`}>
        <section className={styles.hero} id="top">
        <HeroMosaic />

        <div className={styles.heroCenter}>
          <p className={styles.eyebrow}>Orange-Pilled Private Members’ Club</p>
          <h1 className={motionStyles.heroHeadline}>Find your people.<br />Build your next chapter.</h1>
          <p className={`${styles.heroLead} ${motionStyles.heroDescription}`}><span className={motionStyles.heroSentence}>A living network. A digital tribe. A global community.</span>{" "}<span className={motionStyles.heroSentence}>Find your people, feel at home and share life together.</span></p>
          <div className={styles.heroButtons}>
            <Link href={`${root}/this-your-kinda-crowd`} className={styles.primaryButton}>This your kinda crowd? <ArrowRight size={18} /></Link>
            <Link href={`${root}/discover`} className={styles.secondaryButton}>Discover Crays Club</Link>
          </div>
        </div>
      </section>
      <div className={`${styles.openingStrip} ${motionStyles.networkStrip}`} aria-label="Tick tock. Next block * Fix the money. Fix the world * Don’t trust. Verify.">
        <span className={`${styles.openingCopy} ${motionStyles.networkStripCopy}`}>Tick tock. Next block * Fix the money. Fix the world * Don’t trust. Verify.</span>
      </div>

      <ClubsPublicLifeExtension ambassadorHref={ambassadorHref} />


      <section className={`${styles.section} ${styles.introSection}`}>
        <div className={styles.introCopy}>
          <p className={styles.kicker}>Forest City, Malaysia</p>
          <h2>A city designed for<br />the life you are building.</h2>
          <p>Crays is a new international living and working community in Forest City, Malaysia — a waterfront city and Special Financial Zone at the gateway to Singapore. Here, founders, remote professionals and their families live, work and grow together, steps from the sea.</p>
          <div className={styles.featureGrid}>
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div className={styles.feature} key={title}>
                <Icon size={25} />
                <strong>{title}</strong>
                <span>{body}</span>
              </div>
            ))}
          </div>
        </div>
        <figure className={styles.introImage} data-crays-photo-motion>
          <img src="/__crays-clubs/phase9-owner/forest-city-v16/intro-forest-city-portrait.webp" alt="Forest City shoreline, hotels and towers by the sea" />
        </figure>
      </section>

      <section className={`${styles.section} ${styles.staySection}`}>
        <div className={styles.sideHeading}>
          <h2>Stay in{" "}<br />Forest City.</h2>
          <span />
            <p className={styles.stayIntroCopy}>
              Forest City blends nature, technology and modern infrastructure across 30 km²—for life, business and community.
            </p>
        </div>
        <div className={styles.stayGrid}>
          <article className={styles.stayCard} data-crays-photo-motion>
            <img src="/__crays-clubs/phase9-owner/owner-marina-hotel.png" alt="Crays Club Marina in Forest City" loading="lazy" />
            <div className={styles.cardShade} />
            <div className={styles.stayCopy}>
              <strong>Crays Club<br />Marina</strong>
              <span>Membership only</span>
              <span className={styles.stayActions}>
                <Link href={`/${locale}/become-a-member`} style={{ color: "inherit", textDecoration: "none" }}>
                  <b style={{ marginTop: 0 }}>Apply here</b>
                </Link>
                <Link href={searchHref} style={{ color: "inherit", textDecoration: "none" }}>
                  <b style={{ marginTop: 0 }}>Members Book here</b>
                </Link>
              </span>
            </div>
          </article>
          <Link href={searchHref} className={`${styles.stayCard} ${motionStyles.hotelCard}`} data-crays-photo-motion>
            <img src="/__crays-clubs/phase9-owner/owner-golf-hotel.png" alt="Crays Club Golf in Forest City" loading="lazy" />
            <div className={styles.cardShade} />
            <div className={styles.stayCopy}><strong>Crays Club Golf</strong><span>Open booking on detail page</span><b>Visitors Book Here</b></div>
          </Link>
        </div>
      </section>

      <ClubsPublicAppTeaser />

      <section className={`${styles.section} ${styles.communitySection}`}>
        <div className={styles.communityIntro}>
          <h2><span>You&apos;re in</span><br /><span>if you&apos;re in</span></h2>
          <span className={styles.communityRule} aria-hidden="true" />
          <p>Crays Club is a private membership community for global entrepreneurs, executives, and remote professionals — people who are serious about building businesses and meaningful connections.</p>
          <p>Soho House is old school — Crays is the new state-of-the-art real-world circle for entrepreneurs, founders, creators, cypherpunks, and nomads who build, move, and belong.</p>
          <Link href={`/${locale}/experiences`} className={styles.communityApply}>
            <span>Crays Experiences</span>
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
        <div className={styles.communityGrid}>
          {COMMUNITY.map(({ icon: Icon, title, image }, index) => (
            <article className={`${styles.communityCard} ${index === 9 ? styles.communityWide : ""}`} data-crays-photo-motion key={title}>
              <img src={image} alt="" aria-hidden="true" loading="lazy" />
              <div className={styles.cardShade} />
              <span><Icon size={18} />{title}</span>
            </article>
          ))}
        </div>
      </section>

      <section className={`${styles.section} ${styles.retainedSection}`}>
        <p className={styles.kicker}>Lifestyle Culture</p>
        <h2>Crays is where strangers become stories.</h2>
        <div className={styles.retainedColumns}>
          <p>Crays is for people who don&apos;t just want to be successful — they want their success to mean something. When you walk into a Crays space, you know immediately — these are your people and you belong.</p>
          <p>The club is not only a place to sit down. It&apos;s a real-world social layer for people who want more than passive feeds — <strong>founders, builders, creators, remote workers, artists, musicians, designers, investors and brands</strong>, all connecting in the same physical space.</p>
        </div>
        <div className={styles.lifestyleGallery} aria-label="CRAYS Club lifestyle offers">
          <article className={styles.lifestyleOffer} data-crays-photo-motion tabIndex={0}>
            <img src="/__crays-clubs/phase9-owner/hero-stock/hero-tile-25.jpg" alt="Members meeting after work" loading="lazy" decoding="async" />
            <span><HeartHandshake aria-hidden="true" /></span><strong>GOOD PEOPLE.<br />GOOD TIMES.</strong>
          </article>
          <article className={styles.lifestyleOffer} data-crays-photo-motion tabIndex={0}>
            <img src="/__crays-clubs/phase9-owner/hero-stock/hero-tile-23.jpg" alt="Member working remotely in a shared club space" loading="lazy" decoding="async" />
            <span><Wifi aria-hidden="true" /></span><strong>WORK ANYWHERE.<br />BELONG HERE.</strong>
          </article>
          <article className={`${styles.lifestyleOffer} ${styles.lifestyleOfferActive}`} data-crays-photo-motion tabIndex={0}>
            <img src="/__crays-clubs/phase9-owner/homepage-v35/community-invitation.webp" alt="Founders and creators exchanging ideas" loading="lazy" decoding="async" />
            <span><Users aria-hidden="true" /></span><strong>FOUNDERS &amp; CREATORS CIRCLE</strong>
          </article>
          <article className={styles.lifestyleOffer} data-crays-photo-motion tabIndex={0}>
            <img src="/__crays-clubs/phase9-owner/hero-stock/hero-tile-29.jpg" alt="International members connecting in the city" loading="lazy" decoding="async" />
            <span><Globe2 aria-hidden="true" /></span><strong>CITY LOCALS.<br />GLOBAL MINDS.</strong>
          </article>
          <article className={styles.lifestyleOffer} data-crays-photo-motion tabIndex={0}>
            <img src="/__crays-clubs/phase9-owner/hero-stock/hero-tile-35.jpg" alt="Member recharging with movement and wellbeing" loading="lazy" decoding="async" />
            <span><Waves aria-hidden="true" /></span><strong>MOVE.<br />RECHARGE.<br />REPEAT.</strong>
          </article>
        </div>
      </section>

      <section className={`${styles.section} ${styles.ambassadorBand}`}>
        <div className={styles.ambassadorImage} data-crays-photo-motion>
          <img src="/__crays-clubs/assets/crays-club/sunset-club.webp" alt="CRAYS community gathering by the sea at sunset" loading="lazy" />
          <div className={styles.cardShade} />
          <h2>Come through<br />someone you trust.</h2>
        </div>
        <div className={styles.ambassadorCopy}>
          <p className={styles.kicker}>You&apos;re in if you&apos;re in</p>
          <p>Crays is invitation-led. Ambassadors are founders, alumni, creators, investors, entrepreneurs, enterprises, or community leaders who can prequalify and recommend people who bring value, energy, skills, ideas, or meaningful connections to the community.<br /><br /><strong>It&apos;s not about status or follower counts —<br />it&apos;s about what you bring to the circle.</strong></p>
          <div className={styles.inlineButtons}>
            <Link href={ambassadorHref} className={styles.primaryButton}>Apply through an Ambassador <ArrowRight size={17} /></Link>
            <Link href={applyHref} className={styles.secondaryButton}>Apply directly</Link>
          </div>
        </div>
      </section>

      <section className={styles.experienceSection} aria-labelledby="crays-gym-heading">
        <div className={styles.experienceInner}>
          <header className={styles.experienceHeader}>
            <p className={styles.kicker} style={{ textTransform: "none" }}>Crays Gym &amp; Wellbeing</p>
            <h2 id="crays-gym-heading">Live stronger with Crays Gym</h2>
            <p>We believe the best work comes from people who feel well, think clearly, and are surrounded by the right community. Food, fitness and private health insights come together so that feeling stronger becomes part of everyday life.</p>
            <a className={styles.experienceCta} href="https://www.craysgym.com/" target="_blank" rel="noopener noreferrer">Explore Crays Gym <span aria-hidden="true">→</span></a>
          </header>
          <div className={[styles.experienceGrid, styles.experienceGridSix].join(" ")}>
            {[
              ["Healthy Meals", "Plan meals and keep your nutrition goals in one private place.", "/__crays-clubs/phase9-owner/gym-section-v2/healthy-meals.png", "center 42%"],
              ["Gym Access", "Discover the Crays Gym membership journey and train in a connected club environment.", "/__crays-clubs/phase9-owner/gym-section-v1/gym-access.webp", "65% 38%"],
              ["Fitness Classes", "Explore guided training and class options in the Crays member experience.", "/__crays-clubs/phase9-owner/gym-section-v1/fitness-classes.webp", "52% 32%"],
              ["Exercise Library", "Explore governed exercises with clear instructions, safety guidance and provenance.", "/__crays-clubs/phase9-owner/gym-section-v1/exercise-library.webp", "68% 28%"],
              ["Training Plans", "Shape your week with training plans, a calendar and progress views.", "/__crays-clubs/phase9-owner/gym-section-v2/training-plans.png", "center 38%"],
              ["Wearables Analysis", "Review activity and wellbeing data from compatible wearables in your private Crays health view.", "/__crays-clubs/phase9-owner/gym-section-v2/wearables-analysis.png", "center 38%"],
            ].map(([title, copy, image, imagePosition]) => (
              <article className={styles.experienceCard} key={title}>
                <div className={styles.experienceMedia} data-crays-photo-motion>
                  <img src={image} alt="" aria-hidden="true" loading="lazy" style={{ objectPosition: imagePosition }} />
                </div>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={[styles.experienceSection, styles.familyExperienceSection].join(" ")} aria-labelledby="crays-family-heading">
        <div className={styles.experienceInner}>
          <header className={styles.experienceHeader}>
            <p className={styles.kicker} style={{ textTransform: "none" }}>Families at Crays</p>
            <h2 id="crays-family-heading">Bring your family to Crays Club</h2>
            <p>Forest City makes room for family life: work nearby, spend more time together and discover learning, healthy routines and life by the sea.</p>
            <a className={styles.experienceCta} href={"/" + locale + "/families"}>Explore Crays Families <span aria-hidden="true">→</span></a>
          </header>
          <div className={[styles.experienceGrid, styles.experienceGridThree].join(" ")}>
            {[
              ["Daily Drop-off", "Flexible family support helps parents focus while children enjoy a safe, welcoming Kindergarten day.", "/__crays-clubs/phase9-owner/hero-stock/hero-tile-34.jpg"],
              ["Helpful Tutors", "Learning support, useful skills and shared discovery for children and families.", "/__crays-clubs/phase9-owner/hero-stock/hero-tile-38.jpg"],
              ["Healthy Days", "Nutritious routines, movement and time outdoors by the sea.", "/__crays-clubs/phase9-owner/hero-stock/hero-tile-20.jpg"],
            ].map(([title, copy, image]) => (
              <article className={styles.experienceCard} key={title}>
                <div className={styles.experienceMedia} data-crays-photo-motion>
                  <img src={image} alt="" aria-hidden="true" loading="lazy" />
                </div>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.lifeSection}`}>
          <h2>Work anywhere, live differently.</h2>
        <p>That&apos;s why Crays is built around three things: purpose-driven work, genuine human connection, and a lifestyle that supports your mental, emotional, and physical wellbeing — not as an afterthought, but as the foundation.</p>
        <div className={styles.workGrid}>{WORK_CARDS.map((card) => <ImageCard {...card} key={card.title} />)}</div>
      </section>

      <section className={`${styles.section} ${styles.hostSection}`}>
        <div className={styles.centerHeading}>
          <h2>Host your company in Forest City.</h2>
          <p>Build your own thing—or tap into the Crays AG network to bring your ideas to life under the Crays brand, backed by a strong global team.</p>
          <Link href={`${root}/host-company`} className={styles.darkButton}>Host your company <ArrowRight size={17} /></Link>
        </div>
        <div className={styles.hostGrid}>{HOST.map((card) => <ImageCard {...card} key={card.title} />)}</div>
      </section>

      <section className={styles.learningSection}>
        <div className={styles.learningInner}>
          <div className={styles.learningCopy}>
            <p className={styles.kicker}>LEARN. BUILD. GROW.</p>
            <h2>BUILD YOUR FUTURE AT Crays Club</h2>
            <p>Find your dream job through our network, build your own thing, or plug into the Crays AG and turn your ideas into something real under the Crays brand. Show us what you’ve got, level up your skills, and connect with real opportunities, training, and hiring partners.</p>
            <Link href={`${root}/school-jobs`} className={`${styles.schoolCta} ${motionStyles.learningCta}`}>Learn more <ArrowRight size={18} /></Link>
          </div>
          <div className={styles.jobsBoard}>
            <div
              className={`${styles.steps} ${[
                styles.stepsActive1,
                styles.stepsActive2,
                styles.stepsActive3,
                styles.stepsActive4,
              ][activeSchoolStep]}`}
              onPointerMove={handleSchoolStepsPointerMove}
              onPointerLeave={() => setActiveSchoolStep(1)}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  setActiveSchoolStep(1);
                }
              }}
            >
              {[
                { roman: "I.", number: "01", icon: BriefcaseBusiness, title: "Take an online practice assessment", image: "/__crays-clubs/assets/crays-seo/team-crays-working-lounge-and-community-space-06.webp", alt: "CRAYS member completing an online practice assessment in a shared lounge", body: "Kick things off online, show your skills, and set the vibe for what comes next." },
                { roman: "II.", number: "02", icon: MapPin, title: "Come to campus when invited", image: "/__crays-clubs/phase9-owner/hero-stock/hero-tile-11.jpg", alt: "Happy CRAYS members arriving and connecting in person", body: "Pull up when invited, meet the crew, and turn your online spark into real momentum." },
                { roman: "III.", number: "03", icon: Users, title: "Complete a supervised assessment", image: "/__crays-clubs/phase9-ui-optimized-v11/school-step-assessment.webp", alt: "Professionals completing a supervised group assessment", body: "Go hands-on with the team, bring your A-game, and prove what you can build next." },
                { roman: "IV.", number: "04", icon: Mic2, title: "Opportunity introduction", image: "/__crays-clubs/phase9-ui-optimized-v11/school-step-opportunity.webp", alt: "Professional opportunity introduction through the CRAYS network", body: "Crush the session, make your mark, and unlock fresh intros, projects, and new opportunities ahead." },
              ].map((step, index) => {
                const StepIcon = step.icon;
                return (
                  <article
                    className={`${styles.schoolStep} ${activeSchoolStep === index ? styles.schoolStepActive : ""}`}
                    key={step.title}
                    tabIndex={0}
                    role="button"
                    aria-label={`Open ${step.title}`}
                    aria-pressed={activeSchoolStep === index}
                    onFocus={() => setActiveSchoolStep(index)}
                    onClick={() => setActiveSchoolStep(index)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setActiveSchoolStep(index);
                      }
                    }}
                  >
                    <div className={styles.schoolStepVisual} data-crays-photo-motion>
                      <img src={step.image} alt={step.alt} loading="lazy" decoding="async" />
                      <span className={styles.schoolStepIcon} aria-hidden="true"><StepIcon size={23} /></span>
                      <span className={styles.schoolStepNumber}>{step.number}</span>
                    </div>
                    <div className={styles.schoolStepCopy}>
                      <p className={styles.schoolStepRoman}>{step.roman}</p>
                      <h3>{step.title}</h3>
                      <p>{step.body}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <ClubsPublicAgenticTeaser />

      <section className={`${styles.section} ${styles.faqSection}`}>
        <h2>Frequently asked questions</h2>
        <div className={styles.faqGrid}>
          {FAQS.map(([question, answer]) => (
            <details key={question}>
              <summary>{question}<ChevronDown size={17} /></summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>

      </main>
    </ClubsPublicShell>
  );
}





