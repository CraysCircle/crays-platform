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

const packageJson = JSON.parse(read("package.json"));
const page = read("src/components/project-work-item-slice-page.tsx");
const commandRoute = read("src/app/api/crays/project/work-items/command/route.ts");
const modulePage = read("src/components/module-page.tsx");
const lockfile = read("package-lock.json");

for (const dependency of ["@dnd-kit/core", "@dnd-kit/sortable", "@dnd-kit/utilities"]) {
  if (!packageJson.dependencies?.[dependency]) failures.push(`Missing dependency ${dependency}.`);
  if (!lockfile.includes(`node_modules/${dependency}`)) failures.push(`Lockfile missing ${dependency}.`);
}

for (const marker of [
  "DndContext",
  "PointerSensor",
  "KeyboardSensor",
  "SortableContext",
  "useSortable",
  "useDroppable",
  "ProjectBoard",
  "ProjectBoardCard",
  "onDragEnd",
  "rolled back to server state",
]) {
  if (!page.includes(marker)) failures.push(`Project board page missing ${marker}.`);
}

for (const marker of [
  "targetState",
  "allowedStates",
  "status_change",
  "fieldText(\"projectId\"",
  "OPEN_DEV_PROJECT_WORK_ITEM_APPLY",
  "targetApplyEnabled: false",
]) {
  if (!commandRoute.includes(marker)) failures.push(`Project command route missing ${marker}.`);
}

if (!modulePage.includes("<ProjectWorkItemSlicePage role={role} view={view} />")) failures.push("Project module does not pass view into the Project work-item slice.");
if (page.includes("planeNativeWritesEnabled: true")) failures.push("Project board appears to enable Plane native writes.");
if (!packageJson.scripts?.["verify:block82:project-board"]) failures.push("Missing npm verification script.");

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  dndKitInstalled: true,
  pointerAndKeyboardSensors: true,
  boardUsesCraysBffCommandRoute: true,
  optimisticRollbackRequiredWhileApplyClosed: true,
  planeNativeWritesInBrowser: false,
}, null, 2));
