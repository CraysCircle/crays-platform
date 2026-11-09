"use client";

import type { CraysResourceQueryRequest, CraysResourceQueryResponse, CraysWorkspaceSessionDto } from "@/lib/workspace/provider-contract";

export const craysWorkspaceSessionQueryKey = ["crays", "workspace", "session"] as const;

function currentReviewRoleQuery() {
  if (typeof window === "undefined") return "";
  const role = new URLSearchParams(window.location.search).get("role");
  return role ? `?role=${encodeURIComponent(role)}` : "";
}

async function readJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = typeof payload?.message === "string" ? payload.message : `CRAYS request failed with HTTP ${response.status}.`;
    const error = new Error(message) as Error & { statusCode?: number; response?: unknown };
    error.statusCode = response.status;
    error.response = payload;
    throw error;
  }

  return payload as T;
}

export async function fetchCraysWorkspaceSession() {
  const response = await fetch(`/api/crays/workspace/session${currentReviewRoleQuery()}`, {
    cache: "no-store",
    credentials: "same-origin",
  });
  return readJson<CraysWorkspaceSessionDto>(response);
}

export async function fetchCraysAccessDecision(input: { resource?: string; action: string; params?: unknown }) {
  const response = await fetch(`/api/crays/workspace/access${currentReviewRoleQuery()}`, {
    method: "POST",
    cache: "no-store",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  return readJson<{ can: boolean; reason: string }>(response);
}

export async function queryCraysResource<TRecord = Record<string, unknown>>(input: CraysResourceQueryRequest) {
  const response = await fetch(`/api/crays/resources/query${currentReviewRoleQuery()}`, {
    method: "POST",
    cache: "no-store",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  return readJson<CraysResourceQueryResponse<TRecord>>(response);
}

export async function sendCraysCommand<TReceipt = Record<string, unknown>>(input: unknown) {
  const response = await fetch(`/api/crays/resources/command${currentReviewRoleQuery()}`, {
    method: "POST",
    cache: "no-store",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  return readJson<{ status: string; receipt: TReceipt; message: string }>(response);
}
