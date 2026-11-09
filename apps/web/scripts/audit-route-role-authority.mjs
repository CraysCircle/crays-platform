import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const apiRoot = path.join(root, "src", "app", "api", "crays");

const directRolePatterns = [
  {
    key: "roleByKey",
    pattern: /\broleByKey\s*\(/,
  },
  {
    key: "roleSearchParam",
    pattern: /searchParams\.get\(\s*["'`]role["'`]\s*\)/,
  },
  {
    key: "bodyRole",
    pattern: /\bbody(?:\?\.)?\.role\b/,
  },
];

function collectRouteFiles(directory) {
  if (!existsSync(directory)) return [];

  return readdirSync(directory)
    .flatMap((entry) => {
      const absolutePath = path.join(directory, entry);
      const stats = statSync(absolutePath);

      if (stats.isDirectory()) return collectRouteFiles(absolutePath);
      if (stats.isFile() && entry === "route.ts") return [absolutePath];
      return [];
    })
    .sort();
}

const routeFiles = collectRouteFiles(apiRoot);

const reports = routeFiles.map((absolutePath) => {
  const source = readFileSync(absolutePath, "utf8");
  const relativePath = path.relative(root, absolutePath).replaceAll(path.sep, "/");
  const findings = directRolePatterns.filter(({ pattern }) => pattern.test(source)).map(({ key }) => key);
  const usesServerTrustBoundary = /resolveCraysRoute(?:Role|Context)\s*\(/.test(source);

  return {
    path: relativePath,
    usesServerTrustBoundary,
    directRoleAuthority: findings,
  };
});

const remainingDirectRoleAuthorityRoutes = reports.filter(
  (report) => report.directRoleAuthority.length > 0 && !report.usesServerTrustBoundary,
);

const summary = {
  scannedRoutes: reports.length,
  serverTrustBoundaryRoutes: reports.filter((report) => report.usesServerTrustBoundary).length,
  directRoleAuthorityRoutes: reports.filter((report) => report.directRoleAuthority.length > 0).length,
  remainingDirectRoleAuthorityRoutes: remainingDirectRoleAuthorityRoutes.length,
  remainingDirectRoleAuthority: remainingDirectRoleAuthorityRoutes.map((report) => ({
    path: report.path,
    findings: report.directRoleAuthority,
  })),
};

process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
