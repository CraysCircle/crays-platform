import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Montserrat } from "next/font/google";
import { ClubsPublicHomepage } from "./clubs-public-homepage";
import { ClubsPublicHomepageLocalized } from "./clubs-public-homepage-localized";
import {AccountEntry} from "./aws-shared-account/AccountEntry";
import {ClubsPublicShell} from "./clubs-public-shell";
import { ClubsAmbassadorBackofficePage } from "../ambassador/ambassador-backoffice-page";
import { getClubsCopy } from "@/lib/clubs/public-site-copy";
import { CLUBS_LOCALES, clubsCanonicalUrl, isPermittedClubsPublicHost, type ClubsLocale } from "@/lib/clubs/public-site";
import { clubsPageMetadata } from "@/lib/clubs/seo";

const clubsFont = Montserrat({ subsets: ["latin"], variable: "--font-clubs", display: "swap" });

async function assertClubsHost(): Promise<void> {
  const requestHeaders = await headers();
  if (!isPermittedClubsPublicHost(requestHeaders.get("host"))) notFound();
}

export function clubsMetadata(locale: ClubsLocale): Metadata {
  const title = locale === "de" ? "CRAYS Clubs | Forest City" : "CRAYS Clubs | Forest City Campus";
  return clubsPageMetadata(locale, "", {
    title,
    description: getClubsCopy(locale).hero.body,
    alternates: {
      canonical: clubsCanonicalUrl(locale),
      languages: Object.fromEntries(CLUBS_LOCALES.map((target) => [target, clubsCanonicalUrl(target)])),
    },
    openGraph: { title, description: getClubsCopy(locale).hero.body, url: clubsCanonicalUrl(locale), siteName: "CRAYS Clubs", type: "website" },
  });
}

export async function renderClubsHomepage(locale: ClubsLocale) {
  await assertClubsHost();
  return (
    <div className={clubsFont.variable}>
      {locale === "en" ? (
        <ClubsPublicHomepage locale={locale} copy={getClubsCopy(locale)} />
      ) : (
        <ClubsPublicHomepageLocalized locale={locale} />
      )}
    </div>
  );
}

export async function renderClubsAccount(locale: ClubsLocale) {
  await assertClubsHost();
  return <ClubsPublicShell availableLocales={CLUBS_LOCALES} headerTone="navy" locale={locale}><AccountEntry locale={locale} header={null} links={{login:"https://member.crays.world/auth/login",signup:"https://member.crays.world/auth/login?screen_hint=signup",team:"https://member.crays.world/work/auth/login"}}/></ClubsPublicShell>;
}

export async function renderClubsAmbassadorBackoffice(locale: ClubsLocale) {
  await assertClubsHost();
  return (
    <div className={clubsFont.variable}>
      <ClubsAmbassadorBackofficePage locale={locale} />
    </div>
  );
}
