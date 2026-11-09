import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

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
    if (["node_modules", ".next", "storybook-static", "output", "test-results"].includes(entry.name)) continue;
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
  const routes = [];
  if (!fs.existsSync(directory)) return routes;

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) routes.push(...collectRouteFiles(fullPath));
    else if (entry.isFile() && entry.name === "route.ts") routes.push(fullPath);
  }

  return routes.sort();
}

function auditRouteRoleAuthority() {
  const routeFiles = collectRouteFiles(path.join(root, "src", "app", "api", "crays"));
  const directRolePatterns = [
    { key: "roleByKey", pattern: /\broleByKey\s*\(/ },
    { key: "roleSearchParam", pattern: /searchParams\.get\(\s*["'`]role["'`]\s*\)/ },
    { key: "bodyRole", pattern: /\bbody(?:\?\.)?\.role\b/ },
    { key: "roleHeader", pattern: /\bheaders\s*\([^)]*\)[\s\S]{0,160}\.get\(\s*["'`](?:x-crays-role|x-role|role)["'`]\s*\)/ },
  ];

  const reports = routeFiles.map((absolutePath) => {
    const source = fs.readFileSync(absolutePath, "utf8");
    const relativePath = path.relative(root, absolutePath).replaceAll(path.sep, "/");
    const findings = directRolePatterns.filter(({ pattern }) => pattern.test(source)).map(({ key }) => key);
    const usesServerTrustBoundary = /resolveCraysRoute(?:Role|Context)\s*\(/.test(source);
    return { path: relativePath, findings, usesServerTrustBoundary };
  });

  return {
    scannedRoutes: reports.length,
    serverTrustBoundaryRoutes: reports.filter((report) => report.usesServerTrustBoundary).length,
    remainingDirectRoleAuthority: reports
      .filter((report) => report.findings.length > 0 && !report.usesServerTrustBoundary)
      .map(({ path: routePath, findings }) => ({ path: routePath, findings })),
  };
}

const packageJson = JSON.parse(read("package.json"));
for (const scriptName of [
  "verify:block89:quality-system",
  "verify:block90:final-full-check",
  "security:audit:route-role-authority",
  "verify:operational-realism-fixtures",
  "build-storybook",
  "build",
  "lint",
]) {
  assert(Boolean(packageJson.scripts?.[scriptName]), `package.json missing final quality script: ${scriptName}`);
}

const sourceFiles = walkFiles(path.join(root, "src"), [".ts", ".tsx"]);
const sourceTexts = sourceFiles.map((absolutePath) => ({
  path: path.relative(root, absolutePath).replaceAll(path.sep, "/"),
  source: fs.readFileSync(absolutePath, "utf8"),
}));

const routeAudit = auditRouteRoleAuthority();
assert(routeAudit.remainingDirectRoleAuthority.length === 0, `Protected route role authority still has ${routeAudit.remainingDirectRoleAuthority.length} remaining routes.`);

for (const { path: relativePath, source } of sourceTexts) {
  assert(!source.includes("preparedFranchiseOffers"), `Static productive preparedFranchiseOffers reference remains in ${relativePath}.`);

  for (const [label, pattern] of [
    ["dead anchor href", /href\s*=\s*["'`]#["'`]/],
    ["empty onClick handler", /onClick\s*=\s*\{\s*\(\s*\)\s*=>\s*\{\s*\}\s*\}/],
    ["lorem ipsum placeholder", /lorem ipsum/i],
    ["AI-internal mindmap surface", /AI[-\s]?internal[\s\S]{0,80}mindmap|mindmap[\s\S]{0,80}AI[-\s]?internal/i],
  ]) {
    assert(!pattern.test(source), `${label} found in ${relativePath}.`);
  }

  for (const [flag, pattern] of [
    ["externalSendingEnabled", /externalSendingEnabled\s*:\s*true/],
    ["bankSendEnabled", /bankSendEnabled\s*:\s*true/],
    ["paymentInitiationEnabled", /paymentInitiationEnabled\s*:\s*true/],
    ["financePostingEnabled", /financePostingEnabled\s*:\s*true/],
    ["targetApplyEnabled", /targetApplyEnabled\s*:\s*true/],
    ["sourceWritesEnabled", /sourceWritesEnabled\s*:\s*true/],
    ["syncApplyEnabled", /syncApplyEnabled\s*:\s*true/],
    ["toolApplyEnabled", /toolApplyEnabled\s*:\s*true/],
    ["productionDeployEnabled", /productionDeployEnabled\s*:\s*true/],
    ["uploadsEnabled", /uploadsEnabled\s*:\s*true/],
    ["privatePreviewEnabled", /privatePreviewEnabled\s*:\s*true/],
  ]) {
    assert(!pattern.test(source), `${flag}: true found in ${relativePath}.`);
  }
}

const publicContract = read("src/lib/public-deal-package.ts");
assert(publicContract.includes("PublicDealPackageDTO"), "Public DTO contract missing.");
assert(publicContract.includes("PUBLIC_DEAL_PACKAGE_ALLOWED_FIELDS"), "Public DTO allowlist missing.");
assert(publicContract.includes("PUBLIC_DEAL_PACKAGE_FORBIDDEN_FIELD_PATTERNS"), "Public DTO forbidden field pattern guard missing.");

const publicPage = read("src/app/(web)/pre-packed-deals/page.tsx");
assert(publicPage.includes("getPublicDealPackageReadModel"), "Public deal page must server-fetch Public Deal Package DTOs.");
assert(!publicPage.includes("use client"), "Public deal page must remain a server component.");

const franchisePage = read("public/static-pages/franchise.html");
assert(franchisePage.includes('href="/portal"'), "Franchise page must route approved deal CTAs to /portal.");
assert(!/See Our Pre-Packed Deals[\s\S]{0,220}href="\/pre-packed-deals"/.test(franchisePage), "Franchise deal CTA still routes to /pre-packed-deals.");

const franchiseJs = read("public/franchise/franchise.js");
assert(franchiseJs.includes('const dealManagerDashboardHref = "/portal"'), "Franchise JS must keep See Our Pre-Packed Deals CTAs on /portal.");
assert(!franchiseJs.includes("localhost:3000/pre-packed-deals"), "Franchise JS still rewrites CTAs to localhost /pre-packed-deals.");

const portalPage = read("src/components/portal-entry-page.tsx");
assert(portalPage.includes("getPortalRoleEntries"), "Portal page must use role allowlist.");
assert(portalPage.includes("getPortalSurfaceEntries"), "Portal page must use surface allowlist.");
assert(!portalPage.includes("?role="), "Portal page must not render direct protected ?role= links.");

const portalRoute = read("src/app/(web)/portal/enter/[role]/[target]/route.ts");
assert(portalRoute.includes("portalBridgeRoleCookieName"), "Portal bridge route must set HttpOnly role cookie.");
assert(portalRoute.includes("portalBridgeIssuedMarker"), "Portal bridge route must set the audited issued marker cookie.");
assert(!portalRoute.includes('redirectUrl.searchParams.set("role"'), "Portal bridge route must not append protected ?role= redirects.");

const serverTrust = read("src/lib/dal/server-trust.ts");
assert(serverTrust.includes('"portal-bridge-cookie"'), "Server trust boundary must recognize the temporary portal bridge cookie authority source.");
assert(serverTrust.includes("readPortalBridgeRole"), "Server trust boundary must validate portal bridge cookies server-side.");

const platformModulePage = read("src/app/(platform)/[module]/page.tsx");
assert(!platformModulePage.includes("queryRole"), "Platform module page must not use ?role= as authority.");
assert(platformModulePage.includes('cookieRole ?? "guest"'), "Platform module page must fall back closed when no portal/session role exists.");

const publicRouteFiles = sourceTexts.filter(({ path: relativePath }) => relativePath.startsWith("src/app/(web)/"));
for (const { path: relativePath, source } of publicRouteFiles) {
  assert(!source.includes("@refinedev/") && !source.includes("<Refine"), `Refine leaked into public route source ${relativePath}.`);
}

const crmOperationalWorkspace = read("src/components/crm-operational-workspace-page.tsx");
for (const marker of ["Notes", "summary.notes", 'if (family === "notes")', "Role-scoped CRM inbox", "Meeting and site-visit calendar"]) {
  assert(crmOperationalWorkspace.includes(marker), `CRM operational workspace missing final tab marker: ${marker}`);
}

for (const handover of [
  "../docs/CRAYS_BLOCK_88_CLIENT_BOUNDARY_HARDENING_HANDOVER_2026_07_13.md",
  "../docs/CRAYS_BLOCK_89_QUALITY_SYSTEM_HANDOVER_2026_07_13.md",
  "../docs/ui/no-dead-surfaces-rule.md",
  "../docs/ui/retained-diagnostic-surfaces-ledger.md",
  "../docs/testing/acceptance-matrix.md",
]) {
  assert(fs.existsSync(path.join(root, handover)), `Missing final documentation artifact ${handover}`);
}

const summary = {
  ok: failures.length === 0,
  scannedRoutes: routeAudit.scannedRoutes,
  serverTrustBoundaryRoutes: routeAudit.serverTrustBoundaryRoutes,
  remainingDirectRoleAuthorityRoutes: routeAudit.remainingDirectRoleAuthority.length,
  publicDtoOnly: true,
  portalBridgeGuarded: true,
  noFatalDeadSurfacePatterns: !failures.some((failure) => /dead anchor|empty onClick|lorem|mindmap/.test(failure)),
  sideEffectFlagsClosed: !failures.some((failure) => /Enabled: true/.test(failure)),
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(summary, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(summary, null, 2));
