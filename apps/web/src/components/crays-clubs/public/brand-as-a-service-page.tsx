"use client";

import { useState, type KeyboardEvent } from "react";
import { ArrowLeft, ArrowRight, Plus, Minus, Circle, CircleDot } from "lucide-react";
import { TodayLocaleProvider, TodayLocalizedContent, type TodayMessages } from "./today-localized-content";
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
  return <TodayLocalizedContent><div className={styles.bsActions}><a className={styles.bsPrimary} href="https://www.crays.org/en/association/">Go to Association <ArrowRight size={18} aria-hidden="true" /></a><a className={styles.bsSecondary} href="mailto:info@crays.org?subject=Crays%20Brand%20as%20a%20Service%20Application">Start Application <ArrowRight size={18} aria-hidden="true" /></a></div></TodayLocalizedContent>;
}
function Photo({image,alt,className=""}:{image:string;alt:string;className?:string}) {
  return <div className={`${styles.bsPhoto} ${className}`}><Image key={image} fill alt={alt} sizes="(max-width:760px) 90vw, 45vw" src={image.startsWith("/")?image:`${BRAND_MEDIA}/${image}`} /></div>;
}
function advanceTab(event:KeyboardEvent<HTMLButtonElement>,index:number,count:number,select:(n:number)=>void,id:string){
  let next:number|undefined;
  if(event.key==="ArrowRight"||event.key==="ArrowDown")next=(index+1)%count;
  if(event.key==="ArrowLeft"||event.key==="ArrowUp")next=(index+count-1)%count;
  if(event.key==="Home")next=0;
  if(event.key==="End")next=count-1;
  if(next!==undefined){event.preventDefault();select(next);document.getElementById(`${id}-${next}`)?.focus();}
}
export function BrandAsAServicePage({locale,messages={}}:{locale:CraysPublicLocale;messages?:TodayMessages}){
  return <TodayLocaleProvider locale={locale} messages={messages}><BrandScreenOne locale={locale}/></TodayLocaleProvider>;
}
function BrandScreenOne({locale}:{locale:CraysPublicLocale}){
  const [platform,setPlatform]=useState(3);
  const [platformOpen,setPlatformOpen]=useState(false);
  const [journey,setJourney]=useState(0);
  const [property,setProperty]=useState(0);
  const [pack,setPack]=useState(0);
  const pool=[...new Set([...PLATFORM,...PROPERTY_FIT,...PACKAGES].map(item=>item[2]))];
  const primaryPhoto=PLATFORM[platform][2];
  const sidePhoto=primaryPhoto==="prime-location-city-terrace.png"?"wireframe-club-lounge.jpg":"prime-location-city-terrace.png";
  const propertyPhoto=[PROPERTY_FIT[property][2],...pool].find(image=>![primaryPhoto,sidePhoto,"wireframe-owner-party-women-v2.webp"].includes(image))!;
  const packagePhoto=[PACKAGES[pack][2],"serviced-apartment.jpg",...pool].find(image=>![primaryPhoto,sidePhoto,propertyPhoto,"wireframe-owner-party-women-v2.webp"].includes(image))!;
  return <ClubsPublicShell availableLocales={AVAILABLE_LOCALES} headerTone="overlay" locale={locale}>
    <TodayLocalizedContent><main className={styles.bsPage}>
      <section className={styles.bsHero} aria-labelledby="brand-hero-title">
        <Image fill priority sizes="100vw" className={styles.bsCover} alt="Aerial view of the Forest City waterfront destination" src={`${BRAND_MEDIA}/brand-as-a-service-hero-forest-city-1920.webp`}/>
        <div className={styles.bsShade} aria-hidden="true"/>
        <div className={styles.bsContainer}><div className={styles.bsHeroCopy}>
          <p className={styles.bsKicker}>Crays Brand as a Service with no classic royalty trap</p>
          <h1 id="brand-hero-title">Open<br/>your own<br/>Crays Club!</h1>
          <p>Got a property? Bring it. Don&apos;t have one yet? Let&apos;s find it together. You run it, we build it out, Crays plugs you into a global brand, shared tech, cooperative marketing and sales, hospitality playbooks, and a community that actually shows up — no classic royalty fees, no gatekeepers.</p>
          <ActionPair/>
        </div></div>
      </section>
      <aside className={styles.bsNote} aria-labelledby="brand-note-title"><div className={`${styles.bsContainer} ${styles.bsNoteGrid}`}>
        <h3 id="brand-note-title">No classic fee buy-in.</h3>
        <p>Approved operators qualify through the Crays Association, which governs and protects the Crays brand. The Swiss Crays Cooperative Society coordinates shared sales, marketing and hospitality standards — bringing together independent entrepreneurs with voting rights under one global Work, Live &amp; Play standard while every location remains independently owned and operated.</p>
      </div></aside>
      <section className={styles.bsSection} aria-labelledby="support-title"><div className={styles.bsContainer}>
        <p className={styles.bsKicker}>Built to help you win</p><h2 id="support-title">Crays partners with you from<br/> day one — and stays with you.</h2>
        <div className={styles.bsBenefits}>{SUPPORT.map(([title,body,Icon])=><article key={title}><Icon size={28} strokeWidth={1.6} aria-hidden="true"/><h3>{title}</h3><p>{body}</p></article>)}</div>
      </div></section>
      <section className={styles.bsSection} aria-labelledby="platform-title"><div className={`${styles.bsContainer} ${styles.bsPlatform}`}>
        <div><p className={styles.bsKicker}>A platform that serves you</p><h2 id="platform-title">Everything you need. Nothing you don&apos;t.</h2><p>Crays Brand as a Service gives independent operators the power of a global hospitality ecosystem without giving up control.</p>
          <div className={styles.bsAccordion}>{PLATFORM.map(([title,body],index)=>{const open=platform===index&&platformOpen;return <div key={title}><h3><button id={`platform-button-${index}`} aria-expanded={open} aria-controls={`platform-body-${index}`} onClick={()=>{setPlatform(index);setPlatformOpen(platform!==index||!platformOpen);}}>{title}{open?<Minus size={18} aria-hidden="true"/>:<Plus size={18} aria-hidden="true"/>}</button></h3><div id={`platform-body-${index}`} hidden={!open}><p>{body}</p></div></div>;})}</div>
        </div>
        <div className={styles.bsImageBoard}><Photo image={primaryPhoto} alt={PLATFORM[platform][0]} className={styles.bsMainImage}/><Photo image={sidePhoto} alt={platform===2?"Crays club lounge":"Prime location with room for a club layer"} className={styles.bsSmallImage}/></div>
      </div></section>
      <section className={styles.bsJourney} aria-labelledby="journey-title"><div className={styles.bsContainer}>
        <p className={styles.bsKicker}>A platform that routes</p><h2 id="journey-title">From idea to a thriving Crays Club.</h2>
        <div className={styles.bsJourneyTabs} role="tablist" aria-label="From idea to a Crays Club">{JOURNEY.map(([title],index)=><button key={title} role="tab" id={`journey-${index}`} aria-selected={journey===index} aria-controls={`journey-panel-${index}`} tabIndex={journey===index?0:-1} onClick={()=>setJourney(index)} onKeyDown={event=>advanceTab(event,index,JOURNEY.length,setJourney,"journey")}><span className={styles.bsStageMarker}>{journey===index?<CircleDot size={22} aria-hidden="true"/>:<Circle size={22} aria-hidden="true"/>}{index<JOURNEY.length-1?<><span className={styles.bsStageLine}/><ArrowRight size={18} aria-hidden="true"/></>:null}</span><span className={styles.bsStageLabel}>{title}</span></button>)}</div>
        {JOURNEY.map(([title,body],index)=><div key={title} role="tabpanel" id={`journey-panel-${index}`} aria-labelledby={`journey-${index}`} hidden={journey!==index} tabIndex={0} className={styles.bsJourneyPanel}><p>{body}</p></div>)}
      </div></section>
      <section className={styles.bsSection} aria-labelledby="property-title"><div className={`${styles.bsContainer} ${styles.bsProperty}`}>
        <div><p className={styles.bsKicker}>Your six-step route works</p><h2 id="property-title">The right place makes all the difference.</h2><p>Turn your independent hospitality operation into a Crays network node. If you run a hotel, co-living house, serviced apartment, retreat venue, or mixed-use asset, you can add brand power, a full Hospitality OS, real member demand, booking infrastructure, and a tokenized partner network without giving up your property, your team, or what makes your place yours.</p><Photo image={`${FOREST_CITY}/hero-forest-city-coast.webp`} alt="Forest City waterfront towers" className={styles.bsCoastImage}/></div>
        <div><Photo image={propertyPhoto} alt={PROPERTY_FIT[property][0]} className={styles.bsPropertyImage}/><div className={styles.bsSliderBar}><button type="button" aria-label="Previous property" onClick={()=>setProperty((property+PROPERTY_FIT.length-1)%PROPERTY_FIT.length)}><ArrowLeft aria-hidden="true" size={20}/></button><div className={styles.bsDots} aria-label="Property views">{PROPERTY_FIT.map(([title],index)=><button type="button" key={title} aria-label={title} aria-pressed={property===index} onClick={()=>setProperty(index)}/>)}</div><button type="button" aria-label="Next property" onClick={()=>setProperty((property+1)%PROPERTY_FIT.length)}><ArrowRight aria-hidden="true" size={20}/></button></div><div aria-live="polite" className={styles.bsPropertyCaption}><h3>{PROPERTY_FIT[property][0]}</h3><p>{PROPERTY_FIT[property][1]}</p></div></div>
      </div></section>
      <section className={styles.bsSection} aria-labelledby="owner-title"><div className={`${styles.bsContainer} ${styles.bsOwner}`}>
        <Photo image="wireframe-owner-party-women-v2.webp" alt="Two future Crays Club owners celebrating together" className={styles.bsOwnerImage}/>
        <div><p className={styles.bsKicker}>Are you the right owner?</p><h2 id="owner-title">Start with the building, not the buzzword.</h2><p>Crays Club Brand as a Service fits properties that already have location, structure and soul. We check what should be protected, what must be upgraded, and whether the building can carry hospitality, community and repeat demand without becoming a chain conversion.</p><div className={styles.bsOwnerSteps}>{OWNER_STEPS.map(([title,body,Icon])=><article key={title}><Icon size={26} strokeWidth={1.6} aria-hidden="true"/><h3>{title}</h3><p>{body}</p></article>)}</div></div>
      </div></section>
      <section className={styles.bsPackageSection} aria-labelledby="package-title"><div className={`${styles.bsContainer} ${styles.bsPackage}`}>
        <div><p className={styles.bsKicker}>Your operating package</p><h2 id="package-title">How deep do you want to go?</h2><p>Choose the level of transformation that fits your asset, budget and ambition. You stay in control. Crays brings the system.</p><div role="tablist" aria-label="Your operating package" className={styles.bsPackageTabs}>{PACKAGES.map(([title],index)=><button role="tab" key={title} id={`package-${index}`} aria-selected={pack===index} aria-controls={`package-panel-${index}`} tabIndex={pack===index?0:-1} onClick={()=>setPack(index)} onKeyDown={event=>advanceTab(event,index,PACKAGES.length,setPack,"package")}><span>{title}</span><ArrowRight size={20} aria-hidden="true"/></button>)}</div></div>
        <div>{PACKAGES.map(([title,body,image],index)=><div role="tabpanel" key={title} id={`package-panel-${index}`} aria-labelledby={`package-${index}`} hidden={pack!==index} tabIndex={0}><Photo image={packagePhoto} alt={title} className={styles.bsPackageImage}/><h3>{title}</h3><p>{body}</p></div>)}</div>
      </div></section>
      <section className={styles.bsSection} id="application" aria-labelledby="application-title"><div className={`${styles.bsContainer} ${styles.bsClosing}`}>
        <div><h2 id="application-title">Let&apos;s build a Crays Club that your market loves.</h2><p>Bring your property or your idea. We&apos;ll help you turn it into a Crays Club — with global brand power, smart technology and a community that fills your rooms and your calendar.</p></div><ActionPair/>
      </div></section>
    </main></TodayLocalizedContent>
  </ClubsPublicShell>;
}
