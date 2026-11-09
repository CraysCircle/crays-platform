import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const live = args.has("--live");
const browser = args.has("--browser");
const baseUrl = process.env.CRAYS_PRODUCTION_BASE_URL || "https://www.craysgym.com";
const bridgeCookie = "crays_portal_bridge_role=crays-management; crays_portal_bridge_issued=block84-temporary-portal-bridge";
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

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`${url} did not return JSON: ${text.slice(0, 240)}`);
  }
  return { response, json };
}

async function verifyLiveApi() {
  const headers = { cookie: bridgeCookie };
  const readiness = await fetchJson(`${baseUrl}/api/crays/production/readiness`, { headers });
  assert(readiness.response.status === 200, `Production readiness returned ${readiness.response.status}.`);
  assert(readiness.json.status === "ready", `Production readiness status is ${readiness.json.status}.`);
  assert(readiness.json.checks?.environmentReady === true, "Production readiness environmentReady is not true.");
  assert(readiness.json.checks?.dataReady === true, "Production readiness dataReady is not true.");
  assert((readiness.json.observed?.crm?.records ?? 0) >= 30_000, "Production CRM records below reliability threshold.");
  assert((readiness.json.observed?.project?.activeProjects ?? 0) >= 30, "Production active opening projects below reliability threshold.");

  const crm = await fetchJson(`${baseUrl}/api/crays/crm/operational/read-model?record=dashboard`, { headers });
  assert(crm.response.status === 200, `CRM operational live route returned ${crm.response.status}.`);
  assert((crm.json.summary?.records ?? 0) >= 30_000, "CRM operational live records below 30,000.");

  const project = await fetchJson(`${baseUrl}/api/crays/project/work-items/read-model`, { headers });
  assert(project.response.status === 200, `Project work items live route returned ${project.response.status}.`);
  assert((project.json.summary?.activeProjects ?? 0) >= 30, "Project work items live activeProjects below 30.");
  assert((project.json.rows?.length ?? 0) >= 700, "Project work items live rows below 700.");

  const noCookie = await fetchJson(`${baseUrl}/api/crays/workspace/session?role=deal-manager`);
  assert([403, 423].includes(noCookie.response.status), `No-cookie ?role= authority was not rejected: ${noCookie.response.status}.`);
}

async function verifyBrowser() {
  const { chromium } = await import("playwright");
  const chromiumBrowser = await chromium.launch({ headless: true });
  try {
    const page = await chromiumBrowser.newPage();
    await page.goto(`${baseUrl}/portal`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForLoadState("networkidle", { timeout: 60_000 }).catch(() => {});
    const cta = page.locator("a", { hasText: "Free role access" }).first();
    const style = await cta.evaluate((element) => {
      const computed = window.getComputedStyle(element);
      return {
        text: element.textContent?.trim(),
        color: computed.color,
        backgroundColor: computed.backgroundColor,
        href: element.href,
      };
    });
    assert(style.color === "rgb(255, 255, 255)", `Portal dark CTA text is not white: ${JSON.stringify(style)}.`);

    await page.goto(`${baseUrl}/portal/enter/deal-manager/crm-home`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForLoadState("networkidle", { timeout: 60_000 }).catch(() => {});
    const crmText = ((await page.textContent("body")) ?? "").replace(/\s+/g, " ");
    assert(/32[,.]?594|32594/.test(crmText), "Live CRM page does not show the operational CRM count.");

    await page.goto(`${baseUrl}/portal/enter/deal-manager/project-board`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForLoadState("networkidle", { timeout: 60_000 }).catch(() => {});
    const projectText = ((await page.textContent("body")) ?? "").replace(/\s+/g, " ");
    assert(/738/.test(projectText) && /34/.test(projectText), "Live Project board does not show production opening-project counts.");
  } finally {
    await chromiumBrowser.close();
  }
}

const packageJson = JSON.parse(read("package.json"));
assert(packageJson.scripts?.["verify:block91:production-reliability"]?.includes("verify-block91-production-reliability.mjs"), "package.json missing verify:block91:production-reliability.");
assert(packageJson.scripts?.["verify:block91:production-live"]?.includes("--live"), "package.json missing verify:block91:production-live.");

const route = read("src/app/api/crays/production/readiness/route.ts");
const repository = read("src/db/production-reliability-readiness-repository.ts");
assert(route.includes("resolveCraysRouteContext"), "Production readiness route must use server trust context.");
assert(route.includes("getProductionReliabilityReadiness"), "Production readiness route must use the repository read model.");
assert(repository.includes("productionRequiredEnvironmentNames"), "Production readiness repository must verify required env names.");
assert(repository.includes("getCrmOperationalReadModel"), "Production readiness repository must verify CRM data.");
assert(repository.includes("getOpeningProjectReadModel"), "Production readiness repository must verify Project data.");
assert(!route.includes("process.env.CRAYS_DATABASE_URL,"), "Production readiness route must not return raw database URL.");
assert(!repository.includes("process.env.CRAYS_DATABASE_URL,"), "Production readiness repository must not return raw database URL.");

const portal = read("src/components/portal-entry-page.tsx");
assert(portal.includes('style={{ color: "#fff" }}'), "Portal dark CTAs need explicit white text fallback.");

if (live) {
  await verifyLiveApi();
  if (browser) await verifyBrowser();
}

const summary = {
  ok: failures.length === 0,
  block: 91,
  mode: live ? (browser ? "live-browser" : "live-api") : "static",
  baseUrl: live ? baseUrl : null,
  failures,
};

if (failures.length) {
  console.error(JSON.stringify(summary, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(summary, null, 2));
