"use client";

import { useState } from "react";

type ContinuationResponse = {
  status?: string;
  next?: string;
};

export default function ClubsTenantSessionPage() {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function continueAsHolidayManager() {
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/crays/auth/clubs-tenant-session", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
      const result = (await response.json().catch(() => ({}))) as ContinuationResponse;
      if (response.ok && result.status === "active") {
        window.location.assign("/operations");
        return;
      }
      if ((response.status === 401 || result.status === "step_up_required") && result.next?.startsWith("/")) {
        window.location.assign(result.next);
        return;
      }
      setMessage(
        result.status === "unique_holiday_manager_binding_required"
          ? "No unique active Holiday Manager assignment is available for this account."
          : "The Holiday Manager tenant session was denied.",
      );
    } catch {
      setMessage("The Holiday Manager tenant session could not be established. Retry safely.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f7f8] px-6 py-12 text-black">
      <section className="mx-auto max-w-xl rounded-[8px] border border-black/10 bg-white p-8 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#ff0f5f]">CRAYS Clubs identity</p>
        <h1 className="mt-3 text-3xl font-black">Open Holiday Manager</h1>
        <p className="mt-4 text-sm leading-6 text-black/65">
          Continue with the active Microsoft identity. CRAYS derives the tenant and Holiday Manager role from the
          verified server-side assignment and requires multi-factor assurance.
        </p>
        <div className="mt-6 rounded-[8px] border border-black/10 bg-[#fbfbfc] p-4 text-sm leading-6 text-black/70">
          The browser cannot choose an organization, property, role or assurance level. Ambiguous or inactive
          assignments are denied.
        </div>
        <button
          type="button"
          onClick={() => void continueAsHolidayManager()}
          disabled={pending}
          className="mt-8 inline-flex min-h-11 items-center rounded-full bg-black px-5 text-sm font-bold text-white disabled:opacity-50"
        >
          {pending ? "Checking authority…" : "Continue as Holiday Manager"}
        </button>
        {message ? (
          <p className="mt-4 rounded-[8px] border border-[#C8103E]/30 bg-[#C8103E]/5 p-3 text-sm" role="alert">
            {message}
          </p>
        ) : null}
      </section>
    </main>
  );
}
