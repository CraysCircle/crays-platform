// Source-only Club post-bind browser acceptance. Original requests remain unchanged.
"use strict";
const fs=require("fs"),path=require("path"),crypto=require("crypto"),https=require("https");
const ca=fs.readFileSync("/job/private-edge-root.crt");
const {chromium}=require("/deps/playwright");
const P="/output",t=JSON.parse(fs.readFileSync(P+"/TARGET_BINDING_ACTUAL.json"));
const b=t.binding,prior=t.source18,gate=t.imageVariantReadGate,adoption=t.source18CacheAdoption;
const source18Current=prior.containerId===b.containerId||(adoption?.status==="ORIGINAL_SOURCE18_APPLICABLE_AFTER_CACHE_ONLY_DEPLOYMENT_DELTA"&&adoption.oldContainerId===prior.containerId&&adoption.newContainerId===b.containerId&&adoption.buildId===b.buildId&&adoption.originalSource18SHA256===t.source18OriginalSHA256&&adoption.originalRootBindingSHA256===prior.rootBindingSHA256&&adoption.originalGetReceiptUnmodified===true&&adoption.newHttpChecksExecuted===false);
const need=(v,m)=>{if(!v)throw Error(m)},sha=v=>crypto.createHash("sha256").update(v).digest("hex");
const slugs=["isabel-maria-jeworski","thorben-biesenbach","stephanie-weyer","robin-karlsen","anouk-knuffmann"];
const out={status:"INCOMPLETE",browserLaunched:false,views:[],actions:[],screenshots:[],pageErrors:[],consoleErrors:[],assetErrors:[],bridgeErrors:[],writes:[],unexpectedVariants:[],variantRequests:[],externalRequestsBlocked:[],sourceVersions:[],apiErrors:[],api5xxCount:0,originalPropertyReads:[],publishedHospitalityVariants:[],propertyTitleEvidence:[],harnessLimitations:["Original Google maps iframe remains blocked; no map validation claimed"],customerAuthenticated:false,bookingOrPaymentAttempted:false,visualReviewAccepted:false,originalRequestsRewritten:false};
const save=()=>fs.writeFileSync(P+"/BROWSER_PROGRESS_ACTUAL.json",JSON.stringify(out,null,2)+"\n");
let browser,ctx,sequence=0;
function isVariant(u){return u.pathname==="/_next/image"||((u.pathname.startsWith("/api/crays/clubs/media/")||/^\/api\/crays\/clubs\/public\/ambassadors\/[a-z0-9]+(?:-[a-z0-9]+)*\/portrait$/.test(u.pathname))&&u.searchParams.has("w"));}

function failedApi(requestPath,status,body){
 if(status>=500)out.api5xxCount++;
 if(out.apiErrors.length>=32)return;
 const entry={path:requestPath.split("?")[0],status};
 if(body.length<=65536){try{const value=JSON.parse(body.toString("utf8"));for(const key of ["status","code","error"]){if(typeof value?.[key]==="string"&&/^[A-Za-z][A-Za-z0-9_.-]{0,95}$/.test(value[key]))entry["api_"+key]=value[key];}}catch{}}
 out.apiErrors.push(entry);save();
}
async function originalPropertyJson(requestPath){
 need(/^\/api\/crays\/clubs\/forest-city\/properties\/property-clubs-forest-city-(golf|marina)\/(content|pricing)$/.test(requestPath),"FINITE_ORIGINAL_PROPERTY_READ_REQUIRED");
 const value=await new Promise((resolve,reject)=>{
  const req=https.request({hostname:"172.26.0.1",port:443,servername:"www.craysclub.com",ca,rejectUnauthorized:true,path:requestPath,method:"GET",headers:{host:"www.craysclub.com",accept:"*/*","accept-encoding":"identity",connection:"close"},timeout:10000},res=>{
   const parts=[];let bytes=0;res.on("data",part=>{bytes+=part.length;if(bytes>12582912)req.destroy(Error("FINITE_RESPONSE_CAP"));else parts.push(part);});res.on("end",()=>resolve({status:res.statusCode,body:Buffer.concat(parts)}));res.on("error",reject);
  });req.on("timeout",()=>req.destroy(Error("FINITE_UPSTREAM_TIMEOUT")));req.on("error",reject);req.end();
 });
 if(value.status>=400)failedApi(requestPath,value.status,value.body);
 need(value.status===200,"ORIGINAL_PUBLIC_API_NOT_200");
 out.originalPropertyReads.push({path:requestPath,status:value.status,bytes:value.body.length});
 return JSON.parse(value.body.toString("utf8"));
}

async function decode(locator){
 await locator.waitFor({state:"visible",timeout:10000});
 const r=await locator.evaluate(async image=>{
  await Promise.race([image.decode(),new Promise((_,reject)=>setTimeout(()=>reject(Error("ORIGINAL_IMAGE_DECODE_TIMEOUT")),7000))]);
  const r=image.getBoundingClientRect();return{src:image.currentSrc||image.src,width:image.naturalWidth,height:image.naturalHeight,complete:image.complete,rect:{x:r.x,y:r.y,width:r.width,height:r.height}};
 });
 need(r.complete&&r.width>0&&r.height>0&&r.rect.width>0&&r.rect.height>0,"ORIGINAL_VISIBLE_IMAGE_DECODE_REQUIRED");return r;
}
async function click(locator,label){
 need(await locator.count()===1,"ONE_ORIGINAL_CONTROL_REQUIRED_"+label);
 await locator.scrollIntoViewIfNeeded();
 const before=await locator.evaluate(e=>({tag:e.tagName,label:(e.getAttribute("aria-label")||e.textContent||"").trim().slice(0,140),href:e.getAttribute("href"),expanded:e.getAttribute("aria-expanded")}));
 need(await locator.isVisible(),"VISIBLE_ORIGINAL_CONTROL_REQUIRED_"+label);
 await locator.click({timeout:8000});out.actions.push({label,before});save();
}
async function screen(page,label,width,extra={}){
 await page.evaluate(()=>document.fonts.ready);
 const state=await page.evaluate(()=>{
  const main=document.querySelector("main"),r=main?.getBoundingClientRect();
  return{url:location.pathname+location.search,title:document.title,h1:[...document.querySelectorAll("h1")].map(x=>x.innerText.trim()),mainText:main?.innerText.slice(0,18000)||"",mainRect:r?{x:r.x,y:r.y,width:r.width,height:r.height}:null};
 });
 need(state.mainRect?.width>0&&state.mainRect?.height>0&&state.mainText.length>80,"REAL_VISIBLE_MAIN_REQUIRED");
 need(!/The Ambassador directory is temporarily unavailable|Application error: a server-side exception/.test(state.mainText),"UNAVAILABLE_OR_ERROR_PAGE");
 const file=String(++sequence).padStart(2,"0")+"-"+label+"-"+width+".png";
 await page.screenshot({path:path.join(P,file),animations:"disabled"});
 out.views.push({width,label,...state,...extra});out.screenshots.push(file);save();
}
async function jsonGet(page,url){
 return page.evaluate(async url=>{const r=await fetch(url,{cache:"no-store"});if(r.status!==200)throw Error("ORIGINAL_PUBLIC_API_NOT_200");return r.json();},url);
}
async function goto(page,url){
 const r=await page.goto("https://www.craysclub.com"+url,{waitUntil:"domcontentloaded",timeout:30000});
 need(r&&r.status()===200,"ORIGINAL_DOCUMENT_NOT_200");await page.locator("main").waitFor({state:"visible",timeout:10000});
}
(async()=>{try{
 need(process.env.CRAYS_REFERENCE_CAPTURE_OWN_LEASE==="AWS-CLUB-POSTBIND-BROWSER23","OWN_EXACT_LEASE_REQUIRED");
 need(b.authority==="Root"&&b.actualClubReplacementAccepted===true&&b.actualOrdinaryPublicPoolAdmitted===true,"ROOT_ACTUAL_BINDING_REQUIRED");
 need(source18Current&&prior.buildId===b.buildId&&prior.status==="FIVE_AMBASSADORS_PORTRAIT_BYTES_TWO_PROPERTY_CONTENT_PLANNING_AND_BOUNDED_RAW_MEDIA_SEARCH_SSR_PASS_BROWSER_AND_CUSTOMER_OPEN","EXACT_SOURCE18_ACTUAL_REQUIRED");
 need(gate.independentlyReviewed===true&&gate.actualRuntimeCacheQualificationAccepted===true&&gate.originalVariantReadsApproved===true&&JSON.stringify(gate.viewports)===JSON.stringify([1920,390]),"EXPLICIT_FINITE_ROOT_IMAGE_VARIANT_READ_GATE_REQUIRED");
 const variants=new Set(gate.allowedOriginalVariantRequestPaths);
 need(variants.size===gate.allowedOriginalVariantRequestPaths.length&&variants.size<=96&&Number.isInteger(gate.maximumVariantRequests)&&gate.maximumVariantRequests>0&&gate.maximumVariantRequests<=128,"FINITE_IMAGE_VARIANT_GATE_REQUIRED");
 
 const reused=JSON.parse(fs.readFileSync("/job/PRIOR05_DESKTOP_PROOF.json","utf8"));
 need(reused.containerId===b.containerId&&reused.pid===b.pid&&String(reused.startTicks)===String(b.startTicks)&&reused.buildId===b.buildId&&reused.privateEdgeSHA256===b.privateEdgeSHA256&&reused.desktopViews.length===6,"EXACT_PRIOR05_DESKTOP_PROOF_REQUIRED");
 out.prior05DesktopReuse={actualPath:reused.actualPath,actualSHA256:reused.actualSHA256,desktopViews:reused.desktopViews,originalStop:reused.originalStop,newDesktopProfileExecution:false};
 need(gate.originalHospitalityPublicationVariantDerivationApproved===true,"ROOT_ORIGINAL_HOSPITALITY_VARIANT_DERIVATION_REQUIRED");
 const propertyInputs=new Map();
 // Reorder the same four original public reads before any page/profile navigation.
 // Responses remain actual HTTPS results in RAM; no network response is fabricated.
 for(const kind of ["golf","marina"]){
  const pid="property-clubs-forest-city-"+kind,old=prior.properties.find(x=>x.propertyId===pid),base="/api/crays/clubs/forest-city/properties/"+pid;
  const e=await originalPropertyJson(base+"/content"),policy=await originalPropertyJson(base+"/pricing"),content=e.content;
  need(old&&e.status==="ready"&&content.contentVersionId===old.contentVersionId&&content.contentSha256===old.contentSha256&&policy.sourcePublicationId===old.sourcePublicationId&&policy.policySha256===old.policySha256&&policy.billingUnit===old.billingUnit&&policy.categories.length===7&&policy.bookingGranted===false&&policy.paymentGranted===false,"SOURCE18_PROPERTY_OR_PRICE_PUBLICATION_CHANGED");
  const hero=content.media.find(m=>m.purpose==="hero"),ordered=hero?[hero,...content.media.filter(m=>m.assetId!==hero.assetId)]:content.media;
  const slots=[ordered.find(m=>m.searchPlacements?.includes(kind==="marina"?"marinaCard":"golfCard"))??ordered.find(m=>m.galleryGroup==="Exterior"),ordered.find(m=>m.galleryGroup==="Rooms & Suites"),ordered.find(m=>m.galleryGroup==="Facilities"),...ordered].filter(Boolean);
  const unique=[];for(const item of slots){if(!unique.some(m=>m.assetId===item.assetId))unique.push(item);if(unique.length===3)break;}
  need(unique.length===3,"THREE_ORIGINAL_PUBLISHED_HERO_SLOTS_REQUIRED");
  for(const item of unique){
   need(item.url==="/api/crays/clubs/media/"+encodeURIComponent(item.assetId),"ORIGINAL_PUBLISHED_MEDIA_URL_REQUIRED");
   for(const width of [320,640,960,1280,1920])variants.add(item.url+"?w="+width);
  }
  need(variants.size<=96,"FINITE_UNIQUE_VARIANT_GATE_REQUIRED");
  out.publishedHospitalityVariants.push({propertyId:pid,contentVersionId:content.contentVersionId,contentSha256:content.contentSha256,assetIds:unique.map(m=>m.assetId),widths:[320,640,960,1280,1920]});
  propertyInputs.set(kind,{pid,old,base,e,policy,content});
 }

 browser=await chromium.launch({headless:true,executablePath:"/opt/google/chrome/chrome",args:["--disable-quic","--no-proxy-server","--disable-dev-shm-usage"]});out.browserLaunched=true;
 // One protected context per viewport; no imported cookies, account, profile or storage.
 for(const width of [1920,390]){
  ctx=await browser.newContext({viewport:{width,height:1000},deviceScaleFactor:1,serviceWorkers:"block"});
  await ctx.route("**/*",async route=>{
   const q=route.request(),u=new URL(q.url()),requestPath=u.pathname+u.search;
   if(!["GET","HEAD"].includes(q.method())){out.writes.push({path:u.pathname,method:q.method()});return route.abort();}
   if(["fonts.googleapis.com","fonts.gstatic.com"].includes(u.hostname))return route.continue();
   if(!["www.craysclub.com","craysclub.com"].includes(u.hostname)){out.externalRequestsBlocked.push({host:u.hostname,path:u.pathname,type:q.resourceType()});return route.abort();}
   if(/^\/(?:auth|api\/auth)(?:\/|$)/.test(u.pathname)||/\/(?:logout|signout)(?:\/|$)/i.test(u.pathname))return route.abort();
   if(isVariant(u)){
    if(!variants.has(requestPath)||out.variantRequests.length>=gate.maximumVariantRequests){out.unexpectedVariants.push(requestPath);return route.abort();}
    out.variantRequests.push({width,path:requestPath});save();
   }
   try{
    const value=await new Promise((resolve,reject)=>{
     // Preserve the exact original path and query, including explicitly admitted variants.
     const headers={...q.headers(),host:u.hostname,"accept-encoding":"identity",connection:"close"};
     const req=https.request({hostname:"172.26.0.1",port:443,servername:"www.craysclub.com",ca,rejectUnauthorized:true,path:requestPath,method:q.method(),headers,timeout:10000},res=>{
      const parts=[];let bytes=0;res.on("data",part=>{bytes+=part.length;if(bytes>12582912){req.destroy(Error("FINITE_RESPONSE_CAP"));return;}parts.push(part);});
      res.on("end",()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(parts)}));res.on("error",reject);
     });req.on("timeout",()=>req.destroy(Error("FINITE_UPSTREAM_TIMEOUT")));req.on("error",reject);req.end();
    });
    if(value.status>=400&&u.pathname.startsWith("/api/crays/clubs/"))failedApi(requestPath,value.status,value.body);
    if(value.status>=400&&["image","stylesheet","script","font"].includes(q.resourceType()))out.assetErrors.push({path:requestPath,status:value.status,type:q.resourceType()});
    const headers={};for(const[k,v]of Object.entries(value.headers))if(!["transfer-encoding","connection","keep-alive","content-length"].includes(k)&&v!==undefined)headers[k]=Array.isArray(v)?v.join(", "):String(v);
    await route.fulfill({status:value.status,headers,body:value.body});
   }catch(e){out.bridgeErrors.push({path:requestPath,errorClass:e.name});await route.abort();}
  });
  const page=await ctx.newPage();
  page.on("pageerror",e=>out.pageErrors.push({width,message:e.message.slice(0,200)}));
  page.on("console",m=>{if(m.type()==="error")out.consoleErrors.push({width,message:m.text().slice(0,240)});});
  if(width===390){
  await goto(page,"/en/ambassadors");
  const directory=await jsonGet(page,"/api/crays/clubs/public/ambassadors?locale=en");
  need(directory.schema==="crays.clubs.public-ambassadors.v1"&&directory.profiles.length===5&&new Set(directory.profiles.map(p=>p.slug)).size===5&&directory.profiles.every(p=>slugs.includes(p.slug)),"FIVE_ORIGINAL_AMBASSADORS_REQUIRED");
  const portraits=[];
  for(const p of directory.profiles){
   const old=prior.profiles.find(x=>x.slug===p.slug);
   need(old&&p.version===old.version&&p.media.sha256===old.portraitSHA256&&p.media.bytes===old.portraitBytes,"SOURCE18_AMBASSADOR_VERSION_CHANGED");
   // Original card src/srcSet select an admitted resized portrait; do not substitute the raw URL.
   const exact=page.locator('#ambassador-directory a[href="'+p.canonicalPath+'"] img');
   await exact.scrollIntoViewIfNeeded();const decoded=await decode(exact);
   const current=new URL(decoded.src),original=new URL(p.media.url,"https://www.craysclub.com");
   const requestedWidth=Number(current.searchParams.get("w"));
   need(current.origin===original.origin&&current.pathname===original.pathname&&
    current.searchParams.getAll("sha").length===1&&current.searchParams.get("sha")===original.searchParams.get("sha")&&
    current.searchParams.getAll("w").length===1&&[320,480,640,960].includes(requestedWidth)&&
    [...current.searchParams.keys()].every(k=>k==="sha"||k==="w")&&variants.has(current.pathname+current.search),
    "ORIGINAL_ADMITTED_PORTRAIT_VARIANT_REQUIRED");
   // The original handler rotates and resizes without enlargement to WebP84.
   // naturalWidth/Height can also reflect srcSet density correction: Source18 raw dimensions are not variant expectations.
   const selection=await exact.evaluate(image=>({src:image.getAttribute("src"),srcSet:image.getAttribute("srcset"),sizes:image.getAttribute("sizes")}));
   portraits.push({slug:p.slug,requestedWidth,originalRawWidth:p.media.width,originalRawHeight:p.media.height,selection,...decoded});
  }
  await page.locator("#ambassador-directory").scrollIntoViewIfNeeded();
  await screen(page,"ambassador-directory",width,{portraits});
  for(const p of directory.profiles){
   const link=page.locator('#ambassador-directory a[href="'+p.canonicalPath+'"]').first();
   await click(link,"open-profile-"+p.slug);
   await page.locator("#ambassador-name").waitFor({state:"visible",timeout:15000});
   need((await page.locator("#ambassador-name").innerText()).trim()===p.name,"ORIGINAL_PROFILE_NAME_REQUIRED");
   const portrait=await decode(page.locator('img[src="'+p.media.url+'"]').first());
   await screen(page,"profile-"+p.slug,width,{slug:p.slug,version:p.version,portrait});
   await goto(page,"/en/ambassadors");
  }
  }
  for(const kind of ["golf","marina"]){
   const pid="property-clubs-forest-city-"+kind,old=prior.properties.find(x=>x.propertyId===pid),base="/api/crays/clubs/forest-city/properties/"+pid;
   await goto(page,"/en/hospitality/"+kind+"-hotel");
   const {e,policy,content}=propertyInputs.get(kind);
   const expectedDisplayName=content.copy?.displayName ?? content.canonicalName;
   need(typeof expectedDisplayName==="string"&&expectedDisplayName.trim()&&expectedDisplayName.length<=200,"ORIGINAL_PROPERTY_DISPLAY_NAME_REQUIRED");
   need(old&&e.status==="ready"&&content.contentVersionId===old.contentVersionId&&content.contentSha256===old.contentSha256&&policy.sourcePublicationId===old.sourcePublicationId&&policy.policySha256===old.policySha256&&policy.billingUnit===old.billingUnit&&policy.categories.length===7&&policy.bookingGranted===false&&policy.paymentGranted===false,"SOURCE18_PROPERTY_OR_PRICE_PUBLICATION_CHANGED");
   try{
    await page.waitForFunction(expected=>document.querySelector("#property-title")?.innerText.trim()===expected,expectedDisplayName,{timeout:15000});
   }catch{
    out.propertyTitleEvidence.push({width,propertyId:pid,expectedDisplayName,officialName:content.canonicalName,actualTitle:(await page.locator("#property-title").innerText()).trim().slice(0,240),rawTitle:(await page.locator("#property-title").textContent()||"").trim().slice(0,240)});save();
    throw Error("ORIGINAL_VISIBLE_PROPERTY_NAME_REQUIRED");
   }
   need((await page.locator("#property-title").innerText()).trim()===expectedDisplayName,"ORIGINAL_VISIBLE_PROPERTY_NAME_REQUIRED");
   const heroImages=page.locator('button[aria-label*="image gallery at image"] img');need(await heroImages.count()>0,"REAL_PROPERTY_HERO_IMAGES_REQUIRED");
   const heroes=[];
   for(let i=0;i<Math.min(await heroImages.count(),3);i++){
    const d=await decode(heroImages.nth(i)),u=new URL(d.src),item=content.media.find(m=>m.url===u.pathname);
    need(item&&d.width>0&&d.height>0,"HERO_BOUND_TO_ORIGINAL_PROPERTY_MEDIA");
    heroes.push({assetId:item.assetId,...d});
   }
   out.sourceVersions.push({width,propertyId:pid,contentVersionId:content.contentVersionId,contentSha256:content.contentSha256,sourcePublicationId:policy.sourcePublicationId,policySha256:policy.policySha256});
   await page.evaluate(()=>window.scrollTo(0,0));await screen(page,"property-"+kind,width,{heroes});
  }
  await goto(page,"/en/search?guests=2&children=0&pets=0&date_mode=any");
  await page.waitForFunction(()=>!document.body.innerText.includes("Loading hotel details…"),{},{timeout:15000});
  const cards=page.locator('a[aria-label^="View "][href*="/hospitality/"]');
  need(await cards.count()===2,"TWO_REAL_SEARCH_PROPERTY_CARDS_REQUIRED");
  const searchImages=page.locator('[data-search-media$="search_card_primary"] img'),searchDecoded=[];
  need(await searchImages.count()===2,"TWO_REAL_SEARCH_CARD_IMAGES_REQUIRED");
  for(let i=0;i<2;i++){await searchImages.nth(i).scrollIntoViewIfNeeded();searchDecoded.push(await decode(searchImages.nth(i)));}
  await page.evaluate(()=>window.scrollTo(0,0));
  await screen(page,"search-initial",width,{searchDecoded});
  await click(page.getByRole("button",{name:"Filter",exact:true}),"open-original-filter");
  const dialog=page.getByRole("dialog",{name:"Property filters"});await dialog.waitFor({state:"visible"});
  const checkbox=dialog.locator('input[type="checkbox"]:enabled').first(),label=(await checkbox.locator("..").innerText()).trim();
  await click(checkbox,"choose-original-filter-"+label);
  await click(dialog.getByRole("button",{name:/^Show \d+ properties$/}),"apply-original-filter");
  await page.waitForFunction(label=>[...new URL(location.href).searchParams.getAll("attribute"),...new URL(location.href).searchParams.getAll("type")].includes(label),label,{timeout:8000});
  await click(page.getByRole("button",{name:"List",exact:true}),"original-list-view");
  const sort=page.locator('select:has(option[value="price_asc"])');need(await sort.count()===1,"ONE_ORIGINAL_SORT_SELECT_REQUIRED");
  out.actions.push({label:"sort-original-price-ascending",before:await sort.evaluate(e=>({tag:e.tagName,value:e.value,options:[...e.options].map(o=>o.value)}))});
  await sort.selectOption("price_asc");
  await page.waitForFunction(()=>new URL(location.href).searchParams.get("view")==="list"&&new URL(location.href).searchParams.get("sort")==="price_asc");
  const query=new URL(page.url()).search;await page.reload({waitUntil:"domcontentloaded",timeout:30000});
  need(new URL(page.url()).search===query,"ORIGINAL_QUERY_STATE_NOT_PRESERVED_ON_RELOAD");
  need(await page.getByRole("button",{name:"List",exact:true}).getAttribute("aria-pressed")==="true"&&await sort.inputValue()==="price_asc","ORIGINAL_QUERY_CONTROLS_NOT_RESTORED");
  await screen(page,"search-filter-query-restored",width,{filterLabel:label,query});
  const account=page.locator('header a[href="/account"]').first();await click(account,"original-account-navigation");
  await page.waitForURL(u=>["/account","/en/account"].includes(u.pathname),{timeout:15000});
  await page.locator("main").waitFor({state:"visible"});
  const memberLinks=await page.locator('main a[href^="https://member.crays.world/"]').evaluateAll(links=>links.map(a=>({label:a.textContent.trim(),href:a.href})));
  need(memberLinks.some(x=>x.href==="https://member.crays.world/auth/login"),"ORIGINAL_MEMBER_LOGIN_DESTINATION_REQUIRED");
  await screen(page,"original-account-entry",width,{memberLinks,authenticationAttempted:false});
  await ctx.close();ctx=null;
 }
 need(!out.writes.length&&!out.unexpectedVariants.length&&!out.pageErrors.length&&!out.assetErrors.length&&!out.bridgeErrors.length,"NATIVE_UI_ERRORS_REQUIRE_REVIEW");
 need(out.api5xxCount===0,"ORIGINAL_CLUB_API_5XX_REQUIRES_ROOT_REVIEW");
 out.status="CLUB_REMAINING_DESKTOP_FULL_MOBILE_PASS_PRIOR05_REUSED_VISUAL_REVIEW_PENDING";
}catch(e){out.status="CLUB_POSTBIND_BROWSER_STOP_NO_REPLAY";out.error={name:e.name,message:e.message.slice(0,220)};if(/crash/i.test(e.message||"")){try{
 const tmp=fs.statfsSync("/tmp");
 out.crashResources={tmp:{blockSize:Number(tmp.bsize),blocks:Number(tmp.blocks),freeBlocks:Number(tmp.bfree),availableBlocks:Number(tmp.bavail),availableBytes:Number(tmp.bavail)*Number(tmp.bsize)},ownMemory:{}};
 for(const name of ["memory.current","memory.peak"]){
  try{const value=fs.readFileSync("/sys/fs/cgroup/"+name,"utf8");if(value.length<=64&&/^\d+\s*$/.test(value))out.crashResources.ownMemory[name]=Number(value.trim());}catch{}
 }
 try{
  const value=fs.readFileSync("/sys/fs/cgroup/memory.events","utf8");
  if(value.length<=4096){const events={};for(const line of value.trim().split("\n")){const [key,count]=line.trim().split(/\s+/);if(["low","high","max","oom","oom_kill","oom_group_kill"].includes(key)&&/^\d+$/.test(count||""))events[key]=Number(count);}out.crashResources.ownMemory.events=events;}
 }catch{}
}catch{}
}process.exitCode=1;}
finally{if(ctx)await ctx.close();if(browser)await browser.close();fs.writeFileSync(P+"/BROWSER_ACTUAL.json",JSON.stringify(out,null,2)+"\n");save();}})();
