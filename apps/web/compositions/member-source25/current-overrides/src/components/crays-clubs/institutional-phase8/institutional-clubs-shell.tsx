"use client";
import { ClubsPublicFooter } from "../public/clubs-public-shell";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, ExternalLink, Globe2, Menu, UserRound, X } from "lucide-react";
import {
  CLUB_LOCALES,
  clubsHref,
  portfolioCompaniesCopy,
  type ClubsLocale,
} from "./portfolio-companies-content";
import tokens from "../public/clubs-public-design-tokens.module.css";
import styles from "./portfolio-companies-page.module.css";

type Props = { locale: ClubsLocale; children: ReactNode };
type NavLink = { label: string; href: string; current?: boolean };
const focusable = "a[href],button:not([disabled]),summary,[tabindex]:not([tabindex='-1'])";

export function InstitutionalClubsShell({ locale, children }: Props) {
  const [open, setOpen] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const copy = portfolioCompaniesCopy[locale].shell;

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    menuButtonRef.current?.focus();

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== "Tab" || !shellRef.current) return;
      const controls = Array.from(
        shellRef.current.querySelectorAll<HTMLElement>(focusable),
      ).filter(
        (element) =>
          !element.closest('[aria-hidden="true"]') &&
          element.offsetParent !== null,
      );
      if (!controls.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
      menuButtonRef.current?.focus();
    };
  }, [open]);

  const primary: NavLink[] = [
    { label: copy.links.forest, href: clubsHref(locale) + "/#forest-city" },
    { label: copy.links.community, href: clubsHref(locale, "/community-life") },
    { label: copy.links.school, href: clubsHref(locale) + "/#school-jobs" },
    { label: copy.links.ambassadors, href: clubsHref(locale, "/ambassadors") },
  ];

  const clubs: NavLink[] = [
    { label: copy.links.about, href: clubsHref(locale, "/about-us") },
    { label: copy.links.lifestyle, href: clubsHref(locale, "/lifestyle") },
    { label: copy.links.hospitality, href: clubsHref(locale, "/hospitality") },
    { label: copy.links.community, href: clubsHref(locale, "/community-life") },
  ];

  const belong: NavLink[] = [
    { label: copy.links.member, href: clubsHref(locale, "/become-a-member") },
    { label: copy.links.ambassadors, href: clubsHref(locale, "/ambassadors") },
    { label: copy.links.families, href: clubsHref(locale, "/families") },
    { label: copy.links.teams, href: clubsHref(locale, "/teams") },
  ];

  const build: NavLink[] = [
    { label: ({en:"Experiences",de:"Erlebnisse",es:"Experiencias",ca:"Experiències",fr:"Expériences",pt:"Experiências",it:"Esperienze"})[locale], href: clubsHref(locale, "/experiences") },
    { label: "Host Company", href: clubsHref(locale, "/host-company") },
    { label: copy.links.brand, href: clubsHref(locale, "/brand-as-a-service") },
  ];

  const connect: NavLink[] = [
    { label: copy.links.contact, href: clubsHref(locale, "/contact") },
    { label: copy.account, href: clubsHref(locale, "/account") },
    { label: "Legal", href: clubsHref(locale, "/legal") },
    { label: "www.craysclub.com", href: "https://www.craysclub.com/" },
  ];

  const groups = [clubs, belong, build, connect];

  const linkList = (links: NavLink[]) =>
    links.map((link) => (
      <a
        key={link.href}
        href={link.href}
        aria-current={link.current ? "page" : undefined}
        onClick={() => setOpen(false)}
      >
        <span>{link.label}</span>
        <ArrowRight aria-hidden="true" size={19} strokeWidth={1.6} />
      </a>
    ));

  return (
    <div
      ref={shellRef}
      className={`${tokens.theme} ${styles.siteShell}`}
      data-menu-open={open ? "true" : "false"}
    >
      <a className={styles.skipLink} href="#portfolio-main">{copy.skip}</a>

      <header className={styles.header}>
        <a className={styles.logoLink} href={clubsHref(locale)} aria-label={copy.home}>
          <img src="/__crays-clubs/assets/crays-club/logo.svg" width="170" height="43" alt="CRAYS" />
        </a>

        <nav className={styles.desktopNav} aria-label={copy.nav}>
          {primary.map((link) => <a key={link.href} href={link.href}>{link.label}</a>)}
        </nav>

        <div className={styles.headerTools}>
          <a className={styles.ownerApply} href={clubsHref(locale, "/become-a-member")}>
            Apply
          </a>

          <div className={styles.accountMenuCluster}>
            <button
              ref={menuButtonRef}
              type="button"
              aria-expanded={open}
              aria-controls="clubs-portfolio-menu"
              aria-label={open ? copy.close : copy.open}
              onClick={() => setOpen((value) => !value)}
            >
              <span>{open ? copy.close : copy.menu}</span>
              {open ? (
                <X aria-hidden="true" size={24} strokeWidth={1.4} />
              ) : (
                <Menu aria-hidden="true" size={24} strokeWidth={1.4} />
              )}
            </button>
            <a href={clubsHref(locale, "/account")} aria-label={copy.account}>
              <UserRound aria-hidden="true" size={22} strokeWidth={1.6} />
            </a>
          </div>

          <details className={styles.languageControl}>
            <summary aria-label={copy.language}>
              <Globe2 aria-hidden="true" size={18} strokeWidth={1.6} />
              <span>{locale.toUpperCase()}</span>
            </summary>
            <div>
              {CLUB_LOCALES.map((language) => (
                <a
                  key={language}
                  href={"/" + language}
                  hrefLang={language}
                  lang={language}
                  aria-current={language === locale ? "page" : undefined}
                >
                  {portfolioCompaniesCopy[language].shell.languageName}
                </a>
              ))}
            </div>
          </details>
        </div>
      </header>

      {open ? (
        <div
          id="clubs-portfolio-menu"
          className={styles.menuOverlay}
          role="dialog"
          aria-modal="true"
          aria-label={copy.title}
        >
          <div className={styles.menuIntro}>
            <p className={styles.eyebrow}>{copy.menu}</p>
            <h2>{copy.title}</h2>
            <p>{copy.lead}</p>
          </div>
          <div className={styles.menuColumns}>
            {groups.map((group, index) => (
              <nav aria-label={"0" + (index + 1)} key={index}>
                <p>0{index + 1}</p>
                {linkList(group)}
              </nav>
            ))}
          </div>
          <div className={styles.menuAssociation}>
            <div><span>{copy.associationLead}</span></div>
            <a
              href="https://www.crays.org/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={copy.association + ", " + copy.newTab}
            >
              <span>{copy.association}</span>
              <ExternalLink aria-hidden="true" size={18} strokeWidth={1.6} />
            </a>
          </div>
        </div>
      ) : null}

      <div aria-hidden={open ? "true" : undefined}>
        {children}
        <ClubsPublicFooter locale={locale} />
      </div>
    </div>
  );
}
