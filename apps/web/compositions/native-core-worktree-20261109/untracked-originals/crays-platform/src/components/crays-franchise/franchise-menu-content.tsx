"use client";

import { ExternalLink } from "lucide-react";
import type { MouseEvent } from "react";

import styles from "./franchise-menu-content.module.css";

export const franchiseEcosystemItems = [
  { label: "CRAYS Circle", href: "https://www.crays.net/" },
  { label: "CRAYS Association", href: "https://www.crays.org/" },
  { label: "CRAYS Hospitality", href: "https://www.crays.world/" },
  { label: "CRAYS Coffee", href: "https://www.crays.coffee/" },
  { label: "CRAYS Retail", href: "https://www.crays.shop/" },
  { label: "CRAYS Gym", href: "https://www.craysgym.com/" },
  { label: "CRAYS Clubs", href: "https://www.craysclub.com/" },
  { label: "CRAYS Fund", href: "https://www.crays.fund/en" },
] as const;

export const franchiseConceptLinks = [
  { label: "CRAYS Coffee", href: "/concepts/coffee" },
  { label: "CRAYS Retail", href: "/concepts/retail" },
  { label: "CRAYS Gym", href: "/concepts/gym" },
  { label: "CRAYS Clubs", href: "/concepts/clubs" },
] as const;

export const franchiseMenuGroups = [
  {
    label: "EXPLORE",
    items: [
      { label: "Concepts", href: "/concepts", concepts: true },
      { label: "Deal Marketplace", href: "/deals" },
    ],
  },
  {
    label: "STAKEHOLDERS",
    items: [
      { label: "Real Estate Owners", href: "/real-estate" },
      { label: "Franchise Partners", href: "/franchise-partners" },
      { label: "Funding Partners", href: "/funding-partners" },
      { label: "Investors", href: "/investors" },
      { label: "Vendors & General Contractors", href: "/vendors" },
    ],
  },
  {
    label: "ACCESS & SUPPORT",
    items: [
      { label: "CRAYS Portal", href: "/portal", responsivePortal: true },
      { label: "FAQ", href: "/faq" },
      { label: "Contact", href: "/contact" },
    ],
  },
] as const;

type FranchiseMenuContentProps = {
  onInternalNavigate: () => void;
};

function notifySameTabNavigation(
  event: MouseEvent<HTMLAnchorElement>,
  onInternalNavigate: () => void,
) {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return;
  }

  onInternalNavigate();
}

export function FranchiseEcosystemRail() {
  return (
    <ol className={styles.ecosystemList}>
      {franchiseEcosystemItems.map((item) => (
        <li className={styles.ecosystemRow} key={item.label}>
          <a
            className={styles.ecosystemLink}
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span>{item.label}</span>
            <span className={styles.screenReaderOnly}>
              , opens in a new tab
            </span>
            <ExternalLink
              className={styles.externalIcon}
              size={15}
              strokeWidth={1.5}
              aria-hidden="true"
            />
          </a>
        </li>
      ))}
    </ol>
  );
}

export function FranchisePagePanel({
  onInternalNavigate,
}: FranchiseMenuContentProps) {
  return (
    <div className={styles.pageGroups}>
      {franchiseMenuGroups.map((group) => (
        <section
          className={styles.pageGroup}
          aria-labelledby={`franchise-menu-${group.label
            .toLowerCase()
            .replaceAll(" ", "-")
            .replaceAll("&", "and")}`}
          key={group.label}
        >
          <h2
            className={styles.groupLabel}
            id={`franchise-menu-${group.label
              .toLowerCase()
              .replaceAll(" ", "-")
              .replaceAll("&", "and")}`}
          >
            {group.label}
          </h2>
          <ol className={styles.pageList}>
            {group.items.map((item) => (
              <li
                className={
                  "concepts" in item && item.concepts
                    ? styles.conceptsRow
                    : styles.pageRow
                }
                key={item.href}
              >
                <a
                  className={styles.pageLink}
                  href={item.href}
                  onClick={(event) =>
                    notifySameTabNavigation(event, onInternalNavigate)
                  }
                >
                  {"responsivePortal" in item && item.responsivePortal ? (
                    <>
                      <span className={styles.portalDesktop}>
                        CRAYS Portal
                      </span>
                      <span className={styles.portalMobile}>LOG IN</span>
                    </>
                  ) : (
                    item.label
                  )}
                </a>
                {"concepts" in item && item.concepts ? (
                  <ol
                    className={styles.conceptList}
                    aria-label="CRAYS concepts"
                  >
                    {franchiseConceptLinks.map((concept) => (
                      <li key={concept.href}>
                        <a
                          className={styles.conceptLink}
                          href={concept.href}
                          onClick={(event) =>
                            notifySameTabNavigation(event, onInternalNavigate)
                          }
                        >
                          {concept.label}
                        </a>
                      </li>
                    ))}
                  </ol>
                ) : null}
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
