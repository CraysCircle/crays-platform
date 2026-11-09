import Link from "next/link";
import { ArrowDown, ArrowLeft, ArrowRight, BookOpen, Building2, CalendarDays, CheckCircle2, ChevronDown, Circle, Coffee, CornerRightDown, Dumbbell, Globe2, LockKeyhole, MessageCircle, Search, ShieldCheck, ShoppingBag, UserRound, UsersRound } from "lucide-react";
import { ClubsPublicShell, ClubsPublicFooter } from "@/components/crays-clubs/public/clubs-public-shell";
import tokens from "@/components/crays-clubs/public/clubs-public-design-tokens.module.css";
import { AgenticPhoto, MatchingIntentions } from "./agentic-life-localized-interactions";
import { agenticLifeTranslator, AGENTIC_LIFE_LOCALES } from "./agentic-life-translation";
import type { CraysPublicLocale } from "./clubs-public-locale-contract";
import styles from "@/app/en/agentic-life/page.module.css";

const steps = [
  { icon: MessageCircle, title: "Tell your agent", text: "Speak or type what you have in mind." },
  { icon: UsersRound, title: "Explore your options", text: "Discover relevant people, places and plans." },
  { icon: CheckCircle2, title: "Give your approval", text: "Review introductions, prices and permissions." },
  { icon: CalendarDays, title: "Make it happen", text: "Your agent helps arrange what you approve." },
];
const stories = [
  { image: "introduction", alt: "Three people connecting at a Crays community gathering", kicker: "Connections", title: "Introduction to review", text: "Looking for a co-founder? Your agent will find relevant people and explain why an introduction could make sense. When both agree, you can talk privately and plan a meeting.", closing: "From shared goals to a real conversation." },
  { image: "training", alt: "Two people training together in the gym", width: 1448, height: 1086, kicker: "Real experiences", title: "Training options", text: "Fit training into your day. Your agent will help you explore sessions, coaching and people to train with. Check the time, availability and price before booking.", closing: "A plan that fits your goals and your day." },
  { image: "shared-plans", alt: "Crays community members sharing an evening meal", width: 1536, height: 1024, kicker: "Things to do", title: "Plans to choose from", text: "Find a dinner, event or activity you would enjoy together. Your agent will help coordinate the place, time and any booking you approve.", closing: "Less arranging. More time together." },
];
const features = [
  { icon: Globe2, title: "Local or global", text: "Meet people at your Club or across communities you choose. Set your intention and availability." },
  { icon: Search, title: "Know why you connect", text: "See shared interests, complementary goals and the community context behind each suggestion." },
  { icon: UserRound, title: "More than a profile", text: "Optional personality insights can add context. You choose what to share and for which purpose." },
  { icon: UsersRound, title: "From interest to introduction", text: "Review a profile, express interest and connect when both agree. Continue in a private chat or arrange a meeting." },
];
const services = [
  { icon: Building2, title: "Clubs", text: "Stays, workspaces and shared experiences." },
  { icon: Dumbbell, title: "Gym", text: "Training, nutrition and coaching." },
  { icon: Coffee, title: "Coffee", text: "Order, pay and meet over coffee." },
  { icon: ShoppingBag, title: "Store", text: "Discover, purchase and track what you need." },
];
const questions = [
  ["When can I use it?", "CRAYS Agentic Life is in development. This page illustrates the experience we are working towards; the features shown are not yet available as one connected product. We will share availability as development progresses."],
  ["Will my agent act without permission?", "You choose what to share and what to authorise. Introductions need mutual interest, and bookings and payments need your approval. Suggestions remain distinct from confirmed actions. Private chats stay private; invite your agent when you need it."],
  ["Is Bitcoin required?", "No. The plan includes familiar payment methods alongside optional Bitcoin, Lightning and USDT stablecoin payments via Utexo. Available methods and any fees will be shown before you approve a payment."],
];

function PageFooter({locale}:{locale:CraysPublicLocale}) { return <ClubsPublicFooter locale={locale}/>; }

export function AgenticLifeLocalizedPage({ locale }: { locale: CraysPublicLocale }) {
 const t = agenticLifeTranslator(locale);
  return <ClubsPublicShell locale={locale} availableLocales={AGENTIC_LIFE_LOCALES}
    headerAction={<Link className={styles.back} href={`/${locale}`}><ArrowLeft size={15} aria-hidden="true" /><span>{t("Back to Crays Club")}</span></Link>}
    footer={<PageFooter locale={locale} />}>
    <main className={`${tokens.theme} ${styles.page}`}>
      <section className={styles.hero} aria-labelledby="agentic-title">
        <div className={`${styles.inner} ${styles.heroInner}`}>
          <div className={styles.heroCopy}>
            <p className={styles.kicker}>{t("CRAYS AGENTIC LIFE")}</p>
            <h1 id="agentic-title">{t("Your next chapter.")}<br />{t("Connected by your agent.")}</h1>
            <p className={styles.lead}>{t("We’re bringing your personal AI, your community and real-world services together. Find people to build with, plan your stay and turn shared interests into time together.")}</p>
            <a href="#one-conversation" className={styles.button}>{t("Explore the experience")}{" "}<ArrowRight size={19} aria-hidden="true" /></a>
          </div>
          <div className={styles.collage}>
            <CornerRightDown className={styles.connectionOne} size={110} strokeWidth={1} aria-hidden="true" />
            <CornerRightDown className={styles.connectionTwo} size={110} strokeWidth={1} aria-hidden="true" />
            <AgenticPhoto locale={locale} name="hero-people" alt={t("People meeting at a Crays networking event")} priority className={styles.heroPeople} />
            <p className={styles.collageLabel}>{t("People")}<br />{t("Places")}<br />{t("Experiences")}<br /><strong>{t("Together")}</strong></p>
            <AgenticPhoto locale={locale} name="hero-place" alt={t("A Forest City waterfront hotel overlooking the sea")} width={1448} height={1086} priority className={styles.heroPlace} />
            <AgenticPhoto locale={locale} name="hero-together" alt={t("Friends enjoying a Crays gathering together")} priority className={styles.heroTogether} />
          </div>
        </div>
        <a className={styles.scrollCue} href="#one-conversation" aria-label={t("Discover how Agentic Life works")}><ArrowDown size={23} aria-hidden="true" /></a>
      </section>

      <section id="one-conversation" className={`${styles.section} ${styles.journey}`} aria-labelledby="journey-title">
        <div className={styles.inner}>
          <h2 id="journey-title">{t("One conversation. Real possibilities.")}</h2>
          <blockquote>{t("“I’m coming to Forest City. Find people to build with, a place to stay and plans we can share.”")}</blockquote>
          <p className={styles.previewLabel}>{t("Concept preview")}</p>
          <ol className={styles.steps}>{steps.map(({icon: Icon, title, text}, i) => <li key={t(title)}>
            <Icon size={48} strokeWidth={1.5} aria-hidden="true" /><h3>{t(title)}</h3><p>{t(text)}</p>
            {i < 3 && <ArrowRight className={styles.stepArrow} size={30} strokeWidth={1} aria-hidden="true" />}
          </li>)}</ol>
          <p className={styles.journeyClosing}>{t("From a relevant introduction to a shared calendar and a confirmed booking, your agent will help carry the plan through.")}</p>
        </div>
      </section>

      <section className={`${styles.section} ${styles.dark} ${styles.stories}`} aria-labelledby="stories-title">
        <div className={styles.inner}>
          <header className={styles.sectionHeading}><p className={styles.kicker}>{t("From possibilities to real life")}</p><h2 id="stories-title">{t("See how it comes together.")}</h2><p>{t("An illustration of the experience we’re building.")}</p></header>
          <div className={styles.storyList}>{stories.map((story) => <article className={styles.story} key={story.image}>
            <AgenticPhoto locale={locale} name={story.image} alt={t(story.alt)} width={story.width} height={story.height} />
            <div className={styles.storyCopy}><Circle className={styles.storyStart} size={17} aria-hidden="true" /><Circle className={styles.storyEnd} size={9} aria-hidden="true" /><p className={styles.kicker}>{t(story.kicker)}</p><h3>{t(story.title)}</h3><p>{t(story.text)}</p><p className={styles.storyClosing}>{t(story.closing)}</p></div>
          </article>)}</div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="matching-title">
        <div className={styles.inner}>
          <div className={styles.matchingTop}>
            <AgenticPhoto locale={locale} name="matching" alt={t("Members meeting over coffee in a Crays cafe")} />
            <div><h2 id="matching-title">{t("Find people for")}<br />{t("the life you want.")}</h2>
              <MatchingIntentions locale={locale} />
            </div>
          </div>
          <div className={styles.matchingFeatures}>{features.map(({icon: Icon, title, text}) => <article key={t(title)}><Icon size={30} strokeWidth={1.5} aria-hidden="true" /><div><h3>{t(title)}</h3><p>{t(text)}</p></div></article>)}</div>
          <p className={styles.personalityNote}>{t("Optional personality perspectives: Myers-Briggs · Big Five · Predictive Index · Enneagram.")}</p>
        </div>
      </section>

      <section className={`${styles.section} ${styles.dark} ${styles.services}`} aria-labelledby="services-title">
        <div className={styles.inner}><h2 id="services-title">{t("One app. A whole connected day.")}</h2>
          <div className={styles.serviceGrid}>{services.map(({icon: Icon, title, text}) => <article key={t(title)}><Icon size={48} strokeWidth={1.4} aria-hidden="true" /><h3>{t(title)}</h3><p>{t(text)}</p></article>)}</div>
          <p className={styles.servicesNote}>{t("Bookings, payments, passes and receipts stay connected to the plan.")}</p>
          <AgenticPhoto locale={locale} name="services" alt={t("Members training together beneath the Crays banner in a bright gym")} className={styles.servicesPhoto} />
        </div>
      </section>

      <section className={styles.section} aria-labelledby="circle-title">
        <div className={`${styles.inner} ${styles.circleInner}`}>
          <AgenticPhoto locale={locale} name="circle" alt={t("Five friends in Crays shirts staying connected at a community gathering")} />
          <div><h2 id="circle-title">{t("Your circle goes with you.")}</h2>
            <p>{t("Your stay can be one chapter. The people you meet can be part of many more. Stay close to your communities, ask for the updates that matter and keep your plans moving.")}</p>
            <div className={styles.circleItems}>{[{icon: UsersRound, title: "People", text: "Keep in touch"}, {icon: CalendarDays, title: "Plans", text: "Stay aligned"}, {icon: BookOpen, title: "Knowledge", text: "Discover together"}].map(({icon: Icon, title, text}) => <div key={t(title)}><Icon size={34} strokeWidth={1.5} aria-hidden="true" /><h3>{t(title)}</h3><p>{t(text)}</p></div>)}</div>
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.dark}`} aria-labelledby="control-title">
        <div className={styles.inner}><h2 id="control-title">{t("Your agent. Your decisions.")}</h2>
          <div className={styles.controls}>
            <div><ShieldCheck size={44} strokeWidth={1.4} aria-hidden="true" /><p>{t("You choose")}<br />{t("what to share.")}</p></div>
            <div><CheckCircle2 size={44} strokeWidth={1.4} aria-hidden="true" /><p>{t("You approve")}<br />{t("bookings and payments.")}</p></div>
            <div><LockKeyhole size={44} strokeWidth={1.4} aria-hidden="true" /><p>{t("Private chats stay private.")}<br />{t("Invite your agent when you need it.")}</p></div>
          </div>
          <div className={styles.foundation}><div><h3>{t("Open foundations.")}<br />{t("More ways to connect and pay.")}</h3></div><p><strong>{t("Nostr")}</strong><br />{t("Portable identity and community connections.")}</p><p><strong>{t("Bitcoin · Lightning · USDT via Utexo")}</strong><br />{t("Planned Bitcoin and USDT stablecoin payments alongside familiar methods.")}</p></div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="faq-title">
        <div className={`${styles.inner} ${styles.faqInner}`}><h2 id="faq-title">{t("Frequently")}<br />{t("asked questions.")}</h2><div>{questions.map(([question, answer]) => <details key={t(question)} name="agentic-questions"><summary>{t(question)}<ChevronDown size={20} aria-hidden="true" /></summary><p>{t(answer)}</p></details>)}</div></div>
      </section>
    </main>
  </ClubsPublicShell>;
}

