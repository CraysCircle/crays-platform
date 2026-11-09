'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const q=__dirname,c=q+'/club-member-photo-contrast-candidate',sha=x=>crypto.createHash('sha256').update(x).digest('hex');
(async()=>{
 const t=spawnSync('/opt/node-v22.18.0-linux-x64/bin/node',[c+'/node_modules/typescript/bin/tsc','--project',c+'/tsconfig.json','--noEmit'],{encoding:'utf8',timeout:100000});fs.writeFileSync(q+'/PHOTO_CONTRAST_TYPECHECK.log',(t.stdout??'')+(t.stderr??''));if(t.status!==0)process.exit(t.status??1);
 const {build}=await import(c+'/node_modules/vite/dist/node/index.js');
 await build({configFile:false,root:c,publicDir:false,logLevel:'warn',build:{outDir:'dist',emptyOutDir:true,cssCodeSplit:false,lib:{entry:c+'/src/integration/ClubMemberModule.tsx',formats:['es'],fileName:'club-member-module'},rolldownOptions:{external:id=>/^react(?:-dom)?(?:\/|$)/.test(id)}}});
 const files=fs.readdirSync(c+'/dist').map(p=>({path:p,sha256:sha(fs.readFileSync(c+'/dist/'+p))}));
 const text=files.filter(x=>x.path.endsWith('.mjs')).map(x=>fs.readFileSync(c+'/dist/'+x.path,'utf8')).join('\n');
 if(/process\.env|server-only|node:crypto|node:fs|next\/server|next\/headers/.test(text))throw Error('SERVER_BOUNDARY_IN_CLIENT');
 const pins=[];function walk(dir){for(const n of fs.readdirSync(dir)){const p=path.join(dir,n);if(fs.statSync(p).isDirectory())walk(p);else pins.push({path:path.relative(c,p),sha256:sha(fs.readFileSync(p))});}}walk(c+'/src');
 const report={at:new Date().toISOString(),passed:true,files,sourcePins:pins,sourceClosureSha256:sha(JSON.stringify(pins)),sharedHostMounted:false,actualAuthenticatedAcceptance:false};
 fs.writeFileSync(q+'/PHOTO_CONTRAST_BUILD_ACTUAL.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({built:true,sourceFiles:pins.length,artifacts:files.length,sharedHostMounted:false}));
})().catch(e=>{console.error('MEMBER_CLIENT_BUILD_FAILED',e.name);process.exitCode=1});
