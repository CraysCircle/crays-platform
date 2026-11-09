'use strict';
const fs=require('node:fs'),crypto=require('node:crypto');
let token=null,credentialFD=null,fileFD=null;
let selectedName=null,selectedMime=null,fileDirectoryFD=null,directoryBefore=null;
function imageMime(prefix){
 if(prefix.length>=8&&prefix.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'image/png';
 if(prefix.length>=3&&prefix.subarray(0,3).equals(Buffer.from([255,216,255])))return 'image/jpeg';
 if(prefix.length>=12&&prefix.subarray(0,4).equals(Buffer.from('RIFF'))&&prefix.subarray(8,12).equals(Buffer.from('WEBP')))return 'image/webp';
 if(prefix.length>=16&&prefix.subarray(4,8).equals(Buffer.from('ftyp'))&&(prefix.subarray(8,12).equals(Buffer.from('avif'))||prefix.subarray(8,12).equals(Buffer.from('avis'))))return 'image/avif';
 return null;
}
function readOriginalBounded(fd){
 const chunks=[];let n=0;
 while(true){const chunk=Buffer.alloc(Math.min(65536,5*1024*1024+1-n));const count=fs.readSync(fd,chunk,0,chunk.length,null);if(count===0)break;n+=count;need(n<=5*1024*1024);chunks.push(chunk.subarray(0,count));}
 return Buffer.concat(chunks,n);
}
function selectOriginalAsset(){
 const root='/srv/crays/runtimes/xl-member-providers-vendure/assets';
 fileDirectoryFD=fs.openSync(root,fs.constants.O_RDONLY|fs.constants.O_DIRECTORY|fs.constants.O_NOFOLLOW);
 directoryBefore=fs.fstatSync(fileDirectoryFD,{bigint:true});need(directoryBefore.isDirectory());
 const directory='/proc/self/fd/'+String(fileDirectoryFD),names=fs.readdirSync(directory);
 need(names.length<=2048);
 const candidates=[];
 for(const name of names){
  if(!/^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/.test(name))continue;
  const snap=fs.lstatSync(directory+'/'+name,{bigint:true});
  if(snap.isFile()&&snap.uid===1000n&&snap.gid===1000n&&snap.nlink===1n&&snap.size>0n&&snap.size<=5242880n)candidates.push({name,snap,size:Number(snap.size)});
 }
 candidates.sort((a,b)=>a.size-b.size||(a.name<b.name?-1:a.name>b.name?1:0));
 need(candidates.length>0);
 for(const candidate of candidates.slice(0,64)){
  let trial=fs.openSync(directory+'/'+candidate.name,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);
  try{
   need(ident(fs.fstatSync(trial,{bigint:true}))===ident(candidate.snap));
   const prefix=Buffer.alloc(32),count=fs.readSync(trial,prefix,0,32,0),mime=imageMime(prefix.subarray(0,count));
   const bytes=mime?readOriginalBounded(trial):Buffer.alloc(0);
   need(ident(fs.fstatSync(trial,{bigint:true}))===ident(candidate.snap));
   if(mime){fileFD=trial;trial=null;selectedName=candidate.name;selectedMime=mime;fileBefore=candidate.snap;original=bytes;break;}
  }finally{if(trial!==null)fs.closeSync(trial);}
 }
 need(fileFD!==null&&original?.length===1645539);
 need(ident(fs.fstatSync(fileDirectoryFD,{bigint:true}))===ident(directoryBefore)&&ident(fs.statSync(root,{bigint:true}))===ident(directoryBefore));
}
function selectedOriginalStable(){
 return fileFD!==null&&fileDirectoryFD!==null&&ident(fs.fstatSync(fileFD,{bigint:true}))===ident(fileBefore)&&ident(fs.lstatSync('/proc/self/fd/'+String(fileDirectoryFD)+'/'+selectedName,{bigint:true}))===ident(fileBefore)&&ident(fs.fstatSync(fileDirectoryFD,{bigint:true}))===ident(directoryBefore)&&ident(fs.statSync('/srv/crays/runtimes/xl-member-providers-vendure/assets',{bigint:true}))===ident(directoryBefore);
}

const metadataDiag={phase:'NOT_STARTED',assetsKind:'UNSEEN',itemsKind:'UNSEEN',itemsReturnedBucket:'UNSEEN',sourceMatchesSelectedName:false,mimeMatchesOriginal:false,responseReturned:false,httpClass:'NONE',bodyReadCompleted:false,jsonParsed:false,rootKind:'UNSEEN',dataKind:'UNSEEN',errorsKind:'UNSEEN',errorsCountCapped:0,errorsTruncated:false,errorCodes:[],errorPaths:[],knownUrlContractError:false,assetKind:'UNSEEN',fileSizeKind:'UNSEEN',fileSizeMatchesExpected:false,sourceKind:'UNSEEN',previewKind:'UNSEEN',mimeTypeKind:'UNSEEN',productsKind:'UNSEEN',totalItemsKind:'UNSEEN',productCountMatchesOriginalObservation:false,noGraphQLErrors:false,sourcePrivateCanonical:false,previewEmptyOrPrivateCanonical:false};
function kind(value,present=true){if(!present)return 'MISSING';if(value===null)return 'NULL';if(Array.isArray(value))return 'ARRAY';if(typeof value==='object')return 'OBJECT';if(typeof value==='string')return 'STRING';if(typeof value==='number')return 'NUMBER';return 'OTHER';}
function captureMetadata(body){
 metadataDiag.phase='SHAPE';
 metadataDiag.rootKind=kind(body);
 const data=body&&typeof body==='object'&&!Array.isArray(body)?body.data:undefined;
 metadataDiag.dataKind=kind(data,data!==undefined);
 const errors=body&&typeof body==='object'?body.errors:undefined;
 metadataDiag.errorsKind=kind(errors,errors!==undefined);
 metadataDiag.noGraphQLErrors=!errors?.length;
 const codes=new Set(['FORBIDDEN','UNAUTHORIZED','INTERNAL_SERVER_ERROR','BAD_USER_INPUT','GRAPHQL_VALIDATION_FAILED','GRAPHQL_PARSE_FAILED']);
 const paths=new Set(['assets','items','id','source','preview','fileSize','mimeType','products','totalItems']);
 if(Array.isArray(errors)){
  metadataDiag.errorsCountCapped=Math.min(errors.length,16);metadataDiag.errorsTruncated=errors.length>16;
  for(const e of errors.slice(0,16)){
   const code=codes.has(e?.extensions?.code)?e.extensions.code:'OTHER_REDACTED';
   if(!metadataDiag.errorCodes.includes(code))metadataDiag.errorCodes.push(code);
   const path=Array.isArray(e?.path)&&e.path.length>0&&e.path.length<=4&&e.path.every(p=>typeof p==='string'&&paths.has(p))?e.path.join('.'):Array.isArray(e?.path)&&e.path.length===0||e?.path==null?'ROOT_OR_ABSENT':'OTHER_REDACTED';
   if(!metadataDiag.errorPaths.includes(path))metadataDiag.errorPaths.push(path);
   if(e?.message==='ORIGINAL_ASSET_URL_CONTRACT_REQUIRED')metadataDiag.knownUrlContractError=true;
  }
 }
 const assets=data&&typeof data==='object'?data.assets:undefined,items=assets&&typeof assets==='object'?assets.items:undefined;
 metadataDiag.assetsKind=kind(assets,assets!==undefined);metadataDiag.itemsKind=kind(items,items!==undefined);
 metadataDiag.itemsReturnedBucket=Array.isArray(items)?items.length===0?'ZERO':items.length===1?'ONE':'TWO_OR_MORE':'UNSEEN';
 const asset=Array.isArray(items)?items[0]:undefined,products=data&&typeof data==='object'?data.products:undefined;
 metadataDiag.assetKind=kind(asset,asset!==undefined);
 const object=asset&&typeof asset==='object'&&!Array.isArray(asset);
 metadataDiag.fileSizeKind=kind(object?asset.fileSize:undefined,!!object&&Object.hasOwn(asset,'fileSize'));
 metadataDiag.fileSizeMatchesExpected=!!object&&asset.fileSize===1645539;
 metadataDiag.sourceKind=kind(object?asset.source:undefined,!!object&&Object.hasOwn(asset,'source'));
 metadataDiag.previewKind=kind(object?asset.preview:undefined,!!object&&Object.hasOwn(asset,'preview'));
 metadataDiag.mimeTypeKind=kind(object?asset.mimeType:undefined,!!object&&Object.hasOwn(asset,'mimeType'));
 const canonical=(value)=>{if(typeof value!=='string')return false;const prefix='http://172.27.0.2:3000/task-assets/';if(!value.startsWith(prefix))return false;try{const name=decodeURIComponent(value.slice(prefix.length));return /^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/.test(name)&&value===prefix+encodeURIComponent(name);}catch(_){return false;}};
 metadataDiag.sourcePrivateCanonical=!!object&&canonical(asset.source);
 metadataDiag.sourceMatchesSelectedName=!!object&&asset.source==='http://172.27.0.2:3000/task-assets/'+encodeURIComponent(selectedName);
 metadataDiag.mimeMatchesOriginal=!!object&&asset.mimeType===selectedMime;
 metadataDiag.previewEmptyOrPrivateCanonical=!!object&&(asset.preview===''||asset.preview===null||canonical(asset.preview));
 metadataDiag.productsKind=kind(products,products!==undefined);
 const productObject=products&&typeof products==='object'&&!Array.isArray(products);
 metadataDiag.totalItemsKind=kind(productObject?products.totalItems:undefined,!!productObject&&Object.hasOwn(products,'totalItems'));
 metadataDiag.productCountMatchesOriginalObservation=!!productObject&&products.totalItems===115;
 metadataDiag.phase='CAPTURED';
}

let stage='READINESS';
let out={diagnosticOnly:false,credentialStable:false,metadataDiagnostic:metadataDiag,failureStage:null,status:'NATIVE_ASSET_FLOW_HOLD',nativeAdminLogin:false,nativeAssetRead:false,graphQLPrivateURL:false,getExactOriginalBytes:false,headExactNoBody:false,anonymousDenied:false,ownedLogout:false,ownedLogoutTokenDenied:false,originalFileStable:false,nativeProductCount:null,privateValuesExported:false,bodySHAExported:false,coredumpDisabled:false,automaticRetry:false};
const hard=setTimeout(()=>{process.stdout.write(JSON.stringify({...out,status:'NATIVE_ASSET_FLOW_DEADLINE_UNKNOWN',ownedLogoutUncertain:!!token,failureStage:out.failureStage??stage}));process.exit(3);},80000);
function need(x){if(!x)throw Error('NATIVE_ASSET_FLOW_HOLD');}
function ident(s){return ['dev','ino','mode','uid','gid','nlink','size','mtimeNs','ctimeNs'].map(k=>String(s[k])).join('|');}
async function capped(response,cap){
 const reader=response.body?.getReader();if(!reader)return Buffer.alloc(0);
 const chunks=[];let n=0;
 try{while(true){const x=await reader.read();if(x.done)break;n+=x.value.byteLength;if(n>cap){await reader.cancel();throw Error('BODY_CAP');}chunks.push(Buffer.from(x.value));}return Buffer.concat(chunks,n);}
 finally{reader.releaseLock();}
}
async function gql(query,variables,session,ownsLogin=false,metadataCapture=false){
 if(metadataCapture)metadataDiag.phase='FETCH';
 const response=await fetch('http://127.0.0.1:3000/admin-api',{method:'POST',redirect:'manual',signal:AbortSignal.timeout(5000),headers:{'content-type':'application/json',...(session?{authorization:'Bearer '+session}:{})},body:JSON.stringify({query,variables:variables??{}})});
 if(ownsLogin){const owned=response.headers.get('vendure-auth-token');if(typeof owned==='string'&&owned.length>0)token=owned;}
 if(metadataCapture){metadataDiag.responseReturned=true;const family=Math.floor(response.status/100);metadataDiag.httpClass=family>=1&&family<=5?String(family)+'XX':'OTHER';metadataDiag.phase='BODY_READ';}
 const bytes=await capped(response,65536);
 if(metadataCapture){metadataDiag.bodyReadCompleted=true;metadataDiag.phase='JSON_PARSE';}
 const body=JSON.parse(bytes.toString('utf8'));
 if(metadataCapture)metadataDiag.jsonParsed=true;
 return {status:response.status,body,session:response.headers.get('vendure-auth-token')};
}
async function logout(){
 if(!token)return;
 stage='OWNED_LOGOUT';
 let succeeded=false;
 try{
  const result=await gql('mutation { logout { success } }',{},token);
  succeeded=result.body?.data?.logout?.success===true&&!result.body?.errors?.length;
  out.ownedLogout=succeeded;
  if(succeeded&&out.graphQLPrivateURL){
   stage='OWNED_LOGOUT_TOKEN_DENIAL';
   const response=await fetch(assetURL,{method:'GET',redirect:'manual',signal:AbortSignal.timeout(5000),headers:{authorization:'Bearer '+token}});
   await capped(response,16384);
   out.ownedLogoutTokenDenied=[401,403,404].includes(response.status);
  }
 }finally{if(succeeded)token=null;}
}
let assetURL=null,original=null,fileBefore=null,credentialBefore=null;
(async()=>{
 // Bounded readiness GET only; no repeated login/session mutation.
 const readyUntil=Date.now()+25000;let ready=false;
 while(Date.now()<readyUntil){
  try{const r=await fetch('http://127.0.0.1:3000/admin-api',{redirect:'manual',signal:AbortSignal.timeout(1000)});await capped(r,16384);ready=r.status>=100&&r.status<600;}catch(_){}
  if(ready)break;await new Promise(r=>setTimeout(r,250));
 }
 need(ready);
 stage='CORE_LIMIT_PRECHECK';
 need(/^Max core file size\s+0\s+0\s+bytes[\t ]*$/m.test(fs.readFileSync('/proc/self/limits','utf8')));
 out.coredumpDisabled=true;
 stage='ORIGINAL_ASSET_SELECTION';
 selectOriginalAsset();
 stage='PROTECTED_CREDENTIAL_READ';
 credentialFD=fs.openSync('/run/crays/original-launch.json',fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);
 credentialBefore=fs.fstatSync(credentialFD,{bigint:true});
 need(credentialBefore.isFile()&&credentialBefore.uid===0n&&credentialBefore.gid===1000n&&credentialBefore.nlink===1n&&credentialBefore.size<=1048576n&&(credentialBefore.mode&0o777n)===0o440n);
 const launch=JSON.parse(fs.readFileSync(credentialFD,'utf8'));
 need(Array.isArray(launch.Config?.Env));
 let username=null,password=null;
 for(const item of launch.Config.Env){
  if(typeof item!=='string')continue;const pos=item.indexOf('=');
  if(pos<=0)continue;const key=item.slice(0,pos);
  if(key==='SUPERADMIN_USERNAME')username=item.slice(pos+1);
  if(key==='SUPERADMIN_PASSWORD')password=item.slice(pos+1);
 }
 need(typeof username==='string'&&username.length>0&&typeof password==='string'&&password.length>0);
 stage='LOGIN_RESPONSE';
 const logged=await gql('mutation Login($username:String!,$password:String!){login(username:$username,password:$password){__typename ... on CurrentUser { id }}}',{username,password},null,true);
 username=null;password=null;
 need(logged.body?.data?.login?.__typename==='CurrentUser'&&typeof logged.session==='string'&&logged.session.length>0&&!logged.body?.errors?.length);
 logged.session=null;out.nativeAdminLogin=true;
 stage='NATIVE_ASSET_METADATA';
 const metadata=await gql('query OriginalAsset($file:String!){assets(options:{take:1,filter:{source:{eq:$file}}}){totalItems items{id source preview mimeType fileSize}} products(options:{take:1}){totalItems}}',{file:selectedName},token,false,true);
 captureMetadata(metadata.body);
 const assets=metadata.body?.data?.assets;
 const asset=Array.isArray(assets?.items)?assets.items[0]:undefined;
 // take:1 is a bounded page, not a uniqueness assertion on original source references.
 need(!metadata.body?.errors?.length&&asset&&assets.items.length===1&&asset.fileSize===original.length&&asset.mimeType===selectedMime);
 out.nativeAssetRead=true;
 // The former115 product count is only metadataDiagnostic.productCountMatchesOriginalObservation.
 stage='ASSET_URL_AND_ORIGINAL_FILE';
 const prefix='http://172.27.0.2:3000/task-assets/';
 need(typeof asset.source==='string'&&asset.source.startsWith(prefix));
 const filename=decodeURIComponent(asset.source.slice(prefix.length));
 need(/^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/.test(filename)&&filename===selectedName&&asset.source===prefix+encodeURIComponent(selectedName));
 assetURL=asset.source;out.graphQLPrivateURL=true;
 const originalPath='/srv/crays/runtimes/xl-member-providers-vendure/assets/'+filename;
 need(selectedOriginalStable()&&original.length===1645539);
 const originalSHA=crypto.createHash('sha256').update(original).digest('hex');
 stage='AUTHORIZED_GET';
 const get=await fetch(assetURL,{method:'GET',redirect:'manual',signal:AbortSignal.timeout(5000),headers:{authorization:'Bearer '+token}});
 const getBytes=await capped(get,5*1024*1024);
 out.getExactOriginalBytes=get.status===200&&getBytes.length===original.length&&crypto.createHash('sha256').update(getBytes).digest('hex')===originalSHA&&get.headers.get('content-type')?.split(';')[0]===asset.mimeType;
 need(out.getExactOriginalBytes);
 stage='AUTHORIZED_HEAD';
 const head=await fetch(assetURL,{method:'HEAD',redirect:'manual',signal:AbortSignal.timeout(5000),headers:{authorization:'Bearer '+token}});
 const headBytes=await capped(head,1);
 out.headExactNoBody=head.status===200&&headBytes.length===0&&Number(head.headers.get('content-length'))===original.length&&head.headers.get('content-type')?.split(';')[0]===asset.mimeType;
 need(out.headExactNoBody);
 stage='ANONYMOUS_DENIAL';
 const anonymous=await fetch(assetURL,{method:'GET',redirect:'manual',signal:AbortSignal.timeout(5000)});
 await capped(anonymous,16384);out.anonymousDenied=[401,403,404].includes(anonymous.status);need(out.anonymousDenied);
 stage='ORIGINAL_FILE_STABILITY';
 need(selectedOriginalStable());
 need(ident(fs.fstatSync(credentialFD,{bigint:true}))===ident(credentialBefore)&&ident(fs.statSync('/run/crays/original-launch.json',{bigint:true}))===ident(credentialBefore));
 out.originalFileStable=true;out.credentialStable=true;
})().catch(()=>{out.failureStage=stage;}).finally(async()=>{
 try{await logout();}catch(_){if(out.failureStage===null)out.failureStage=stage;}
 if(fileFD!==null)try{fs.closeSync(fileFD);}catch(_){}
 if(fileDirectoryFD!==null)try{fs.closeSync(fileDirectoryFD);}catch(_){}
 if(credentialFD!==null)try{fs.closeSync(credentialFD);}catch(_){}
 original=null;
 const pass=out.nativeAdminLogin&&out.nativeAssetRead&&out.graphQLPrivateURL&&out.getExactOriginalBytes&&out.headExactNoBody&&out.anonymousDenied&&out.ownedLogout&&out.ownedLogoutTokenDenied&&out.originalFileStable&&out.credentialStable;
 out.failureStage=pass?null:(out.failureStage??stage);
 out.status=pass?'ORIGINAL_NATIVE_ASSET_DELIVERY_PASS':'NATIVE_ASSET_FLOW_HOLD';
 out.ownedLogoutUncertain=!!token;
 clearTimeout(hard);process.stdout.write(JSON.stringify(out));if(!pass)process.exitCode=3;
});
