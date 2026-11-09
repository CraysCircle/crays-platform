import { CLUBS_OPERATING_ENTITY } from "@/lib/clubs/operating-entity";
import type { ReactNode } from "react";
import Script from "next/script";

import {
  CLUBS_SEO_ORIGIN,
  CLUBS_HOME_SOCIAL_IMAGE,
} from "@/lib/clubs/seo";
import type { ClubsLocale } from "@/lib/clubs/public-site";

const sameAs = [
  "https://github.com/CraysCircle",
  "https://x.com/CraysCircle",
  "https://www.youtube.com/@CraysCircle",
  "https://www.linkedin.com/company/crays/",
  "https://www.instagram.com/crays_circle/",
  "https://www.reddit.com/r/Crays/",
  "https://t.me/craysclub",
  "https://www.crays.org/",
  "https://www.crays.net/",
];

function jsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function ClubsSeoScope({
  children,
  locale,
}: Readonly<{ children: ReactNode; locale: ClubsLocale }>) {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${CLUBS_SEO_ORIGIN}/#organization`,
        name: "CRAYS Clubs",
        alternateName: "Crays Club",
        legalName: CLUBS_OPERATING_ENTITY.name,
        address: {
          "@type": "PostalAddress",
          streetAddress: CLUBS_OPERATING_ENTITY.streetAddress,
          addressLocality: CLUBS_OPERATING_ENTITY.locality,
          postalCode: CLUBS_OPERATING_ENTITY.postalCode,
          addressCountry: "SG",
        },
        url: CLUBS_SEO_ORIGIN,
        logo: {
          "@type": "ImageObject",
          url: `${CLUBS_SEO_ORIGIN}/favicon.png`,
          width: 256,
          height: 256,
        },
        image: CLUBS_HOME_SOCIAL_IMAGE,
        sameAs,
      },
      {
        "@type": "WebSite",
        "@id": `${CLUBS_SEO_ORIGIN}/#website-${locale}`,
        url: `${CLUBS_SEO_ORIGIN}/${locale}`,
        name: "CRAYS Clubs",
        inLanguage: locale,
        publisher: { "@id": `${CLUBS_SEO_ORIGIN}/#organization` },
      },
    ],
  };

  return (
    <>
      <Script id={`crays-document-language-${locale}`} strategy="afterInteractive">
        {`document.documentElement.lang=${JSON.stringify(locale)};`}
      </Script>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }}
      />
      {children}
    </>
  );
}
