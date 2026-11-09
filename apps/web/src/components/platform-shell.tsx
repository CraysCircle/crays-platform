"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Activity,
  BarChart3,
  Beaker,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CircleDollarSign,
  ClipboardList,
  DatabaseZap,
  FileText,
  FolderKanban,
  Handshake,
  Headphones,
  Eye,
  KeyRound,
  LayoutDashboard,
  LockKeyhole,
  Mail,
  MessageSquare,
  Network,
  PanelLeft,
  RotateCcw,
  Settings,
  ShieldCheck,
  Users,
  Workflow,
} from "lucide-react";
import { canSeeDashboardDiagnostics, isDashboardDiagnosticView } from "@/lib/diagnostic-surfaces";
import { modules, modulesForRole, type ModuleKey } from "@/lib/modules";
import { roleByKey, type RoleKey } from "@/lib/roles";

const moduleIcons: Record<ModuleKey, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  crm: BriefcaseBusiness,
  project: FolderKanban,
  erp: CircleDollarSign,
  files: FileText,
  analytics: BarChart3,
  loans: Handshake,
  chat: MessageSquare,
  operations: ClipboardList,
  hr: Users,
  learning: BookOpen,
  support: Headphones,
  sites: Building2,
  sync: DatabaseZap,
  settings: Settings,
};

type ContextNavItem = {
  label: string;
  view?: string;
  record?: string;
  section?: string;
  anchor?: string;
  icon: React.ComponentType<{ className?: string }>;
};

type ContextNavGroup = {
  label: string;
  items: ContextNavItem[];
};

const holidayManagerOperationsNavigation: ContextNavGroup[] = [
  {
    label: "Clubs hospitality",
    items: [
      { label: "Property workbench", anchor: "clubs-property-workbench", icon: Building2 },
      { label: "Today", anchor: "clubs-today-queue-title", icon: ClipboardList },
      { label: "Bookings & Stays", anchor: "clubs-booking-lifecycle-title", icon: CalendarDays },
      { label: "Services & access", anchor: "clubs-service-queue-title", icon: KeyRound },
      { label: "Team workspace", anchor: "clubs-team-launch-heading", icon: Users },
    ],
  },
];

const clubsManagementOperationsNavigation: ContextNavGroup[] = [
  {
    label: "Holiday Manager",
    items: [
      { label: "Operations overview", anchor: "clubs-property-workbench", icon: LayoutDashboard },
      { label: "Owner applications", anchor: "founder-core-access", icon: ClipboardList },
      { label: "Bookings & stays", anchor: "holiday-manager-operations", icon: CalendarDays },
      { label: "Public inquiries", anchor: "public-inquiry-queue", icon: Mail },
      { label: "Integrations", anchor: "integration-status", icon: DatabaseZap },
      { label: "Payment status", anchor: "payment-status", icon: CircleDollarSign },
    ],
  },
  {
    label: "Ambassador",
    items: [
      { label: "Ambassador management", anchor: "ambassador-management", icon: Users },
      { label: "Team booking queue", anchor: "team-booking-queue", icon: ClipboardList },
    ],
  },
];

const contextNavigation: Partial<Record<ModuleKey, ContextNavGroup[]>> = {
  dashboard: [
    {
      label: "Product work",
      items: [
        { label: "Overview", view: "overview", icon: LayoutDashboard },
        { label: "Work Queue", view: "work-queue", icon: ClipboardList },
        { label: "Case Workspace", view: "case", icon: BriefcaseBusiness },
        { label: "Rooms", view: "rooms", icon: LockKeyhole },
        { label: "Actions", view: "actions", icon: ClipboardList },
        { label: "Signals", view: "signals", icon: BarChart3 },
        { label: "Messages", view: "messages", icon: MessageSquare },
      ],
    },
    {
      label: "Diagnostics",
      items: [
        { label: "Process Suites", view: "process-suites", icon: Workflow },
        { label: "Pilot Acceptance", view: "pilot-acceptance", icon: ShieldCheck },
        { label: "Operating Dataset", view: "operating-dataset", icon: DatabaseZap },
        { label: "Object Identity", view: "object-identity", icon: Network },
        { label: "A-Z Simulations", view: "az-simulations", icon: Beaker },
        { label: "Role Scopes", view: "role-scopes", icon: KeyRound },
        { label: "External Preflight", view: "external-preflight", icon: Eye },
        { label: "Apply Sandbox", view: "apply-sandbox", icon: RotateCcw },
        { label: "Monitoring", view: "monitoring", icon: Activity },
        { label: "Beta Readiness", view: "beta-readiness", icon: ShieldCheck },
      ],
    },
  ],
  crm: [
    {
      label: "Workspace",
      items: [
        { label: "Home", view: "home", icon: LayoutDashboard },
        { label: "Inbox", view: "inbox", record: "emails", icon: Mail },
        { label: "Calendar", view: "calendar", record: "calendar-events", icon: CalendarDays },
        { label: "Timeline", view: "timeline", record: "activities", icon: Activity },
      ],
    },
    {
      label: "Objects",
      items: [
        { label: "Companies", view: "records", record: "companies", icon: Building2 },
        { label: "People", view: "records", record: "people", icon: Users },
        { label: "Leads", view: "records", record: "leads", icon: Users },
        { label: "Opportunities", view: "pipeline", record: "opportunities", icon: BarChart3 },
        { label: "Tasks", view: "tasks", record: "tasks", icon: ClipboardList },
        { label: "Notes", view: "records", record: "notes", icon: FileText },
        { label: "Files", view: "files", record: "files", icon: FileText },
      ],
    },
    {
      label: "Views",
      items: [
        { label: "Records", view: "records", icon: LayoutDashboard },
        { label: "Pipeline", view: "pipeline", icon: BarChart3 },
        { label: "Reports", view: "reports", record: "reports", icon: BarChart3 },
      ],
    },
    {
      label: "Control",
      items: [
        { label: "Workflow", view: "workflow", icon: DatabaseZap },
        { label: "Settings", view: "settings", icon: Settings },
      ],
    },
  ],
  project: [
    {
      label: "Workspace",
      items: [
        { label: "Work items", view: "work-items", icon: ClipboardList },
        { label: "Board", view: "board", icon: FolderKanban },
        { label: "Timeline", view: "timeline", icon: CalendarDays },
      ],
    },
    {
      label: "Planning",
      items: [
        { label: "Cycles", view: "cycles", icon: CalendarDays },
        { label: "Modules", view: "modules", icon: FolderKanban },
        { label: "Pages", view: "pages", icon: FileText },
        { label: "Views", view: "views", icon: LayoutDashboard },
      ],
    },
    {
      label: "Control",
      items: [{ label: "Settings", view: "settings", icon: Settings }],
    },
  ],
  erp: [
    {
      label: "Finance",
      items: [
        { label: "Finance summary", view: "finance-summary", icon: CircleDollarSign },
        { label: "Invoices", view: "invoice-status", record: "invoices", icon: FileText },
        { label: "Budgets", view: "budget-review", record: "budgets", icon: BarChart3 },
        { label: "Accounts", view: "finance-summary", record: "accounts", icon: BriefcaseBusiness },
      ],
    },
    {
      label: "Control",
      items: [
        { label: "Settings", view: "settings", icon: Settings },
      ],
    },
  ],
  files: [
    {
      label: "Vault",
      items: [
        { label: "Vault", view: "vault", icon: FileText },
        { label: "Packages", view: "package-builder", record: "packages", icon: FolderKanban },
        { label: "Versions", view: "vault", record: "versions", icon: ClipboardList },
        { label: "Reviews", view: "release-review", record: "approvals", icon: ShieldCheck },
      ],
    },
    {
      label: "Control",
      items: [
        { label: "Settings", view: "settings", icon: Settings },
      ],
    },
  ],
  analytics: [
    {
      label: "Dashboards",
      items: [
        { label: "Scorecards", view: "scorecards", record: "kpis", icon: LayoutDashboard },
        { label: "Risk", view: "risk", record: "alerts", icon: ShieldCheck },
        { label: "Portfolio", view: "portfolio", record: "reports", icon: BarChart3 },
      ],
    },
    {
      label: "Control",
      items: [
        { label: "Reports", view: "reports", record: "reports", icon: FileText },
        { label: "Alerts", view: "alerts", record: "alerts", icon: Bell },
        { label: "Settings", view: "settings", icon: Settings },
      ],
    },
  ],
  loans: [
    {
      label: "Loan desk",
      items: [
        { label: "Packages", view: "package-readiness", record: "packages", icon: FolderKanban },
        { label: "Cases", view: "package-readiness", record: "loan-cases", icon: BriefcaseBusiness },
        { label: "Conditions", view: "conditions", record: "conditions", icon: ClipboardList },
        { label: "Handoff", view: "handoff", icon: Handshake },
      ],
    },
    {
      label: "Control",
      items: [{ label: "Settings", view: "settings", icon: Settings }],
    },
  ],
  operations: [
    {
      label: "Studio operations",
      items: [
        { label: "Studio queue", view: "studio-queue", record: "operations", icon: ClipboardList },
        { label: "Recovery", view: "recovery", record: "recovery", icon: ShieldCheck },
        { label: "Members", view: "members", record: "members", icon: Users },
      ],
    },
    {
      label: "Control",
      items: [{ label: "Settings", view: "settings", icon: Settings }],
    },
  ],
  sync: [
    {
      label: "Data movement",
      items: [
        { label: "Data health", view: "data-health", record: "records", icon: DatabaseZap },
        { label: "Queue", view: "queue", icon: ClipboardList },
        { label: "Performance", view: "performance", icon: BarChart3 },
      ],
    },
    {
      label: "Control",
      items: [{ label: "Settings", view: "settings", icon: Settings }],
    },
  ],
  settings: [
    {
      label: "Settings",
      items: [
        { label: "Users", section: "users", icon: Users },
        { label: "Roles", section: "roles", icon: ShieldCheck },
        { label: "Modules", section: "modules", icon: FolderKanban },
        { label: "Integrations", section: "integrations", icon: DatabaseZap },
        { label: "Data sync", section: "data-sync", icon: DatabaseZap },
      ],
    },
  ],
};

function keyFromPath(pathname: string): ModuleKey {
  if (/^\/en\/clubs\/operations(?:\/|$)/.test(pathname)) return "operations";
  const first = pathname.split("/").filter(Boolean)[0] || "dashboard";
  return modules.some((module) => module.key === first) ? (first as ModuleKey) : "dashboard";
}

function roleParam(role?: RoleKey) {
  return role ? `?role=${role}` : "";
}

function hrefWithParams(route: string, params: Record<string, string | undefined> = {}, role?: RoleKey) {
  const search = new URLSearchParams();
  if (role) search.set("role", role);
  Object.entries(params).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });
  const query = search.toString();
  return query ? `${route}?${query}` : route;
}

export function PlatformShell({ children, initialRole }: { children: React.ReactNode; initialRole?: RoleKey }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeRole = roleByKey(initialRole ?? searchParams.get("role")).key;
  const activeModule = keyFromPath(pathname);
  const role = roleByKey(activeRole);
  const fallbackRoleParam = initialRole ? undefined : activeRole;
  const canUseDiagnostics = canSeeDashboardDiagnostics(activeRole);
  const visibleModules = modulesForRole(activeRole);
  const activeModuleDefinition = modules.find((module) => module.key === activeModule) ?? modules[0];
  const activeModuleGroup = activeModuleDefinition.group;
  const clubsOperationsRoute = /^\/en\/clubs\/operations(?:\/|$)/.test(pathname);
  const activeModuleRoute = clubsOperationsRoute
    ? "/en/clubs/operations"
    : activeModuleDefinition.route;
  const activeContext: ContextNavGroup[] = (() => {
    const fallbackContext: ContextNavGroup[] = [
      {
        label: activeModuleGroup,
        items: [
          { label: "Overview", icon: LayoutDashboard },
          { label: "Queue", view: "queue", icon: ClipboardList },
          { label: "Records", view: "records", icon: FileText },
          { label: "Settings", view: "settings", icon: Settings },
        ],
      },
    ];
    const groups = clubsOperationsRoute && ["crays-management", "admin"].includes(activeRole)
      ? clubsManagementOperationsNavigation
      : activeModule === "operations" && activeRole === "holiday-manager"
        ? holidayManagerOperationsNavigation
        : contextNavigation[activeModule] ?? fallbackContext;

    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          if (activeModule !== "dashboard") return true;
          if (!isDashboardDiagnosticView(item.view)) return true;
          return canUseDiagnostics;
        }),
      }))
      .filter((group) => group.items.length > 0);
  })();
  const currentView = searchParams.get("view") ?? "";
  const currentRecord = searchParams.get("record") ?? "";
  const currentSettingsSection = pathname.split("/").filter(Boolean)[1] ?? "";

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="grid min-h-screen grid-cols-[76px_minmax(220px,280px)_1fr] max-[980px]:grid-cols-[70px_minmax(0,1fr)] max-[720px]:grid-cols-[58px_minmax(0,1fr)]">
        <aside className="sticky top-0 flex h-screen flex-col border-r border-black/10 bg-[var(--rail)] text-white">
          <Link
            href={`/dashboard${roleParam(fallbackRoleParam)}`}
            className="flex h-16 items-center justify-center border-b border-white/10 max-[720px]:h-14"
            aria-label="CRAYS Dashboard"
          >
            <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-[8px] max-[720px]:h-9 max-[720px]:w-9">
              <Image src="/brand/crays-mark-inverse.png" alt="" width={40} height={40} className="h-10 w-10 object-cover max-[720px]:h-9 max-[720px]:w-9" priority />
            </span>
          </Link>
          <nav className="crays-scrollbar flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4 max-[720px]:px-2" aria-label="CRAYS workspaces">
            {visibleModules.map((module) => {
              const Icon = moduleIcons[module.key];
              const active = module.key === activeModule;
              const moduleHref = clubsOperationsRoute && module.key === "operations"
                ? activeModuleRoute
                : module.route;
              return (
                <Link
                  key={module.key}
                  href={`${moduleHref}${roleParam(fallbackRoleParam)}`}
                  className={`group grid h-11 place-items-center rounded-[8px] transition max-[720px]:h-10 ${
                    active ? "bg-white text-[var(--rail)]" : "text-white/72 hover:bg-white/10 hover:text-white"
                  }`}
                  style={active ? { color: "var(--rail)" } : undefined}
                  aria-label={module.label}
                  title={module.label}
                >
                  <Icon className="h-5 w-5" />
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-white/10 p-3 max-[720px]:p-2">
            <div className="grid h-11 place-items-center rounded-[8px] bg-[var(--rail-soft)] text-white/80 max-[720px]:h-10" title="Secure workspace">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>
        </aside>

        <aside className="sticky top-0 h-screen border-r border-[var(--line)] bg-[var(--surface)] max-[980px]:hidden">
          <div className="flex h-full flex-col">
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-[var(--line)] px-5">
              <h1>
                <Link href="/portal" aria-label="Open CRAYS portal">
                  <Image src="/brand/crays-wordmark.svg" alt="CRAYS" width={132} height={33} className="h-8 w-auto object-contain object-left" priority />
                </Link>
              </h1>
                <PanelLeft className="h-5 w-5 text-[var(--ink-muted)]" />
            </div>

            <nav className="crays-scrollbar flex-1 overflow-y-auto px-4 py-5" aria-label={`${activeModuleDefinition.label} navigation`}>
              {activeContext.map((group) => {
                return (
                  <section key={group.label} className="mb-5">
                    <p className="mb-2 px-2 text-xs font-semibold uppercase text-[var(--ink-muted)]">{group.label}</p>
                    <div className="space-y-1">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const firstView = activeContext[0]?.items[0]?.view;
                        const active =
                          activeModule === "settings"
                            ? item.section === currentSettingsSection || (!currentSettingsSection && item.section === "users")
                            : item.record
                              ? item.record === currentRecord && (item.view === currentView || !currentView)
                              : item.view === currentView || (!currentView && item.view === firstView) || (!currentView && item.view === undefined && firstView === undefined);
                        const href = item.anchor
                          ? `${activeModuleRoute}#${item.anchor}`
                          : activeModule === "settings" && item.section
                            ? hrefWithParams(`/settings/${item.section}`, {}, fallbackRoleParam)
                            : hrefWithParams(activeModuleRoute, { view: item.view, record: item.record }, fallbackRoleParam);
                        return (
                          <Link
                            key={`${group.label}-${item.label}`}
                            href={href}
                            className={`flex items-center gap-3 rounded-[8px] px-3 py-2.5 text-sm font-medium transition ${
                              active
                                ? "bg-[var(--foreground)] text-white"
                                : "text-[var(--ink-muted)] hover:bg-[var(--surface-strong)] hover:text-[var(--foreground)]"
                            }`}
                            style={active ? { color: "white" } : undefined}
                          >
                            <Icon className="h-4 w-4" />
                            <span>{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </nav>
          </div>
        </aside>

        <main className="min-w-0 overflow-x-hidden">
          <header className="sticky top-0 z-10 border-b border-[var(--line)] bg-[rgba(246,244,239,0.86)] px-8 py-4 backdrop-blur max-[720px]:px-4">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">
                  {clubsOperationsRoute ? "CRAYS Clubs SaaS" : "Unified operating platform"}
                </p>
                <h2 className="truncate text-lg font-semibold">{role.label}</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-xs font-medium text-[var(--ink-muted)] sm:inline-flex">
                  Event-driven dashboards
                </span>
                <button className="grid h-10 w-10 place-items-center rounded-[8px] border border-[var(--line)] bg-white text-[var(--ink-muted)] transition hover:text-[var(--foreground)]" aria-label="Messages">
                  <MessageSquare className="h-4 w-4" />
                </button>
                <button className="grid h-10 w-10 place-items-center rounded-[8px] border border-[var(--line)] bg-white text-[var(--ink-muted)] transition hover:text-[var(--foreground)]" aria-label="Notifications">
                  <Bell className="h-4 w-4" />
                </button>
              </div>
            </div>
          </header>
          <div className="min-w-0 px-8 py-7 max-[720px]:px-4">{children}</div>
        </main>
      </div>
    </div>
  );
}
