import { ArrowDown, ArrowRight, Check, Minus } from "lucide-react";
import { InstitutionalClubsShell } from "./institutional-clubs-shell";
import { clubsHref, portfolioCompaniesCopy, type ClubsLocale } from "./portfolio-companies-content";
import styles from "./portfolio-companies-page.module.css";

type Props = { locale: ClubsLocale };

export function PortfolioCompaniesPage({ locale }: Props) {
  const copy = portfolioCompaniesCopy[locale];

  return (
    <InstitutionalClubsShell locale={locale}>
      <main id="portfolio-main" className={styles.main}>
        <section className={styles.hero} aria-labelledby="portfolio-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>{copy.hero.eyebrow}</p>
            <h1 id="portfolio-title">{copy.hero.title}</h1>
            <p className={styles.heroLead}>{copy.hero.lead}</p>
            <div className={styles.heroActions}>
              <a className={styles.primaryAction} href={clubsHref(locale, "/contact")}>
                <span>{copy.hero.primary}</span>
                <ArrowRight aria-hidden="true" size={20} strokeWidth={1.7} />
              </a>
              <a className={styles.secondaryAction} href="#working-residency">
                <span>{copy.hero.secondary}</span>
                <ArrowDown aria-hidden="true" size={19} strokeWidth={1.7} />
              </a>
            </div>
          </div>

          <div className={styles.heroField} aria-hidden="true">
            <span className={styles.fieldAxisX} />
            <span className={styles.fieldAxisY} />
            <span className={styles.fieldOrbitOuter} />
            <span className={styles.fieldOrbitInner} />
            <span className={styles.fieldPulse} />
            {copy.hero.field.map((label, index) => (
              <span key={label} className={styles["fieldLabel" + (index + 1)]}>{label}</span>
            ))}
          </div>

          <div className={styles.heroState}>
            <strong>{copy.hero.stateLabel}</strong>
            <span>{copy.hero.state}</span>
          </div>
        </section>

        <section className={styles.truth} aria-labelledby="truth-title">
          <span className={styles.sectionNumber} aria-hidden="true">01</span>
          <div>
            <p className={styles.eyebrowInk}>{copy.truth.eyebrow}</p>
            <h2 id="truth-title">{copy.truth.title}</h2>
          </div>
          <div className={styles.truthBody}>
            {copy.truth.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            <strong>{copy.truth.line}</strong>
          </div>
        </section>

        <section id="working-residency" className={styles.residency} aria-labelledby="residency-title">
          <div className={styles.blueIntro}>
            <span className={styles.sectionNumberLight} aria-hidden="true">02</span>
            <div>
              <p className={styles.eyebrow}>{copy.residency.eyebrow}</p>
              <h2 id="residency-title">{copy.residency.title}</h2>
              <p>{copy.residency.lead}</p>
            </div>
          </div>
          <ol className={styles.residencyLine}>
            {copy.residency.steps.map((step) => (
              <li key={step.number}>
                <span aria-hidden="true">{step.number}</span>
                <div><h3>{step.title}</h3><p>{step.body}</p></div>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.context} aria-labelledby="context-title">
          <div className={styles.contextIntro}>
            <span className={styles.sectionNumber} aria-hidden="true">03</span>
            <p className={styles.eyebrowInk}>{copy.context.eyebrow}</p>
            <h2 id="context-title">{copy.context.title}</h2>
            <p>{copy.context.lead}</p>
          </div>
          <div className={styles.contextLines}>
            {copy.context.items.map((item, index) => (
              <article key={item.title}>
                <span aria-hidden="true">0{index + 1}</span>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.fit} aria-labelledby="fit-title">
          <div className={styles.fitIntro}>
            <span className={styles.sectionNumberLight} aria-hidden="true">04</span>
            <p className={styles.eyebrow}>{copy.fit.eyebrow}</p>
            <h2 id="fit-title">{copy.fit.title}</h2>
            <p>{copy.fit.lead}</p>
          </div>
          <div className={styles.fitLists}>
            <div>
              <h3>{copy.fit.yes}</h3>
              <ul>{copy.fit.positive.map((item) => <li key={item}><Check aria-hidden="true" size={18} strokeWidth={1.7} /><span>{item}</span></li>)}</ul>
            </div>
            <div>
              <h3>{copy.fit.no}</h3>
              <ul>{copy.fit.negative.map((item) => <li key={item}><Minus aria-hidden="true" size={18} strokeWidth={1.7} /><span>{item}</span></li>)}</ul>
            </div>
          </div>
        </section>

        <section className={styles.journey} aria-labelledby="journey-title">
          <div className={styles.journeyIntro}>
            <span className={styles.sectionNumber} aria-hidden="true">05</span>
            <p className={styles.eyebrowInk}>{copy.journey.eyebrow}</p>
            <h2 id="journey-title">{copy.journey.title}</h2>
            <p>{copy.journey.lead}</p>
          </div>
          <ol className={styles.journeySteps}>
            {copy.journey.steps.map((step) => (
              <li key={step.number}>
                <span>{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
          <p className={styles.journeyNote}>{copy.journey.note}</p>
        </section>

        <section className={styles.boundaries} aria-labelledby="boundaries-title">
          <div className={styles.boundariesIntro}>
            <span className={styles.sectionNumberLight} aria-hidden="true">06</span>
            <p className={styles.eyebrow}>{copy.boundaries.eyebrow}</p>
            <h2 id="boundaries-title">{copy.boundaries.title}</h2>
            <p>{copy.boundaries.lead}</p>
          </div>
          <ol>
            {copy.boundaries.items.map((item, index) => (
              <li key={item}><span aria-hidden="true">0{index + 1}</span><p>{item}</p></li>
            ))}
          </ol>
        </section>

        <section className={styles.faq} aria-labelledby="faq-title">
          <div>
            <p className={styles.eyebrowInk}>{copy.faq.eyebrow}</p>
            <h2 id="faq-title">{copy.faq.title}</h2>
          </div>
          <div className={styles.faqList}>
            {copy.faq.items.map((item) => (
              <details key={item.question}>
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className={styles.closing} aria-labelledby="closing-title">
          <p className={styles.eyebrow}>{copy.closing.eyebrow}</p>
          <h2 id="closing-title">{copy.closing.title}</h2>
          <p>{copy.closing.body}</p>
          <div>
            <a className={styles.primaryAction} href={clubsHref(locale, "/contact")}>
              <span>{copy.closing.primary}</span>
              <ArrowRight aria-hidden="true" size={20} strokeWidth={1.7} />
            </a>
            <a className={styles.secondaryAction} href={clubsHref(locale) + "/#forest-city"}>
              <span>{copy.closing.secondary}</span>
              <ArrowRight aria-hidden="true" size={19} strokeWidth={1.7} />
            </a>
          </div>
        </section>
      </main>
    </InstitutionalClubsShell>
  );
}
