import type { CSSProperties } from "react";
import Link from "next/link";
import { ClubsPublicShell } from "./clubs-public-shell";
import {
  schoolJobsMedia,
  type SchoolJobsMediaKey,
} from "./school-jobs-public-media";
import {
  getSchoolJobsPublicContent,
  schoolJobsLocales,
  type SchoolJobsLocale,
} from "./school-jobs-public-copy";
import styles from "./school-jobs-public-page.module.css";

function Media({
  mediaKey,
  alt,
  caption,
  className = "",
}: {
  mediaKey: SchoolJobsMediaKey;
  alt: string;
  caption: string;
  className?: string;
}) {
  const record = schoolJobsMedia[mediaKey];
  const style = {
    "--school-media": "url('" + record.assetUrl + "')",
  } as CSSProperties;
  return (
    <figure className={[styles.media, className].filter(Boolean).join(" ")}>
      <div
        className={styles.mediaImage}
        style={style}
        role="img"
        aria-label={alt}
      />
      <figcaption>
        <span>{caption}</span>
        <span>
          {record.creator},{" "}
          <a href={record.sourceUrl} target="_blank" rel="noreferrer">
            {record.license}
          </a>
        </span>
      </figcaption>
    </figure>
  );
}

function Heading({
  kicker,
  title,
  lead,
  id,
}: {
  kicker: string;
  title: string;
  lead: string;
  id: string;
}) {
  return (
    <header className={styles.heading}>
      <p className={styles.kicker}>{kicker}</p>
      <div>
        <h2 id={id}>{title}</h2>
        <p>{lead}</p>
      </div>
    </header>
  );
}

export function SchoolJobsLegacyPage({ locale }: { locale: SchoolJobsLocale }) {
  const c = getSchoolJobsPublicContent(locale);
  const prefix = "/" + locale;

  return (
    <ClubsPublicShell
      availableLocales={schoolJobsLocales}
      headerTone="navy"
      locale={locale}
    >
      <main className={styles.page} id="school-jobs-main">
        <section className={styles.hero} aria-labelledby="school-jobs-title">
          <div className={styles.heroCopy}>
            <p className={styles.kicker}>{c.hero.eyebrow}</p>
            <h1 id="school-jobs-title">{c.hero.title}</h1>
            <p className={styles.heroLead}>{c.hero.lead}</p>
            <p className={styles.gate}>{c.hero.boundary}</p>
            <div className={styles.actions}>
              <a className={styles.primary} href="#four-step">
                {c.hero.primary}
              </a>
              <a className={styles.secondary} href="#states">
                {c.hero.secondary}
              </a>
            </div>
          </div>
          <div className={styles.heroVisual}>
            <Media
              mediaKey="heroWorkshop"
              alt={c.alts.heroWorkshop}
              caption={c.hero.caption}
              className={styles.heroMedia}
            />
            <aside className={styles.signal}>
              <span>01</span>
              <small>{c.hero.signalLabel}</small>
              <strong>{c.hero.signalValue}</strong>
            </aside>
          </div>
        </section>

        <nav className={styles.anchorNav} aria-label={c.navLabel}>
          {c.nav.map((item, index) => (
            <a href={item.href} key={item.href}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              {item.label}
            </a>
          ))}
        </nav>

        <section
          className={styles.section}
          id="four-step"
          aria-labelledby="four-title"
        >
          <Heading
            kicker={c.four.kicker}
            title={c.four.title}
            lead={c.four.lead}
            id="four-title"
          />
          <div className={styles.fourGrid}>
            <Media
              mediaKey="learningRoom"
              alt={c.alts.learningRoom}
              caption={c.four.caption}
              className={styles.fourMedia}
            />
            <ol className={styles.fourSteps}>
              {c.four.items.map((item, index) => (
                <li key={item.title}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.text}</p>
                    <strong>{item.gate}</strong>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section
          className={styles.darkSection}
          id="states"
          aria-labelledby="states-title"
        >
          <div className={styles.stickyGrid}>
            <header className={styles.sticky}>
              <p className={styles.kicker}>{c.states.kicker}</p>
              <h2 id="states-title">{c.states.title}</h2>
              <p>{c.states.lead}</p>
            </header>
            <ol className={styles.stateFlow}>
              {c.states.items.map((item, index) => (
                <li key={item.title}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section
          className={styles.section}
          id="evidence"
          aria-labelledby="evidence-title"
        >
          <Heading
            kicker={c.skills.kicker}
            title={c.skills.title}
            lead={c.skills.lead}
            id="evidence-title"
          />
          <div className={styles.evidenceLayout}>
            <Media
              mediaKey="skillsPractice"
              alt={c.alts.skillsPractice}
              caption={c.skills.caption}
              className={styles.evidenceMedia}
            />
            <ol className={styles.evidenceList}>
              {c.skills.items.map((item, index) => (
                <li key={item.title}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </li>
              ))}
            </ol>
          </div>
          <p className={styles.evidenceBoundary}>{c.skills.boundary}</p>
        </section>

        <section
          className={styles.blueSection}
          id="programmes"
          aria-labelledby="programmes-title"
        >
          <div className={styles.programmeGrid}>
            <div>
              <p className={styles.kicker}>{c.programme.kicker}</p>
              <h2 id="programmes-title">{c.programme.title}</h2>
              <p className={styles.sectionLead}>{c.programme.lead}</p>
              <p className={styles.gate}>{c.programme.gate}</p>
            </div>
            <Media
              mediaKey="programmeWorkshop"
              alt={c.alts.programmeWorkshop}
              caption={c.programme.caption}
              className={styles.programmeMedia}
            />
          </div>
          <ol className={styles.requirements}>
            {c.programme.requirements.map((item, index) => (
              <li key={item.title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.section} aria-labelledby="assessment-title">
          <div className={styles.assessmentGrid}>
            <Media
              mediaKey="assessmentStudio"
              alt={c.alts.assessmentStudio}
              caption={c.assessment.caption}
              className={styles.assessmentMedia}
            />
            <div className={styles.assessmentCopy}>
              <p className={styles.kicker}>{c.assessment.kicker}</p>
              <h2 id="assessment-title">{c.assessment.title}</h2>
              <p>{c.assessment.text}</p>
              <ol>
                {c.assessment.items.map((item, index) => (
                  <li key={item.title}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <h3>{item.title}</h3>
                      <p>{item.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section
          className={styles.navySection}
          id="employers"
          aria-labelledby="employers-title"
        >
          <div className={styles.employerGrid}>
            <div>
              <p className={styles.kicker}>{c.employer.kicker}</p>
              <h2 id="employers-title">{c.employer.title}</h2>
              <p className={styles.sectionLead}>{c.employer.lead}</p>
              <ol className={styles.employerList}>
                {c.employer.items.map((item, index) => (
                  <li key={item.title}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <h3>{item.title}</h3>
                      <p>{item.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <Media
              mediaKey="employerExchange"
              alt={c.alts.employerExchange}
              caption={c.employer.caption}
              className={styles.employerMedia}
            />
          </div>
        </section>

        <section className={styles.section} aria-labelledby="roles-title">
          <Heading
            kicker={c.roles.kicker}
            title={c.roles.title}
            lead={c.roles.lead}
            id="roles-title"
          />
          <div className={styles.roleSurface}>
            <div className={styles.roleColumns}>
              {c.roles.columns.map((column) => (
                <strong key={column}>{column}</strong>
              ))}
            </div>
            <div className={styles.emptyRoles}>
              <span aria-hidden="true">00</span>
              <div>
                <h3>{c.roles.emptyTitle}</h3>
                <p>{c.roles.emptyText}</p>
              </div>
            </div>
            <p className={styles.roleGate}>{c.roles.gate}</p>
          </div>
        </section>

        <section className={styles.interest} aria-labelledby="interest-title">
          <div>
            <p className={styles.kicker}>{c.interest.kicker}</p>
            <h2 id="interest-title">{c.interest.title}</h2>
          </div>
          <div>
            <p>{c.interest.lead}</p>
            <div className={styles.actions}>
              <button type="button" disabled>
                {c.interest.disabled}
              </button>
              <Link className={styles.primary} href={prefix + "/contact"}>
                {c.interest.contact}
              </Link>
              <Link
                className={styles.textLink}
                href={prefix + "/become-a-member"}
              >
                {c.interest.membership}
              </Link>
            </div>
          </div>
        </section>

        <section
          className={styles.section}
          id="questions"
          aria-labelledby="faq-title"
        >
          <div className={styles.faqGrid}>
            <header className={styles.sticky}>
              <p className={styles.kicker}>{c.faq.kicker}</p>
              <h2 id="faq-title">{c.faq.title}</h2>
              <p>{c.faq.lead}</p>
            </header>
            <div className={styles.faqs}>
              {c.faq.items.map((item, index) => {
                const id = "school-jobs-faq-" + (index + 1);
                return (
                  <details id={id} key={item.question}>
                    <summary>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      {item.question}
                    </summary>
                    <div>
                      <p>{item.answer}</p>
                      <a href={"#" + id}>{c.faq.permalink}</a>
                    </div>
                  </details>
                );
              })}
            </div>
          </div>
        </section>

        <section className={styles.closing} aria-labelledby="closing-title">
          <div>
            <p className={styles.kicker}>{c.closing.kicker}</p>
            <h2 id="closing-title">{c.closing.title}</h2>
          </div>
          <div>
            <p>{c.closing.text}</p>
            <div className={styles.actions}>
              <Link className={styles.primary} href={prefix + "/contact"}>
                {c.closing.primary}
              </Link>
              <Link className={styles.secondary} href={prefix}>
                {c.closing.secondary}
              </Link>
            </div>
          </div>
        </section>
      </main>
    </ClubsPublicShell>
  );
}
