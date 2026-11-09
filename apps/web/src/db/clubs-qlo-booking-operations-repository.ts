import "server-only";

import { readTeamBookingRequestQueue } from "@/db/clubs-booking-request-repository";
import {
  readTeamBookingChangeRequestQueue,
  readTeamBookingLifecycleQueue,
} from "@/db/clubs-booking-lifecycle-repository";
import {
  projectSafeTeamBookingChangeRequest,
  projectSafeTeamBookingLifecycle,
  projectSafeTeamBookingRequest,
} from "@/lib/clubs/team-booking-operations-contract";
import {
  type ClubsQloBookingAssurance,
  type ClubsQloBookingOperation,
  type ClubsQloBookingOperationKind,
  projectQloBookingChangeRequest,
  projectQloBookingLifecycle,
  projectQloBookingRequest,
} from "@/lib/clubs/qlo-booking-operations-contract";

export type ReadQloBookingOperationsInput = Readonly<{
  accountId: string;
  tenantSessionId: string;
  organizationId: string;
  roleKey: "holiday-manager" | "crays-management" | "admin";
  assuranceLevel: ClubsQloBookingAssurance;
  selector?: Readonly<{
    kind: ClubsQloBookingOperationKind;
    reference: string;
  }> | null;
}>;

function isOperation(
  value: ClubsQloBookingOperation | null,
): value is ClubsQloBookingOperation {
  return value !== null;
}

export async function readQloBookingOperations(
  input: ReadQloBookingOperationsInput,
) {
  const authorization = {
    accountId: input.accountId,
    tenantSessionId: input.tenantSessionId,
    organizationId: input.organizationId,
    roleKey: input.roleKey,
  };
  const [requestRows, lifecycleRows, changeRows] = await Promise.all([
    readTeamBookingRequestQueue(authorization),
    readTeamBookingLifecycleQueue(authorization),
    readTeamBookingChangeRequestQueue(authorization),
  ]);

  const candidates = [
    ...requestRows.map((row) =>
      projectQloBookingRequest(
        projectSafeTeamBookingRequest(row),
        input.assuranceLevel,
      ),
    ),
    ...lifecycleRows.map((row) =>
      projectQloBookingLifecycle(
        projectSafeTeamBookingLifecycle(row),
        input.assuranceLevel,
      ),
    ),
    ...changeRows.map((row) =>
      projectQloBookingChangeRequest(
        projectSafeTeamBookingChangeRequest(row),
        input.assuranceLevel,
      ),
    ),
  ];
  const safeOperations = candidates.filter(isOperation);
  const omittedUnsafeRecords = candidates.length - safeOperations.length;
  const selected = input.selector
    ? safeOperations.filter((operation) =>
        operation.kind === input.selector?.kind
        && operation.operationReference === input.selector.reference,
      )
    : safeOperations;
  const selectionStatus = input.selector
    ? selected.length === 1
      ? "exact"
      : selected.length === 0
        ? "not_found"
        : "ambiguous"
    : "queue";

  return Object.freeze({
    operations: selectionStatus === "ambiguous" ? [] : selected,
    selectionStatus,
    omittedUnsafeRecords,
    counts: Object.freeze({
      bookingRequests: safeOperations.filter(
        (operation) => operation.kind === "booking_request",
      ).length,
      bookingLifecycle: safeOperations.filter(
        (operation) => operation.kind === "booking_lifecycle",
      ).length,
      bookingChangeRequests: safeOperations.filter(
        (operation) => operation.kind === "booking_change_request",
      ).length,
    }),
  });
}

