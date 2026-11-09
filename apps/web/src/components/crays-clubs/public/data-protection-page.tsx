import { CLUBS_OPERATING_DETAILS, CLUBS_OPERATING_CEO } from "@/lib/clubs/operating-entity";
import type { ReactNode } from "react";

import { ClubsPublicShell } from "./clubs-public-shell";
import { LegalFamilyNav, LegalReadingLayout } from "./legal-family-layout";
import family from "./legal-family-layout.module.css";
import styles from "./data-protection-page.module.css";

const PUBLIC_LOCALES = ["en", "de", "es", "ca", "fr", "pt", "it"] as const;


const CHAPTERS = [
  { id: "personal-data-we-process", number: "01", title: "Personal Data We Process" },
  { id: "purposes", number: "02", title: "Purposes" },
  { id: "legal-bases", number: "03", title: "Legal Bases" },
  { id: "sharing-and-service-providers", number: "04", title: "Sharing and Service Providers" },
  { id: "your-rights", number: "05", title: "Your Rights" },
] as const;

type LegalSectionProps = {
  children: ReactNode;
  id: string;
  number: string;
  title: string;
  tone?: "paper" | "warm" | "rights";
};

function LegalSection({
  children,
  id,
  number,
  title,
  tone = "paper",
}: LegalSectionProps) {
  return (
    <section
      className={`${styles.legalSection} ${styles[`legalSection_${tone}`]}`}
      id={id}
    >
      <header className={styles.sectionHeader}>
        <span aria-hidden="true" className={styles.sectionNumber}>
          {number}
        </span>
        <h2>{title}</h2>
      </header>
      <div className={styles.sectionBody}>{children}</div>
    </section>
  );
}

export function DataProtectionPage() {
  return (
    <ClubsPublicShell
      availableLocales={PUBLIC_LOCALES}
      headerTone="overlay"
      locale="en"
    >
      <main className={`${styles.page} ${family.root}`} id="data-protection-main">
        <section aria-labelledby="data-protection-title" className={styles.hero}>
          <div className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>Legal</p>
              <h1 id="data-protection-title">Data Protection</h1>
              <p className={styles.intro}>
                How Crays Club handles personal data when people visit the website,
                request access or contact the team.
              </p>

              
            </div>

            <aside aria-label="Data controller" className={styles.controller}>
              <h2>Controller</h2>
              <p>{CLUBS_OPERATING_DETAILS}</p>
              <p>{CLUBS_OPERATING_CEO}</p>
              <a href="mailto:team@craysclub.com">team@craysclub.com</a>
            </aside>
          </div>
        </section>

        <LegalFamilyNav current="data-protection"/>
        <LegalReadingLayout current="data-protection" items={CHAPTERS}>
        <section aria-label="Data protection details" className={styles.readingRegion}>
          <div className={styles.readingGrid}>
            

            <article aria-label="Data Protection" className={styles.article}>
              <LegalSection
                id="personal-data-we-process"
                number="01"
                title="Personal Data We Process"
              >
                <p>
                  When you visit CraysClub.com, request Crays access or contact us,
                  we may process contact details, message content, technical browser
                  information, usage data and information needed to respond to your
                  request.
                </p>
                <p>
                  We only ask for information that is useful for operating the Crays
                  Club experience, handling communication, improving the website or
                  preparing requested services.
                </p>
              </LegalSection>

              <LegalSection id="purposes" number="02" title="Purposes" tone="warm">
                <ul>
                  <li>Providing and improving the website.</li>
                  <li>Responding to inquiries and access requests.</li>
                  <li>Preparing guest, member, partner or community communication.</li>
                  <li>Protecting the website against misuse, spam and security incidents.</li>
                  <li>Meeting legal, accounting or compliance obligations where required.</li>
                </ul>
              </LegalSection>

              <LegalSection id="legal-bases" number="03" title="Legal Bases">
                <p>
                  Depending on the context, processing may be based on contractual
                  steps, consent, legal obligations or legitimate interests such as
                  secure website operation, communication management and product
                  improvement.
                </p>
                <p>
                  You may withdraw consent where processing is based on consent.
                  Withdrawal does not affect processing that took place before the
                  withdrawal.
                </p>
              </LegalSection>

              <LegalSection
                id="sharing-and-service-providers"
                number="04"
                title="Sharing and Service Providers"
                tone="warm"
              >
                <p>
                  Crays may use technical providers for hosting, analytics,
                  communication, security, forms and related operational services.
                  Providers are selected to support secure and reliable operation.
                </p>
                <p>
                  Where information is transferred internationally, Crays uses
                  appropriate safeguards where legally required.
                </p>
              </LegalSection>

              <LegalSection id="your-rights" number="05" title="Your Rights" tone="rights">
                <p>
                  Depending on applicable law, you may have rights to access, correct,
                  delete, restrict or receive your personal data, object to certain
                  processing and complain to a supervisory authority.
                </p>
                <p>
                  To exercise privacy rights, contact{" "}
                  <a href="mailto:team@craysclub.com">team@craysclub.com</a>.
                </p>
              </LegalSection>
            </article>
          </div>
        </section>
        </LegalReadingLayout>
      </main>
    </ClubsPublicShell>
  );
}
