/** Trusted host composition seam; not an HTTP/tool entrypoint or live default switch.
 * The existing materializer must retain Core/account rechecks, journal/CAS,
 * native config validation and readonly alias mount admission before publication.
 */
import assert from 'node:assert/strict';
import CATALOGUE from './APPROVED_GENERAL_CHANNEL_INDEPENDENT_CATALOGUE.candidate.json' with {type:'json'};
import {prepareApprovedGeneralRuntime} from './prepare-approved-general-runtime.candidate-v3.mjs';

export function normalizeDormantGeneralFactoryPolicy(base, hostContext) {
  assert(!base.channels?.whatsapp && !base.bindings?.some(b => b.match?.channel === 'whatsapp'),
    'OWN_WHATSAPP_BRANCH_REQUIRES_SEPARATE_ADMISSION');
  assert(base.cron === undefined || base.cron?.enabled === false, 'EXISTING_CRON_POLICY_MUST_BE_DORMANT');
  assert(base.hooks === undefined || base.hooks?.enabled === false, 'EXISTING_HOOK_POLICY_MUST_BE_DORMANT');
  const dormant = {every:'0m',target:'none'};
  const agent = base.agents.entries[hostContext.agentId];
  assert(agent, 'CANONICAL_AGENT_REQUIRED');
  for (const policy of [base.agents.defaults?.heartbeat, agent.heartbeat])
    if (policy !== undefined) assert.deepEqual(policy,dormant,'EXISTING_HEARTBEAT_MUST_BE_DORMANT');
  const seconds=base.agents.defaults?.timeoutSeconds;
  assert(seconds === undefined || [120,300].includes(seconds),'EXISTING_REQUEST_BUDGET_MUST_BE_KNOWN');
  return {...base,
    cron:base.cron ?? {enabled:false}, hooks:base.hooks ?? {enabled:false},
    agents:{...base.agents,defaults:{...base.agents.defaults,timeoutSeconds:seconds ?? 300,
      heartbeat:base.agents.defaults?.heartbeat ?? dormant},
      entries:{...base.agents.entries,[hostContext.agentId]:{...agent,heartbeat:agent.heartbeat ?? dormant}}},
  };
}

export async function prepareChannelIndependentGeneralRuntime(base, hostContext) {
  const normalized=normalizeDormantGeneralFactoryPolicy(base,hostContext);
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
  return prepareApprovedGeneralRuntime(normalized, hostContext, projection);
}
