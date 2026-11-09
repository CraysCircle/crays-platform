"use client";
import type { HostCompanyLocale } from "./host-company-copy";
import { HostCompanyScreenOne } from "./host-company-screen-one";
export function ClubsHostCompanyPage({ locale }: { locale: HostCompanyLocale }) {
  return <HostCompanyScreenOne locale={locale} />;
}
