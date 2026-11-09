"use client";

import Image from "next/image";
import { ArrowDown, ArrowRight, ChevronDown, ChevronRight, MapPin, UsersRound, Layers, Star } from "lucide-react";
import { useEffect, useState } from "react";

import { ClubsPublicShell } from "../public/clubs-public-shell";
import { aboutCopy, type AboutLocale } from "./about-us-copy";
import { ABOUT_US_MEDIA_V2, type AboutMediaKey } from "./about-us-media-v2";
import styles from "./about-screen-one.module.css";
import { TodayLocaleProvider, TodayLocalizedContent, useTodayText, type TodayMessages } from "../public/today-localized-content";

type Props = { locale: AboutLocale; messages?:TodayMessages };

const ABOUT_LOCALES = ["en", "de", "es", "ca", "fr", "pt", "it"] as const;
function Picture({
  name,
  alt,
  className,
  eager = false,
}: {
  name: AboutMediaKey;
  alt?: string;
  className: string;
  eager?: boolean;
}) {
  const {text}=useTodayText();
  const asset = ABOUT_US_MEDIA_V2[name];
  const resolvedAlt = alt === undefined ? asset.altRole : alt;

  return (
    <figure className={[styles.picture, className].join(" ")}>
      <Image
        alt={text(resolvedAlt)}
        data-about-media={asset.id}
        fill
        priority={eager}
        sizes={eager ? "100vw" : "(max-width: 820px) 100vw, (max-width: 1120px) 70vw, 50vw"}
        src={asset.src}
      />
    </figure>
  );
}

const founderSections = [{"title": "", "paragraphs": ["I am German, but I have lived in Spain for over 20 years. Now I live between Dubai, Palma, Medellín and LA. On top of that, for more than two decades I spent more than 250 days a year traveling around the world. That kind of life changes you. It blows your perspective wide open.", "Work-wise, I got to build some pretty sick brands along the way, from lifestyle names like Ed Hardy to tech plays like brands4friends. And crypto? I have been deep in it for 15 years. There are not many people out there who have gone as far down that rabbit hole as I have.", "But honestly, the most incredible thing through all of this has been the people I have met. Literally thousands of amazing humans with wild stories and experiences. That part never gets old.", "There was also the other side of it: the lonely hotel room nights, always wondering how to make traveling feel less isolating. Wishing I knew who was where, who was vibing with what, and how to connect with the right people in the right place at the right time."]}, {"title": "Why Crays exists", "paragraphs": ["That is where the idea was born, slowly, over years. An idea about how to make the world a little better, built from everything I know, everything I have lived, and what I genuinely want to give back.", "As a traveler, the missing piece became clear step by step: real connections, seamless living, and hospitality spaces that truly bring people together.", "Two big moments also shaped who I am personally: the 2008 Lehman Brothers collapse, and especially the Spanish real estate crash from 2007 to 2013, alongside what happened in Greece, Portugal, and Ireland. Watching people in my circle get wrecked by that hit different. It made me obsessed with one question: what actually is money?", "That obsession led me to crypto when it was still shady and underground, and then to Web3. The core question was always: what is money, really? And tied to that, how do you build wealth when you were not born into it?"]}, {"title": "Wealth creation for the next generation", "paragraphs": ["Later, that question evolved into something bigger: wealth creation for the next generation. That is what I have to offer from everything I have learned. For young people today, moving up in society is almost impossible. Buying property, saving enough to invest, and staying ahead of inflation has become brutally hard. I believe the system made it that way, and that is what Crays pushes back against. That is also why I love Bitcoin's deflationary model.", "Crays is going after that problem head-on. Think old-school cooperatives: people coming together for the collective good, building something real together, and having a damn good time doing it.", "Through all my travels, I have always been chasing one thing: a home for a global community of like-minded people. It does not matter where you are from, what you look like, or what religion you practice. Your values are your passport. The true global citizen is defined not by country, but by what they stand for.", "And yes, a real community is also willing to say, this is not for you, to people who will not engage with those values."]}, {"title": "Privacy, freedom, autonomy", "paragraphs": ["Privacy, freedom of expression, and personal autonomy are non-negotiable at Crays. No privacy, no democracy. The world is sliding toward surveillance and control, turbo-charged by technology. Crays is being built in direct opposition to that: technologically, structurally, and culturally.", "But why am I doing all this? Why take on the stress of running a non-profit?", "I do not want a salary. But I have got to eat, so 0.25% of every transaction in the Crays global ecosystem flows into a wallet tied to me personally. That is my retirement. I am president of the Association for life.", "Since I do not have heirs, when I am gone, everything passes into a foundation, so this mission and this dream keep going with the community and the Association no matter what."]}, {"title": "", "paragraphs": ["Crays is for people. It is for life, digital and IRL. A physical and digital ecosystem where global citizens find home, surrounded by people they actually love.", "No more work life versus personal life. That line is gone. We are human beings. We want to live. We want to build something incredible together.", "I wish all of us a perfect time together. Do not predict the future. Let us go out and build it together."]}];

function AboutScreenOne({ locale }: Props) {
  const c = aboutCopy[locale];
  const {text:t}=useTodayText();
  const [founderOpen,setFounderOpen] = useState(false);
  const [activeFlow,setActiveFlow] = useState(0);
  const [flowFrames,setFlowFrames] = useState([0,0,0,0]);
  const [hoveredFlow,setHoveredFlow] = useState<number|null>(null);
  const flowStories:readonly {title:string;images:readonly AboutMediaKey[]}[]=[
    {title:"Arrive",images:["heroCinematic","filmSkyline","filmOutlook"]},
    {title:"Work",images:["beliefRemote","filmInterior","remoteRoutine"]},
    {title:"Live",images:["beliefLiving","visionCity","nomadWork"]},
    {title:"Belong",images:["beliefNomads","remoteNetwork","flowBelong"]},
  ];
  const advanceFlow=(index:number)=>{setActiveFlow(index);setFlowFrames(frames=>frames.map((frame,i)=>i===index?(frame+1)%3:frame));};
  useEffect(()=>{
    if(hoveredFlow===null||window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;
    const timer=window.setInterval(()=>setFlowFrames(frames=>frames.map((frame,i)=>i===hoveredFlow?(frame+1)%3:frame)),2200);
    return ()=>window.clearInterval(timer);
  },[hoveredFlow]);




  return (
    <ClubsPublicShell
      availableLocales={ABOUT_LOCALES}
      headerTone="overlay"
      locale={locale}
    >
      <TodayLocalizedContent><main className={styles.page} id="about-us-main">
        <section className={styles.hero} aria-labelledby="about-hero-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>{c.hero.eyebrow}</p>
            <h1 id="about-hero-title">{c.hero.title}</h1>
            <p className={styles.heroBody}>{c.hero.body}</p>
            <div className={styles.heroActions}>
              <a className={styles.primaryAction} href={"/" + locale + "/become-a-member"}>
                {c.hero.primary}<ArrowRight aria-hidden="true" size={17} strokeWidth={2} />
              </a>
              <a className={styles.secondaryAction} href="#about-idea">
                {c.hero.secondary}<ArrowDown aria-hidden="true" size={17} strokeWidth={2} />
              </a>
            </div>
          </div>

          <div className={styles.heroVisual}>
            <Picture name="heroCinematic" className={styles.heroCinematic} eager />


          </div>



        </section>

        <section className={styles.idea} id="about-idea" aria-labelledby="idea-title">
          <div className={styles.ideaCopy}>
            <p className={styles.chapterNumber}>01</p>
            <p className={styles.eyebrow}>{c.idea.eyebrow}</p>
            <h2 id="idea-title">{c.idea.title}</h2>
            <p className={styles.ideaBody}>{c.idea.body}</p>
          </div>
          <div className={styles.ideaVisual}>
            <Picture name="ideaWide" className={styles.ideaWideImage} />
            <p>{c.idea.caption}</p>
          </div>
        </section>

        <section className={styles.founderSection} id="about-founder" aria-labelledby="founder-title">
          <div className={styles.founderCard}>
            <header className={styles.founderHeader}>
              <Image src="/__crays-clubs/people/ambassadors-v1/thorben-biesenbach.jpg" alt="Thorben Biesenbach, founder of Crays" width={88} height={88} className={styles.founderPortrait} />
              <div className={styles.founderIntro}>
                <p className={styles.eyebrow}>Founder Prologue</p>
                <h2 id="founder-title">My Vision &amp; Mission Statement for Crays</h2>
                <p>Alright, before you dive deep into all this — let me introduce myself real quick and be straight with you about why I am doing this whole thing and how it even came to be.</p>
                <p>So yeah, what actually got me here?</p>
              </div>
              <button type="button" className={styles.founderToggle} aria-expanded={founderOpen} aria-controls="founder-story" onClick={()=>setFounderOpen(open=>!open)}>{founderOpen ? "Read less" : "Read more"}<ChevronDown size={18} aria-hidden="true" /></button>
            </header>
            <div id="founder-story" className={[styles.founderReveal,founderOpen?styles.founderExpanded:""].join(" ")} aria-hidden={!founderOpen}>
              <div className={styles.founderClip}>
                <div className={styles.founderReading}>
                  {founderSections.map((section,index)=><div key={index}>
                    {section.title && <h3>{section.title}</h3>}
                    {index===4 && <blockquote>Work, Live &amp; Play — one big global community.</blockquote>}
                    {section.paragraphs.map(paragraph=><p key={paragraph}>{paragraph}</p>)}
                  </div>)}
                  <p className={styles.founderSignature}>— Thorben Biesenbach</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.beliefs} id="about-beliefs" aria-labelledby="beliefs-title">
          <header className={styles.sectionHeader}>
            <div>
              <p className={styles.chapterNumber}>02</p>
              <p className={styles.eyebrow}>{c.beliefs.eyebrow}</p>
            </div>
            <h2 id="beliefs-title">{c.beliefs.title}</h2>
          </header>
          <div className={styles.beliefSequence}>
            {c.beliefs.items.map((belief, index) => {
              const image: AboutMediaKey = index === 0 ? "beliefLiving" : index === 1 ? "beliefNomads" : "beliefRemote";
              return (
                <article key={belief.title} tabIndex={0}>
                  <Picture name={image} className={styles.beliefImage} />
                  <div>
                    <span>0{index + 1}</span>
                    <h3>{belief.title}</h3>
                    <p>{belief.body}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className={styles.vision} id="about-vision" aria-labelledby="vision-title">
          <div className={styles.visionLead}>
            <div>
              <p className={styles.chapterNumber}>03</p>
              <p className={styles.eyebrow}>{c.vision.eyebrow}</p>
              <h2 id="vision-title">{c.vision.title}</h2>
            </div>
            <div className={styles.visionText}>
              <p>{c.vision.body}</p>

            </div>
          </div>
          <div className={styles.visionScenes}>
            <div>
              <Picture name="filmCoast" className={styles.visionWideImage} />

            </div>
            <div>
              <Picture name="filmCommunity" className={styles.visionPortraitImage} />

            </div>

          </div>
          <div className={styles.visionPillars}>
            {c.vision.pillars.map((pillar, index) => (
              <article key={pillar.title}>
                <span aria-hidden="true">{index===0?<MapPin size={32}/>:index===1?<UsersRound size={32}/>:index===2?<Layers size={32}/>:<Star size={32}/>}</span><h3>{pillar.title}</h3>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.flow} id="about-flow" aria-labelledby="flow-title">
          <header className={styles.flowHeader}>
            <div>
              <p className={styles.chapterNumber}>04</p>
              <p className={styles.eyebrow}>{c.flow.eyebrow}</p>
            </div>
            <h2 id="flow-title">{c.flow.title}</h2>
          </header>
          <div className={styles.flowSteps}>
            {flowStories.map((step,index)=>(
              <article className={styles.flowItem} key={step.title}>
                <button className={styles.flowCard} type="button" onClick={()=>advanceFlow(index)} onMouseEnter={()=>{setActiveFlow(index);setHoveredFlow(index);}} onMouseLeave={()=>setHoveredFlow(null)} onFocus={()=>{setActiveFlow(index);setHoveredFlow(index);}} onBlur={()=>setHoveredFlow(null)} aria-pressed={activeFlow===index} aria-label={`${t("Explore")} ${t(step.title)}`} onKeyDown={event=>{
                  if(event.key==="ArrowRight"||event.key==="ArrowLeft"){
                    event.preventDefault();const next=(index+(event.key==="ArrowRight"?1:3))%4;advanceFlow(next);document.getElementById(`about-flow-card-${next}`)?.focus();
                  }
                }} id={`about-flow-card-${index}`}>
                  <span className={styles.flowMedia}>{step.images.map((image,frame)=><Picture key={image} name={image} alt={frame===flowFrames[index]?step.title:""} className={`${styles.flowImage} ${frame===flowFrames[index]?styles.flowImageActive:""}`}/>)}</span>
                  <span>{step.title}</span>
                </button>
                {index<3?<button className={styles.flowNext} type="button" aria-label={`${t("Continue to")} ${t(flowStories[index+1].title)}`} onClick={()=>{advanceFlow(index+1);document.getElementById(`about-flow-card-${index+1}`)?.focus();}}><ChevronRight aria-hidden="true" size={24}/></button>:null}
              </article>
            ))}
          </div>
        </section>

      </main></TodayLocalizedContent>
    </ClubsPublicShell>
  );
}

export function AboutUsPage({locale,messages={}}:Props){return <TodayLocaleProvider locale={locale} messages={messages}><AboutScreenOne locale={locale}/></TodayLocaleProvider>;}
