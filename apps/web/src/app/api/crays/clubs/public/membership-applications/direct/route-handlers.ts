import "server-only";

import { readDirectMembershipApplicationPublicConfiguration } from "@/db/clubs-direct-membership-application-repository";
import {
  DIRECT_MEMBERSHIP_APPLICATION_FIELDS,
  DIRECT_MEMBERSHIP_APPLICATION_PUBLIC_COPY,
  DIRECT_MEMBERSHIP_APPLICATION_UI_CONTRACT,
} from "@/lib/clubs/direct-membership-application-contract";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = { "cache-control": "no-store" };

export type DirectMembershipApplicationPublicRouteDependencies = {
  readConfiguration: typeof readDirectMembershipApplicationPublicConfiguration;
};

const defaults: DirectMembershipApplicationPublicRouteDependencies = {
  readConfiguration: readDirectMembershipApplicationPublicConfiguration,
};

export async function handleDirectMembershipApplicationPublicGet(
  deps: DirectMembershipApplicationPublicRouteDependencies = defaults,
) {
  try {
    return Response.json(await deps.readConfiguration(), { headers: noStore });
  } catch {
    return Response.json(
      {
        schema: DIRECT_MEMBERSHIP_APPLICATION_UI_CONTRACT.schema,
        version: DIRECT_MEMBERSHIP_APPLICATION_UI_CONTRACT.version,
        status: "temporarily_unavailable",
        submissionEnabled: false,
        fields: DIRECT_MEMBERSHIP_APPLICATION_FIELDS,
        copy: DIRECT_MEMBERSHIP_APPLICATION_PUBLIC_COPY,
        authorities: {
          application: false,
          membership: false,
          propertyAdmission: false,
          availability: false,
          quote: false,
          booking: false,
          payment: false,
          revenueEntitlement: false,
        },
      },
      { status: 503, headers: noStore },
    );
  }
}

export async function GET() {
  return handleDirectMembershipApplicationPublicGet();
}
