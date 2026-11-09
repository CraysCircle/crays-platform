import type { NextRequest } from "next/server";
import { headers } from "next/headers";
import { getCorePgPool } from "@/db/client";
import { createExactOidcCoreBindingLoader } from "@/db/exact-oidc-core-binding-repository";
import { createExactOidcCoreExpectationResolver } from "@/db/exact-oidc-core-expectation-repository";
import { getExactOidcServerSessionInput } from "@/lib/auth0";
import {
  exactOidcSessionAuthority,
  preflightExactOidcCoreBinding,
  type ExactOidcBindingDecision,
} from "@/lib/exact-oidc-core-binding-preflight";
import { resolveExactOidcTrustedHost } from "@/lib/exact-oidc-trusted-host";

if (typeof window !== "undefined") {
  throw new Error("EXACT_OIDC_CORE_BINDING_SERVER_AUTHORITY_SERVER_ONLY");
}

const denied = (
  reason: ExactOidcBindingDecision["reason"],
): ExactOidcBindingDecision => Object.freeze({ status: "DENIED", reason });

export async function preflightCurrentExactOidcCoreBinding(
  input: Readonly<{ request?: NextRequest }> = {},
): Promise<ExactOidcBindingDecision> {
  const requestHeaders = input.request?.headers ?? await headers();
  const trustedHost = resolveExactOidcTrustedHost(requestHeaders);
  if (!trustedHost) return denied("UNTRUSTED_REQUEST_HOST");

  const sessionInput = await getExactOidcServerSessionInput(input.request).catch(() => null);
  if (!sessionInput) return denied("INVALID_SESSION_PROVENANCE");

  let session;
  try {
    session = exactOidcSessionAuthority(sessionInput);
  } catch {
    return denied("INVALID_SESSION_PROVENANCE");
  }

  const pool = getCorePgPool();
  const resolution = await createExactOidcCoreExpectationResolver(pool)(session, trustedHost);
  if (resolution.status !== "RESOLVED") {
    return denied(resolution.reason);
  }

  return preflightExactOidcCoreBinding({
    ...sessionInput,
    expected: resolution.expectation,
    load: createExactOidcCoreBindingLoader(pool),
  });
}
