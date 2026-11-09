"use client";
import { ClubsPublicFooter } from "../public/clubs-public-shell";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  Globe2,
  Menu,
  UserRound,
  X,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type {
  CraysFamilyLocale,
  FamiliesShellCopy,
} from "./families-copy";
import tokens from "../public/clubs-public-design-tokens.module.css";
import styles from "./families-page.module.css";

type JourneyShellProps = {
  children: ReactNode;
  locale: CraysFamilyLocale;
  copy: FamiliesShellCopy | LegacyJourneyShellCopy;
};

type LegacyJourneyShellCopy = {
  skip: string;
  nav: string;
  menu: string;
  close: string;
  account: string;
  association: string;
  associationLead: string;
  footerLead: string;
  release: string;
  links: {
    about: string;
    lifestyle: string;
    hospitality: string;
    community: string;
    member: string;
    ambassadors: string;
    families: string;
    teams: string;
    events: string;
    companies: string;
    conference: string;
    contact: string;
    brand: string;
    account: string;
    legal: string;
  };
};

function normalizeShellCopy(
  copy: FamiliesShellCopy | LegacyJourneyShellCopy,
): FamiliesShellCopy {
  if ("primaryNav" in copy) {
    return copy;
  }

  return {
    skip: copy.skip,
    menu: copy.menu,
    close: copy.close,
    primaryNav: copy.nav,
    footerNav: copy.nav,
    about: copy.links.about,
    lifestyle: copy.links.lifestyle,
    hospitality: copy.links.hospitality,
    community: copy.links.community,
    families: copy.links.families,
    teams: copy.links.teams,
    events: copy.links.events,
    companies: copy.links.companies,
    conference: copy.links.conference,
    ambassadors: copy.links.ambassadors,
    membership: copy.links.member,
    contact: copy.links.contact,
    brandService: copy.links.brand,
    account: copy.links.account,
    legal: copy.links.legal,
    association: copy.association,
    associationNote: copy.associationLead,
    footerLine: copy.footerLead,
    siteNote: copy.release,
  };
}

const localeLabels: Record<CraysFamilyLocale, string> = {
  en: "English",
  de: "Deutsch",
  es: "Espanol",
  ca: "Catala",
  fr: "Francais",
  pt: "Portugues",
  it: "Italiano",
};

export function JourneyShell({
  children,
  locale,
  copy: rawCopy,
}: JourneyShellProps) {
  const copy = normalizeShellCopy(rawCopy);
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuDialogRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const normalizedPathname = pathname || `/${locale}/families`;
  const pathParts = normalizedPathname.split("/").filter(Boolean);
  const routeParts = pathParts.slice(1);
  const currentRoute = routeParts.join("/");
  const routeKey = routeParts[routeParts.length - 1] || "home";
  const menuId = `clubs-${routeKey}-menu`;
  const mainId = `${routeKey}-main`;

  const isCurrent = (href: string) =>
    normalizedPathname === href || normalizedPathname.startsWith(`${href}/`);

  const routeForLocale = (code: string) =>
    currentRoute ? `/${code}/${currentRoute}` : `/${code}`;

  const makeLink = (label: string, href: string) => ({
    label,
    href,
    current: isCurrent(href),
  });

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const menuButton = menuButtonRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMenuOpen(false);
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusable = menuDialogRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );

      if (!focusable?.length) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      menuButton?.focus();
    };
  }, [menuOpen]);

  const closeOnLink = () => setMenuOpen(false);

  const clubLinks = [
    makeLink("Forest City", `/${locale}/discover`),
    makeLink("School & Jobs", `/${locale}/school-jobs`),
    makeLink(copy.about, `/${locale}/about-us`),
    makeLink(copy.lifestyle, `/${locale}/lifestyle`),
    makeLink(copy.hospitality, `/${locale}/hospitality`),
    makeLink(copy.community, `/${locale}/community-life`),
  ];

  const belongLinks = [
    makeLink(copy.membership, `/${locale}/become-a-member`),
    makeLink(copy.ambassadors, `/${locale}/ambassadors`),
    makeLink(copy.families, `/${locale}/families`),
    makeLink(copy.teams, `/${locale}/teams`),
  ];

  const buildLinks = [
    makeLink(({en:"Experiences",de:"Erlebnisse",es:"Experiencias",ca:"Experiències",fr:"Expériences",pt:"Experiências",it:"Esperienze"})[locale], `/${locale}/experiences`),
    makeLink("Host Company", `/${locale}/host-company`),
    makeLink(copy.brandService, `/${locale}/brand-as-a-service`),
  ];

  const connectLinks = [
    makeLink(copy.contact, `/${locale}/contact`),
    makeLink(copy.account, `/${locale}/account`),
    makeLink(copy.legal, `/${locale}/legal`),
    makeLink("Crays Association", "https://www.crays.org/"),
  ];

  const linkGroups = [clubLinks, belongLinks, buildLinks, connectLinks];

  return (
    <div className={`${tokens.theme} ${styles.site}`}>
      <a className={styles.skipLink} href={`#${mainId}`}>
        {copy.skip}
      </a>

      <header className={styles.header}>
        <Link className={styles.logoLink} href={`/${locale}`}>
          <Image
            alt="CRAYS"
            className={styles.logo}
            height={38}
            priority
            src="/brand/crays-logo-dark.svg"
            width={142}
          />
        </Link>

        <nav aria-label={copy.primaryNav} className={styles.headerNav}>
          <Link
            aria-current={isCurrent(`/${locale}/discover`) ? "page" : undefined}
            href={`/${locale}/discover`}
          >
            Forest City
          </Link>
          <Link
            aria-current={isCurrent(`/${locale}/community-life`) ? "page" : undefined}
            href={`/${locale}/community-life`}
          >
            {copy.community}
          </Link>
          <Link href={`/${locale}/school-jobs`}>
            School &amp; Jobs
          </Link>
          <Link
            aria-current={isCurrent(`/${locale}/ambassadors`) ? "page" : undefined}
            href={`/${locale}/ambassadors`}
          >
            {copy.ambassadors}
          </Link>
        </nav>

        <div className={styles.headerControls}>
          <Link
            className={styles.applyControl}
            href={`/${locale}/become-a-member`}
          >
            Apply
          </Link>
          <button
            aria-controls={menuId}
            aria-expanded={menuOpen}
            className={styles.menuControl}
            onClick={() => setMenuOpen(true)}
            ref={menuButtonRef}
            type="button"
          >
            <span>{copy.menu}</span>
            <Menu aria-hidden="true" size={23} strokeWidth={1.6} />
          </button>
          <Link className={styles.accountControl} href={`/${locale}/account`}>
            <UserRound aria-hidden="true" size={20} strokeWidth={1.6} />
            <span>{copy.account}</span>
          </Link>
          <button
            aria-controls={menuId}
            aria-expanded={menuOpen}
            aria-label={localeLabels[locale]}
            className={styles.localeIndicator}
            onClick={() => setMenuOpen(true)}
            type="button"
          >
            <Globe2 aria-hidden="true" size={20} strokeWidth={1.6} />
            <span>{locale.toUpperCase()}</span>
          </button>
        </div>
      </header>

      {menuOpen ? (
        <div
          aria-label={copy.primaryNav}
          aria-modal="true"
          className={styles.menuOverlay}
          id={menuId}
          ref={menuDialogRef}
          role="dialog"
        >
          <div className={styles.menuTop}>
            <Link
              className={styles.menuLogoLink}
              href={`/${locale}`}
              onClick={closeOnLink}
            >
              <Image
                alt="CRAYS"
                className={styles.menuLogo}
                height={38}
                src="/brand/crays-logo-dark.svg"
                width={142}
              />
            </Link>
            <button
              aria-label={copy.close}
              className={styles.closeControl}
              onClick={() => setMenuOpen(false)}
              ref={closeButtonRef}
              type="button"
            >
              <span>{copy.close}</span>
              <X aria-hidden="true" size={27} strokeWidth={1.6} />
            </button>
          </div>

          <div className={styles.menuBody}>
            <nav aria-label={copy.primaryNav} className={styles.menuNavigation}>
              {linkGroups.map((group, groupIndex) => (
                <div className={styles.menuLinkGroup} key={groupIndex}>
                  <span aria-hidden="true">0{groupIndex + 1}</span>
                  <div>
                    {group.map((item) => (
                      <Link
                        aria-current={item.current ? "page" : undefined}
                        href={item.href}
                        key={item.href}
                        onClick={closeOnLink}
                      >
                        <span>{item.label}</span>
                        <ArrowRight
                          aria-hidden="true"
                          size={19}
                          strokeWidth={1.5}
                        />
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </nav>

            <aside className={styles.menuAside}>
              <div className={styles.languageField} id="language-routes">
                {Object.entries(localeLabels).map(([code, label]) => (
                  <Link
                    aria-current={code === locale ? "page" : undefined}
                    href={routeForLocale(code)}
                    key={code}
                    lang={code}
                    onClick={closeOnLink}
                  >
                    <span>{code.toUpperCase()}</span>
                    <span>{label}</span>
                  </Link>
                ))}
              </div>

              <div className={styles.associationMenu}>
                <a
                  href="https://www.crays.org/"
                  rel="noreferrer noopener"
                  target="_blank"
                >
                  <span>
                    CRAYS Business Club Association
                    <small>{copy.associationNote}</small>
                  </span>
                  <ArrowUpRight
                    aria-hidden="true"
                    size={21}
                    strokeWidth={1.5}
                  />
                </a>
              </div>
            </aside>
          </div>
        </div>
      ) : null}

      {children}

      <ClubsPublicFooter locale={locale} />
    </div>
  );
}
