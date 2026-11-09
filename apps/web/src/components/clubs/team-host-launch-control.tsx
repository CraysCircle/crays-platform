"use client";

import { useState } from "react";
import { ExternalLink, LoaderCircle, ShieldAlert, ShieldCheck } from "lucide-react";

type LaunchProperty = {
  propertyId: string;
  name: string;
  qloReady: boolean;
};

type IssueResponse = {
  status?: string;
  reason?: string;
  destination?: string;
};

const teamOrigin = "https://team.craysclub.com";
const tokenPattern = /^[A-Za-z0-9_-]{43,128}$/;

function browserVerifier() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const binary = Array.from(bytes, (value) => String.fromCharCode(value)).join("");
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

function safeDestination(value: unknown, verifier: string) {
  if (typeof value !== "string") return null;
  try {
    const destination = new URL(value);
    const fragment = new URLSearchParams(destination.hash.slice(1));
    const code = destination.searchParams.get("code") ?? "";
    if (
      destination.origin !== teamOrigin
      || destination.pathname !== "/auth/exchange"
      || !tokenPattern.test(code)
      || fragment.get("verifier") !== verifier
    ) {
      return null;
    }
    return destination.toString();
  } catch {
    return null;
  }
}

function failureMessage(status: number, payload: IssueResponse | null) {
  if (status === 401) return "Your CRAYS sign-in expired. Sign in again, then reopen the Holiday Manager.";
  if (payload?.status === "step_up_required") return "Strong Microsoft authentication is required before the team workspace can open.";
  if (payload?.status === "tenant_session_required") return "The active Holiday Manager tenant session is no longer valid. Reload this workspace.";
  if (status === 403) return "CRAYS Core denied this Property launch. No provider session was created.";
  return "The team workspace could not be opened safely. Retry from this authorized Property context.";
}

export function TeamHostLaunchControl({ properties }: { properties: LaunchProperty[] }) {
  const readyProperties = properties.filter((property) => property.qloReady);
  const [propertyId, setPropertyId] = useState(readyProperties[0]?.propertyId ?? "");
  const [state, setState] = useState<"idle" | "issuing" | "failed">("idle");
  const [message, setMessage] = useState("");

  async function launch() {
    if (!readyProperties.some((property) => property.propertyId === propertyId)) {
      setState("failed");
      setMessage("Select an authorized Property with an active Booking Core binding.");
      return;
    }
    setState("issuing");
    setMessage("CRAYS Core is revalidating the tenant, role, Property and strong-auth context.");
    const verifier = browserVerifier();
    try {
      const response = await fetch("/api/crays/clubs/team/launch/issue", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          propertyId,
          browserVerifier: verifier,
          returnPath: "/operations",
          correlationId: `clubs-team-ui-${crypto.randomUUID()}`,
        }),
      });
      const payload = await response.json().catch(() => null) as IssueResponse | null;
      const destination = response.ok && payload?.status === "issued"
        ? safeDestination(payload.destination, verifier)
        : null;
      if (!destination) {
        setState("failed");
        setMessage(failureMessage(response.status, payload));
        return;
      }
      window.location.assign(destination);
    } catch {
      setState("failed");
      setMessage("The launch request could not reach CRAYS Core. No Host Session was created; retry when connectivity is restored.");
    }
  }

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-white p-4 shadow-[0_10px_30px_rgba(16,37,45,0.04)]" aria-labelledby="clubs-team-launch-heading">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-petrol)]" aria-hidden="true" />
        <div>
          <h2 id="clubs-team-launch-heading" className="text-sm font-semibold">Team workspace</h2>
          <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">
            Open a short-lived, browser-bound Host Session. Native Qlo credentials stay server-side.
          </p>
        </div>
      </div>

      {readyProperties.length ? (
        <div className="mt-4 space-y-3">
          <label className="block text-xs font-semibold text-[var(--muted-foreground)]">
            Authorized Property
            <select
              value={propertyId}
              onChange={(event) => {
                setPropertyId(event.target.value);
                setState("idle");
                setMessage("");
              }}
              disabled={state === "issuing"}
              className="mt-1 h-11 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--color-petrol)] focus:ring-2 focus:ring-[var(--color-petrol)]/15 disabled:opacity-60"
            >
              {readyProperties.map((property) => (
                <option key={property.propertyId} value={property.propertyId}>{property.name}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => void launch()}
            disabled={state === "issuing"}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[var(--foreground)] px-4 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-wait disabled:opacity-60"
          >
            {state === "issuing" ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ExternalLink className="h-4 w-4" aria-hidden="true" />}
            {state === "issuing" ? "Opening securely…" : "Open team workspace"}
          </button>
        </div>
      ) : (
        <div className="mt-4 flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs leading-5 text-amber-950">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>No authorized Property has an active Booking Core binding. The Host Session remains closed.</p>
        </div>
      )}

      {message ? (
        <p
          className={`mt-3 text-xs leading-5 ${state === "failed" ? "text-[#C8103E]" : "text-[var(--muted-foreground)]"}`}
          role={state === "failed" ? "alert" : "status"}
          aria-live="polite"
        >
          {message}
        </p>
      ) : null}
    </section>
  );
}
