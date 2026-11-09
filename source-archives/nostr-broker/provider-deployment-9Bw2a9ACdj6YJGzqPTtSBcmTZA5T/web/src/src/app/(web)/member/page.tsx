import {
  memberFaq,
  PublicMemberWebfront,
} from "@/components/public-member-webfront";
import {
  buildFaqJsonLd,
  buildOrganizationJsonLd,
  buildPublicWebfrontMetadata,
  PUBLIC_WEBFRONT_ASSETS,
} from "@/lib/public-webfront-contract";
import {
  memberPublicPlans,
  type MemberPublicPlanKey,
} from "@/lib/member-public-offer-contract";

export const metadata = buildPublicWebfrontMetadata({
  path: "/member",
  title: "Membership and Training | CRAYS Gym",
  description:
    "Explore the CRAYS Member experience, training, classes, support and controlled customer-area access.",
  image: PUBLIC_WEBFRONT_ASSETS.member.hero,
  index: true,
});

export default async function MemberPage({
  searchParams,
}: {
  searchParams: Promise<{ join?: string; plan?: string }>;
}) {
  const query = await searchParams;
  const bookingPlan =
    query.plan && query.plan in memberPublicPlans
      ? (query.plan as MemberPublicPlanKey)
      : null;
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildOrganizationJsonLd()),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildFaqJsonLd(memberFaq)),
        }}
      />
      <PublicMemberWebfront
        bookingOpen={query.join === "member"}
        bookingPlan={bookingPlan}
      />
    </>
  );
}
