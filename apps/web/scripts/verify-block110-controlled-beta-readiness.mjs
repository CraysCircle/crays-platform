import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const files = {
  readiness: "src/db/block110-controlled-beta-readiness-repository.ts",
  route: "src/app/api/crays/beta/block110-readiness/route.ts",
  performance: "src/lib/phase3/performance-optimization-plan.ts",
  packageJson: "package.json",
};
const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };
const read = (file) => readFileSync(path.join(root, file), "utf8");

for (const file of Object.values(files).filter((file) => file !== "package.json")) {
  expect(existsSync(path.join(root, file)), `${file} is missing.`);
}

const readiness = existsSync(path.join(root, files.readiness)) ? read(files.readiness) : "";
const route = existsSync(path.join(root, files.route)) ? read(files.route) : "";
const performance = existsSync(path.join(root, files.performance)) ? read(files.performance) : "";
const packageJson = JSON.parse(read(files.packageJson));

expect(readiness.includes("externalBetaApproved: false"), "External beta must remain closed.");
expect(readiness.includes("productionDeployApproved: false"), "Production deploy approval must remain closed.");
expect(readiness.includes("sourceWritesEnabled: false"), "Source writes must remain closed.");
expect(readiness.includes("paymentInitiationEnabled: false"), "Payment gate must remain closed.");
expect(readiness.includes("financePostingEnabled: false"), "Finance posting gate must remain closed.");
expect(readiness.includes("performancePhaseQueued: true"), "Post-110 performance phase must be queued.");
expect(route.includes("resolveCraysRouteContext"), "Block 110 route must use server trust context.");
expect(performance.includes("Performance Baseline & Budgets"), "Performance phase baseline block is missing.");
expect(performance.includes("duplicateInitialFetchesAllowed: 0"), "Performance duplicate fetch budget is missing.");
expect(packageJson.scripts["verify:block110:controlled-beta-readiness"] === "node scripts/verify-block110-controlled-beta-readiness.mjs", "package script missing.");

if (failures.length) {
  console.error(JSON.stringify({ ok: false, block: 110, failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, block: 110, nextPhase: "performance" }, null, 2));
