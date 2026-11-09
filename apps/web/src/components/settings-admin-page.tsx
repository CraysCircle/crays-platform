import Link from "next/link";
import {
  Bell,
  Building2,
  CheckCircle2,
  DatabaseZap,
  Fingerprint,
  IdCard,
  KeyRound,
  Layers3,
  Link2,
  LockKeyhole,
  Palette,
  Puzzle,
  ReceiptText,
  ScrollText,
  ShieldCheck,
  SlidersHorizontal,
  Store,
  UserRoundCheck,
  Users,
} from "lucide-react";
import { getAccountIdentitySettingsContract } from "@/lib/account-settings";
import { accessDomainPolicies, roleAccessProfiles } from "@/lib/access-control";
import { getAuthEnvironmentState, getAuthRouteContract } from "@/lib/auth-boundary";
import { getCoreIdentityPersistenceState } from "@/lib/core-identity-persistence";
import { modules } from "@/lib/modules";
import { getNostrAccessContract } from "@/lib/nostr-identity";
import { permissionDefinitions, permissionsForSection } from "@/lib/permissions";
import { roleNostrBindings } from "@/lib/role-nostr-policy";
import { roles } from "@/lib/roles";
import { settingsSections, type SettingsSection, type SettingsSectionKey } from "@/lib/settings";
import { AdapterHealthPanel } from "./adapter-health-panel";
import { BankEvidenceFinancingPilotPanel } from "./bank-evidence-financing-pilot-panel";
import { CoreCommandPersistencePanel } from "./core-command-persistence-panel";
import { CandidateDealRoomPilotPanel } from "./candidate-deal-room-pilot-panel";
import { CandidateEvidenceIntentPilotPanel } from "./candidate-evidence-intent-pilot-panel";
import { ControlledDevWriteModelPanel } from "./controlled-dev-write-model-panel";
import { ControlledBetaReadinessPanel } from "./controlled-beta-readiness-panel";
import { CrossRoleAuditPilotPanel } from "./cross-role-audit-pilot-panel";
import { DomainReadinessPanel } from "./domain-readiness-panel";
import { LocationRentEconomicsPilotPanel } from "./location-rent-economics-pilot-panel";
import { LocationIntelligenceDecisionPanel } from "./location-intelligence-decision-panel";
import { LocalhostAdapterCoveragePanel } from "./localhost-adapter-coverage-panel";
import { MultiCompanyTenantizationPanel } from "./multi-company-tenantization-panel";
import { OperatingPlatformPrototypePanel } from "./operating-platform-prototype-panel";
import { OpeningHandoffPilotPanel } from "./opening-handoff-pilot-panel";
import { OwnerPropertyCheckPilotPanel } from "./owner-property-check-pilot-panel";
import { PilotCloseoutReleaseDecisionPanel } from "./pilot-closeout-release-decision-panel";
import { PilotWorkflowCharterPanel } from "./pilot-workflow-charter-panel";
import { PreparedDealAssemblyPilotPanel } from "./prepared-deal-assembly-pilot-panel";
import { PreparedDealFactoryReadinessPanel } from "./prepared-deal-factory-readiness-panel";
import { ProviderEvidenceArchitecturePanel } from "./provider-evidence-architecture-panel";
import { ProviderEvidenceProgramPanel } from "./provider-evidence-program-panel";
import { ProviderSandboxPilotPanel } from "./provider-sandbox-pilot-panel";
import { ProjectCrmAiSettingsPanel } from "./project-crm-ai-settings-panel";
import { RoleToolFunctionMatrixPanel } from "./role-tool-function-matrix-panel";
import { SourceSmokeEvidencePanel } from "./source-smoke-evidence-panel";
import { SourceFaithfulReadinessPanel } from "./source-faithful-readiness-panel";
import { SyncControlsPanel } from "./sync-controls-panel";
import { ToolNativeDepthReadinessPanel } from "./tool-native-depth-readiness-panel";

const sectionIcons: Record<SettingsSectionKey, React.ComponentType<{ className?: string }>> = {
  users: Users,
  roles: Fingerprint,
  permissions: ShieldCheck,
  modules: Layers3,
  organizations: Building2,
  studios: Store,
  billing: ReceiptText,
  integrations: Puzzle,
  security: LockKeyhole,
  "audit-log": ScrollText,
  notifications: Bell,
  branding: Palette,
  "data-sync": DatabaseZap,
};

const statusTone: Record<SettingsSection["status"], string> = {
  Foundation: "border-emerald-700/20 bg-emerald-50 text-emerald-950",
  Inventory: "border-amber-700/20 bg-amber-50 text-amber-950",
  Policy: "border-rose-700/20 bg-rose-50 text-rose-950",
  "Adapter-ready": "border-sky-700/20 bg-sky-50 text-sky-950",
};

function roleLabel(roleKey: string) {
  return roles.find((role) => role.key === roleKey)?.label ?? roleKey;
}

const contractTone: Record<string, string> = {
  contract_ready: "border-emerald-700/20 bg-emerald-50 text-emerald-950",
  blocked_until_persistence: "border-amber-700/20 bg-amber-50 text-amber-950",
  blocked_until_provider: "border-sky-700/20 bg-sky-50 text-sky-950",
  blocked_until_policy: "border-rose-700/20 bg-rose-50 text-rose-950",
  manual_review: "border-amber-700/20 bg-amber-50 text-amber-950",
};

function contractStatusLabel(status: string) {
  return status.replaceAll("_", " ");
}

function AccessBoundaryPanel() {
  const highlightedRoles = ["deal-manager", "expansion-manager"] as const;
  const highlightedDomains = accessDomainPolicies.filter((policy) =>
    ["candidate-deals", "property-cases", "partner-pipeline", "bank-packages"].includes(policy.key),
  );

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
      <article className="min-w-0 rounded-[8px] border border-[var(--line)] bg-[var(--surface)]">
        <div className="border-b border-[var(--line)] px-5 py-4">
          <h2 className="font-semibold">Role boundaries</h2>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">Operational ownership before live records and adapters are connected.</p>
        </div>
        <div className="grid gap-4 p-4 lg:grid-cols-2">
          {highlightedRoles.map((role) => {
            const profile = roleAccessProfiles[role];
            return (
              <div key={role} className="rounded-[8px] border border-[var(--line)] bg-white p-4">
                <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{roleLabel(role)}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {profile.primaryModules.map((module) => (
                    <span key={module} className="rounded-[7px] border border-[var(--line)] px-2.5 py-1 text-xs font-semibold uppercase text-[var(--ink-muted)]">
                      {module}
                    </span>
                  ))}
                </div>
                <div className="mt-4 space-y-3">
                  <div>
                    <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Owns</p>
                    <ul className="mt-2 space-y-1 text-sm leading-6 text-[var(--foreground)]">
                      {profile.owns.slice(0, 4).map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Denied by default</p>
                    <ul className="mt-2 space-y-1 text-sm leading-6 text-[var(--ink-muted)]">
                      {profile.deniedByDefault.slice(0, 4).map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </article>

      <aside className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
        <h2 className="font-semibold">Domain policies</h2>
        <div className="mt-4 space-y-3">
          {highlightedDomains.map((policy) => (
            <div key={policy.key} className="rounded-[8px] bg-white p-3">
              <div className="flex items-start justify-between gap-3">
                <strong className="text-sm">{policy.label}</strong>
                <span className="rounded-[7px] border border-[var(--line)] px-2 py-1 text-[11px] font-semibold uppercase text-[var(--ink-muted)]">
                  {roleLabel(policy.ownerRole)}
                </span>
              </div>
              <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">{policy.records.join(", ")}</p>
              <p className="mt-3 text-xs font-semibold uppercase text-[var(--ink-muted)]">{policy.rules.length} rules</p>
            </div>
          ))}
        </div>
      </aside>
    </section>
  );
}

function SettingsNav({ activeKey }: { activeKey?: SettingsSectionKey }) {
  return (
    <aside className="min-w-0 rounded-[8px] border border-[var(--line)] bg-[var(--surface)]">
      <div className="border-b border-[var(--line)] p-4">
        <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Settings</p>
        <h2 className="mt-1 text-lg font-semibold">Admin areas</h2>
      </div>
      <nav className="crays-scrollbar max-h-[680px] overflow-y-auto p-2" aria-label="Settings navigation">
        <Link
          href="/settings"
          className={`mb-1 flex items-center gap-3 rounded-[8px] px-3 py-2.5 text-sm font-semibold transition ${
            activeKey ? "text-[var(--ink-muted)] hover:bg-[var(--surface-strong)] hover:text-[var(--foreground)]" : "bg-[var(--foreground)] text-white"
          }`}
          style={activeKey ? undefined : { color: "white" }}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Overview
        </Link>
        {settingsSections.map((section) => {
          const Icon = sectionIcons[section.key];
          const active = section.key === activeKey;
          return (
            <Link
              key={section.key}
              href={section.path}
              className={`flex items-center gap-3 rounded-[8px] px-3 py-2.5 text-sm font-medium transition ${
                active ? "bg-[var(--foreground)] text-white" : "text-[var(--ink-muted)] hover:bg-[var(--surface-strong)] hover:text-[var(--foreground)]"
              }`}
              style={active ? { color: "white" } : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{section.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

function AccountIdentityPanel() {
  const identityContract = getAccountIdentitySettingsContract();
  const summaryCards = [
    {
      label: "CRAYS ID",
      value: "NIP-05",
      context: "reserved per account",
      icon: IdCard,
    },
    {
      label: "Access methods",
      value: identityContract.accessMethods.length.toString(),
      context: "mapped to one account",
      icon: Link2,
    },
    {
      label: "Role binding",
      value: identityContract.roleBindings.length.toString(),
      context: "required bindings",
      icon: UserRoundCheck,
    },
    {
      label: "Key handoff",
      value: "One-time",
      context: "no plaintext storage",
      icon: KeyRound,
    },
  ];

  return (
    <section className="space-y-5">
      <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Account identity</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal">CRAYS account mapping</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--ink-muted)]">
              Provider access, CRAYS ID, Nostr identity, role binding and scope review are managed as one account lifecycle.
            </p>
          </div>
          <span className={`rounded-[7px] border px-3 py-1 text-xs font-semibold uppercase ${contractTone[identityContract.status]}`}>
            {contractStatusLabel(identityContract.status)}
          </span>
        </div>
      </article>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.label} className="rounded-[8px] border border-[var(--line)] bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{card.label}</p>
                <Icon className="h-4 w-4 text-[var(--accent)]" />
              </div>
              <strong className="mt-3 block text-xl font-semibold">{card.value}</strong>
              <span className="mt-2 block text-sm text-[var(--ink-muted)]">{card.context}</span>
            </article>
          );
        })}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <article className="min-w-0 rounded-[8px] border border-[var(--line)] bg-[var(--surface)]">
          <div className="border-b border-[var(--line)] px-5 py-4">
            <h2 className="font-semibold">Identity lifecycle</h2>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">Contract stages before live account data can be returned.</p>
          </div>
          <div className="divide-y divide-[var(--line)]">
            {identityContract.stages.map((stage, index) => (
              <div key={stage.key} className="grid gap-4 px-5 py-4 md:grid-cols-[44px_minmax(0,1fr)_180px]">
                <div className="grid h-9 w-9 place-items-center rounded-[8px] bg-white text-sm font-semibold text-[var(--accent)]">{index + 1}</div>
                <div className="min-w-0">
                  <strong className="block text-sm">{stage.label}</strong>
                  <span className="mt-1 block text-sm leading-6 text-[var(--ink-muted)]">{stage.description}</span>
                  <span className="mt-2 block text-xs font-semibold uppercase text-[var(--ink-muted)]">{stage.owner}</span>
                </div>
                <div>
                  <span className={`inline-flex rounded-[7px] border px-2.5 py-1 text-xs font-semibold uppercase ${contractTone[stage.status]}`}>
                    {contractStatusLabel(stage.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </article>

        <aside className="space-y-4">
          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <div className="flex items-center gap-2">
              <Fingerprint className="h-5 w-5 text-[var(--blue)]" />
              <h2 className="font-semibold">Nostr mapping</h2>
            </div>
            <div className="mt-4 space-y-3">
              {["CRAYS ID", "npub / public key", "NIP-05 state", "Signer proof", "Role binding"].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-[8px] bg-white p-3 text-sm font-medium">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--accent)]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <div className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-[var(--amber)]" />
              <h2 className="font-semibold">Key handoff states</h2>
            </div>
            <div className="mt-4 space-y-3">
              {identityContract.keyHandoffStates.map((state) => (
                <div key={state.state} className="rounded-[8px] bg-white p-3">
                  <div className="flex items-center justify-between gap-3">
                    <strong className="text-sm">{state.label}</strong>
                    <span className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{state.userVisible ? "visible" : "hidden"}</span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">{state.nextAction}</p>
                </div>
              ))}
            </div>
          </article>
        </aside>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <article className="min-w-0 rounded-[8px] border border-[var(--line)] bg-[var(--surface)]">
          <div className="border-b border-[var(--line)] px-5 py-4">
            <h2 className="font-semibold">Access method contracts</h2>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">Every method maps into one CRAYS account and requires Nostr identity.</p>
          </div>
          <div className="grid gap-3 p-4 md:grid-cols-2">
            {identityContract.accessMethods.map((method) => (
              <div key={method.key} className="rounded-[8px] border border-[var(--line)] bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <strong className="text-sm">{method.label}</strong>
                  <span className={`rounded-[7px] border px-2 py-1 text-[11px] font-semibold uppercase ${contractTone[method.status]}`}>
                    {contractStatusLabel(method.status)}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">{method.purpose}</p>
                <p className="mt-3 text-xs font-semibold uppercase text-[var(--ink-muted)]">{method.source}</p>
              </div>
            ))}
          </div>
        </article>

        <aside className="space-y-4">
          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <h2 className="font-semibold">Role binding policy</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">
              Every role assignment is bound to the same public identity before product permissions can be used.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {identityContract.roleBindings.map((binding) => (
                <span key={binding.role} className="rounded-[7px] border border-[var(--line)] bg-white px-2.5 py-1 text-xs font-medium">
                  {binding.label}
                </span>
              ))}
            </div>
          </article>

          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <h2 className="font-semibold">Identity guardrails</h2>
            <div className="mt-4 space-y-3">
              {identityContract.guardrails.map((guardrail) => (
                <div key={guardrail} className="flex gap-3 rounded-[8px] bg-white p-3 text-sm leading-6">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
                  <span>{guardrail}</span>
                </div>
              ))}
            </div>
          </article>
        </aside>
      </section>
    </section>
  );
}

function OverviewContent() {
  return (
    <div className="min-w-0 space-y-6">
      <section className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-6 max-[720px]:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-[7px] bg-[var(--foreground)] px-3 py-1 text-xs font-semibold uppercase text-white">Global</span>
          <span className="rounded-[7px] border border-[var(--line)] bg-white px-3 py-1 text-xs font-semibold uppercase text-[var(--ink-muted)]">
            Admin foundation
          </span>
        </div>
        <h1 className="mt-5 text-4xl font-semibold tracking-normal max-[720px]:text-3xl">Settings</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--ink-muted)]">
          One CRAYS settings system for users, roles, permissions, organizations, studios, modules, integrations, security and data movement.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Sections", settingsSections.length.toString(), "admin areas"],
          ["Roles", roles.length.toString(), "typed"],
          ["Modules", modules.length.toString(), "registered"],
          ["Permissions", permissionDefinitions.length.toString(), "defined"],
        ].map(([label, value, context]) => (
          <article key={label} className="rounded-[8px] border border-[var(--line)] bg-white p-4">
            <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{label}</p>
            <strong className="mt-3 block text-3xl font-semibold">{value}</strong>
            <span className="mt-2 block text-sm text-[var(--ink-muted)]">{context}</span>
          </article>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {settingsSections.map((section) => {
          const Icon = sectionIcons[section.key];
          return (
            <Link key={section.key} href={section.path} className="block rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5 transition hover:border-[var(--accent)]">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[8px] bg-white text-[var(--accent)]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-semibold">{section.label}</h2>
                    <p className="mt-1 text-sm leading-6 text-[var(--ink-muted)]">{section.purpose}</p>
                  </div>
                </div>
                <span className={`shrink-0 rounded-[7px] border px-2.5 py-1 text-xs font-semibold ${statusTone[section.status]}`}>{section.status}</span>
              </div>
            </Link>
          );
        })}
      </section>
    </div>
  );
}

function SectionContent({ section }: { section: SettingsSection }) {
  const Icon = sectionIcons[section.key];
  const permissions = permissionsForSection(section.key);
  const authEnvironment = section.key === "security" ? getAuthEnvironmentState() : null;
  const authContract = section.key === "security" ? getAuthRouteContract() : null;
  const persistenceState = section.key === "security" || section.key === "users" ? getCoreIdentityPersistenceState() : null;
  const nostrContract = section.key === "security" ? getNostrAccessContract() : null;
  const configuredAuthKeys = authEnvironment?.keys.filter((key) => key.configured).length ?? 0;
  const roleNostrBindingCount = roleNostrBindings.filter((binding) => binding.required).length;

  return (
    <div className="min-w-0 space-y-6">
      <section className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-6 max-[720px]:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-[7px] bg-[var(--foreground)] px-3 py-1 text-xs font-semibold uppercase text-white">{section.visibility}</span>
          <span className={`rounded-[7px] border px-3 py-1 text-xs font-semibold uppercase ${statusTone[section.status]}`}>{section.status}</span>
        </div>
        <div className="mt-5 flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[8px] bg-white text-[var(--accent)]">
            <Icon className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-4xl font-semibold tracking-normal max-[720px]:text-3xl">{section.label}</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--ink-muted)]">{section.purpose}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
        {authEnvironment ? (
          <article className="rounded-[8px] border border-[var(--line)] bg-white p-4">
            <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Auth boundary</p>
            <strong className="mt-3 block text-lg font-semibold">
              {authEnvironment.connectionState === "provider_ready" ? "Provider ready" : "Contract ready"}
            </strong>
          </article>
        ) : null}
        {nostrContract ? (
          <article className="rounded-[8px] border border-[var(--line)] bg-white p-4">
            <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Issued identity</p>
            <strong className="mt-3 block text-lg font-semibold">Every account</strong>
          </article>
        ) : null}
        {nostrContract ? (
          <article className="rounded-[8px] border border-[var(--line)] bg-white p-4">
            <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Role binding</p>
            <strong className="mt-3 block text-lg font-semibold">
              {roleNostrBindingCount} / {roles.length}
            </strong>
          </article>
        ) : null}
        {persistenceState ? (
          <article className="rounded-[8px] border border-[var(--line)] bg-white p-4">
            <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Identity store</p>
            <strong className="mt-3 block text-lg font-semibold">
              {persistenceState.connectionState === "configured" ? "Configured" : "Contract ready"}
            </strong>
          </article>
        ) : null}
        <article className="rounded-[8px] border border-[var(--line)] bg-white p-4">
          <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Owner</p>
          <strong className="mt-3 block text-lg font-semibold">{section.owner}</strong>
        </article>
        <article className="rounded-[8px] border border-[var(--line)] bg-white p-4">
          <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Core records</p>
          <strong className="mt-3 block text-lg font-semibold">{section.records.length}</strong>
        </article>
        <article className="rounded-[8px] border border-[var(--line)] bg-white p-4">
          <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Permission gates</p>
          <strong className="mt-3 block text-lg font-semibold">{permissions.length}</strong>
        </article>
      </section>

      {section.key === "permissions" ? <AccessBoundaryPanel /> : null}

      {section.key === "users" ? <AccountIdentityPanel /> : null}

      {section.key === "data-sync" ? (
        <>
          <SyncControlsPanel />
          <LocalhostAdapterCoveragePanel />
          <SourceSmokeEvidencePanel />
          <SourceFaithfulReadinessPanel />
          <ToolNativeDepthReadinessPanel />
          <RoleToolFunctionMatrixPanel />
          <ControlledDevWriteModelPanel />
          <CoreCommandPersistencePanel />
          <PilotWorkflowCharterPanel />
          <OwnerPropertyCheckPilotPanel />
          <LocationRentEconomicsPilotPanel />
          <PreparedDealAssemblyPilotPanel />
          <CandidateDealRoomPilotPanel />
          <CandidateEvidenceIntentPilotPanel />
          <BankEvidenceFinancingPilotPanel />
          <OpeningHandoffPilotPanel />
          <CrossRoleAuditPilotPanel />
          <PilotCloseoutReleaseDecisionPanel />
          <ControlledBetaReadinessPanel />
          <MultiCompanyTenantizationPanel />
          <OperatingPlatformPrototypePanel />
          <PreparedDealFactoryReadinessPanel />
          <ProviderEvidenceArchitecturePanel />
          <LocationIntelligenceDecisionPanel />
          <ProviderEvidenceProgramPanel />
          <ProviderSandboxPilotPanel />
          <AdapterHealthPanel />
          <DomainReadinessPanel />
        </>
      ) : null}

      {section.key === "integrations" || section.key === "modules" ? <ProjectCrmAiSettingsPanel /> : null}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <article className="min-w-0 rounded-[8px] border border-[var(--line)] bg-[var(--surface)]">
          <div className="border-b border-[var(--line)] px-5 py-4">
            <h2 className="font-semibold">Permission matrix</h2>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">Initial CRAYS-native permissions for this settings area.</p>
          </div>
          <div className="divide-y divide-[var(--line)]">
            {(permissions.length ? permissions : permissionDefinitions.slice(0, 3)).map((permission) => (
              <div key={permission.key} className="px-5 py-4">
                <div className="min-w-0">
                  <strong className="block text-sm">{permission.label}</strong>
                  <span className="mt-1 block text-sm leading-6 text-[var(--ink-muted)]">{permission.description}</span>
                </div>
                <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Allowed roles</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {permission.roles.map((role) => (
                        <span key={role} className="rounded-[7px] border border-[var(--line)] bg-white px-2.5 py-1 text-xs font-medium">
                          {roleLabel(role)}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Scopes</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {permission.scopes.map((scope) => (
                        <span key={scope} className="rounded-[7px] border border-[var(--line)] bg-white px-2.5 py-1 text-xs font-medium">
                          {scope}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </article>

        <aside className="space-y-4">
          {authEnvironment && authContract ? (
            <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
              <div className="flex items-center gap-2">
                <LockKeyhole className="h-5 w-5 text-[var(--accent)]" />
                <h2 className="font-semibold">Auth boundary</h2>
              </div>
              <div className="mt-4 grid gap-3">
                <div className="rounded-[8px] bg-white p-3">
                  <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Connection state</p>
                  <strong className="mt-1 block text-sm">
                    {authEnvironment.connectionState === "provider_ready" ? "Provider ready" : "Contract ready"}
                  </strong>
                </div>
                <div className="rounded-[8px] bg-white p-3">
                  <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Configured keys</p>
                  <strong className="mt-1 block text-sm">
                    {configuredAuthKeys} / {authEnvironment.keys.length}
                  </strong>
                </div>
                <div className="rounded-[8px] bg-white p-3">
                  <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Callback path</p>
                  <strong className="mt-1 block text-sm">{authContract.callbackPath}</strong>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-[var(--ink-muted)]">
                Provider identity is accepted only after CRAYS maps account, role, organization and scopes.
              </p>
            </article>
          ) : null}
          {nostrContract ? (
            <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
              <div className="flex items-center gap-2">
                <Fingerprint className="h-5 w-5 text-[var(--blue)]" />
                <h2 className="font-semibold">Nostr identity</h2>
              </div>
              <div className="mt-4 grid gap-3">
                <div className="rounded-[8px] bg-white p-3">
                  <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Identifier</p>
                  <strong className="mt-1 block text-sm">NIP-05 handle</strong>
                </div>
                <div className="rounded-[8px] bg-white p-3">
                  <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Stable key</p>
                  <strong className="mt-1 block text-sm">npub / public key</strong>
                </div>
                <div className="rounded-[8px] bg-white p-3">
                  <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Issued by</p>
                  <strong className="mt-1 block text-sm">CRAYS</strong>
                </div>
                <div className="rounded-[8px] bg-white p-3">
                  <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Proof methods</p>
                  <strong className="mt-1 block text-sm">{nostrContract.proofMethods.join(", ").toUpperCase()}</strong>
                </div>
                <div className="rounded-[8px] bg-white p-3">
                  <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Role binding</p>
                  <strong className="mt-1 block text-sm">Required for every role</strong>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-[var(--ink-muted)]">
                Every account receives a CRAYS NIP-05 handle and key pair. The private key is handed over once, then role binding uses the public key.
              </p>
            </article>
          ) : null}
          {persistenceState ? (
            <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
              <div className="flex items-center gap-2">
                <DatabaseZap className="h-5 w-5 text-[var(--green)]" />
                <h2 className="font-semibold">Identity store</h2>
              </div>
              <div className="mt-4 grid gap-3">
                <div className="rounded-[8px] bg-white p-3">
                  <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Schema version</p>
                  <strong className="mt-1 block text-sm">{persistenceState.schemaVersion}</strong>
                </div>
                <div className="rounded-[8px] bg-white p-3">
                  <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Core tables</p>
                  <strong className="mt-1 block text-sm">{persistenceState.requiredTables}</strong>
                </div>
                <div className="rounded-[8px] bg-white p-3">
                  <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Protected tables</p>
                  <strong className="mt-1 block text-sm">{persistenceState.rlsProtectedTables}</strong>
                </div>
                <div className="rounded-[8px] bg-white p-3">
                  <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Migration</p>
                  <strong className="mt-1 block text-sm">{persistenceState.migration.executionStatus}</strong>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-[var(--ink-muted)]">
                Account, role, organization, Nostr challenge and audit records are defined as a CRAYS-owned persistence contract.
              </p>
            </article>
          ) : null}
          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <h2 className="font-semibold">Core records</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {section.records.map((record) => (
                <span key={record} className="rounded-[7px] border border-[var(--line)] bg-white px-3 py-2 text-sm font-medium">
                  {record}
                </span>
              ))}
            </div>
          </article>
          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <h2 className="font-semibold">Guardrails</h2>
            <div className="mt-4 space-y-3">
              {section.guardrails.map((guardrail) => (
                <div key={guardrail} className="flex gap-3 rounded-[8px] bg-white p-3 text-sm leading-6">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
                  <span>{guardrail}</span>
                </div>
              ))}
            </div>
          </article>
          <article className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <h2 className="font-semibold">Integration boundary</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">
              This page defines CRAYS policy and admin structure only. Real reads and writes must pass future API, permission and audit checks.
            </p>
          </article>
        </aside>
      </section>
    </div>
  );
}

export function SettingsAdminPage({ section }: { section?: SettingsSection }) {
  return (
    <div className="mx-auto grid max-w-[1440px] min-w-0 gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <div className="order-2 min-w-0 lg:order-1">
        <SettingsNav activeKey={section?.key} />
      </div>
      <div className="order-1 min-w-0 lg:order-2">{section ? <SectionContent section={section} /> : <OverviewContent />}</div>
    </div>
  );
}
