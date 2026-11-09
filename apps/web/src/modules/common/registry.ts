import type { ModuleKey } from "@/lib/modules";
import { analyticsAdapterContract } from "../analytics";
import { chatAdapterContract } from "../chat";
import { crmAdapterContract } from "../crm";
import { erpAdapterContract } from "../erp";
import { filesAdapterContract } from "../files";
import { hrAdapterContract } from "../hr";
import { learningAdapterContract } from "../learning";
import { loansAdapterContract } from "../loans";
import { operationsAdapterContract } from "../operations";
import { projectAdapterContract } from "../project";
import { settingsAdapterContract } from "../settings";
import { sitesAdapterContract } from "../sites";
import { supportAdapterContract } from "../support";
import { syncAdapterContract } from "../sync";
import type { ModuleAdapterContract } from "./adapter";

export const moduleAdapterContracts: ModuleAdapterContract[] = [
  analyticsAdapterContract,
  chatAdapterContract,
  crmAdapterContract,
  erpAdapterContract,
  filesAdapterContract,
  hrAdapterContract,
  learningAdapterContract,
  loansAdapterContract,
  operationsAdapterContract,
  projectAdapterContract,
  settingsAdapterContract,
  sitesAdapterContract,
  supportAdapterContract,
  syncAdapterContract,
];

export function adapterContractForModule(module: ModuleKey | string | null | undefined) {
  return moduleAdapterContracts.find((contract) => contract.module === module);
}
