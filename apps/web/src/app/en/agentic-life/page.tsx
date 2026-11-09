import type { Metadata } from "next";
import { clubsPageMetadata } from "@/lib/clubs/seo";
import Link from "next/link";
import { ArrowDown, ArrowLeft, ArrowRight, BookOpen, Building2, CalendarDays, CheckCircle2, ChevronDown, Circle, Coffee, CornerRightDown, Dumbbell, Globe2, LockKeyhole, MessageCircle, Search, ShieldCheck, ShoppingBag, UserRound, UsersRound } from "lucide-react";
import { ClubsPublicShell, ClubsPublicFooter } from "@/components/crays-clubs/public/clubs-public-shell";
import tokens from "@/components/crays-clubs/public/clubs-public-design-tokens.module.css";
import { AgenticPhoto, MatchingIntentions } from "./interactions";
import styles from "./page.module.css";

export const metadata: Metadata = clubsPageMetadata("en", "agentic-life", {
  title: "Agentic Life — Your next chapter, connected | CRAYS",
  description: "Your personal AI, your community and real-world services. Explore the planned CRAYS Agentic Life experience.",
}, { availableLocales: ["en", "de", "es", "ca", "fr", "pt", "it"] });

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

function PageFooter() {
  return <><section className={`${tokens.theme} ${styles.footer}`}><div className={styles.inner}><div className={styles.closing}><h2>A connected life starts with people.</h2><p>Explore the invitation-led CRAYS community while Agentic Life is in development.</p><Link className={styles.button} href="/en/ambassadors">Find your Ambassador <ArrowRight size={19} aria-hidden="true" /></Link></div></div></section><ClubsPublicFooter locale="en" /></>;
}

export default function AgenticLifePage() {
  return <ClubsPublicShell locale="en" availableLocales={["en", "de", "es", "ca", "fr", "pt", "it"]}
    headerAction={<Link className={styles.back} href="/"><ArrowLeft size={15} aria-hidden="true" /><span>Back to Crays Club</span></Link>}
    footer={<PageFooter />}>
    <main className={`${tokens.theme} ${styles.page}`}>
      <section className={styles.hero} aria-labelledby="agentic-title">
        <div className={`${styles.inner} ${styles.heroInner}`}>
          <div className={styles.heroCopy}>
            <p className={styles.kicker}>CRAYS AGENTIC LIFE</p>
            <h1 id="agentic-title">Your next chapter.<br />Connected by your agent.</h1>
            <p className={styles.lead}>We’re bringing your personal AI, your community and real-world services together. Find people to build with, plan your stay and turn shared interests into time together.</p>
            <a href="#one-conversation" className={styles.button}>Explore the experience <ArrowRight size={19} aria-hidden="true" /></a>
          </div>
          <div className={styles.collage}>
            <CornerRightDown className={styles.connectionOne} size={110} strokeWidth={1} aria-hidden="true" />
            <CornerRightDown className={styles.connectionTwo} size={110} strokeWidth={1} aria-hidden="true" />
            <AgenticPhoto name="hero-people" alt="People meeting at a Crays networking event" priority className={styles.heroPeople} />
            <p className={styles.collageLabel}>People<br />Places<br />Experiences<br /><strong>Together</strong></p>
            <AgenticPhoto name="hero-place" alt="A Forest City waterfront hotel overlooking the sea" width={1448} height={1086} priority className={styles.heroPlace} />
            <AgenticPhoto name="hero-together" alt="Friends enjoying a Crays gathering together" priority className={styles.heroTogether} />
          </div>
        </div>
        <a className={styles.scrollCue} href="#one-conversation" aria-label="Discover how Agentic Life works"><ArrowDown size={23} aria-hidden="true" /></a>
      </section>

      <section id="one-conversation" className={`${styles.section} ${styles.journey}`} aria-labelledby="journey-title">
        <div className={styles.inner}>
          <h2 id="journey-title">One conversation. Real possibilities.</h2>
          <blockquote>“I’m coming to Forest City. Find people to build with, a place to stay and plans we can share.”</blockquote>
          <p className={styles.previewLabel}>Concept preview</p>
          <ol className={styles.steps}>{steps.map(({icon: Icon, title, text}, i) => <li key={title}>
            <Icon size={48} strokeWidth={1.5} aria-hidden="true" /><h3>{title}</h3><p>{text}</p>
            {i < 3 && <ArrowRight className={styles.stepArrow} size={30} strokeWidth={1} aria-hidden="true" />}
          </li>)}</ol>
          <p className={styles.journeyClosing}>From a relevant introduction to a shared calendar and a confirmed booking, your agent will help carry the plan through.</p>
        </div>
      </section>

      <section className={`${styles.section} ${styles.dark} ${styles.stories}`} aria-labelledby="stories-title">
        <div className={styles.inner}>
          <header className={styles.sectionHeading}><p className={styles.kicker}>From possibilities to real life</p><h2 id="stories-title">See how it comes together.</h2><p>An illustration of the experience we’re building.</p></header>
          <div className={styles.storyList}>{stories.map((story) => <article className={styles.story} key={story.image}>
            <AgenticPhoto name={story.image} alt={story.alt} width={story.width} height={story.height} />
            <div className={styles.storyCopy}><Circle className={styles.storyStart} size={17} aria-hidden="true" /><Circle className={styles.storyEnd} size={9} aria-hidden="true" /><p className={styles.kicker}>{story.kicker}</p><h3>{story.title}</h3><p>{story.text}</p><p className={styles.storyClosing}>{story.closing}</p></div>
          </article>)}</div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="matching-title">
        <div className={styles.inner}>
          <div className={styles.matchingTop}>
            <AgenticPhoto name="matching" alt="Members meeting over coffee in a Crays cafe" />
            <div><h2 id="matching-title">Find people for<br />the life you want.</h2>
              <MatchingIntentions />
            </div>
          </div>
          <div className={styles.matchingFeatures}>{features.map(({icon: Icon, title, text}) => <article key={title}><Icon size={30} strokeWidth={1.5} aria-hidden="true" /><div><h3>{title}</h3><p>{text}</p></div></article>)}</div>
          <p className={styles.personalityNote}>Optional personality perspectives: Myers-Briggs · Big Five · Predictive Index · Enneagram.</p>
        </div>
      </section>

      <section className={`${styles.section} ${styles.dark} ${styles.services}`} aria-labelledby="services-title">
        <div className={styles.inner}><h2 id="services-title">One app. A whole connected day.</h2>
          <div className={styles.serviceGrid}>{services.map(({icon: Icon, title, text}) => <article key={title}><Icon size={48} strokeWidth={1.4} aria-hidden="true" /><h3>{title}</h3><p>{text}</p></article>)}</div>
          <p className={styles.servicesNote}>Bookings, payments, passes and receipts stay connected to the plan.</p>
          <AgenticPhoto name="services" alt="Members training together beneath the Crays banner in a bright gym" className={styles.servicesPhoto} />
        </div>
      </section>

      <section className={styles.section} aria-labelledby="circle-title">
        <div className={`${styles.inner} ${styles.circleInner}`}>
          <AgenticPhoto name="circle" alt="Five friends in Crays shirts staying connected at a community gathering" />
          <div><h2 id="circle-title">Your circle goes with you.</h2>
            <p>Your stay can be one chapter. The people you meet can be part of many more. Stay close to your communities, ask for the updates that matter and keep your plans moving.</p>
            <div className={styles.circleItems}>{[{icon: UsersRound, title: "People", text: "Keep in touch"}, {icon: CalendarDays, title: "Plans", text: "Stay aligned"}, {icon: BookOpen, title: "Knowledge", text: "Discover together"}].map(({icon: Icon, title, text}) => <div key={title}><Icon size={34} strokeWidth={1.5} aria-hidden="true" /><h3>{title}</h3><p>{text}</p></div>)}</div>
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.dark}`} aria-labelledby="control-title">
        <div className={styles.inner}><h2 id="control-title">Your agent. Your decisions.</h2>
          <div className={styles.controls}>
            <div><ShieldCheck size={44} strokeWidth={1.4} aria-hidden="true" /><p>You choose<br />what to share.</p></div>
            <div><CheckCircle2 size={44} strokeWidth={1.4} aria-hidden="true" /><p>You approve<br />bookings and payments.</p></div>
            <div><LockKeyhole size={44} strokeWidth={1.4} aria-hidden="true" /><p>Private chats stay private.<br />Invite your agent when you need it.</p></div>
          </div>
          <div className={styles.foundation}><div><h3>Open foundations.<br />More ways to connect and pay.</h3></div><p><strong>Nostr</strong><br />Portable identity and community connections.</p><p><strong>Bitcoin · Lightning · USDT via Utexo</strong><br />Planned Bitcoin and USDT stablecoin payments alongside familiar methods.</p></div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="faq-title">
        <div className={`${styles.inner} ${styles.faqInner}`}><h2 id="faq-title">Frequently<br />asked questions.</h2><div>{questions.map(([question, answer]) => <details key={question} name="agentic-questions"><summary>{question}<ChevronDown size={20} aria-hidden="true" /></summary><p>{answer}</p></details>)}</div></div>
      </section>
    </main>
  </ClubsPublicShell>;
}

