"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type CSSProperties, type ReactNode } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, ChevronDown, MessageCircle, ShieldCheck } from "lucide-react";
import { getFamiliesMedia, type FamiliesMediaKey } from "./families-media";
import styles from "./families-page.module.css";

const practical = [
  { key: "mealProvider", title: "A place to settle", text: "Discuss room layouts, sleeping arrangements and the space your family needs." },
  { key: "mealPortions", title: "Meals at your pace", text: "Check dining times, children’s choices and dietary requirements before arrival." },
  { key: "mealAllergens", title: "Care on your terms", text: "Guaranteed childcare, reserved in advance around your family’s needs." },
  { key: "mealTimes", title: "Time for yourself", text: "Space to focus, rest or enjoy time together as adults." },
  { key: "mealNeeds", title: "Everyone’s needs", text: "Bring routines, accessibility and any extra support into the conversation." },
  { key: "mealCosts", title: "A clear budget", text: "Know what is included and what is booked separately." },
] as const;

const moments = [
  { label: "Start together", key: "familyHome", caption: "A slower morning. A shared meal. Time to talk about what everyone wants from the day." },
  { label: "Do your own thing", key: "dayQuietFocus", caption: "Reserved care and children’s activities. Time for you to work, unwind or follow your own plans." },
  { label: "Come back together", key: "dayFamilyMovement", caption: "Leave room for a walk, something creative or a meal you can all enjoy." },
] as const;

const gallery: { key: FamiliesMediaKey; label: string }[] = [
  { key: "day", label: "A different horizon" },
  { key: "dayQuietFocus", label: "Quiet, creative time" },
  { key: "dayFamilyMovement", label: "Out together" },
  { key: "dayLearningCircle", label: "Space to discover" },
  { key: "processOnline", label: "Time to focus" },
  { key: "processCampus", label: "A conversation to start" },
  { key: "processSession", label: "Ideas shared" },
  { key: "processOpportunity", label: "A warm welcome" },
  { key: "finale", label: "Forest City at sunset" },
];

const questions = [
  { question: "How does guaranteed childcare work?", answer: "Reserve the hours you need in advance. Trained early childhood educators provide guaranteed childcare by prior agreement. Care can be arranged at any time of day or night, for the agreed hours your family needs. Confirm suitable ages, care requirements and the price when reserving." },
  { question: "What can children do?", answer: "Children’s sport and leisure activities will be offered. Ask about the programme planned for your dates, suitable ages and how to join. Movement, play and creative time give children their own interests to explore." },
  { question: "What’s included in our stay?", answer: "Confirm the package for your chosen stay. Ask which meals, care hours and activities are included, what is charged separately and the cancellation terms. A room booking or membership does not automatically include every family service." },
  { question: "Can grandparents or other relatives join?", answer: "Bring their needs into the plan too. Discuss rooms, walking distances, step-free access, dietary requirements and time to rest. Suitability depends on your chosen property and the arrangements confirmed for the group." },
  { question: "Do we need to become members?", answer: "The Golf has a public stay enquiry and booking route. Marina access is membership-led. Accommodation and membership are separate decisions; check the access included in your chosen stay." },
  { question: "What about allergies or dietary needs?", answer: "Share your requirements before arrival. Confirm food options, ingredients and allergy-handling arrangements directly with the provider at your chosen venue." },
  { question: "Can we combine work with a family stay?", answer: "Plan workspace access, connectivity and calls alongside your reserved childcare. Confirm the facilities and access at your selected venue before making work commitments." },
  { question: "What about schooling or a longer stay?", answer: "Discuss ages, languages and learning needs separately for a longer stay. Childcare and leisure activities do not constitute a school place or an accredited teaching programme; confirm education arrangements with the responsible institution." },
  { question: "Will photos of our children be shared?", answer: "Your family’s images and stories are shared only with permission for the intended use. Discuss your preferences before activities or photography." },
];

function Photo({ mediaKey, className = "", priority = false }: { mediaKey: FamiliesMediaKey; className?: string; priority?: boolean }) {
  const media = getFamiliesMedia(mediaKey);
  return <figure className={`${styles.s1Photo} ${className}`} data-media-key={mediaKey} data-media-rights={media.rights} style={{ "--s1-crop": media.desktopCrop, "--s1-mobile-crop": media.mobileCrop } as CSSProperties}>
    <Image key={media.src} src={media.src} alt={media.altRole} fill unoptimized sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 680px" loading={priority || mediaKey === "dayQuietFocus" || mediaKey === "dayFamilyMovement" ? "eager" : "lazy"} fetchPriority={priority ? "high" : undefined} />
  </figure>;
}

function Action({ href = "/en/contact", children, secondary = false, down = false }: { href?: string; children: ReactNode; secondary?: boolean; down?: boolean }) {
  return <Link href={href} className={`${styles.s1Action} ${secondary ? styles.s1Secondary : styles.s1Primary}`}><span>{children}</span>{down ? <ArrowDown size={18} aria-hidden="true" /> : <ArrowRight size={18} aria-hidden="true" />}</Link>;
}

export function FamiliesScreenOne() {
  const [moment, setMoment] = useState(0);
  const [preview, setPreview] = useState<FamiliesMediaKey | null>(null);
  const [practicalOpen, setPracticalOpen] = useState<number | null>(null);
  const current = moments[moment];
  const selectMoment = (index: number) => { setMoment(index); setPreview(null); };

  return <main className={styles.screenPage} id="families-main">
    <section className={styles.s1Hero} aria-labelledby="families-title">
      <Photo mediaKey="hero" priority className={styles.s1HeroPhoto} />
      <div className={styles.s1HeroShade} />
      <div className={`${styles.s1Container} ${styles.s1HeroContent}`}>
        <h1 id="families-title">More time together.<br />Room for you, too.</h1>
        <p>A family stay in Forest City, with guaranteed childcare reserved around your needs.</p>
        <div className={styles.s1Actions}><Action>Plan your family stay</Action><Action href="#family-life" secondary down>Explore family life</Action></div>
        <div className={styles.s1CareNote}><ShieldCheck size={18} aria-hidden="true" /><span>Childcare by trained educators, reserved for the hours you need — day or night.</span></div>
      </div>
    </section>

    <section id="family-life" className={`${styles.s1Container} ${styles.s1Care}`} aria-labelledby="care-title">
      <div className={styles.s1CareCopy}>
        <p className={styles.s1Eyebrow}>Happy children. Room to breathe.</p>
        <h2 id="care-title">Their own adventures.<br />Your own time.</h2>
        <p>With guaranteed childcare from trained early childhood educators, you can make time for yourself while your children are cared for — reserved in advance around your needs.</p>
        <p>Children’s sport and leisure activities will be offered, with suitable options for different ages and interests. Tell us your dates and your children’s ages to discuss the programme for your stay.</p>
        <a href="#family-questions" className={styles.s1TextLink}>Explore care and activities <ArrowRight size={18} aria-hidden="true" /></a>
      </div>
      <div className={styles.s1CareImages}><Photo mediaKey="proof" className={styles.s1CareMain} /><Photo mediaKey="activityCreate" className={styles.s1CareInset} /></div>
    </section>

    <section className={`${styles.s1Container} ${styles.s1Practical}`} aria-labelledby="practical-title">
      <h2 id="practical-title">A stay that fits your family.</h2>
      <p className={styles.s1Intro}>From everyday essentials to special moments. Make room for time together — and time for yourself.</p>
      <div className={styles.s1PracticalGrid}>{practical.map((item, index) => <article key={item.key} className={styles.s1Card}>
        <button type="button" className={styles.s1CardButton} aria-expanded={practicalOpen === index} aria-controls={`family-detail-${index}`} onClick={() => setPracticalOpen(practicalOpen === index ? null : index)}>
          <Photo mediaKey={item.key} />
          <div className={styles.s1CardCopy}><h3>{item.title}</h3><p>{item.text}</p><span className={styles.s1CardHint}>{practicalOpen === index ? "Close details" : "Explore details"}<ChevronDown size={16} aria-hidden="true" /></span></div>
        </button>
        <div id={`family-detail-${index}`} hidden={practicalOpen !== index} className={styles.s1CardDetail}><p>{[
          "Tell us who is coming. Confirm occupancy, sleeping arrangements and any family equipment with your chosen property.",
          "Discuss meals and dining times. Share allergies or dietary requirements before arrival and confirm them with the food provider.",
          "Reserve care before your stay. Trained early childhood educators provide care at any time of day or night, for the hours agreed around your family’s needs.",
          "Bring your work, wellbeing or personal plans into the conversation, alongside the childcare hours you reserve.",
          "Include children, teenagers and accompanying relatives. Discuss mobility, access and the support each person needs.",
          "Ask for the costs and inclusions of your chosen stay, reserved childcare and activities, including the cancellation terms.",
        ][index]}</p><Link href="/en/contact" className={styles.s1TextLink}>Discuss your stay <ArrowRight size={16} aria-hidden="true" /></Link></div>
      </article>)}</div>
    </section>

    <section className={styles.s1Rhythm} aria-labelledby="rhythm-title">
      <div className={styles.s1Container}>
        <h2 id="rhythm-title">Some time together.<br />Some time your way.</h2>
        <p className={styles.s1RhythmIntro}>Sport, play and creative time for children.<br />Ask about the programme — and make time for yourself.</p>
        <div className={styles.s1RhythmLayout}>
          <div className={styles.s1RhythmMain}>
            <div role="tablist" aria-label="Choose a family moment" className={styles.s1Tabs}>{moments.map((item, index) => <button key={item.label} id={`family-tab-${index}`} role="tab" aria-selected={moment === index} aria-controls="family-moment-panel" tabIndex={moment === index ? 0 : -1} className={moment === index ? styles.s1Active : ""} onClick={() => selectMoment(index)} onKeyDown={(event) => {
              const next = event.key === "ArrowRight" ? (index + 1) % moments.length : event.key === "ArrowLeft" ? (index + moments.length - 1) % moments.length : event.key === "Home" ? 0 : event.key === "End" ? moments.length - 1 : null;
              if (next !== null) { event.preventDefault(); selectMoment(next); document.getElementById(`family-tab-${next}`)?.focus(); }
            }}>{item.label}</button>)}</div>
            <div className={styles.s1SceneRow}>
              <button aria-label="Previous family moment" className={styles.s1Arrow} onClick={() => selectMoment((moment + moments.length - 1) % moments.length)}><ArrowLeft size={19} aria-hidden="true" /></button>
              <div id="family-moment-panel" role="tabpanel" aria-labelledby={preview ? undefined : `family-tab-${moment}`} aria-label={preview ? preview === "activityExplore" ? "Explore Forest City" : "Meet the community" : undefined} className={styles.s1Scene} tabIndex={0}>
                <Photo mediaKey={preview ?? current.key} />
              </div>
              <button aria-label="Next family moment" className={styles.s1Arrow} onClick={() => selectMoment((moment + 1) % moments.length)}><ArrowRight size={19} aria-hidden="true" /></button>
            </div>
            <p className={styles.s1SceneCaption} aria-live="polite">{preview === "activityExplore" ? "Explore Forest City at your family’s pace. Ask about routes, transport and places that suit the whole group." : preview === "community" ? "Look beyond your room to the Crays community. Confirm which gatherings are open to your family." : current.caption}</p>
          </div>
          <div className={styles.s1RhythmSide}>{([{ key: "activityExplore", label: "Explore Forest City" }, { key: "community", label: "Meet the community" }] as const).map((item) => <button key={item.key} type="button" aria-pressed={preview === item.key} className={styles.s1PhotoChoice} onClick={() => setPreview(preview === item.key ? null : item.key)}><Photo mediaKey={item.key} /><span>{item.label}<ArrowRight size={18} aria-hidden="true" /></span></button>)}</div>
        </div>
        <details className={styles.s1MoreMoments}><summary>Explore more family moments <ChevronDown size={18} aria-hidden="true" /></summary><div className={styles.s1Gallery}>{gallery.map((item) => <div key={item.key}><Photo mediaKey={item.key} /><p>{item.label}</p></div>)}</div></details>
      </div>
    </section>

    <section className={`${styles.s1Container} ${styles.s1Planning}`} id="family-questions" aria-labelledby="plan-title">
      <div><h2 id="plan-title">Let’s make the practical<br />part clear.</h2><p className={styles.s1Intro}>A few simple steps to plan a family stay that works for everyone.</p>
        <div className={styles.s1Steps}>{[
          { Icon: MessageCircle, title: "Tell us about your family", text: "Share your dates, children’s ages and what matters most." },
          { Icon: CalendarDays, title: "Shape your stay", text: "Discuss accommodation, activities and childcare around your family." },
          { Icon: CheckCircle2, title: "Reserve care and confirm the details", text: "Agree the care hours, costs and stay arrangements before you book." },
        ].map(({ Icon, title, text }) => <div key={title}><Icon size={30} strokeWidth={1.5} aria-hidden="true" /><div><h3>{title}</h3><p>{text}</p></div></div>)}</div>
      </div>
      <div className={styles.s1Faq}><h3>Frequently asked questions</h3>{questions.map((item, index) => <details key={item.question} open={index === 0 ? true : undefined}><summary>{item.question}<ChevronDown size={17} aria-hidden="true" /></summary><p>{item.answer}</p></details>)}</div>
    </section>

    <section className={`${styles.s1Container} ${styles.s1Finale}`} aria-labelledby="final-title"><Photo mediaKey="hero" /><div><h2 id="final-title">Bring everyone.<br />Make time for each other.</h2><p>A short break or a longer chapter: start with your family, your dates and the kind of days you want to share.</p><div className={styles.s1Actions}><Action>Plan your family stay</Action><Action href="/en/discover#stay" secondary>Explore places to stay</Action></div></div></section>
  </main>;
}
