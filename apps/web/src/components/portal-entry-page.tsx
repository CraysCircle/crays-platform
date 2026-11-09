import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  LockKeyhole,
} from "lucide-react";
import { getPortalRoleEntries } from "@/lib/portal-access-bridge";

const roleModeLabel = {
  workbench: "Workspace role",
  portal: "Stakeholder role",
  member: "Member role",
} as const;

export function PortalEntryPage() {
  const roleEntries = getPortalRoleEntries();
  const roleGroups = [
    { key: "workbench", label: "CRAYS team roles", entries: roleEntries.filter((entry) => entry.mode === "workbench") },
    { key: "portal", label: "Stakeholder roles", entries: roleEntries.filter((entry) => entry.mode === "portal") },
    { key: "member", label: "Member roles", entries: roleEntries.filter((entry) => entry.mode === "member") },
  ].filter((group) => group.entries.length > 0);
  return (
    <main className="min-h-screen bg-[#f6f4ef] text-[#171613]">
      <header className="mx-auto flex max-w-[1180px] items-center justify-between gap-4 px-5 py-5">
        <Link href="/" className="inline-flex items-center" aria-label="CRAYS home">
          <Image src="/brand/crays-wordmark.svg" alt="CRAYS" width={173} height={43} className="h-9 w-auto" priority />
        </Link>
        <nav className="hidden items-center gap-5 text-sm font-semibold text-[#706c61] md:flex" aria-label="Portal public navigation">
          <Link href="/franchise/">Franchise</Link>
          <Link href="/real-estate">Real Estate</Link>
          <Link href="/funding-partner-bank">Funding Partner Bank</Link>
          <Link href="/investments">Investments</Link>
        </nav>
        <div
          role="status"
          aria-label="Your Login is locked until the Auth0 login procedure is connected"
          className="inline-flex items-center gap-2 rounded-[8px] border border-[#d6d0c3] bg-[#171613] px-4 py-2.5 text-sm font-semibold text-white shadow-sm"
        >
          <LockKeyhole className="h-4 w-4" aria-hidden="true" />
          <span>Your Login</span>
          <span className="hidden rounded-[999px] border border-white/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-white/75 sm:inline">
            Auth0 required
          </span>
        </div>
      </header>

      <section className="mx-auto max-w-[1180px] px-5 pb-8 pt-8 lg:pt-16">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2f7f6a]">CRAYS Portal</p>
          <h1 className="mt-4 max-w-3xl text-5xl font-semibold tracking-normal max-[720px]:text-4xl">
            One temporary bridge into every CRAYS role and stakeholder surface.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[#706c61]">
            Choose a role or public stakeholder page. The bridge validates the target server-side, sets a short-lived
            review cookie and opens the matching CRAYS workspace without exposing source-system credentials.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1180px] px-5 pb-12">
        <div className="rounded-[8px] border border-[#ded9cc] bg-[#fffdf8] p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#2f7f6a]">Your Login</p>
              <h2 className="mt-2 text-2xl font-semibold">Open a role directly</h2>
            </div>
            <span className="rounded-[7px] border border-[#ded9cc] bg-white px-3 py-1 text-xs font-semibold text-[#706c61]">
              {roleEntries.length} roles
            </span>
          </div>

          <div className="mt-5 space-y-6">
            {roleGroups.map((group) => (
              <div key={group.key}>
                <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#706c61]">{group.label}</h3>
                <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {group.entries.map((entry) => (
                    <a
                      key={entry.role}
                      href={entry.href}
                      data-role={entry.role}
                      className="group min-w-0 rounded-[8px] border border-[#ded9cc] bg-white p-4 transition hover:border-[#2f7f6a]"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-base font-semibold">{entry.label}</h4>
                            <span className="rounded-[7px] border border-[#ded9cc] px-2 py-0.5 text-[11px] font-semibold uppercase text-[#706c61]">
                              {roleModeLabel[entry.mode as keyof typeof roleModeLabel] ?? "Role"}
                            </span>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-[#706c61]">{entry.summary}</p>
                          <p className="mt-3 text-xs font-semibold text-[#171613]">Opens: {entry.targetLabel}</p>
                          <p className="mt-1 truncate text-xs text-[#706c61]">
                            Modules: {entry.modules.length ? entry.modules.join(", ") : "public role surface"}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 shrink-0 text-[#706c61] transition group-hover:translate-x-0.5" />
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

    </main>
  );
}
