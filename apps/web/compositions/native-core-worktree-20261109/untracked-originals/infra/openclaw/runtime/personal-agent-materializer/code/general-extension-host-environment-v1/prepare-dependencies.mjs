/** Fixed source dependency composition, not a user tool or runtime grant.
 * Reuses currently selected original OCR/skill/prlimit custody checks.
 * Does not read owner configuration, credentials, records or model routes.
 */
import assert from'node:assert/strict';import{isAsyncFunction,isPromise}from'node:util/types';
import{prepareLocalMediaDependencyPaths}from'/opt/crays/openclaw/runtime-artifacts/interactive-gateway39/ca5e9e1ba9462585a5795d79036869e09988689ef5b3d0fcc1af840b7edc232f/code/local-media/prepare-local-media-dependencies.mjs';
export async function prepareGeneralExtensionDependencyPaths({assertCurrent}={}){
 assert.equal(typeof assertCurrent,'function');assert(!isAsyncFunction(assertCurrent),'SYNCHRONOUS_HOST_CURRENTNESS_REQUIRED');
 const current=()=>{const value=assertCurrent();if(isPromise(value))value.catch(()=>{});assert.equal(value,undefined,'SYNCHRONOUS_HOST_CURRENTNESS_REQUIRED');};current();
 const dependency=await prepareLocalMediaDependencyPaths(current);current();assert.equal(dependency.localReadinessOnly,true);assert(typeof dependency.ocrBin==='string'&&dependency.ocrBin.startsWith('/opt/crays/openclaw/tool-artifacts/tesseract-ocr/')&&dependency.ocrBin.endsWith('/usr/bin'));
 return Object.freeze({ocrBin:dependency.ocrBin,dependencyCustodyReadbackOnly:true,requiresActualHostPathPreparation:true,configurationWritten:false,currentCoreOrActorGrantCreated:false,defaultFactorySwitched:false});
}
