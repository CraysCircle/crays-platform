import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { PublicAmbassadorView } from "../../../lib/clubs/public-ambassador-view";
import { CLUBS_LOCALES, type ClubsLocale } from "../../../lib/clubs/public-site";
import { ClubsPublicShell } from "./clubs-public-shell";
import { ClubsPublicContactForm } from "./clubs-public-contact-form";
import { PUBLIC_CONTACT_COPY } from "./clubs-public-contact-copy";
import { AMBASSADOR_DIRECTORY_COPY } from "./clubs-ambassador-directory-copy";
import styles from "./clubs-ambassador-profile-detail.module.css";
import tokens from "./clubs-public-design-tokens.module.css";
export function ClubsAmbassadorProfilePage({ambassador,locale="en"}:{ambassador:PublicAmbassadorView;locale?:ClubsLocale}) {
 const c=PUBLIC_CONTACT_COPY[locale];const d=AMBASSADOR_DIRECTORY_COPY[locale];
 const role=ambassador.role==="founder"?d.founder:ambassador.role==="cofounder"?d.cofounder:d.ambassador;
 return <ClubsPublicShell availableLocales={CLUBS_LOCALES} headerTone="navy" locale={locale} footerCtaHref={"/"+locale+"/this-your-kinda-crowd"} footerCtaLabel={d.crowd}>
  <main data-crays-ambassador-profile="true" className={`${tokens.theme} ${styles.page}`}>
   <section className={styles.hero} aria-labelledby="ambassador-name">
    <div className={styles.monogramPanel}><Link className={styles.backLink} href={"/"+locale+"/ambassadors"}><ArrowLeft size={17} aria-hidden="true"/>{c[14]}</Link>
     {ambassador.media.url&&<Image alt={d.portrait.replace("{name}",ambassador.name)} className={styles.profilePortrait} data-portrait-shape={ambassador.media.height>ambassador.media.width*1.25?"tall":"wide"} fill unoptimized priority sizes="(max-width:900px) 100vw,42vw" src={ambassador.media.url} style={{objectPosition:`${ambassador.media.focalPoint.x*100}% ${(ambassador.media.height>ambassador.media.width*1.25?0:ambassador.media.focalPoint.y*100)}%`}}/>}<p>{d.eyebrow}</p>
    </div>
    <div className={styles.heroCopy}><p className={styles.eyebrow}>{role}</p><h1 id="ambassador-name">{ambassador.name}</h1><p className={styles.intro}>{c[15].replace("{name}",ambassador.name)}</p>
     <div className={styles.actions}><a className={styles.primaryAction} href="#ambassador-contact">{c[0]}<ArrowRight size={18} aria-hidden="true"/></a>{ambassador.linkedInUrl&&<a className={styles.linkedinAction} href={ambassador.linkedInUrl ?? undefined} target="_blank" rel="noopener noreferrer" aria-label={d.linkedIn.replace("{name}",ambassador.name)}>LinkedIn</a>}</div><p className={styles.authorityNote}>{d.noAccount}</p>
    </div>
   </section>
   <ClubsPublicContactForm key={locale+ambassador.slug} locale={locale} recipients={[{slug:ambassador.slug,name:ambassador.name}]} recipientSlug={ambassador.slug}/>
  </main>
 </ClubsPublicShell>;
}
