/** Pure private configuration proposal; no filesystem, authentication, network or runtime access. */
import assert from 'node:assert/strict';
import {composeGeneralSkillsFirstWave} from './crays-agent-general-skills-policy.mjs';
const ID = 'crays-agent-thorben';
const TOOLS = Object.freeze(['read', 'web_fetch', 'web_search', 'pdf']);
const isObject = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const need = (ok, code) => assert(ok, `SECOND_WAVE_DECISION_REQUIRED:${code}`);
const primary = x => typeof x === 'string' ? x : isObject(x) ? x.primary : undefined;

export function composeGeneralSkillsSecondWave(base, {apiRoute, existingModelRef, modelRouteEvidence} = {}) {
  // Evidence describes a reviewed nonsecret route. It is not an auth token, admission or live success.
  need(apiRoute === 'openai-chatgpt-responses', 'EXISTING_CHATGPT_API_ROUTE');
  need(typeof existingModelRef === 'string' && /^openai\/[^\s/]+$/.test(existingModelRef), 'EXACT_EXISTING_MODEL_REF');
  need(isObject(modelRouteEvidence) && typeof modelRouteEvidence.sourcePath === 'string' &&
    modelRouteEvidence.sourcePath.startsWith('/') && /^[a-f0-9]{64}$/.test(modelRouteEvidence.sourceSha256),
    'NONSECRET_MODEL_ROUTE_EVIDENCE');
  need(primary(base?.agents?.entries?.[ID]?.model) === existingModelRef, 'MODEL_REF_MISMATCH');
  need(base.plugins === undefined || isObject(base.plugins), 'MALFORMED_PLUGINS');
  need(base.plugins?.enabled !== false, 'PLUGINS_EXPLICITLY_DISABLED');
  // Require the existing narrow allowlist. Creating one from an unbounded policy could silently
  // disable other working plugins, while dropping it would broaden installation authority.
  need(Array.isArray(base.plugins?.allow) && base.plugins.allow.every(x => typeof x === 'string') &&
    base.plugins.allow.includes('openai'), 'EXISTING_EXPLICIT_PLUGIN_ALLOWLIST');
  need(base.plugins.deny === undefined || (Array.isArray(base.plugins.deny) &&
    base.plugins.deny.every(x => typeof x === 'string')), 'MALFORMED_PLUGIN_DENY');
  need(!(base.plugins.deny ?? []).some(x => x === '*' || x === 'document-extract'), 'DOCUMENT_PLUGIN_DENIED');
  need(base.plugins.entries === undefined || isObject(base.plugins.entries), 'MALFORMED_PLUGIN_ENTRIES');
  const document = base.plugins.entries?.['document-extract'];
  need(document === undefined || isObject(document), 'MALFORMED_DOCUMENT_PLUGIN');
  need(document?.enabled !== false, 'DOCUMENT_PLUGIN_EXPLICITLY_DISABLED');
  const search = base.tools?.web?.search;
  need(search === undefined || isObject(search), 'MALFORMED_SEARCH');
  need(search?.provider === undefined || ['auto', 'openai'].includes(search.provider?.trim?.().toLowerCase()),
    'OTHER_SEARCH_PROVIDER_SELECTED');
  need(search?.openaiCodex === undefined || isObject(search.openaiCodex), 'MALFORMED_NATIVE_SEARCH');
  const defaults = base.agents?.defaults;
  need(defaults === undefined || isObject(defaults), 'MALFORMED_AGENT_DEFAULTS');
  const pdfModel = defaults?.pdfModel;
  need(pdfModel === undefined || primary(pdfModel) === existingModelRef, 'EXISTING_PDF_MODEL_CONFLICT');
  need(!isObject(pdfModel) || pdfModel.fallbacks === undefined ||
    (Array.isArray(pdfModel.fallbacks) && pdfModel.fallbacks.length === 0), 'EXISTING_PDF_FALLBACKS');
  const result = composeGeneralSkillsFirstWave(base);
  result.tools.allow = [...TOOLS];
  result.agents.entries[ID].tools.allow = [...TOOLS];
  result.tools.web.search = {...result.tools.web.search, enabled: true,
    openaiCodex: {...result.tools.web.search?.openaiCodex, enabled: true}};
  result.plugins.allow = [...new Set([...result.plugins.allow, 'document-extract'])];
  result.plugins.entries = {...result.plugins.entries,
    'document-extract': {...result.plugins.entries?.['document-extract'], enabled: true}};
  result.agents.defaults = {...result.agents.defaults,
    pdfModel: pdfModel === undefined ? {primary: existingModelRef, fallbacks: []} : result.agents.defaults.pdfModel};
  return result;
}

export function describeGeneralSkillsSecondWave() {
  return {agentId: ID, tools: [...TOOLS], nativeImplicitTools: ['skills_read'],
    pluginAdded: 'document-extract', modelApiRequired: 'openai-chatgpt-responses',
    configOnly: true, runtimeStarted: false, credentialsInspected: false,
    liveToolSuccessProven: false, newProviderKeyRequiredByDesign: false};
}
