import { PublicBankWebfront, bankFaq } from "@/components/public-bank-webfront";
import { buildFaqJsonLd, buildOrganizationJsonLd, buildPublicWebfrontMetadata, PUBLIC_WEBFRONT_ASSETS } from "@/lib/public-webfront-contract";

export const metadata = buildPublicWebfrontMetadata({
  path: "/funding-partner-bank",
  title: "Funding Partner Banks | CRAYS Gym",
  description: "Review the CRAYS underwriting evidence model, governance and controlled route into a relationship-scoped bank workspace.",
  image: PUBLIC_WEBFRONT_ASSETS.bank.hero,
  index: true,
});

export default function FundingPartnerBankPage() {
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildOrganizationJsonLd()) }} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildFaqJsonLd(bankFaq)) }} /><PublicBankWebfront /></>;
}
