import Link from "next/link";

import { JourneyShell } from "@/components/crays-clubs/journeys-phase8/journey-shell";
import { teamsShellCopy } from "@/components/crays-clubs/public/clubs-teams-copy";

import { eventsCopy, type EventsLocale } from "./events-copy";
import { eventsMedia, type EventsMediaKey } from "./events-media";
import styles from "./events-page.module.css";

type EventsPageProps = {
  locale: EventsLocale;
};

function MediaFigure({
  assetKey,
  className,
  disclosure,
}: {
  assetKey: EventsMediaKey;
  className: string;
  disclosure: string;
}) {
  const asset = eventsMedia[assetKey];

  return (
    <figure className={className}>
      <img
        src={asset.src}
        alt={asset.alt}
        loading={assetKey === "audienceKeynote" ? "eager" : "lazy"}
        decoding="async"
        referrerPolicy="no-referrer"
      />
      <figcaption>
        <span>{disclosure}</span>
        <a href={asset.sourcePage} target="_blank" rel="noreferrer">
          {asset.creator} · {asset.license}
        </a>
      </figcaption>
    </figure>
  );
}

export function EventsPage({ locale }: EventsPageProps) {
  const copy = eventsCopy[locale];
  const contactHref = "/" + locale + "/contact";

  const formatMedia: EventsMediaKey[] = [
    "editathon",
    "tamilWorkshop",
    "sharedDinner",
    "fitnessClass",
  ];

  return (
    <JourneyShell
      locale={locale}
      copy={{ ...teamsShellCopy[locale], skip: copy.pageLabel }}
    >
      <main className={styles.page} id="events-main">
        <section className={styles.hero} aria-labelledby="events-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrowPink}>{copy.hero.eyebrow}</p>
            <h1 id="events-title">{copy.hero.title}</h1>
            <p className={styles.heroLead}>{copy.hero.lead}</p>
            <div className={styles.heroActions}>
              <a className={styles.primaryAction} href="#discover">
                {copy.hero.primary}
              </a>
              <Link className={styles.secondaryAction} href={contactHref}>
                {copy.hero.secondary}
              </Link>
            </div>
            <p className={styles.truthBoundary}>{copy.hero.boundary}</p>
          </div>

          <div
            className={styles.heroCollage}
            aria-label="Licensed event atmosphere"
          >
            <MediaFigure
              assetKey="audienceKeynote"
              className={styles.heroPrimary}
              disclosure={copy.mediaDisclosure}
            />
            <MediaFigure
              assetKey="wikimaniaAudience"
              className={styles.heroTall}
              disclosure={copy.mediaDisclosure}
            />
            <MediaFigure
              assetKey="futureCommonsWorkshop"
              className={styles.heroSmall}
              disclosure={copy.mediaDisclosure}
            />
          </div>
        </section>

        <section
          className={styles.discovery}
          id="discover"
          aria-labelledby="discover-title"
        >
          <header className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrowBlue}>{copy.discover.eyebrow}</p>
              <h2 id="discover-title">{copy.discover.title}</h2>
            </div>
            <p>{copy.discover.body}</p>
          </header>

          <div className={styles.discoveryBoard}>
            <div
              className={styles.toolbar}
              aria-label={copy.discover.filterTitle}
            >
              <label className={styles.search}>
                <span>{copy.discover.searchLabel}</span>
                <input
                  type="search"
                  placeholder={copy.discover.searchPlaceholder}
                  disabled
                  aria-describedby="event-data-gate"
                />
              </label>

              <div className={styles.filterGroup}>
                <span>{copy.discover.statusLabel}</span>
                <div>
                  {copy.discover.statusItems.map((item) => (
                    <button key={item} type="button" disabled>
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.filterGroup}>
                <span>{copy.discover.typeLabel}</span>
                <div>
                  {copy.discover.typeItems.map((item) => (
                    <button key={item} type="button" disabled>
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.filterGroup}>
                <span>{copy.discover.audienceLabel}</span>
                <div>
                  {copy.discover.audienceItems.map((item) => (
                    <button key={item} type="button" disabled>
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <button className={styles.createButton} type="button" disabled>
                {copy.discover.createEvent}
              </button>
            </div>

            <div className={styles.calendar}>
              <div className={styles.calendarHeader}>
                <button
                  type="button"
                  disabled
                  aria-label={copy.discover.previous}
                >
                  ←
                </button>
                <h3>{copy.discover.calendarTitle}</h3>
                <button type="button" disabled aria-label={copy.discover.next}>
                  →
                </button>
              </div>
              <div className={styles.weekdays} aria-hidden="true">
                {copy.discover.weekdays.map((day) => (
                  <span key={day}>{day}</span>
                ))}
              </div>
              <div className={styles.emptyCalendar} id="event-data-gate">
                <span aria-hidden="true">00</span>
                <div>
                  <h3>{copy.discover.noDatesTitle}</h3>
                  <p>{copy.discover.noDatesBody}</p>
                </div>
              </div>
            </div>

            <aside className={styles.timeline} aria-labelledby="timeline-title">
              <div className={styles.timelineTabs}>
                <button type="button" disabled>
                  {copy.discover.allEvents}
                </button>
                <button type="button" disabled>
                  {copy.discover.myEvents}
                </button>
              </div>
              <div className={styles.timelineLine} aria-hidden="true" />
              <div className={styles.timelineEmpty}>
                <p className={styles.eyebrowLight}>
                  {copy.discover.timelineTitle}
                </p>
                <h3 id="timeline-title">{copy.discover.noDatesTitle}</h3>
                <p>{copy.discover.timelineBody}</p>
              </div>
            </aside>
          </div>
        </section>

        <section className={styles.formats} aria-labelledby="formats-title">
          <header className={styles.formatsIntro}>
            <p className={styles.eyebrowPink}>{copy.formats.eyebrow}</p>
            <h2 id="formats-title">{copy.formats.title}</h2>
            <p>{copy.formats.body}</p>
          </header>

          <div className={styles.formatSequence}>
            {copy.formats.items.map((item, index) => (
              <article className={styles.formatStory} key={item.title}>
                <MediaFigure
                  assetKey={formatMedia[index]}
                  className={styles.formatMedia}
                  disclosure={copy.mediaDisclosure}
                />
                <div>
                  <span aria-hidden="true">0{index + 1}</span>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.journey} aria-labelledby="journey-title">
          <header className={styles.sectionHeadingDark}>
            <div>
              <p className={styles.eyebrowLight}>{copy.journey.eyebrow}</p>
              <h2 id="journey-title">{copy.journey.title}</h2>
            </div>
            <p>{copy.journey.body}</p>
          </header>

          <ol className={styles.journeySteps}>
            {copy.journey.steps.map((step) => (
              <li key={step.label}>
                <span>{step.label}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.detail} aria-labelledby="detail-title">
          <div className={styles.detailCopy}>
            <p className={styles.eyebrowBlue}>{copy.detail.eyebrow}</p>
            <h2 id="detail-title">{copy.detail.title}</h2>
            <p>{copy.detail.body}</p>
          </div>

          <div
            className={styles.detailPanel}
            aria-label={copy.detail.panelTitle}
          >
            <header>
              <div>
                <span>{copy.detail.panelTitle}</span>
                <h3>{copy.detail.panelState}</h3>
              </div>
              <span className={styles.pendingBadge}>Pending</span>
            </header>
            <dl>
              {copy.detail.rows.map((row) => (
                <div key={row.label}>
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
            <div className={styles.detailActions}>
              {copy.detail.actions.map((action) => (
                <button key={action} type="button" disabled>
                  {action}
                </button>
              ))}
            </div>
            <p className={styles.panelGate}>{copy.detail.gate}</p>
          </div>
        </section>

        <section className={styles.access} aria-labelledby="access-title">
          <header className={styles.accessIntro}>
            <p className={styles.eyebrowPink}>{copy.access.eyebrow}</p>
            <h2 id="access-title">{copy.access.title}</h2>
            <p>{copy.access.body}</p>
          </header>
          <div className={styles.accessRail}>
            {copy.access.points.map((point, index) => (
              <article key={point.title}>
                <span aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3>{point.title}</h3>
                  <p>{point.body}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.host} aria-labelledby="host-title">
          <MediaFigure
            assetKey="outdoorDays"
            className={styles.hostMedia}
            disclosure={copy.mediaDisclosure}
          />
          <div className={styles.hostCopy}>
            <p className={styles.eyebrowLight}>{copy.host.eyebrow}</p>
            <h2 id="host-title">{copy.host.title}</h2>
            <p>{copy.host.body}</p>
            <ol>
              {copy.host.process.map((step, index) => (
                <li key={step.title}>
                  <span>0{index + 1}</span>
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
            <Link className={styles.primaryAction} href={contactHref}>
              {copy.host.action}
            </Link>
            <p className={styles.hostGate}>{copy.host.gate}</p>
          </div>
        </section>

        <section className={styles.faq} aria-labelledby="faq-title">
          <header>
            <p className={styles.eyebrowBlue}>{copy.faq.eyebrow}</p>
            <h2 id="faq-title">{copy.faq.title}</h2>
          </header>
          <div className={styles.faqList}>
            {copy.faq.items.map((item, index) => (
              <details key={item.question}>
                <summary>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  {item.question}
                </summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section
          className={styles.closing}
          aria-labelledby="events-closing-title"
        >
          <p className={styles.eyebrowLight}>{copy.closing.eyebrow}</p>
          <h2 id="events-closing-title">{copy.closing.title}</h2>
          <p>{copy.closing.body}</p>
          <Link className={styles.primaryAction} href={contactHref}>
            {copy.closing.action}
          </Link>
        </section>
      </main>
    </JourneyShell>
  );
}
