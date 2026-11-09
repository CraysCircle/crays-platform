"use client";

import {ArrowRight} from "lucide-react";
import type {ClubsLocale} from "../../../lib/clubs/public-site";
import type {ClubsMembershipApplicationInput} from "../../../lib/clubs/public-ambassador-registry";
import copyByLocale from "./clubs-ambassador-life-copy.json";
import {ambassadorEditorialCopy} from "./clubs-ambassador-editorial-copy";
import media from "./clubs-ambassador-life-media.json";
import styles from "./clubs-ambassador-life-story.module.css";

type Props = {locale:ClubsLocale; input:ClubsMembershipApplicationInput; disabled:boolean; setValue:<K extends keyof ClubsMembershipApplicationInput>(name:K,value:ClubsMembershipApplicationInput[K])=>void};
const audienceGroups = [[0,7,8],[1,4,6],[2,3,5]] as const;
const slideMedia = ["work","live","play"] as const;
const stayRoutes = ["hospitality/marina-hotel","hospitality/golf-hotel","hospitality"] as const;
// Keep the first two words of a sentence together, including after a question.
function opening(text:string) {return text.replace(/(^\s*|[.!?]\s+)(\S+)[ \t]+(?=\S)/gu,"$1$2\u00a0");}
function Photo({name,alt,className}:{name:keyof typeof media;alt:string;className?:string}) {
 const m=media[name];
 return <img src={m.url} width={m.size[0]} height={m.size[1]} alt={alt} loading="lazy" decoding="async" className={className}/>;
}

export function ClubsAmbassadorLifeStory({locale}:Props) {
 const c=copyByLocale[locale];const original=ambassadorEditorialCopy[locale];
 return <div className={styles.story} data-crays-ambassador-story="20261018">
  <section className={`${styles.wrap} ${styles.life}`} aria-labelledby="ambassador-life-title">
   <div className={styles.sectionHeader}><div><p className={styles.kicker}>{c.lifeKicker}</p><h2 id="ambassador-life-title">{c.lifeTitle.split("\n").map((line,index)=><span key={line}>{index>0&&<br/>}{opening(line)}</span>)}</h2></div><div><p>{opening(c.mission)}</p><p>{opening(c.lifeIntro)}</p></div></div>
   <ol className={styles.lifeGrid}>
    {c.slides.map(([title,body,alt],index)=><li key={title}><figure><Photo name={slideMedia[index]} alt={alt}/><figcaption><h3>{title}</h3><p>{opening(body)}</p></figcaption></figure></li>)}
   </ol>
  </section>

  <section className={styles.quote} aria-label={c.quote}>
   <Photo name="quote" alt={c.imageAlts[1]}/><div className={styles.quoteShade} aria-hidden="true"/>
   <div className={styles.wrap}><blockquote>{opening(c.quote)}</blockquote></div>
  </section>

  <section className={`${styles.wrap} ${styles.introduction}`} aria-labelledby="ambassador-life-intro">
   <div className={styles.introCopy}><p className={styles.kicker}>{c.introKicker}</p><h2 id="ambassador-life-intro">{opening(c.introTitle)}</h2><p className={styles.lead}>{opening(c.introLead)}</p><p>{opening(c.introBody)}</p><a className={styles.textLink} href={`/${locale}/this-your-kinda-crowd`}>{original.crowd}<ArrowRight size={18} aria-hidden="true"/></a></div>
   <figure className={styles.introPhoto}><Photo name="introduction" alt={c.imageAlts[0]}/></figure>
  </section>

  <div className={styles.softBand}><section className={`${styles.wrap} ${styles.values}`} aria-labelledby="ambassador-values-title">
   <div className={styles.sectionHeader}><div><p className={styles.kicker}>{c.valuesKicker}</p><h2 id="ambassador-values-title">{opening(c.valuesTitle)}</h2></div></div>
   <ol className={styles.valuesList}>{c.values.map((value,index)=><li key={value}><span aria-hidden="true">{String(index+1).padStart(2,"0")}</span><p>{opening(value)}</p></li>)}</ol>
   <p className={styles.purpose}>{opening(c.purpose)}</p>
  </section></div>

  <section className={styles.founder} aria-labelledby="ambassador-founder-title"><div className={styles.wrap}>
   <div><p className={styles.kicker}>{c.founderKicker}</p><h2 id="ambassador-founder-title">{opening(c.founderTitle)}</h2>{c.founderBody.map(text=><p key={text}>{opening(text)}</p>)}<p className={styles.founderClose}>{c.founderClose}</p></div>
   <figure><Photo name="founder" alt={c.imageAlts[2]}/></figure>
  </div></section>

  <div className={styles.audienceBand}><section className={`${styles.wrap} ${styles.audience}`} aria-labelledby="ambassador-audience-title">
   <p className={styles.kicker}>{c.audienceKicker}</p><h2 id="ambassador-audience-title">{opening(c.audienceTitle)}</h2>
   <div className={styles.audienceGroups}>{audienceGroups.map((indices,index)=><div key={index}><h3>{c.groupTitles[index]}</h3><ul>{indices.map(i=><li key={i}>{opening(c.audiences[i])}</li>)}</ul></div>)}</div>
  </section></div>

  <div className={styles.ecosystemBand}><section className={`${styles.wrap} ${styles.ecosystem}`} aria-labelledby="ambassador-ecosystem-title">
   <figure><Photo name="ecosystem" alt={c.imageAlts[3]}/></figure><div><p className={styles.kicker}>{c.ecosystemKicker}</p><h2 id="ambassador-ecosystem-title">{opening(c.ecosystemTitle)}</h2><p>{opening(c.ecosystemBody)}</p></div>
  </section></div>

  <div className={styles.pathBand}><section className={`${styles.wrap} ${styles.paths}`} aria-labelledby="ambassador-path-title"><header><h2 id="ambassador-path-title">{original.chapterTitle}</h2><p>{original.chapterBody}</p></header><div className={styles.pathChoices}>{original.paths.map(([title,body])=><div key={title}><h3>{title}</h3><p>{opening(body)}</p></div>)}</div><div className={styles.stayLinks}>{stayRoutes.map((route,index)=><a key={route} href={`/${locale}/${route}`}><span>{original.stays[index][0]}<small>{original.stays[index][1]}</small></span><ArrowRight size={18} aria-hidden="true"/></a>)}</div></section></div>
 </div>;
}
