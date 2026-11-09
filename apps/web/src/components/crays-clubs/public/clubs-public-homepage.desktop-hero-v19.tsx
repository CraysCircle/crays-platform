"use client";

import {
  Activity as LifestyleWellbeingIcon,
  Coffee as LifestyleAfterworkIcon,
  Globe2 as LifestyleGlobalIcon,
  Laptop2 as LifestyleRemoteIcon,
  UsersRound as LifestyleFoundersIcon,
} from "lucide-react";

import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronDown,
  Dumbbell,
  Globe2,
  HeartHandshake,
  MapPin,
  Menu,
  Mic2,
  Sparkles,
  UserCircle,
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
  { icon: CalendarDays, title: "Community Events", image: "/__crays-clubs/phase9-owner/forest-city-v16/community-events-forest-city-sunset.webp?auto=format&fit=crop&w=900&q=84" },
  { icon: Wifi, title: "24/7 Coworking", image: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=900&q=84" },
  { icon: Dumbbell, title: "Gym", image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=900&q=84" },
  { icon: HeartHandshake, title: "Healthy Meals", image: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=900&q=84" },
  { icon: Sparkles, title: "Content Studio", image: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=900&q=84" },
  { icon: MapPin, title: "Apartment", image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=900&q=84" },
  { icon: Users, title: "Workshops", image: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=900&q=84" },
  { icon: Mic2, title: "Guest Speakers", image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=900&q=84" },
  { icon: Dumbbell, title: "Fitness Classes", image: "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=900&q=84" },
  { icon: Wifi, title: "Wi-Fi", image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=900&q=84" },
  { icon: BriefcaseBusiness, title: "Tech Tutorials", image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=84" },
];

const WORK_CARDS = [
  { title: "Coworking", body: "Focus with community.", image: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1000&q=84" },
  { title: "Community", body: "Real friendships, real support.", image: "https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=1000&q=84" },
  { title: "Forest City", body: "Nature, sea and city.", image: "/__crays-clubs/phase9-owner/forest-city-v16/work-forest-city-aerial.webp" },
  { title: "Johor & Singapore", body: "Two hubs. Easy access.", image: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=1000&q=84" },
];

const WELLBEING = [
  { title: "Healthy Meals", body: "Nourish your body.", image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=84" },
  { title: "Gym Access", body: "Train with pros.", image: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=900&q=84" },
  { title: "Fitness Classes", body: "Daily motivation.", image: "https://upload.wikimedia.org/wikipedia/commons/d/d7/Cardio_Boxing_Group_Fitness_Class.JPG" },
];

const FAMILY = [
  { title: "Daily Drop-off", body: "Safe and convenient.", image: "/__crays-clubs/phase9-owner/hero-stock/hero-tile-34.jpg" },
  { title: "Helpful Tutors", body: "Learn and grow.", image: "/__crays-clubs/phase9-owner/hero-stock/hero-tile-38.jpg" },
  { title: "Healthy Days", body: "Play and explore.", image: "/__crays-clubs/phase9-owner/hero-stock/hero-tile-20.jpg" },
];

const HOST = [
  { title: "One-day events", body: "Inspire, connect and celebrate.", image: "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=1200&q=84" },
  { title: "One-week sprints", body: "Focus, build and ship together.", image: "https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&w=1200&q=84" },
  { title: "One-month residencies", body: "Live, work and grow as a team.", image: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=84" },
  { title: "Build a Forest City base", body: "Make Forest City your home.", image: "/__crays-clubs/phase9-owner/forest-city-v16/host-forest-city-base.webp?auto=format&fit=crop&w=1200&q=84" },
];

const FAQS = [
  ["What is CRAYS?", "CRAYS is an invitation-led private members club for people building their next chapter."],
  ["Who can become an Ambassador?", "Approved creators, founders and community leaders can apply to prequalify people they know."],
  ["Do I need an invitation to join?", "You can apply directly. The final admission decision always remains with the CRAYS team."],
  ["Is Forest City a good place for families?", "Forest City combines homes, learning, wellness and daily life by the sea."],
  ["What is CRAYS Club?", "A real-world social layer for work, living, culture, hospitality and useful community."],
  ["How do I get started?", "Apply directly or use the invitation link shared by an approved Ambassador."],
];

const FOREST_CITY_OPENING = new Date("2027-02-01T00:00:00+08:00").getTime();

function getOpeningCountdown() {
  const remaining = Math.max(0, FOREST_CITY_OPENING - Date.now());
  return {
    days: Math.floor(remaining / 86_400_000),
    hours: Math.floor((remaining / 3_600_000) % 24),
    minutes: Math.floor((remaining / 60_000) % 60),
    seconds: Math.floor((remaining / 1_000) % 60),
  };
}

function OpeningCountdown() {
  const [remaining, setRemaining] = useState(getOpeningCountdown);

  useEffect(() => {
    const tick = () => setRemaining(getOpeningCountdown());
    tick();
    const timer = window.setInterval(tick, 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const values = [
    ["DAYS", remaining.days],
    ["HRS", remaining.hours],
    ["MIN", remaining.minutes],
    ["SEC", remaining.seconds],
  ] as const;

  return (
    <div className={styles.openingTime} aria-label="Time remaining until CRAYS Club Forest City opens">
      {values.map(([label, value]) => (
        <span key={label}>
          <strong suppressHydrationWarning>{String(value).padStart(2, "0")}</strong>
          <em>{label}</em>
        </span>
      ))}
    </div>
  );
}

function HeroMosaic() {
  const [flipped, setFlipped] = useState<boolean[]>(() => HERO_TILES.map(() => false));

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const forced = window.matchMedia("(forced-colors: active)").matches;
    if (reduced || forced) return;

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
    <article className={styles.imageCard}>
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
  const ambassadorHref = `${root}/ambassadors/isabel-maria-jeworski/apply`;

  return (
    <main className={styles.page}>
      <section className={styles.hero} id="top">
        <header className={styles.header}>
          <Link href={root} className={styles.logoLink} aria-label="CRAYS Clubs home">
            <img src="/brand/crays-logo-dark.svg" alt="CRAYS" className={`${styles.logo} ${styles.logoLight}`} />
            <img src="/brand/crays-logo-owner.svg" alt="" aria-hidden="true" className={`${styles.logo} ${styles.logoOwner}`} />
          </Link>

          <div className={styles.headerActions}>
            <Link className={styles.loginHeader} href="/account">LOG IN</Link>
            <a className={styles.associationHeader} href="https://www.crays.org/" target="_blank" rel="noreferrer">
              A MEMBER OF THE CRAYS ASSOCIATION
            </a>
            <details className={`${styles.headerDetail} ${styles.mainMenuDetail}`}>
              <summary><span>MENU</span><Menu size={28} strokeWidth={1} /></summary>
              <div className={styles.menuPanel}>
                <div className={styles.menuBrandRail}>
                  <img src="/brand/crays-logo-owner.svg" alt="" aria-hidden="true" />
                  <div className={styles.menuApplyCard}>
                    <p className={styles.menuKicker}>Private Members Club</p>
                    <h2>Apply to CRAYS Clubs</h2>
                    <p>Apply directly. Every application is reviewed, and the final admission decision always remains with the CRAYS team.</p>
                    <Link href={applyHref} className={styles.menuApplyLink}>Start your application <ArrowRight size={18} /></Link>
                    <Link href={ambassadorHref} className={styles.menuAmbassadorLink}>Apply through an Ambassador</Link>
                    <ol className={styles.menuApplySteps}>
                      <li><span>01</span>Application</li>
                      <li><span>02</span>CRAYS review</li>
                      <li><span>03</span>Conversation or invitation</li>
                      <li><span>04</span>CRAYS team decision</li>
                    </ol>
                  </div>
                </div>

                <nav className={styles.menuNavigation} aria-label="Main menu">
                  <p className={styles.menuTitle}>Menu</p>
                  <div className={styles.menuGroups}>
                    <section className={styles.menuGroup}>
                      <p>Explore</p>
                      <Link href={`${root}/discover`}>Forest City</Link>
                      <Link href={`${root}/community-life`}>Community Life</Link>
                      <Link href={`${root}/lifestyle`}>Lifestyle</Link>
                      <Link href={`${root}/hospitality`}>Hospitality</Link>
                      <Link href={`${root}/hospitality/marina-hotel`}>Marina Hotel</Link>
                      <Link href={`${root}/hospitality/golf-hotel`}>Golf Hotel</Link>
                      <Link href={`${root}/families`}>Families</Link>
                      <Link href={`${root}/teams`}>Teams</Link>
                      <Link href={`${root}/experiences`}>Events</Link>
                    </section>

                    <section className={styles.menuGroup}>
                      <p>Build &amp; Learn</p>
                      <Link href={`${root}/school-jobs`}>Learn for Life</Link>
                      <Link href={`${root}/host-company`}>Host Company</Link>
                      
                      
                      <Link href={`${root}/brand-as-a-service`}>Brand as a Service</Link>
                    </section>

                    <section className={styles.menuGroup}>
                      <p>Connect</p>
                      <Link href={`${root}/about-us`}>About Us</Link>
                      <Link href={`${root}/ambassadors`}>Ambassadors</Link>
                      <Link href={`${root}/contact`}>Contact</Link>
                      <a href="https://www.crays.org/" target="_blank" rel="noreferrer">CRAYS Association</a>
                      <Link href={`${root}/legal/privacy-policy`}>Privacy</Link>
                      <Link href={`${root}/legal/terms-and-conditions`}>Terms</Link>
                      <Link href={`${root}/legal/data-protection`}>Data Protection</Link>
                      <Link href={`${root}/legal/imprint`}>Imprint</Link>
                    </section>
                  </div>

                  <div className={styles.menuLanguages} aria-label="Languages">
                    <span>Language</span>
                    {['en', 'de', 'es', 'ca', 'fr', 'pt', 'it'].map((code) => (
                      <Link href={`/${code}`} key={code} aria-current={code === locale ? 'page' : undefined}>{code.toUpperCase()}</Link>
                    ))}
                  </div>
                </nav>
              </div>
            </details>
          </div>
        </header>

        <HeroMosaic />

        <div className={styles.heroCenter}>
          <p className={styles.eyebrow}>Private Members Club</p>
          <h1>A New Era of Work, Live, and Play</h1>
          <p className={styles.heroLead}>Work, live, play, and build your next chapter<br />with us in an invitation-led community by the sea.</p>
          <div className={styles.heroButtons}>
            <Link href={`${root}/this-your-kinda-crowd`} className={styles.primaryButton}>This your kinda crowd? <ArrowRight size={18} /></Link>
            <Link href={`${root}/discover`} className={styles.secondaryButton}>Discover Forest City</Link>
          </div>
        </div>
      </section>
      <div className={styles.openingStrip} aria-label="CRAYS Club Forest City opening date">
        <span className={styles.openingCopy}>OPENING 01.02.2027 — CRAYS CLUB FORST CITY</span>
        <OpeningCountdown />
      </div>


      <section className={`${styles.section} ${styles.introSection}`}>
        <div className={styles.introCopy}>
          <p className={styles.kicker}>Forest City, Malaysia</p>
          <h2>A city designed for<br />the life you are building.</h2>
          <p>CRAYS is a new international living and working community in Forest City, Malaysia — a waterfront city and Special Financial Zone at the gateway to Singapore. Here, founders, remote professionals and their families live, work and grow together, steps from the sea.</p>
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
        <figure className={styles.introImage}>
          <img src="/__crays-clubs/phase9-owner/forest-city-v16/intro-forest-city-portrait.webp" alt="Forest City shoreline, hotels and towers by the sea" />
        </figure>
      </section>

      <section className={`${styles.section} ${styles.staySection}`}>
        <div className={styles.sideHeading}>
          <h2>Stay in<br />Forest City.</h2>
          <span />
            <p className={styles.stayIntroCopy}>
              Across 30 km², Forest City combines nature, modern infrastructure and technology for living, working and business. It supports international hospitality, entrepreneurship and community-led growth.
            </p>
        </div>
        <div className={styles.stayGrid}>
          <Link href={`${root}/hospitality/marina-hotel`} className={styles.stayCard}>
            <img src="/__crays-clubs/phase9-owner/owner-marina-hotel.png" alt="Marina Hotel in Forest City" loading="lazy" />
            <div className={styles.cardShade} />
            <div className={styles.stayCopy}><strong>Marina Hotel</strong><span>Membership only</span><b>Apply here</b></div>
          </Link>
          <Link href={`${root}/hospitality/golf-hotel`} className={styles.stayCard}>
            <img src="/__crays-clubs/phase9-owner/owner-golf-hotel.png" alt="Golf Hotel in Forest City" loading="lazy" />
            <div className={styles.cardShade} />
            <div className={styles.stayCopy}><strong>Golf Hotel</strong><span>Open booking on detail page</span><b>Book here</b></div>
          </Link>
        </div>
      </section>

      <section className={`${styles.section} ${styles.communitySection}`}>
        <div className={styles.communityIntro}>
          <h2><span>You&apos;re in</span><br /><span>if you&apos;re in</span></h2>
          <span className={styles.communityRule} aria-hidden="true" />
          <p>A real-world circle for people who build, move, and belong. Crays Clubs are phygital work-live-play spaces for entrepreneurs, founders, creators, cypherpunks, and nomads.</p>
          <Link href={`/${locale}/become-a-member`} className={styles.communityApply}>
            Apply now <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
        <div className={styles.communityGrid}>
          {COMMUNITY.map(({ icon: Icon, title, image }, index) => (
            <article className={`${styles.communityCard} ${index === 9 ? styles.communityWide : ""}`} key={title}>
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
          <p>A real-world circle for people who build, move, and belong. Crays Clubs are phygital work-live-play spaces for entrepreneurs, founders, creators, cypherpunks, and nomads.</p>
          <p>The club is not only a place to sit down. It’s a real-world social layer for people who want more than passive feeds — <strong>founders, builders, creators, remote workers, artists, musicians, designers, investors and brands</strong>, all connecting in the same physical space.</p>
        </div>
        <div className={styles.lifestyleGallery} aria-label="CRAYS Club lifestyle offers">
          <article className={styles.lifestyleOffer} tabIndex={0}>
            <img src="/__crays-clubs/phase9-owner/hero-stock/hero-tile-25.jpg" alt="Members meeting after work" loading="lazy" decoding="async" />
            <span aria-hidden="true"><LifestyleAfterworkIcon /></span><strong>GOOD PEOPLE.<br />GOOD TIMES.</strong>
          </article>
          <article className={styles.lifestyleOffer} tabIndex={0}>
            <img src="/__crays-clubs/phase9-owner/hero-stock/hero-tile-23.jpg" alt="Member working remotely in a shared club space" loading="lazy" decoding="async" />
            <span aria-hidden="true"><LifestyleRemoteIcon /></span><strong>WORK ANYWHERE.<br />BELONG HERE.</strong>
          </article>
          <article className={`${styles.lifestyleOffer} ${styles.lifestyleOfferActive}`} tabIndex={0}>
            <img src="/__crays-clubs/phase9-owner/homepage-v35/community-invitation.webp" alt="Founders and creators exchanging ideas" loading="lazy" decoding="async" />
            <span aria-hidden="true"><LifestyleFoundersIcon /></span><strong>FOUNDERS &amp; CREATORS<br />CIRCLE</strong>
          </article>
          <article className={styles.lifestyleOffer} tabIndex={0}>
            <img src="/__crays-clubs/phase9-owner/hero-stock/hero-tile-29.jpg" alt="International members connecting in the city" loading="lazy" decoding="async" />
            <span aria-hidden="true"><LifestyleGlobalIcon /></span><strong>CITY LOCALS.<br />GLOBAL MINDS.</strong>
          </article>
          <article className={styles.lifestyleOffer} tabIndex={0}>
            <img src="/__crays-clubs/phase9-owner/hero-stock/hero-tile-35.jpg" alt="Member recharging with movement and wellbeing" loading="lazy" decoding="async" />
            <span aria-hidden="true"><LifestyleWellbeingIcon /></span><strong>MOVE.<br />RECHARGE.<br />REPEAT.</strong>
          </article>
        </div>
      </section>

      <section className={`${styles.section} ${styles.ambassadorBand}`}>
        <div className={styles.ambassadorImage}>
          <img src="/__crays-clubs/assets/crays-club/sunset-club.webp" alt="CRAYS community gathering by the sea at sunset" loading="lazy" />
          <div className={styles.cardShade} />
          <h2>Come through<br />someone you trust.</h2>
        </div>
        <div className={styles.ambassadorCopy}>
          <p className={styles.kicker}>You&apos;re in if you&apos;re in</p>
          <p>CRAYS is invitation-led. Ambassadors are creators, founders and community leaders who can prequalify people who add value and uplift the community. The final decision always remains with the CRAYS team.</p>
          <div className={styles.inlineButtons}>
            <Link href={ambassadorHref} className={styles.primaryButton}>Apply through an Ambassador <ArrowRight size={17} /></Link>
            <Link href={applyHref} className={styles.secondaryButton}>Apply directly</Link>
          </div>
        </div>
      </section>

      <section className={styles.experienceSection} aria-labelledby="crays-gym-heading">
        <div className={styles.experienceInner}>
          <header className={styles.experienceHeader}>
            <p className={styles.kicker}>CRAYS Gym &amp; Wellbeing</p>
            <h2 id="crays-gym-heading">Live stronger at CRAYS Club</h2>
            <p>Food, fitness and private health insights come together so that feeling stronger becomes part of everyday life.</p>
            <a className={styles.experienceCta} href="https://www.craysgym.com/" target="_blank" rel="noreferrer">Explore CRAYS Gym <span aria-hidden="true">→</span></a>
          </header>
          <div className={[styles.experienceGrid, styles.experienceGridSix].join(" ")}>
            {[
              ["Healthy Meals", "Plan meals and keep your nutrition goals in one private place.", "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=84", "center center"],
              ["Gym Access", "Discover the CRAYS Gym membership journey for Sankt Augustin.", "/__crays-clubs/phase9-owner/gym-section-v1/gym-access.webp", "65% 38%"],
              ["Fitness Classes", "Explore training and class options in the CRAYS member experience.", "/__crays-clubs/phase9-owner/gym-section-v1/fitness-classes.webp", "52% 32%"],
              ["Exercise Library", "Explore 250 governed exercises with instructions, safety guidance and provenance.", "/__crays-clubs/phase9-owner/gym-section-v1/exercise-library.webp", "68% 28%"],
              ["Training Plans", "Shape your week with training plans, a calendar and progress views.", "/__crays-clubs/phase9-owner/gym-section-v1/training-plans.webp", "43% 30%"],
              ["Wearables Analysis", "Review activity and wellbeing data from compatible wearables in your private CRAYS health view.", "/__crays-clubs/phase9-owner/gym-section-v1/apple-health-insights.webp", "42% 28%"],
            ].map(([title, copy, image, imagePosition]) => (
              <article className={styles.experienceCard} key={title}>
                <img src={image} alt="" aria-hidden="true" loading="lazy" style={{ objectPosition: imagePosition }} />
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
            <p className={styles.kicker}>Families at CRAYS</p>
            <h2 id="crays-family-heading">Bring your family to CRAYS Club</h2>
            <p>Forest City makes room for family life: work nearby, spend more time together and discover learning, healthy routines and life by the sea.</p>
            <a className={styles.experienceCta} href={"/" + locale + "/families"}>Explore CRAYS Families <span aria-hidden="true">→</span></a>
          </header>
          <div className={[styles.experienceGrid, styles.experienceGridThree].join(" ")}>
            {[
              ["Daily Drop-off", "Flexible family support helps parents focus while children enjoy a safe, welcoming day.", "/__crays-clubs/phase9-owner/hero-stock/hero-tile-34.jpg"],
              ["Helpful Tutors", "Learning support, useful skills and shared discovery for children and families.", "/__crays-clubs/phase9-owner/hero-stock/hero-tile-38.jpg"],
              ["Healthy Days", "Nutritious routines, movement and time outdoors by the sea.", "/__crays-clubs/phase9-owner/hero-stock/hero-tile-20.jpg"],
            ].map(([title, copy, image]) => (
              <article className={styles.experienceCard} key={title}>
                <img src={image} alt="" aria-hidden="true" loading="lazy" />
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.lifeSection}`}>
          <h2>Work anywhere, live differently.</h2>
        <div className={styles.workGrid}>{WORK_CARDS.map((card) => <ImageCard {...card} key={card.title} />)}</div>
        <div className={styles.splitRows}>
          <div className={styles.compactRow}>
            <div className={styles.rowTitle}><h3>Strong days<br />start here.</h3><span /></div>
            <div className={styles.threeCards}>{WELLBEING.map((card) => <ImageCard {...card} key={card.title} />)}</div>
          </div>
          <div className={styles.compactRow}>
            <div className={styles.rowTitle}><h3>Bring your<br />family.</h3><span /></div>
            <div className={styles.threeCards}>{FAMILY.map((card) => <ImageCard {...card} key={card.title} />)}</div>
          </div>
        </div>
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
            <h2>BUILD YOUR FUTURE AT CRAYS CLUB</h2>
            <p>Build your own thing—or plug into the Crays AG network and turn ideas into something real under the Crays brand. Show us what you’ve got online, then level up in person. Crush it, and we’ll connect you with tech opportunities, training, and hiring partners.</p>
            <Link href={`${root}/school-jobs`} className={styles.schoolCta}>Explore the assessment process <ArrowRight size={18} /></Link>
          </div>
          <div className={styles.jobsBoard}>
            <div className={styles.steps}>
              {[
                { roman: "I.", number: "01", icon: BriefcaseBusiness, title: "Take an online practice assessment", image: "/__crays-clubs/assets/crays-seo/team-crays-working-lounge-and-community-space-06.webp", alt: "CRAYS member completing an online practice assessment in a shared lounge", body: "Practice with real-world tasks and prepare for the reviewed in-person assessment path." },
                { roman: "II.", number: "02", icon: MapPin, title: "Come to campus when invited", image: "/__crays-clubs/phase9-owner/hero-stock/hero-tile-11.jpg", alt: "Happy CRAYS members arriving and connecting in person", body: "After review, selected candidates are invited and scheduling follows separately." },
                { roman: "III.", number: "03", icon: Users, title: "Complete a supervised assessment", image: "/__crays-clubs/phase9-ui-optimized-v11/school-step-assessment.webp", alt: "Professionals completing a supervised group assessment", body: "Complete the in-person assessment under supervision; no outcome is automatic." },
                { roman: "IV.", number: "04", icon: Mic2, title: "Opportunity introduction", image: "/__crays-clubs/phase9-ui-optimized-v11/school-step-opportunity.webp", alt: "Professional opportunity introduction through the CRAYS network", body: "Strong results may lead to training or introductions; the employer makes every hiring decision." },
              ].map((step) => {
                const StepIcon = step.icon;
                return (
                  <article className={styles.schoolStep} key={step.title} tabIndex={0} role="button" aria-label={`Open ${step.title}`}>
                    <div className={styles.schoolStepVisual}>
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

      <footer className={styles.footer}>
        <section className={styles.footerCta}>
          <p>CLAIM YOUR GLOBAL HOME</p>
          <h2>Meet friends, collaborators, and business partners across the Crays Club world.</h2>
          <Link href={applyHref} className={styles.primaryButton}>Become a member <ArrowRight size={19} /></Link>
        </section>
        <div className={styles.footerMain}>
          <div className={styles.footerBrand}>
            <img src="/brand/crays-logo-dark.svg" alt="CRAYS" />
            <p>An invitation-led community for people building international lives, companies and creative work.</p>
          </div>
          <div className={styles.footerColumn}><strong>CRAYS Clubs</strong><Link href={`${root}/about-us`}>About Us</Link><Link href="/en/experiences">Experiences</Link><Link href={`${root}/lifestyle`}>Lifestyle</Link><Link href={`${root}/community-life`}>Community Life</Link></div>
          <div className={styles.footerColumn}><strong>Belong</strong><Link href={`${root}/become-a-member`}>Become a Member</Link><Link href={`${root}/ambassadors`}>Ambassadors</Link><Link href={`${root}/families`}>Families</Link><Link href={`${root}/teams`}>Teams</Link></div>
          <div className={styles.footerColumn}><strong>Build</strong><Link href={`${root}/hospitality`}>Hospitality</Link><Link href={`${root}/school-jobs`}>Learn for Life</Link><Link href={`${root}/host-company`}>Host Company</Link><Link href={`${root}/brand-as-a-service`}>Brand as a Service</Link></div>
          <div className={styles.footerColumn}><strong>Connect</strong><Link href={`${root}/contact`}>Contact</Link><Link href={`${root}/legal`}>Legal</Link><a href="https://www.crays.org/">Crays Association</a><a href="https://www.crays.pro/">Crays Franchise</a></div>
        </div>
        <div className={styles.associationLine}><a href="https://www.crays.org/" target="_blank" rel="noreferrer">Crays AG</a><span>The Crays operating layer.</span></div>
        <div className={styles.legalLine}><span>© 2026 CRAYS. All rights reserved.</span><div><Link href={`${root}/legal/privacy-policy`}>Privacy</Link><Link href={`${root}/legal/terms-and-conditions`}>Terms</Link><Link href={`${root}/legal/data-protection`}>Data protection</Link><Link href={`${root}/legal/imprint`}>Imprint</Link></div></div>
      </footer>
    </main>
  );
}






