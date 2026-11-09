import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CornerRightUp } from "lucide-react";
import { loadPublicAmbassadors } from "../../../lib/server/clubs/public-ambassador-page-data";
import styles from "./clubs-ambassador-directory-page.module.css";
import tokens from "./clubs-public-design-tokens.module.css";
import { ClubsPublicShell } from "./clubs-public-shell";

import { CLUBS_LOCALES, type ClubsLocale } from "../../../lib/clubs/public-site";
import { AMBASSADOR_DIRECTORY_COPY } from "./clubs-ambassador-directory-copy";

const locales = CLUBS_LOCALES;

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("");
}

export async function ClubsAmbassadorDirectoryPage({ locale = "en" }: { locale?: ClubsLocale }) {
  const copy = AMBASSADOR_DIRECTORY_COPY[locale];
  const root = "/" + locale;
  let directoryUnavailable = false;
  const ambassadors = await loadPublicAmbassadors(locale).catch(() => {
    directoryUnavailable = true;
    return [];
  });
  const unavailableCopy = {
    en: "The Ambassador directory is temporarily unavailable. Please try again shortly or contact the CRAYS team.",
    de: "Das Ambassador-Verzeichnis ist vorübergehend nicht verfügbar. Bitte versuche es später erneut oder kontaktiere das CRAYS-Team.",
    es: "El directorio de Ambassadors no está disponible temporalmente. Inténtalo de nuevo más tarde o contacta con el equipo CRAYS.",
    ca: "El directori d’Ambassadors no està disponible temporalment. Torna-ho a provar més tard o contacta amb l’equip CRAYS.",
    fr: "L’annuaire des Ambassadors est temporairement indisponible. Réessayez plus tard ou contactez l’équipe CRAYS.",
    pt: "O diretório de Ambassadors está temporariamente indisponível. Tente novamente mais tarde ou contacte a equipa CRAYS.",
    it: "L’elenco degli Ambassadors è temporaneamente non disponibile. Riprova più tardi o contatta il team CRAYS.",
  }[locale];

  return (
    <ClubsPublicShell availableLocales={locales} headerTone="navy" locale={locale} footerCtaHref={root + "/this-your-kinda-crowd"} footerCtaLabel={copy.crowd}>
      <main className={`${tokens.theme} ${styles.page}`} data-ambassador-locale={locale}>
        <section className={styles.hero} aria-labelledby="ambassadors-title">
          <div className={styles.heroGrid}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>{copy.eyebrow}</p>
              <h1 id="ambassadors-title"><span>{copy.titleOne}</span><span>{copy.titleTwo}</span></h1>
              <p className={styles.heroDescription}>{copy.description}</p>
              <a className={styles.heroButton} href="#ambassador-directory">{copy.find} <ArrowRight aria-hidden="true" size={23} /></a>
              <a className={styles.howLink} href="https://www.crays.pro/" rel="noopener noreferrer" target="_blank">{copy.signIn}</a>
            </div>
            <div className={styles.heroCollage}>
              <div className={styles.heroPool}>
                <Image alt={copy.poolAlt} fill preload sizes="(max-width: 980px) 100vw, 51vw" src="/__crays-clubs/people/ambassadors-v1/directory-hero-rooftop-community.jpg" />
              </div>
              <CornerRightUp aria-hidden="true" className={styles.heroConnection} size={92} strokeWidth={1.3} />
              <div className={styles.heroConversation}>
                <Image alt={copy.coffeeAlt} fill sizes="(max-width: 980px) 65vw, 31vw" src="/__crays-clubs/people/ambassadors-v1/directory-hero-coffee-conversation.webp" />
              </div>
            </div>
          </div>
          <div className={styles.introductions} id="how-introductions-work">
            <ol><li><span>01</span>{copy.stepOne}</li><li><span>02</span>{copy.stepTwo}</li><li><span>03</span>{copy.stepThree}</li></ol>
            <p>{copy.review}</p>
          </div>
        </section>

        <section className={styles.directory} id="ambassador-directory" aria-label={copy.eyebrow}>
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>{copy.circle}</p>
            <h2>
              {copy.headingOne}<br />{copy.headingTwo}<br />{copy.headingThree}
            </h2>
          </div>

          {directoryUnavailable && (
            <div role="status" style={{ padding: "24px", marginBottom: "32px", border: "1px solid #ccd8df", borderRadius: "12px", background: "#edf4f7" }}>
              <p>{unavailableCopy}</p>
              <Link href={root + "/contact"}>CRAYS Contact <ArrowRight aria-hidden="true" size={18} /></Link>
            </div>
          )}
          <div className={styles.grid}>
            {ambassadors.map((ambassador, index) => {
              const cardCopy = { name: ambassador.name, role: ambassador.role, affiliation: ambassador.affiliation };

              return (
                <article className={styles.card} key={ambassador.slug}>
                  <Link
                    aria-label={copy.profile + ": " + cardCopy.name}
                    className={styles.monogramLink}
                    href={ambassador.canonicalPath}
                  >
                    <span className={styles.cardIndex}>
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {ambassador.media.url ? (
                      <img
                        alt={copy.portrait.replace("{name}", cardCopy.name)}
                        className={styles.portraitImage}
                        loading="lazy"
                        decoding="async"
                        fetchPriority="low"
                        sizes="(max-width: 680px) 100vw, (max-width: 980px) 50vw, 33vw"
                        src={`${ambassador.media.url}&w=640`}
                        srcSet={[320,480,640,960].map(width => `${ambassador.media.url}&w=${width} ${width}w`).join(", ")}
                        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: `${ambassador.media.focalPoint.x * 100}% ${(ambassador.media.height > ambassador.media.width * 1.25 ? 0 : ambassador.media.focalPoint.y * 100)}%` }}
                      />
                    ) : (
                      <span aria-hidden="true" className={styles.monogram}>
                        {initials(ambassador.name)}
                      </span>
                    )}
                    <span aria-hidden="true" className={styles.portraitShade} />
                    <span className={styles.monogramCaption}>
                      {copy.eyebrow}
                    </span>
                  </Link>

                  <div className={styles.cardBody}>
                    <div className={styles.cardIdentity}>
                      <p className={styles.cardRole}>{cardCopy.role === "founder" ? copy.founder : cardCopy.role === "cofounder" ? copy.cofounder : copy.ambassador}</p>
                      <p className={styles.cardAffiliation}>
                        {cardCopy.affiliation}
                      </p>
                    </div>
                    <h3>{cardCopy.name}</h3>
                    <div className={styles.cardActions}>
                      <Link
                        className={styles.profileLink}
                        href={ambassador.canonicalPath}
                      >
                        {copy.profile}
                        <ArrowRight aria-hidden="true" size={17} />
                      </Link>
                      {ambassador.linkedInUrl && <a
                        aria-label={copy.linkedIn.replace("{name}", cardCopy.name)}
                        className={styles.linkedinLink}
                        href={ambassador.linkedInUrl ?? undefined}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        <span
                          aria-hidden="true"
                          className={styles.linkedinBadge}
                        >
                          in
                        </span>
                      </a>}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className={styles.closing} aria-labelledby="direct-title">
          <div className={styles.closingInner}>
          <div className={styles.closingCopy}>
            <p className={styles.eyebrow}>{copy.prefer}</p>
            <h2 id="direct-title">{copy.closingOne}<br />{copy.closingTwo}</h2>
            <p className={styles.closingDescription}>{copy.closingDescription}</p>
            <div className={styles.closingActions}>
              <Link className={styles.directLink} href={locale === "en" ? root + "/apply-directly?returnTo=" + encodeURIComponent(root + "/account?view=membership") : root + "/become-a-member"}>{copy.apply} <ArrowRight aria-hidden="true" size={23} /></Link>
              <a className={styles.proLink} href="https://www.crays.pro" rel="noopener noreferrer" target="_blank">{copy.signIn}</a>
            </div>
            <p className={styles.closingNote}>{copy.review}</p>
          </div>
          <div className={styles.closingPhoto}>
            <Image alt={copy.closingAlt} fill sizes="(max-width: 980px) 100vw, 760px" src="/__crays-clubs/ambassador-editorial-v1/directory-closing-conversation.png" />
          </div>
          </div>
        </section>
      </main>
    </ClubsPublicShell>
  );
}
