import { JourneyShell } from "./journey-shell";
import {
  conferenceCopy,
  type ConferenceLocale,
} from "./conference-copy";
import styles from "./conference-page.module.css";

type ConferencePageProps = {
  locale: ConferenceLocale;
};

function MediaGate({
  slot,
  label,
  blocked,
  className = "",
}: {
  slot: string;
  label: string;
  blocked: string;
  className?: string;
}) {
  return (
    <figure
      className={`${styles.mediaGate} ${className}`}
      data-media-slot={slot}
      data-media-state="blocked"
      aria-label={`${label}. ${blocked}`}
    >
      <span aria-hidden="true">{slot}</span>
      <figcaption>{blocked}</figcaption>
    </figure>
  );
}

export function ConferencePage({ locale }: ConferencePageProps) {
  const c = conferenceCopy[locale];
  const contactHref = `/${locale}/contact`;

  return (
    <JourneyShell locale={locale} copy={c.shell}>
      <main id="main-content" className={styles.page}>
        <section className={styles.hero} aria-labelledby="conference-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>{c.hero.eyebrow}</p>
            <h1 id="conference-title">{c.hero.title}</h1>
            <p className={styles.heroLead}>{c.hero.lead}</p>
            <div className={styles.heroActions}>
              <a className={styles.primaryAction} href="#conference-interest">
                {c.hero.primary}<span aria-hidden="true">↓</span>
              </a>
              <a className={styles.secondaryAction} href="#conference-evidence">
                {c.hero.secondary}<span aria-hidden="true">↘</span>
              </a>
            </div>
            <ul className={styles.signalRail} aria-label={c.hero.eyebrow}>
              {c.hero.signals.map((signal) => <li key={signal}>{signal}</li>)}
            </ul>
            <p className={styles.boundary}>{c.hero.boundary}</p>
          </div>
          <div className={styles.heroCollage} aria-label={c.status.mediaBlocked}>
            <MediaGate slot="hero-stage" label="Conference stage role" blocked={c.status.mediaBlocked} className={styles.heroStage} />
            <MediaGate slot="hero-audience" label="Conference audience role" blocked={c.status.mediaBlocked} className={styles.heroAudience} />
            <MediaGate slot="hero-dialogue" label="Conference dialogue role" blocked={c.status.mediaBlocked} className={styles.heroDialogue} />
            <MediaGate slot="hero-detail" label="Conference detail role" blocked={c.status.mediaBlocked} className={styles.heroDetail} />
          </div>
        </section>

        <section id="conference-evidence" className={styles.archive} aria-labelledby="archive-title">
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrowBlue}>{c.archive.eyebrow}</p>
            <h2 id="archive-title">{c.archive.title}</h2>
            <p>{c.archive.lead}</p>
          </div>
          <div className={styles.archiveRail}>
            {c.archive.items.map((entry, index) => (
              <article key={entry.title}>
                <MediaGate
                  slot={`archive-edition-${index + 1}`}
                  label={c.archive.mediaLabel}
                  blocked={c.status.mediaBlocked}
                  className={styles.archiveMedia}
                />
                <div>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <h3>{entry.title}</h3>
                  <p>{entry.body}</p>
                  <strong>{entry.status}</strong>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.programme} aria-labelledby="programme-title">
          <div className={styles.programmeIntro}>
            <p className={styles.eyebrowLight}>{c.programme.eyebrow}</p>
            <h2 id="programme-title">{c.programme.title}</h2>
            <p>{c.programme.lead}</p>
            <strong>{c.programme.note}</strong>
          </div>
          <div className={styles.programmeBody}>
            <MediaGate slot="programme-overview" label={c.programme.title} blocked={c.status.mediaBlocked} className={styles.programmeMedia} />
            <ol className={styles.programmeLedger}>
              {c.programme.items.map((entry, index) => (
                <li key={entry.title}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <h3>{entry.title}</h3>
                    <p>{entry.body}</p>
                  </div>
                  <strong>{entry.status}</strong>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className={styles.speakers} aria-labelledby="speakers-title">
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrowBlue}>{c.speakers.eyebrow}</p>
            <h2 id="speakers-title">{c.speakers.title}</h2>
            <p>{c.speakers.lead}</p>
          </div>
          <p className={styles.speakerGate}>{c.speakers.gate}</p>
          <div className={styles.speakerMosaic}>
            {c.speakers.items.map((entry, index) => (
              <article key={entry.title}>
                <MediaGate
                  slot={`speaker-role-${String(index + 1).padStart(2, "0")}`}
                  label={entry.title}
                  blocked={c.status.mediaBlocked}
                  className={styles.speakerPortrait}
                />
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{entry.title}</h3>
                <p>{entry.body}</p>
                <strong>{c.status.notAnnounced}</strong>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.audience} aria-labelledby="audience-title">
          <div className={styles.audienceHeading}>
            <p className={styles.eyebrowLight}>{c.audience.eyebrow}</p>
            <h2 id="audience-title">{c.audience.title}</h2>
            <p>{c.audience.lead}</p>
          </div>
          <ol className={styles.audienceJourney}>
            {c.audience.items.map((entry, index) => (
              <li key={entry.title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{entry.title}</h3>
                <p>{entry.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.venue} aria-labelledby="venue-title">
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrowBlue}>{c.venue.eyebrow}</p>
            <h2 id="venue-title">{c.venue.title}</h2>
            <p>{c.venue.lead}</p>
          </div>
          <div className={styles.venueMosaic}>
            {c.venue.items.map((entry, index) => (
              <article key={entry.title}>
                {index < 4 && (
                  <MediaGate
                    slot={`venue-role-${index + 1}`}
                    label={entry.title}
                    blocked={c.status.mediaBlocked}
                    className={styles.venueMedia}
                  />
                )}
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{entry.title}</h3>
                <p>{entry.body}</p>
                <strong>{c.status.requiresEvidence}</strong>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.proof} aria-labelledby="proof-title">
          <div className={styles.proofCopy}>
            <p className={styles.eyebrowLight}>{c.proof.eyebrow}</p>
            <h2 id="proof-title">{c.proof.title}</h2>
            <p>{c.proof.lead}</p>
            <a href={`/${locale}/community-life`} className={styles.lightAction}>
              {c.proof.action}<span aria-hidden="true">↗</span>
            </a>
          </div>
          <div className={styles.proofGate}>
            <MediaGate slot="social-proof-record" label={c.proof.title} blocked={c.status.mediaBlocked} className={styles.proofMedia} />
            <p>{c.status.blocked}</p>
            <ol>
              {c.proof.requirements.map((requirement, index) => (
                <li key={requirement}><span>{String(index + 1).padStart(2, "0")}</span>{requirement}</li>
              ))}
            </ol>
          </div>
        </section>

        <section id="conference-interest" className={styles.interest} aria-labelledby="interest-title">
          <div className={styles.interestIntro}>
            <p className={styles.eyebrowBlue}>{c.interest.eyebrow}</p>
            <h2 id="interest-title">{c.interest.title}</h2>
            <p>{c.interest.lead}</p>
            <a href={contactHref} className={styles.textAction}>
              {c.interest.contact}<span aria-hidden="true">→</span>
            </a>
          </div>
          <form className={styles.interestForm} aria-describedby="interest-status">
            <fieldset disabled>
              <div className={styles.formGrid}>
                <label><span>{c.interest.fields.name}</span><input type="text" autoComplete="name" /></label>
                <label><span>{c.interest.fields.email}</span><input type="email" autoComplete="email" /></label>
                <label><span>{c.interest.fields.organisation}</span><input type="text" autoComplete="organization" /></label>
                <label><span>{c.interest.fields.role}</span><input type="text" /></label>
                <label className={styles.formWide}><span>{c.interest.fields.topic}</span><textarea rows={4} /></label>
                <label className={styles.formWide}><span>{c.interest.fields.access}</span><textarea rows={3} /></label>
                <label className={`${styles.formWide} ${styles.consent}`}>
                  <input type="checkbox" /><span>{c.interest.fields.consent}</span>
                </label>
              </div>
              <button type="submit">{c.interest.submit}</button>
            </fieldset>
            <p id="interest-status" role="status">{c.interest.unavailable}</p>
          </form>
        </section>

        <section className={styles.faq} aria-labelledby="faq-title">
          <div className={styles.faqHeading}>
            <p className={styles.eyebrowBlue}>{c.faq.eyebrow}</p>
            <h2 id="faq-title">{c.faq.title}</h2>
          </div>
          <div className={styles.faqList}>
            {c.faq.items.map((entry, index) => (
              <details key={entry.question}>
                <summary>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  {entry.question}
                  <i aria-hidden="true" />
                </summary>
                <p>{entry.answer}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
    </JourneyShell>
  );
}
