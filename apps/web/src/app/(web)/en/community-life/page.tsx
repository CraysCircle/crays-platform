import { clubsPageMetadata } from "@/lib/clubs/seo";
import type { Metadata } from "next";
import { ClubsCommunityLifePageEn } from "../../../../components/crays-clubs/public/clubs-community-life-page-en";

const pageTitle = "Community Life | Crays Clubs";
const pageDescription =
  "Crays Community Life connects work, living, culture and global citizenship inside real-world club spaces.";
const canonicalUrl = "https://www.craysclub.com/en/community-life";
const socialImage =
  "https://www.craysclub.com/assets/crays-seo/community-life-crays-real-estate-and-hospitality-setting-01.jpg";

export const metadata: Metadata = clubsPageMetadata("en", "community-life", {
  title: pageTitle,
  description: pageDescription,
  alternates: {
    canonical: canonicalUrl,
  },
  openGraph: {
    title: pageTitle,
    description:
      "A clear Crays Club community page for work, live, play and global citizen culture.",
    type: "website",
    url: canonicalUrl,
    siteName: "Crays Clubs",
    images: [
      {
        url: socialImage,
        secureUrl: socialImage,
        type: "image/jpeg",
        width: 1600,
        height: 1067,
        alt: "Crays real estate and hospitality setting",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: pageTitle,
    description: pageDescription,
    images: [
      {
        url: socialImage,
        alt: "Crays real estate and hospitality setting",
      },
    ],
  },
});

export default function CommunityLifePage() {
  return <ClubsCommunityLifePageEn />;
}
