import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const requiredFiles = [
  "src/providers/crays-workspace-provider.tsx",
  "src/providers/crays-data-provider.ts",
  "src/providers/crays-auth-provider.ts",
  "src/providers/crays-access-control-provider.ts",
  "src/providers/crays-bff-client.ts",
  "src/lib/workspace/provider-contract.ts",
  "src/lib/workspace/server-session.ts",
  "src/lib/workspace/server-access.ts",
  "src/app/api/crays/workspace/session/route.ts",
  "src/app/api/crays/workspace/access/route.ts",
  "src/app/api/crays/resources/query/route.ts",
  "src/app/api/crays/resources/command/route.ts",
];

const failures = [];

function read(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    failures.push(`Missing ${relativePath}`);
    return "";
  }
  return fs.readFileSync(fullPath, "utf8");
}

for (const file of requiredFiles) read(file);

const packageJson = JSON.parse(read("package.json"));
for (const dependency of ["@refinedev/core", "@refinedev/nextjs-router", "@tanstack/react-query"]) {
  if (!packageJson.dependencies?.[dependency]) failures.push(`Missing dependency ${dependency}`);
}

const provider = read("src/providers/crays-workspace-provider.tsx");
if (!provider.startsWith("\"use client\";")) failures.push("CraysWorkspaceProvider must be an explicit client island.");
if (!provider.includes("@refinedev/core")) failures.push("CraysWorkspaceProvider must initialize Refine Core.");
if (!provider.includes("@tanstack/react-query")) failures.push("CraysWorkspaceProvider must pass one TanStack Query client.");

const layout = read("src/app/(platform)/layout.tsx");
if (!layout.includes("CraysWorkspaceProvider")) failures.push("Platform layout is not wrapped by the CRAYS workspace provider.");

const webDir = path.join(root, "src/app/(web)");
const webFiles = fs.existsSync(webDir)
  ? fs.readdirSync(webDir, { recursive: true }).filter((entry) => String(entry).endsWith(".tsx") || String(entry).endsWith(".ts"))
  : [];
for (const file of webFiles) {
  const content = fs.readFileSync(path.join(webDir, String(file)), "utf8");
  if (content.includes("@refinedev/") || content.includes("CraysWorkspaceProvider") || content.includes("@tanstack/react-query")) {
    failures.push(`Public web route imports authenticated workspace provider/query runtime: ${file}`);
  }
}

const browserProviderBundle = [
  "src/providers/crays-workspace-provider.tsx",
  "src/providers/crays-data-provider.ts",
  "src/providers/crays-auth-provider.ts",
  "src/providers/crays-access-control-provider.ts",
  "src/providers/crays-bff-client.ts",
].map(read).join("\n");

for (const forbidden of ["TWENTY_", "PLANE_", "FRAPPE_", "/api/resource/", "/metadata", "Authorization"]) {
  if (browserProviderBundle.includes(forbidden)) failures.push(`Browser provider bundle contains forbidden vendor/API marker: ${forbidden}`);
}

for (const route of [
  "src/app/api/crays/workspace/session/route.ts",
  "src/app/api/crays/workspace/access/route.ts",
  "src/app/api/crays/resources/query/route.ts",
  "src/app/api/crays/resources/command/route.ts",
]) {
  const content = read(route);
  if (!content.includes("resolveCraysRouteContext") && !content.includes("getCraysWorkspaceSessionDto")) {
    failures.push(`${route} does not resolve server-side CRAYS authority.`);
  }
}

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  checkedFiles: requiredFiles.length,
  publicWebProviderLeak: false,
  browserVendorMarkers: false,
  platformProviderInstalled: true,
}, null, 2));
