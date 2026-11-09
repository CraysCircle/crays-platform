import type { RoleKey } from "./roles";

const internalRoles: RoleKey[] = ["admin", "crays-management", "reviewer", "finance", "deal-manager"];
const scopedRoles: RoleKey[] = ["bank-partner", "franchise-candidate"];

export type PackageReadinessExpansionContract = {
  role: RoleKey;
  access: {
    allowed: boolean;
    level: "internal_package_readiness" | "release_gated_package_shell" | "forbidden";
    reason: string;
  };
  readiness: {
    expansionReady: true;
    packageCreationEnabled: false;
    bankPackageCreationEnabled: false;
    lenderReleaseEnabled: false;
    candidateReleaseEnabled: false;
    publicReleaseEnabled: false;
    linkedDomains: string[];
  };
  boundaries: {
    readOnly: true;
    readinessOnly: true;
    livePackageRecordsReturned: false;
    liveCandidateRecordsReturned: false;
    liveBankRecordsReturned: false;
    providerCallsEnabled: false;
    fileUploadEnabled: false;
    privatePreviewEnabled: false;
    externalSendingEnabled: false;
    sourceWritesEnabled: false;
    syncWritesEnabled: false;
    controlActionsEnabled: false;
    secretsReturned: false;
    privateKeysReturned: false;
  };
};

function accessForRole(role: RoleKey): PackageReadinessExpansionContract["access"] {
  if (internalRoles.includes(role)) {
    return {
      allowed: true,
      level: "internal_package_readiness",
      reason: "Role can read internal package readiness expansion. No package creation or release is enabled.",
    };
  }

  if (scopedRoles.includes(role)) {
    return {
      allowed: true,
      level: "release_gated_package_shell",
      reason: "Role can read only a release-gated package readiness shell without internal counts or live records.",
    };
  }

  return {
    allowed: false,
    level: "forbidden",
    reason: "Package readiness expansion requires internal package scope or a release-gated external shell.",
  };
}

export function getPackageReadinessExpansionContract(role: RoleKey): PackageReadinessExpansionContract {
  const access = accessForRole(role);

  return {
    role,
    access,
    readiness: {
      expansionReady: true,
      packageCreationEnabled: false,
      bankPackageCreationEnabled: false,
      lenderReleaseEnabled: false,
      candidateReleaseEnabled: false,
      publicReleaseEnabled: false,
      linkedDomains: access.allowed ? ["deal room", "evidence", "files metadata", "regulated checks", "bank prerequisites", "adapter health"] : [],
    },
    boundaries: {
      readOnly: true,
      readinessOnly: true,
      livePackageRecordsReturned: false,
      liveCandidateRecordsReturned: false,
      liveBankRecordsReturned: false,
      providerCallsEnabled: false,
      fileUploadEnabled: false,
      privatePreviewEnabled: false,
      externalSendingEnabled: false,
      sourceWritesEnabled: false,
      syncWritesEnabled: false,
      controlActionsEnabled: false,
      secretsReturned: false,
      privateKeysReturned: false,
    },
  };
}
