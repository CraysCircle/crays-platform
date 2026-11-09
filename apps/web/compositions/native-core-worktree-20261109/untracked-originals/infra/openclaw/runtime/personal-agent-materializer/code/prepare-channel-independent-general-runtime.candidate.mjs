/** Trusted host composition seam; not an HTTP/tool entrypoint or live default switch.
 * The existing materializer must retain Core/account rechecks, journal/CAS,
 * native config validation and readonly alias mount admission before publication.
 */
import assert from 'node:assert/strict';
import CATALOGUE from './APPROVED_GENERAL_CHANNEL_INDEPENDENT_CATALOGUE.candidate.json' with {type:'json'};
import {prepareApprovedGeneralRuntime} from './prepare-approved-general-runtime.candidate-v2.mjs';

export async function prepareChannelIndependentGeneralRuntime(base, hostContext) {
  assert(!base.channels?.whatsapp && !base.bindings?.some(b => b.match?.channel === 'whatsapp'),
    'OWN_WHATSAPP_BRANCH_REQUIRES_SEPARATE_ADMISSION');
  // No caller-provided catalogue, paths, capability names or model credentials.
  // The parent validates exact Core person/agent/runtime formulas before I/O.
  const projection = {
    baseProjectedSha256: CATALOGUE.baseProjectedSha256,
    standard: structuredClone(CATALOGUE.standard),
    catalog: structuredClone(CATALOGUE.catalog),
    instructionAliases: CATALOGUE.instructionAliasSuffixes.map(a => ({
      runtimePath: hostContext.runtime + a.runtimeSuffix,
      artifactPath: a.artifactPath,
    })),
  };
  return prepareApprovedGeneralRuntime(base, hostContext, projection);
}
