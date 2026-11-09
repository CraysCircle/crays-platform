import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const baseArg = process.argv.find((arg) => arg.startsWith("--base-url="));
const baseUrl = baseArg ? baseArg.slice("--base-url=".length).replace(/\/$/, "") : process.env.CRAYS_VISUAL_BASE_URL?.replace(/\/$/, "");
const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };

const configFile = path.join(root, "src/lib/phase3/visual-a11y-regression.ts");
const routeFile = path.join(root, "src/app/api/crays/quality/visual-a11y/readiness/route.ts");
const packageJson = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));

expect(existsSync(configFile), "Visual/a11y route spec is missing.");
expect(existsSync(routeFile), "Visual/a11y readiness route is missing.");
const config = existsSync(configFile) ? readFileSync(configFile, "utf8") : "";
const route = existsSync(routeFile) ? readFileSync(routeFile, "utf8") : "";
expect(config.includes("crm-inbox") && config.includes("crm-calendar"), "CRM tab regression specs are missing.");
expect(config.includes("forbiddenText") && config.includes("Selected deal"), "Wrong repeated-tab content guards are missing.");
expect(config.includes("contrastCheckRequired: true"), "Contrast gate is missing.");
expect(route.includes("resolveCraysRouteContext"), "Quality route must use server trust context.");
expect(packageJson.scripts["verify:block109:visual-a11y-system"] === "node scripts/verify-block109-visual-a11y-system.mjs", "package script missing.");
expect(packageJson.scripts["verify:block109:visual-a11y-browser"] === "node scripts/verify-block109-visual-a11y-system.mjs --browser", "browser package script missing.");

if (args.has("--browser")) {
  if (!baseUrl) {
    failures.push("Browser mode requires --base-url=... or CRAYS_VISUAL_BASE_URL.");
  } else {
    const { chromium } = await import("playwright");
    const outDir = path.join(root, "test-results", "block109-visual-a11y");
    mkdirSync(outDir, { recursive: true });
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
    const consoleErrors = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    const specs = [
      { key: "portal", path: "/portal", required: ["One temporary bridge", "Open a role directly"], forbidden: ["undefined"] },
      { key: "crm-home", path: "/crm?role=deal-manager&view=home", required: ["CRM operating database", "Companies", "People"], forbidden: ["0 CRM records"] },
      { key: "crm-inbox", path: "/crm?role=deal-manager&view=inbox&record=emails", required: ["Inbox", "Subject"], forbidden: ["Selected deal", "Deal work queue"] },
      { key: "crm-calendar", path: "/crm?role=deal-manager&view=calendar&record=calendar-events", required: ["Calendar", "Event"], forbidden: ["Selected deal", "Deal work queue"] },
    ];
    await page.context().addCookies([
      { name: "crays_portal_bridge_role", value: "deal-manager", domain: new URL(baseUrl).hostname, path: "/" },
      { name: "crays_portal_bridge_issued", value: "block84-temporary-portal-bridge", domain: new URL(baseUrl).hostname, path: "/" },
    ]);
    for (const spec of specs) {
      const response = await page.goto(`${baseUrl}${spec.path}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
      expect(Boolean(response && response.status() < 500), `${spec.key} returned bad response.`);
      const body = await page.locator("body").innerText({ timeout: 15_000 });
      for (const required of spec.required) expect(body.includes(required), `${spec.key} missing required text: ${required}`);
      for (const forbidden of spec.forbidden) expect(!body.includes(forbidden), `${spec.key} contains forbidden text: ${forbidden}`);
      await page.screenshot({ path: path.join(outDir, `${spec.key}.png`), fullPage: true });
    }
    const darkCta = await page.goto(`${baseUrl}/portal`, { waitUntil: "domcontentloaded" }).then(async () => page.locator("a,button").filter({ hasText: /Open CRAYS/i }).first().evaluate((node) => getComputedStyle(node).color).catch(() => ""));
    expect(!darkCta || darkCta === "rgb(255, 255, 255)" || darkCta === "rgba(255, 255, 255, 1)", "Portal dark CTA text is not white in browser mode.");
    expect(consoleErrors.length === 0, `Console errors observed: ${consoleErrors.slice(0, 3).join(" | ")}`);
    await browser.close();
  }
}

if (failures.length) {
  console.error(JSON.stringify({ ok: false, block: 109, failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, block: 109, browser: args.has("--browser"), baseUrl: baseUrl ?? null }, null, 2));
