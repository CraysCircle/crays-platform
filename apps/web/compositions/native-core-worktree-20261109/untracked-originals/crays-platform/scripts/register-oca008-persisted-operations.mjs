import { createHash } from "node:crypto";
import { readFileSync,writeFileSync } from "node:fs";
const specs=[
 ["OcaRuntimeInventory","src/graphql/operations/OcaRuntimeInventory.graphql"],
 ["PreflightObserveOcaRuntimeAsset","src/graphql/operations/PreflightObserveOcaRuntimeAsset.graphql"],
 ["ObserveOcaRuntimeAsset","src/graphql/operations/ObserveOcaRuntimeAsset.graphql"],
 ["ReconcileOcaRuntimeObservation","src/graphql/operations/ReconcileOcaRuntimeObservation.graphql"],
];
const storePath="src/graphql/generated/client/persisted-documents.json";
const store=JSON.parse(readFileSync(storePath,"utf8"));
const rows=specs.map(([name,path])=>{const document=readFileSync(path,"utf8").trim();const digest=createHash("sha256").update(document).digest("hex"),storeHash="sha256:"+digest;store[storeHash]=document;return{name,hash:digest};});
writeFileSync(storePath,JSON.stringify(store,null,2)+"\n");
writeFileSync("src/graphql/oca-runtime-inventory-documents.ts",rows.map(({name,hash})=>`export const ${name}Document={__meta__:{hash:${JSON.stringify(hash)}}} as const;`).join("\n")+"\n");
console.log(JSON.stringify(rows,null,2));
