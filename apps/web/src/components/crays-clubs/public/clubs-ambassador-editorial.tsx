"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BedDouble, Heart, Laptop, MapPin, Plus, Smartphone, UserRound, UsersRound } from "lucide-react";
import type { ClubsLocale } from "../../../lib/clubs/public-site";
import { ambassadorEditorialCopy } from "./clubs-ambassador-editorial-copy";
import type { ClubsMembershipApplicationInput } from "../../../lib/clubs/public-ambassador-registry";
import styles from "./clubs-ambassador-editorial.module.css";

type Props = {
  locale: ClubsLocale;
  disabled: boolean;
  setValue: <K extends keyof ClubsMembershipApplicationInput>(name: K, value: ClubsMembershipApplicationInput[K]) => void;
};

const benefitIcons = [UsersRound, Laptop, Heart] as const;
const pathOptions = [
  { type: "individual", Icon: UserRound },
  { type: "family", Icon: UsersRound },
  { type: "team", Icon: UsersRound },
] as const;
const stayOptions = [
  { Icon: BedDouble, route: "hospitality/marina-hotel" },
  { Icon: BedDouble, route: "hospitality/golf-hotel" },
  { Icon: MapPin, route: "hospitality" },
] as const;

export function ClubsAmbassadorEditorial({locale, disabled, setValue}: Props) {
  const copy = ambassadorEditorialCopy[locale];
  const benefits = benefitIcons.map((Icon, index) => {
    const [title, body] = copy.benefits[index]!;
    return {Icon, title, body};
  });
  const paths = pathOptions.map((option, index) => {
    const [title, body] = copy.paths[index]!;
    return {...option, title, body};
  });
  const stays = stayOptions.map((option, index) => {
    const [title, subtitle, body, label] = copy.stays[index]!;
    return {...option, title, subtitle, body, label, href: `/${locale}/${option.route}`};
  });
  const steps = copy.steps.map(([title, body]) => ({title, body}));
  function choose(type: ClubsMembershipApplicationInput["applicantType"]) {
    if (disabled) return;
    setValue("applicantType", type);
    document.getElementById("ambassador-contact")?.scrollIntoView({behavior: "smooth"});
  }
  return <div className={styles.editorial}>
    <section className={`${styles.container} ${styles.introduction}`} aria-labelledby="crays-life-title">
      <div className={styles.introCopy}>
        <h2 id="crays-life-title">{copy.introTitle.split("\n")[0]}<br/>{copy.introTitle.split("\n")[1]}</h2>
        <p>{copy.introBody}</p>
        <Link className={styles.primary} href={`/${locale}/discover`}>{copy.discover}<ArrowRight size={18} aria-hidden="true"/></Link>
      </div>
      <figure className={styles.coastPhoto}>
        <Image src="/__crays-clubs/ambassador-editorial-v1/forest-city.png" alt={copy.coastAlt} fill sizes="(max-width: 800px) 100vw, 760px"/>
        <figcaption>{copy.coastCaption.split("\n")[0]}<br/>{copy.coastCaption.split("\n")[1]}</figcaption>
      </figure>
    </section>
    <section className={`${styles.container} ${styles.benefits}`} aria-label={copy.lifeLabel}>
      {benefits.map(({Icon, title, body}, index) => <article key={title}><Icon className={index === 1 ? styles.blue : styles.pink} size={42} strokeWidth={1.7} aria-hidden="true"/><h3>{title}</h3><p>{body}</p></article>)}
    </section>
    <section className={`${styles.container} ${styles.community}`} aria-labelledby="crays-people-title">
      <figure className={styles.groupPhoto}><Image src="/__crays-clubs/ambassador-editorial-v1/community.png" alt={copy.communityAlt} fill sizes="(max-width: 800px) 100vw, 780px"/></figure>
      <div><h2 id="crays-people-title">{copy.communityTitle.split("\n")[0]}<br/>{copy.communityTitle.split("\n")[1]}</h2><p>{copy.communityBody}</p><Link className={styles.primary} href={`/${locale}/this-your-kinda-crowd`}>{copy.crowd}<ArrowRight size={18} aria-hidden="true"/></Link></div>
    </section>
    <section className={styles.chapter} aria-labelledby="crays-chapter-title"><div className={styles.container}>
      <header className={styles.sectionHeading}><h2 id="crays-chapter-title">{copy.chapterTitle}</h2><p>{copy.chapterBody}</p></header>
      <div className={styles.paths}>{paths.map(({type, Icon, title, body}, index) => <article key={type}><Icon className={index === 1 ? styles.pink : styles.blue} size={40} strokeWidth={1.7} aria-hidden="true"/><div><h3><button className={styles.pathButton} type="button" disabled={disabled} onClick={() => choose(type)}>{title}<ArrowRight size={16} aria-hidden="true"/></button></h3><p>{body}</p></div></article>)}</div>
      <div className={styles.stays}>{stays.map(({Icon, title, subtitle, body, href, label}) => <article key={title}><Icon className={styles.blue} size={40} strokeWidth={1.7} aria-hidden="true"/><div><h3>{title}</h3><strong>{subtitle}</strong><p>{body}</p><Link className={styles.textLink} href={href}>{label}<ArrowRight size={15} aria-hidden="true"/></Link></div></article>)}</div>
      <section className={styles.journey} aria-labelledby="crays-journey-title">
        <header className={styles.journeyHeading}><h2 id="crays-journey-title">{copy.journeyTitle}</h2><p>{copy.journeyBody}</p></header>
        <ol className={styles.process} role="list">{steps.map(({title, body}, index) => <li className={styles.processStep} key={title}>
          <span className={`${styles.stepNumber} ${index === 1 ? styles.blue : styles.pink}`} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
          {index < steps.length - 1 ? <span className={styles.stepConnector} aria-hidden="true"><ArrowRight size={20}/></span> : null}
          <div className={styles.stepCopy}><h3>{title}</h3><p>{body}</p></div>
        </li>)}</ol>
        <div className={styles.appNote}><Smartphone className={styles.blue} size={22} aria-hidden="true"/><p>{copy.appBody}</p><Link className={styles.textLink} href={`/${locale}/agentic-life`}>{copy.appLink}<ArrowRight size={14} aria-hidden="true"/></Link></div>
      </section>
    </div></section>
  </div>;
}

export function ClubsAmbassadorEditorialEnding({locale}: {locale: ClubsLocale}) {
  const copy = ambassadorEditorialCopy[locale];
  return <section className={`${styles.editorial} ${styles.faq}`} aria-labelledby="ambassador-faq-title"><div className={styles.container}>
    <header className={styles.faqHeading}><h2 id="ambassador-faq-title">{copy.faqTitle}</h2><p>{copy.faqBody}</p></header>
    <div className={styles.questions}>{copy.questions.map(([question, answer]) => <details key={question}><summary>{question}<Plus size={18} aria-hidden="true"/></summary><p>{answer}</p></details>)}</div>
  </div></section>;
}
