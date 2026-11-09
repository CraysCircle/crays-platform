import { CLUBS_OPERATING_DETAILS, CLUBS_OPERATING_BOARD } from "@/lib/clubs/operating-entity";
import type { ReactNode } from "react";

import {
  getLegalDocument,
  type LegalLink,
  type LegalRecord,
} from "@/components/crays-clubs/journeys-phase8/legal-copy-v1";

import { ClubsPublicShell } from "./clubs-public-shell";
import { LegalFamilyNav, LegalReadingLayout } from "./legal-family-layout";
import family from "./legal-family-layout.module.css";
import styles from "./clubs-privacy-policy-page.module.css";

const AVAILABLE_LOCALES = ["en", "de", "es", "ca", "fr", "pt", "it"] as const;

const PRIVACY_CONTACT = {
  title: "Privacy contact",
  company: CLUBS_OPERATING_DETAILS,
  operations: CLUBS_OPERATING_BOARD,
  email: "team@craysclub.com",
} as const;

type PrivacySection = {
  heading: LegalRecord;
  records: LegalRecord[];
};

function sectionId(text: string, index: number): string {
  const slug = text
    .toLocaleLowerCase("en")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return `privacy-${slug || `section-${index + 1}`}`;
}

function splitIntoSections(records: readonly LegalRecord[]): PrivacySection[] {
  const sections: PrivacySection[] = [];

  records.forEach((record) => {
    if (record.tag === "h2") {
      sections.push({ heading: record, records: [] });
      return;
    }

    sections.at(-1)?.records.push(record);
  });

  return sections;
}

function renderLinkedText(
  text: string,
  links: readonly LegalLink[],
): ReactNode {
  if (!links.length) return text;

  const output: ReactNode[] = [];
  let cursor = 0;

  links.forEach((link, index) => {
    const position = text.indexOf(link.text, cursor);
    if (position < 0 || !link.text) return;

    if (position > cursor) output.push(text.slice(cursor, position));
    output.push(
      <a
        className={styles.inlineLink}
        href={link.href}
        key={`${link.href}-${index}`}
      >
        {link.text}
      </a>,
    );
    cursor = position + link.text.length;
  });

  if (cursor < text.length) output.push(text.slice(cursor));
  return output.length ? output : text;
}

function renderRecord(record: LegalRecord, index: number): ReactNode {
  if (record.tag === "address") {
    return (
      <address className={styles.paragraph} key={`address-${index}`}>
        {renderLinkedText(record.text, record.links)}
      </address>
    );
  }

  if (record.tag === "li") {
    return (
      <li className={styles.listItem} key={`item-${index}`}>
        {renderLinkedText(record.text, record.links)}
      </li>
    );
  }

  return (
    <p className={styles.paragraph} key={`paragraph-${index}`}>
      {renderLinkedText(record.text, record.links)}
    </p>
  );
}

export function ClubsPrivacyPolicyPage() {
  const source = getLegalDocument("en", "privacy-policy");
  const title = source.records[0]?.text ?? "Privacy Policy";
  const intro = source.records[1];
  const sections = splitIntoSections(source.records.slice(2));

  return (
    <ClubsPublicShell
      availableLocales={AVAILABLE_LOCALES}
      headerTone="overlay"
      locale="en"
    >
      <main className={`${styles.page} ${family.root}`}>
        <section className={styles.hero} aria-labelledby="privacy-policy-title">
          <div className={styles.heroInner}>
            <div className={styles.heroTitleBlock}>
              <p className={styles.eyebrow}>Legal</p>
              <h1 id="privacy-policy-title">{title}</h1>
            </div>

            <div className={styles.heroReadingBlock}>
              {intro ? (
                <p className={styles.heroIntro}>
                  {renderLinkedText(intro.text, intro.links)}
                </p>
              ) : null}
              <span className={styles.heroRule} aria-hidden="true" />
              

              
            </div>
          </div>
        </section>

        <LegalFamilyNav current="privacy-policy"/>
        <LegalReadingLayout current="privacy-policy" items={sections.map((section,index)=>({id:sectionId(section.heading.text,index),title:section.heading.text}))}>
        <div className={styles.readingRows}>
          <section
            className={`${styles.readingRow} ${styles.contactRow}`}
            aria-labelledby="privacy-contact-title"
          >
            <div
              className={`${styles.markerCell} ${styles.markerCellStart}`}
              aria-hidden="true"
            >
              <span className={`${styles.marker} ${styles.markerActive}`} />
            </div>
            <div className={styles.contactPanel}>
              <h2 id="privacy-contact-title">{PRIVACY_CONTACT.title}</h2>
              <address>
                <p>{PRIVACY_CONTACT.company}</p>
                <p>{PRIVACY_CONTACT.operations}</p>
                <a href={`mailto:${PRIVACY_CONTACT.email}`}>
                  {PRIVACY_CONTACT.email}
                </a>
              </address>
            </div>
          </section>

          {sections.map((section, index) => {
            const id = sectionId(section.heading.text, index);
            const markerClass =
              index === sections.length - 1
                ? `${styles.markerCell} ${styles.markerCellEnd}`
                : styles.markerCell;

            return (
              <section
                className={styles.readingRow}
                id={id}
                key={section.heading.text}
              >
                <div className={markerClass} aria-hidden="true">
                  <span className={styles.marker} />
                </div>
                <div className={styles.sectionPanel}>
                  <header className={styles.sectionMeta}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <h2>{section.heading.text}</h2>
                  </header>
                  <div className={styles.sectionBody}>
                    {section.records.map((record, recordIndex) =>
                      renderRecord(record, recordIndex),
                    )}
                  </div>
                </div>
              </section>
            );
          })}

          
        </div>
        </LegalReadingLayout>
      </main>
    </ClubsPublicShell>
  );
}
