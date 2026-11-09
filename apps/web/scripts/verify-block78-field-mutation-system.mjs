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
const schema = read("src/lib/forms/resource-form-schema.ts");
const form = read("src/components/crays/forms/entity-form.tsx");
const editor = read("src/components/crays/forms/field-editor.tsx");
const receipt = read("src/components/crays/forms/command-receipt.tsx");
const story = read("src/components/crays/forms/entity-form.stories.tsx");

for (const dependency of ["react-hook-form", "zod", "@hookform/resolvers"]) {
  if (!packageJson.dependencies?.[dependency]) failures.push(`Missing ${dependency} dependency.`);
}

for (const marker of ["createResourceFormSchema", "normalizeResourceFormValues", "createResourceCommandEnvelope"]) {
  if (!schema.includes(marker)) failures.push(`Schema helper missing ${marker}.`);
}

for (const marker of ["useForm", "zodResolver", "handleSubmit", "CommandReceipt", "submitDisabled", "disabled={isSubmitting || submitDisabled || !isDirty}"]) {
  if (!form.includes(marker)) failures.push(`EntityForm missing ${marker}.`);
}

for (const marker of ["aria-invalid", "aria-describedby", "FieldEditor"]) {
  if (!editor.includes(marker)) failures.push(`FieldEditor missing ${marker}.`);
}

for (const marker of ["sourceWritesEnabled", "syncApplyEnabled", "targetApplyEnabled", "gate", "conflict", "fieldErrors"]) {
  if (!receipt.includes(marker)) failures.push(`CommandReceipt missing ${marker}.`);
}

if (!story.includes("EntityForm")) failures.push("Missing EntityForm Storybook coverage.");
if (!story.includes("status: \"gated\"")) failures.push("Storybook coverage must include a gated receipt.");

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  dependencies: {
    reactHookForm: packageJson.dependencies["react-hook-form"],
    zod: packageJson.dependencies.zod,
    resolvers: packageJson.dependencies["@hookform/resolvers"],
  },
  commandEnvelope: true,
  receiptStates: true,
  storybookCoverage: true,
}, null, 2));
