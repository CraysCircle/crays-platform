"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Boxes, RefreshCw, ShieldCheck } from "lucide-react";
import {
  BuildOcaContextPackageDocument,
  InvalidateOcaContextPackageDocument,
  OcaContextBrokerWorkbenchDocument,
  PreflightBuildOcaContextPackageDocument,
  ReconcileOcaContextRequestDocument,
} from "@/graphql/oca-context-documents";
type Doc = { __meta__: { hash: string } };
type Grant = {
  operationGrantId: string;
  grantVersion: number;
  operationName: string;
  allowedRecordTypes: string[];
  allowedFieldPaths: string[];
  maxRecords: number;
  maxClaims: number;
  maxBytes: number;
  maxTokens: number;
  maxTtlSeconds: number;
  grantState: string;
  grantSha256: string;
};
type Manifest = {
  contextPackageId: string;
  packageVersion: number;
  packageSha256: string;
  packageState: string;
  disclosedClaimCount: number;
  deniedClaimCount: number;
  expiresAt: string;
};
type Model = {
  status: string;
  access: { allowed: boolean; code: string };
  operationGrants: Grant[];
  requests: unknown[];
  packages: Manifest[];
  sourceClaims: unknown[];
  receipts: unknown[];
  denials: unknown[];
  reconciliations: unknown[];
  nextSafeAction: string;
};
type Pf = {
  allowed: boolean;
  code: string;
  effectiveClaimNames: string[];
  deniedClaimNames: string[];
  nextSafeAction: string;
};
type Built = {
  status: string;
  replayed: boolean;
  receiptId?: string | null;
  package?: {
    contextPackageId: string;
    packageVersion: number;
    packageSha256: string;
    state: string;
    claims: Array<{
      fieldPath: string;
      value: string;
      sourceSystem: string;
      sourceRecordVersion: string;
      transformation: string;
    }>;
    deniedClaimNames?: string[];
    rawReplaySuppressed: boolean;
  } | null;
  nextSafeAction: string;
};
async function persisted<T>(
  document: Doc,
  variables: Record<string, unknown> = {},
) {
  const response = await fetch("/api/graphql", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        extensions: {
          persistedQuery: { version: 1, sha256Hash: document.__meta__.hash },
        },
        variables,
      }),
    }),
    body = (await response.json()) as {
      data?: T;
      errors?: Array<{ message: string }>;
    };
  if (!response.ok || body.errors?.length || !body.data)
    throw Error(body.errors?.[0]?.message ?? `GraphQL HTTP ${response.status}`);
  return body.data;
}
const fresh = () => `oca-context-${Date.now()}-${crypto.randomUUID()}`;
export function OcaContextBrokerPanel() {
  const [model, setModel] = useState<Model | null>(null),
    [busy, setBusy] = useState(true),
    [error, setError] = useState(""),
    [recordId, setRecordId] = useState(""),
    [claimText, setClaimText] = useState(
      "consent.consent_state,consent.hidden_note",
    ),
    [key, setKey] = useState(""),
    [reconcileKey, setReconcileKey] = useState(""),
    [pf, setPf] = useState<Pf | null>(null),
    [built, setBuilt] = useState<Built | null>(null),
    [reconciled, setReconciled] = useState<string>("");
  const readModel = useCallback(() => persisted<{ ocaContextBrokerWorkbench: Model }>(OcaContextBrokerWorkbenchDocument), []);
  const acceptModel = useCallback((next: Model) => { setModel(next); }, []);
  const load = useCallback(async () => {
    setBusy(true);setError("");
    try { const data = await readModel(); acceptModel(data.ocaContextBrokerWorkbench); }
    catch (value) { setError(value instanceof Error ? value.message : "Context Broker unavailable."); }
    finally { setBusy(false); }
  }, [readModel, acceptModel]);
  useEffect(() => {
    let active = true;
    const initialKey = fresh();
    void readModel().then(data => {
      if (active) { setError("");acceptModel(data.ocaContextBrokerWorkbench); }
    }).catch(value => {
      if (active) setError(value instanceof Error ? value.message : "Context Broker unavailable.");
    }).finally(() => {
      if (active) { setKey(initialKey);setBusy(false); }
    });
    return () => { active = false; };
  }, [readModel, acceptModel]);
  const grant =
      model?.operationGrants.find((x) => x.grantState === "active") ?? null,
    claims = useMemo(
      () =>
        claimText
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
      [claimText],
    ),
    input = grant
      ? {
          idempotencyKey: key,
          operationGrantId: grant.operationGrantId,
          operationGrantVersion: grant.grantVersion,
          operationGrantSha256: grant.grantSha256,
          entryRecordType: "consent",
          entryRecordId: recordId,
          requestedClaimNames: claims,
          recipientClass: "internal",
          channel: "web",
          modelRouteClass: "no_model",
          maxRecords: 1,
          maxClaims: Math.min(2, grant.maxClaims),
          maxBytes: Math.min(1024, grant.maxBytes),
          maxTokens: Math.min(256, grant.maxTokens),
          freshnessSeconds: 3600,
          ttlSeconds: Math.min(120, grant.maxTtlSeconds),
        }
      : null;
  async function preflight() {
    if (!input) return;
    setBusy(true);
    try {
      const x = await persisted<{ preflightBuildOcaContextPackage: Pf }>(
        PreflightBuildOcaContextPackageDocument,
        { input },
      );
      setPf(x.preflightBuildOcaContextPackage);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Preflight failed closed.");
    } finally {
      setBusy(false);
    }
  }
  async function build() {
    if (!input || !pf?.allowed) return;
    setBusy(true);
    try {
      const x = await persisted<{ buildOcaContextPackage: Built }>(
        BuildOcaContextPackageDocument,
        { input },
      );
      setBuilt(x.buildOcaContextPackage);
      setReconcileKey(key);
      setKey(fresh());
      setPf(null);
      await load();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unknown outcome; preserve the exact key.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function reconcile() {
    if (reconcileKey.length < 16) return;
    const x = await persisted<{
      reconcileOcaContextRequest: {
        status: string;
        outcome?: string | null;
        nextSafeAction: string;
      };
    }>(ReconcileOcaContextRequestDocument, {
      originalIdempotencyKey: reconcileKey,
    });
    setReconciled(
      `${x.reconcileOcaContextRequest.status} · ${x.reconcileOcaContextRequest.outcome ?? "unknown"}`,
    );
  }
  async function invalidate() {
    if (!built?.package) return;
    const x = await persisted<{
      invalidateOcaContextPackage: { status: string; code: string };
    }>(InvalidateOcaContextPackageDocument, {
      input: {
        idempotencyKey: fresh(),
        contextPackageId: built.package.contextPackageId,
        expectedPackageVersion: built.package.packageVersion,
        expectedPackageSha256: built.package.packageSha256,
        reason: "Browser gate invalidation",
      },
    });
    setBuilt({
      ...built,
      status: `${x.invalidateOcaContextPackage.status} · ${x.invalidateOcaContextPackage.code}`,
    });
    await load();
  }
  return (
    <section
      className="rounded-[12px] border bg-white p-5"
      data-testid="oca-context-broker"
      aria-busy={busy}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">
            OCA-PB-06 · bounded provenance authority
          </p>
          <h2 className="mt-1 flex items-center gap-2 text-lg font-semibold">
            <Boxes className="h-5 w-5" />
            Context preview and provenance
          </h2>
          <p className="mt-1 text-sm">
            Ephemeral values, durable digests, exact source versions and no
            standing raw-data copy.
          </p>
        </div>
        <button
          className="inline-flex min-h-11 items-center gap-2 border px-3"
          disabled={busy}
          onClick={() => void load()}
        >
          <RefreshCw className="h-4 w-4" />
          Reload context
        </button>
      </header>
      {error ? (
        <p role="alert" className="mt-4 border border-rose-200 bg-rose-50 p-3">
          {error}
        </p>
      ) : null}
      {model && !model.access.allowed ? (
        <p
          role="alert"
          className="mt-4 border border-amber-200 bg-amber-50 p-3"
        >
          {model.access.code}
        </p>
      ) : null}
      {model?.access.allowed ? (
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <article className="border p-3">
              <span className="text-xs uppercase">Operation grants</span>
              <strong className="block">{model.operationGrants.length}</strong>
            </article>
            <article className="border p-3">
              <span className="text-xs uppercase">Requests</span>
              <strong className="block">{model.requests.length}</strong>
            </article>
            <article className="border p-3">
              <span className="text-xs uppercase">Packages</span>
              <strong className="block">{model.packages.length}</strong>
            </article>
            <article className="border p-3">
              <span className="text-xs uppercase">Receipts</span>
              <strong className="block">{model.receipts.length}</strong>
            </article>
          </div>
          <article className="border p-4">
            <h3 className="flex items-center gap-2 font-semibold">
              <ShieldCheck className="h-4 w-4" />
              Build bounded package
            </h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <input
                aria-label="Canonical consent record ID"
                className="min-h-11 border px-3"
                value={recordId}
                onChange={(e) => {
                  setRecordId(e.target.value);
                  setPf(null);
                }}
              />
              <input
                aria-label="Requested context claims comma separated"
                className="min-h-11 border px-3"
                value={claimText}
                onChange={(e) => {
                  setClaimText(e.target.value);
                  setPf(null);
                }}
              />
            </div>
            <button
              className="mt-3 min-h-11 border border-black px-4 font-semibold disabled:opacity-50"
              disabled={busy || !input || !recordId}
              onClick={() => void preflight()}
            >
              Preflight context
            </button>
            {pf ? (
              <div role="status" className="mt-3 border p-3">
                <strong>{pf.code}</strong>
                <p>Allowed: {pf.effectiveClaimNames.join(", ") || "none"}</p>
                <p>Denied: {pf.deniedClaimNames.join(", ") || "none"}</p>
                {pf.allowed ? (
                  <button
                    className="mt-3 min-h-11 bg-black px-4 font-semibold text-white"
                    onClick={() => void build()}
                  >
                    Build ephemeral package
                  </button>
                ) : null}
              </div>
            ) : null}
          </article>
          {built ? (
            <article aria-live="polite" className="border p-4">
              <h3 className="font-semibold">
                {built.status} · receipt {built.receiptId ?? "unconfirmed"}
              </h3>
              {built.package?.claims.map((x) => (
                <p key={x.fieldPath} className="mt-2">
                  <strong>{x.fieldPath}</strong>: {x.value} · {x.sourceSystem} v
                  {x.sourceRecordVersion}
                </p>
              ))}
              <p className="mt-2 text-sm">
                Raw replay suppressed:{" "}
                {String(built.package?.rawReplaySuppressed ?? false)}
              </p>
              {built.package && !built.status.startsWith("invalidated") ? (
                <button
                  className="mt-3 min-h-11 border border-black px-4"
                  onClick={() => void invalidate()}
                >
                  Invalidate exact package
                </button>
              ) : null}
            </article>
          ) : null}
          <article className="border p-4">
            <h3 className="font-semibold">Exact request reconciliation</h3>
            <input
              aria-label="Original context request idempotency key"
              className="mt-2 min-h-11 w-full border px-3"
              value={reconcileKey}
              onChange={(e) => setReconcileKey(e.target.value)}
            />
            <button
              className="mt-3 min-h-11 border border-black px-4 disabled:opacity-50"
              disabled={reconcileKey.length < 16}
              onClick={() => void reconcile()}
            >
              Reconcile context request
            </button>
            {reconciled ? (
              <p role="status" className="mt-3">
                {reconciled}
              </p>
            ) : null}
          </article>
          <p className="text-sm text-[var(--ink-muted)]">
            Next safe action: {model.nextSafeAction}
          </p>
        </div>
      ) : null}
    </section>
  );
}
