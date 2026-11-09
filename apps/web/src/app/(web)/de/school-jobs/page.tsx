import { clubsPageMetadata } from "@/lib/clubs/seo";
import type { Metadata } from "next";
import { SchoolJobsPublicPage } from "@/components/crays-clubs/public/school-jobs-public-page";
import { getSchoolJobsPublicContent } from "@/components/crays-clubs/public/school-jobs-public-copy";

const locale = "de" as const;
const content = getSchoolJobsPublicContent(locale);

export const metadata: Metadata = clubsPageMetadata("de", "school-jobs", {
  title: content.metaTitle,
  description: content.metaDescription
});

export default function SchoolJobsPage() {
  return <SchoolJobsPublicPage locale={locale} />;
}

