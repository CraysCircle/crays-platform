"""Root-only finite Member26 immutable release and coordinated family adoption.
Source25 is never rebuilt. No new identities, keys, DB/schema changes or external providers.
Only explicitly reviewed phase executes; every uncertain mutation is journalled, never replayed."""
from pathlib import Path
import os,stat,json,hashlib,runpy,subprocess,sys,time,copy,urllib.parse,signal,socket,struct
H=Path(__file__).resolve().parent
COMMON=Path('/srv/crays/migration-work/20261108/root/common11-source-author01')
PRE=Path('/srv/crays/migration-work/20261108/root/member26-current-family-preimage01/CURRENT_FAMILY_PRIVATE_PREIMAGE.json')
PRE_SHA='42c4e98d9eba21ba0257e7e32a65dfd17f79a7f0c9b25b0244afcc52d7cfac07'
BUILD=Path('/srv/crays/migration-work/20261108/root/member-nextcloud-build25-execution01')
BUILD_SHA='e346df2f1ce938134fd96c802bae4758494eaf0b67209eb4dce8a96bd4d1abdb'
BID='wUKFmu0-AhQgD3tntumrG'
RELEASE=Path('/srv/crays/releases/member-nextcloud26-20261108-01')
NOSTR=Path('/srv/crays/releases/nostr-original-core-addon-20261108-18')
REGISTRY=NOSTR/'common-machine57/MODULE_REGISTRY.member26.json'
OUT=Path('/srv/crays/acceptance/member26-family-adoption-20261108-01')
ENV=Path('/srv/crays/private/member-nextcloud-consumer26/environment.private.json')
PRINCIPAL=Path('/srv/crays/private/nextcloud-original-member-document-20261108-24/principal.private.json')
UNITS=['crays-owner-tools-whatsapp-live.service','crays-owner-document-broker.service','crays-owner-workflow-broker.service','crays-chuck-core-currentness.service','crays-nostr-native-registry18.service','crays-nostr-scoped-sts18.service']
PATHS={'PUBLIC_PROCESS_BINDING.root.json':Path('/srv/crays/runtime/chuck-core-currentness-20261107-07/PUBLIC_PROCESS_BINDING.root.json'),'OWNER_BINDING.json':Path('/srv/crays/runtime/chuck-profile-control-20261107-20/owner/OWNER_BINDING.json'),'DEPLOYMENT.json':Path('/srv/crays/runtime/chuck-profile-control-20261107-20/deployment/DEPLOYMENT.json'),'START.json':Path('/srv/crays/runtime/chuck-profile-control-20261107-20/deployment/START.json')}
PHASE='ADMISSION'
def need(v,g):
 if not v:raise RuntimeError(g)
def sha(b):return hashlib.sha256(b).hexdigest()
def canon(v):return json.dumps(v,sort_keys=True,separators=(',',':')).encode()
def stable(p,maximum=8388608,root=False):
 p=Path(p);fd=os.open(p,os.O_RDONLY|os.O_NOFOLLOW|os.O_NONBLOCK)
 try:
  a=os.fstat(fd);need(stat.S_ISREG(a.st_mode)and a.st_nlink==1 and 0<=a.st_size<=maximum,'BOUNDED_STABLE_REGULAR_FILE_REQUIRED')
  if root:need(a.st_uid==0 and not a.st_mode&0o077,'ROOT_PRIVATE_FILE_CUSTODY_REQUIRED')
  result=bytearray()
  while len(result)<a.st_size:
   b=os.read(fd,min(1048576,a.st_size-len(result)));need(b,'FULL_STABLE_READ_REQUIRED');result.extend(b)
  z=os.fstat(fd);v=p.lstat();key=lambda s:(s.st_dev,s.st_ino,s.st_size,s.st_mtime_ns,s.st_ctime_ns,s.st_mode,s.st_uid,s.st_gid)
  need(key(a)==key(z)==key(v),'FILE_CHANGED_DURING_READ');return bytes(result)
 finally:os.close(fd)
def sync(p):
 fd=os.open(p,os.O_DIRECTORY|os.O_NOFOLLOW);os.fsync(fd);os.close(fd)
def put(p,b,mode=0o400,uid=0,gid=0):
 if not isinstance(b,bytes):b=(json.dumps(b,sort_keys=True,indent=2)+'\n').encode()
 fd=os.open(p,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,mode)
 try:
  os.fchown(fd,uid,gid);os.fchmod(fd,mode);v=memoryview(b)
  while v:
   n=os.write(fd,v);need(n>0,'FULL_EXCLUSIVE_WRITE_REQUIRED');v=v[n:]
  os.fsync(fd)
 finally:os.close(fd)
 sync(p.parent)
def own(phase,r):
 need(os.getuid()==0 and Path('/sys/devices/virtual/dmi/id/board_asset_tag').read_text().strip()=='i-0eb300e1b02414d8f','EXACT_AWS_ROOT_HOST_REQUIRED')
 need(r.get('executionApproved')is True and r.get('controllerSHA256')==sha(stable(Path(__file__),131072))and r.get('independentReviewSHA256')and r.get('phase')==phase,'EXACT_PHASE_ROOT_INDEPENDENT_REVIEW_REQUIRED')
 for name,h in r['sourcePins'].items():need(Path(name).name==name and sha(stable(H/name,131072))==h,'EXACT_SOURCE26_PINS_REQUIRED')
 need(os.environ.get('INVOCATION_ID')and r.get('freshExclusiveWindowApproved')is True and 0<r['windowExpiresAtUnix']-time.time()<=600,'FRESH_ROOT_EXCLUSIVE_WINDOW_REQUIRED')
 unit='crays-member26-'+phase+'-20261108-01.service';cg=Path('/sys/fs/cgroup')/Path('/proc/self/cgroup').read_text().strip().split(':',2)[-1].lstrip('/')
 need(cg.name==unit and int((cg/'memory.max').read_text())<=1073741824 and int((cg/'memory.swap.max').read_text())==0 and int((cg/'pids.max').read_text())<=128,'EXACT_PHASE26_RESOURCE_CGROUP_REQUIRED')
 quota,period=(cg/'cpu.max').read_text().split();need(quota!='max'and int(quota)/int(period)<=.5,'FINITE_HALF_CPU_REQUIRED')
def modules():
 need(sha(stable(COMMON/'coordinate_full_common_generation25.candidate.py',65536))=='d4c4cd040b449821e285b89ba8d2f8de6774449c1cf1485f131ccbd26b2c570d','ORIGINAL_COMMON11_SOURCE_REQUIRED')
 m=json.loads(stable(COMMON/'SOURCE_MANIFEST_COMMON11.json'))
 for name,h in m['files'].items():
  if name.endswith('.py'):need(sha(stable(COMMON/name,131072))==h,'ORIGINAL53_DERIVER_AND_HELPER_PINS_REQUIRED')
 return runpy.run_path(str(COMMON/'qualified_container_physical.py')),runpy.run_path(str(COMMON/'qualified53_exact_helpers.py')),runpy.run_path(str(H/'project_exact_member26_consumer_payloads.candidate.py'))
def load_pre():
 raw=stable(PRE,16777216,True);need(sha(raw)==PRE_SHA,'ACTUAL_CURRENT_FAMILY_PREIMAGE_REQUIRED');return json.loads(raw)
def original_generation(pre,u):
 for role,p in pre['containers'].items():
  c=u['inspect'](p['id']);need(c['Id']==p['id']and c['State']['Running']and c['Image']==p['Image']and c['Name']==p['Name'],'EXACT_CURRENT_RUNNING_FAMILY_REQUIRED')
  need(all(u['canon'](c[n])==u['canon'](p[n])for n in('Config','HostConfig','Mounts','NetworkSettings')),'CURRENT_FAMILY_CONFIG_MOUNTS_NETWORKS_CHANGED')
  physical=u['physical'](c);need(physical[0]==p['process']['pid']and str(physical[1])==str(p['process']['startTicks']),'EXACT_CURRENT_FAMILY_PID_TICKS_REQUIRED')
 for n,p in PATHS.items():need(sha(stable(p))==pre['controlsSHA256'][n],'ACTUAL_CURRENT11_CONTROL_CHAIN_REQUIRED')
def copy_tree(source,target,files,prefix,skip_root_modules=False):
 for parent,dirs,names in os.walk(source,followlinks=False):
  parent=Path(parent);rel=parent.relative_to(source);dest=target/rel;dest.mkdir(mode=0o755,parents=True,exist_ok=True)
  for directory in [dest,*dest.parents]:
   if directory==RELEASE:break
   need(directory.is_relative_to(RELEASE),'OWN_NEW_PUBLIC_DIRECTORY_ONLY');os.chmod(directory,0o755)
  for n in list(dirs):
   p=parent/n
   if p.is_symlink():
    need(skip_root_modules and str(p.relative_to(source))=='node_modules','NO_UNQUALIFIED_RELEASE_DIRECTORY_SYMLINK');dirs.remove(n)
  for n in sorted(names):
   p=parent/n;need(not p.is_symlink()and not n.startswith('.env')and'.private'not in n and n not in('credentials','id_rsa','id_ed25519'),'PUBLIC_REGULAR_RELEASE_BYTES_ONLY')
   b=stable(p,67108864);relative=(Path(prefix)/rel/n).as_posix();dst=target/rel/n
   if dst.exists():need(stable(dst,67108864)==b,'EXACT_DUPLICATE_RELEASE_CONTENT_REQUIRED')
   else:put(dst,b,0o644)
   files[relative]={'sha256':sha(b),'bytes':len(b)}
def stage(r):
 global PHASE
 own('stage',r);u,q,project=modules();pre=load_pre();original_generation(pre,u)
 br=stable(BUILD/'RESULT_ACTUAL.json');need(sha(br)==BUILD_SHA,'ACTUAL_SUCCESSFUL_SOURCE25_BUILD_RECEIPT_REQUIRED')
 source=BUILD/'source';need((source/'.next/BUILD_ID').read_text().strip()==BID and(source/'.next/standalone/server.js').is_file(),'ACTUAL25_NEW_BUILD_ID_AND_STANDALONE_REQUIRED')
 guard=json.loads(stable(Path('/srv/crays/migration-work/20261108/root/nextcloud-member-ordinary-build25-source01/GUARD_BUILD_SOURCE_PROVENANCE.json')))
 for rel,h in guard['source28Pins'].items():need(sha(stable(source/rel))==h,'ALL28_SOURCE25_ADAPTERS_PRESERVED')
 need(sha(stable(source/'src/lib/clubs/member-native-document-handler.ts'))=='a9c2705a10fec87333f6e03236232958a4b9facf09c2d17cb513c788a47ede21','ACTUAL_ONLY_SOURCE14_PRINCIPAL_PATH_OVERLAY_REQUIRED')
 need(not RELEASE.exists()and not REGISTRY.exists()and not ENV.parent.exists(),'EXCLUSIVE_NEW_RELEASE_REGISTRY_ENV_REQUIRED')
 RELEASE.mkdir(mode=0o755);os.chmod(RELEASE,0o755);sync(RELEASE.parent);put(RELEASE/'INTENT.json',{'phase':'IMMUTABLE_MEMBER26_STAGING','actualBuildSHA256':BUILD_SHA,'buildId':BID,'noBuildPerformed':True,'noRuntimeChange':True})
 try:
  PHASE='PUBLIC_RELEASE_BYTES';app=RELEASE/'app';app.mkdir(mode=0o755);os.chmod(app,0o755);files={}
  copy_tree(source/'.next/standalone',app,files,'app',True)
  copy_tree(source/'.next/static',app/'.next/static',files,'app/.next/static')
  copy_tree(source/'src',app/'src',files,'app/src')
  need((app/'.next/BUILD_ID').read_text().strip()==BID and(app/'server.js').is_file()and(app/'package.json').is_file(),'EXACT_MATERIALIZED_NEXT_RUNTIME_REQUIRED')
  PHASE='OWN_EXACT_PUBLIC_MEMBER_CODE_WITH_EMPTY_TARGET'
  oldcode=next(m['Source']for m in pre['containers']['member']['Mounts']if m['Destination']=='/run/crays/member-code')
  need(oldcode=='/srv/crays/runtime/member-rds-canonical-20261107-09/code','EXACT_ORIGINAL_MEMBER_CODE_SOURCE_REQUIRED')
  code=RELEASE/'member-code';code.mkdir(mode=0o755);os.chmod(code,0o755);os.chown(code,1000,1000)
  codepins={'member_rds_runtime_boot.cjs':('e778538be4b47d0284034eaab74813ed237de9b98edb1823424005d52ef3e2c8',1364),'original-rds-guard-probe.cjs':('f1f5a544905fb3d248b7bdbca8c2edcd38a51273aaa008b5764034e89d9ad1f3',712900)}
  need(set(p.name for p in Path(oldcode).iterdir())==set(codepins),'EXACT_TWO_ORIGINAL_PUBLIC_CODE_FILES_REQUIRED')
  for name,(digest,size)in codepins.items():
   src=Path(oldcode)/name;sm=src.lstat();body=stable(src,1048576)
   need(sm.st_uid==sm.st_gid==1000 and stat.S_IMODE(sm.st_mode)==0o400 and len(body)==size and sha(body)==digest,'ORIGINAL_PUBLIC_BOOTSTRAP_BYTES_AND_CUSTODY_REQUIRED')
   put(code/name,body,0o400,1000,1000);files['member-code/'+name]={'sha256':digest,'bytes':size}
  placeholder=code/'nextcloud-original-member-document-principal.private.json';put(placeholder,b'',0o600,1000,1000);files['member-code/'+placeholder.name]={'sha256':sha(b''),'bytes':0}
  sync(code);sync(RELEASE)
  PHASE='OWN_PUBLIC_MEMBER_REGISTRY_DESCRIPTOR'
  oldreg=next(m['Source']for m in pre['containers']['common']['Mounts']if m['Destination']=='/srv/crays/runtime/common-canonical-20261106-01/MODULE_REGISTRY.json')
  before=stable(oldreg);doc=json.loads(before);need(doc.get('schema')=='crays.unified-platform.runtime.v1'and doc.get('origin')=='https://member.crays.world'and isinstance(doc.get('member'),dict),'EXISTING_ACTUAL_COMMON_REGISTRY_MEMBER_DESCRIPTOR_REQUIRED')
  after=copy.deepcopy(doc);after['member'].update(root=str(app),buildId=BID);back=copy.deepcopy(after);back['member']=copy.deepcopy(doc['member']);need(back==doc,'ONLY_MEMBER_ROOT_AND_BUILD_ID_REGISTRY_DELTA')
  for key in set(doc['member'])|set(after['member']):need(key in('root','buildId')or doc['member'].get(key)==after['member'].get(key),'ALL_OTHER_MEMBER_DESCRIPTOR_VALUES_PRESERVED')
  registry=(json.dumps(after,ensure_ascii=False,indent=2)+'\n').encode();put(REGISTRY,registry,0o644)
  PHASE='ORIGINAL_PRIVATE_ENV_TWO_KEYS'
  oldenv=next(m['Source']for m in pre['containers']['member']['Mounts']if m['Destination']=='/run/crays/member/environment.private.json')
  oldmeta=Path(oldenv).lstat();need(stat.S_ISREG(oldmeta.st_mode)and oldmeta.st_uid==1000 and oldmeta.st_nlink==1 and not oldmeta.st_mode&0o077,'ORIGINAL_MEMBER_PRIVATE_ENV_CUSTODY_REQUIRED')
  env=project['environment'](json.loads(stable(oldenv)));ENV.parent.mkdir(mode=0o700);sync(ENV.parent.parent);put(ENV,canon(env),0o600,1000,1000);env=None
  principal=PRINCIPAL.lstat();need(stat.S_ISREG(principal.st_mode)and principal.st_uid==principal.st_gid==1000 and stat.S_IMODE(principal.st_mode)==0o600 and principal.st_nlink==1,'ACTUAL24_ORIGINAL_PRINCIPAL_CUSTODY_REQUIRED')
  row={'path':str(REGISTRY),'sha256':sha(registry),'bytes':len(registry)}
  manifest={'schema':'crays.immutable.next.release.v1','buildId':BID,'actualBuildSHA256':BUILD_SHA,'files':files,'runtimeImage':pre['containers']['member']['Image'],'oldPublicAssetsPreserved':True,'registry':row,'registryBeforeSHA256':sha(before),'registryOnlyChangedPaths':['member.root','member.buildId'],'originalPrincipalReusedNoBodyRead':True,'environmentOnlyTwoOriginalSource14KeysChanged':True,'runtimeOrRegistryControlNotActivated':True}
  put(RELEASE/'RELEASE_MANIFEST.json',manifest,0o644);put(RELEASE/'STAGE_ACTUAL.json',{'status':'IMMUTABLE_MEMBER26_RELEASE_PRIVATE_CONSUMER_AND_PUBLIC_DESCRIPTOR_STAGED_NOT_STARTED','buildId':BID,'releaseManifestSHA256':sha(stable(RELEASE/'RELEASE_MANIFEST.json')),'registry':row,'all28AdaptersPreserved':True,'originalPrincipalAndOtherPrivateEnvValuesPreserved':True,'noRuntimeChange':True})
  original_generation(pre,u);return {'status':'MEMBER26_RELEASE_STAGED_NOT_STARTED','buildId':BID}
 except BaseException as e:
  put(RELEASE/'STAGE_STOP_ACTUAL.json',{'phase':PHASE,'errorClass':type(e).__name__,'guard':str(e)if isinstance(e,RuntimeError)else None,'partialOwnStageRetained':True,'noRuntimeMutation':True});raise
def default_gateway(pid):
 rows=[r.split()for r in Path('/proc',str(pid),'net/route').read_text().splitlines()[1:]]
 defaults=[r for r in rows if r[1]=='00000000'and r[7]=='00000000'and int(r[3],16)&2]
 need(len(defaults)==1,'EXACT_ONE_EXISTING_DEFAULT_GATEWAY_REQUIRED')
 return socket.inet_ntoa(struct.pack('<I',int(defaults[0][2],16)))
def normalize_config(c,role):
 c=copy.deepcopy(c)
 if role!='member':c.pop('Hostname',None);c.pop('Domainname',None)
 if c.get('Env')is not None:
  pairs=[x.split('=',1)for x in c['Env']];need(len({x[0]for x in pairs})==len(pairs),'NO_DUPLICATE_ENV_KEYS');c['Env']=sorted(c['Env'])
 return c
def normalize_host(h):
 h=copy.deepcopy(h)
 if h.get('OomKillDisable')is None:h['OomKillDisable']=False
 for row in h.get('Mounts')or[]:row.setdefault('ReadOnly',False)
 return h
def admit_created(u,cid,payload,expected,role,original,new_member):
 c=u['inspect'](cid);want={k:v for k,v in payload.items()if k not in('HostConfig','NetworkingConfig')}
 actual={k:c['Config'].get(k)for k in want}
 need(c['Image']==original['Image']and normalize_config(actual,role)==normalize_config(want,role),'CREATED_EXACT_ORIGINAL_CONFIG_ONLY_DECLARED_DELTAS')
 need(normalize_host(c['HostConfig'])==normalize_host(payload['HostConfig']),'CREATED_EXACT_HOST_CONFIG_REQUIRED')
 need({m['Destination']:(m['Source'],m['RW'],m['Type'])for m in c['Mounts']}==expected,'CREATED_EXACT_EFFECTIVE_MOUNT_PURPOSES_REQUIRED')
 if role!='member':need(c['HostConfig']['NetworkMode']=='container:'+new_member,'CREATED_EXACT_NEW_MEMBER_NAMESPACE_TARGET')
 return c
def adopt(r):
 global PHASE
 own('adopt',r);u,q,projection=modules();pre=load_pre();original_generation(pre,u)
 need(not OUT.exists(),'EXCLUSIVE_FINITE26_ATTEMPT_NO_REPLAY')
 stagebytes=stable(RELEASE/'STAGE_ACTUAL.json');need(sha(stagebytes)==r['stageActualSHA256'],'ACTUAL26_STAGE_RECEIPT_REQUIRED');stageproof=json.loads(stagebytes)
 need(stageproof['status']=='IMMUTABLE_MEMBER26_RELEASE_PRIVATE_CONSUMER_AND_PUBLIC_DESCRIPTOR_STAGED_NOT_STARTED'and stageproof['buildId']==BID,'ACTUAL26_RELEASE_STAGED_REQUIRED')
 manifest=stable(RELEASE/'RELEASE_MANIFEST.json');need(sha(manifest)==stageproof['releaseManifestSHA256'],'EXACT_IMMUTABLE26_RELEASE_MANIFEST_REQUIRED');release=json.loads(manifest)
 for rel,h in release['files'].items():need(sha(stable(RELEASE/rel,67108864))==h['sha256'],'IMMUTABLE26_RELEASE_BYTES_REQUIRED')
 need(sha(stable(REGISTRY))==release['registry']['sha256'],'OWN_NEW_REGISTRY_DESCRIPTOR_PIN_REQUIRED')
 crraw=stable(r['originalCommon11RootReviewPath'],131072,True);need(sha(crraw)==r['originalCommon11RootReviewSHA256'],'EXACT_RETAINED_APPROVED_COMMON11_INPUTS_REQUIRED');cr=json.loads(crraw);need(cr['executionApproved']is True and cr['controllerSHA256']=='d4c4cd040b449821e285b89ba8d2f8de6774449c1cf1485f131ccbd26b2c570d','ORIGINAL_COMMON11_APPROVED_CONTEXT_REQUIRED')
 # Root supplies actual scoped ingress closure, not a promise that bootstrap is private.
 ingress=stable(r['ingressClosedActualPath'],131072,True);need(sha(ingress)==r['ingressClosedActualSHA256'],'ACTUAL_ROOT_PRIVATE_INGRESS_CLOSURE_REQUIRED')
 iv=json.loads(ingress);need(iv.get('memberCommonWorkPrivateIngressClosed')is True and iv.get('allOtherSitesPreserved')is True and iv.get('sharedEdgeOwnedByRoot')is True,'EXACT_FAMILY_ONLY_INGRESS_CLOSURE_REQUIRED')
 def fresh():
  raw=stable(r['sourceFencePath'],16384,True);need(sha(raw)==r['sourceFenceSHA256'],'FRESH_SOURCE_FENCE_SHA_REQUIRED');f=json.loads(raw)
  need(f.get('sourceArchiveSHA256')=='71084517d7378bb3b6125e161135bd71d921f6ad63b187b9b790cb645f85c53a'and f.get('sourceWriterFenceStillEffective')is True and f.get('originalSourceUnitsPhysicallyStopped')is True and f.get('sourceRestartApproved')is False and 0<=time.time()-f['observedAtUnix']<=120,'ORIGINAL_SOURCE_WRITER_FENCE_CURRENT_REQUIRED')
 fresh()
 for path,h in pre['unitFilesSHA256'].items():need(sha(stable(path,2097152))==h,'ALL_CURRENT_ORIGINAL_UNIT_FILES_PRESERVED')
 for n,state in pre['units'].items():
  now=q['show'](n);need(now['InvocationID']==state['InvocationID']and now['MainPID']==state['MainPID'],'CURRENT_ORIGINAL_MANAGER_GENERATION_REQUIRED')
 ep=projection['endpoints'](pre['containers']['member']);originalGateway=default_gateway(pre['containers']['member']['process']['pid'])
 winners=[n for n,e in pre['containers']['member']['NetworkSettings']['Networks'].items()if e.get('Gateway')==originalGateway]
 need(len(winners)==1,'ORIGINAL_DEFAULT_GATEWAY_MAPS_ONE_CURRENT_NETWORK')
 # Explicit new endpoint priority preserves the original actual default gateway despite recreation order.
 ep[winners[0]]['GwPriority']=max(e.get('GwPriority',0)for e in ep.values())+1
 names={role:p['Name'].lstrip('/')+'-member26-candidate'for role,p in pre['containers'].items()}
 for n in names.values():
  absent=u['api']('GET','/containers/'+urllib.parse.quote(n,safe='')+'/json',statuses=(200,404));need(not isinstance(absent,dict)or'Id'not in absent,'PRIOR26_CONTAINER_NAME_EXISTS_NO_REPLAY')
 OUT.mkdir(mode=0o700);sync(OUT.parent);put(OUT/'INTENT.json',{'status':'EXACT_MEMBER26_COORDINATED_ADOPTION_ONCE','preimageSHA256':PRE_SHA,'stageSHA256':sha(stagebytes),'oldIds':{k:v['id']for k,v in pre['containers'].items()},'sameRDS':True,'automaticReplayAllowed':False})
 new={};plans={};mounts={};terminal=[];published=False;oldNetUnixFD=None;socketPreimages={}
 def journal(n,v):put(OUT/n,v)
 def stop_units():
  q['cmd'](['/usr/bin/systemctl','stop',*UNITS],timeout=45)
  for n in UNITS:
   state=q['show'](n);need(state['MainPID']=='0'and state['ActiveState']in('inactive','failed'),'EXACT_OWN_UNIT_TERMINAL_REQUIRED')
   cg=Path('/sys/fs/cgroup/system.slice')/n
   if cg.exists():need(all(not p.read_text().strip()for p in cg.rglob('cgroup.procs')),'OWN_UNIT_CGROUP_PHYSICALLY_EMPTY')
 def create(role):
  payload,expected=projection['payload'](pre['containers'][role],role,str(RELEASE/'app'),new.get('member'))
  if role=='member':payload['NetworkingConfig']={'EndpointsConfig':ep}
  if role=='common':
   target='/srv/crays/runtime/common-canonical-20261106-01/MODULE_REGISTRY.json';oldsrc=expected[target][0];changed=0
   for m in payload['HostConfig'].get('Mounts')or[]:
    if m.get('Target')==target:need(m['Source']==oldsrc,'COMMON_REGISTRY_MOUNT_PREIMAGE');m['Source']=str(REGISTRY);changed+=1
   for i,b in enumerate(payload['HostConfig'].get('Binds')or[]):
    parts=b.split(':')
    if parts[1]==target:need(parts[0]==oldsrc,'COMMON_REGISTRY_BIND_PREIMAGE');parts[0]=str(REGISTRY);payload['HostConfig']['Binds'][i]=':'.join(parts);changed+=1
   need(changed==1,'ONE_EXISTING_CANONICAL_REGISTRY_BIND_ONLY');expected[target]=(str(REGISTRY),False,'bind')
  plans[role]=payload;mounts[role]=expected;journal(role+'_CREATE_INTENT.private.json',{'name':names[role],'payload':payload,'expectedMounts':expected})
  try:reply=u['api']('POST','/containers/create?name='+urllib.parse.quote(names[role],safe=''),payload);cid=reply['Id']
  except BaseException:
   found=u['api']('GET','/containers/'+urllib.parse.quote(names[role],safe='')+'/json',statuses=(200,404))
   if isinstance(found,dict)and'Id'in found:
    cid=found['Id'];admit_created(u,cid,payload,expected,role,pre['containers'][role],new.get('member'));new[role]=cid;journal(role+'_CREATE_UNCERTAIN_ADOPTED.json',{'id':cid,'replayAllowed':False})
   raise
  new[role]=cid;c=admit_created(u,cid,payload,expected,role,pre['containers'][role],new.get('member'));need(not c['State']['Running']and c['State']['Pid']==0,'NEW_CONTAINER_NOT_STARTED_DURING_CREATE');journal(role+'_CREATED.json',{'id':cid,'configSHA256':u['canon'](c['Config']),'hostConfigSHA256':u['canon'](c['HostConfig']),'mountsSHA256':u['canon'](c['Mounts'])})
 def start(role):
  u['api']('POST','/containers/'+new[role]+'/start',statuses=(204,));c=admit_created(u,new[role],plans[role],mounts[role],role,pre['containers'][role],new.get('member'));need(c['State']['Running'],'NEW_NATIVE_CONTAINER_RUNNING_REQUIRED');return c
 signal.signal(signal.SIGTERM,lambda*a:(_ for _ in()).throw(KeyboardInterrupt()))
 signal.signal(signal.SIGINT,lambda*a:(_ for _ in()).throw(KeyboardInterrupt()))
 try:
  PHASE='EXACT_OLD_SOCKET_PREIMAGES'
  oldNetUnixFD=os.open('/proc/'+str(pre['containers']['member']['process']['pid'])+'/net/unix',os.O_RDONLY|os.O_NOFOLLOW)
  for text in ['/run/crays/nostr-core-runtime-v1/policy/policy.sock','/run/crays/nostr-core-runtime-v1/registry/control.sock','/run/crays-chuck-core-currentness/status.sock']:
   path=Path(text);value=None
   if os.path.lexists(path):
    st=path.lstat();need(stat.S_ISSOCK(st.st_mode)and st.st_uid==st.st_gid==1000 and stat.S_IMODE(st.st_mode)==0o600 and st.st_nlink==1,'EXACT_ORIGINAL_OWN_SOCKET_PREIMAGE')
    value=[st.st_dev,st.st_ino,st.st_uid,st.st_gid,stat.S_IMODE(st.st_mode),st.st_nlink]
   socketPreimages[text]=value
  PHASE='PHYSICAL_QUIESCENCE';stop_units()
  for role in('common','work','member'):
   old=u['inspect'](pre['containers'][role]['id']);need(u['halt'](old['Id'],u['physical'](old)),'OLD_FAMILY_PHYSICAL_TERMINAL_REQUIRED');terminal.append(role);journal(role+'_OLD_TERMINAL.json',{'id':old['Id'],'physicalReturned':True})
  for n,path in PATHS.items():
   need(sha(stable(path))==pre['controlsSHA256'][n],'CURRENT11_CONTROL_ARCHIVE_CAS');st=path.lstat();journal(n+'.ARCHIVE_INTENT.json',{'sha256':pre['controlsSHA256'][n],'device':st.st_dev,'inode':st.st_ino});os.rename(path,OUT/('prior11-'+n));sync(path.parent);sync(OUT);journal(n+'.ARCHIVE_ACK.json',{'sha256':pre['controlsSHA256'][n],'device':st.st_dev,'inode':st.st_ino})
  PHASE='OLD_ENDPOINTS_AND_NEW_CONTAINERS'
  for network in ep:
   journal('DISCONNECT_'+sha(network.encode())[:12]+'.INTENT.json',{'network':network,'oldMember':pre['containers']['member']['id']})
   u['api']('POST','/networks/'+urllib.parse.quote(network,safe='')+'/disconnect',{'Container':pre['containers']['member']['id'],'Force':False})
  create('member');member=start('member');need(default_gateway(member['State']['Pid'])==originalGateway,'ACTUAL_NEW_MEMBER_DEFAULT_GATEWAY_PRESERVED')
  actualnets=member['NetworkSettings']['Networks'];need(set(actualnets)==set(ep)and all(actualnets[n]['IPAddress']==ep[n]['IPAMConfig']['IPv4Address']and actualnets[n].get('GwPriority',0)==ep[n]['GwPriority']for n in ep),'ALL_CURRENT_NETWORK_IP_PRIORITY_PARITY_REQUIRED')
  guestmeta=subprocess.run(['/usr/bin/docker','--config',r['emptyDockerConfig'],'exec','--user','1000:1000',new['member'],'node','-e',"const f=require('fs'),p='/run/crays/member-code/nextcloud-original-member-document-principal.private.json';const s=f.lstatSync(p);if(!s.isFile()||s.uid!==1000||s.gid!==1000||(s.mode&511)!==384||s.nlink!==1)process.exit(1);f.accessSync(p,f.constants.R_OK);process.stdout.write('ORIGINAL_PRINCIPAL_GUEST_CUSTODY_READABLE')"],capture_output=True,timeout=10)
  need(guestmeta.returncode==0 and not guestmeta.stderr and guestmeta.stdout==b'ORIGINAL_PRINCIPAL_GUEST_CUSTODY_READABLE','EXACT_ORIGINAL_PRINCIPAL_GUEST_BIND_READ_ACCESS_REQUIRED');journal('ORIGINAL_PRINCIPAL_GUEST_ACCESS_ACTUAL.json',{'uid':1000,'mode':'0600','readable':True,'bodyRead':False})
  # The only anonymous precommit probe uses the original helper, actual new BuildID.
  deadline=time.monotonic()+45
  while True:
   probe=subprocess.run(['/usr/bin/docker','--config',r['emptyDockerConfig'],'exec',new['member'],'node','-e',"const n=require('net').connect(8991,'127.0.0.1',()=>n.end());n.on('error',()=>process.exitCode=1)"],capture_output=True,timeout=5)
   if probe.returncode==0:break
   need(time.monotonic()<deadline,'MEMBER26_NATIVE8991_START_TIMEOUT');time.sleep(.3)
  probeBody=stable(H/'member26-original-anonymous-auth0-probe.cjs',32768)
  ans=subprocess.run(['/usr/bin/docker','--config',r['emptyDockerConfig'],'exec','-i',new['member'],'node'],input=probeBody,capture_output=True,timeout=140)
  need(ans.returncode==0 and not ans.stderr and len(ans.stdout)<8192,'ORIGINAL_ANONYMOUS_AUTH0_BOUNDARIES_REQUIRED');proof=json.loads(ans.stdout)
  need(proof['status']=='CANONICAL_MEMBER_PRIVATE_ANONYMOUS_BOUNDARIES_AND_ORIGINAL_SDK_TRANSACTION_PASS'and proof['buildId']==BID and proof['customerCoreReadOrWritePerformed']is False,'REAL_NEW_MEMBER_BUILD_ORIGINAL_AUTH_BOUNDARY_REQUIRED');journal('MEMBER26_ANONYMOUS_ACTUAL.json',proof)
  create('work');create('common')
  PHASE='ORIGINAL_GO_NETWORK_NAMESPACE_REBIND'
  ns=Path('/run/crays/nostr-core-runtime-v1/network/common.netns');oldns=os.stat(ns);need(oldns.st_ino==int(pre['containers']['member']['netns'].split('[')[1][:-1]),'EXACT_OLD_GO_NAMESPACE_MOUNT_REQUIRED')
  ap=q['process'](member['State']['Pid']);proc=Path('/proc',str(ap['pid']),'ns/net')
  journal('GO_NETNS_REBIND_INTENT.json',{'oldDevice':oldns.st_dev,'oldInode':oldns.st_ino,'newMember':new['member'],'newPID':ap['pid'],'newStartTicks':ap['startTicks'],'newNamespaceInode':proc.stat().st_ino})
  q['cmd'](['/usr/bin/umount',str(ns)],timeout=5);base=ns.lstat();need(stat.S_ISREG(base.st_mode)and base.st_uid==0 and not base.st_mode&0o077,'OWN_GO_NETNS_PLACEHOLDER_CUSTODY_REQUIRED')
  q['cmd'](['/usr/bin/mount','--bind',str(proc),str(ns)],timeout=5);need((ns.stat().st_dev,ns.stat().st_ino)==(proc.stat().st_dev,proc.stat().st_ino),'ACTUAL_NEW_MEMBER_GO_NETNS_SAME_INODE');journal('GO_NETNS_REBOUND_ACTUAL.json',{'newMember':new['member'],'newNamespaceInode':proc.stat().st_ino,'sameUnitPathAndAllUnitBytesPreserved':True})
  start('work');fresh()
  PHASE='ORIGINAL_FULL_COMMON_AND_SDK_GENERATION'
  context={'newMember':new['member'],'newCommon':new['common'],'newWork':new['work'],'expectedCommon':plans['common'],'expectedCommonMounts':mounts['common'],'originalCommon':pre['containers']['common'],'familyPreimage':pre,'registryRow':release['registry'],'output':str(OUT/'generation'),'parentOutput':str(OUT),'newMemberProcess':ap,'oldNetUnixFD':oldNetUnixFD,'socketPreimages':socketPreimages}
  finish=runpy.run_path(str(H/'finish_original_common26_generation.candidate.py'));generation=finish['finish'](r,cr,context)
  published=True;PHASE='NATIVE_FAMILY_DURABLE_COMMIT'
  for role in('member','work','common'):
   oldid=pre['containers'][role]['id'];oldname=pre['containers'][role]['Name'].lstrip('/')
   need(not u['inspect'](oldid)['State']['Running'],'OLD_FAMILY_REMAINS_TERMINAL_REQUIRED')
   journal(role+'_NAME_COMMIT_INTENT.json',{'oldId':oldid,'newId':new[role],'oldName':oldname})
   u['api']('POST','/containers/'+oldid+'/rename?name='+urllib.parse.quote(oldname+'-before-member26',safe=''),statuses=(204,))
   u['api']('POST','/containers/'+new[role]+'/rename?name='+urllib.parse.quote(oldname,safe=''),statuses=(204,))
  journal('RESULT_ACTUAL.json',{'status':'MEMBER26_IMMUTABLE_RELEASE_AND_ORIGINAL_FULL_SDK_GENERATION_COMMITTED_INGRESS_REOPEN_PENDING','oldIds':{k:v['id']for k,v in pre['containers'].items()},'newIds':new,'buildId':BID,'source25ActualSHA256':BUILD_SHA,'originalPrincipalUIDPasswordProviderAndTestScopePreserved':True,'customerAuth0DocumentS3Acceptance':False,'otherIndependentNextcloudAndWebsitesUntouched':True,'sharedIngressReopened':False,'generation':generation,'automaticReplayAllowed':False})
  return {'status':'MEMBER26_FAMILY_COMMITTED_ROOT_INGRESS_REOPEN_PENDING','newIds':new,'buildId':BID,'customerAcceptance':False}
 except BaseException as e:
  signal.signal(signal.SIGTERM,signal.SIG_IGN);signal.signal(signal.SIGINT,signal.SIG_IGN);cleanup=[]
  try:stop_units()
  except BaseException as z:cleanup.append(type(z).__name__)
  for role in('common','work','member'):
   if role in new:
    try:
     c=u['inspect'](new[role])
     if c['State']['Running']:need(u['halt'](new[role],u['physical'](c)),'OWN_NEW_FAMILY_TERMINAL_REQUIRED')
    except BaseException as z:cleanup.append(type(z).__name__)
  published=published or(OUT/'generation/START_PUBLICATION_ACK.json').exists()
  journal('CLOSED_FAILURE.json',{'phase':PHASE,'guard':str(e)if isinstance(e,RuntimeError)else None,'errorClass':type(e).__name__,'oldTerminalRoles':terminal,'newIds':new,'fullGenerationPublished':published,'cleanupErrors':cleanup,'originalContainersAndControlsRetained':True,'sameRDSNoDatabaseRollback':True,'ingressReopenForbidden':True,'automaticReplayAllowed':False});raise
 finally:
  if oldNetUnixFD is not None:os.close(oldNetUnixFD)
if __name__=='__main__':
 try:
  r=json.loads(stable(sys.argv[1],131072,True));phase=sys.argv[2];need(phase in('stage','adopt'),'EXPLICIT_FINITE_PHASE_REQUIRED');print(json.dumps(stage(r)if phase=='stage'else adopt(r)))
 except BaseException as e:print(json.dumps({'status':'MEMBER26_PHASE_STOP_INSPECT_NO_REPLAY','phase':PHASE,'errorClass':type(e).__name__,'guard':str(e)if isinstance(e,RuntimeError)else None,'privateValuesReturned':False}));raise SystemExit(1)
