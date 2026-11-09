import translations from "./homepage-current-translation.json";
import evolution from "./homepage-evolution-copy.json";
import type { CraysPublicLocale } from "./clubs-public-locale-contract";
export type HomepageTranslationLocale = Exclude<CraysPublicLocale, "en">;
export function currentHomepageTranslator(locale: HomepageTranslationLocale) {
  const copy: Readonly<Record<string, string>> = translations[locale];
  if (!copy) throw new Error("Missing homepage locale: " + locale);
  return (source: string): string => {
    if (!Object.prototype.hasOwnProperty.call(copy, source)) throw new Error("Missing homepage translation: " + locale + ": " + source);
    return copy[source];
  };
}
export function getHomepageEvolutionCopy(locale: CraysPublicLocale) {
  const copy = evolution[locale];
  if (!copy) throw new Error("Missing homepage evolution locale: " + locale);
  return copy;
}
