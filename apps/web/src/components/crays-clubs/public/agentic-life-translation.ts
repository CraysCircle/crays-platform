import translations from "./agentic-life-translation.json";
import type { CraysPublicLocale } from "./clubs-public-locale-contract";
export const AGENTIC_LIFE_LOCALES = ["en", "de", "es", "ca", "fr", "pt", "it"] as const;
export function agenticLifeTranslator(locale: CraysPublicLocale) {
 const copy: Readonly<Record<string, string>> = translations[locale];
 if (!copy) throw new Error("Unsupported Agentic Life locale");
 return (source: string): string => {
  if (!Object.prototype.hasOwnProperty.call(copy, source)) throw new Error(`Missing Agentic Life translation: ${locale}: ${source}`);
  return copy[source];
 };
}
