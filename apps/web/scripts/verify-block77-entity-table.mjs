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
const table = read("src/components/crays/table/entity-table.tsx");
const query = read("src/lib/query-state/entity-table-query.ts");
const story = read("src/components/crays/table/entity-table.stories.tsx");
const states = read("src/components/crays/states/system-state.tsx");

if (!packageJson.dependencies?.["@tanstack/react-table"]) failures.push("Missing @tanstack/react-table dependency.");

for (const marker of ["useReactTable", "manualFiltering: true", "manualPagination: true", "manualSorting: true", "enableRowSelection: true"]) {
  if (!table.includes(marker)) failures.push(`EntityTable missing ${marker}`);
}

for (const marker of ["Search", "Add filter", "Columns", "Save view", "Previous", "Next"]) {
  if (!table.includes(marker)) failures.push(`EntityTable missing visible control ${marker}`);
}

for (const marker of ["LoadingState", "EmptyState", "NoResultsState", "ErrorState", "PermissionState"]) {
  if (!table.includes(marker)) failures.push(`EntityTable missing state component ${marker}`);
}

if (!query.includes("entityTableStateToResourceQuery")) failures.push("Missing table-state to CRAYS ResourceQuery mapper.");
if (!query.includes("offset: state.pagination.pageIndex * state.pagination.pageSize")) failures.push("ResourceQuery mapper must use server-side offset pagination.");
if (!story.includes("EntityTable")) failures.push("Missing EntityTable Storybook coverage.");
if (!table.includes("onClick: resetTable")) failures.push("No-results state must wire reset to a real table action.");
if (!states.includes("disabled={action.disabled ?? !action.onClick}")) failures.push("State primitive action buttons must not render as dead orphan controls.");

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  tanstackTableDependency: packageJson.dependencies["@tanstack/react-table"],
  controlledServerState: true,
  statesCovered: true,
  storybookCoverage: true,
}, null, 2));
