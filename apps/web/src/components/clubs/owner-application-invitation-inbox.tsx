"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Inbox,
  LoaderCircle,
  RefreshCw,
  Send,
  XCircle,
} from "lucide-react";

const endpoint = "/api/crays/clubs/team/applications/invitations";
const secureAccessRefreshHref =
  "/auth/login?prompt=login&max_age=0&returnTo=%2Fen%2Fclubs%2Foperations";

type Action =
  | "start_review"
  | "request_more_information"
  | "approve_for_invitation"
  | "decline";

type Item = {
  applicationReference: string;
  sourceChannel: "direct_web" | "ambassador_referral";
  referral: null | { ambassadorDisplayName: string };
  applicantSummary: {
    fullName: string;
    applicantType: "individual" | "family" | "team";
    basedIn: string;
    interest: string;
  };
  reviewData: null | {
    preferredArrivalWindow: string;
    preferredParticipationLength: string;
    motivation: string;
    contribution: string;
    linkedInUrl: string | null;
    socialUrl: string | null;
    profileUrl: string | null;
  };
  contactEmailMasked: string;
  verifiedEmailBound: boolean;
  state: string;
  version: number;
  submittedAt: string;
  updatedAt: string;
  invitationIntentStatus: "none" | "unsent";
  availableActions: Action[];
};

type Payload = {
  status: string;
  view?: string;
  items?: Item[];
  truncated?: boolean;
};

const actionCopy: Record<Action, { label: string; reasonCode: string }> = {
  start_review: {
    label: "Start review",
    reasonCode: "owner_review_started",
  },
  request_more_information: {
    label: "Request information",
    reasonCode: "owner_more_information_requested",
  },
  approve_for_invitation: {
    label: "Approve invitation",
    reasonCode: "owner_approved_invitation",
  },
  decline: { label: "Decline", reasonCode: "owner_declined_application" },
};

function friendlyState(value: string) {
  return value.replaceAll("_", " ");
}

function createIdempotencyKey() {
  return `cclub-owner-ui-${crypto.randomUUID().replaceAll("-", "")}`;
}

async function readPayload(url = endpoint) {
  const response = await fetch(url, {
    credentials: "same-origin",
    headers: { accept: "application/json" },
    cache: "no-store",
  });
  const body = (await response.json().catch(() => null)) as Payload | null;
  return { response, body };
}

export function OwnerApplicationInvitationInbox() {
  const [items, setItems] = useState<Item[]>([]);
  const [status, setStatus] = useState("loading");
  const [busy, setBusy] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const { response, body } = await readPayload();
      if (!response.ok || body?.status !== "ready" || !Array.isArray(body.items)) {
        setItems([]);
        setStatus(body?.status ?? "temporarily_unavailable");
        return;
      }
      setItems(body.items);
      setStatus("ready");
    } catch {
      setItems([]);
      setStatus("temporarily_unavailable");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void readPayload()
      .then(({ response, body }) => {
        if (cancelled) return;
        if (
          !response.ok ||
          body?.status !== "ready" ||
          !Array.isArray(body.items)
        ) {
          setItems([]);
          setStatus(body?.status ?? "temporarily_unavailable");
          return;
        }
        setItems(body.items);
        setStatus("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setItems([]);
        setStatus("temporarily_unavailable");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function runAction(item: Item, action: Action) {
    const idempotencyKey = createIdempotencyKey();
    setBusy(`${item.applicationReference}:${action}`);
    setNotice(null);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "idempotency-key": idempotencyKey,
        },
        body: JSON.stringify({
          type: action,
          applicationReference: item.applicationReference,
          expectedVersion: item.version,
          reasonCode: actionCopy[action].reasonCode,
        }),
      });
      const body = (await response.json().catch(() => null)) as Payload | null;
      if (response.ok && body?.status === "ready") {
        setNotice(`${actionCopy[action].label} recorded.`);
        await load();
        return;
      }
      if (response.status === 503 && body?.status === "unknown_outcome") {
        const reconciliation = await readPayload(
          `${endpoint}?idempotencyKey=${encodeURIComponent(idempotencyKey)}`,
        );
        if (
          reconciliation.response.ok &&
          reconciliation.body?.status === "ready"
        ) {
          setNotice("The command outcome was reconciled from its durable receipt.");
          await load();
          return;
        }
      }
      setNotice(`Command stopped: ${friendlyState(body?.status ?? "temporarily_unavailable")}.`);
    } catch {
      setNotice("Command outcome is unavailable. No blind retry was made.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section
      className="scroll-mt-24 rounded-2xl border border-[var(--border)] bg-white p-5 shadow-[0_10px_30px_rgba(16,37,45,0.04)] sm:p-6"
      aria-labelledby="owner-application-inbox-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-petrol)]">
            <Inbox className="h-4 w-4" aria-hidden="true" />
            Owner applications
          </p>
          <h2 id="owner-application-inbox-title" className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
            Review and invitation decisions
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">
            Direct and Ambassador-referred applications from the tenant-bound Owner queue. Approval creates one unsent delivery intent; it never grants membership, booking or payment.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={status === "loading"}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--border)] bg-white px-4 text-sm font-semibold disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${status === "loading" ? "animate-spin" : ""}`} aria-hidden="true" />
          Refresh
        </button>
      </div>

      {notice ? (
        <p className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-3 text-sm" role="status">
          {notice}
        </p>
      ) : null}

      {status === "loading" ? (
        <div className="mt-5 flex min-h-36 items-center justify-center gap-3 rounded-xl border border-dashed border-[var(--border)] text-sm text-[var(--muted-foreground)]">
          <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" /> Loading the authorized queue…
        </div>
      ) : status !== "ready" ? (
        <div className="mt-5 rounded-xl border border-[#C8103E] bg-[#C8103E]/5 p-5" role="alert">
          <p className="font-semibold">Owner queue unavailable</p>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {friendlyState(status)}. No cached application data or inferred authority is shown.
          </p>
          {status === "exact_b2b_session_unavailable" ||
          status === "step_up_required" ? (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <a
                href={secureAccessRefreshHref}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--color-petrol)] bg-[var(--color-petrol)] px-4 text-sm font-semibold text-white"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Refresh secure access
              </a>
              <p className="max-w-xl text-xs leading-5 text-[var(--muted-foreground)]">
                Re-authenticate with the dedicated Clubs management account, then return here. No application command is sent.
              </p>
            </div>
          ) : null}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-subtle)] p-7 text-center">
          <CheckCircle2 className="mx-auto h-6 w-6 text-[var(--color-petrol)]" aria-hidden="true" />
          <p className="mt-3 font-semibold">No applications need an Owner decision</p>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">The server-backed queue is ready and currently empty.</p>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {items.map((item) => {
            const isExpanded = expanded === item.applicationReference;
            return (
              <article key={item.applicationReference} className="rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold">{item.applicantSummary.fullName}</h3>
                      <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em]">
                        {friendlyState(item.state)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                      {item.applicantSummary.applicantType} · {item.applicantSummary.basedIn} · {item.applicantSummary.interest}
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                      {item.sourceChannel === "ambassador_referral"
                        ? `Ambassador referral${item.referral?.ambassadorDisplayName ? ` · ${item.referral.ambassadorDisplayName}` : ""}`
                        : "Direct website application"}
                      {` · ${item.contactEmailMasked}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExpanded(isExpanded ? null : item.applicationReference)}
                    className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--border)] bg-white px-3 text-sm font-semibold"
                    aria-expanded={isExpanded}
                  >
                    Details {isExpanded ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
                  </button>
                </div>

                {isExpanded && item.reviewData ? (
                  <dl className="mt-4 grid gap-3 border-t border-[var(--border)] pt-4 sm:grid-cols-2">
                    {[
                      ["Preferred arrival", item.reviewData.preferredArrivalWindow],
                      ["Participation", item.reviewData.preferredParticipationLength],
                      ["Motivation", item.reviewData.motivation],
                      ["Contribution", item.reviewData.contribution],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">{label}</dt>
                        <dd className="mt-1 text-sm leading-6">{value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-4">
                  {item.availableActions.map((action) => {
                    const actionBusy = busy === `${item.applicationReference}:${action}`;
                    const destructive = action === "decline";
                    const primary = action === "approve_for_invitation";
                    return (
                      <button
                        key={action}
                        type="button"
                        disabled={busy !== null}
                        onClick={() => void runAction(item, action)}
                        className={`inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm font-semibold disabled:opacity-60 ${
                          primary
                            ? "border-[var(--color-petrol)] bg-[var(--color-petrol)] text-white"
                            : destructive
                              ? "border-[#C8103E] bg-white text-[#C8103E]"
                              : "border-[var(--border)] bg-white"
                        }`}
                      >
                        {actionBusy ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : primary ? <Send className="h-4 w-4" aria-hidden="true" /> : destructive ? <XCircle className="h-4 w-4" aria-hidden="true" /> : null}
                        {actionCopy[action].label}
                      </button>
                    );
                  })}
                  <span className="ml-auto text-xs text-[var(--muted-foreground)]">v{item.version} · {item.invitationIntentStatus === "unsent" ? "delivery pending" : "no delivery intent"}</span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
