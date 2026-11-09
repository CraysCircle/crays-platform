"use client";

import Image from "next/image";
import {
  Archive,
  BookOpen,
  Building2,
  Check,
  ChevronDown,
  CircleAlert,
  CircleHelp,
  Compass,
  Eye,
  FileText,
  FolderOpen,
  Leaf,
  LockKeyhole,
  Mail,
  RefreshCw,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { useState, type FormEvent } from "react";

import { ClubsPublicShell } from "./clubs-public-shell";
import {
  conferenceLocales,
  getConferencePublicContent,
  type ConferenceLocale,
} from "./conference-public-copy";
import styles from "./conference-public-page.module.css";

const sections = [
  { id: "archive", label: "Archive & media", short: "Archive", Icon: Archive },
  { id: "programme", label: "Programme roles", short: "Programme", Icon: BookOpen },
  { id: "speakers", label: "Speaker / roster proof gate", short: "Speaker", Icon: ShieldCheck },
  { id: "audience", label: "Audience", short: "Audience", Icon: UsersRound },
  { id: "participation", label: "Participation protocol", short: "Participation", Icon: LockKeyhole },
  { id: "request", label: "Request an edition", short: "Request", Icon: Mail },
  { id: "faq", label: "FAQ", short: "FAQ", Icon: CircleHelp },
] as const;

const programmeIcons = [BookOpen, FileText, CircleHelp, UsersRound, Compass, ShieldCheck] as const;
const audienceIcons = [Building2, Leaf, Compass, Eye] as const;
const participationLabels = ["Discover", "Request", "Review", "Invitation", "Registration", "Ticket / payment", "Check-in"];

export function ConferencePublicPage({ locale }: { locale: ConferenceLocale }) {
  const c = getConferencePublicContent(locale);
  const [requestValue, setRequestValue] = useState("");
  const [requestState, setRequestState] = useState<"idle" | "invalid" | "preview">("idle");

  const exactEnglish = locale === "en";
  const title = exactEnglish ? "Forest City Conference Dossier" : c.hero.title;
  const heroLead = exactEnglish
    ? "Editorial evidence spine for the CRAYS Clubs public route. Everything here is either verified, or clearly unavailable."
    : c.hero.lead;

  function previewRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRequestState(event.currentTarget.checkValidity() ? "preview" : "invalid");
  }

  return (
    <ClubsPublicShell
      availableLocales={conferenceLocales}
      headerTone="navy"
      locale={locale}
    >
      <main className={styles.page}>
        <section className={styles.hero} aria-labelledby="conference-title">
          <div className={styles.heroCopy}>
            <p className={styles.routeLabel}>Public route \ Conference dossier</p>
            <span className={styles.dossierNumber}>001</span>
            <h1 id="conference-title">
              {exactEnglish ? (
                <>
                  <span>Forest City</span>
                  <span>Conference Dossier</span>
                </>
              ) : title}
            </h1>
            <p className={styles.heroLead}>{heroLead}</p>
            <p className={styles.heroStatus}><CircleAlert aria-hidden="true" size={20} />No upcoming edition is currently published.</p>
          </div>
          <figure className={styles.heroMedia}>
            <Image
              alt="Forest City at night; place context only, not conference evidence."
              fill
              priority
              sizes="(max-width: 679px) 0px, (max-width: 799px) 100vw, (max-width: 1199px) 53vw, 46vw"
              src="/__crays-clubs/conference-dossier/conference-forest-city-hero-v1.png"
            />
          </figure>
          <aside className={styles.evidenceRegister} aria-label="Evidence register">
            <p>Evidence register</p>
            {sections.map(({ id, short, Icon }, index) => (
              <a className={index === 2 ? styles.pending : index === 4 ? styles.gated : undefined} href={`#${id}`} key={id}>
                <Icon aria-hidden="true" size={22} />
                <span><strong>{short}</strong><small>{index === 0 ? "Unavailable" : index === 1 ? "No edition published" : index === 2 ? "Proof pending" : index === 3 ? "Defined" : index === 4 ? "All steps gated" : index === 5 ? "Submission unavailable" : "Open"}</small></span>
              </a>
            ))}
          </aside>
        </section>

        <nav className={styles.dossierNav} aria-label="Dossier index">
          <span className={styles.indexTitle}>Dossier index</span>
          {sections.map((item, index) => (
            <a className={index === 0 ? styles.activeIndex : undefined} href={`#${item.id}`} key={item.id}>
              <strong>{String(index + 1).padStart(2, "0")}</strong>
              <span>{item.label}</span>
            </a>
          ))}
        </nav>

        <section className={styles.dossierSection} id="archive" aria-labelledby="archive-title">
          <header className={styles.sideLabel}>
            <strong>01</strong>
            <h2 id="archive-title">Archive &amp; media<br />evidence gate</h2>
            <p>We publish only after editorial verification.</p>
          </header>
          <article className={styles.archivePanel}>
            <div className={styles.archiveGate}>
              <FolderOpen aria-hidden="true" size={34} />
              <div>
                <h3>Archive unavailable — no approved CRAYS Conference edition evidence.</h3>
                <p>No upcoming edition is currently published.</p>
              </div>
            </div>
            <div className={styles.archiveTable} aria-hidden="true">
              <span>Evidence item</span><span>Edition</span><span>Status</span><span>Published</span><span>Notes</span>
            </div>
            <figure className={styles.archiveMedia}>
              <Image
                alt="Forest City waterfront at night; place context only, not conference archive media."
                fill
                sizes="(max-width: 679px) 0px, calc(100vw - 286px)"
                src="/__crays-clubs/conference-dossier/conference-forest-city-archive-v1.png"
              />
            </figure>
          </article>
        </section>

        <section className={styles.dossierSection} id="programme" aria-labelledby="programme-title">
          <header className={styles.sideLabel}>
            <strong>02</strong>
            <h2 id="programme-title">Programme roles</h2>
            <p>The editorial spine of the CRAYS Conference edition.</p>
          </header>
          <div className={styles.programmeList}>
            {c.programme.items.map((item, index) => {
              const Icon = programmeIcons[index] ?? BookOpen;
              return (
                <details key={item.title}>
                  <summary><Icon aria-hidden="true" size={16} /><strong>{String(index + 1).padStart(2, "0")}</strong><span>{item.title}</span><ChevronDown aria-hidden="true" size={16} /></summary>
                  <p>{item.text}</p>
                </details>
              );
            })}
          </div>
        </section>

        <section className={styles.dossierSection} id="speakers" aria-labelledby="speakers-title">
          <header className={`${styles.sideLabel} ${styles.dangerLabel}`}>
            <strong>03</strong>
            <h2 id="speakers-title">Speaker / roster<br />proof gate</h2>
            <p>We publish speakers and roles only after editorial verification.</p>
          </header>
          <div className={styles.speakerGate}>
            <span className={styles.seal}><ShieldCheck aria-hidden="true" size={31} /></span>
            <div><h3>Speaker proof pending — no people announced.</h3><p>No people are listed until editorial verification is complete.</p></div>
          </div>
        </section>

        <section className={styles.dossierSection} id="audience" aria-labelledby="audience-title">
          <header className={styles.sideLabel}>
            <strong>04</strong>
            <h2 id="audience-title">Audience</h2>
            <p>Built for a range of contributors and curious minds.</p>
          </header>
          <div className={styles.audienceMatrix} role="table" aria-label="Audience participation roles">
            <span aria-hidden="true" />
            {c.audience.items.map((item, index) => {
              const Icon = audienceIcons[index] ?? Eye;
              return <header key={item.title} role="columnheader"><Icon aria-hidden="true" size={28} /><strong>{item.title}</strong></header>;
            })}
            {["Contribute", "Learn", "Connect", "Belong"].map((label) => (
              <div className={styles.matrixRow} key={label} role="row"><strong role="rowheader">{label}</strong>{c.audience.items.map((item) => <span aria-label={`${label}: ${item.title}`} key={item.title} role="cell">●</span>)}</div>
            ))}
          </div>
        </section>

        <section className={styles.mobileFlow} id="participation" aria-labelledby="participation-title">
          <details>
            <summary><strong>05</strong><span id="participation-title">Participation protocol</span><ChevronDown aria-hidden="true" size={17} /></summary>
            <ol className={styles.participationPath}>
              {participationLabels.map((label, index) => <li key={label}><span>{index + 1}</span><small>{label}</small></li>)}
            </ol>
            <p>All participation states are unavailable.</p>
          </details>
        </section>

        <section className={styles.mobileFlow} id="request" aria-labelledby="request-title">
          <details open>
            <summary><strong>06</strong><span id="request-title">Request an edition</span><ChevronDown aria-hidden="true" size={17} /></summary>
            <form className={styles.requestForm} onSubmit={previewRequest} noValidate>
              <label><span className={styles.srOnly}>Email address</span><input aria-describedby="request-status" aria-invalid={requestState === "invalid"} onChange={(event) => { setRequestValue(event.target.value); setRequestState("idle"); }} placeholder="Email address" required type="email" value={requestValue} /></label>
              <button type="submit">Preview</button>
              <div className={styles.requestStates} id="request-status" role="status" aria-live="polite">
                {requestState === "idle" && <span>Enter a valid email address to create a local preview.</span>}
                {requestState === "invalid" && <span className={styles.currentState}><CircleAlert aria-hidden="true" size={19} />Enter a valid email address.</span>}
                {requestState === "preview" && <span className={styles.currentState}><Check aria-hidden="true" size={19} />Preview prepared locally — nothing was sent.</span>}
                {requestState !== "idle" && <button onClick={() => { setRequestState("idle"); setRequestValue(""); }} type="button"><RefreshCw aria-hidden="true" size={18} />Retry</button>}
              </div>
              <p>Request submission unavailable.</p>
            </form>
          </details>
        </section>

        <section className={styles.mobileFlow} id="faq" aria-labelledby="faq-title">
          <details open>
            <summary><strong>07</strong><span id="faq-title">FAQ</span><ChevronDown aria-hidden="true" size={17} /></summary>
            <div className={styles.faqList}>
              {c.faq.items.map((item, index) => <details open={index === 0} key={item.question}><summary>{item.question}<ChevronDown aria-hidden="true" size={15} /></summary><p>{item.answer}</p></details>)}
            </div>
          </details>
        </section>
      </main>
    </ClubsPublicShell>
  );
}
