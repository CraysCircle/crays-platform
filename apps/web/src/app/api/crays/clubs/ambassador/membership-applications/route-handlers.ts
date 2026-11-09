import "server-only";

import { NextRequest } from "next/server";

import {
  resolveExactClubsAmbassadorB2bBootstrap,
} from "@/app/api/crays/clubs/ambassador/b2b-entitlement/route-handlers";
import { validClubsAmbassadorOperationsHost } from "@/app/api/crays/clubs/ambassador/operations/route-handlers";
import {
  ClubsAmbassadorDirectInboxAuthorityError,
  ClubsAmbassadorDirectInboxCrossAmbassadorError,
  ClubsAmbassadorDirectInboxNotFoundError,
  ClubsAmbassadorDirectInboxValidationError,
  readClubsAmbassadorDirectInboxDetail,
  readClubsAmbassadorDirectInboxQueue,
} from "@/db/clubs-ambassador-direct-membership-application-inbox-repository";
import {
  CLUBS_AMBASSADOR_DIRECT_MEMBERSHIP_APPLICATION_INBOX_CONTRACT,
  unavailableClubsAmbassadorDirectInbox,
} from "@/lib/clubs/ambassador-direct-membership-application-inbox-contract";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = { "cache-control": "no-store" };

type BootstrapResolution = Awaited<
  ReturnType<typeof resolveExactClubsAmbassadorB2bBootstrap>
>;

export type ClubsAmbassadorDirectInboxRouteDependencies = {
  validHost: typeof validClubsAmbassadorOperationsHost;
  resolveBootstrap: (request: NextRequest) => Promise<BootstrapResolution>;
  readQueue: typeof readClubsAmbassadorDirectInboxQueue;
  readDetail: typeof readClubsAmbassadorDirectInboxDetail;
};

const defaults: ClubsAmbassadorDirectInboxRouteDependencies = {
  validHost: validClubsAmbassadorOperationsHost,
  resolveBootstrap: resolveExactClubsAmbassadorB2bBootstrap,
  readQueue: readClubsAmbassadorDirectInboxQueue,
  readDetail: readClubsAmbassadorDirectInboxDetail,
};

function errorNamed(error: unknown, name: string) {
  return (
    error instanceof Error &&
    (error.name === name || error.constructor.name === name)
  );
}

export async function handleClubsAmbassadorDirectInboxGet(
  request: NextRequest,
  deps: ClubsAmbassadorDirectInboxRouteDependencies = defaults,
) {
  if (!deps.validHost(request)) {
    return Response.json(
      { status: "preview_host_required" },
      { status: 404, headers: noStore },
    );
  }

  let bootstrap: BootstrapResolution;
  try {
    bootstrap = await deps.resolveBootstrap(request);
  } catch {
    return Response.json(unavailableClubsAmbassadorDirectInbox(), {
      status: 503,
      headers: noStore,
    });
  }
  if (bootstrap.status === "b2c_rejected") {
    return Response.json(
      { status: "wrong_vertical_session" },
      { status: 403, headers: noStore },
    );
  }
  if (bootstrap.status !== "ready") {
    return Response.json(unavailableClubsAmbassadorDirectInbox(), {
      status: 503,
      headers: noStore,
    });
  }

  const references = request.nextUrl.searchParams.getAll("reviewReference");
  if (
    references.length > 1 ||
    (references[0] !== undefined &&
      !/^cclub-review-[a-f0-9]{32}$/.test(references[0]))
  ) {
    return Response.json(
      {
        schema:
          CLUBS_AMBASSADOR_DIRECT_MEMBERSHIP_APPLICATION_INBOX_CONTRACT.schema,
        version:
          CLUBS_AMBASSADOR_DIRECT_MEMBERSHIP_APPLICATION_INBOX_CONTRACT.version,
        status: "validation_error",
      },
      { status: 400, headers: noStore },
    );
  }

  try {
    const payload = references[0]
      ? await deps.readDetail(bootstrap.evidence, references[0])
      : await deps.readQueue(bootstrap.evidence);
    return Response.json(payload, { headers: noStore });
  } catch (error) {
    if (
      error instanceof ClubsAmbassadorDirectInboxCrossAmbassadorError ||
      errorNamed(error, "ClubsAmbassadorDirectInboxCrossAmbassadorError")
    ) {
      return Response.json(
        { status: "cross_ambassador_denied" },
        { status: 403, headers: noStore },
      );
    }
    if (
      error instanceof ClubsAmbassadorDirectInboxNotFoundError ||
      errorNamed(error, "ClubsAmbassadorDirectInboxNotFoundError")
    ) {
      return Response.json(
        { status: "not_found" },
        { status: 404, headers: noStore },
      );
    }
    if (
      error instanceof ClubsAmbassadorDirectInboxAuthorityError ||
      errorNamed(error, "ClubsAmbassadorDirectInboxAuthorityError")
    ) {
      return Response.json(
        { status: "entitlement_denied" },
        { status: 403, headers: noStore },
      );
    }
    if (
      error instanceof ClubsAmbassadorDirectInboxValidationError ||
      errorNamed(error, "ClubsAmbassadorDirectInboxValidationError")
    ) {
      return Response.json(
        { status: "validation_error" },
        { status: 400, headers: noStore },
      );
    }
    return Response.json(unavailableClubsAmbassadorDirectInbox(), {
      status: 503,
      headers: noStore,
    });
  }
}

export async function GET(request: NextRequest) {
  return handleClubsAmbassadorDirectInboxGet(request);
}
