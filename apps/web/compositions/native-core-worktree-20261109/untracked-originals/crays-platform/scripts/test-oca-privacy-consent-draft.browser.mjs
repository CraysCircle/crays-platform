/** Controlled component regression using the actual React component and packages.
 * No Core authentication, durable consent, provider, native iOS or product acceptance.
 * Fixture HTTP stays on a fresh owned IPv4 loopback origin; browser profile is fresh.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {chromium, expect} from '@playwright/test';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.resolve(process.argv[2]??'');
assert(output.startsWith(root+'/.qualification/'),'Explicit own qualification output required');
const sourcePath=path.join(root,'src/components/oca-privacy-center.tsx');
const priorPath=path.join(root,'.qualification/native-core-initial-read-v82/before/src/components/oca-privacy-center.tsx');
const current=await fs.readFile(sourcePath,'utf8'),prior=await fs.readFile(priorPath,'utf8');
const hash=value=>createHash('sha256').update(value).digest('hex');
const documentSource=await fs.readFile(path.join(root,'src/graphql/oca-privacy-documents.ts'),'utf8');
const documents=Object.fromEntries([...documentSource.matchAll(/export const (\w+)=\{__meta__:\{hash:"([a-f0-9]{64})"\}\}/g)].map(m=>[m[1],m[2]]));
assert.equal(Object.keys(documents).length,7);
const entry=`import React from 'react';import{createRoot}from'react-dom/client';import{OcaPrivacyCenter}from'./src/components/oca-privacy-center';createRoot(document.getElementById('root')).render(<><h1>Synthetic component regression — not a live Core account</h1><OcaPrivacyCenter/></>);`;
async function bundle(source){
 const result=await build({stdin:{contents:entry,resolveDir:root,sourcefile:'fixture-entry.tsx',loader:'tsx'},bundle:true,write:false,platform:'browser',format:'iife',jsx:'automatic',tsconfig:path.join(root,'tsconfig.json'),define:{'process.env.NODE_ENV':'"development"'},plugins:[{name:'exact-component-source',setup(b){b.onLoad({filter:/oca-privacy-center\.tsx$/},args=>{assert.equal(path.resolve(args.path),sourcePath);return{contents:source,loader:'tsx',resolveDir:path.dirname(sourcePath)}})}}]});
 assert.equal(result.outputFiles.length,1);return result.outputFiles[0].contents;
}
const bundles={prior:await bundle(prior),current:await bundle(current)};
const model={status:'available',access:{allowed:true,code:'SYNTHETIC_COMPONENT_ONLY'},purposeGrants:[{purposeGrantId:'fixture-purpose',grantVersion:1,purposeCode:'fixture-consent',allowedFieldPaths:['case.status'],allowedRecipientClasses:['fixture-core'],allowedChannels:['fixture-internal'],grantState:'active',grantSha256:'1'.repeat(64),validUntil:'2099-01-01T00:00:00.000Z'}],consents:[],ageSafetyDecisions:[],disclosurePolicies:[],projectionDecisions:[],revocations:[],explainabilityReceipts:[],commandReceipts:[],commandDenials:[],nextSafeAction:'Fixture only; no real authority or persistence.'};
const calls={},workbenchReads={},errors=[];
let origin,browserServer,browser;
const server=http.createServer(async(req,res)=>{
 try{
  const u=new URL(req.url,origin),variant=req.headers['x-crays-test-variant'];
  if(req.method==='GET'&&u.pathname==='/'){
   const version=u.searchParams.get('version');assert(['prior','current'].includes(version));
   res.writeHead(200,{'content-type':'text/html'});res.end(`<html><body><main id="root"></main><script src="/${version}.js"></script></body></html>`);return;
  }
  if(req.method==='GET'&&['/prior.js','/current.js'].includes(u.pathname)){res.writeHead(200,{'content-type':'text/javascript'});res.end(bundles[u.pathname.slice(1,-3)]);return;}
  if(req.method==='GET'&&u.pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}
  assert.equal(req.method,'POST');assert.equal(u.pathname,'/api/graphql');assert(['prior','current','denied','recovery'].includes(variant));
  let raw='';for await(const part of req){raw+=part;assert(Buffer.byteLength(raw)<32768);}
  const body=JSON.parse(raw),operation=body.extensions?.persistedQuery?.sha256Hash;
  (calls[variant]??=[]).push({operation,input:structuredClone(body.variables?.input??null)});
  let reply,status=200;
  if(operation===documents.OcaPurposeDisclosureWorkbenchDocument){
   workbenchReads[variant]=(workbenchReads[variant]??0)+1;
   if(variant==='recovery'&&workbenchReads[variant]===1){status=503;reply={errors:[{message:'Synthetic initial read unavailable'}]};}
   else reply={data:{ocaPurposeDisclosureWorkbench:model}};
  }else if(operation===documents.PreflightRecordOcaConsentDocument){
   await new Promise(resolve=>setTimeout(resolve,25));
   reply={data:{preflightRecordOcaConsent:{allowed:variant!=='denied',code:variant==='denied'?'FIXTURE_DENIED':'FIXTURE_ALLOWED',nextSafeAction:'Fixture response, not real Core permission.'}}};
  }else if(operation===documents.RecordOcaConsentDocument){
   assert.notEqual(variant,'denied');reply={data:{recordOcaConsent:{status:'applied',replayed:false,receiptId:'fixture-receipt',consentVersion:1,nextSafeAction:'Synthetic UI only'}}};
  }else throw Error('Unexpected fixture operation');
  res.writeHead(status,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(reply));
 }catch(error){errors.push(String(error));res.writeHead(500,{'content-type':'application/json'});res.end(JSON.stringify({errors:[{message:'Fixture request rejected'}]}));}
});
const result={schema:'crays.core.privacy-consent-draft.browser-regression.v1',scope:'Actual React component/DOM/HTTP UI behavior with controlled local responses, not real Core authorization/persistence or iOS acceptance.',sourceSHA256:hash(current),priorSourceSHA256:hash(prior),documentsSHA256:hash(documentSource),cases:[],noRealAccountsOrProviders:true,productionChanged:false};
async function scenario(variant,version){
 const context=await browser.newContext({viewport:{width:1440,height:1000},extraHTTPHeaders:{'x-crays-test-variant':variant}});
 const page=await context.newPage();page.on('pageerror',error=>errors.push(String(error)));
 await page.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
 try{
  await page.goto(origin+'/?version='+version);
  if(variant==='recovery'){
   await expect(page.getByRole('alert')).toContainText('Synthetic initial read unavailable');
   await expect(page.getByRole('button',{name:'Preflight record',exact:true})).toHaveCount(0);
   await page.getByRole('button',{name:'Reload',exact:true}).click();
  }
  await page.getByRole('textbox',{name:'Subject SHA-256',exact:true}).fill('a'.repeat(64));
  await page.getByRole('textbox',{name:'Subject authority reference',exact:true}).fill('fixture-subject-authority');
  await page.getByRole('textbox',{name:'Evidence reference',exact:true}).fill('fixture-evidence');
  await page.getByRole('button',{name:'Preflight record',exact:true}).click();
  if(variant==='denied'){
   await expect(page.getByRole('status').filter({hasText:'FIXTURE_DENIED'})).toBeVisible();
   await expect(page.getByRole('button',{name:'Confirm consent',exact:true})).toHaveCount(0);
   assert.equal(calls[variant].filter(c=>c.operation===documents.RecordOcaConsentDocument).length,0);
   result.cases.push({name:'denied-preflight',passed:true,recordRequests:0});return;
  }
  await expect(page.getByRole('button',{name:'Confirm consent',exact:true})).toBeVisible();
  const before=workbenchReads[variant];await page.getByRole('button',{name:'Reload',exact:true}).click();
  await expect.poll(()=>workbenchReads[variant]).toBeGreaterThan(before);
  await expect(page.getByRole('button',{name:'Reload',exact:true})).toBeEnabled();
  await page.getByRole('textbox',{name:'Original privacy command idempotency key',exact:true}).fill('fixture-unrelated-reconciliation-key');
  await page.getByRole('button',{name:'Confirm consent',exact:true}).click();
  await expect(page.getByRole('status').filter({hasText:'applied'})).toBeVisible();
  const pre=calls[variant].find(c=>c.operation===documents.PreflightRecordOcaConsentDocument).input;
  const commands=calls[variant].filter(c=>c.operation===documents.RecordOcaConsentDocument);assert.equal(commands.length,1);
  const command=commands[0].input;assert.equal(command.idempotencyKey,pre.idempotencyKey);
  if(variant==='prior')assert.notEqual(command.validUntil,pre.validUntil,'Prior source must actually reproduce the changing deadline');
  else assert.deepEqual(command,pre,'Confirmation must retain the complete preflight draft after reload and unrelated rerender');
  result.cases.push({name:variant,passed:true,priorDeadlineChanged:variant==='prior',completeDraftStable:variant!=='prior',preflightValidUntil:pre.validUntil,confirmedValidUntil:command.validUntil,recordRequests:commands.length});
 }finally{await context.close();}
}
try{
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});origin='http://127.0.0.1:'+server.address().port;
 browserServer=await chromium.launchServer({headless:true});const child=browserServer.process();
 await fs.writeFile(path.join(output,'BROWSER_PROCESS.json'),JSON.stringify({pid:child.pid,startTicks:(await fs.readFile('/proc/'+child.pid+'/stat','utf8')).split(') ').at(-1).split(' ')[19],scope:'Owned fresh synthetic UI browser only'},null,2)+'\n');
 browser=await chromium.connect(browserServer.wsEndpoint());result.browserVersion=browser.version();
 await scenario('prior','prior');await scenario('current','current');await scenario('denied','current');await scenario('recovery','current');assert.deepEqual(errors,[]);result.status='PASS_CONTROLLED_COMPONENT_REGRESSION_NOT_CORE_OR_NATIVE_ACCEPTANCE';
}finally{
 if(browser)await browser.close();if(browserServer){await browserServer.close();const child=browserServer.process();assert(child.exitCode!==null||child.signalCode!==null);result.ownBrowserTerminal=true;}
 server.closeAllConnections();await new Promise(resolve=>server.close(resolve));result.ownHttpServerClosed=true;
 await fs.writeFile(path.join(output,'BROWSER_RESULT.json'),JSON.stringify({...result,errors},null,2)+'\n');
}
console.log(JSON.stringify(result));
