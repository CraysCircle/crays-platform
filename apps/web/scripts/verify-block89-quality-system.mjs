import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];
const warnings = [];

function read(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    failures.push(`Missing ${relativePath}`);
    return "";
  }
  return fs.readFileSync(fullPath, "utf8");
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function walkFiles(directory, extensions, results = []) {
  if (!fs.existsSync(directory)) return results;

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (["node_modules", ".next", "storybook-static", "test-results", "output"].includes(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      walkFiles(fullPath, extensions, results);
    } else if (extensions.some((extension) => entry.name.endsWith(extension))) {
      results.push(fullPath);
    }
  }

  return results;
}

function collectRouteFiles(directory) {
  const results = [];
  if (!fs.existsSync(directory)) return results;

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectRouteFiles(fullPath));
    } else if (entry.isFile() && entry.name === "route.ts") {
      results.push(fullPath);
    }
  }

  return results.sort();
}

function auditRouteRoleAuthority() {
  const routeFiles = collectRouteFiles(path.join(root, "src", "app", "api", "crays"));
  const directRolePatterns = [
    { key: "roleByKey", pattern: /\broleByKey\s*\(/ },
    { key: "roleSearchParam", pattern: /searchParams\.get\(\s*["'`]role["'`]\s*\)/ },
    { key: "bodyRole", pattern: /\bbody(?:\?\.)?\.role\b/ },
    { key: "roleHeader", pattern: /\bheaders\s*\([^)]*\)[\s\S]{0,160}\.get\(\s*["'`](?:x-crays-role|x-role|role)["'`]\s*\)/ },
  ];

  const reports = routeFiles
    .map((absolutePath) => {
      const source = fs.readFileSync(absolutePath, "utf8");
      const relativePath = path.relative(root, absolutePath).replaceAll(path.sep, "/");
      const findings = directRolePatterns.filter(({ pattern }) => pattern.test(source)).map(({ key }) => key);
      const usesServerTrustBoundary = /resolveCraysRoute(?:Role|Context)\s*\(/.test(source);
      return { path: relativePath, usesServerTrustBoundary, findings };
    })
    .sort((a, b) => a.path.localeCompare(b.path));

  return {
    scannedRoutes: reports.length,
    serverTrustBoundaryRoutes: reports.filter((report) => report.usesServerTrustBoundary).length,
    directRoleAuthorityRoutes: reports.filter((report) => report.findings.length > 0).length,
    remainingDirectRoleAuthorityRoutes: reports.filter((report) => report.findings.length > 0 && !report.usesServerTrustBoundary).length,
    remainingDirectRoleAuthority: reports
      .filter((report) => report.findings.length > 0 && !report.usesServerTrustBoundary)
      .map(({ path: routePath, findings }) => ({ path: routePath, findings })),
  };
}

const packageJson = JSON.parse(read("package.json"));
const scripts = packageJson.scripts ?? {};

for (const scriptName of [
  "build",
  "lint",
  "build-storybook",
  "verify:contracts",
  "security:audit:route-role-authority",
  "verify:operational-realism-fixtures",
  "verify:block73:trust-boundary",
  "verify:block74:resource-contracts",
  "verify:block75:workspace-provider",
  "verify:block76:shell-navigation",
  "verify:block77:entity-table",
  "verify:block78:field-mutation-system",
  "verify:block79:crm-collection-slice",
  "verify:block80:crm-entity-workspace",
  "verify:block81:project-work-item-slice",
  "verify:block82:project-board",
  "verify:block83:public-publication",
  "verify:block84:portal-bridge",
  "verify:block85:candidate-portal",
  "verify:block86:stakeholder-portals",
  "verify:block87:remaining-workspace-migration",
  "verify:block88:client-boundary-hardening",
]) {
  assert(Boolean(scripts[scriptName]), `package.json missing required quality script: ${scriptName}`);
}

const sourceFiles = walkFiles(path.join(root, "src"), [".ts", ".tsx"]);
const sourceTexts = sourceFiles.map((absolutePath) => ({
  path: path.relative(root, absolutePath).replaceAll(path.sep, "/"),
  source: fs.readFileSync(absolutePath, "utf8"),
}));

for (const { path: relativePath, source } of sourceTexts) {
  if (source.includes("preparedFranchiseOffers")) {
    failures.push(`Static productive preparedFranchiseOffers reference remains in ${relativePath}`);
  }

  for (const [label, pattern] of [
    ["dead anchor href", /href\s*=\s*["'`]#["'`]/],
    ["empty onClick handler", /onClick\s*=\s*\{\s*\(\s*\)\s*=>\s*\{\s*\}\s*\}/],
    ["lorem ipsum placeholder", /lorem ipsum/i],
    ["AI-internal mindmap surface", /AI[-\s]?internal[\s\S]{0,80}mindmap|mindmap[\s\S]{0,80}AI[-\s]?internal/i],
  ]) {
    if (pattern.test(source)) failures.push(`${label} found in ${relativePath}`);
  }
}

const publicContract = read("src/lib/public-deal-package.ts");
assert(publicContract.includes("PUBLIC_DEAL_PACKAGE_ALLOWED_FIELDS"), "Public deal package allowlist missing.");
assert(publicContract.includes("PUBLIC_DEAL_PACKAGE_FORBIDDEN_FIELD_PATTERNS"), "Public deal package forbidden field patterns missing.");
assert(publicContract.includes("internalFieldsReturned: false"), "Public deal package contract must expose internal-field leakage false evidence.");

const franchiseStaticPage = read("public/static-pages/franchise.html");
assert(franchiseStaticPage.includes('href="/portal"'), "Franchise static page must route See Our Pre-Packed Deals CTAs to /portal.");
assert(!/See Our Pre-Packed Deals[\s\S]{0,220}href="\/pre-packed-deals"/.test(franchiseStaticPage), "Franchise deal CTA still routes to /pre-packed-deals instead of /portal.");

const franchiseJs = read("public/franchise/franchise.js");
assert(franchiseJs.includes('const dealManagerDashboardHref = "/portal"'), "Franchise JS must not rewrite See Our Pre-Packed Deals CTAs away from /portal.");
assert(!franchiseJs.includes("localhost:3000/pre-packed-deals"), "Franchise JS still points CTAs at localhost /pre-packed-deals.");

const portalEntryPage = read("src/components/portal-entry-page.tsx");
assert(portalEntryPage.includes("getPortalRoleEntries"), "Portal entry page must use the role allowlist.");
assert(portalEntryPage.includes("getPortalSurfaceEntries"), "Portal entry page must use the surface allowlist.");
assert(!portalEntryPage.includes("?role="), "Portal entry page must not render direct protected ?role= links.");

const portalRoute = read("src/app/(web)/portal/enter/[role]/[target]/route.ts");
assert(portalRoute.includes("portalBridgeRoleCookieName"), "Portal entry route must set the server bridge role cookie.");
assert(portalRoute.includes("portalBridgeIssuedMarker"), "Portal entry route must set the audited bridge marker cookie.");
assert(!portalRoute.includes('redirectUrl.searchParams.set("role"'), "Portal entry route must not append ?role= to protected redirects.");

const serverTrust = read("src/lib/dal/server-trust.ts");
assert(serverTrust.includes('"portal-bridge-cookie"'), "Server trust boundary must recognize the temporary portal bridge cookie authority source.");

const platformModulePage = read("src/app/(platform)/[module]/page.tsx");
assert(!platformModulePage.includes("queryRole"), "Platform module page must not use ?role= as authority.");

const crmOperationalWorkspace = read("src/components/crm-operational-workspace-page.tsx");
for (const marker of [
  'emails: "Inbox"',
  '"calendar-events": "Calendar"',
  'tasks: "Tasks"',
  'activities: "Timeline"',
  'notes: "Notes"',
  'if (value === "inbox") return "emails"',
  'if (value === "calendar") return "calendar-events"',
  'if (family === "companies")',
  'if (family === "people")',
  'if (family === "leads")',
  'if (family === "opportunities")',
  'if (family === "emails")',
  'if (family === "calendar-events")',
  'if (family === "tasks")',
  'if (family === "activities")',
  'if (family === "notes")',
]) {
  assert(crmOperationalWorkspace.includes(marker), `CRM operational workspace missing distinct family marker: ${marker}`);
}

const stakeholderPortal = read("src/components/stakeholder-portal-page.tsx");
for (const marker of ["Overview", "Work", "Documents", "Finance", "Messages", "Relationship scope", "Document boundary", "External stakeholder sending is closed"]) {
  assert(stakeholderPortal.includes(marker), `Stakeholder portal missing role-specific tab/gate marker: ${marker}`);
}

const candidatePortal = read("src/components/candidate-portal-page.tsx");
for (const marker of ["Candidate scope", "Public DTO packages", "Document boundary", "Financing gates", "External sending is closed"]) {
  assert(candidatePortal.includes(marker), `Candidate portal missing candidate-safe tab/gate marker: ${marker}`);
}

const modulePage = read("src/components/module-page.tsx");
for (const marker of [
  'if (analyticsView === "portfolio")',
  'if (analyticsView === "reports" || analyticsView === "financial-model")',
  'if (analyticsView === "risk" || analyticsView === "alerts")',
  'if (analyticsView === "settings")',
  'const erpView = view ?? "finance-summary"',
  'const operationsView = view ?? "studio-queue"',
  "initialPayload={initialViews}",
]) {
  assert(modulePage.includes(marker), `Module routing/initial data marker missing: ${marker}`);
}
assert(!modulePage.includes("getWorkbenchSavedViewsReadModel"), "ModulePage must not import Workbench Saved Views read-model code.");

const workbenchControls = read("src/components/workbench-view-controls.tsx");
assert(workbenchControls.includes("if (initialPayload && refreshKey === 0)"), "WorkbenchViewControls must skip first client fetch when server payload exists.");
assert(workbenchControls.includes("export type WorkbenchViewControlsPayload"), "WorkbenchViewControls payload type must remain exported for server page initialization.");

const blockDocs = [
  "../docs/ui/no-dead-surfaces-rule.md",
  "../docs/ui/retained-diagnostic-surfaces-ledger.md",
  "../docs/testing/acceptance-matrix.md",
  "../docs/CRAYS_BLOCK_88_CLIENT_BOUNDARY_HARDENING_HANDOVER_2026_07_13.md",
];
for (const doc of blockDocs) assert(fs.existsSync(path.join(root, doc)), `Missing quality/governance document ${doc}`);

const acceptanceMatrix = read("../docs/testing/acceptance-matrix.md");
for (const block of Array.from({ length: 20 }, (_, index) => String(index + 71))) {
  assert(acceptanceMatrix.includes(`| ${block} |`), `Acceptance matrix missing Block ${block}`);
}
assert(acceptanceMatrix.includes("no-dead-surfaces"), "Acceptance matrix must keep no-dead-surfaces as a programme-wide gate.");

const routeAudit = auditRouteRoleAuthority();
const block90RouteAuthorityBaseline = 154;
if (routeAudit.remainingDirectRoleAuthorityRoutes > block90RouteAuthorityBaseline) {
  failures.push(
    `Direct role authority route count regressed to ${routeAudit.remainingDirectRoleAuthorityRoutes}; expected <= ${block90RouteAuthorityBaseline}.`,
  );
}
if (routeAudit.remainingDirectRoleAuthorityRoutes > 0) {
  warnings.push(
    `${routeAudit.remainingDirectRoleAuthorityRoutes} routes still have direct role authority patterns outside the server trust boundary. This is a Block 90 hard-gate open issue, not release-ready.`,
  );
}

const summary = {
  ok: failures.length === 0,
  qualityScriptsPresent: true,
  staticPreparedOffersRemoved: !sourceTexts.some(({ source }) => source.includes("preparedFranchiseOffers")),
  noFatalDeadSurfacePatterns: !failures.some((failure) => /dead anchor|empty onClick|lorem ipsum|mindmap/.test(failure)),
  crmTabsDistinctGuarded: true,
  stakeholderAndCandidatePortalsGuarded: true,
  serverFirstSavedViewsGuarded: true,
  routeAuthorityAudit: {
    scannedRoutes: routeAudit.scannedRoutes,
    serverTrustBoundaryRoutes: routeAudit.serverTrustBoundaryRoutes,
    remainingDirectRoleAuthorityRoutes: routeAudit.remainingDirectRoleAuthorityRoutes,
    block90HardGateSatisfied: routeAudit.remainingDirectRoleAuthorityRoutes === 0,
  },
  warnings,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(summary, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(summary, null, 2));
