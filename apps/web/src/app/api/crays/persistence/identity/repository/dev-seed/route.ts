import { NextRequest } from "next/server";
import {
  createDevelopmentIdentitySeedInput,
  getIdentityBundleByProviderSubject,
  upsertCoreIdentity,
} from "@/db/core-identity-repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function canRunDevSeed() {
  return process.env.NODE_ENV !== "production" && process.env.CRAYS_ENABLE_DEV_IDENTITY_SEED === "true";
}

export async function POST(request: NextRequest) {
  if (!canRunDevSeed()) {
    return Response.json(
      {
        status: "disabled",
        reason: "Development identity seed is disabled.",
      },
      { status: 403 },
    );
  }

  if (request.nextUrl.searchParams.get("confirm") !== "seed-dev-identity") {
    return Response.json(
      {
        status: "confirmation_required",
        reason: "Add ?confirm=seed-dev-identity to run the development seed.",
      },
      { status: 400 },
    );
  }

  const domain = process.env.CRAYS_NIP05_DOMAIN || "crays.net";
  const bundle = await upsertCoreIdentity(createDevelopmentIdentitySeedInput(domain));
  const lookup = await getIdentityBundleByProviderSubject("auth0-dev", "dev|candidate-001");

  return Response.json({
    status: "seeded",
    accountId: bundle?.account.account_id,
    craysId: bundle?.account.crays_id,
    providerLookupReady: Boolean(lookup),
    roleAssignments: bundle?.roleAssignments.length ?? 0,
    memberships: bundle?.memberships.length ?? 0,
    nostrBound: Boolean(bundle?.nostrIdentity),
    secretsReturned: false,
    privateKeysReturned: false,
  });
}
