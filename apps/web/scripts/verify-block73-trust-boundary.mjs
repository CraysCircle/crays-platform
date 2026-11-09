import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

const requiredRoutes = [
  "src/app/api/crays/access/contract/route.ts",
  "src/app/api/crays/golden-operating-dataset/read-model/route.ts",
  "src/app/api/crays/object-identity/read-model/route.ts",
  "src/app/api/crays/a-z-simulations/read-model/route.ts",
  "src/app/api/crays/permissions/role-scope-audit/read-model/route.ts",
  "src/app/api/crays/external-preflight/read-model/route.ts",
  "src/app/api/crays/apply-sandbox/read-model/route.ts",
  "src/app/api/crays/monitoring/read-model/route.ts",
  "src/app/api/crays/controlled-beta/read-model/route.ts",
];

const directRolePatterns = [
  /\broleByKey\s*\(/,
  /searchParams\.get\(\s*["'`]role["'`]\s*\)/,
  /\bbody(?:\?\.)?\.role\b/,
];

const failures = [];

for (const relativePath of requiredRoutes) {
  const source = readFileSync(path.join(root, relativePath), "utf8");

  if (!/resolveCraysRouteRole\s*\(/.test(source)) {
    failures.push(`${relativePath} does not resolve role through resolveCraysRouteRole().`);
  }

  if (!/serverAuthority/.test(source) || !/reviewPersona/.test(source)) {
    failures.push(`${relativePath} does not expose server authority audit metadata.`);
  }

  if (directRolePatterns.some((pattern) => pattern.test(source))) {
    failures.push(`${relativePath} still contains direct request role authority.`);
  }
}

const trustBoundarySource = readFileSync(path.join(root, "src/lib/dal/server-trust.ts"), "utf8");

for (const expectedToken of [
  "auth0.getSession",
  "createCraysSessionFromIdentityBundle",
  "CRAYS_ALLOW_REVIEW_PERSONAS",
  "anonymous-fail-closed",
  "server-authorized-review-persona",
]) {
  if (!trustBoundarySource.includes(expectedToken)) {
    failures.push(`src/lib/dal/server-trust.ts is missing ${expectedToken}.`);
  }
}

const result = {
  checkedRoutes: requiredRoutes.length,
  trustBoundary: "src/lib/dal/server-trust.ts",
  status: failures.length === 0 ? "passed" : "failed",
  failures,
};

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);

if (failures.length > 0) {
  process.exitCode = 1;
}
