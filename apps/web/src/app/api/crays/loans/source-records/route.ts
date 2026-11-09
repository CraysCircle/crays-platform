import type { NextRequest } from "next/server";
import {
  getLendingSourceReadSlice,
  getLendingSourceRecord,
  getLendingSourceRuntimeState,
  type LendingSourceEntity,
} from "@/lib/loans-operational-source-adapter";
import { OperationalSourceError, safeSourceError, sourceErrorHttpStatus } from "@/lib/operational-source-client";
import { requireLendingSourceRole } from "@/lib/lending-source-route-access";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const entityKeys = new Set<LendingSourceEntity>([
  "loan-products",
  "loan-applications",
  "loans",
  "disbursements",
  "repayments",
]);

function readLimit(raw: string | null) {
  if (!raw) return 10;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > 50) {
    throw new OperationalSourceError("SOURCE_REQUEST_REJECTED", 400, "Row limit must be between 1 and 50.");
  }
  return value;
}

function readEntity(raw: string | null) {
  if (!raw) return undefined;
  if (!entityKeys.has(raw as LendingSourceEntity)) {
    throw new OperationalSourceError("SOURCE_REQUEST_REJECTED", 400, "Record type is invalid.");
  }
  return raw as LendingSourceEntity;
}

function closedActions() {
  return {
    submitEnabled: false,
    disbursementWriteEnabled: false,
    repaymentWriteEnabled: false,
    paymentInitiationEnabled: false,
    cancellationEnabled: false,
    externalSendingEnabled: false,
  } as const;
}

export async function GET(request: NextRequest) {
  const access = await requireLendingSourceRole(request);
  if (!access.allowed) return access.response;

  const url = new URL(request.url);
  try {
    const entity = readEntity(url.searchParams.get("entity"));
    const recordId = url.searchParams.get("record")?.trim();
    if (recordId && !entity) {
      throw new OperationalSourceError("SOURCE_REQUEST_REJECTED", 400, "Record type is required for a record lookup.");
    }

    if (entity && recordId) {
      const record = await getLendingSourceRecord(entity, recordId);
      return Response.json({
        status: "ready",
        mode: "record",
        role: access.role,
        source: { connection: "live", owner: "Loans" },
        entity,
        record,
        ...closedActions(),
        secretsReturned: false,
      });
    }

    const readModel = await getLendingSourceReadSlice(readLimit(url.searchParams.get("limit")));
    return Response.json({
      status: "ready",
      mode: "workbench",
      role: access.role,
      readModel,
      ...closedActions(),
      secretsReturned: false,
    });
  } catch (error) {
    return Response.json(
      {
        status: "unavailable",
        role: access.role,
        source: getLendingSourceRuntimeState(),
        error: safeSourceError(error),
        ...closedActions(),
        secretsReturned: false,
      },
      { status: sourceErrorHttpStatus(error) },
    );
  }
}
