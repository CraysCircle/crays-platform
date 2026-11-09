import "server-only";

import {
  isCustomerProjectionAuthorityError,
} from "./canonical-vendure-customer-projection-repository";
import {
  isHistoricalOrderSnapshotRecoveryError,
  recoverHistoricalOrderSnapshotReceipt,
} from "./historical-order-snapshot-recovery";
import {
  isHistoricalOrderSnapshotProviderError,
} from "./vendure-historical-order-snapshot-provider";
import type { KdsDatabase } from "@/store-operations/kds";
import type { HistoricalOrderSnapshotProvider } from
  "./historical-order-snapshot-recovery";

const ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{2,199}$/;
const VERTICALS = ["coffee", "retail", "gym", "clubs"] as const;
const headers = { "cache-control": "private, no-store" };

type Recovery = typeof recoverHistoricalOrderSnapshotReceipt;

export async function handleHistoricalOrderSnapshotRecoveryRequest(
  request: Request,
  dependencies: Readonly<{
    database: KdsDatabase;
    provider: HistoricalOrderSnapshotProvider;
    resolveAuthority: (request: Request) => Promise<Readonly<{
      authoritySource: string;
      accountId: string | null;
    }>>;
    recover?: Recovery;
  }>,
): Promise<Response> {
  if (Number(request.headers.get("content-length") ?? "0") > 4_096) {
    return Response.json({ status: "invalid", reason: "Recovery request is too large." },
      { status: 413, headers });
  }
  const authority = await dependencies.resolveAuthority(request);
  if (authority.authoritySource !== "auth0-crays-session" || !authority.accountId) {
    return Response.json({ status: "forbidden", reason: "A mapped CRAYS session is required." },
      { status: 403, headers });
  }
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const keys = body ? Object.keys(body).sort() : [];
  const admittedKeys = [
    "expectedAssignmentVersion", "expectedProjectionVersion", "orderCode",
    "storeId", "verticalRoot",
  ];
  const validOptionalVersion = (value: unknown) => value === undefined ||
    (Number.isSafeInteger(value) && Number(value) >= 1);
  if (
    !body || keys.some((key) => !admittedKeys.includes(key)) ||
    typeof body.verticalRoot !== "string" ||
    !VERTICALS.includes(body.verticalRoot as (typeof VERTICALS)[number]) ||
    typeof body.storeId !== "string" || !ID.test(body.storeId) ||
    typeof body.orderCode !== "string" || !ID.test(body.orderCode) ||
    !validOptionalVersion(body.expectedAssignmentVersion) ||
    !validOptionalVersion(body.expectedProjectionVersion)
  ) {
    return Response.json({ status: "invalid", reason: "Check the recovery scope and try again." },
      { status: 400, headers });
  }
  try {
    const receipt = await (dependencies.recover ?? recoverHistoricalOrderSnapshotReceipt)(
      dependencies.database,
      dependencies.provider,
      {
        canonicalAccountId: authority.accountId,
        verticalRoot: body.verticalRoot as (typeof VERTICALS)[number],
        storeId: body.storeId,
        orderCode: body.orderCode,
        expectedAssignmentVersion: body.expectedAssignmentVersion as number | undefined,
        expectedProjectionVersion: body.expectedProjectionVersion as number | undefined,
      },
    );
    return Response.json({
      status: "ready",
      receipt: {
        orderCode: receipt.orderCode,
        providerOrderId: receipt.providerOrderId,
        snapshotId: receipt.snapshotId,
        snapshotSha256: receipt.snapshotSha256,
        commandId: receipt.commandId,
        commandState: receipt.commandState,
        eventId: receipt.eventId,
        eventType: receipt.eventType,
      },
      boundaries: {
        canonicalAccountResolvedServerSide: true,
        providerScopeResolvedServerSide: true,
        sellerSnapshotBodyExposed: false,
        mutationPerformed: false,
      },
    }, { status: 200, headers });
  } catch (error) {
    if (
      isCustomerProjectionAuthorityError(error) ||
      isHistoricalOrderSnapshotRecoveryError(error) ||
      isHistoricalOrderSnapshotProviderError(error, "rejected")
    ) {
      return Response.json({ status: "not_found", reason: "No authorized historical receipt was found." },
        { status: 404, headers });
    }
    return Response.json({ status: "unavailable", reason: "Historical receipt recovery is temporarily unavailable." },
      { status: 503, headers });
  }
}
