import { PublicVendorWebfront, vendorFaq } from "@/components/public-vendor-webfront";
import { buildFaqJsonLd, buildOrganizationJsonLd, buildPublicWebfrontMetadata, PUBLIC_WEBFRONT_ASSETS } from "@/lib/public-webfront-contract";

export const metadata = buildPublicWebfrontMetadata({ path: "/vendor", title: "Vendors | CRAYS Gym", description: "Explore the CRAYS Vendor network, project scopes, quality standards, handover requirements and controlled Vendor access.", image: PUBLIC_WEBFRONT_ASSETS.vendor.hero, index: true });

export default function VendorPage() {
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(buildOrganizationJsonLd())}}/><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(buildFaqJsonLd(vendorFaq))}}/><PublicVendorWebfront/></>;
}
