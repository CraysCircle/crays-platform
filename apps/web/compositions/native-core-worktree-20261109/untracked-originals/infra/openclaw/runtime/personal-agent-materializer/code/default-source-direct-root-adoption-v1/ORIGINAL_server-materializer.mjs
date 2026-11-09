/** Host composition, not an exposed route. General-default source integration qualified on 2026-10-19; deployment and real-user acceptance remain separate. getClient is existing Core getCorePgPool().connect;
 * caller input is the existing verified provider-account route context, never JSON/model tool args.
 * Relative canonical import selects the same V20 factory and permits exact immutable staging.
 */
import *as standardFactory from'../../../../../scripts/personal-agent-standard-package-v20/new-personal-agent-baseline-config.mjs';
import catalog from'./HOST_ARTIFACT_CATALOG.json'with{type:'json'};
import baseCatalog from'./BASE_HOST_ARTIFACT_CATALOG.json'with{type:'json'};
import{createCoreAssignmentResolver}from'./resolve-core-assignment.mjs';import{createGeneralPersonalRuntimeMaterializerCandidate as createPersonalRuntimeMaterializer}from'./materialize-personal-general-runtime.candidate.mjs';import{createNativeOwnAccountAuthority}from'./native-own-account-authority.mjs';import{openRuntimeRoot}from'./open-runtime-root.mjs';import{validateNativeConfig}from'./original-native-config-validator.mjs';
export function createServerPersonalRuntimeMaterializer({getClient}){
 const resolveCommittedAssignment=createCoreAssignmentResolver({getClient,standardFactory});
 return async verifiedProviderAccount=>createPersonalRuntimeMaterializer({standardFactory,catalog,baseCatalog,resolveCommittedAssignment,ownAccountAuthority:createNativeOwnAccountAuthority({verifiedProviderAccount,resolveCommittedAssignment,standardFactory}),openRuntimeRoot,validateNativeConfig})(verifiedProviderAccount);
}
