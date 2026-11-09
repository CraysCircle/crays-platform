import { JourneyShell } from "./journey-shell";
import {
  becomeMemberCopy,
  type BecomeMemberLocale,
} from "./become-a-member-copy";
import {
  CLUBS_AMBASSADOR_INTERESTS,
} from "@/lib/clubs/public-ambassador-application";
import { getClubsAmbassadorApplyCopy } from "@/lib/clubs/public-ambassador-copy";
import styles from "./become-a-member-page.module.css";

type Props = { locale: BecomeMemberLocale };

const applicationStates = [
  {
    title: "Direct application",
    body: "This route presents the direct CRAYS membership application. The current source implementation does not transmit or persist it."
  },
  {
    title: "Referral source",
    body: "This direct route records no Ambassador attribution. Ambassador referrals belong only to an approved vanity-slug apply route with an auditable source."
  },
  {
    title: "Ambassador prequalification",
    body: "An Ambassador may prequalify only a referred application. Prequalification is not a CRAYS decision, invitation or admission."
  },
  {
    title: "CRAYS team review",
    body: "Only the CRAYS team can review a submitted application after an authorized internal submission contract exists."
  },
  {
    title: "Final decision",
    body: "The final membership decision always belongs to the CRAYS team. No page, Ambassador, form preview or payment can make that decision."
  },
  {
    title: "Invitation and admission",
    body: "Invitation and admission are later, separate states and are not created by completing or viewing this application UI."
  },
  {
    title: "Booking and payment",
    body: "Booking and payment remain separate from application, referral, prequalification, review and final decision."
  }
] as const;

const arrivals = [
  ["2026-09-01", "September 1, 2026"],
  ["2026-10-01", "October 1, 2026"],
  ["2026-11-01", "November 1, 2026"],
  ["2026-12-01", "December 1, 2026"],
  ["2027-01-01", "January 1, 2027"],
  ["2027-02-01", "February 1, 2027"],
  ["2027-03-01", "March 1, 2027"],
  ["2027-04-01", "April 1, 2027"],
  ["2027-05-01", "May 1, 2027"],
  ["2027-06-01", "June 1, 2027"],
  ["2027-07-01", "July 1, 2027"],
  ["2027-08-01", "August 1, 2027"]
] as const;

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

export function BecomeAMemberPage({ locale }: Props) {
  const c = becomeMemberCopy[locale];
  const formCopy = getClubsAmbassadorApplyCopy(locale);

  return (
    <JourneyShell locale={locale} copy={c.shell}>
      <main id="main-content" className={styles.page}>
        <section className={styles.hero} aria-labelledby="member-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrowPink}>{c.pageLabel}</p>
            <h1 id="member-title">{c.hero.title}</h1>
            <p className={styles.heroLead}>{c.hero.body}</p>
            <div className={styles.heroActions}>
              <a className={styles.primaryAction} href="#membership-application">
                {c.hero.primary}<span aria-hidden="true">↓</span>
              </a>
              <a className={styles.secondaryAction} href="#membership-layers">
                {c.hero.secondary}<span aria-hidden="true">↘</span>
              </a>
            </div>
            <ul className={styles.signalRail}>
              {c.hero.signals.map((signal) => <li key={signal}>{signal}</li>)}
            </ul>
          </div>
          <div className={styles.heroCollage} aria-label={c.mediaBlocked}>
            <MediaGate slot="hero-living" label="Flexible Living" blocked={c.mediaBlocked} className={styles.heroTall} />
            <MediaGate slot="hero-club" label="Club Access" blocked={c.mediaBlocked} className={styles.heroWide} />
            <MediaGate slot="hero-business" label="Business Teams" blocked={c.mediaBlocked} className={styles.heroSquare} />
            <MediaGate slot="hero-creators" label="Creator Partners" blocked={c.mediaBlocked} className={styles.heroSmall} />
          </div>
        </section>

        <section className={styles.applicationJourney} aria-labelledby="application-journey-title">
          <div className={styles.applicationJourneyHeading}>
            <p className={styles.eyebrowLight}>APPLICATION GOVERNANCE</p>
            <h2 id="application-journey-title">One form. Separate decisions.</h2>
            <p>Application is open as a route. Submission remains technically gated until an authorized CRAYS internal contract is demonstrably present.</p>
          </div>
          <ol className={styles.applicationStates}>
            {applicationStates.map((state, index) => (
              <li key={state.title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{state.title}</h3>
                <p>{state.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="membership-application" className={styles.application} aria-labelledby="application-title">
          <div className={styles.applicationIntro}>
            <p className={styles.eyebrowBlue}>DIRECT MEMBERSHIP APPLICATION</p>
            <h2 id="application-title">{formCopy.formTitle}</h2>
            <p>Complete application interface using the same requested information as the Ambassador-referral form. This route has no Ambassador referral or prequalification attribution.</p>
            <div className={styles.sourceLedger} aria-label="Application source status">
              <span>source</span><strong>direct_public_membership</strong>
              <span>ambassador_referral</span><strong>none</strong>
              <span>prequalification</span><strong>not_applicable</strong>
              <span>submission</span><strong>pending_authorized_backend</strong>
            </div>
          </div>

          <form className={styles.applicationForm} aria-describedby="application-gate">
            <fieldset disabled>
              <fieldset className={styles.segmentField}>
                <legend>Who is applying? *</legend>
                <div className={styles.segments}>
                  <label><input type="radio" name="applicantType" value="individual" /><span>Individual</span></label>
                  <label><input type="radio" name="applicantType" value="family" /><span>Couple or family</span></label>
                  <label><input type="radio" name="applicantType" value="team" /><span>Team</span></label>
                </div>
              </fieldset>

              <div className={styles.twoColumns}>
                <label className={styles.field}>
                  <span>{formCopy.email} *</span>
                  <input type="email" placeholder="you@example.com" maxLength={254} autoComplete="email" />
                </label>
                <label className={styles.field}>
                  <span>{formCopy.fullName} *</span>
                  <input type="text" placeholder={formCopy.fullName} maxLength={120} autoComplete="name" />
                </label>
              </div>

              <div className={styles.twoColumns}>
                <label className={styles.field}>
                  <span>{formCopy.basedIn}</span>
                  <input type="text" placeholder="City, country" maxLength={120} autoComplete="country-name" />
                </label>
                <label className={styles.field}>
                  <span>{formCopy.interest} *</span>
                  <select defaultValue="">
                    <option value="">Select...</option>
                    {CLUBS_AMBASSADOR_INTERESTS.map((interest) => (
                      <option key={interest} value={interest}>{formCopy.interests[interest]}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label className={styles.field}>
                <span>When could you come to Forest City? *</span>
                <select defaultValue="">
                  <option value="">Select...</option>
                  {arrivals.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>

              <fieldset className={styles.segmentField}>
                <legend>How long would you like to stay? *</legend>
                <div className={styles.segments}>
                  <label><input type="radio" name="stayLength" value="month" /><span>Visit for a month</span></label>
                  <label><input type="radio" name="stayLength" value="year" /><span>Join for a year</span></label>
                </div>
              </fieldset>

              <div className={styles.socialGroup}>
                <p>Link your professional and social profiles.</p>
                <input type="url" placeholder="LinkedIn profile" />
                <input type="url" placeholder="Instagram, X or another social profile" />
                <input type="url" placeholder={formCopy.profileUrl} />
              </div>

              <label className={styles.field}>
                <span>{formCopy.motivation} *</span>
                <textarea minLength={80} maxLength={1500} rows={7} placeholder="Please write in your own words. Tell us what shaped you and why CRAYS matters to your next chapter." />
                <small>0/1500</small>
              </label>

              <label className={styles.field}>
                <span>{formCopy.contribution} *</span>
                <textarea minLength={80} maxLength={1500} rows={6} placeholder="Skills, projects, sessions, connections or energy you would bring to the community." />
                <small>0/1500</small>
              </label>

              <label className={styles.consent}>
                <input type="checkbox" />
                <span>{formCopy.consent}</span>
              </label>

              <div className={styles.previewBoundary}>
                <strong>BACKEND GATE</strong>
                <span>Nothing is sent or saved. PREVIEW_NOT_PERSISTED</span>
              </div>

              <button className={styles.submit} type="button" disabled>
                {formCopy.submit}<span aria-hidden="true">→</span>
              </button>
            </fieldset>
            <p id="application-gate" className={styles.applicationGate} role="status">
              Live submission remains disabled until CRAYS authorizes controller, privacy notice, secure persistence, retention, internal endpoint, response responsibility and final-decision workflow.
            </p>
          </form>
        </section>

        <section className={styles.idea} aria-labelledby="idea-title">
          <div className={styles.ideaHeading}>
            <p className={styles.eyebrowBlue}>01</p>
            <h2 id="idea-title">{c.idea.title}</h2>
            <strong>{c.idea.lead}</strong>
          </div>
          <div className={styles.ideaBody}>
            <MediaGate slot="idea-movement" label={c.idea.title} blocked={c.mediaBlocked} className={styles.ideaMedia} />
            <div>{c.idea.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
          </div>
        </section>

        <section className={styles.access} aria-labelledby="access-title">
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrowLight}>02</p>
            <h2 id="access-title">{c.access.title}</h2>
            <p>{c.access.lead}</p>
          </div>
          <div className={styles.accessComposition}>
            <MediaGate slot="access-living" label={c.access.items[0].title} blocked={c.mediaBlocked} className={styles.accessMediaPrimary} />
            <div className={styles.accessItems}>
              {c.access.items.map((entry) => (
                <article key={entry.title}><span>{entry.label}</span><h3>{entry.title}</h3><p>{entry.body}</p></article>
              ))}
            </div>
            <MediaGate slot="access-circle" label={c.access.lead} blocked={c.mediaBlocked} className={styles.accessMediaSecondary} />
          </div>
        </section>

        <section className={styles.living} aria-labelledby="living-title">
          <div className={styles.sectionHeadingDark}>
            <p className={styles.eyebrowBlue}>03</p>
            <h2 id="living-title">{c.living.title}</h2>
            <div><strong>{c.living.lead}</strong><p>{c.living.body}</p></div>
          </div>
          <div className={styles.livingMosaic}>
            <MediaGate slot="living-remote-work" label={c.living.items[0].title} blocked={c.mediaBlocked} className={styles.livingMediaTall} />
            <MediaGate slot="living-home" label={c.living.items[1].title} blocked={c.mediaBlocked} className={styles.livingMediaWide} />
            <div className={styles.livingItems}>
              {c.living.items.map((entry, index) => (
                <article key={entry.title}><span>{entry.label}</span><b>{String(index + 1).padStart(2, "0")}</b><h3>{entry.title}</h3><p>{entry.body}</p></article>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.companies} aria-labelledby="companies-title">
          <div className={styles.companiesHeading}>
            <p className={styles.eyebrowLight}>04</p>
            <h2 id="companies-title">{c.companies.title}</h2>
            <strong>{c.companies.lead}</strong>
            <p>{c.companies.body}</p>
          </div>
          <div className={styles.companiesBody}>
            <div className={styles.companiesMedia}>
              <MediaGate slot="companies-team" label={c.companies.title} blocked={c.mediaBlocked} />
              <MediaGate slot="companies-work" label={c.companies.lead} blocked={c.mediaBlocked} />
            </div>
            <div>
              <ol className={styles.companiesItems}>
                {c.companies.items.map((entry, index) => (
                  <li key={entry.title}><span>{String(index + 1).padStart(2, "0")}</span><h3>{entry.title}</h3><p>{entry.body}</p></li>
                ))}
              </ol>
              <p className={styles.sectionClose}>{c.companies.close}</p>
            </div>
          </div>
        </section>

        <section className={styles.responsible} aria-labelledby="responsible-title">
          <div className={styles.responsibleIntro}>
            <p className={styles.eyebrowBlue}>05</p>
            <h2 id="responsible-title">{c.responsible.title}</h2>
            <strong>{c.responsible.lead}</strong>
            <p>{c.responsible.body}</p>
          </div>
          <div className={styles.responsibleBody}>
            <MediaGate slot="responsible-materials" label={c.responsible.points[0]} blocked={c.mediaBlocked} className={styles.responsibleMediaLarge} />
            <ol>{c.responsible.points.map((point, index) => <li key={point}><span>{String(index + 1).padStart(2, "0")}</span>{point}</li>)}</ol>
            <MediaGate slot="responsible-community" label={c.responsible.points[2]} blocked={c.mediaBlocked} className={styles.responsibleMediaSmall} />
          </div>
        </section>

        <section className={styles.creators} aria-labelledby="creators-title">
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrowLight}>06</p>
            <h2 id="creators-title">{c.creators.title}</h2>
            <div><strong>{c.creators.lead}</strong><p>{c.creators.body}</p></div>
          </div>
          <div className={styles.creatorComposition}>
            <MediaGate slot="creator-story" label={c.creators.title} blocked={c.mediaBlocked} className={styles.creatorMediaLarge} />
            <div className={styles.creatorItems}>
              {c.creators.items.map((entry, index) => (
                <article key={entry.title}><span>{String(index + 1).padStart(2, "0")}</span><h3>{entry.title}</h3><p>{entry.body}</p></article>
              ))}
            </div>
            <MediaGate slot="creator-community" label={c.creators.close} blocked={c.mediaBlocked} className={styles.creatorMediaSmall} />
          </div>
          <p className={styles.creatorClose}>{c.creators.close}</p>
        </section>

        <section id="membership-layers" className={styles.layers} aria-labelledby="layers-title">
          <div className={styles.layersHeading}>
            <p className={styles.eyebrowBlue}>07</p>
            <h2 id="layers-title">{c.layers.title}</h2>
            <strong>{c.layers.lead}</strong>
            <p>{c.layers.body}</p>
          </div>
          <p className={styles.legacyBoundary}>
            Existing informational structure. Listed layers, prices and benefits do not guarantee acceptance, admission, availability, booking or payment completion.
          </p>
          <div className={styles.layerRail}>
            {c.layers.items.map((entry, index) => (
              <article key={entry.title}>
                <MediaGate slot={["layer-fashion", "layer-sphere", "layer-falcon"][index]} label={entry.title} blocked={c.mediaBlocked} className={styles.layerMedia} />
                <span>{String(index + 1).padStart(2, "0")}</span><h3>{entry.title}</h3><strong>{entry.price}</strong><p>{entry.body}</p>
              </article>
            ))}
          </div>
          <p className={styles.layersClose}>{c.layers.close}</p>
          <ul className={styles.layerSignals}>{c.layers.signals.map((signal) => <li key={signal}>{signal}</li>)}</ul>
        </section>

        <section className={styles.closing} aria-labelledby="closing-title">
          <MediaGate slot="closing-circle" label={c.closing.title} blocked={c.mediaBlocked} className={styles.closingMedia} />
          <div className={styles.closingCopy}>
            <p className={styles.eyebrowPink}>{c.closing.title}</p>
            <h2 id="closing-title">{c.closing.lead}</h2>
            <p>{c.closing.body}</p>
            <a className={styles.primaryAction} href="#membership-application">{c.closing.action}<span aria-hidden="true">↑</span></a>
          </div>
        </section>
      </main>
    </JourneyShell>
  );
}
