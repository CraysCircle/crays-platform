"use client";

import { CheckCircle2, KeyRound, RefreshCw, Send, ShieldCheck, Signature, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

type JsonRecord = Record<string, unknown>;

type NostrEventTemplate = {
  kind: 27235;
  created_at: number;
  content: "";
  tags: string[][];
};

type NostrSignedEvent = NostrEventTemplate & {
  id: string;
  pubkey: string;
  sig: string;
};

type BrowserNostr = {
  getPublicKey: () => Promise<string>;
  signEvent: (event: NostrEventTemplate) => Promise<NostrSignedEvent>;
};

type WindowWithNostr = Window & {
  nostr?: BrowserNostr;
};

type StepStatus = "idle" | "working" | "done" | "blocked";

type ReviewStep = {
  key: string;
  title: string;
  status: StepStatus;
  detail: string;
};

const publicKeyPattern = /^[0-9a-f]{64}$/;

function statusLabel(status: StepStatus) {
  if (status === "done") return "Ready";
  if (status === "working") return "Working";
  if (status === "blocked") return "Blocked";
  return "Pending";
}

function statusClass(status: StepStatus) {
  if (status === "done") return "border-[#2f7f6a]/30 bg-[#2f7f6a]/10 text-[#185c4c]";
  if (status === "working") return "border-[#356f92]/30 bg-[#356f92]/10 text-[#234f6d]";
  if (status === "blocked") return "border-[#9a4b5f]/30 bg-[#9a4b5f]/10 text-[#713044]";
  return "border-black/10 bg-black/[0.03] text-black/55";
}

function safeString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : "none";
}

function isJsonRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

async function readJson(response: Response): Promise<JsonRecord> {
  const payload = (await response.json().catch(() => ({}))) as unknown;
  return isJsonRecord(payload) ? payload : {};
}

function nestedRecord(record: JsonRecord | null, key: string) {
  const value = record?.[key];
  return isJsonRecord(value) ? value : null;
}

function arrayValue(record: JsonRecord | null, key: string) {
  const value = record?.[key];
  return Array.isArray(value) ? value : [];
}

function shortKey(value: string | null) {
  if (!value) return "none";
  return value.length > 18 ? `${value.slice(0, 10)}...${value.slice(-8)}` : value;
}

function InfoRow({ label, value }: { label: string; value: string | boolean | number | undefined }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-black/10 py-3 text-sm last:border-b-0">
      <span className="font-medium text-black/55">{label}</span>
      <span className="text-right font-semibold text-black">{String(value ?? "none")}</span>
    </div>
  );
}

function IconButton({
  children,
  disabled,
  onClick,
  icon,
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      className="inline-flex min-h-11 items-center gap-2 rounded-full bg-black px-5 py-2 text-sm font-bold text-white transition hover:bg-black/80 disabled:cursor-not-allowed disabled:bg-black/25"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {icon}
      {children}
    </button>
  );
}

function SecondaryButton({
  children,
  disabled,
  onClick,
  icon,
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-black/10 bg-white px-5 py-2 text-sm font-bold text-black transition hover:bg-black/[0.04] disabled:cursor-not-allowed disabled:opacity-45"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {icon}
      {children}
    </button>
  );
}

export function NostrHandoffReview() {
  const [session, setSession] = useState<JsonRecord | null>(null);
  const [handoff, setHandoff] = useState<JsonRecord | null>(null);
  const [challenge, setChallenge] = useState<JsonRecord | null>(null);
  const [verifyResult, setVerifyResult] = useState<JsonRecord | null>(null);
  const [pubkeyHex, setPubkeyHex] = useState<string | null>(null);
  const [manualPublicKey, setManualPublicKey] = useState("");
  const [working, setWorking] = useState<string | null>("refresh");
  const [message, setMessage] = useState("Checking provider and CRAYS identity state.");
  const [signerAvailable, setSignerAvailable] = useState(false);

  function detectSigner() {
    const signer = (window as WindowWithNostr).nostr;
    return Boolean(signer && typeof signer.getPublicKey === "function" && typeof signer.signEvent === "function");
  }

  useEffect(() => {
    const bootstrap = window.setTimeout(() => {
      setSignerAvailable(detectSigner());
      void refreshState();
    }, 0);

    return () => window.clearTimeout(bootstrap);
  }, []);

  const sessionBody = nestedRecord(session, "session");
  const handoffIdentity = nestedRecord(handoff, "nostrIdentity");
  const browserSession = nestedRecord(session, "nostrBrowserSession");
  const requiredActions = arrayValue(sessionBody, "requiredActions").filter((item): item is string => typeof item === "string");
  const sessionAccount = nestedRecord(sessionBody, "account");
  const accountId = safeString(handoffIdentity?.accountId ?? sessionAccount?.id);
  const mappedPublicKey = safeString(handoffIdentity?.pubkeyHex);
  const signerStatus = safeString(handoffIdentity?.signerStatus);
  const browserProofStatus = safeString(browserSession?.status);
  const proofAccepted = browserSession?.acceptedForCurrentSession === true;

  const steps = useMemo<ReviewStep[]>(() => {
    const providerAuthenticated = session?.providerAuthenticated === true || handoff?.providerAuthenticated === true;
    const accountMapped = session?.accountMapped === true || handoff?.accountMapped === true;
    const publicKeyReady = Boolean(pubkeyHex && publicKeyPattern.test(pubkeyHex));
    const handoffReady = handoff?.status === "handoff_pending" || signerStatus === "verified";
    const challengeReady = challenge?.status === "proof_required";
    const verified = verifyResult?.status === "verified";

    return [
      {
        key: "provider",
        title: "Provider session",
        status: providerAuthenticated ? "done" : "blocked",
        detail: providerAuthenticated ? "Active provider session is present." : "Open the provider account mapping page first.",
      },
      {
        key: "account",
        title: "CRAYS account mapping",
        status: accountMapped ? "done" : "blocked",
        detail: accountMapped ? "Provider session maps to a reviewed CRAYS account context." : "Create the reviewed CRAYS account mapping first.",
      },
      {
        key: "signer",
        title: "Browser signer",
        status: signerAvailable ? "done" : "blocked",
        detail: signerAvailable ? "Browser signer API is available." : "No compatible browser signer was detected.",
      },
      {
        key: "public-key",
        title: "Public key handoff",
        status: publicKeyReady && handoffReady ? "done" : publicKeyReady ? "working" : "idle",
        detail: publicKeyReady ? `Public key ${shortKey(pubkeyHex)} is ready for proof.` : "Connect a signer to read the public key.",
      },
      {
        key: "challenge",
        title: "Signer challenge",
        status: challengeReady ? "done" : "idle",
        detail: challengeReady ? "Single-use challenge is ready for signing." : "Create a challenge after handoff is prepared.",
      },
      {
        key: "proof",
        title: "Verified proof cookie",
        status: verified || proofAccepted ? "done" : "idle",
        detail:
          verified || proofAccepted
            ? "Browser proof is verified for the active CRAYS account."
            : "Sign and verify the challenge to persist the proof cookie.",
      },
    ];
  }, [challenge, handoff, proofAccepted, pubkeyHex, session, signerAvailable, signerStatus, verifyResult]);

  async function refreshState() {
    setWorking("refresh");
    try {
      const [sessionResponse, handoffResponse] = await Promise.all([
        fetch("/api/crays/auth/session", { cache: "no-store" }),
        fetch("/api/crays/auth/nostr/handoff", { cache: "no-store" }),
      ]);
      setSession(await readJson(sessionResponse));
      setHandoff(await readJson(handoffResponse));
      setMessage("Identity state refreshed.");
    } catch {
      setMessage("Identity state could not be refreshed.");
    } finally {
      setWorking(null);
    }
  }

  async function connectSigner() {
    const signer = (window as WindowWithNostr).nostr;
    if (!signer || typeof signer.getPublicKey !== "function") {
      setSignerAvailable(false);
      setMessage("No compatible browser signer API was detected.");
      return;
    }

    setWorking("connect");
    try {
      const signerPublicKey = await signer.getPublicKey();
      if (typeof signerPublicKey !== "string") {
        setMessage("Browser signer did not return a public key. Unlock or decrypt the signer key first.");
        return;
      }
      const publicKey = signerPublicKey.toLowerCase();
      if (!publicKeyPattern.test(publicKey)) {
        setMessage("Signer returned an invalid public key shape.");
        return;
      }
      setPubkeyHex(publicKey);
      setSignerAvailable(true);
      setMessage("Public key received from browser signer.");
    } catch {
      setMessage("Browser signer did not return a public key. Unlock or decrypt the signer key first.");
    } finally {
      setWorking(null);
    }
  }

  function useManualPublicKey() {
    const normalized = manualPublicKey.trim().toLowerCase();

    if (!publicKeyPattern.test(normalized)) {
      setMessage("Enter a 64-character lowercase hex public key only. Do not paste private key material.");
      return;
    }

    setPubkeyHex(normalized);
    setMessage("Public key accepted for handoff review.");
  }

  async function prepareHandoff() {
    if (!pubkeyHex) {
      setMessage("Connect a browser signer before preparing handoff.");
      return;
    }

    setWorking("handoff");
    try {
      const response = await fetch("/api/crays/auth/nostr/handoff", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pubkeyHex }),
      });
      const payload = await readJson(response);
      setHandoff(payload);
      setMessage(response.ok ? "Public-key handoff prepared." : safeString(payload.reason ?? payload.note ?? payload.nextAction));
    } catch {
      setMessage("Public-key handoff could not be prepared.");
    } finally {
      setWorking(null);
    }
  }

  async function createChallenge() {
    const key = pubkeyHex ?? mappedPublicKey;
    if (!publicKeyPattern.test(key)) {
      setMessage("A lowercase public key is required before creating a challenge.");
      return;
    }

    setWorking("challenge");
    try {
      const response = await fetch("/api/crays/auth/nostr/challenge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pubkeyHex: key }),
      });
      const payload = await readJson(response);
      setChallenge(payload);
      setMessage(response.ok ? "Signer challenge created." : safeString(payload.reason ?? payload.note));
    } catch {
      setMessage("Signer challenge could not be created.");
    } finally {
      setWorking(null);
    }
  }

  async function signAndVerify() {
    const signer = (window as WindowWithNostr).nostr;
    const challengeBody = nestedRecord(challenge, "challenge");
    const eventTemplate = nestedRecord(challengeBody, "eventTemplate") as NostrEventTemplate | null;

    if (!signer || typeof signer.signEvent !== "function") {
      setMessage("No compatible browser signer was detected.");
      return;
    }

    if (!eventTemplate) {
      setMessage("Create a signer challenge before verification.");
      return;
    }

    setWorking("verify");
    try {
      const signedEvent = await signer.signEvent(eventTemplate);
      const response = await fetch("/api/crays/auth/nostr/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ event: signedEvent }),
      });
      const payload = await readJson(response);
      setVerifyResult(payload);
      setMessage(response.ok ? "Signer proof verified. Refreshing session state." : safeString(payload.note ?? payload.reason));
      await refreshState();
    } catch {
      setMessage("Signer proof was not completed.");
    } finally {
      setWorking(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f7f8] px-6 py-10 text-black">
      <section className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-[8px] border border-black/10 bg-white p-7 shadow-sm">
          <p className="text-xs font-bold uppercase text-[#ff0f5f]">CRAYS Identity</p>
          <h1 className="mt-3 text-3xl font-black tracking-normal">Nostr Handoff Review</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-black/65">
            Review the mapped CRAYS account, bind a signer-held public key and verify signer control without sending private key material to CRAYS.
          </p>

          <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {steps.map((step) => (
              <div className="rounded-[8px] border border-black/10 bg-[#fbfbfc] p-4" key={step.key}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-black text-black">{step.title}</p>
                  <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase ${statusClass(step.status)}`}>
                    {statusLabel(step.status)}
                  </span>
                </div>
                <p className="mt-3 text-xs leading-5 text-black/60">{step.detail}</p>
              </div>
            ))}
          </div>

          <div className="mt-7 rounded-[8px] border border-black/10 bg-[#fbfbfc] p-5">
            <p className="text-sm font-black text-black">Review Actions</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <SecondaryButton disabled={Boolean(working)} icon={<RefreshCw size={16} />} onClick={refreshState}>
                Refresh State
              </SecondaryButton>
              <IconButton disabled={Boolean(working)} icon={<KeyRound size={16} />} onClick={connectSigner}>
                Connect Signer
              </IconButton>
              <IconButton disabled={Boolean(working) || !pubkeyHex} icon={<Send size={16} />} onClick={prepareHandoff}>
                Prepare Handoff
              </IconButton>
              <IconButton disabled={Boolean(working) || !pubkeyHex} icon={<Signature size={16} />} onClick={createChallenge}>
                Create Challenge
              </IconButton>
              <IconButton disabled={Boolean(working) || !challenge} icon={<ShieldCheck size={16} />} onClick={signAndVerify}>
                Sign And Verify
              </IconButton>
            </div>
            <div className="mt-5 rounded-[8px] border border-black/10 bg-white p-4">
              <p className="text-xs font-bold uppercase text-black/45">Public key fallback</p>
              <div className="mt-3 flex flex-col gap-3 xl:flex-row">
                <input
                  className="min-h-11 flex-1 rounded-[8px] border border-black/10 bg-white px-3 font-mono text-xs text-black outline-none focus:border-black/35"
                  onChange={(event) => setManualPublicKey(event.target.value)}
                  placeholder="64-character public key hex only"
                  spellCheck={false}
                  value={manualPublicKey}
                />
                <SecondaryButton disabled={Boolean(working)} icon={<KeyRound size={16} />} onClick={useManualPublicKey}>
                  Use Public Key
                </SecondaryButton>
              </div>
              <p className="mt-3 text-xs leading-5 text-black/55">
                This field accepts a public key only. Private key material, nsec, ncryptsec, seeds, tokens and credentials must stay out of CRAYS.
              </p>
            </div>
            <div className="mt-5 flex items-start gap-3 rounded-[8px] border border-black/10 bg-white p-4 text-sm text-black/70">
              {working ? <RefreshCw className="mt-0.5 animate-spin" size={17} /> : proofAccepted ? <CheckCircle2 className="mt-0.5 text-[#2f7f6a]" size={17} /> : <XCircle className="mt-0.5 text-[#9a4b5f]" size={17} />}
              <p>{message}</p>
            </div>
          </div>
        </div>

        <aside className="rounded-[8px] border border-black/10 bg-white p-6 shadow-sm">
          <p className="text-sm font-black text-black">Current State</p>
          <div className="mt-4 rounded-[8px] border border-black/10 bg-[#fbfbfc] px-4">
            <InfoRow label="Provider authenticated" value={session?.providerAuthenticated === true || handoff?.providerAuthenticated === true} />
            <InfoRow label="Account mapped" value={session?.accountMapped === true || handoff?.accountMapped === true} />
            <InfoRow label="Account id" value={accountId} />
            <InfoRow label="Signer public key" value={shortKey(pubkeyHex ?? (mappedPublicKey === "none" ? null : mappedPublicKey))} />
            <InfoRow label="Signer status" value={signerStatus} />
            <InfoRow label="Browser proof" value={browserProofStatus} />
            <InfoRow label="Accepted for session" value={proofAccepted} />
            <InfoRow label="Private keys returned" value={false} />
            <InfoRow label="Secrets returned" value={false} />
          </div>

          <div className="mt-5 rounded-[8px] border border-black/10 bg-[#fbfbfc] p-4">
            <p className="text-xs font-bold uppercase text-black/45">Required actions</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {requiredActions.length ? (
                requiredActions.map((action) => (
                  <span className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-bold text-black/65" key={action}>
                    {action}
                  </span>
                ))
              ) : (
                <span className="rounded-full border border-[#2f7f6a]/25 bg-[#2f7f6a]/10 px-3 py-1.5 text-xs font-bold text-[#185c4c]">
                  none
                </span>
              )}
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
