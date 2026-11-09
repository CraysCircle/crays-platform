/**
 * Compose the reviewed first tool/skill wave without starting a runtime, reading
 * credentials or writing an additional copy of a credential-bearing config.
 * The caller must validate against the pinned native runtime before deployment.
 */
import assert from 'node:assert/strict';

const AGENT_ID = 'crays-agent-thorben';
const SKILLS = Object.freeze(['weather']);
const TOOLS = Object.freeze(['read', 'web_fetch']);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);

export function composeGeneralSkillsFirstWave(base, {agentId = AGENT_ID} = {}) {
  assert(object(base), 'GENERAL_SKILLS_POLICY: configuration object required');
  assert(agentId === AGENT_ID, 'GENERAL_SKILLS_POLICY: owner scope mismatch');
  const entries = base.agents?.entries;
  assert(object(entries), 'GENERAL_SKILLS_POLICY: named agent entries required');
  assert(Object.keys(entries).length === 1 && object(entries[agentId]),
    'GENERAL_SKILLS_POLICY: one exact private owner agent required');
  const agent = entries[agentId];
  assert(['/var/lib/crays-life-agent-thorben/workspace',
    '/var/lib/private/crays-life-agent-thorben/workspace'].includes(agent.workspace),
    'GENERAL_SKILLS_POLICY: private owner workspace required');
  for (const tools of [base.tools, agent.tools]) {
    assert(tools === undefined || object(tools), 'GENERAL_SKILLS_POLICY: malformed tool policy');
    assert(tools?.deny === undefined || (Array.isArray(tools.deny) && tools.deny.every(x => typeof x === 'string')),
      'GENERAL_SKILLS_POLICY: malformed denial policy');
  }
  assert(base.skills === undefined || object(base.skills), 'GENERAL_SKILLS_POLICY: malformed skill configuration');
  assert(base.skills?.entries === undefined || object(base.skills.entries), 'GENERAL_SKILLS_POLICY: malformed skill entries');
  const result = structuredClone(base);
  const narrowTools = original => {
    const policy = {...original, profile: 'full', allow: [...TOOLS]};
    // A profile is intersected with explicit global and per-agent policies.
    // Keeping minimal/messaging would silently remove web_fetch; the exact
    // two-name allowlist remains restrictive even as upstream adds new tools.
    delete policy.alsoAllow;
    policy.deny = (original?.deny ?? []).filter(name => name !== '*');
    policy.fs = {...original?.fs, workspaceOnly: true};
    return policy;
  };
  result.tools = narrowTools(base.tools);
  result.tools.web = {...base.tools?.web, fetch: {...base.tools?.web?.fetch, enabled: true}};
  result.agents.entries[agentId].tools = narrowTools(agent.tools);
  result.agents.entries[agentId].skills = [...SKILLS];
  result.skills = {...result.skills, allowBundled: [...SKILLS], entries: {
    ...result.skills?.entries,
    weather: {...result.skills?.entries?.weather, enabled: true},
  }};
  return result;
}

export function describeGeneralSkillsFirstWave() {
  return {
    agentId: AGENT_ID, skills: [...SKILLS], tools: [...TOOLS],
    nativeImplicitTools: ['skills_read'], workspaceOnly: true,
    configOnly: true, runtimeStarted: false, liveToolSuccessProven: false,
  };
}
