/** SOURCE-ONLY V5 host successor; not selected by the active server entrypoint. */
/** INACTIVE CANDIDATE server binding: no route or factory switch. Existing Core resolver and original own-account/native validator only. */
/** Host composition, not an exposed route. getClient is existing Core getCorePgPool().connect;
 * caller input is the existing verified provider-account route context, never JSON/model tool args.
 * Relative canonical import selects the same V20 factory and permits exact immutable staging.
 */
import *as standardFactory from'../../../../../scripts/personal-agent-standard-package-v20/new-personal-agent-baseline-config.mjs';
import catalog from'./HOST_ARTIFACT_CATALOG.json'with{type:'json'};
import baseCatalog from'./BASE_HOST_ARTIFACT_CATALOG.json'with{type:'json'};
import{createCoreAssignmentResolver}from'./resolve-core-assignment.mjs';import{createGeneralPersonalRuntimeMaterializerCandidate}from'./materialize-personal-general-runtime.candidate-v5.mjs';import{createNativeOwnAccountAuthority}from'./native-own-account-authority.mjs';import{openRuntimeRoot}from'./open-runtime-root.mjs';import{validateNativeConfig}from'./original-native-config-validator.mjs';
export function createServerGeneralPersonalRuntimeMaterializerCandidate({getClient}){
 const resolveCommittedAssignment=createCoreAssignmentResolver({getClient,standardFactory});
 return async verifiedProviderAccount=>createGeneralPersonalRuntimeMaterializerCandidate({standardFactory,catalog,baseCatalog,resolveCommittedAssignment,ownAccountAuthority:createNativeOwnAccountAuthority({verifiedProviderAccount,resolveCommittedAssignment,standardFactory}),openRuntimeRoot,validateNativeConfig})(verifiedProviderAccount);
}
