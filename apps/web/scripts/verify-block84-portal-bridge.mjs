import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), "utf8");

const errors = [];
const assert = (condition, message) => {
  if (!condition) errors.push(message);
};

const portalBridge = read("src/lib/portal-access-bridge.ts");
const portalPage = read("src/components/portal-entry-page.tsx");
const portalRoute = read("src/app/(web)/portal/enter/[role]/[target]/route.ts");
const platformLayout = read("src/app/(platform)/layout.tsx");
const platformPage = read("src/app/(platform)/[module]/page.tsx");
const platformShell = read("src/components/platform-shell.tsx");
const authBoundary = read("src/lib/auth-boundary.ts");
const franchiseHtml = read("public/static-pages/franchise.html");

const roleKeys = [
  "crays-management",
  "admin",
  "deal-manager",
  "expansion-manager",
  "finance",
  "hr",
  "franchise-candidate",
  "franchise-partner",
  "studio-manager",
  "bank-partner",
  "investor",
  "landlord",
  "vendor",
  "reviewer",
  "gym-member",
  "guest",
];

for (const role of roleKeys) {
  assert(portalBridge.includes(`${role}`), `Portal bridge is missing role ${role}.`);
}

for (const target of [
  "dashboard-overview",
  "crm-home",
  "crm-inbox",
  "crm-calendar",
  "project-work-items",
  "project-board",
  "project-real-estate",
  "erp",
  "files",
  "analytics-partner",
  "loans-bank-package",
  "chat",
  "operations",
  "hr",
  "learning",
  "support",
  "sites",
  "sync",
  "settings",
  "public-deal-discovery",
  "candidate-deal-room",
  "franchise-landing",
  "real-estate",
  "real-estate-partners",
  "funding-partner-bank",
  "investments",
]) {
  assert(portalBridge.includes(`key: "${target}"`), `Portal bridge target ${target} is missing.`);
}

assert(portalRoute.includes("resolvePortalBridgeTarget"), "Portal entry route must resolve targets through the server allowlist.");
assert(portalRoute.includes("portalBridgeRoleCookieName"), "Portal entry route must set the portal bridge role cookie.");
assert(portalRoute.includes("httpOnly: true"), "Portal bridge cookie must be HttpOnly.");
assert(portalRoute.includes("redirectUrl.searchParams.set(\"role\", role)"), "Portal entry route must keep current platform role compatibility until Block 90 hardening.");
assert(portalPage.includes("getPortalRoleEntries"), "Portal page must render the role entry matrix.");
assert(portalPage.includes("getPortalSurfaceEntries"), "Portal page must render the surface entry matrix.");
assert(platformLayout.includes("portalBridgeRoleCookieName"), "Platform layout must read the portal bridge cookie.");
assert(platformLayout.includes("initialRole={initialRole}"), "Platform layout must pass the cookie role into PlatformShell.");
assert(platformPage.includes("portalBridgeRoleCookieName"), "Platform module page must fallback to the portal bridge cookie.");
assert(platformShell.includes("initialRole?: RoleKey"), "PlatformShell must accept an initial role fallback.");
assert(authBoundary.includes("\"/portal\""), "Portal must be listed as a public auth surface.");

const staleFranchiseCtas = [...franchiseHtml.matchAll(/href="\/pre-packed-deals">See Our Pre-Packed Deals/g)].length;
const portalFranchiseCtas = [...franchiseHtml.matchAll(/href="\/portal">See Our Pre-Packed Deals/g)].length;
assert(staleFranchiseCtas === 0, "Franchise page still has See Our Pre-Packed Deals CTAs pointing at /pre-packed-deals.");
assert(portalFranchiseCtas === 5, `Expected 5 franchise See Our Pre-Packed Deals CTAs to point at /portal, found ${portalFranchiseCtas}.`);

if (errors.length) {
  console.error("Block 84 portal bridge verification failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Block 84 portal bridge verification passed.");
console.log(JSON.stringify({ roles: roleKeys.length, franchisePortalCtas: portalFranchiseCtas }, null, 2));
