"use client";
import { ClubsPublicShell } from "./clubs-public-shell";
import "./forest-screen-two.css";
import { TodayForest } from "./today-approved-pages";
import { CLUBS_LOCALES, type ClubsLocale } from "@/lib/clubs/public-site";
import { TodayLocaleProvider, type TodayMessages } from "./today-localized-content";
export function ClubsTodayForestCityPage({locale = "en", messages = {}}: {locale?: ClubsLocale; messages?: TodayMessages}) {
 return <ClubsPublicShell availableLocales={CLUBS_LOCALES} locale={locale}><TodayLocaleProvider locale={locale} messages={messages}><div className="forest-refresh"><TodayForest /></div></TodayLocaleProvider></ClubsPublicShell>;
}
