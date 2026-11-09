/** Unregistered SOURCE candidate. Existing Auth0/Core and sealed own-account authority unchanged. */
import *as standardFactory from '../../../../../../scripts/personal-agent-standard-package-v20/new-personal-agent-baseline-config.mjs';
import catalog from './SPEECH_HOST_ARTIFACT_CATALOG.json' with {type:'json'};
import baseCatalog from '../BASE_HOST_ARTIFACT_CATALOG.json' with {type:'json'};
import {createCoreAssignmentResolver} from '../resolve-core-assignment.mjs';
import {createPersonalRuntimeMaterializer} from '../materialize-personal-runtime-with-speech.candidate.mjs';
import {createNativeOwnAccountAuthority} from '../native-own-account-authority.mjs';
import {openRuntimeRoot} from '../open-runtime-root.mjs';
import {validateNativeConfig} from '../original-native-config-validator.mjs';
export function createServerPersonalRuntimeMaterializer({getClient}){
 const resolveCommittedAssignment=createCoreAssignmentResolver({getClient,standardFactory});
 return async verifiedProviderAccount=>createPersonalRuntimeMaterializer({standardFactory,catalog,baseCatalog,resolveCommittedAssignment,ownAccountAuthority:createNativeOwnAccountAuthority({verifiedProviderAccount,resolveCommittedAssignment,standardFactory}),openRuntimeRoot,validateNativeConfig})(verifiedProviderAccount);
}
