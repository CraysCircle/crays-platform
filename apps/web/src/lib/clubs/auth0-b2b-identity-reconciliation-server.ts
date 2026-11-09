import "server-only";

type Auth0B2bIdentityRecord = Readonly<{
  subject: string;
  connection: string;
  emailVerified: boolean;
}>;

type Auth0B2bUserCandidate = Readonly<{
  subject: string;
  emailVerified: boolean;
  identities: readonly Auth0B2bIdentityRecord[];
}>;

export type Auth0B2bIdentityDirectoryReader = Readonly<{
  readCandidatesByNormalizedEmail(
    normalizedEmail: string,
  ): Promise<readonly Auth0B2bUserCandidate[]>;
}>;

export type Auth0B2bIdentityReconciliationResult = Readonly<{
  candidateCount: number;
  identityCount: number;
  distinctConnectionCount: number;
  sessionSubjectMatchesExactlyOne: boolean;
  verifiedState: "true" | "false" | "mixed";
  disposition:
    | "exact_identity_unverified"
    | "identity_or_connection_mixed"
    | "session_mapping_defect"
    | "verified_identity_current";
}>;

type ReconciliationInput = Readonly<{
  expectedTenantOrigin: string;
  actualTenantOrigin: string;
  expectedClientId: string;
  actualClientId: string;
  ownerEmail: string;
  currentSessionSubject: string;
  directory: Auth0B2bIdentityDirectoryReader;
}>;

function requireExactAuthority(
  expectedTenantOrigin: string,
  actualTenantOrigin: string,
  expectedClientId: string,
  actualClientId: string,
) {
  if (
    !expectedTenantOrigin ||
    expectedTenantOrigin !== actualTenantOrigin ||
    !expectedClientId ||
    expectedClientId !== actualClientId
  ) {
    throw new Error("auth0_b2b_authority_mismatch");
  }
}

function normalizeOwnerEmail(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized || !normalized.includes("@")) {
    throw new Error("auth0_b2b_owner_email_invalid");
  }
  return normalized;
}

function verifiedState(values: readonly boolean[]) {
  if (values.length === 0) return "mixed" as const;
  if (values.every((value) => value)) return "true" as const;
  if (values.every((value) => !value)) return "false" as const;
  return "mixed" as const;
}

export async function inspectAuth0B2bIdentityReconciliationReadOnly(
  input: ReconciliationInput,
): Promise<Auth0B2bIdentityReconciliationResult> {
  requireExactAuthority(
    input.expectedTenantOrigin,
    input.actualTenantOrigin,
    input.expectedClientId,
    input.actualClientId,
  );

  const normalizedEmail = normalizeOwnerEmail(input.ownerEmail);
  const candidates = await input.directory.readCandidatesByNormalizedEmail(
    normalizedEmail,
  );
  const identities = candidates.flatMap((candidate) => candidate.identities);
  const matchingCandidateCount = candidates.filter(
    (candidate) =>
      candidate.subject === input.currentSessionSubject ||
      candidate.identities.some(
        (identity) => identity.subject === input.currentSessionSubject,
      ),
  ).length;
  const state = verifiedState([
    ...candidates.map((candidate) => candidate.emailVerified),
    ...identities.map((identity) => identity.emailVerified),
  ]);
  const candidateCount = candidates.length;
  const identityCount = identities.length;
  const distinctConnectionCount = new Set(
    identities.map((identity) => identity.connection),
  ).size;
  const sessionSubjectMatchesExactlyOne = matchingCandidateCount === 1;

  let disposition: Auth0B2bIdentityReconciliationResult["disposition"] =
    "identity_or_connection_mixed";
  if (
    candidateCount === 1 &&
    identityCount === 1 &&
    distinctConnectionCount === 1 &&
    sessionSubjectMatchesExactlyOne &&
    state === "false"
  ) {
    disposition = "exact_identity_unverified";
  } else if (
    candidateCount === 1 &&
    identityCount === 1 &&
    distinctConnectionCount === 1 &&
    !sessionSubjectMatchesExactlyOne &&
    state === "true"
  ) {
    disposition = "session_mapping_defect";
  } else if (
    candidateCount === 1 &&
    identityCount === 1 &&
    distinctConnectionCount === 1 &&
    sessionSubjectMatchesExactlyOne &&
    state === "true"
  ) {
    disposition = "verified_identity_current";
  }

  return Object.freeze({
    candidateCount,
    identityCount,
    distinctConnectionCount,
    sessionSubjectMatchesExactlyOne,
    verifiedState: state,
    disposition,
  });
}
