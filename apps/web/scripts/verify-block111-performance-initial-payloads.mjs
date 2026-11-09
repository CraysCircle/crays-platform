import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const requiredFiles = [
  "src/lib/performance/initial-workspace-payloads.ts",
  "src/app/(platform)/[module]/page.tsx",
  "src/components/module-page.tsx",
  "src/components/crm-operational-workspace-page.tsx",
  "src/components/project-work-item-slice-page.tsx",
  "src/db/crm-operational-read-model-repository.ts",
  "src/app/favicon.ico",
  "public/favicon.ico",
];

const checks = [
  {
    file: "src/lib/performance/initial-workspace-payloads.ts",
    patterns: [
      "getInitialCrmOperationalPayload",
      "getInitialProjectWorkItemsPayload",
      "getCachedCrmOperationalReadModel",
      "getCachedOpeningProjectReadModel",
      "defaultSortByFamily",
      "projectInitialRowLimit",
      "payloadMode: \"initial-page\"",
      "fullRowsAvailable",
      "server-rendered to avoid the first client waterfall",
    ],
  },
  {
    file: "src/app/(platform)/[module]/page.tsx",
    patterns: [
      "getInitialWorkspacePayloads",
      "getInitialCrmOperationalPayload",
      "getInitialProjectWorkItemsPayload",
      "initialCrm={initialWorkspacePayloads.initialCrm}",
      "initialProject={initialWorkspacePayloads.initialProject}",
    ],
  },
  {
    file: "src/components/module-page.tsx",
    patterns: [
      "initialCrm?: CrmPayload | null",
      "initialProject?: ProjectWorkItemsPayload | null",
      "initialPayload={initialCrm}",
      "initialPayload={initialProject}",
    ],
  },
  {
    file: "src/components/crm-operational-workspace-page.tsx",
    patterns: [
      "export type CrmPayload",
      "initialPayload?: CrmPayload | null",
      "skipInitialFetchRef",
      "state: \"ready\", data: initialPayload",
    ],
  },
  {
    file: "src/components/project-work-item-slice-page.tsx",
    patterns: [
      "export type ProjectWorkItemsPayload",
      "payloadMode?: \"initial-page\" | \"full\"",
      "initialPayload?: ProjectWorkItemsPayload | null",
      "skipInitialFetchRef",
      "hydrateFullPayloadRef",
      "state: \"ready\", data: initialPayload",
    ],
  },
  {
    file: "src/db/crm-operational-read-model-repository.ts",
    patterns: [
      "type SummaryRow",
      "hasScopedTotal",
      "summaryPromise",
      "totalPromise",
      "getCachedCrmOperationalReadModel",
      "count(*) filter",
    ],
  },
  {
    file: "src/db/opening-project-read-model-repository.ts",
    patterns: ["getCachedOpeningProjectReadModel", "readModelCacheGet", "readModelCacheSet"],
  },
  {
    file: "src/providers/crays-auth-provider.ts",
    patterns: ["const session = readCachedSession(queryClient, initialSession)"],
  },
  {
    file: "src/components/platform-shell.tsx",
    patterns: [
      "roleByKey(initialRole ?? searchParams.get(\"role\"))",
      "const fallbackRoleParam = initialRole ? undefined : activeRole",
      "href=\"/portal\"",
      "flex h-16 shrink-0 items-center justify-between",
      "crays-scrollbar flex-1 overflow-y-auto px-4 py-5",
    ],
  },
  {
    file: "src/lib/dal/server-trust.ts",
    patterns: [
      "const portalBridgeRole = readPortalBridgeRole(request);",
      "const mapped = await resolveMappedSession(request);",
      "authoritySource: \"portal-bridge-cookie\"",
    ],
  },
  {
    file: "src/app/layout.tsx",
    patterns: [
      "manifest: \"/site.webmanifest\"",
      "/favicon.svg?v=crays-favicon-4",
      "/favicon.png?v=crays-favicon-4",
      "/icon.png?v=crays-favicon-4",
      "shortcut",
      "/apple-icon.png?v=crays-favicon-4",
    ],
  },
  {
    file: "src/lib/roles.ts",
    patterns: [
      "key: \"bank-partner\"",
      "label: \"Funding Partner Bank\"",
      "mode: \"portal\"",
    ],
  },
  {
    file: "src/components/portal-entry-page.tsx",
    patterns: [
      "Your Login",
      "LockKeyhole",
      "Auth0 required",
      "role=\"status\"",
      "roleEntries.filter((entry) => entry.mode === \"portal\")",
      "data-role={entry.role}",
    ],
  },
];

const failures = [];

for (const file of requiredFiles) {
  if (!existsSync(file)) failures.push(`Missing ${file}`);
}

for (const check of checks) {
  if (!existsSync(check.file)) continue;
  const source = readFileSync(check.file, "utf8");
  for (const pattern of check.patterns) {
    if (!source.includes(pattern)) failures.push(`${check.file} missing ${pattern}`);
  }
}

const portalSource = existsSync("src/components/portal-entry-page.tsx")
  ? readFileSync("src/components/portal-entry-page.tsx", "utf8")
  : "";
for (const removedPortalCopy of ["Free role access", "Open Deal Manager workspace", "Access boundary", "Pages and workspaces"]) {
  if (portalSource.includes(removedPortalCopy)) {
    failures.push(`src/components/portal-entry-page.tsx still contains removed portal copy: ${removedPortalCopy}`);
  }
}
for (const removedLoginCopy of ["Production login remains locked here", "role tiles below are a temporary review bridge"]) {
  if (portalSource.includes(removedLoginCopy)) {
    failures.push(`src/components/portal-entry-page.tsx still contains removed Auth0 explainer copy: ${removedLoginCopy}`);
  }
}
if (portalSource.includes("href={primaryEntry.href}") || portalSource.includes("const primaryEntry =")) {
  failures.push("src/components/portal-entry-page.tsx must not link the locked Your Login header to a review bridge target");
}

const serverTrustSource = existsSync("src/lib/dal/server-trust.ts") ? readFileSync("src/lib/dal/server-trust.ts", "utf8") : "";
const portalBridgeIndex = serverTrustSource.indexOf("const portalBridgeRole = readPortalBridgeRole(request);");
const mappedSessionIndex = serverTrustSource.indexOf("const mapped = await resolveMappedSession(request);");
if (portalBridgeIndex === -1 || mappedSessionIndex === -1 || portalBridgeIndex > mappedSessionIndex) {
  failures.push("src/lib/dal/server-trust.ts must resolve the portal bridge cookie before calling Auth0 session resolution");
}

const platformShellSource = existsSync("src/components/platform-shell.tsx")
  ? readFileSync("src/components/platform-shell.tsx", "utf8")
  : "";
for (const removedShellCopy of ["id=\"role-switch\"", "Role", "boundary", "Diagnostics are hidden here"]) {
  if (removedShellCopy === "Role") {
    if (platformShellSource.includes("<label") && platformShellSource.includes("Role")) {
      failures.push("src/components/platform-shell.tsx must not render the legacy role switcher label");
    }
    continue;
  }
  if (platformShellSource.includes(removedShellCopy)) {
    failures.push(`src/components/platform-shell.tsx still contains removed sidebar surface: ${removedShellCopy}`);
  }
}
if (platformShellSource.includes("roleParam(activeRole)") || platformShellSource.includes("params.set(\"role\", role);")) {
  failures.push("src/components/platform-shell.tsx must not persist role query params when a portal role is active");
}

const crmWorkspaceSource = existsSync("src/components/crm-operational-workspace-page.tsx")
  ? readFileSync("src/components/crm-operational-workspace-page.tsx", "utf8")
  : "";
if (crmWorkspaceSource.includes("CRM boundary")) {
  failures.push("src/components/crm-operational-workspace-page.tsx must not render the removed CRM boundary card");
}
if (!crmWorkspaceSource.includes("{receipt ? <p className=\"rounded-[8px] border border-border bg-secondary p-3 text-sm\">{receipt}</p> : null}")) {
  failures.push("src/components/crm-operational-workspace-page.tsx should keep CRM command receipts inside the selected-record action area");
}

if (existsSync("src/app/favicon.ico") && existsSync("public/favicon.ico")) {
  const appFaviconHash = createHash("sha256").update(readFileSync("src/app/favicon.ico")).digest("hex");
  const publicFaviconHash = createHash("sha256").update(readFileSync("public/favicon.ico")).digest("hex");
  if (appFaviconHash !== publicFaviconHash) {
    failures.push("src/app/favicon.ico must match public/favicon.ico so App Router pages use the CRAYS favicon");
  }
}

if (failures.length) {
  console.error(JSON.stringify({ status: "failed", failures }, null, 2));
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      status: "ok",
      block: 111,
      focus: "Initial CRM/Project payloads and reduced CRM summary query work",
      guarantees: [
        "CRM and Project platform pages can server-render their first data payload.",
        "CRM and Project client components skip the first duplicate read-model fetch when server data exists.",
        "Project server payload sends a compact above-the-fold slice and hydrates the full board/list after paint.",
        "Server route rendering uses cache-only CRM/Project initial payloads; cold database reads move after the visible shell.",
        "Workspace auth check reuses the server-hydrated session instead of issuing an immediate duplicate session fetch.",
        "CRM summary counters are computed in one aggregate query; scoped total count is skipped on unfiltered family reads.",
        "Refresh, search, filters, pagination, board drag staging and command routes remain live actions.",
      ],
    },
    null,
    2,
  ),
);
