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

const diagnostic = read("src/lib/diagnostic-surfaces.ts");
const shell = read("src/components/platform-shell.tsx");
const modulePage = read("src/components/module-page.tsx");

for (const view of [
  "operating-dataset",
  "object-identity",
  "az-simulations",
  "role-scopes",
  "external-preflight",
  "apply-sandbox",
  "monitoring",
  "beta-readiness",
]) {
  if (!diagnostic.includes(`"${view}"`)) failures.push(`Diagnostic registry missing ${view}`);
}

if (!diagnostic.includes('["admin", "crays-management", "reviewer"]')) {
  failures.push("Diagnostic roles must be limited to Admin, CRAYS Management and Reviewer.");
}

if (!shell.includes('label: "Product work"')) {
  failures.push("Dashboard navigation must expose a Product work group.");
}

if (!shell.includes('label: "Diagnostics"')) {
  failures.push("Dashboard navigation must keep diagnostic surfaces in a separate group.");
}

if (!shell.includes("canSeeDashboardDiagnostics(activeRole)")) {
  failures.push("Platform shell does not filter diagnostics by role.");
}

if (!modulePage.includes("DiagnosticSurfaceBoundary")) {
  failures.push("ModulePage does not render a direct-URL diagnostic boundary for normal roles.");
}

if (!modulePage.includes("Open work queue") || !modulePage.includes("Open case workspace")) {
  failures.push("Diagnostic boundary must include safe next product actions.");
}

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  diagnosticRegistry: true,
  normalRoleNavigationFiltered: true,
  directUrlBoundary: true,
  safeNextActions: true,
}, null, 2));
