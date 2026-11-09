import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const repository = readFileSync(path.join(root, "src/db/crm-daily-operating-read-model-repository.ts"), "utf8");
const route = readFileSync(path.join(root, "src/app/api/crays/crm/daily-operating/read-model/route.ts"), "utf8");
const packageJson = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };

expect(repository.includes("\"inbox\""), "Inbox lane is missing.");
expect(repository.includes("\"calendar\""), "Calendar lane is missing.");
expect(repository.includes("\"tasks\""), "Tasks lane is missing.");
expect(repository.includes("\"pipeline\""), "Pipeline lane is missing.");
expect(repository.includes("externalSendingEnabled: false"), "External sending must remain closed.");
expect(repository.includes("calendarWritesEnabled: false"), "Calendar writes must remain closed.");
expect(route.includes("resolveCraysRouteContext"), "Route must use server trust context.");
expect(packageJson.scripts["verify:block95:crm-daily-operating"] === "node scripts/verify-block95-crm-daily-operating.mjs", "package script missing.");

if (failures.length) {
  console.error(JSON.stringify({ ok: false, block: 95, failures }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, block: 95, lanes: ["inbox", "calendar", "tasks", "pipeline"] }, null, 2));
