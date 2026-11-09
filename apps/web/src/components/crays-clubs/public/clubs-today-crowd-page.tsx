"use client";
import { ClubsPublicShell } from "./clubs-public-shell";
import { TodayCrowd } from "./today-approved-pages";
import { CLUBS_LOCALES, type ClubsLocale } from "@/lib/clubs/public-site";
import { TodayLocaleProvider, type TodayMessages } from "./today-localized-content";
export function ClubsTodayCrowdPage({locale = "en", messages = {}}: {locale?: ClubsLocale; messages?: TodayMessages}) {
 return <ClubsPublicShell availableLocales={CLUBS_LOCALES} locale={locale}><TodayLocaleProvider locale={locale} messages={messages}><TodayCrowd /></TodayLocaleProvider></ClubsPublicShell>;
}
