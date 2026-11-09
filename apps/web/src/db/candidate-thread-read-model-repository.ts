import type { RoleKey } from "@/lib/roles";
import { getCandidatePreparedOfferReadModel } from "./candidate-prepared-offer-read-model-repository";
import { getCommunicationPersistenceReadiness } from "./communication-persistence-readiness-repository";
import { getCoreDatabaseRuntimeState } from "./client";

const candidateThreadRoles: RoleKey[] = ["franchise-candidate", "deal-manager", "reviewer", "crays-management", "admin"];

export type CandidateThreadReadModel = {
  configured: boolean;
  role: RoleKey;
  access: {
    allowed: boolean;
    reason: string;
  };
  preparedOfferScope: {
    candidateVisibleOffers: number;
    accountScopeRequired: true;
    candidateReleaseRequired: true;
  };
  threads: [];
  summary: {
    threads: number;
    messages: number;
    unread: number;
  };
  communicationBoundary: {
    migrationDraftReady: true;
    schemaApplied: boolean;
    persistenceTablesReady: boolean;
    internalNotesReturned: false;
    externalSendingEnabled: false;
    providerConnectionsEnabled: false;
    liveProviderPayloadsReturned: false;
  };
  liveThreadsReturned: false;
  liveMessagesReturned: false;
  candidatePrivateDataReturned: false;
  bankDataReturned: false;
  fileUploadEnabled: false;
  providerCallsEnabled: false;
  externalSendingEnabled: false;
  publicReleaseEnabled: false;
  secretsReturned: false;
  privateKeysReturned: false;
};

function accessForRole(role: RoleKey) {
  if (candidateThreadRoles.includes(role)) {
    return {
      allowed: true,
      reason: "Role can read Candidate thread scope after prepared-offer release and account mapping.",
    };
  }

  return {
    allowed: false,
    reason: "Candidate threads require Candidate, Deal Manager or review scope.",
  };
}

function emptySummary() {
  return {
    threads: 0,
    messages: 0,
    unread: 0,
  };
}

export async function getCandidateThreadReadModel(role: RoleKey): Promise<CandidateThreadReadModel> {
  const runtime = getCoreDatabaseRuntimeState();
  const access = accessForRole(role);
  const preparedOfferReadModel = access.allowed ? await getCandidatePreparedOfferReadModel(role) : null;
  const communicationReadiness = await getCommunicationPersistenceReadiness();

  return {
    configured: runtime.configured,
    role,
    access,
    preparedOfferScope: {
      candidateVisibleOffers: preparedOfferReadModel?.summary.total ?? 0,
      accountScopeRequired: true,
      candidateReleaseRequired: true,
    },
    threads: [],
    summary: emptySummary(),
    communicationBoundary: {
      migrationDraftReady: true,
      schemaApplied: communicationReadiness.migrationApplied,
      persistenceTablesReady: communicationReadiness.migrationApplied,
      internalNotesReturned: false,
      externalSendingEnabled: false,
      providerConnectionsEnabled: false,
      liveProviderPayloadsReturned: false,
    },
    liveThreadsReturned: false,
    liveMessagesReturned: false,
    candidatePrivateDataReturned: false,
    bankDataReturned: false,
    fileUploadEnabled: false,
    providerCallsEnabled: false,
    externalSendingEnabled: false,
    publicReleaseEnabled: false,
    secretsReturned: false,
    privateKeysReturned: false,
  };
}
