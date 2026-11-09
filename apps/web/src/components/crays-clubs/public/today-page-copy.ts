import "server-only";
import type { ClubsLocale } from "@/lib/clubs/public-site";
import { clubsPageMetadata } from "@/lib/clubs/seo";
import type { TodayMessages } from "./today-localized-content";

export async function todayMessages(locale: ClubsLocale): Promise<TodayMessages> {
  if (locale === "en") return {};
  const loaders = {
    de: () => import("./today-locales/de.json"),
    fr: () => import("./today-locales/fr.json"),
    es: () => import("./today-locales/es.json"),
    ca: () => import("./today-locales/ca.json"),
    pt: () => import("./today-locales/pt.json"),
    it: () => import("./today-locales/it.json"),
  };
  return (await loaders[locale]()).default;
}
export async function todayMetadata(locale: ClubsLocale, route: "forest-city" | "this-your-kinda-crowd") {
  const messages = await todayMessages(locale);
  const t = (key: string) => messages[key] ?? key;
  const forest = route === "forest-city";
  const title = forest ? `Forest City | ${t("Your next chapter,").replace(/,$/, "")} | CRAYS` : `${t("A complete ecosystem for ambitious people.")} | CRAYS`;
  const description = t(forest ? "Live, work, create and connect by the sea." : "A global community, real opportunities, and the place to build a bigger tomorrow — together.");
  const metadata = clubsPageMetadata(locale, route === "forest-city" ? "discover" : route, { title, description });
  return metadata;
}
