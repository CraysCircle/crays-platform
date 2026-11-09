'use strict';
const fs=require('node:fs'),crypto=require('node:crypto');
let token=null,credentialFD=null,fileFD=null;
let stage='READINESS';
let out={failureStage:null,status:'NATIVE_ASSET_FLOW_HOLD',nativeAdminLogin:false,nativeAssetRead:false,graphQLPrivateURL:false,getExactOriginalBytes:false,headExactNoBody:false,anonymousDenied:false,ownedLogout:false,ownedLogoutTokenDenied:false,originalFileStable:false,nativeProductCount:null,privateValuesExported:false,bodySHAExported:false,coredumpDisabled:false,automaticRetry:false};
const hard=setTimeout(()=>{process.stdout.write(JSON.stringify({...out,status:'NATIVE_ASSET_FLOW_DEADLINE_UNKNOWN',ownedLogoutUncertain:!!token,failureStage:out.failureStage??stage}));process.exit(3);},80000);
function need(x){if(!x)throw Error('NATIVE_ASSET_FLOW_HOLD');}
function ident(s){return ['dev','ino','mode','uid','gid','nlink','size','mtimeNs','ctimeNs'].map(k=>String(s[k])).join('|');}
async function capped(response,cap){
 const reader=response.body?.getReader();if(!reader)return Buffer.alloc(0);
 const chunks=[];let n=0;
 try{while(true){const x=await reader.read();if(x.done)break;n+=x.value.byteLength;if(n>cap){await reader.cancel();throw Error('BODY_CAP');}chunks.push(Buffer.from(x.value));}return Buffer.concat(chunks,n);}
 finally{reader.releaseLock();}
}
async function gql(query,variables,session,ownsLogin=false){
 const response=await fetch('http://127.0.0.1:3000/admin-api',{method:'POST',redirect:'manual',signal:AbortSignal.timeout(5000),headers:{'content-type':'application/json',...(session?{authorization:'Bearer '+session}:{})},body:JSON.stringify({query,variables:variables??{}})});
 if(ownsLogin){const owned=response.headers.get('vendure-auth-token');if(typeof owned==='string'&&owned.length>0)token=owned;}
 const bytes=await capped(response,65536);const body=JSON.parse(bytes.toString('utf8'));
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
 const metadata=await gql('query { asset(id:"1"){source preview mimeType fileSize} products(options:{take:1}){totalItems} }',{},token);
 const asset=metadata.body?.data?.asset;
 need(!metadata.body?.errors?.length&&asset&&asset.fileSize===1645539&&metadata.body.data.products?.totalItems===115);
 out.nativeAssetRead=true;out.nativeProductCount=115;
 stage='ASSET_URL_AND_ORIGINAL_FILE';
 const prefix='http://172.27.0.2:3000/task-assets/';
 need(typeof asset.source==='string'&&asset.source.startsWith(prefix));
 const filename=decodeURIComponent(asset.source.slice(prefix.length));
 need(/^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/.test(filename)&&asset.source===prefix+encodeURIComponent(filename));
 assetURL=asset.source;out.graphQLPrivateURL=true;
 const originalPath='/srv/crays/runtimes/xl-member-providers-vendure/assets/'+filename;
 fileFD=fs.openSync(originalPath,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);
 fileBefore=fs.fstatSync(fileFD,{bigint:true});need(fileBefore.isFile()&&fileBefore.nlink===1n&&fileBefore.size===1645539n);
 original=fs.readFileSync(fileFD);need(original.length===1645539);
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
 need(ident(fs.fstatSync(fileFD,{bigint:true}))===ident(fileBefore)&&ident(fs.statSync(originalPath,{bigint:true}))===ident(fileBefore));
 need(ident(fs.fstatSync(credentialFD,{bigint:true}))===ident(credentialBefore)&&ident(fs.statSync('/run/crays/original-launch.json',{bigint:true}))===ident(credentialBefore));
 out.originalFileStable=true;
})().catch(()=>{out.failureStage=stage;}).finally(async()=>{
 try{await logout();}catch(_){if(out.failureStage===null)out.failureStage=stage;}
 if(fileFD!==null)try{fs.closeSync(fileFD);}catch(_){}
 if(credentialFD!==null)try{fs.closeSync(credentialFD);}catch(_){}
 original=null;
 const pass=out.nativeAdminLogin&&out.nativeAssetRead&&out.graphQLPrivateURL&&out.getExactOriginalBytes&&out.headExactNoBody&&out.anonymousDenied&&out.ownedLogout&&out.ownedLogoutTokenDenied&&out.originalFileStable;
 out.failureStage=pass?null:(out.failureStage??stage);
 out.status=pass?'ORIGINAL_NATIVE_ASSET_DELIVERY_PASS':'NATIVE_ASSET_FLOW_HOLD';
 out.ownedLogoutUncertain=!!token;
 clearTimeout(hard);process.stdout.write(JSON.stringify(out));if(!pass)process.exitCode=3;
});
