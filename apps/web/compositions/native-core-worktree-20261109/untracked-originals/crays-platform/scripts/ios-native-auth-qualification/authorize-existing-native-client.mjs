// Owner-authorized existing Chrome SSO -> existing native public client PKCE.
// This is an actual server-side integration probe, not an iOS/device login.
import './runtime-source-loader.mjs';
import {randomBytes,createHash} from 'node:crypto';
import {readFile,open,writeFile,lstat,rename} from 'node:fs/promises';
const directory='/home/craysdev/.config/crays/native-core/owner-v1';
const callback='world.crays.development://login.crays.pro/ios/world.crays.development/callback';
const clientId='CERjos0EEyKusmsI7LQupWokjhEwDpzn',issuer='https://login.crays.pro/';
const scope='openid profile email crays:identity:read crays:bootstrap:read crays:contact:write crays:personal:read crays:personal:write';
const interactive=process.argv.includes('--interactive'),refresh=process.argv.includes('--refresh');
if(process.argv.slice(2).some(x=>!['--interactive','--refresh'].includes(x)))throw Error('UNKNOWN_AUTHORIZATION_OPTION');
const verifier=randomBytes(32).toString('base64url'),state=randomBytes(32).toString('base64url');
let page,status=1;const navigation=[];
try {
 const cfgPath=directory+'/server-environment.json',meta=await lstat(cfgPath);
 if(!meta.isFile()||meta.isSymbolicLink()||meta.uid!==process.getuid()||(meta.mode&0o077))throw Error('PRIVATE_CONFIG_REQUIRED');
 const env=JSON.parse(await readFile(cfgPath,'utf8'));for(const [k,v] of Object.entries(env))process.env[k]=v;
 const intake=JSON.parse(await readFile('/home/craysdev/codex-chat-projects/openclaw/apps/ios/.secrets/owner-first-account-intake.json','utf8'));
 const {connect}=await import('/home/craysdev/codex-chat-projects/openclaw/review/owner-account-browser-20261025/connect.mjs');
 const browser=await connect(),context=browser.contexts()[0];if(!context)throw Error('EXISTING_CHROME_CONTEXT_REQUIRED');
 page=await context.newPage();
 const cdp=await context.newCDPSession(page);await cdp.send('Page.enable');await cdp.send('Network.enable');
 let observed;
 const completion=new Promise(resolve=>{observed=resolve;});
 const capture=url=>{if(typeof url==='string'&&url.startsWith(callback+'?')){observed(url);return true;}return false;};
 const location=headers=>Object.entries(headers??{}).find(([k])=>k.toLowerCase()==='location')?.[1];
 cdp.on('Network.requestWillBeSent',event=>{capture(event.request?.url);capture(location(event.redirectResponse?.headers));if(event.type==='Document'&&navigation.length<12){try{const u=new URL(event.request.url);navigation.push({host:u.hostname,path:u.pathname,redirectStatus:event.redirectResponse?.status??null});}catch{}}});
 cdp.on('Network.responseReceived',event=>capture(location(event.response?.headers)));
 cdp.on('Page.frameRequestedNavigation',event=>capture(event.url));
 page.on('request',request=>capture(request.url()));
 await page.route('**/*',route=>capture(route.request().url())?route.abort():route.continue());
 const authorize=new URL(issuer+'authorize');for(const [k,v] of Object.entries({client_id:clientId,redirect_uri:callback,response_type:'code',response_mode:'query',audience:'https://api.crays.pro/',scope,state,code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256',...(interactive?{connection:'google-oauth2',login_hint:intake.email}:{prompt:'none'})}))authorize.searchParams.set(k,v);
 void page.goto(authorize.href,{timeout:20000}).catch(()=>{});
 let finished=false,selected=false,consented=false;
 const interact=async()=>{
  while(interactive&&!finished){
   try{
    const u=new URL(page.url());
    if(u.hostname==='accounts.google.com'&&!selected){
     const own=page.getByText(intake.email,{exact:true});if(await own.count()===1&&await own.isVisible()){await own.click({timeout:1500});selected=true;}
    }
    if(u.hostname==='login.crays.pro'&&u.pathname.includes('consent')&&!consented){
     const accept=page.getByRole('button',{name:/^(Accept|Allow|Zulassen|Akzeptieren)$/i});if(await accept.count()===1&&await accept.isVisible()){await accept.click({timeout:1500});consented=true;}
    }
   }catch{}
   await new Promise(resolve=>setTimeout(resolve,500));
  }
 };
 const interaction=interact();
 let redirect;try{redirect=await Promise.race([completion,new Promise((_,reject)=>setTimeout(()=>reject(Error('EXISTING_SSO_CALLBACK_NOT_OBSERVED')),interactive?90000:25000).unref())]);}finally{finished=true;await interaction;}
 const result=new URL(redirect);if(result.searchParams.get('state')!==state)throw Error('PKCE_STATE_MISMATCH');
 if(result.searchParams.get('error')){
  const e=result.searchParams.get('error');throw Error(['login_required','consent_required','interaction_required','access_denied'].includes(e)?'AUTH0_'+e.toUpperCase():'AUTH0_AUTHORIZATION_DENIED');
 }
 const code=result.searchParams.get('code');if(!code)throw Error('AUTHORIZATION_CODE_MISSING');
 const response=await fetch(issuer+'oauth/token',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({grant_type:'authorization_code',client_id:clientId,redirect_uri:callback,code,code_verifier:verifier}),signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error('AUTH0_CODE_EXCHANGE_REJECTED');
 const tokens=await response.json();if(typeof tokens.access_token!=='string'||tokens.token_type?.toLowerCase()!=='bearer')throw Error('AUTH0_ACCESS_TOKEN_MISSING');
 const {createNativeAuth0Verifier}=await import('../../src/lib/native-auth/native-auth0-verifier.mjs');
 const auth=createNativeAuth0Verifier({issuer,audience:'https://api.crays.pro/',nativeClientIds:[clientId]});
 const request=new Request('https://api.crays.pro/api/graphql',{method:'POST',headers:{authorization:'Bearer '+tokens.access_token}});
 const principal=await auth.authenticate(request);auth.requireScopes(request,principal,scope.split(' ').filter(x=>x.startsWith('crays:')));
 const binding=auth.resolveVerifiedProviderBinding(request,principal);
 if(binding.providerSubject!==intake.existingAuth0ProviderObservation.subject)throw Error('ORIGINAL_OWNER_IDENTITY_REQUIRED');
 const {lookupNativeIdentityThroughOriginalCore}=await import('../../src/lib/native-core-identity-lookup.ts');
 const identityPool=await import('../../src/db/core-identity-runtime-pool.ts');
 let mapped;try{mapped=await lookupNativeIdentityThroughOriginalCore('auth0',binding.providerSubject,binding);}finally{await identityPool.closeCoreNativeIdentityRpcPool();}
 if(mapped?.account?.account_id!=='acct_dae5f628-3c09-4fd9-940d-fe55cb68323c')throw Error('ORIGINAL_CORE_ACCOUNT_REQUIRED');
 const target=directory+'/native-client-tokens.json';
 if(refresh){const old=await lstat(target);if(!old.isFile()||old.isSymbolicLink()||old.uid!==process.getuid()||(old.mode&0o077))throw Error('PRIVATE_TOKEN_REFRESH_DENIED');}
 const staging=refresh?target+'.next-'+process.pid:target;
 const held=await open(staging,'wx',0o600);try{await held.writeFile(JSON.stringify(tokens)+'\n');await held.sync();}finally{await held.close();}
 if(refresh)await rename(staging,target);
 const proof={schema:'crays.native.actual-existing-public-client-browser-pkce.v1',at:new Date().toISOString(),actualHostedAuth0:true,actualOriginalAccountMapped:true,pkceS256:true,actualNativeClient:true,existingChromeProfile:true,interactive,verifiedIssuerClientSubjectScopes:true,tokenPrinted:false,actualIosDevice:false,sameChatReply:false};
 await writeFile(new URL('../../../.task-work/native-core-actual-server-connections-20261025/'+(refresh?'ACTUAL_NATIVE_CLIENT_PKCE_REFRESH_'+Date.now()+'.json':'ACTUAL_NATIVE_CLIENT_PKCE_RESULT.json'),import.meta.url),JSON.stringify(proof,null,2)+'\n',{mode:0o600,flag:'wx'});
 console.log(JSON.stringify(proof));status=0;
}catch(error){console.log(JSON.stringify({status:'ACTUAL_EXISTING_NATIVE_CLIENT_AUTHORIZATION_NOT_COMPLETE',code:/^[A-Z0-9_]+$/.test(error?.message??'')?error.message:'AUTHORIZATION_OR_ORIGINAL_VERIFICATION_FAILED',navigation,tokensPrinted:false}));}
finally{try{await page?.close();}catch{}process.exit(status);}
