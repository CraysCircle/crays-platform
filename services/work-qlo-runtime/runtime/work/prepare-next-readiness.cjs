const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
/** Await the installed Next instrumentation promise before listening. Existing
 * instrumentation retains its own guarded metadata-only warmup. No new request,
 * query, actor, authority cache or alternate data source is introduced here. */
async function prepareNextReadiness(app,{root,distDir}){
 assert(path.isAbsolute(root)&&path.isAbsolute(distDir));
 assert.equal(path.dirname(distDir),root);
 assert(fs.statSync(path.join(distDir,'server/instrumentation.js')).isFile());
 await app.prepare();
 const {ensureInstrumentationRegistered}=require(path.join(root,'node_modules/next/dist/server/lib/router-utils/instrumentation-globals.external.js'));
 await ensureInstrumentationRegistered(root,path.basename(distDir));
}
module.exports={prepareNextReadiness};
