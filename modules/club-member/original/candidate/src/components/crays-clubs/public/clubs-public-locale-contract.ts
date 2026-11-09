import {
  CLUBS_LOCALES,
  CLUBS_PUBLIC_RUNTIME_CONTRACT,
  clubsCanonicalUrl,
  clubsPath,
  isClubsLocale,
  type ClubsLocale,
} from "../../../lib/clubs/public-site";

export const CRAYS_PUBLIC_LOCALES = CLUBS_LOCALES;
export type CraysPublicLocale = ClubsLocale;

export const CRAYS_DEFAULT_LOCALE: CraysPublicLocale = "en";

export const CRAYS_LOCALE_META: Readonly<
  Record<
    CraysPublicLocale,
    Readonly<{
      languageName: string;
      htmlLang: string;
      hreflang: string;
    }>
  >
> = {
  en: { languageName: "English", htmlLang: "en", hreflang: "en" },
  de: { languageName: "Deutsch", htmlLang: "de", hreflang: "de" },
  es: { languageName: "Español", htmlLang: "es", hreflang: "es" },
  ca: { languageName: "Català", htmlLang: "ca", hreflang: "ca" },
  fr: { languageName: "Français", htmlLang: "fr", hreflang: "fr" },
  pt: { languageName: "Português", htmlLang: "pt", hreflang: "pt" },
  it: { languageName: "Italiano", htmlLang: "it", hreflang: "it" },
};

export const CRAYS_TRANSLATION_QA_CONTRACT = Object.freeze({
  fallbackPolicy: "No silent English fallback on a released localized route.",
  legalPolicy: "Exact registered legal copy wins over editorial rewriting.",
  legacyPolicy: "LEGACY-1:1 pages retain their registered source meaning and completeness.",
  ownerCopyPolicy: "Owner-approved copy is translated only after the English source is locked.",
  reviewPolicy: "Human language review is required before a locale/page receipt is passed.",
  visualPolicy: "Each locale is checked for wrapping, overflow, hierarchy and CTA readability.",
});

const canonicalOrigin = `https://${CLUBS_PUBLIC_RUNTIME_CONTRACT.canonicalHost}`;

function routeWithoutLocale(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] && isClubsLocale(segments[0])) {
    segments.shift();
  }
  return segments.join("/");
}

export function localizeClubsHref(
  targetLocale: CraysPublicLocale,
  currentHref: string,
): string {
  const parsed = new URL(currentHref || "/", canonicalOrigin);

  if (parsed.origin !== canonicalOrigin) {
    return currentHref;
  }

  const localizedPath = clubsPath(
    targetLocale,
    routeWithoutLocale(parsed.pathname),
  );

  return `${localizedPath}${parsed.search}${parsed.hash}`;
}

export function clubsLanguageAlternates(
  route: string,
  availableLocales: readonly CraysPublicLocale[],
) {
  const normalizedRoute = routeWithoutLocale(route);
  const languages: Record<string, string> = Object.fromEntries(
    availableLocales.map((locale) => [
      CRAYS_LOCALE_META[locale].hreflang,
      clubsCanonicalUrl(locale, normalizedRoute),
    ]),
  );

  const defaultLocale = availableLocales.includes(CRAYS_DEFAULT_LOCALE)
    ? CRAYS_DEFAULT_LOCALE
    : availableLocales[0];

  if (defaultLocale) {
    languages["x-default"] = clubsCanonicalUrl(
      defaultLocale,
      normalizedRoute,
    );
  }

  return languages;
}

export function clubsCanonicalAndAlternates(
  locale: CraysPublicLocale,
  route: string,
  availableLocales: readonly CraysPublicLocale[],
) {
  const normalizedRoute = routeWithoutLocale(route);
  return {
    canonical: clubsCanonicalUrl(locale, normalizedRoute),
    languages: clubsLanguageAlternates(normalizedRoute, availableLocales),
  } as const;
}

export function getClubsLocaleSwitches(
  currentHref: string,
  currentLocale: CraysPublicLocale,
  availableLocales: readonly CraysPublicLocale[],
) {
  return availableLocales.map((locale) => ({
    current: locale === currentLocale,
    href: localizeClubsHref(locale, currentHref),
    hreflang: CRAYS_LOCALE_META[locale].hreflang,
    htmlLang: CRAYS_LOCALE_META[locale].htmlLang,
    label: CRAYS_LOCALE_META[locale].languageName,
    locale,
  }));
}

export function assertCompleteClubsLocaleRecord<T>(
  record: Partial<Record<CraysPublicLocale, T>>,
  label: string,
): asserts record is Record<CraysPublicLocale, T> {
  const missing = CRAYS_PUBLIC_LOCALES.filter(
    (locale) => record[locale] === undefined,
  );

  if (missing.length) {
    throw new Error(
      `${label} is missing CRAYS Clubs locales: ${missing.join(", ")}`,
    );
  }
}
