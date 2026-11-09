"use client";

import type { ReactNode } from "react";

import type { FamiliesShellCopy } from "./families-copy";
import { JourneyShell } from "./journey-shell";
import {
  navigationLabels,
  portfolioCompaniesCopy,
  type PortfolioLocale,
} from "./portfolio-companies-content";

type Props = {
  locale: PortfolioLocale;
  children: ReactNode;
};

const shellMeta: Record<
  PortfolioLocale,
  Pick<
    FamiliesShellCopy,
    "primaryNav" | "footerNav" | "associationNote" | "siteNote"
  >
> = {
  en: {
    primaryNav: "Primary navigation",
    footerNav: "Footer navigation",
    associationNote: "Opens the independent association website",
    siteNote: "Official Clubs website: www.craysclub.com",
  },
  de: {
    primaryNav: "Hauptnavigation",
    footerNav: "Footer-Navigation",
    associationNote: "Oeffnet die Website des unabhaengigen Vereins",
    siteNote: "Offizielle Clubs-Website: www.craysclub.com",
  },
  es: {
    primaryNav: "Navegacion principal",
    footerNav: "Navegacion del pie",
    associationNote: "Abre el sitio de la asociacion independiente",
    siteNote: "Sitio oficial de Clubs: www.craysclub.com",
  },
  ca: {
    primaryNav: "Navegacio principal",
    footerNav: "Navegacio del peu",
    associationNote: "Obre el web de l'associacio independent",
    siteNote: "Web oficial de Clubs: www.craysclub.com",
  },
  fr: {
    primaryNav: "Navigation principale",
    footerNav: "Navigation du pied de page",
    associationNote: "Ouvre le site de l'association independante",
    siteNote: "Site officiel de Clubs : www.craysclub.com",
  },
  pt: {
    primaryNav: "Navegacao principal",
    footerNav: "Navegacao do rodape",
    associationNote: "Abre o site da associacao independente",
    siteNote: "Site oficial de Clubs: www.craysclub.com",
  },
  it: {
    primaryNav: "Navigazione principale",
    footerNav: "Navigazione del footer",
    associationNote: "Apre il sito dell'associazione indipendente",
    siteNote: "Sito ufficiale Clubs: www.craysclub.com",
  },
};

function sharedCopy(locale: PortfolioLocale): FamiliesShellCopy {
  const labels = navigationLabels[locale];
  const page = portfolioCompaniesCopy[locale];

  return {
    skip: page.ui.skip,
    menu: page.ui.menu,
    close: page.ui.close,
    primaryNav: shellMeta[locale].primaryNav,
    footerNav: shellMeta[locale].footerNav,
    about: labels.about,
    lifestyle: labels.lifestyle,
    hospitality: labels.hospitality,
    community: labels.communityLife,
    families: labels.families,
    teams: labels.teams,
    events: labels.events,
    companies: labels.portfolio,
    conference: labels.conference,
    ambassadors: labels.ambassadors,
    membership: labels.member,
    contact: labels.contact,
    brandService: labels.brand,
    account: labels.account,
    legal: labels.legal,
    association: "CRAYS Business Club Association",
    associationNote: shellMeta[locale].associationNote,
    footerLine: page.footer.line,
    siteNote: shellMeta[locale].siteNote,
  };
}

export function InstitutionalClubsShell({ locale, children }: Props) {
  return (
    <JourneyShell locale={locale} copy={sharedCopy(locale)}>
      {children}
    </JourneyShell>
  );
}
