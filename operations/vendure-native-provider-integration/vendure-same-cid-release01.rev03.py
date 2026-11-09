"""SOURCE ONLY. One necessary same-CID Vendure private asset activation.
Root dispatcher must first have FULL physical Root46 return and an admitted bounded slot.
No native activity is authorized by source-only staging. No new image/container/mount/stack.
"""
import os, stat, json, re, hashlib, pathlib, subprocess, signal, sys, time
BUNDLE = '{"ctor":"\'use strict\';\\nconst deadline=setTimeout(()=>{process.stdout.write(JSON.stringify({status:\'CTOR_PROBE_HOLD\',timedOut:true}));process.exit(3);},15000);\\n(async()=>{\\n const fs=require(\'node:fs\'),vm=require(\'node:vm\'),M=require(\'node:module\');\\n const input=fs.readFileSync(0,\'utf8\');\\n if(Buffer.byteLength(input)>32768)throw Error(\'INPUT_CAP\');\\n const data=JSON.parse(input),crypto=require(\'node:crypto\');\\n if(typeof data.source!==\'string\'||Buffer.byteLength(data.source)!==data.bytes||crypto.createHash(\'sha256\').update(data.source).digest(\'hex\')!==data.sha256)throw Error(\'SOURCE_PIN\');\\n const directory=fs.statSync(\'/run/crays\',{bigint:true});\\n if(!directory.isDirectory()||String(directory.dev)!==String(data.configDev)||String(directory.ino)!==String(data.configInode))throw Error(\'CONFIG_BIND_INODE_PARITY\');\\n const oldWrapper=fs.readFileSync(\'/run/crays/runtime.cjs\');\\n if(oldWrapper.length!==1120||crypto.createHash(\'sha256\').update(oldWrapper).digest(\'hex\')!==\'ce9c30602f387d1dbcaf101621914e6a95e99c2f3a21b5edaaa6b66303665809\')throw Error(\'ORIGINAL_WRAPPER_PIN\');\\n const appRequire=M.createRequire(\'/app/dist/index.js\');\\n const native=appRequire(\'@vendure/core\'),constants=appRequire(\'@nestjs/common/constants\');\\n if(typeof native.ConfigService!==\'function\'||typeof native.TransactionalConnection!==\'function\')throw Error(\'NATIVE_CONSTRUCTORS\');\\n const local={exports:{},paths:[]};\\n // Same CommonJS arguments, app-pinned dependency lookup, no bootstrap/server construction.\\n vm.compileFunction(data.source,[\'exports\',\'require\',\'module\',\'__filename\',\'__dirname\'],{filename:\'/run/crays/original-asset-delivery-controller.cjs\'})(local.exports,appRequire,local,\'/run/crays/original-asset-delivery-controller.cjs\',\'/run/crays\');\\n const Plugin=local.exports.OriginalAssetDeliveryPlugin;\\n const controllers=Reflect.getMetadata(constants.MODULE_METADATA.CONTROLLERS,Plugin);\\n if(typeof Plugin!==\'function\'||!Array.isArray(controllers)||controllers.length!==1)throw Error(\'PLUGIN_METADATA\');\\n const args=Reflect.getMetadata(\'design:paramtypes\',controllers[0]);\\n if(!Array.isArray(args)||args.length!==2||args[0]!==native.TransactionalConnection||args[1]!==native.ConfigService)throw Error(\'NATIVE_DI_IDENTITY\');\\n clearTimeout(deadline);\\n process.stdout.write(JSON.stringify({status:\'NATIVE_CTOR_EXPORT_DI_PASS\',pluginExport:true,nativeConfigService:true,nativeTransactionalConnection:true,controllerMetadata:true,designParamTypesExact:true,configDirectoryParity:true,originalWrapperSourcePin:true,noBootstrap:true,noHTTP:true,noDB:true}));\\n})().catch(()=>{clearTimeout(deadline);process.stdout.write(JSON.stringify({status:\'CTOR_PROBE_HOLD\',rawErrorExported:false}));process.exitCode=3;});\\n","module":"\\"use strict\\";\\nmodule.paths.unshift(\'/app/node_modules\');\\nvar __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {\\n    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;\\n    if (typeof Reflect === \\"object\\" && typeof Reflect.decorate === \\"function\\") r = Reflect.decorate(decorators, target, key, desc);\\n    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;\\n    return c > 3 && r && Object.defineProperty(target, key, r), r;\\n};\\nvar __metadata = (this && this.__metadata) || function (k, v) {\\n    if (typeof Reflect === \\"object\\" && typeof Reflect.metadata === \\"function\\") return Reflect.metadata(k, v);\\n};\\nvar __param = (this && this.__param) || function (paramIndex, decorator) {\\n    return function (target, key) { decorator(target, key, paramIndex); }\\n};\\nvar _a, _b, _c, _d;\\nObject.defineProperty(exports, \\"__esModule\\", { value: true });\\nexports.OriginalAssetDeliveryPlugin = void 0;\\n// SOURCE ONLY. Necessary private provider transport; no new BFF/SaaS product endpoint.\\n// Requires Root-qualified current source/image, preserved assets bind, native bearer session,\\n// original ReadCatalog/ReadAsset permission and actual Asset-to-context-channel association.\\n// Native provider flow is separate from any SaaS/end-customer authority claim.\\nconst common_1 = require(\\"@nestjs/common\\");\\nconst core_1 = require(\\"@vendure/core\\");\\nlet OriginalAssetDeliveryController = class OriginalAssetDeliveryController {\\n    constructor(connection, config) {\\n        this.connection = connection;\\n        this.config = config;\\n    }\\n    get(ctx, filename, req, res) {\\n        return this.deliver(ctx, filename, req, res, false);\\n    }\\n    head(ctx, filename, req, res) {\\n        return this.deliver(ctx, filename, req, res, true);\\n    }\\n    async deliver(ctx, filename, req, res, head) {\\n        res.setHeader(\'Cache-Control\', \'private, no-store\');\\n        res.setHeader(\'X-Content-Type-Options\', \'nosniff\');\\n        const deny = () => res.status(404).end();\\n        // Recheck native channel permission even if a deployment accidentally disabled AuthGuard.\\n        if (this.config.authOptions.disableAuth ||\\n            !ctx.activeUserId ||\\n            !ctx.userHasPermissions([core_1.Permission.ReadCatalog, core_1.Permission.ReadAsset]) ||\\n            !/^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/.test(filename) ||\\n            req.originalUrl.includes(\'?\') ||\\n            Object.keys(req.query ?? {}).length !== 0)\\n            return deny();\\n        try {\\n            // Use the original context-aware repository; no rawConnection/admin context shortcut.\\n            const matches = await this.connection.getRepository(ctx, core_1.Asset)\\n                .createQueryBuilder(\'asset\')\\n                .innerJoin(\'asset.channels\', \'assetChannel\', \'assetChannel.id = :channelId\', { channelId: ctx.channelId })\\n                .where(\'(asset.source = :filename OR asset.preview = :filename)\', { filename })\\n                .take(1).getMany();\\n            if (matches.length === 0)\\n                return deny();\\n            const asset = matches[0];\\n            if (![\'image/avif\', \'image/jpeg\', \'image/png\', \'image/webp\'].includes(asset.mimeType))\\n                return deny();\\n            // Original flat strategy, original file bytes, no stock transform/fallback/static redirect.\\n            const bytes = await this.config.assetOptions.assetStorageStrategy.readFileToBuffer(filename);\\n            // Response acceptance cap only: original readFileToBuffer allocates BEFORE this check.\\n            if (!Buffer.isBuffer(bytes) || bytes.length > 52428800)\\n                return deny();\\n            res.status(200);\\n            res.setHeader(\'Content-Type\', asset.mimeType);\\n            res.setHeader(\'Content-Length\', String(bytes.length));\\n            return (head || req.method === \'HEAD\') ? res.end() : res.end(bytes);\\n        }\\n        catch (_) {\\n            // No native exception/body/credential/path logging from this derivative handler.\\n            return deny();\\n        }\\n    }\\n};\\n__decorate([\\n    (0, common_1.Get)(\':filename\'),\\n    (0, core_1.Allow)(core_1.Permission.ReadCatalog, core_1.Permission.ReadAsset),\\n    __param(0, (0, core_1.Ctx)()),\\n    __param(1, (0, common_1.Param)(\'filename\')),\\n    __param(2, (0, common_1.Req)()),\\n    __param(3, (0, common_1.Res)()),\\n    __metadata(\\"design:type\\", Function),\\n    __metadata(\\"design:paramtypes\\", [typeof (_c = typeof core_1.RequestContext !== \\"undefined\\" && core_1.RequestContext) === \\"function\\" ? _c : Object, String, Object, Object]),\\n    __metadata(\\"design:returntype\\", void 0)\\n], OriginalAssetDeliveryController.prototype, \\"get\\", null);\\n__decorate([\\n    (0, common_1.Head)(\':filename\'),\\n    (0, core_1.Allow)(core_1.Permission.ReadCatalog, core_1.Permission.ReadAsset),\\n    __param(0, (0, core_1.Ctx)()),\\n    __param(1, (0, common_1.Param)(\'filename\')),\\n    __param(2, (0, common_1.Req)()),\\n    __param(3, (0, common_1.Res)()),\\n    __metadata(\\"design:type\\", Function),\\n    __metadata(\\"design:paramtypes\\", [typeof (_d = typeof core_1.RequestContext !== \\"undefined\\" && core_1.RequestContext) === \\"function\\" ? _d : Object, String, Object, Object]),\\n    __metadata(\\"design:returntype\\", void 0)\\n], OriginalAssetDeliveryController.prototype, \\"head\\", null);\\nOriginalAssetDeliveryController = __decorate([\\n    (0, common_1.Controller)(\'task-assets\'),\\n    __metadata(\\"design:paramtypes\\", [typeof (_a = typeof core_1.TransactionalConnection !== \\"undefined\\" && core_1.TransactionalConnection) === \\"function\\" ? _a : Object, typeof (_b = typeof core_1.ConfigService !== \\"undefined\\" && core_1.ConfigService) === \\"function\\" ? _b : Object])\\n], OriginalAssetDeliveryController);\\nlet OriginalAssetDeliveryPlugin = class OriginalAssetDeliveryPlugin {\\n};\\nexports.OriginalAssetDeliveryPlugin = OriginalAssetDeliveryPlugin;\\nexports.OriginalAssetDeliveryPlugin = OriginalAssetDeliveryPlugin = __decorate([\\n    (0, core_1.VendurePlugin)({\\n        imports: [core_1.PluginCommonModule],\\n        controllers: [OriginalAssetDeliveryController],\\n    })\\n], OriginalAssetDeliveryPlugin);\\n","new":"\'use strict\';\\nconst fs=require(\'node:fs\');\\nconst launch=JSON.parse(fs.readFileSync(\'/run/crays/original-launch.json\',\'utf8\'));\\nif(launch.Id!==\'c7fc469dc0b58a43cecbc82b1ff9da5685d2fcc2a3e506d939b7f7a03728ef4f\')throw Error(\'ORIGINAL_LAUNCH_ID_REQUIRED\');\\nfor(const item of launch.Config.Env){const i=item.indexOf(\'=\');if(i>0)process.env[item.slice(0,i)]=item.slice(i+1);}\\nprocess.env.DB_HOST=\'crays-prod-postgres-20261106-01.cpewggqg89tp.eu-central-2.rds.amazonaws.com\';\\nprocess.env.DB_PORT=\'5432\';process.env.DB_NAME=\'crays_business_vendure\';process.env.API_HOSTNAME=\'0.0.0.0\';\\nconst {config}=require(\'/app/dist/config.js\');\\nif(config.dbConnectionOptions.synchronize!==false||config.dbConnectionOptions.username!==\'crays_vendure\'||config.dbConnectionOptions.database!==\'crays_business_vendure\')throw Error(\'ORIGINAL_SCOPED_NATIVE_CONFIGURATION_REQUIRED\');\\nconfig.dbConnectionOptions.ssl={ca:fs.readFileSync(\'/run/crays/rds-ca.pem\',\'utf8\'),rejectUnauthorized:true,servername:process.env.DB_HOST};\\n// Configure the original module before its original index requires it from the module cache.\\n// Necessary AWS-private original asset transport only; native permission/channel guards stay native.\\nconst {OriginalAssetDeliveryPlugin}=require(\'/run/crays/original-asset-delivery-controller.cjs\');\\nif(typeof OriginalAssetDeliveryPlugin!==\'function\'||!Array.isArray(config.plugins)||config.plugins.some(p=>p&&p.name===\'OriginalAssetDeliveryPlugin\'))throw Error(\'ORIGINAL_ASSET_PLUGIN_REGISTRATION_REQUIRED\');\\nconfig.plugins.push(OriginalAssetDeliveryPlugin);\\nconst originalAssetStorage=config.assetOptions.assetStorageStrategy;\\nif(!originalAssetStorage||typeof originalAssetStorage.toAbsoluteUrl!==\'function\')throw Error(\'ORIGINAL_ASSET_STORAGE_REQUIRED\');\\nconst privateAssetUrl=(request,name)=>{\\n  const legacy=originalAssetStorage.toAbsoluteUrl(request,name);\\n  const prefix=\'http://127.0.0.1:42516/task-assets/\';\\n  if(typeof legacy!==\'string\'||!legacy.startsWith(prefix))throw Error(\'ORIGINAL_ASSET_URL_CONTRACT_REQUIRED\');\\n  const filename=decodeURIComponent(legacy.slice(prefix.length));\\n  if(!/^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/.test(filename)||legacy!==prefix+encodeURIComponent(filename))throw Error(\'ORIGINAL_ASSET_URL_CONTRACT_REQUIRED\');\\n  return \'http://172.27.0.2:3000/task-assets/\'+encodeURIComponent(filename);\\n};\\nconfig.assetOptions.assetStorageStrategy=new Proxy(originalAssetStorage,{get(target,key){\\n  if(key===\'toAbsoluteUrl\')return privateAssetUrl;\\n  const value=Reflect.get(target,key,target);\\n  return typeof value===\'function\'?value.bind(target):value;\\n}});\\nrequire(\'/app/dist/index.js\');\\n","old":"\'use strict\';\\nconst fs=require(\'node:fs\');\\nconst launch=JSON.parse(fs.readFileSync(\'/run/crays/original-launch.json\',\'utf8\'));\\nif(launch.Id!==\'c7fc469dc0b58a43cecbc82b1ff9da5685d2fcc2a3e506d939b7f7a03728ef4f\')throw Error(\'ORIGINAL_LAUNCH_ID_REQUIRED\');\\nfor(const item of launch.Config.Env){const i=item.indexOf(\'=\');if(i>0)process.env[item.slice(0,i)]=item.slice(i+1);}\\nprocess.env.DB_HOST=\'crays-prod-postgres-20261106-01.cpewggqg89tp.eu-central-2.rds.amazonaws.com\';\\nprocess.env.DB_PORT=\'5432\';process.env.DB_NAME=\'crays_business_vendure\';process.env.API_HOSTNAME=\'0.0.0.0\';\\nconst {config}=require(\'/app/dist/config.js\');\\nif(config.dbConnectionOptions.synchronize!==false||config.dbConnectionOptions.username!==\'crays_vendure\'||config.dbConnectionOptions.database!==\'crays_business_vendure\')throw Error(\'ORIGINAL_SCOPED_NATIVE_CONFIGURATION_REQUIRED\');\\nconfig.dbConnectionOptions.ssl={ca:fs.readFileSync(\'/run/crays/rds-ca.pem\',\'utf8\'),rejectUnauthorized:true,servername:process.env.DB_HOST};\\n// Configure the original module before its original index requires it from the module cache.\\nrequire(\'/app/dist/index.js\');\\n","verify":"\'use strict\';\\nconst fs=require(\'node:fs\'),crypto=require(\'node:crypto\');\\nlet token=null,credentialFD=null,fileFD=null;\\nlet out={status:\'NATIVE_ASSET_FLOW_HOLD\',nativeAdminLogin:false,nativeAssetRead:false,graphQLPrivateURL:false,getExactOriginalBytes:false,headExactNoBody:false,anonymousDenied:false,ownedLogout:false,ownedLogoutTokenDenied:false,originalFileStable:false,nativeProductCount:null,privateValuesExported:false,bodySHAExported:false,coredumpDisabled:false,automaticRetry:false};\\nconst hard=setTimeout(()=>{process.stdout.write(JSON.stringify({...out,status:\'NATIVE_ASSET_FLOW_DEADLINE_UNKNOWN\',ownedLogoutUncertain:!!token}));process.exit(3);},80000);\\nfunction need(x){if(!x)throw Error(\'NATIVE_ASSET_FLOW_HOLD\');}\\nfunction ident(s){return [\'dev\',\'ino\',\'mode\',\'uid\',\'gid\',\'nlink\',\'size\',\'mtimeNs\',\'ctimeNs\'].map(k=>String(s[k])).join(\'|\');}\\nasync function capped(response,cap){\\n const reader=response.body?.getReader();if(!reader)return Buffer.alloc(0);\\n const chunks=[];let n=0;\\n try{while(true){const x=await reader.read();if(x.done)break;n+=x.value.byteLength;if(n>cap){await reader.cancel();throw Error(\'BODY_CAP\');}chunks.push(Buffer.from(x.value));}return Buffer.concat(chunks,n);}\\n finally{reader.releaseLock();}\\n}\\nasync function gql(query,variables,session,ownsLogin=false){\\n const response=await fetch(\'http://127.0.0.1:3000/admin-api\',{method:\'POST\',redirect:\'manual\',signal:AbortSignal.timeout(5000),headers:{\'content-type\':\'application/json\',...(session?{authorization:\'Bearer \'+session}:{})},body:JSON.stringify({query,variables:variables??{}})});\\n if(ownsLogin){const owned=response.headers.get(\'vendure-auth-token\');if(typeof owned===\'string\'&&owned.length>0)token=owned;}\\n const bytes=await capped(response,65536);const body=JSON.parse(bytes.toString(\'utf8\'));\\n return {status:response.status,body,session:response.headers.get(\'vendure-auth-token\')};\\n}\\nasync function logout(){\\n if(!token)return;\\n let succeeded=false;\\n try{\\n  const result=await gql(\'mutation { logout { success } }\',{},token);\\n  succeeded=result.body?.data?.logout?.success===true&&!result.body?.errors?.length;\\n  out.ownedLogout=succeeded;\\n  if(succeeded&&out.graphQLPrivateURL){\\n   const response=await fetch(assetURL,{method:\'GET\',redirect:\'manual\',signal:AbortSignal.timeout(5000),headers:{authorization:\'Bearer \'+token}});\\n   await capped(response,16384);\\n   out.ownedLogoutTokenDenied=[401,403,404].includes(response.status);\\n  }\\n }finally{if(succeeded)token=null;}\\n}\\nlet assetURL=null,original=null,fileBefore=null,credentialBefore=null;\\n(async()=>{\\n // Bounded readiness GET only; no repeated login/session mutation.\\n const readyUntil=Date.now()+25000;let ready=false;\\n while(Date.now()<readyUntil){\\n  try{const r=await fetch(\'http://127.0.0.1:3000/admin-api\',{redirect:\'manual\',signal:AbortSignal.timeout(1000)});await capped(r,16384);ready=r.status>=100&&r.status<600;}catch(_){}\\n  if(ready)break;await new Promise(r=>setTimeout(r,250));\\n }\\n need(ready);\\n need(/^Max core file size\\\\s+0\\\\s+0\\\\s+bytes$/m.test(fs.readFileSync(\'/proc/self/limits\',\'utf8\')));\\n out.coredumpDisabled=true;\\n credentialFD=fs.openSync(\'/run/crays/original-launch.json\',fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);\\n credentialBefore=fs.fstatSync(credentialFD,{bigint:true});\\n need(credentialBefore.isFile()&&credentialBefore.uid===0n&&credentialBefore.gid===1000n&&credentialBefore.nlink===1n&&credentialBefore.size<=1048576n&&(credentialBefore.mode&0o777n)===0o440n);\\n const launch=JSON.parse(fs.readFileSync(credentialFD,\'utf8\'));\\n need(Array.isArray(launch.Config?.Env));\\n let username=null,password=null;\\n for(const item of launch.Config.Env){\\n  if(typeof item!==\'string\')continue;const pos=item.indexOf(\'=\');\\n  if(pos<=0)continue;const key=item.slice(0,pos);\\n  if(key===\'SUPERADMIN_USERNAME\')username=item.slice(pos+1);\\n  if(key===\'SUPERADMIN_PASSWORD\')password=item.slice(pos+1);\\n }\\n need(typeof username===\'string\'&&username.length>0&&typeof password===\'string\'&&password.length>0);\\n const logged=await gql(\'mutation Login($username:String!,$password:String!){login(username:$username,password:$password){__typename ... on CurrentUser { id }}}\',{username,password},null,true);\\n username=null;password=null;\\n need(logged.body?.data?.login?.__typename===\'CurrentUser\'&&typeof logged.session===\'string\'&&logged.session.length>0&&!logged.body?.errors?.length);\\n logged.session=null;out.nativeAdminLogin=true;\\n const metadata=await gql(\'query { asset(id:\\"1\\"){source preview mimeType fileSize} products(options:{take:1}){totalItems} }\',{},token);\\n const asset=metadata.body?.data?.asset;\\n need(!metadata.body?.errors?.length&&asset&&asset.fileSize===1645539&&metadata.body.data.products?.totalItems===115);\\n out.nativeAssetRead=true;out.nativeProductCount=115;\\n const prefix=\'http://172.27.0.2:3000/task-assets/\';\\n need(typeof asset.source===\'string\'&&asset.source.startsWith(prefix));\\n const filename=decodeURIComponent(asset.source.slice(prefix.length));\\n need(/^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/.test(filename)&&asset.source===prefix+encodeURIComponent(filename));\\n assetURL=asset.source;out.graphQLPrivateURL=true;\\n const originalPath=\'/srv/crays/runtimes/xl-member-providers-vendure/assets/\'+filename;\\n fileFD=fs.openSync(originalPath,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);\\n fileBefore=fs.fstatSync(fileFD,{bigint:true});need(fileBefore.isFile()&&fileBefore.nlink===1n&&fileBefore.size===1645539n);\\n original=fs.readFileSync(fileFD);need(original.length===1645539);\\n const originalSHA=crypto.createHash(\'sha256\').update(original).digest(\'hex\');\\n const get=await fetch(assetURL,{method:\'GET\',redirect:\'manual\',signal:AbortSignal.timeout(5000),headers:{authorization:\'Bearer \'+token}});\\n const getBytes=await capped(get,5*1024*1024);\\n out.getExactOriginalBytes=get.status===200&&getBytes.length===original.length&&crypto.createHash(\'sha256\').update(getBytes).digest(\'hex\')===originalSHA&&get.headers.get(\'content-type\')?.split(\';\')[0]===asset.mimeType;\\n need(out.getExactOriginalBytes);\\n const head=await fetch(assetURL,{method:\'HEAD\',redirect:\'manual\',signal:AbortSignal.timeout(5000),headers:{authorization:\'Bearer \'+token}});\\n const headBytes=await capped(head,1);\\n out.headExactNoBody=head.status===200&&headBytes.length===0&&Number(head.headers.get(\'content-length\'))===original.length&&head.headers.get(\'content-type\')?.split(\';\')[0]===asset.mimeType;\\n need(out.headExactNoBody);\\n const anonymous=await fetch(assetURL,{method:\'GET\',redirect:\'manual\',signal:AbortSignal.timeout(5000)});\\n await capped(anonymous,16384);out.anonymousDenied=[401,403,404].includes(anonymous.status);need(out.anonymousDenied);\\n need(ident(fs.fstatSync(fileFD,{bigint:true}))===ident(fileBefore)&&ident(fs.statSync(originalPath,{bigint:true}))===ident(fileBefore));\\n need(ident(fs.fstatSync(credentialFD,{bigint:true}))===ident(credentialBefore)&&ident(fs.statSync(\'/run/crays/original-launch.json\',{bigint:true}))===ident(credentialBefore));\\n out.originalFileStable=true;\\n})().catch(()=>{}).finally(async()=>{\\n try{await logout();}catch(_){}\\n if(fileFD!==null)try{fs.closeSync(fileFD);}catch(_){}\\n if(credentialFD!==null)try{fs.closeSync(credentialFD);}catch(_){}\\n original=null;\\n const pass=out.nativeAdminLogin&&out.nativeAssetRead&&out.graphQLPrivateURL&&out.getExactOriginalBytes&&out.headExactNoBody&&out.anonymousDenied&&out.ownedLogout&&out.ownedLogoutTokenDenied&&out.originalFileStable;\\n out.status=pass?\'ORIGINAL_NATIVE_ASSET_DELIVERY_PASS\':\'NATIVE_ASSET_FLOW_HOLD\';\\n out.ownedLogoutUncertain=!!token;\\n clearTimeout(hard);process.stdout.write(JSON.stringify(out));if(!pass)process.exitCode=3;\\n});\\n"}'
BUNDLE=json.loads(BUNDLE)
CID="f9a875d3ac7e951f565897ccd86edbdc0f2f0384c304c73e327d0f1fb227fff5"
IMG="sha256:9457391d8a9ef2b6ed442c152c7c6ee95e3f94d6cb5239c67d75641b356fa813"
GUEST="i-0eb300e1b02414d8f"
FAMILY="/srv/crays/runtime/business-vendure-20261108-01"
CONFIG=FAMILY+"/family02/config"
RELEASE="/srv/crays/migration-work/20261108/business/vendure-native-assets-release01"
NET="crays-business-vendure-private-20261108-02"
IP="172.27.0.2"
OLD_PID=941924
OLD_TICKS=24074929
ENV={"PATH":"/usr/sbin:/usr/bin:/sbin:/bin","DOCKER_HOST":"unix:///var/run/docker.sock","LANG":"C"}
HARD=165
phase="ADMISSION";restart_sent=False;wrapper_published=False;release_fd=None
def need(x,code):
    if not x:raise RuntimeError(code)
def sha(b):return hashlib.sha256(b).hexdigest()
def ident(s):
    return (s.st_dev,s.st_ino,s.st_mode,s.st_uid,s.st_gid,s.st_nlink,s.st_size,s.st_mtime_ns,s.st_ctime_ns)
def dirident(s):return (s.st_dev,s.st_ino,s.st_mode,s.st_uid,s.st_gid)
def deadline(_sig,_frame):raise RuntimeError("DEADLINE_UNKNOWN_NO_REPLAY")
signal.signal(signal.SIGALRM,deadline);signal.alarm(HARD)
def held(path,leaf=False):
    need(path.startswith("/") and all(x not in ("",".","..")for x in path[1:].split("/")),"EXACT_ABSOLUTE_PATH")
    chain=[];fd=None
    try:
        root=os.open("/",os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW|os.O_NOATIME)
        chain.append((root,os.fstat(root),None,None))
        parts=path[1:].split("/")
        walk=parts[:-1]if leaf else parts
        for part in walk:
            p=chain[-1][0];n=os.open(part,os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW|os.O_NOATIME,dir_fd=p);s=os.fstat(n)
            need(s.st_uid==0 and not(s.st_mode&0o022),"ROOT_DIRECTORY_CUSTODY")
            chain.append((n,s,p,part))
        if leaf:
            fd=os.open(parts[-1],os.O_RDONLY|os.O_NOFOLLOW|os.O_NOATIME,dir_fd=chain[-1][0]);s=os.fstat(fd)
            need(stat.S_ISREG(s.st_mode)and s.st_uid==0 and s.st_nlink==1 and not(s.st_mode&0o022),"ROOT_PUBLIC_FILE_CUSTODY")
            return {"chain":chain,"fd":fd,"stat":s,"name":parts[-1]}
        return {"chain":chain,"fd":chain[-1][0],"stat":chain[-1][1],"name":None}
    except BaseException:
        if fd is not None:os.close(fd)
        for n,_,_,_ in reversed(chain):os.close(n)
        raise
def checkheld(h,leaf_current=True):
    for fd,s,p,name in h["chain"]:
        need(dirident(os.fstat(fd))==dirident(s),"HELD_DIRECTORY_IDENTITY")
        if p is not None:need(dirident(os.stat(name,dir_fd=p,follow_symlinks=False))==dirident(s),"NAMED_DIRECTORY_IDENTITY")
    if h["name"]and leaf_current:
        need(ident(os.fstat(h["fd"]))==ident(h["stat"]),"HELD_PUBLIC_FILE_IDENTITY")
        need(ident(os.stat(h["name"],dir_fd=h["chain"][-1][0],follow_symlinks=False))==ident(h["stat"]),"NAMED_PUBLIC_FILE_IDENTITY")
def closeheld(h):
    if h["name"]:os.close(h["fd"])
    for fd,_,_,_ in reversed(h["chain"]):os.close(fd)
def read_public(h,cap):
    need(h["stat"].st_size<=cap,"PUBLIC_SOURCE_CAP")
    os.lseek(h["fd"],0,os.SEEK_SET);raw=b""
    while True:
        x=os.read(h["fd"],min(65536,cap+1-len(raw)))
        if not x:break
        raw+=x;need(len(raw)<=cap,"PUBLIC_SOURCE_CAP")
    checkheld(h);need(len(raw)==h["stat"].st_size,"PUBLIC_SOURCE_SIZE")
    return raw
def private_ref_metadata(cfgfd):
    # O_PATH only: Python never reads/hashes the protected launch body.
    fd=os.open("original-launch.json",os.O_PATH|os.O_NOFOLLOW,dir_fd=cfgfd)
    s=os.fstat(fd)
    need(stat.S_ISREG(s.st_mode)and s.st_uid==0 and s.st_gid==1000 and s.st_nlink==1 and stat.S_IMODE(s.st_mode)==0o440 and s.st_size<=1048576,"ORIGINAL_PRIVATE_REFERENCE_CUSTODY")
    return fd,s
def check_private(fd,s,cfgfd):
    need(ident(os.fstat(fd))==ident(s)and ident(os.stat("original-launch.json",dir_fd=cfgfd,follow_symlinks=False))==ident(s),"PROTECTED_ORIGINAL_REF_UNCHANGED")
def dock(args,timeout=6,body=None):
    q=subprocess.run(["/usr/bin/docker",*args],input=body,capture_output=True,timeout=timeout,check=False,env=ENV)
    need(len(q.stdout)<=262144 and len(q.stderr)<=65536,"OWN_DOCKER_OUTPUT_CAP")
    return q
def generation():
    fmt='{"id":{{json .Id}},"image":{{json .Image}},"lane":{{json (index .Config.Labels "crays.lane")}},"running":{{json .State.Running}},"restarting":{{json .State.Restarting}},"pid":{{json .State.Pid}},"startedAt":{{json .State.StartedAt}},"restartCount":{{json .RestartCount}},"ports":{{json .HostConfig.PortBindings}},"readOnlyRootfs":{{json .HostConfig.ReadonlyRootfs}},"logDriver":{{json .HostConfig.LogConfig.Type}},"memory":{{json .HostConfig.Memory}},"pidsLimit":{{json .HostConfig.PidsLimit}},"user":{{json .Config.User}},"networks":{{json .NetworkSettings.Networks}},"mounts":[{{range $i,$m := .Mounts}}{{if $i}},{{end}}{"type":{{json $m.Type}},"source":{{json $m.Source}},"destination":{{json $m.Destination}},"rw":{{json $m.RW}}}{{end}}]}'
    q=dock(["inspect","--format",fmt,CID]);need(q.returncode==0,"OWN_DOCKER_GENERATION")
    c=json.loads(q.stdout);need(c["id"]==CID and c["image"]==IMG and c["lane"]=="business-vendure-20261108","EXACT_OWN_FAMILY")
    need(c["running"]is True and c["restarting"]is False and type(c["pid"])is int and c["pid"]>0,"OWN_API_RUNNING")
    need(not c["ports"]and c["readOnlyRootfs"]is True and c["logDriver"]=="none"and c["user"]=="1000:1000","ORIGINAL_PRIVATE_RUNTIME_POLICY")
    need(c["memory"]==1073741824 and c["pidsLimit"]==128,"ORIGINAL_RESOURCE_BOUND")
    need(set(c["networks"])=={NET}and c["networks"][NET]["IPAddress"]==IP,"ORIGINAL_PRIVATE_NETWORK")
    mounts=c["mounts"];need(len(mounts)<=32,"MOUNT_CAP")
    cm=[m for m in mounts if m["destination"]=="/run/crays"]
    am=[m for m in mounts if m["destination"]=="/srv/crays/runtimes/xl-member-providers-vendure/assets"]
    need(len(cm)==1 and cm[0]=={"type":"bind","source":CONFIG,"destination":"/run/crays","rw":False},"ORIGINAL_WHOLE_CONFIG_DIRECTORY_BIND")
    need(len(am)==1 and am[0]["type"]=="bind"and am[0]["source"]==FAMILY+"/family02/original-files/assets","ORIGINAL_ASSETS_BIND")
    fd=os.open("/proc/"+str(c["pid"])+"/stat",os.O_RDONLY|os.O_NOFOLLOW)
    try:raw=os.read(fd,8193)
    finally:os.close(fd)
    need(len(raw)<=8192,"PROC_STAT_CAP");c["ticks"]=int(raw[raw.rfind(b")")+2:].split()[19])
    return c
def public_generation(c):
    return {"cid":c["id"],"image":c["image"],"pid":c["pid"],"startTicks":c["ticks"],"startedAt":c["startedAt"],"restartCount":c["restartCount"],"privateIP":IP,"network":NET}
def put(fd,name,raw,gid=0,mode=0o400):
    need("/"not in name and name not in ("",".",".."),"OWN_FILE_NAME")
    out=os.open(name,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,mode,dir_fd=fd)
    try:
        os.fchown(out,0,gid);os.fchmod(out,mode);pos=0
        while pos<len(raw):pos+=os.write(out,raw[pos:])
        os.fsync(out);need(os.fstat(out).st_size==len(raw),"OWN_WRITE_SIZE")
    finally:os.close(out)
    os.fsync(fd)
def record(name,obj):
    put(release_fd,name,json.dumps(obj,sort_keys=True,separators=(",",":")).encode())
def ensure_parent(path):
    # Exact own AWS namespace only; never chmod/chown an existing directory.
    need(path=="/srv/crays/migration-work/20261108/business","OWN_STAGE_PARENT")
    fd=os.open("/",os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW|os.O_NOATIME)
    try:
        for part in path[1:].split("/"):
            try:n=os.open(part,os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW|os.O_NOATIME,dir_fd=fd)
            except FileNotFoundError:
                os.mkdir(part,0o700,dir_fd=fd);os.fsync(fd);n=os.open(part,os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW|os.O_NOATIME,dir_fd=fd)
            s=os.fstat(n);need(s.st_uid==0 and not(s.st_mode&0o022),"OWN_STAGE_PARENT_CUSTODY");os.close(fd);fd=n
        return fd
    except BaseException:os.close(fd);raise
def storage():
    h=held("/srv/crays/incoming/guest-runtime-bootstrap-20261105-01/persistent_storage_guards.candidate.py",True)
    try:
        raw=read_public(h,8192);need(len(raw)==1992 and sha(raw)=="3efa226b84d375cf96f911c620b7dbefa814f0c54abb8fa61944d0aeb658c739","EXACT_EXISTING_STORAGE_GUARD")
        n={"__name__":"vendure_existing_storage_guard"};exec(compile(raw,"<existing-storage-guard>","exec"),n)
        proof=n["verify_data_mount"](pathlib.Path("/srv/crays"))
        need(proof["instanceId"]==GUEST and os.stat(FAMILY).st_dev==os.stat("/srv/crays").st_dev,"OWN_EBS_STORAGE")
    finally:closeheld(h)
def run_node(source,timeout,heap=96,body=None):
    # Shell changes only this new own probe's core limit; no source-file or global setting.
    command='ulimit -c 0 || exit 3; exec /usr/local/bin/node --max-old-space-size='+str(heap)+' -e "$1"'
    q=dock(["exec","-i",CID,"/bin/sh","-c",command,"own-vendure-probe",source],timeout,body)
    # Native stdout/stderr remain RAM. Only a parsed, closed schema may be released.
    try:j=json.loads(q.stdout)
    except BaseException:raise RuntimeError("NATIVE_NODE_CLOSED_RESULT_HOLD")
    need(q.returncode==0 and len(q.stderr)==0 and isinstance(j,dict),"NATIVE_NODE_STATUS_HOLD")
    return j
def admission():
    need(os.getuid()==0,"EXACT_ROOT_GUEST")
    fd=os.open("/sys/devices/virtual/dmi/id/board_asset_tag",os.O_RDONLY|os.O_NOFOLLOW)
    try:tag=os.read(fd,128).decode("ascii").strip()
    finally:os.close(fd)
    need(tag==GUEST,"EXACT_AWS_GUEST")
    need(re.fullmatch("[0-9a-f]{64}",globals().get("ROOT_SOURCE_SHA256",""))is not None,"ENVELOPE_SOURCE_PIN_REQUIRED")
    need(len(BUNDLE["old"].encode())==1120 and sha(BUNDLE["old"].encode())=="ce9c30602f387d1dbcaf101621914e6a95e99c2f3a21b5edaaa6b66303665809","PUBLIC_ORIGINAL_WRAPPER_PIN")
    need(len(BUNDLE["module"].encode())==6205 and sha(BUNDLE["module"].encode())=="93d6b67b19d8f44e0a549132b27b36193fcdf88b065aec38d3703c5f5440eaf2","PUBLIC_CJS_PIN")
    need(len(BUNDLE["new"].encode())==2604 and sha(BUNDLE["new"].encode())=="dba7a51867bca95da783bb26ae2aa918e5c93f7507c2239ce76477ec43634563","PUBLIC_DERIVATIVE_WRAPPER_PIN")
def apply():
    global release_fd,phase,restart_sent,wrapper_published
    admission();storage();before=generation()
    need(before["pid"]==OLD_PID and before["ticks"]==OLD_TICKS and before["restartCount"]==0,"FRESH_EXACT_ORIGINAL_GENERATION")
    cfg=held(CONFIG);old=held(CONFIG+"/runtime.cjs",True);private_fd=None
    try:
        cfgfd=cfg["fd"];cs=os.fstat(cfgfd)
        need(cs.st_uid==0 and cs.st_gid==1000 and stat.S_IMODE(cs.st_mode)==0o750,"ORIGINAL_CONFIG_DIRECTORY_CUSTODY")
        need(old["stat"].st_gid==1000 and stat.S_IMODE(old["stat"].st_mode)==0o440,"ORIGINAL_WRAPPER_MODE")
        need(read_public(old,8192)==BUNDLE["old"].encode(),"FRESH_ORIGINAL_WRAPPER_CAS_PIN")
        private_fd,private_stat=private_ref_metadata(cfgfd)
        parent=ensure_parent("/srv/crays/migration-work/20261108/business")
        try:
            os.mkdir("vendure-native-assets-release01",0o700,dir_fd=parent);os.fsync(parent)
            release_fd=os.open("vendure-native-assets-release01",os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW|os.O_NOATIME,dir_fd=parent)
        finally:os.close(parent)
        phase="PUBLIC_STAGE"
        record("APPLY_INTENT.json",{"sourceSHA256":ROOT_SOURCE_SHA256,"exactOwnContainer":CID,"sameImage":IMG,"oldGeneration":public_generation(before),"noReplay":True,"root46FullReturnAndBoundedSlotRequiredAtDispatch":True})
        for name,key in [("original-wrapper.backup.cjs","old"),("runtime.asset-release.cjs","new"),("original-asset-delivery-controller.cjs","module")]:put(release_fd,name,BUNDLE[key].encode())
        record("PUBLIC_STAGE_ACTUAL.json",{"outsideActiveConfigDirectory":True,"oldWrapperBackupPinned":True,"moduleSHA256":sha(BUNDLE["module"].encode()),"newWrapperSHA256":sha(BUNDLE["new"].encode()),"privateLaunchBodyRead":False})
        phase="CTOR_PREFLIGHT"
        data=json.dumps({"source":BUNDLE["module"],"bytes":6205,"sha256":sha(BUNDLE["module"].encode()),"configDev":cs.st_dev,"configInode":cs.st_ino},separators=(",",":")).encode()
        ctor=run_node(BUNDLE["ctor"],25,128,data)
        expected={"status":"NATIVE_CTOR_EXPORT_DI_PASS","pluginExport":True,"nativeConfigService":True,"nativeTransactionalConnection":True,"controllerMetadata":True,"designParamTypesExact":True,"configDirectoryParity":True,"originalWrapperSourcePin":True,"noBootstrap":True,"noHTTP":True,"noDB":True}
        need(ctor==expected,"EXACT_NATIVE_CTOR_DI_PROOF")
        record("CTOR_ACTUAL.json",ctor)
        checkheld(cfg);checkheld(old);check_private(private_fd,private_stat,cfgfd)
        need(generation()==before,"SAME_GENERATION_BEFORE_PUBLICATION")
        phase="ACTIVE_MODULE_PUBLICATION"
        put(cfgfd,"original-asset-delivery-controller.cjs",BUNDLE["module"].encode(),1000,0o440)
        # Directory bind makes atomic replacement visible; original private launch/CA/probe untouched.
        put(cfgfd,"runtime.asset-release01.pending.cjs",BUNDLE["new"].encode(),1000,0o440)
        checkheld(old);check_private(private_fd,private_stat,cfgfd);need(generation()==before,"SAME_GENERATION_BEFORE_WRAPPER_CAS")
        phase="WRAPPER_CAS"
        os.replace("runtime.asset-release01.pending.cjs","runtime.cjs",src_dir_fd=cfgfd,dst_dir_fd=cfgfd);os.fsync(cfgfd);wrapper_published=True
        record("WRAPPER_CAS_ACTUAL.json",{"oldWrapperBackupPinned":True,"newWrapperSHA256":sha(BUNDLE["new"].encode()),"moduleSHA256":sha(BUNDLE["module"].encode()),"originalPrivateReferenceUntouched":True})
        # An unexpected auto-restart after publication is uncertainty, never a second blind restart.
        need(generation()==before,"NO_UNEXPECTED_AUTOSTART_BEFORE_OWN_RESTART")
        phase="ONE_RESTART"
        record("RESTART_INTENT.json",{"exactContainer":CID,"restartCommandsPermitted":1,"noReplay":True})
        restart_sent=True
        q=dock(["restart","--time","20",CID],30);need(q.returncode==0 and q.stdout.strip().decode()==CID,"RESTART_OUTCOME_UNKNOWN_NO_REPLAY")
        phase="NATIVE_ASSET_VERIFY"
        native=run_node(BUNDLE["verify"],90,96)
        allowed={"status","nativeAdminLogin","nativeAssetRead","graphQLPrivateURL","getExactOriginalBytes","headExactNoBody","anonymousDenied","ownedLogout","ownedLogoutTokenDenied","originalFileStable","nativeProductCount","privateValuesExported","bodySHAExported","coredumpDisabled","automaticRetry","ownedLogoutUncertain"}
        need(set(native)==allowed and native["status"]=="ORIGINAL_NATIVE_ASSET_DELIVERY_PASS","EXACT_NATIVE_ASSET_FLOW")
        for key in ("nativeAdminLogin","nativeAssetRead","graphQLPrivateURL","getExactOriginalBytes","headExactNoBody","anonymousDenied","ownedLogout","ownedLogoutTokenDenied","originalFileStable","coredumpDisabled"):need(native[key]is True,"NATIVE_FLOW_POSTCONDITION")
        need(native["nativeProductCount"]==115 and native["privateValuesExported"]is False and native["bodySHAExported"]is False and native["automaticRetry"]is False and native["ownedLogoutUncertain"]is False,"NATIVE_FLOW_CLOSED_BOUNDARY")
        after=generation()
        need(after["pid"]!=before["pid"]and after["ticks"]!=before["ticks"]and after["restartCount"]==0,"ONE_NEW_NATIVE_GENERATION")
        check_private(private_fd,private_stat,cfgfd);checkheld(cfg)
        active=held(CONFIG+"/runtime.cjs",True);module=held(CONFIG+"/original-asset-delivery-controller.cjs",True)
        try:
            need(read_public(active,8192)==BUNDLE["new"].encode()and read_public(module,16384)==BUNDLE["module"].encode(),"EXACT_ACTIVE_RELEASE_BYTES")
        finally:closeheld(active);closeheld(module)
        out={"schema":"crays.vendure.same-cid-native-asset-release.actual.v1","status":"OWN_ORIGINAL_NATIVE_ASSET_RELEASE_PASS","sourceSHA256":ROOT_SOURCE_SHA256,"moduleSHA256":sha(BUNDLE["module"].encode()),"wrapperSHA256":sha(BUNDLE["new"].encode()),"before":public_generation(before),"after":public_generation(after),"nativeFlow":native,"sameCIDImageNetwork":True,"newMounts":False,"newContainer":False,"imageBuild":False,"privateLaunchChanged":False,"privateLaunchBodyReadByPython":False,"privateLaunchBodyHashed":False,"originalDBAssetRecordsMutatedByHandler":False,"originalStoragePreviewNamingRetained":True,"URLResponseOnlyTransportChanged":True,"restartCommandsSent":1,"xxlXlWrites":False,"awsPublicCodeWritten":True,"saasCustomerAcceptance":False,"heavySlotReturnRequiresCoordinatorPhysicalAdoption":True,"automaticReplay":False}
        record("FINAL_ACTUAL.json",out);phase="COMPLETE";print(json.dumps(out,sort_keys=True,separators=(",",":")))
    finally:
        if private_fd is not None:os.close(private_fd)
        closeheld(old);closeheld(cfg)
def reconcile():
    admission();c=generation()
    result={"schema":"crays.vendure.same-cid-native-asset-release.reconcile.v1","readOnly":True,"currentGeneration":public_generation(c),"wrapperEqualsOld":False,"wrapperEqualsNew":False,"moduleEqualsReviewed":False,"finalReceiptPresent":False,"nativeHTTPProbed":False,"automaticReplay":False}
    for path,key,candidate in [(CONFIG+"/runtime.cjs","wrapperEqualsOld",BUNDLE["old"]),(CONFIG+"/runtime.cjs","wrapperEqualsNew",BUNDLE["new"]),(CONFIG+"/original-asset-delivery-controller.cjs","moduleEqualsReviewed",BUNDLE["module"])]:
        try:
            h=held(path,True)
            try:result[key]=read_public(h,16384)==candidate.encode()
            finally:closeheld(h)
        except FileNotFoundError:pass
    try:
        h=held(RELEASE+"/FINAL_ACTUAL.json",True)
        try:r=json.loads(read_public(h,32768))
        finally:closeheld(h)
        result["finalReceiptPresent"]=True
        result["recordedNativePass"]=r.get("status")=="OWN_ORIGINAL_NATIVE_ASSET_RELEASE_PASS"
        result["recordedGenerationStillCurrent"]=r.get("after")==public_generation(c)
    except FileNotFoundError:pass
    print(json.dumps(result,sort_keys=True,separators=(",",":")))
try:
    need(len(sys.argv)==2 and sys.argv[1]in("apply","reconcile"),"ROOT_EXPLICIT_MODE")
    if sys.argv[1]=="apply":apply()
    else:reconcile()
except BaseException:
    out={"schema":"crays.vendure.same-cid-native-asset-release.actual.v1","status":"HOLD_UNKNOWN_NO_REPLAY","phase":phase,"wrapperPublished":wrapper_published,"restartCommandSent":restart_sent,"automaticReplay":False,"privateValuesExported":False,"managedNativeNodeOutcomeMayBeUnknown":phase in("CTOR_PREFLIGHT","NATIVE_ASSET_VERIFY"),"heavySlotReleased":False}
    if release_fd is not None:
        try:record("HOLD_ACTUAL.json",out)
        except BaseException:pass
    print(json.dumps(out,sort_keys=True,separators=(",",":")));sys.exit(3)
finally:
    if release_fd is not None:os.close(release_fd)
    signal.alarm(0)
