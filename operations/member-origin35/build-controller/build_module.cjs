'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const c='/work/candidate',out='/output',sha=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{
 const t=spawnSync(process.execPath,[c+'/node_modules/typescript/bin/tsc','--project',c+'/tsconfig.json','--noEmit'],{encoding:'utf8',timeout:100000});
 fs.writeFileSync(out+'/TYPECHECK.log',(t.stdout??'')+(t.stderr??''));
 if(t.status!==0)throw Error('ORIGINAL_TYPESCRIPT_CHECK_FAILED');
 const {build}=await import(c+'/node_modules/vite/dist/node/index.js');
 await build({configFile:false,root:c,publicDir:false,cacheDir:'/tmp/vite-cache',logLevel:'warn',build:{outDir:out+'/dist',emptyOutDir:true,cssCodeSplit:false,lib:{entry:c+'/src/integration/ClubMemberModule.tsx',formats:['es'],fileName:'club-member-module'},rolldownOptions:{external:id=>/^react(?:-dom)?(?:\/|$)/.test(id)}}});
 const files={};for(const n of fs.readdirSync(out+'/dist').sort())files[n]=sha(fs.readFileSync(out+'/dist/'+n));
 const text=Object.keys(files).filter(n=>n.endsWith('.mjs')).map(n=>fs.readFileSync(out+'/dist/'+n,'utf8')).join('\n');
 if(/process\.env|server-only|node:crypto|node:fs|next\/server|next\/headers/.test(text))throw Error('SERVER_BOUNDARY_IN_CLIENT');
 if(!text.includes('https://member.crays.world'))throw Error('EXACT_AWS_ORIGIN_NOT_COMPILED');
 const pins=[];function walk(dir){for(const n of fs.readdirSync(dir).sort()){const p=path.join(dir,n),s=fs.lstatSync(p);if(s.isSymbolicLink())throw Error('SOURCE_SYMLINK');if(s.isDirectory())walk(p);else if(s.isFile())pins.push({path:path.relative(c,p),sha256:sha(fs.readFileSync(p))})}}walk(c+'/src');
 const sourceClosureSha256=sha(JSON.stringify(pins)),version='club-member-'+sourceClosureSha256.slice(0,16);
 fs.writeFileSync(out+'/MODULE_MANIFEST.json',JSON.stringify({at:new Date().toISOString(),version,source:c,sourceClosureSha256,baseVersion:'club-member-606b24d0f52dacf1',files},null,2));
 fs.writeFileSync(out+'/BUILD_ACTUAL.json',JSON.stringify({status:'OWN_ORIGIN_MODULE_BUILD_PASS_ADOPTION_PENDING',sourcePins:pins,sourceClosureSha256,version,files,serverBoundaryAbsent:true,liveAdopted:false,customerAcceptance:false},null,2));
})().catch(e=>{console.error('MEMBER_ORIGIN_BUILD_FAILED',e.name,e.message);process.exitCode=1});
