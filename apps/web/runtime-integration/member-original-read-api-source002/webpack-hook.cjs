'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const FROZEN_POOL_SHA='088873195b724ad441b949324d82847d53e830b2451f1848c930b71f6232f30d';
// Root-owned build configuration only. The frozen 52 files are never edited.
// Requires an explicit --webpack build; do not silently apply to Turbopack.
module.exports=function createMemberReadApiReplacement(webpack,releaseSourceRoot,integrationRoot){
 const original=path.resolve(releaseSourceRoot,'src/db/core-identity-runtime-pool.ts'),replacement=path.resolve(integrationRoot,'src/db/core-identity-runtime-pool.ts');
 if(original===replacement||crypto.createHash('sha256').update(fs.readFileSync(original)).digest('hex')!==FROZEN_POOL_SHA)throw Error('FROZEN_MEMBER_POOL_PREIMAGE_CHANGED');
 if(!fs.existsSync(replacement)||!fs.existsSync(path.resolve(integrationRoot,'src/db/original-member-api/client.cjs')))throw Error('MEMBER_API_ADAPTER_NOT_STAGED');
 return new webpack.NormalModuleReplacementPlugin(/core-identity-runtime-pool(?:\.ts)?$/,resource=>{
  if(!resource.createData)return;
  const resolved=resource.createData.resource?.split('?')[0];if(resolved!==original)return;
  if(crypto.createHash('sha256').update(fs.readFileSync(original)).digest('hex')!==FROZEN_POOL_SHA)throw Error('FROZEN_MEMBER_POOL_PREIMAGE_CHANGED');
  resource.createData.resource=replacement;resource.createData.context=path.dirname(replacement);
 });
};
