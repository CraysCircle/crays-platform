// Existing Core project, API-only staged output; no web/dummy domain promotion.
// No credential is included in build output or command arguments.
import {readFile,writeFile,mkdir,copyFile,readdir,symlink} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const source=root+'/.qualification/native-core-http-release-v1';
const stage=root+'/.qualification/native-core-https-stage-v1';
const build=JSON.parse(await readFile(source+'/BUILD.json','utf8'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
if(hash(await readFile(source+'/index.mjs'))!==build.sha256)throw Error('COMPILED_CORE_CHANGED');
for(const[path,pin]of Object.entries(build.inputPins))if(hash(await readFile(resolve(root,path)))!==pin.sha256)throw Error('CORE_HTTP_SOURCE_CHANGED');
const fn=stage+'/.vercel/output/functions/api/graphql.func';
await mkdir(fn+'/src/graphql',{recursive:true,mode:0o700});
await copyFile(source+'/index.mjs',fn+'/index.mjs');
for(const name of ['schema.graphql','oca-environment-records.graphql','oca-environment-preflight.graphql'])await copyFile(source+'/src/graphql/'+name,fn+'/src/graphql/'+name);
const notices=new Map();
for(const input of Object.keys(build.inputPins).filter(x=>x.startsWith('node_modules/'))){
 let directory=dirname(resolve(root,input));
 while(directory.startsWith(root+'/node_modules/')){
  try{
   const pkg=JSON.parse(await readFile(directory+'/package.json','utf8'));
   if(pkg.name&&!notices.has(pkg.name)){
    const files=[];for(const file of (await readdir(directory)).filter(x=>/^(licen[sc]e|notice|copying|readme)(\.|$)/i.test(x)).sort())files.push({file,text:await readFile(directory+'/'+file,'utf8')});
    notices.set(pkg.name,{name:pkg.name,version:pkg.version,declaredLicense:pkg.license??null,files});
   }break;
  }catch(error){if(error.code!=='ENOENT')throw error;}
  directory=dirname(directory);
 }
}
await writeFile(fn+'/THIRD_PARTY_NOTICES.json',JSON.stringify([...notices.values()],null,2)+'\n');
await writeFile(fn+'/.vc-config.json',JSON.stringify({runtime:'nodejs24.x',handler:'index.mjs',launcherType:'Nodejs',maxDuration:30,memory:1024,regions:['fra1'],supportsResponseStreaming:true,environment:{CRAYS_GRAPHQL_ENABLED:'true'}},null,2)+'\n');
const native=stage+'/.vercel/output/functions/api/native';
await mkdir(native+'/personal-message-originals',{recursive:true,mode:0o700});
await symlink('../graphql.func',native+'/personal-message-originals.func');
await symlink('../../graphql.func',native+'/personal-message-originals/read.func');
await writeFile(stage+'/.vercel/output/config.json',JSON.stringify({version:3,routes:[{handle:'filesystem'},{src:'/.*',status:404}]},null,2)+'\n');
await writeFile(stage+'/.vercel/project.json',JSON.stringify({projectId:'prj_NGR48JMHR98KDvTcVDFXaiDmPR7N',orgId:'team_hBEkypVxg4SGGaxkUdHo6e4y',projectName:'crays-franchise'},null,2)+'\n');
await writeFile(stage+'/RELEASE.json',JSON.stringify({schema:'crays.native.api-only-vercel-stage.v1',originalRouteBundleSha256:build.sha256,inputCount:Object.keys(build.inputPins).length,bodyLimitAcceptance:false,fullAppOrDeviceAccepted:false,existingDomainsMustNotBePromoted:true},null,2)+'\n');
console.log(JSON.stringify({status:'EXACT_API_ONLY_PREBUILT_STAGE_PREPARED',stage,notices:notices.size,originalRoutes:3,existingWebDomainPromotion:false}));
