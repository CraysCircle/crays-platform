"use client";
import { CLUBS_OPERATING_DETAILS, CLUBS_OPERATING_CEO } from "@/lib/clubs/operating-entity";



import {
  getLegalDocument,
} from "../../journeys-phase8/legal-copy-v1";
import { ClubsPublicShell } from "../clubs-public-shell";
import { LegalFamilyNav, LegalReadingLayout } from "../legal-family-layout";
import family from "../legal-family-layout.module.css";
import styles from "./terms-and-conditions-page.module.css";

const AVAILABLE_LOCALES = ["en", "de", "es", "ca", "fr", "pt", "it"] as const;

const RESPONSIBLE_ENTITIES = [CLUBS_OPERATING_DETAILS, CLUBS_OPERATING_CEO] as const;

const SECTION_IDS: Record<string, string> = {
  Scope: "scope",
  "Website Content": "website-content",
  "Access Requests": "access-requests",
  "Third-Party Services": "third-party-services",
  Liability: "liability",
};

type LegalSection = {
  heading: string;
  id: string;
  paragraphs: string[];
};

function getSections(): LegalSection[] {
  const records = getLegalDocument("en", "terms-and-conditions").records.slice(
    2,
  );
  const sections: LegalSection[] = [];

  records.forEach((record) => {
    if (record.tag === "h2") {
      sections.push({
        heading: record.text,
        id:
          SECTION_IDS[record.text] ??
          record.text.toLowerCase().replaceAll(" ", "-"),
        paragraphs: [],
      });
      return;
    }

    if (record.tag === "p") {
      sections.at(-1)?.paragraphs.push(record.text);
    }
  });

  return sections;
}

export function TermsAndConditionsPage() {
  const source = getLegalDocument("en", "terms-and-conditions");
  const title = source.records[0]?.text ?? "Terms and Conditions";
  const intro = source.records[1]?.text ?? "";
  const sections = getSections();

  return (
    <ClubsPublicShell
      availableLocales={AVAILABLE_LOCALES}
      headerTone="overlay"
      locale="en"
    >
      <main className={`${styles.main} ${family.root}`}>
        <section aria-labelledby="terms-title" className={styles.hero}>
          <div className={styles.heroInner}>
            <p className={styles.eyebrow}>Legal</p>
            <h1 id="terms-title">{title}</h1>
            <p className={styles.heroIntro}>{intro}</p>
            
          </div>
        </section>

        <LegalFamilyNav current="terms-and-conditions"/>
        <LegalReadingLayout current="terms-and-conditions" items={sections.map(section=>({id:section.id,title:section.heading}))}>
        <section
          aria-label="Terms and Conditions document"
          className={styles.document}
        >
          <div className={styles.documentGrid}>
            

            <article aria-label={title} className={styles.article}>
<section
                aria-labelledby="responsible-entities"
                className={styles.railCard}
              >
                <h2 id="responsible-entities">Responsible entities</h2>
                {RESPONSIBLE_ENTITIES.map((entity) => (
                  <p key={entity}>{entity}</p>
                ))}
                <a
                  className={styles.emailLink}
                  href="mailto:team@craysclub.com"
                >
                  team@craysclub.com
                </a>
              </section>
              {sections.map((section, index) => (
                <section
                  className={styles.articleSection}
                  id={section.id}
                  key={section.id}
                >
                  <div className={styles.sectionHeading}>
                    <span aria-hidden="true">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <h2>{section.heading}</h2>
                  </div>
                  <div className={styles.sectionCopy}>
                    {section.paragraphs.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                </section>
              ))}
            </article>
          </div>
        </section>
        </LegalReadingLayout>
      </main>
    </ClubsPublicShell>
  );
}
