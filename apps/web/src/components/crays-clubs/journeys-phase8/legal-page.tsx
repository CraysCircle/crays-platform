"use client";

import { Fragment, createElement, type ReactNode } from "react";
import Link from "next/link";
import { FileText, ArrowRight } from "lucide-react";

import type { FamiliesShellCopy } from "./families-copy";
import { JourneyShell } from "./journey-shell";
import {
  getClubsPublicShellCopy,
  getClubsPublicShellLinkLabels,
} from "../public/clubs-public-shell";
import {
  getLegalDocument,
  getLegalDocumentTitle,
  legalDocumentSlugs,
  legalUiCopy,
  type LegalDocumentSlug,
  type LegalLink,
  type LegalLocale,
  type LegalRecord,
} from "./legal-copy-v1";
import { ClubsPublicShell } from "../public/clubs-public-shell";
import { LegalFamilyNav } from "../public/legal-family-layout";
import family from "../public/legal-family-layout.module.css";
import styles from "./legal-page.module.css";
import { CLUBS_OPERATING_ENTITY, CLUBS_OPERATING_CEO } from "@/lib/clubs/operating-entity";

type LegalPageProps = {
  locale: LegalLocale;
  document?: LegalDocumentSlug;
};

function anchorFor(
  record: LegalRecord,
  index: number,
  slug: LegalDocumentSlug,
): string {
  if (record.id) return record.id;
  const readable = record.text
    .toLocaleLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 54);
  return `${slug}-${readable || "section"}-${index + 1}`;
}

function renderLinkedText(
  text: string,
  links: readonly LegalLink[],
): ReactNode {
  if (!links.length) return text;
  const result: ReactNode[] = [];
  let cursor = 0;

  links.forEach((link, index) => {
    const position = text.indexOf(link.text, cursor);
    if (position < 0 || !link.text) return;
    if (position > cursor) result.push(text.slice(cursor, position));
    result.push(
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

  if (cursor < text.length) result.push(text.slice(cursor));
  return result.length ? result : text;
}

function renderRecord(
  record: LegalRecord,
  index: number,
  slug: LegalDocumentSlug,
): ReactNode {
  const content = renderLinkedText(record.text, record.links);
  const id = /^h[2-6]$/.test(record.tag)
    ? anchorFor(record, index, slug)
    : undefined;

  if (/^h[2-6]$/.test(record.tag)) {
    return createElement(
      record.tag,
      {
        className:
          record.tag === "h2" ? styles.sectionHeading : styles.subheading,
        id,
        key: `${record.tag}-${index}`,
      },
      content,
    );
  }

  if (record.tag === "address") {
    return (
      <address className={styles.address} key={`address-${index}`}>
        {content}
      </address>
    );
  }

  return (
    <p className={styles.paragraph} key={`paragraph-${index}`}>
      {content}
    </p>
  );
}

function renderRecords(
  records: readonly LegalRecord[],
  slug: LegalDocumentSlug,
): ReactNode[] {
  const output: ReactNode[] = [];
  let index = 0;

  while (index < records.length) {
    const record = records[index];
    if (record.tag !== "li") {
      output.push(renderRecord(record, index, slug));
      index += 1;
      continue;
    }

    const listItems: ReactNode[] = [];
    const listStart = index;
    while (index < records.length && records[index].tag === "li") {
      const listRecord = records[index];
      listItems.push(
        <li className={styles.listItem} key={`item-${index}`}>
          {renderLinkedText(listRecord.text, listRecord.links)}
        </li>,
      );
      index += 1;
    }
    output.push(
      <ul className={styles.list} key={`list-${listStart}`}>
        {listItems}
      </ul>,
    );
  }

  return output;
}

function LegalShell({locale,copy,children}:{locale:LegalLocale;copy:FamiliesShellCopy;children:ReactNode}){
  return locale==="en" ? <ClubsPublicShell availableLocales={["en","de","es","ca","fr","pt","it"]} headerTone="overlay" locale="en">{children}</ClubsPublicShell> : <JourneyShell locale={locale} copy={copy}>{children}</JourneyShell>;
}

export function LegalPage({ locale, document }: LegalPageProps) {
  const ui = legalUiCopy[locale];
  const publicCopy = getClubsPublicShellCopy(locale);
  const labels = getClubsPublicShellLinkLabels(locale);
  const shell: FamiliesShellCopy = {
    skip: publicCopy.skip,
    menu: publicCopy.menuTitle,
    close: publicCopy.close,
    primaryNav: publicCopy.primaryNav,
    footerNav: publicCopy.primaryNav,
    about: labels.about,
    lifestyle: labels.lifestyle,
    hospitality: labels.hospitality,
    community: labels.communityLife,
    families: labels.families,
    teams: labels.teams,
    events: labels.events,
    companies: labels.portfolioCompanies,
    conference: labels.conference,
    ambassadors: labels.ambassadors,
    membership: publicCopy.footerCta,
    contact: labels.contact,
    brandService: labels.brandService,
    account: labels.account,
    legal: labels.legal,
    association: labels.association,
    associationNote: publicCopy.associationLayer,
    footerLine: publicCopy.footerHeadline,
    siteNote: publicCopy.rights,
  };
  const documents = legalDocumentSlugs.map((slug) => ({
    slug,
    title: getLegalDocumentTitle(locale, slug),
    href: `/${locale}/legal/${slug}`,
  }));

  if (!document) {
    return (
      <LegalShell locale={locale} copy={shell}>
        <main className={`${styles.main} ${locale === "en" ? family.root : ""}`} id="legal-main">
          <section className={styles.hero}>
            <div className={styles.heroInner}>
              <p className={styles.eyebrow}>{ui.eyebrow}</p>
              <h1 className={styles.heroTitle}>{ui.hubTitle}</h1>
              <p className={styles.heroIntro}>{ui.hubIntro}</p>
            </div>
          </section>
          {locale==="en" ? <LegalFamilyNav current="legal"/> : null}
          <section
            className={styles.hubSection}
            aria-labelledby="legal-document-index"
          >
            <aside aria-label="Operating Entity">
              <h2 className={styles.subheading} id="legal-operating-entity">
                {{ en: "Operating Entity", de: "Betreibergesellschaft", es: "Entidad operadora", ca: "Entitat operadora", fr: "Entité exploitante", pt: "Entidade operadora", it: "Società operatrice" }[locale]}
              </h2>
              <address className={styles.address}>
                <strong>{CLUBS_OPERATING_ENTITY.name}</strong><br />
                {CLUBS_OPERATING_ENTITY.streetAddress}<br />
                {CLUBS_OPERATING_ENTITY.postalCode} {CLUBS_OPERATING_ENTITY.locality}<br />
                {CLUBS_OPERATING_ENTITY.country}
              </address>
              <p className={styles.paragraph}>{CLUBS_OPERATING_CEO}</p>
            </aside>
            <div className={styles.hubHeading}>
              <p className={styles.sectionKicker}>01 / 04</p>
              <h2 id="legal-document-index">{ui.documentIndex}</h2>
            </div>
            <div className={styles.hubList}>
              {documents.map((item, index) => (
                <Link
                  className={styles.hubEntry}
                  href={item.href}
                  key={item.slug}
                >
                  <span className={styles.hubNumber}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className={family.hubTitleGroup}>{locale==="en" ? <FileText aria-hidden="true" size={32} strokeWidth={1.5}/> : null}<span className={styles.hubEntryTitle}>{item.title}</span></span>
                  <span className={styles.hubAction}>{ui.openDocument}{locale==="en" ? <ArrowRight aria-hidden="true" size={20}/> : null}</span>
                </Link>
              ))}
            </div>
          </section>
        </main>
      </LegalShell>
    );
  }

  const source = getLegalDocument(locale, document);
  const title =
    source.records[0]?.text ?? getLegalDocumentTitle(locale, document);
  const bodyRecords = source.records.slice(1);
  const headings = bodyRecords
    .map((record, index) => ({ record, index }))
    .filter(({ record }) => /^h[2-6]$/.test(record.tag));

  return (
    <LegalShell locale={locale} copy={shell}>
      <main className={`${styles.main} ${locale === "en" ? family.root : ""}`} id={`${document}-main`}>
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <Link className={styles.backLink} href={`/${locale}/legal`}>
              <span aria-hidden="true">←</span> {ui.backToIndex}
            </Link>
            <p className={styles.eyebrow}>{ui.preservedLabel}</p>
            <h1 className={styles.heroTitle}>{title}</h1>
          </div>
        </section>

        <nav className={styles.documentTabs} aria-label={ui.documentIndex}>
          <div className={styles.documentTabsInner}>
            {documents.map((item) => (
              <Link
                aria-current={item.slug === document ? "page" : undefined}
                className={
                  item.slug === document
                    ? `${styles.tabLink} ${styles.tabLinkActive}`
                    : styles.tabLink
                }
                href={item.href}
                key={item.slug}
              >
                {item.title}
              </Link>
            ))}
          </div>
        </nav>

        <section className={styles.documentRegion}>
          <div className={styles.readingGrid}>
            {headings.length > 0 ? (
              <aside className={styles.sideNav}>
                <p className={styles.sideNavTitle}>{ui.onThisPage}</p>
                <ol className={styles.sideNavList}>
                  {headings.map(({ record, index }) => (
                    <li key={`${record.text}-${index}`}>
                      <a
                        className={styles.sideNavLink}
                        href={`#${anchorFor(record, index, document)}`}
                      >
                        {record.text}
                      </a>
                    </li>
                  ))}
                </ol>
              </aside>
            ) : null}

            <article className={styles.article} aria-label={title}>
              <div className={styles.articleRule} aria-hidden="true" />
              <div className={styles.articleBody}>
                {renderRecords(bodyRecords, document).map((node, index) => (
                  <Fragment key={index}>{node}</Fragment>
                ))}
              </div>
            </article>
          </div>
        </section>
      </main>
    </LegalShell>
  );
}
