import { clubsPageMetadata } from "@/lib/clubs/seo";
import type { Metadata } from "next";
import { ClubsAmbassadorDirectoryPage } from "../../../components/crays-clubs/public/clubs-ambassador-directory-page";
import { AMBASSADOR_DIRECTORY_COPY } from "../../../components/crays-clubs/public/clubs-ambassador-directory-copy";
import { CLUBS_LOCALES } from "../../../lib/clubs/public-site";

const copy = AMBASSADOR_DIRECTORY_COPY["ca"];
export const metadata: Metadata = clubsPageMetadata("ca", "ambassadors", {
  title: copy.metaTitle,
  description: copy.metaDescription,
}, { availableLocales: CLUBS_LOCALES });

export const dynamic = "force-dynamic";

export default function AmbassadorsRoute() {
  return <ClubsAmbassadorDirectoryPage locale="ca" />;
}

// Club data reads run near the existing Frankfurt data source; no project-wide region change.
export const preferredRegion = "fra1";
