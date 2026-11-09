import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Compass,
  Globe2,
  HandHeart,
  Handshake,
  House,
  Music2,
  Smartphone,
  Sparkles,
  UsersRound,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { ClubsPublicShell } from "./clubs-public-shell";
import { ClubsCommunityLifeRhythm } from "./clubs-community-life-rhythm";
import styles from "./clubs-community-life-page-en.module.css";

const communityLifeLocales = ["en", "de", "es", "ca", "fr", "pt", "it"] as const;

const media = {
  hero: "/__crays-clubs/phase9-owner/forest-city-v16/community-events-forest-city-sunset.webp",
  heroTraveler:
    "/__crays-clubs/assets/crays-seo/community-life-crays-lifestyle-event-and-community-moment-02.jpg",
  heroPoolFriends:
    "/__crays-clubs/community-life-option1/community-life-hero-pool-friends-v1.jpg",
  heroCircle:
    "/__crays-clubs/assets/crays-seo/community-life-crays-lifestyle-event-and-community-moment-09.jpg",
  layer:
    "/__crays-clubs/community-life-option1/community-life-layer-circle-v1.jpg",
  morning:
    "/__crays-clubs/community-life-option1/community-life-rhythm-morning-v1.jpg",
  afternoon:
    "/__crays-clubs/community-life-option1/community-life-rhythm-afternoon-v1.jpg",
  evening:
    "/__crays-clubs/community-life-option1/community-life-rhythm-evening-v1.jpg",
  work:
    "/__crays-clubs/community-life-option1/community-life-mode-work-v1.jpg",
  live:
    "/__crays-clubs/community-life-option1/community-life-mode-live-v1.jpg",
  play:
    "/__crays-clubs/community-life-option1/community-life-mode-play-v1.jpg",
  globalMode:
    "/__crays-clubs/community-life-option1/community-life-mode-global-v1.jpg",
  hosted:
    "/__crays-clubs/community-life-option1/community-life-hosted-dinner-v1.jpg",
  global:
    "/__crays-clubs/community-life-option1/community-life-global-marina-v1.jpg",
  closing:
    "/__crays-clubs/community-life-option1/community-life-closing-arrival-v1.jpg",
} as const;

const openingModes = [
  {
    number: "01",
    title: "Work",
    body: "Focus, meetings, builder energy and useful introductions.",
    Icon: UsersRound,
  },
  {
    number: "02",
    title: "Live",
    body: "Comfort, service, routines and places that feel less temporary.",
    Icon: House,
  },
  {
    number: "03",
    title: "Play",
    body: "Dinners, wellness, music, creator moments and hosted culture.",
    Icon: Music2,
  },
  {
    number: "04",
    title: "Belong",
    body: "Local trust, global access and a community that remembers you.",
    Icon: Globe2,
  },
] as const;

const layerFeatures = [
  {
    title: "Useful fast",
    body: "Workspace, contacts, services, local orientation and trusted access.",
    Icon: Zap,
  },
  {
    title: "Hosted by design",
    body: "Dinners, talks, sports, wellness and introductions with a human face.",
    Icon: UsersRound,
  },
  {
    title: "Digital continuity",
    body: "Profile, bookings, preferences, membership and invitations carry across places.",
    Icon: Smartphone,
  },
  {
    title: "Local responsibility",
    body: "Global citizens should add value to the neighborhoods they enter.",
    Icon: HandHeart,
  },
] as const;

const rhythmStages = [
  {
    kicker: "Morning",
    title: "Focus",
    body: "Deep work, calls, coffee, quiet zones and practical support.",
    image: media.morning,
    alt: "A member focused on morning work with coffee and a laptop",
  },
  {
    kicker: "Afternoon",
    title: "Connect",
    body: "Meetings, introductions, local context, brand partners and project energy.",
    image: media.afternoon,
    alt: "Members connecting in a bright CRAYS club lounge",
  },
  {
    kicker: "Evening",
    title: "Belong",
    body: "Dinners, music, wellness, hosted formats and shared memories.",
    image: media.evening,
    alt: "Friends sharing an intimate candlelit dinner",
  },
] as const;

const communityModes = [
  {
    kicker: "Work",
    title: "Create and collaborate",
    body: "Focused rooms, desks, teams, calls and project days.",
    image: media.work,
    alt: "A creative team collaborating around a CRAYS workspace table",
    Icon: UsersRound,
  },
  {
    kicker: "Live",
    title: "Stay with rhythm",
    body: "Homes, lounges, service and routines for longer movement.",
    image: media.live,
    alt: "A member working from a tropical apartment lounge",
    Icon: House,
  },
  {
    kicker: "Play",
    title: "Culture gives memory",
    body: "Events, dinners, health, music, creators and local rituals.",
    image: media.play,
    alt: "Friends gathered for a warm hosted cultural dinner",
    Icon: Music2,
  },
  {
    kicker: "Global Citizen",
    title: "Access with responsibility",
    body: "Freedom, democracy, sustainability and respect for real places.",
    image: media.globalMode,
    alt: "Forest City marina, yachts and waterfront towers",
    Icon: Globe2,
  },
] as const;

const hostedFeatures = [
  {
    title: "Curated introductions",
    body: "Hosts turn strangers into useful, warm and relevant connections.",
    Icon: Handshake,
  },
  {
    title: "Repeat formats",
    body: "Weekly and monthly rituals make the community predictable without feeling stale.",
    Icon: CalendarDays,
  },
  {
    title: "Creator energy",
    body: "Artists, founders and media people bring attention and culture into the room.",
    Icon: Sparkles,
  },
  {
    title: "Partner value",
    body: "Brands live inside real moments instead of only buying attention online.",
    Icon: UsersRound,
  },
] as const;

const globalFeatures = [
  {
    title: "Cognitive",
    body: "Understand cities, systems and the people behind them.",
    Icon: Compass,
  },
  {
    title: "Social",
    body: "Meet across cultures with curiosity, respect and presence.",
    Icon: UsersRound,
  },
  {
    title: "Practical",
    body: "Turn values into events, local projects and shared standards.",
    Icon: HandHeart,
  },
] as const;

function Photo({
  alt,
  className,
  imageClassName,
  priority = false,
  sizes,
  src,
}: {
  alt: string;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  sizes: string;
  src: string;
}) {
  return (
    <span className={`${styles.photo}${className ? ` ${className}` : ""}`}>
      <Image
        alt={alt}
        className={imageClassName}
        fill
        priority={priority}
        sizes={sizes}
        src={src}
      />
    </span>
  );
}

function Feature({
  body,
  Icon,
  title,
}: {
  body: string;
  Icon: LucideIcon;
  title: string;
}) {
  return (
    <article className={styles.feature}>
      <Icon aria-hidden="true" size={24} strokeWidth={1.55} />
      <h3>{title}</h3>
      <p>{body}</p>
    </article>
  );
}

function ActionLink({
  children,
  href,
  secondary = false,
}: {
  children: string;
  href: string;
  secondary?: boolean;
}) {
  return (
    <Link
      className={secondary ? styles.secondaryButton : styles.primaryButton}
      href={href}
    >
      {children}
      <ArrowRight aria-hidden="true" size={18} strokeWidth={1.7} />
    </Link>
  );
}

export function ClubsCommunityLifePageEn() {
  return (
    <div className={styles.communityFrame}>
    <ClubsPublicShell
      availableLocales={communityLifeLocales}
      headerTone="overlay"
      locale="en"
    >
      <main className={styles.page} id="community-life-main">
        <section className={styles.hero} aria-labelledby="community-life-title">
          <Photo
            alt="Forest City at sunset"
            className={styles.heroBackground}
            imageClassName={styles.heroBackgroundImage}
            priority
            sizes="100vw"
            src={media.hero}
          />
          <div className={styles.heroShade} aria-hidden="true" />

          <div className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>Community Life</p>
              <h1 id="community-life-title">
                A real-world circle for people who build, move and belong.
              </h1>
              <p className={styles.heroLead}>
                Crays Community Life turns clubs, homes, workspaces, dinners,
                events and digital access into one daily rhythm: focused when
                you need it, social when it matters, global without losing the
                local feeling.
              </p>
              <div className={styles.heroActions}>
                <ActionLink href="/en/become-a-member">
                  Become a Member
                </ActionLink>
                <ActionLink href="#comm-ci-rhythm" secondary>
                  Explore the rhythm
                </ActionLink>
              </div>
              <div className={styles.heroStrap}>
                <span aria-hidden="true" />
                <div>
                  <strong>Work. Live. Play. Belong.</strong>
                  <p>
                    One social layer that makes a city easier to enter and
                    harder to leave.
                  </p>
                </div>
              </div>
            </div>

            <div
              className={styles.heroRail}
              role="group"
              aria-label="CRAYS community places"
            >
              <figure className={styles.heroRailMain}>
                <Photo
                  alt="A CRAYS member arriving for a new city experience"
                  priority
                  sizes="(max-width: 760px) 55vw, (max-width: 920px) 33vw, 33vw"
                  src={media.heroTraveler}
                />
              </figure>
              <figure className={styles.heroRailDinner}>
                <Photo
                  alt="Three friends sharing a poolside golden-hour moment"
                  priority
                  sizes="(max-width: 760px) 45vw, (max-width: 920px) 33vw, 33vw"
                  src={media.heroPoolFriends}
                />
              </figure>
              <figure className={styles.heroRailPool}>
                <Photo
                  alt="CRAYS members gathered around books and project ideas"
                  priority
                  sizes="(max-width: 760px) 45vw, (max-width: 920px) 33vw, 33vw"
                  src={media.heroCircle}
                />
              </figure>
              <figure className={styles.heroRailCity}>
                <Photo
                  alt="Forest City at sunset"
                  priority
                  sizes="(max-width: 760px) 45vw, 24vw"
                  src={media.hero}
                />
              </figure>
            </div>
          </div>
        </section>

        <section className={styles.openingModes} aria-label="Community Life modes">
          {openingModes.map(({ body, Icon, number, title }) => (
            <article key={title}>
              <div>
                <span>{number}</span>
                <Icon aria-hidden="true" size={22} strokeWidth={1.55} />
              </div>
              <h2 className={styles.openingModeTitle}>{title}</h2>
              <p>{body}</p>
            </article>
          ))}
        </section>

        <section className={styles.layerSection} aria-labelledby="layer-title">
          <div className={styles.layerCopy}>
            <p className={styles.eyebrow}>The community layer</p>
            <h2 id="layer-title">
              A Crays Club is built for the whole day, not for one isolated use
              case.
            </h2>
            <p className={styles.sectionLead}>
              Community Life connects the practical and emotional sides of
              global living. A member should be able to arrive in a city, find
              a productive base, meet the right people, join a hosted moment
              and feel part of a local circle before the week is over.
            </p>
            <div className={styles.featureGrid}>
              {layerFeatures.map((feature) => (
                <Feature key={feature.title} {...feature} />
              ))}
            </div>
          </div>
          <div className={styles.layerMedia}>
            <Photo
              alt="CRAYS members gathered for a collaborative session"
              sizes="(max-width: 1080px) 100vw, 50vw"
              src={media.layer}
            />
          </div>
        </section>

        <section
          className={styles.rhythmSection}
          id="comm-ci-rhythm"
          aria-labelledby="rhythm-title"
        >
          <div className={styles.rhythmInner}>
            <header className={styles.rhythmHeader}>
              <p className={styles.eyebrowLight}>One connected rhythm</p>
              <h2 id="rhythm-title">
                The room changes through the day, but the Crays feeling stays
                consistent.
              </h2>
              <p>
                Morning focus, afternoon connection and evening belonging
                should not feel like separate products. The same identity,
                service logic and community layer connects each moment.
              </p>
            </header>
            <ClubsCommunityLifeRhythm stages={rhythmStages} />
          </div>
        </section>

        <section className={styles.modesSection} aria-labelledby="modes-title">
          <header className={styles.modesHeader}>
            <p className={styles.eyebrow}>Community modes</p>
            <h2 id="modes-title">
              Four modes make the experience easy to understand and rich
              enough to return to.
            </h2>
            <p className={styles.sectionLead}>
              The strongest community pages do not explain endlessly. They
              show the daily logic clearly. Crays can speak to founders,
              travelers, creators, villa guests and local members through the
              same four-mode language.
            </p>
          </header>
          <div className={styles.modeList}>
            {communityModes.map((mode) => (
              <article key={mode.kicker}>
                <div className={styles.modeCopy}>
                  <div className={styles.modeHeading}>
                    <mode.Icon aria-hidden="true" size={25} strokeWidth={1.55} />
                    <div>
                      <p>{mode.kicker}</p>
                      <h3>{mode.title}</h3>
                    </div>
                  </div>
                  <p className={styles.modeBody}>{mode.body}</p>
                </div>
                <figure>
                  <Photo
                    alt={mode.alt}
                    sizes="(max-width: 760px) 100vw, (max-width: 920px) 64vw, 46vw"
                    src={mode.image}
                  />
                </figure>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.hostedSection} aria-labelledby="hosted-title">
          <div className={styles.hostedCopy}>
            <p className={styles.eyebrow}>Hosted culture</p>
            <h2 id="hosted-title">
              People return when the room has a social reason to exist.
            </h2>
            <p className={styles.sectionLead}>
              Community Life is not decoration around real estate. It is the
              demand layer. Dinners, talks, wellness, creator formats, member
              nights and local rituals make people show up, meet and come back.
            </p>
            <div className={styles.hostedFeatures}>
              {hostedFeatures.map((feature) => (
                <Feature key={feature.title} {...feature} />
              ))}
            </div>
          </div>
          <figure className={styles.hostedMedia}>
            <Photo
              alt="Friends sharing a hosted dinner beneath warm string lights"
              sizes="(max-width: 1080px) 100vw, 50vw"
              src={media.hosted}
            />
          </figure>
        </section>

        <section className={styles.globalSection} aria-labelledby="global-title">
          <div className={styles.globalCopy}>
            <p className={styles.eyebrow}>Global citizen</p>
            <h2 id="global-title">
              Global access should create better local behavior.
            </h2>
            <p className={styles.globalLead}>
              Crays keeps values inside the experience: freedom, democratic
              culture, respect, sustainability and community standards.
              Belonging is not only a feeling. It is also how members behave
              inside the places they enter.
            </p>
            <div className={styles.globalFeatures}>
              {globalFeatures.map((feature) => (
                <Feature key={feature.title} {...feature} />
              ))}
            </div>
          </div>
          <figure className={styles.globalMedia}>
            <Photo
              alt="Forest City marina with yachts and residential towers"
              sizes="(max-width: 920px) 100vw, 47vw"
              src={media.global}
            />
          </figure>
        </section>

        <section className={styles.closingSection} aria-labelledby="closing-title">
          <Photo
            alt="CRAYS friends together at an evening event"
            className={styles.closingBackground}
            sizes="100vw"
            src={media.closing}
          />
          <div className={styles.closingShade} aria-hidden="true" />
          <div className={styles.closingCopy}>
            <p className={styles.eyebrowLight}>Community Life</p>
            <h2 id="closing-title">
              Crays is not a place people pass through. It is a circle people
              return to.
            </h2>
            <p>
              The community layer is where work, living, culture and global
              belonging become one daily experience. Palma de Mallorca starts
              the physical version, and Crays Circle carries the feeling into
              every next city.
            </p>
            <div className={styles.closingActions}>
              <ActionLink href="/en/become-a-member">
                Become a Member
              </ActionLink>
              <ActionLink href="/en/contact" secondary>
                Contact Crays
              </ActionLink>
            </div>
          </div>
        </section>
      </main>
    </ClubsPublicShell>
    </div>
  );
}
