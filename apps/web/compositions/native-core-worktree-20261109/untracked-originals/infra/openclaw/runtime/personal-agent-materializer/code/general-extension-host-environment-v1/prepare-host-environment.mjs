/** Inactive server-host launch preparation. Never a model tool, provider grant,
 * config/default switch or runtime start. Does not mutate process.env.
 * The returned environment belongs ONLY to the fixed admitted SDK child.
 * Never serialize/log it: the caller's existing private environment is retained.
 */
import assert from 'node:assert/strict';
import {prepareGeneralExtensionDependencyPaths} from './prepare-dependencies.mjs';

function snapshotHostEnvironment(baseEnvironment) {
 assert(baseEnvironment && typeof baseEnvironment === 'object' && !Array.isArray(baseEnvironment), 'TRUSTED_HOST_ENVIRONMENT_REQUIRED');
 const descriptors = Object.getOwnPropertyDescriptors(baseEnvironment);
 const environment = Object.create(null);
 for (const key of Reflect.ownKeys(descriptors)) {
  assert(typeof key === 'string' && key.length > 0 && !/[=\0]/.test(key), 'INVALID_ENVIRONMENT_KEY');
  const descriptor = descriptors[key];
  assert(Object.hasOwn(descriptor, 'value') && typeof descriptor.value === 'string' && !descriptor.value.includes('\0'), 'DATA_ONLY_HOST_ENVIRONMENT_REQUIRED');
  environment[key] = descriptor.value;
 }
 const originalPath = environment.PATH;
 assert(typeof originalPath === 'string' && originalPath.length > 0 && originalPath.length <= 32768, 'EXISTING_HOST_PATH_REQUIRED');
 const entries = originalPath.split(':');
 assert(entries.every(entry => entry.startsWith('/') && !/[\r\n]/.test(entry)), 'ABSOLUTE_HOST_PATH_ENTRIES_REQUIRED');
 return Object.freeze(environment);
}

export function composeSdkHostEnvironment(baseEnvironment, ocrBin) {
 assert(typeof ocrBin === 'string' && /^\/opt\/crays\/openclaw\/tool-artifacts\/tesseract-ocr\/[a-f0-9]{64}\/usr\/bin$/.test(ocrBin), 'FIXED_OCR_BIN_REQUIRED');
 const environment = Object.assign(Object.create(null), snapshotHostEnvironment(baseEnvironment));
 const entries = environment.PATH.split(':');
 // Preserve relative order of every other original executable directory. Never
 // inject cwd/empty PATH entries or duplicate an already prepared OCR directory.
 environment.PATH = [ocrBin, ...entries.filter(entry => entry !== ocrBin)].join(':');
 return Object.freeze(environment);
}

/** Exact original dependency custody checks run before environment construction.
 * assertCurrent is existing synchronous HOST scope, not an actor/effect grant.
 * Original SDK skill filtering AND prompt building must run in the resulting
 * child process; metadata-only hasBin checks cannot replace this.
 */
export async function prepareSdkHostEnvironment({baseEnvironment, assertCurrent}) {
 // Detach before awaited custody IO; neither caller mutation nor getters may
 // change which inherited environment will reach the admitted child process.
 const snapshot = snapshotHostEnvironment(baseEnvironment);
 const dependencies = await prepareGeneralExtensionDependencyPaths({assertCurrent});
 const environment = composeSdkHostEnvironment(snapshot, dependencies.ocrBin);
 assertCurrent();
 return Object.freeze({environment, dependencyCustodyReadbackOnly:true, runtimeStarted:false,
  defaultFactorySwitched:false, currentCoreOrActorGrantCreated:false});
}
