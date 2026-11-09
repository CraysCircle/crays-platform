"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  CLUBS_AMBASSADOR_OPERATIONS_CONTRACT,
  type ClubsAmbassadorOperationalRole,
  type ClubsAmbassadorOperationsReadModel,
  type ClubsAmbassadorRegistryEntry,
} from "@/lib/clubs/ambassador-operations-contract";
import { ClubsOperationsPublicInquiryQueue } from "@/components/crays-clubs/operations/clubs-operations-public-inquiry-queue";
import { ClubsOperationsIntegrationStatusPanel } from "@/components/crays-clubs/operations/clubs-operations-integration-status-panel";
import { ClubsOperationsPaymentStatusPanel } from "@/components/crays-clubs/operations/clubs-operations-payment-status-panel";
import { ClubsOperationsTeamBookingQueue } from "@/components/crays-clubs/operations/clubs-operations-team-booking-queue";
import styles from "./clubs-ambassador-operations.module.css";

type RegistryForm = {
  ambassadorProfileId: string;
  displayName: string;
  regionLabel: string;
  operationalRoles: ClubsAmbassadorOperationalRole[];
  reviewerBindingId: string;
};

const emptyForm: RegistryForm = {
  ambassadorProfileId: "",
  displayName: "",
  regionLabel: "",
  operationalRoles: ["ambassador"],
  reviewerBindingId: "",
};

const localPreviewOrigin = "http://localhost:43172";
const managementTenantSessionEndpoint =
  "/api/crays/auth/clubs-management-tenant-session";
const managementTenantSessionStatuses = new Set([
  "active",
  "misdirected_or_untrusted_preview_request",
  "empty_request_body_required",
  "exact_b2b_session_unavailable",
  "wrong_vertical_session",
  "core_identity_unavailable",
  "mapped_b2b_core_account_required",
  "management_role_required",
  "fresh_aal2_or_aal3_required",
  "session_proof_context_mismatch",
  "tenant_binding_unavailable",
  "unique_active_management_binding_required",
  "tenant_session_unknown_outcome",
]);

function idempotencyKey(command: string) {
  return `clubs-ops:${command}:${crypto.randomUUID()}`;
}

function short(value: string) {
  return value.length > 34 ? `${value.slice(0, 16)}…${value.slice(-10)}` : value;
}

function dateTime(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function operationsErrorCopy(status: string) {
  if (status === "authentication_required") {
    return {
      title: "Operations authentication required",
      detail: "Sign in with an admitted B2B account, then retry this section.",
    };
  }
  if (status === "tenant_session_required") {
    return {
      title: "Operations tenant session required",
      detail: "Select an admitted Clubs tenant session, then retry.",
    };
  }
  if (
    status === "exact_b2b_session_unavailable" ||
    status === "fresh_aal2_or_aal3_required" ||
    status === "session_proof_context_mismatch"
  ) {
    return {
      title: "Fresh management authentication required",
      detail: "Complete a new Clubs management login, then return to Operations.",
    };
  }
  if (
    status === "mapped_b2b_core_account_required" ||
    status === "management_role_required" ||
    status === "unique_active_management_binding_required"
  ) {
    return {
      title: "Clubs management binding required",
      detail: "This identity is not bound to one active Clubs management role.",
    };
  }
  if (status === "step_up_required") {
    return {
      title: "Strong authentication required",
      detail: "Complete the required authentication step, then retry.",
    };
  }
  if (status === "permission_denied") {
    return {
      title: "Operations access denied",
      detail: "This account does not have the required internal Operations role.",
    };
  }
  if (status === "action_failed") {
    return {
      title: "Operation not completed",
      detail: "Reconcile the current state before trying the action again.",
    };
  }
  return {
    title: "Operations temporarily unavailable",
    detail: "No outcome is assumed. Retry the safe read when ready.",
  };
}

export function ClubsAmbassadorOperations({
  embedded = false,
}: {
  embedded?: boolean;
} = {}) {
  const tenantBootstrapAttempted = useRef(false);
  const [model, setModel] = useState<ClubsAmbassadorOperationsReadModel | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<ClubsAmbassadorRegistryEntry | null>(
    null,
  );
  const [form, setForm] = useState<RegistryForm>(emptyForm);
  const [assignmentChoice, setAssignmentChoice] = useState<
    Record<string, string>
  >({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        CLUBS_AMBASSADOR_OPERATIONS_CONTRACT.endpoint,
        { cache: "no-store", credentials: "same-origin" },
      );
      const payload = (await response.json().catch(() => null)) as
        | ClubsAmbassadorOperationsReadModel
        | { status?: string }
        | null;
      if (
        (!response.ok || payload?.status !== "ready") &&
        payload?.status === "tenant_session_required" &&
        window.location.origin === localPreviewOrigin &&
        !tenantBootstrapAttempted.current
      ) {
        tenantBootstrapAttempted.current = true;
        const bootstrapResponse = await fetch(managementTenantSessionEndpoint, {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          headers: {
            accept: "application/json",
            "content-type": "application/json",
          },
          body: "",
        });
        const bootstrapPayload = (await bootstrapResponse
          .json()
          .catch(() => null)) as { status?: string } | null;
        const bootstrapStatus =
          typeof bootstrapPayload?.status === "string" &&
          managementTenantSessionStatuses.has(bootstrapPayload.status)
            ? bootstrapPayload.status
            : "temporarily_unavailable";
        if (bootstrapResponse.ok && bootstrapStatus === "active") {
          window.location.reload();
          return;
        }
        throw new Error(bootstrapStatus);
      }
      if (!response.ok || !payload || payload.status !== "ready") {
        throw new Error(payload?.status ?? `HTTP ${response.status}`);
      }
      setModel(payload as ClubsAmbassadorOperationsReadModel);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "temporarily_unavailable",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(initialLoad);
  }, [load]);

  const activeAmbassadors = useMemo(
    () => model?.registry.filter((entry) => entry.status === "active") ?? [],
    [model],
  );

  async function execute(command: Record<string, unknown>, label: string) {
    setBusy(label);
    setNotice(null);
    setError(null);
    try {
      const response = await fetch(
        CLUBS_AMBASSADOR_OPERATIONS_CONTRACT.endpoint,
        {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "content-type": "application/json",
            "idempotency-key": idempotencyKey(String(command.type)),
          },
          body: JSON.stringify(command),
        },
      );
      const payload = (await response.json().catch(() => null)) as {
        status?: string;
        reason?: string;
      } | null;
      if (!response.ok || payload?.status !== "persisted") {
        throw new Error(
          [payload?.status, payload?.reason].filter(Boolean).join(": ") ||
            `HTTP ${response.status}`,
        );
      }
      setNotice(label);
      await load();
      return true;
    } catch (cause) {
      void cause;
      setError("action_failed");
      return false;
    } finally {
      setBusy(null);
    }
  }

  function toggleRole(role: ClubsAmbassadorOperationalRole) {
    setForm((current) => ({
      ...current,
      operationalRoles: current.operationalRoles.includes(role)
        ? current.operationalRoles.filter((candidate) => candidate !== role)
        : [...current.operationalRoles, role],
    }));
  }

  function startEdit(entry: ClubsAmbassadorRegistryEntry) {
    setEditing(entry);
    setForm({
      ambassadorProfileId: entry.ambassadorProfileId,
      displayName: entry.displayName,
      regionLabel: entry.regionLabel,
      operationalRoles: [...entry.operationalRoles],
      reviewerBindingId: entry.reviewerBindingId ?? "",
    });
    setNotice(null);
    setError(null);
  }

  function resetForm() {
    setEditing(null);
    setForm(emptyForm);
  }

  async function submitRegistry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const details = {
      displayName: form.displayName,
      regionLabel: form.regionLabel,
      operationalRoles: form.operationalRoles,
      reviewerBindingId: form.reviewerBindingId.trim() || null,
    };
    const succeeded = editing
      ? await execute(
          {
            type: "edit_ambassador",
            ambassadorProfileId: editing.ambassadorProfileId,
            expectedVersion: editing.version,
            reasonCode: "registry_details_updated",
            ...details,
          },
          `Updated ${editing.displayName}`,
        )
      : await execute(
          {
            type: "create_ambassador",
            ...(form.ambassadorProfileId.trim()
              ? { ambassadorProfileId: form.ambassadorProfileId.trim() }
              : {}),
            reasonCode: "registry_created",
            ...details,
          },
          `Created ${form.displayName}`,
        );
    if (succeeded) resetForm();
  }

  async function deactivate(entry: ClubsAmbassadorRegistryEntry) {
    if (!window.confirm(`Deactivate ${entry.displayName}? Existing audit remains immutable.`)) {
      return;
    }
    await execute(
      {
        type: "deactivate_ambassador",
        ambassadorProfileId: entry.ambassadorProfileId,
        expectedVersion: entry.version,
        reasonCode: "operations_access_deactivated",
      },
      `Deactivated ${entry.displayName}`,
    );
    if (editing?.ambassadorProfileId === entry.ambassadorProfileId) resetForm();
  }

  async function assign(applicationId: string) {
    const application = model?.applications.find(
      (candidate) => candidate.applicationId === applicationId,
    );
    const ambassadorProfileId = assignmentChoice[applicationId];
    if (!application || !ambassadorProfileId) return;
    const reassignment = Boolean(application.ambassadorProfileId);
    await execute(
      {
        type: "assign_application",
        applicationId,
        ambassadorProfileId,
        expectedAssignmentVersion: application.assignmentVersion,
        reasonCode: reassignment
          ? "operations_reassignment"
          : "operations_assignment",
      },
      reassignment ? "Application reassigned" : "Application assigned",
    );
  }

  async function unassign(applicationId: string) {
    const application = model?.applications.find(
      (candidate) => candidate.applicationId === applicationId,
    );
    if (!application || !application.ambassadorProfileId) return;
    await execute(
      {
        type: "unassign_application",
        applicationId,
        expectedAssignmentVersion: application.assignmentVersion,
        reasonCode: "operations_unassignment",
      },
      "Application unassigned",
    );
  }

  const errorCopy = error ? operationsErrorCopy(error) : null;

  return (
    <main className={styles.shell}>
      {!embedded ? (
        <>
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>CRAYS Clubs · authenticated SaaS operations</p>
          <h1>Clubs management</h1>
          <p>
            One role home for Holiday Manager and Ambassador operations. Every
            queue remains bound to the active Clubs tenant and its exact authority.
          </p>
        </div>
        <button className={styles.secondaryButton} onClick={() => void load()} disabled={loading || Boolean(busy)}>
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      <section className={styles.boundary} aria-label="Authority boundary">
        <strong>Current role: Clubs Management.</strong>
        <span>Holiday Manager/QLO and Ambassador Management are combined here.</span>
        <span>Every action is authorized again at its own server boundary.</span>
        <span>Payments remain setup pending without provider-success claims.</span>
      </section>
        </>
      ) : null}

      {notice ? <p className={styles.success}>{notice}</p> : null}
      {errorCopy ? (
        <div className={styles.statePanel} role="alert">
          <div>
            <strong>{errorCopy.title}</strong>
            <span>{errorCopy.detail}</span>
          </div>
          <button
            className={styles.secondaryButton}
            disabled={loading || Boolean(busy)}
            onClick={() => void load()}
          >
            Retry safe read
          </button>
        </div>
      ) : null}

      {!embedded ? (
        <>
      <section
        id="holiday-manager-operations"
        className={styles.roleSectionHeading}
        aria-labelledby="holiday-manager-operations-title"
      >
        <p className={styles.kicker}>Holiday Manager · QLO operations</p>
        <h2 id="holiday-manager-operations-title">Bookings, guests and operating readiness</h2>
        <p>
          Real inquiry, booking, lifecycle, integration and payment-readiness
          records from the existing Clubs operating contracts.
        </p>
      </section>

      <section
        id="founder-core-access"
        className={`${styles.panel} ${styles.workspaceSection}`}
        aria-label="Founder and Core SaaS bootstrap status"
      >
        <div className={styles.panelHeading}>
          <div>
            <p className={styles.kicker}>Internal bootstrap reconciliation</p>
            <h2>Founder/Core SaaS access</h2>
          </div>
        </div>
        <p>
          Access becomes active only after the person&apos;s own exact B2B login,
          activation pass and immutable account entitlement binding.
        </p>
        {loading ? (
          <p className={styles.empty} role="status">
            Loading Founder/Core access status…
          </p>
        ) : !errorCopy && model?.founderCoreBootstrap.length ? (
          <div className={styles.cards}>
            {model.founderCoreBootstrap.map((profile) => (
            <article className={styles.card} key={profile.publicAmbassadorSlug}>
              <div className={styles.cardTitle}>
                <div>
                  <h3>{profile.displayName}</h3>
                  <p>{profile.publicAmbassadorSlug}</p>
                </div>
                <span
                  className={
                    profile.entitlement === "FULL_ACTIVE"
                      ? styles.active
                      : styles.inactive
                  }
                >
                  {profile.entitlement === "FULL_ACTIVE" ? "Full active" : "Pending"}
                </span>
              </div>
              <dl>
                <div>
                  <dt>Pre-registration</dt>
                  <dd>{profile.preRegistration}</dd>
                </div>
                <div>
                  <dt>Real login bound</dt>
                  <dd>{profile.realLoginBound ? "yes" : "no"}</dd>
                </div>
                <div>
                  <dt>Activation pass</dt>
                  <dd>{profile.activationPass ? "passed" : "pending"}</dd>
                </div>
                <div>
                  <dt>Account</dt>
                  <dd>{profile.accountActive ? "active" : "inactive"}</dd>
                </div>
              </dl>
            </article>
            ))}
          </div>
        ) : !errorCopy ? (
          <p className={styles.empty}>No Founder/Core bootstrap records.</p>
        ) : null}
      </section>
        </>
      ) : null}

      <div id="public-inquiry-queue" className={styles.workspaceSection}>
        <ClubsOperationsPublicInquiryQueue />
      </div>

      <div id="team-booking-queue" className={styles.workspaceSection}>
        <ClubsOperationsTeamBookingQueue />
      </div>

      <div id="integration-status" className={styles.workspaceSection}>
        <ClubsOperationsIntegrationStatusPanel />
      </div>

      <div id="payment-status" className={styles.workspaceSection}>
        <ClubsOperationsPaymentStatusPanel />
      </div>

      {model && !errorCopy ? (
        <>
      <section
        id="ambassador-management"
        className={styles.roleSectionHeading}
        aria-labelledby="ambassador-management-title"
      >
        <p className={styles.kicker}>Ambassador Management</p>
        <h2 id="ambassador-management-title">Registry, assignment and immutable audit</h2>
        <p>
          Existing Ambassador records and bounded management commands for the
          active Clubs tenant.
        </p>
      </section>
      <div className={styles.grid}>
        <section className={styles.panel}>
          <div className={styles.panelHeading}>
            <div>
              <p className={styles.kicker}>Registry</p>
              <h2>{editing ? "Edit Ambassador" : "Create Ambassador"}</h2>
            </div>
            {editing ? (
              <button className={styles.textButton} onClick={resetForm}>Cancel edit</button>
            ) : null}
          </div>
          <form className={styles.form} onSubmit={(event) => void submitRegistry(event)}>
            {!editing ? (
              <label>
                Existing reviewer profile key <span>(optional)</span>
                <input
                  value={form.ambassadorProfileId}
                  onChange={(event) => setForm({ ...form, ambassadorProfileId: event.target.value })}
                  placeholder="ambassador_profile_…"
                />
              </label>
            ) : null}
            <label>
              Display name
              <input required minLength={2} maxLength={120} value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} />
            </label>
            <label>
              Operating region
              <input required minLength={2} maxLength={120} value={form.regionLabel} onChange={(event) => setForm({ ...form, regionLabel: event.target.value })} />
            </label>
            <fieldset>
              <legend>Operational labels</legend>
              <div className={styles.checkGrid}>
                {CLUBS_AMBASSADOR_OPERATIONS_CONTRACT.operationalRoles.map((role) => (
                  <label className={styles.check} key={role}>
                    <input type="checkbox" checked={form.operationalRoles.includes(role)} onChange={() => toggleRole(role)} />
                    {role.replaceAll("_", " ")}
                  </label>
                ))}
              </div>
            </fieldset>
            <label>
              Exact reviewer binding ID <span>(optional; does not grant authority)</span>
              <input value={form.reviewerBindingId} onChange={(event) => setForm({ ...form, reviewerBindingId: event.target.value })} placeholder="clubs-direct-membership-reviewer-binding_…" />
            </label>
            <button className={styles.primaryButton} disabled={Boolean(busy) || form.operationalRoles.length === 0}>
              {busy ? "Persisting…" : editing ? "Save immutable edit event" : "Create registry entry"}
            </button>
          </form>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeading}>
            <div>
              <p className={styles.kicker}>Active and revoked state</p>
              <h2>Ambassador registry</h2>
            </div>
            <span className={styles.count}>{model?.registry.length ?? 0}</span>
          </div>
          <div className={styles.cards}>
            {model?.registry.map((entry) => (
              <article className={styles.card} key={entry.ambassadorProfileId}>
                <div className={styles.cardTitle}>
                  <div><h3>{entry.displayName}</h3><p>{entry.regionLabel}</p></div>
                  <span className={entry.status === "active" ? styles.active : styles.inactive}>{entry.status}</span>
                </div>
                <p className={styles.mono} title={entry.ambassadorProfileId}>{short(entry.ambassadorProfileId)}</p>
                <div className={styles.tags}>{entry.operationalRoles.map((role) => <span key={role}>{role.replaceAll("_", " ")}</span>)}</div>
                <dl>
                  <div><dt>Version</dt><dd>{entry.version}</dd></div>
                  <div><dt>Reviewer binding</dt><dd>{entry.reviewerBindingState}</dd></div>
                  <div><dt>Updated</dt><dd>{dateTime(entry.updatedAt)}</dd></div>
                </dl>
                <div className={styles.actions}>
                  <button className={styles.secondaryButton} disabled={entry.status !== "active" || Boolean(busy)} onClick={() => startEdit(entry)}>Edit</button>
                  <button className={styles.dangerButton} disabled={entry.status !== "active" || Boolean(busy)} onClick={() => void deactivate(entry)}>Deactivate</button>
                </div>
              </article>
            ))}
            {!loading && model?.registry.length === 0 ? <p className={styles.empty}>No registry events yet.</p> : null}
          </div>
        </section>
      </div>

      <section className={styles.panel}>
        <div className={styles.panelHeading}>
          <div><p className={styles.kicker}>Work ownership only</p><h2>Application assignment</h2></div>
          <span className={styles.count}>{model?.applications.length ?? 0}</span>
        </div>
        <div className={styles.tableWrap}>
          <table>
            <thead><tr><th>Application</th><th>Application state</th><th>Assignment</th><th>Ambassador</th><th>Action</th></tr></thead>
            <tbody>
              {model?.applications.map((application) => (
                <tr key={application.applicationId}>
                  <td><span className={styles.mono} title={application.applicationId}>{short(application.applicationId)}</span><small>v{application.applicationVersion} · {dateTime(application.submittedAt)}</small></td>
                  <td>{application.applicationStatus.replaceAll("_", " ")}</td>
                  <td>{application.assignmentStatus} · v{application.assignmentVersion}</td>
                  <td>
                    <select value={assignmentChoice[application.applicationId] ?? application.ambassadorProfileId ?? ""} onChange={(event) => setAssignmentChoice((current) => ({ ...current, [application.applicationId]: event.target.value }))}>
                      <option value="">Select active Ambassador</option>
                      {activeAmbassadors.map((entry) => <option key={entry.ambassadorProfileId} value={entry.ambassadorProfileId}>{entry.displayName} · review {entry.reviewerBindingState}</option>)}
                    </select>
                  </td>
                  <td><div className={styles.actions}><button className={styles.primaryButton} disabled={Boolean(busy) || !(assignmentChoice[application.applicationId] ?? application.ambassadorProfileId)} onClick={() => void assign(application.applicationId)}>{application.ambassadorProfileId ? "Reassign" : "Assign"}</button><button className={styles.textButton} disabled={Boolean(busy) || !application.ambassadorProfileId} onClick={() => void unassign(application.applicationId)}>Unassign</button></div></td>
                </tr>
              ))}
              {!loading && model?.applications.length === 0 ? <tr><td colSpan={5} className={styles.empty}>No open direct Membership applications.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeading}><div><p className={styles.kicker}>Append-only evidence</p><h2>Audit trail</h2></div><span className={styles.count}>{model?.audit.length ?? 0}</span></div>
        <div className={styles.auditList}>
          {model?.audit.map((item) => (
            <article key={item.eventId}><span className={styles.ledger}>{item.ledger}</span><div><strong>{item.eventType.replaceAll("_", " ")}</strong><p><span className={styles.mono}>{short(item.subjectId)}</span> · {item.reasonCode.replaceAll("_", " ")}</p></div><div className={styles.auditMeta}><span>{item.actorRole}</span><time>{dateTime(item.occurredAt)}</time></div></article>
          ))}
          {!loading && model?.audit.length === 0 ? <p className={styles.empty}>No audit events yet.</p> : null}
        </div>
      </section>
        </>
      ) : null}
    </main>
  );
}
