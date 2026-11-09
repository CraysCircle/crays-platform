import Link from "next/link";

import styles from "./franchise-footer.module.css";

export const franchiseFooterConcepts = [
  { label: "Compare All Concepts", href: "/concepts" },
  { label: "Coffee Franchise Concept", href: "/concepts/coffee" },
  { label: "Retail Franchise Concept", href: "/concepts/retail" },
  { label: "Gym Franchise Concept", href: "/concepts/gym" },
  { label: "Clubs Franchise Concept", href: "/concepts/clubs" },
] as const;

export const franchiseFooterStakeholders = [
  { label: "Real Estate Owners", href: "/real-estate" },
  { label: "Franchise Partners", href: "/franchise-partners" },
  { label: "Deal Marketplace", href: "/deals" },
  { label: "Funding Partners", href: "/funding-partners" },
  { label: "Investors", href: "/investors" },
  { label: "Vendors & General Contractors", href: "/vendors" },
  { label: "CRAYS Portal", href: "/portal" },
] as const;

export const franchiseFooterSupport = [
  { label: "FAQ", href: "/faq" },
  { label: "Contact", href: "/contact" },
  { label: "Accessibility", href: "/accessibility" },
  { label: "Privacy", href: "/privacy" },
  { label: "Imprint", href: "/imprint" },
] as const;

type InternalFooterGroupProps = {
  label: string;
  items: readonly { label: string; href: string }[];
};

function InternalFooterGroup({ label, items }: InternalFooterGroupProps) {
  const headingId = `crays-pro-footer-${label
    .toLowerCase()
    .replaceAll(" ", "-")
    .replaceAll("&", "and")}`;

  return (
    <nav className={styles.group} aria-labelledby={headingId}>
      <h2 className={styles.groupHeading} id={headingId}>
        {label}
      </h2>
      <ol className={styles.linkList}>
        {items.map((item) => (
          <li key={item.href}>
            <Link className={styles.footerLink} href={item.href}>
              {item.label}
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export type FranchiseFooterLegalOwner =
  | { status: "confirmed"; text: string }
  | { status: "pending"; placeholder?: string };

export function FranchiseFooter({
  legalOwner = { status: "pending" },
}: {
  legalOwner?: FranchiseFooterLegalOwner;
}) {
  const legalOwnerLine =
    legalOwner.status === "confirmed"
      ? legalOwner.text
      : (legalOwner.placeholder ??
        "LEGAL PUBLISHER DETAILS — TO BE CONFIRMED BEFORE RELEASE");

  return (
    <footer className={styles.footer} aria-label="CRAYS.pro footer">
      <div className={styles.inner}>
        <Link
          className={styles.logoLink}
          href="/"
          aria-label="CRAYS.pro home"
        >
          {/* The approved local light-surface master is not LCP content. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className={styles.logo}
            src="/assets/images/crays-franchise/crays-logo-light.svg"
            alt=""
            width={172}
            height={43}
          />
        </Link>

        <div className={styles.columns}>
          <InternalFooterGroup
            label="CONCEPTS"
            items={franchiseFooterConcepts}
          />
          <InternalFooterGroup
            label="STAKEHOLDERS"
            items={franchiseFooterStakeholders}
          />
          <div className={styles.thirdColumn}>
            <InternalFooterGroup
              label="SUPPORT & LEGAL"
              items={franchiseFooterSupport}
            />

            <section
              className={styles.languageGroup}
              aria-labelledby="crays-pro-footer-language"
            >
              <h2
                className={styles.groupHeading}
                id="crays-pro-footer-language"
              >
                LANGUAGE
              </h2>
              <div className={styles.languageRow}>
                <span lang="en" aria-current="true">
                  EN
                </span>
                <span className={styles.languageStatus}>
                  DE — Coming later
                </span>
              </div>
            </section>
          </div>
        </div>

        <p
          className={styles.legalOwnerLine}
          data-legal-status={legalOwner.status}
        >
          {legalOwnerLine}
        </p>
      </div>
    </footer>
  );
}
