"use client";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  IssueOcaCredentialGrantDocument,
  OcaSecretCustodyConsoleDocument,
  PreflightIssueOcaCredentialGrantDocument,
  PreflightRevokeOcaSecretAccessDocument,
  PreflightRotateOcaSecretRefDocument,
  ReconcileOcaSecretCommandDocument,
  RevokeOcaSecretAccessDocument,
  RotateOcaSecretRefDocument,
} from "@/graphql/oca-secret-documents";
type Doc = { __meta__: { hash: string } };
type Ref = {
  secretRefId: string;
  secretRefVersion: number;
  operatorId: string;
  verticalCode: string;
  cellId: string;
  providerSystem: string;
  environmentClass: string;
  secretClass: string;
  validUntil: string;
  secretState: string;
  secretRefSha256: string;
};
type Model = {
  status: string;
  access: { allowed: boolean; code: string };
  secretRefs: Ref[];
  credentialGrants: {
    credentialGrantId: string;
    grantState: string;
    expiresAt: string;
  }[];
  rotations: { rotationId: string; rotationState: string }[];
  revocations: { revocationId: string; revocationState: string }[];
  receipts: {
    accessReceiptId: string;
    commandKind: string;
    technicalAckState: string;
    authoritativeOutcome: string;
  }[];
  secretMaterialExposed: boolean;
  providerCallPerformed: boolean;
  nextSafeAction: string;
};
type Kind = "issue" | "rotate" | "revoke";
async function persisted<T>(doc: Doc, variables?: Record<string, unknown>) {
  const response = await fetch("/api/graphql", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        extensions: {
          persistedQuery: { version: 1, sha256Hash: doc.__meta__.hash },
        },
        variables: variables ?? {},
      }),
    }),
    body = await response.json();
  if (!response.ok || body.errors?.length)
    throw Error(body.errors?.[0]?.message ?? `GraphQL HTTP ${response.status}`);
  return body.data as T;
}
const fresh = () => `oca-secret-${Date.now()}-${crypto.randomUUID()}`,
  field = "min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm";
export function OcaSecretCustodyPanel() {
  const [model, setModel] = useState<Model | null>(null),
    [selected, setSelected] = useState(""),
    [key, setKey] = useState(fresh()),
    [purpose, setPurpose] = useState("bounded_provider_action"),
    [confirmed, setConfirmed] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [result, setResult] = useState<Record<string, unknown> | null>(null);
  const readModel = useCallback(() => persisted<{ ocaSecretCustodyConsole: Model }>(
        OcaSecretCustodyConsoleDocument,
      ), []);
  const acceptModel = useCallback((next: Model) => {
    setModel(next);
      setSelected((value) =>
        next.secretRefs.some((item) => item.secretRefId === value)
          ? value
          : (next.secretRefs.find((item) => item.secretState === "active")
              ?.secretRefId ?? ""),
      );
  }, []);
  const load = useCallback(async () => {
    setError("");
    try {
      const data = await readModel();
      acceptModel(data.ocaSecretCustodyConsole);
    } catch (value) {
      setError(value instanceof Error ? value.message : "Secret custody authority unavailable");
    }
  }, [readModel, acceptModel]);
  useEffect(() => {
    let active = true;
    void readModel().then(data => {
      if (active) { setError(""); acceptModel(data.ocaSecretCustodyConsole); }
    }).catch(value => {
      if (active) setError(value instanceof Error ? value.message : "Secret custody authority unavailable");
    });
    return () => { active = false; };
  }, [readModel, acceptModel]);
  const item = useMemo(
    () => model?.secretRefs.find((value) => value.secretRefId === selected),
    [model, selected],
  );
  const input = () => {
    if (!item) throw Error("Select one exact SecretRef.");
    return {
      idempotencyKey: key,
      secretRefId: item.secretRefId,
      expectedVersion: item.secretRefVersion,
      expectedDigest: item.secretRefSha256,
      purposeCode: purpose,
      confirmed,
    };
  };
  async function act(kind: Kind, preflight: boolean) {
    setBusy(true);
    setError("");
    try {
      const docs = {
        issue: [PreflightIssueOcaCredentialGrantDocument, IssueOcaCredentialGrantDocument],
        rotate: [PreflightRotateOcaSecretRefDocument, RotateOcaSecretRefDocument],
        revoke: [PreflightRevokeOcaSecretAccessDocument, RevokeOcaSecretAccessDocument],
      } as const;
      const data = await persisted<Record<string, Record<string, unknown>>>(
        docs[kind][preflight ? 0 : 1],
        { input: { ...input(), confirmed: preflight ? false : confirmed } },
      );
      setResult(Object.values(data)[0] ?? null);
      if (!preflight) await load();
    } catch (value) {
      setError(value instanceof Error ? value.message : "Secret lifecycle command unavailable");
    } finally {
      setBusy(false);
    }
  }
  async function reconcile() {
    setBusy(true);
    setError("");
    try {
      const data = await persisted<{
        reconcileOcaSecretCommand: Record<string, unknown>;
      }>(ReconcileOcaSecretCommandDocument, { originalIdempotencyKey: key });
      setResult(data.reconcileOcaSecretCommand);
      await load();
    } catch (value) {
      setError(value instanceof Error ? value.message : "Reconciliation unavailable");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="rounded-xl border bg-white p-5"
      data-testid="oca-secret-custody"
      aria-busy={busy}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Image
            src="/brand/the-crays-agent-icon.png"
            alt="The Crays agent icon"
            width={48}
            height={48}
            className="rounded-xl"
          />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
              The Crays · private secret custody
            </p>
            <h2 className="text-xl font-semibold">Secret custody and rotation</h2>
            <p className="mt-1 max-w-3xl text-sm text-slate-600">
              Opaque references, short-lived cell grants, dual-control rotation and durable
              revocation receipts. Secret material never enters this view.
            </p>
          </div>
        </div>
        <button
          className="min-h-11 rounded-md border px-4 py-2 text-sm font-medium"
          onClick={() => void load()}
          disabled={busy}
        >
          Reload
        </button>
      </header>
      {error ? (
        <div
          role="alert"
          className="mt-4 min-w-0 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800 [overflow-wrap:anywhere]"
        >
          {error}
        </div>
      ) : null}
      {model && !model.access.allowed ? (
        <div
          role="alert"
          className="mt-4 min-w-0 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm [overflow-wrap:anywhere]"
        >
          {model.access.code}: no SecretRef existence disclosed.
        </div>
      ) : null}
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="text-sm font-medium">
          Canonical SecretRef
          <select
            className={field}
            value={selected}
            onChange={(event) => {
              setSelected(event.target.value);
              setConfirmed(false);
            }}
          >
            <option value="">No authorized reference</option>
            {model?.secretRefs.map((value) => (
              <option
                key={`${value.secretRefId}-${value.secretRefVersion}`}
                value={value.secretRefId}
              >
                {value.operatorId} / {value.verticalCode} / {value.providerSystem} /{" "}
                {value.secretState} / v{value.secretRefVersion}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          Purpose
          <input
            className={field}
            value={purpose}
            onChange={(event) => setPurpose(event.target.value)}
          />
        </label>
        <label className="text-sm font-medium md:col-span-2">
          Idempotency key
          <input className={field} value={key} onChange={(event) => setKey(event.target.value)} />
        </label>
      </div>
      <label className="mt-3 flex min-h-11 items-center gap-3 rounded-md border p-3 text-sm">
        <input
          className="h-11 w-11 shrink-0"
          type="checkbox"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
        />
        <span>
          I confirm the exact reference, cell, purpose and lifecycle consequence. No secret material
          or provider call is authorized.
        </span>
      </label>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {(["issue", "rotate", "revoke"] as Kind[]).map((kind) => (
          <div key={kind} className="grid grid-cols-2 gap-2">
            <button
              className="min-h-11 rounded-md border px-3 py-2 text-sm font-semibold disabled:opacity-50"
              disabled={busy || !item}
              onClick={() => void act(kind, true)}
            >
              Preview {kind}
            </button>
            <button
              className="min-h-11 rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              disabled={busy || !item || !confirmed}
              onClick={() => void act(kind, false)}
            >
              Confirm {kind}
            </button>
          </div>
        ))}
        <button
          className="min-h-11 rounded-md border px-3 py-2 text-sm font-semibold disabled:opacity-50"
          disabled={busy || key.length < 16}
          onClick={() => void reconcile()}
        >
          Reconcile original key
        </button>
        <button
          className="min-h-11 rounded-md border px-3 py-2 text-sm"
          onClick={() => {
            setKey(fresh());
            setConfirmed(false);
            setResult(null);
          }}
        >
          New key
        </button>
      </div>
      {result ? (
        <pre
          aria-live="polite"
          className="mt-4 max-h-80 overflow-auto rounded-md bg-slate-950 p-3 text-xs text-slate-100"
        >
          {JSON.stringify(result, null, 2)}
        </pre>
      ) : null}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="min-w-0 rounded-md border p-3 text-sm [overflow-wrap:anywhere]">
          <b>Authority</b>
          <p>
            {model?.status ?? "loading"} / {model?.access.code}
          </p>
        </div>
        <div className="min-w-0 rounded-md border p-3 text-sm [overflow-wrap:anywhere]">
          <b>Grants</b>
          <p>{model?.credentialGrants.length ?? 0} · max five minutes</p>
        </div>
        <div className="min-w-0 rounded-md border p-3 text-sm [overflow-wrap:anywhere]">
          <b>Rotations</b>
          <p>{model?.rotations.length ?? 0} · dual control</p>
        </div>
        <div className="min-w-0 rounded-md border p-3 text-sm [overflow-wrap:anywhere]">
          <b>Revocations</b>
          <p>{model?.revocations.length ?? 0} · immediate authority</p>
        </div>
        <div className="min-w-0 rounded-md border p-3 text-sm [overflow-wrap:anywhere]">
          <b>Boundary</b>
          <p>Secret exposed: {String(model?.secretMaterialExposed ?? false)}</p>
          <p>Provider calls: {String(model?.providerCallPerformed ?? false)}</p>
        </div>
      </div>
      <p className="mt-4 text-sm text-slate-600">
        Next safe action: {model?.nextSafeAction ?? "Load authorized custody state."}
      </p>
    </section>
  );
}
