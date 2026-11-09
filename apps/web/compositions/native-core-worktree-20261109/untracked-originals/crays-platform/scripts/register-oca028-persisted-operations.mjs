import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
const specs = [
    [
      "OcaContextBrokerWorkbench",
      "src/graphql/operations/OcaContextBrokerWorkbench.graphql",
    ],
    [
      "PreflightBuildOcaContextPackage",
      "src/graphql/operations/PreflightBuildOcaContextPackage.graphql",
    ],
    [
      "BuildOcaContextPackage",
      "src/graphql/operations/BuildOcaContextPackage.graphql",
    ],
    [
      "GetOcaContextPackageManifest",
      "src/graphql/operations/GetOcaContextPackageManifest.graphql",
    ],
    [
      "InvalidateOcaContextPackage",
      "src/graphql/operations/InvalidateOcaContextPackage.graphql",
    ],
    [
      "ReconcileOcaContextRequest",
      "src/graphql/operations/ReconcileOcaContextRequest.graphql",
    ],
  ],
  storePath = "src/graphql/generated/client/persisted-documents.json",
  store = JSON.parse(readFileSync(storePath, "utf8")),
  rows = specs.map(([name, path]) => {
    const document = readFileSync(path, "utf8").trim(),
      hash = createHash("sha256").update(document).digest("hex");
    store[`sha256:${hash}`] = document;
    return { name, hash };
  });
writeFileSync(storePath, JSON.stringify(store, null, 2) + "\n");
writeFileSync(
  "src/graphql/oca-context-documents.ts",
  rows
    .map(
      (x) =>
        `export const ${x.name}Document={__meta__:{hash:${JSON.stringify(x.hash)}}} as const;`,
    )
    .join("\n") + "\n",
);
console.log(JSON.stringify(rows, null, 2));
