import "server-only";

import type { NextRequest } from "next/server";
import {
  getExactB2bServerSessionProofInput,
  getAuth0RuntimeConfigStateForRequest,
  type ExactB2bServerSessionFailureBoundary,
  type ExactB2bServerSessionProofRead,
  type ExactB2bSdkSessionExceptionClass,
} from "@/lib/auth0";
import {
  CLUBS_AMBASSADOR_PRE_REGISTRATION_CONTRACT,
  type ClubsExactB2bSessionResolution,
} from "@/lib/clubs/ambassador-pre-registration-contract";
import { resolveExactOidcTrustedHost } from "@/lib/exact-oidc-trusted-host";

type RuntimeConfigState = Readonly<{
  application: "b2b" | "coffee" | "gym" | "clubs";
  appBaseUrlConfigured: boolean;
  baseUrlMatchesRequestOrigin: boolean;
  domainConfigured: boolean;
  clientIdConfigured: boolean;
  clientSecretConfigured: boolean;
  secretConfigured: boolean;
}>;

type ExactB2bSessionFailureBoundary =
  | "runtime_config"
  | "trusted_host"
  | "sdk_read_error"
  | "auth_time_stale"
  | ExactB2bServerSessionFailureBoundary;

export type ExactB2bSessionProofDependencies = Readonly<{
  runtimeConfig(request: NextRequest): RuntimeConfigState;
  trustedApplication(request: NextRequest):
    | Readonly<{ application: "b2b" | "coffee" | "gym" | "clubs" }>
    | null;
  readSingleSessionProof(
    request: NextRequest,
  ): Promise<ExactB2bServerSessionProofRead>;
  now(): Date;
}>;

const dependencies: ExactB2bSessionProofDependencies = {
  runtimeConfig: getAuth0RuntimeConfigStateForRequest,
  trustedApplication: (request) => resolveExactOidcTrustedHost(request.headers),
  readSingleSessionProof: getExactB2bServerSessionProofInput,
  now: () => new Date(),
};

function b2bRuntimeConfigured(state: RuntimeConfigState) {
  return (
    state.application === "b2b" &&
    state.appBaseUrlConfigured &&
    state.baseUrlMatchesRequestOrigin &&
    state.domainConfigured &&
    state.clientIdConfigured &&
    state.clientSecretConfigured &&
    state.secretConfigured
  );
}

function unavailable(
  failureBoundary: ExactB2bSessionFailureBoundary,
  exceptionClass?: ExactB2bSdkSessionExceptionClass,
) {
  console.warn("CCLUB_EXACT_B2B_SESSION_UNAVAILABLE", {
    failureBoundary,
    exceptionClass,
  });
  return Object.freeze({ status: "unavailable" as const });
}

export async function resolveExactB2bSessionProof(
  request: NextRequest,
  input: ExactB2bSessionProofDependencies = dependencies,
): Promise<ClubsExactB2bSessionResolution> {
  const runtime = input.runtimeConfig(request);
  if (runtime.application === "clubs") return { status: "b2c_rejected" };
  if (!b2bRuntimeConfigured(runtime)) return unavailable("runtime_config");

  const trusted = input.trustedApplication(request);
  if (trusted?.application !== "b2b") return unavailable("trusted_host");

  let sessionProof: ExactB2bServerSessionProofRead;
  try {
    sessionProof = await input.readSingleSessionProof(request);
  } catch {
    return unavailable("sdk_read_error", "UnknownAuth0Error");
  }
  if (sessionProof.status !== "ready") {
    return unavailable(
      sessionProof.failureBoundary,
      sessionProof.exceptionClass,
    );
  }

  const authenticatedAt = new Date(sessionProof.proofInput.authenticatedAt);
  const age = input.now().getTime() - authenticatedAt.getTime();
  if (
    !Number.isFinite(authenticatedAt.getTime()) ||
    age < -5_000 ||
    age >
      CLUBS_AMBASSADOR_PRE_REGISTRATION_CONTRACT.activationPass
        .maximumAuthenticationAgeSeconds *
        1_000
  ) {
    return unavailable("auth_time_stale");
  }

  return Object.freeze({
    status: "ready",
    proof: Object.freeze({
      proofSchema: "crays.clubs.exact-b2b-session-proof.v1",
      ...sessionProof.proofInput,
      b2cRejected: true,
    }),
  });
}
