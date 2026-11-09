/** Inactive host composition. Actual existing Core/native account/root connectors; no route or startup grant. */
import *as standardFactory from '../../../../../../scripts/personal-agent-standard-package-v20/new-personal-agent-baseline-config.mjs';
import {createCoreAssignmentResolver} from '../resolve-core-assignment.mjs';
import {createNativeOwnAccountAuthority} from '../native-own-account-authority.mjs';
import {openRuntimeRoot} from '../open-runtime-root.mjs';
import {createRuntimeAdmissionReader} from './read-runtime-admission.mjs';
import {createPersonalSpeechHostContextResolver,withCurrentPersonalSpeechHostContext} from './resolve-personal-speech-host-context.mjs';
export function createServerPersonalSpeechHostContextResolver({getClient,verifiedProviderAccount,assertHostAdmissionCurrent}){
 const account=Object.freeze({accountId:verifiedProviderAccount?.accountId,providerKey:verifiedProviderAccount?.providerKey,providerSubject:verifiedProviderAccount?.providerSubject});
 const resolveCommittedAssignment=createCoreAssignmentResolver({getClient,standardFactory});
 return createPersonalSpeechHostContextResolver({verifiedProviderAccount:account,standardFactory,resolveCommittedAssignment,ownAccountAuthority:createNativeOwnAccountAuthority({verifiedProviderAccount:account,resolveCommittedAssignment,standardFactory}),readRuntimeAdmission:createRuntimeAdmissionReader({openRuntimeRoot}),assertHostAdmissionCurrent});
}

export function createServerPersonalSpeechGenerationBoundary(host){
 const resolveContext=createServerPersonalSpeechHostContextResolver(host);
 return async ({runtimeConfig,signal,produceNativeAudioOnly})=>withCurrentPersonalSpeechHostContext({resolveContext,runtimeConfig,signal,produceNativeAudioOnly});
}
