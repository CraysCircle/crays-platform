"""Root-only finite current Member51 family adoption; no build/stage/DB/provider changes. Derived from proven26 physical lifecycle and35 source-generation logic; no replay of prior failed intents."""
from pathlib import Path
import os,stat,json,hashlib,runpy,subprocess,sys,time,copy,urllib.parse,signal,socket,struct,re
H=Path(__file__).resolve().parent
COMMON=Path('/srv/crays/migration-work/20261108/root/common11-source-author01')
PRE=H/'CURRENT_FAMILY51_PREIMAGE.private.json'
PRE_SHA=None
BUILD_SHA=None
BID=None
RELEASE=Path('/srv/crays/releases/member-document-provider51-20261109-01')
REGISTRY=Path('/srv/crays/releases/nostr-original-core-addon-20261108-18/common-machine57/MODULE_REGISTRY.member51.json')
OUT=Path('/srv/crays/acceptance/member51-family-adoption-20261109-01')
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
 unit='crays-member51-'+phase+'-20261109-01.service';cg=Path('/sys/fs/cgroup')/Path('/proc/self/cgroup').read_text().strip().split(':',2)[-1].lstrip('/')
 need(cg.name==unit and int((cg/'memory.max').read_text())<=1073741824 and int((cg/'memory.swap.max').read_text())==0 and int((cg/'pids.max').read_text())<=128,'EXACT_PHASE26_RESOURCE_CGROUP_REQUIRED')
 quota,period=(cg/'cpu.max').read_text().split();need(quota!='max'and int(quota)/int(period)<=.5,'FINITE_HALF_CPU_REQUIRED')

 fence=stable('/srv/crays/migration-work/20261108/root/ROOT_HEAVY_ATTEMPT_ACTIVE.json',16384,True);need(sha(fence)==r['rootHeavyFenceSHA256']and json.loads(fence).get('unit')==unit,'EXACT_OWN42_ROOT_WINDOW_FENCE')


def modules():
 need(sha(stable(COMMON/'coordinate_full_common_generation25.candidate.py',65536))=='d4c4cd040b449821e285b89ba8d2f8de6774449c1cf1485f131ccbd26b2c570d','ORIGINAL_COMMON11_SOURCE_REQUIRED')
 m=json.loads(stable(COMMON/'SOURCE_MANIFEST_COMMON11.json'))
 for name,h in m['files'].items():
  if name.endswith('.py'):need(sha(stable(COMMON/name,131072))==h,'ORIGINAL53_DERIVER_AND_HELPER_PINS_REQUIRED')
 return runpy.run_path(str(COMMON/'qualified_container_physical.py')),runpy.run_path(str(COMMON/'qualified53_exact_helpers.py')),runpy.run_path(str(H/'project_exact_member51_successor_payloads.candidate.py'))


def load_pre():
 raw=stable(PRE,16777216,True);need(sha(raw)==PRE_SHA,'ACTUAL_CURRENT_FAMILY_PREIMAGE_REQUIRED');return json.loads(raw)


def original_generation(pre,u):
 for role,p in pre['containers'].items():
  c=u['inspect'](p['id']);need(c['Id']==p['id']and c['State']['Running']and c['Image']==p['Image']and c['Name']==p['Name'],'EXACT_CURRENT_RUNNING_FAMILY_REQUIRED')
  need(all(u['canon'](c[n])==u['canon'](p[n])for n in('Config','HostConfig','Mounts','NetworkSettings')),'CURRENT_FAMILY_CONFIG_MOUNTS_NETWORKS_CHANGED')
  physical=u['physical'](c);need(physical[0]==p['process']['pid']and str(physical[1])==str(p['process']['startTicks']),'EXACT_CURRENT_FAMILY_PID_TICKS_REQUIRED')
 for n,p in PATHS.items():need(sha(stable(p))==pre['controlsSHA256'][n],'ACTUAL_CURRENT11_CONTROL_CHAIN_REQUIRED')


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



def current50_binding(pre=None):
 raw=stable('/srv/crays/acceptance/module50-family-adoption-20261109-01/RESULT_ACTUAL.json',131072)
 need(sha(raw)=='0d760147023a3904051c32ed47ff7be0aa279d3d7c56a98b3fd1020b66ddfbac','ACTUAL_CURRENT_MODULE50_FAMILY_REQUIRED')
 actual=json.loads(raw);need(actual['newIds']==CURRENT_IDS and actual['buildId']=='LbgKfWM3XAR5fr7rTk3b6','CURRENT50_IDS_AND_BUILD_REQUIRED')
 for p,h in [
 ('/srv/crays/releases/nostr-original-core-addon-20261108-18/common-machine57/common-host.native-graphql49.candidate.cjs','f726cd9fb8a44309408da26f5d1ad621ef8de127028cf2d9f2b4fa09f44742f1'),
 ('/srv/crays/releases/nostr-original-core-addon-20261108-18/common-machine57/listener.original-messaging-nostr50.candidate.mjs','284044a37f516d2fd9fbe3004773b40100bf7c6711c452936bf364f0395c3db6'),
 ('/srv/crays/releases/nostr-original-core-addon-20261108-18/runtime-core-adoption18-executable/serve-original-host.native-graphql49.candidate.mjs','6541b66ceb48214977bb8b584bb54975238041155b4788714386cd9312ce829c'),
 ('/srv/crays/releases/nostr-original-core-addon-20261108-18/common-machine57/MODULE_REGISTRY.member50.json','8de0c8b3b4a0f42a229e46089495c62d0ee45c36d0502480a977659fee3f9954')]:
  need(sha(stable(p,8388608))==h,'CURRENT50_RETAINED_SOURCE_OR_REGISTRY_DRIFT')
 if pre is not None:
  need({k:v['id']for k,v in pre['containers'].items()}==CURRENT_IDS,'EXACT_CURRENT50_PREIMAGE_IDS')
  pub=json.loads(stable(PATHS['PUBLIC_PROCESS_BINDING.root.json']));policy=json.loads(stable(PATHS['DEPLOYMENT.json']))
  need(len(pub['publicSourceFiles'])==64 and len(policy['sourceFiles'])==62,'CURRENT50_COMPLETE64_62_CLOSURE_REQUIRED')


def adopt(r):
 global PHASE,BID,BUILD_SHA
 BID=r['actualBuildId'];BUILD_SHA=r['actualBuildSHA256']
 need(BID=='Em8YqZapuRa58BfKC5hRh' and BUILD_SHA=='ba713db5124d0a76c78c764e0bcacb0bae8e37f7aebc94e53728afeb5a9f1bf5','EXACT_COMPLETED_ROOT_BUILD51_REQUIRED')
 need(isinstance(BID,str) and BID!='LbgKfWM3XAR5fr7rTk3b6' and len(BID)<=100 and isinstance(BUILD_SHA,str) and len(BUILD_SHA)==64,'REAL_COMPLETED46_BUILD_BINDING_REQUIRED')
 own('adopt',r);u,q,projection=modules();pre=load_pre();current50_binding(pre);original_generation(pre,u)
 envReceiptPath=Path('/srv/crays/private/member-original-context46-20261109-01/RESULT_ACTUAL.json');envReceipt=stable(envReceiptPath,16384,True)
 need(sha(envReceipt)==r['environmentProjectionActualSHA256'] and json.loads(envReceipt)['status']=='ORIGINAL_MEMBER_ENVIRONMENT_FIVE_EXISTING_MAIN_KEYS_PROJECTED_NOT_INSTALLED','EXACT_REVIEWED46_ENVIRONMENT_PROJECTION_REQUIRED')
 envPath=envReceiptPath.parent/'environment.private.json';envMeta=envPath.lstat()
 need(envPath.resolve()==envPath and stat.S_ISREG(envMeta.st_mode) and envMeta.st_uid==envMeta.st_gid==1000 and stat.S_IMODE(envMeta.st_mode)==0o600 and envMeta.st_nlink==1 and 0<envMeta.st_size<65536,'EXACT_ORIGINAL_MEMBER_LOADER46_ENVIRONMENT_CUSTODY_REQUIRED')
 need(not OUT.exists(),'EXCLUSIVE_FINITE26_ATTEMPT_NO_REPLAY')
 stagebytes=stable(RELEASE/'STAGE_ACTUAL.json');need(sha(stagebytes)==r['stageActualSHA256'],'ACTUAL26_STAGE_RECEIPT_REQUIRED');stageproof=json.loads(stagebytes)
 need(stageproof['status']=='IMMUTABLE_MEMBER51_PUBLIC_RELEASE_STAGED_NOT_INSTALLED'and stageproof['buildId']==BID,'ACTUAL26_RELEASE_STAGED_REQUIRED')
 manifest=stable(RELEASE/'RELEASE_MANIFEST.json');need(sha(manifest)==stageproof['releaseManifestSHA256'],'EXACT_IMMUTABLE26_RELEASE_MANIFEST_REQUIRED');release=json.loads(manifest)
 for rel,h in release['files'].items():need(sha(stable(RELEASE/rel,67108864))==h['sha256'],'IMMUTABLE26_RELEASE_BYTES_REQUIRED')
 stagedRegistry=RELEASE/'common/MODULE_REGISTRY.member51.json';registryRaw=stable(stagedRegistry,8388608);registryPin=release['files']['common/MODULE_REGISTRY.member51.json'];need(sha(registryRaw)==registryPin['sha256']and len(registryRaw)==registryPin['bytes'],'EXACT_STAGED42_REGISTRY')
 need(not REGISTRY.exists(),'EXCLUSIVE_SDK_VISIBLE42_REGISTRY_MIRROR');release['registry']={'path':str(REGISTRY),'sha256':sha(registryRaw),'bytes':len(registryRaw)}
 commonSource=Path('/srv/crays/releases/nostr-original-core-addon-20261108-18/common-machine57/common-host.native-graphql49.candidate.cjs');commonBody=stable(commonSource,131072)
 need(sha(commonBody)=='f726cd9fb8a44309408da26f5d1ad621ef8de127028cf2d9f2b4fa09f44742f1','UNCHANGED_CURRENT_COMMON49_SOURCE_REQUIRED')
 release['commonSource']={'path':str(commonSource),'sha256':sha(commonBody),'bytes':len(commonBody)}
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
 need(ep[winners[0]]['GwPriority']==max(e['GwPriority']for e in ep.values()) and sum(e['GwPriority']==ep[winners[0]]['GwPriority']for e in ep.values())==1,'EXACT_CURRENT_UNIQUE_GATEWAY_PRIORITY_PRESERVED')
 names={role:p['Name'].lstrip('/')+'-member51-candidate'for role,p in pre['containers'].items()}
 for n in names.values():
  absent=u['api']('GET','/containers/'+urllib.parse.quote(n,safe='')+'/json',statuses=(200,404));need(not isinstance(absent,dict)or'Id'not in absent,'PRIOR26_CONTAINER_NAME_EXISTS_NO_REPLAY')
 OUT.mkdir(mode=0o700);sync(OUT.parent);put(OUT/'INTENT.json',{'status':'EXACT_MEMBER51_COORDINATED_ADOPTION_ONCE','preimageSHA256':PRE_SHA,'stageSHA256':sha(stagebytes),'oldIds':{k:v['id']for k,v in pre['containers'].items()},'sameRDS':True,'automaticReplayAllowed':False})
 new={};plans={};mounts={};terminal=[];published=False;oldNetUnixFD=None;socketPreimages={}
 def journal(n,v):put(OUT/n,v)
 def stop_units():
  q['cmd'](['/usr/bin/systemctl','stop',*UNITS],timeout=45)
  for n in UNITS:
   state=q['show'](n);need(state['MainPID']=='0'and state['ActiveState']in('inactive','failed'),'EXACT_OWN_UNIT_TERMINAL_REQUIRED')
   cg=Path('/sys/fs/cgroup/system.slice')/n
   if cg.exists():need(all(not p.read_text().strip()for p in cg.rglob('cgroup.procs')),'OWN_UNIT_CGROUP_PHYSICALLY_EMPTY')
 def create(role):
  payload,expected=projection['payload'](pre['containers'][role],role,new.get('member'))
  if role=='member':payload['NetworkingConfig']={'EndpointsConfig':ep}
  if False: # Pure42 projection already selects the sole new registry mirror.
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
  PHASE='JOURNALLED_OWN42_SDK_REGISTRY_MIRROR'
  journal('SDK_REGISTRY42_MIRROR_INTENT.json',{'path':str(REGISTRY),'sha256':sha(registryRaw),'bytes':len(registryRaw),'previousRegistryUnchanged':True,'automaticReplayAllowed':False})
  put(REGISTRY,registryRaw,0o644);journal('SDK_REGISTRY42_MIRROR_ACK.json',{'path':str(REGISTRY),'sha256':sha(stable(REGISTRY,8388608)),'exclusiveNewFile':True})
  journal('COMMON49_SOURCE_PRESERVED_ACTUAL.json',{'path':str(commonSource),'sha256':sha(stable(commonSource,131072)),'existingSourceUnchanged':True})
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
  oldNs=int(pre['containers']['member']['netns'].split('[')[1][:-1]);need(not namespace_holders(oldNs),'ALL_OLD_NAMESPACE_PROCESSES_TERMINAL_BEFORE_ENDPOINT_RELEASE')
  for n,path in PATHS.items():
   need(sha(stable(path))==pre['controlsSHA256'][n],'CURRENT11_CONTROL_ARCHIVE_CAS');st=path.lstat();journal(n+'.ARCHIVE_INTENT.json',{'sha256':pre['controlsSHA256'][n],'device':st.st_dev,'inode':st.st_ino});os.rename(path,OUT/('prior11-'+n));sync(path.parent);sync(OUT);journal(n+'.ARCHIVE_ACK.json',{'sha256':pre['controlsSHA256'][n],'device':st.st_dev,'inode':st.st_ino})
  PHASE='OLD_ENDPOINTS_AND_NEW_CONTAINERS'
  for network in ep:
   journal('DISCONNECT_'+sha(network.encode())[:12]+'.INTENT.json',{'network':network,'oldMember':pre['containers']['member']['id']})
   u['api']('POST','/networks/'+urllib.parse.quote(network,safe='')+'/disconnect',{'Container':pre['containers']['member']['id'],'Force':False})
  create('member');member=start('member');need(default_gateway(member['State']['Pid'])==originalGateway,'ACTUAL_NEW_MEMBER_DEFAULT_GATEWAY_PRESERVED')
  actualnets=member['NetworkSettings']['Networks'];need(set(actualnets)==set(ep)and all(actualnets[n]['NetworkID']==pre['containers']['member']['NetworkSettings']['Networks'][n]['NetworkID']and actualnets[n]['IPAddress']==ep[n]['IPAMConfig']['IPv4Address']and actualnets[n].get('GwPriority',0)==ep[n]['GwPriority']for n in ep),'ALL_CURRENT_NETWORK_IP_PRIORITY_PARITY_REQUIRED')
  guestmeta=subprocess.run(['/usr/bin/docker','--config',r['emptyDockerConfig'],'exec','--user','1000:1000',new['member'],'node','-e',"const f=require('fs'),p='/run/crays/member-code/nextcloud-original-member-document-principal.private.json';const s=f.lstatSync(p);if(!s.isFile()||s.uid!==1000||s.gid!==1000||(s.mode&511)!==384||s.nlink!==1)process.exit(1);f.accessSync(p,f.constants.R_OK);process.stdout.write('ORIGINAL_PRINCIPAL_GUEST_CUSTODY_READABLE')"],capture_output=True,timeout=10)
  need(guestmeta.returncode==0 and not guestmeta.stderr and guestmeta.stdout==b'ORIGINAL_PRINCIPAL_GUEST_CUSTODY_READABLE','EXACT_ORIGINAL_PRINCIPAL_GUEST_BIND_READ_ACCESS_REQUIRED');journal('ORIGINAL_PRINCIPAL_GUEST_ACCESS_ACTUAL.json',{'uid':1000,'mode':'0600','readable':True,'bodyRead':False})
  # The only anonymous precommit probe uses the original helper, actual new BuildID.
  deadline=time.monotonic()+45
  while True:
   probe=subprocess.run(['/usr/bin/docker','--config',r['emptyDockerConfig'],'exec',new['member'],'node','-e',"const n=require('net').connect(8991,'127.0.0.1',()=>n.end());n.on('error',()=>process.exitCode=1)"],capture_output=True,timeout=5)
   if probe.returncode==0:break
   need(time.monotonic()<deadline,'MEMBER51_NATIVE8991_START_TIMEOUT');time.sleep(.3)
  probeBody=stable(H/'member26-original-anonymous-auth0-probe.cjs',32768)
  ans=subprocess.run(['/usr/bin/docker','--config',r['emptyDockerConfig'],'exec','-i',new['member'],'node'],input=probeBody,capture_output=True,timeout=140)
  need(ans.returncode==0 and not ans.stderr and len(ans.stdout)<8192,'ORIGINAL_ANONYMOUS_AUTH0_BOUNDARIES_REQUIRED');proof=json.loads(ans.stdout)
  need(proof['status']=='CANONICAL_MEMBER_PRIVATE_ANONYMOUS_BOUNDARIES_AND_ORIGINAL_SDK_TRANSACTION_PASS'and proof['buildId']==BID and proof['customerCoreReadOrWritePerformed']is False,'REAL_NEW_MEMBER_BUILD_ORIGINAL_AUTH_BOUNDARY_REQUIRED');journal('MEMBER51_ANONYMOUS_ACTUAL.json',proof)
  create('work');create('common');install_owned_witness42(new['member'],pre,q,journal)
  PHASE='ORIGINAL_GO_NETWORK_NAMESPACE_REBIND'
  ns=Path('/run/crays/nostr-core-runtime-v1/network/common.netns');oldns=os.stat(ns);need(oldns.st_ino==int(pre['containers']['member']['netns'].split('[')[1][:-1]),'EXACT_OLD_GO_NAMESPACE_MOUNT_REQUIRED')
  ap=q['process'](member['State']['Pid']);proc=Path('/proc',str(ap['pid']),'ns/net')
  journal('GO_NETNS_REBIND_INTENT.json',{'oldDevice':oldns.st_dev,'oldInode':oldns.st_ino,'newMember':new['member'],'newPID':ap['pid'],'newStartTicks':ap['startTicks'],'newNamespaceInode':proc.stat().st_ino})
  q['cmd'](['/usr/bin/umount',str(ns)],timeout=5);base=ns.lstat();need(stat.S_ISREG(base.st_mode)and base.st_uid==0 and not base.st_mode&0o077,'OWN_GO_NETNS_PLACEHOLDER_CUSTODY_REQUIRED')
  q['cmd'](['/usr/bin/mount','--bind',str(proc),str(ns)],timeout=5);need((ns.stat().st_dev,ns.stat().st_ino)==(proc.stat().st_dev,proc.stat().st_ino),'ACTUAL_NEW_MEMBER_GO_NETNS_SAME_INODE');journal('GO_NETNS_REBOUND_ACTUAL.json',{'newMember':new['member'],'newNamespaceInode':proc.stat().st_ino,'sameUnitPathAndAllUnitBytesPreserved':True})
  work=start('work');workProcess=q['process'](work['State']['Pid']);fresh()
  for role in('member','work','common'):
   oldid=pre['containers'][role]['id'];oldname=pre['containers'][role]['Name'].lstrip('/')
   need(not u['inspect'](oldid)['State']['Running'],'OLD_FAMILY_REMAINS_TERMINAL_REQUIRED')
   journal(role+'_NAME_COMMIT_INTENT.json',{'oldId':oldid,'newId':new[role],'oldName':oldname})
   u['api']('POST','/containers/'+oldid+'/rename?name='+urllib.parse.quote(oldname+'-before-member51',safe=''),statuses=(204,));need(u['inspect'](oldid)['Name']=='/'+oldname+'-before-member51','EXACT_OLD_NAME_COMMIT_ACK')
   u['api']('POST','/containers/'+new[role]+'/rename?name='+urllib.parse.quote(oldname,safe=''),statuses=(204,));need(u['inspect'](new[role])['Name']=='/'+oldname,'EXACT_NEW_NAME_COMMIT_ACK')
  # Canonical-name commit precedes final alias proof; only Docker own CID aliases normalize.
  memberNow=u['inspect'](new['member']);memberNets=memberNow['NetworkSettings']['Networks'];need(set(memberNets)==set(ep),'EXACT_FIVE42_NETWORK_SET')
  for network,e in ep.items():
   actualAliases=memberNets[network].get('Aliases')or[];plannedAliases=e.get('Aliases')or[]
   need(all(isinstance(v,str)for v in actualAliases+plannedAliases),'EXACT_STRING_NETWORK_ALIASES')
   ownIds={new['member'],new['member'][:12]}
   need(sorted(set(v for v in actualAliases if v not in ownIds))==sorted(set(v for v in plannedAliases if v not in ownIds)),'EXACT_DECLARED42_NETWORK_ALIAS_PARITY')
  journal('FIVE_NETWORK_ALIAS_PARITY_ACTUAL.json',{'allFiveAliasesMatchDeclaredCreatePayload':True,'onlyOwnDockerCIDAliasNormalization':True})
  PHASE='ORIGINAL_FULL_COMMON_AND_SDK_GENERATION'
  context={'newMember':new['member'],'newCommon':new['common'],'newWork':new['work'],'expectedCommon':plans['common'],'expectedCommonMounts':mounts['common'],'originalCommon':pre['containers']['common'],'familyPreimage':pre,'registryRow':release['registry'],'output':str(OUT/'generation'),'parentOutput':str(OUT),'newMemberProcess':ap,'newWorkProcess':workProcess,'expectedWork':plans['work'],'expectedWorkMounts':mounts['work'],'oldNetUnixFD':oldNetUnixFD,'socketPreimages':socketPreimages,'previousRegistryRow':pre['registryRow'],'commonSourceRow':release['commonSource']}
  finish=runpy.run_path(str(H/'finish_current_member51_generation.candidate.py'));generation=finish['finish'](r,cr,context)
  published=True;PHASE='NATIVE_FAMILY_DURABLE_COMMIT'
  journal('RESULT_ACTUAL.json',{'status':'MEMBER51_IMMUTABLE_RELEASE_AND_ORIGINAL_FULL_SDK_GENERATION_COMMITTED_INGRESS_REOPEN_PENDING','oldIds':{k:v['id']for k,v in pre['containers'].items()},'newIds':new,'buildId':BID,'build42ActualSHA256':BUILD_SHA,'originalPrincipalUIDPasswordProviderAndTestScopePreserved':True,'customerAuth0DocumentS3Acceptance':False,'otherIndependentNextcloudAndWebsitesUntouched':True,'sharedIngressReopened':False,'generation':generation,'automaticReplayAllowed':False})
  return {'status':'MEMBER51_FAMILY_COMMITTED_ROOT_INGRESS_REOPEN_PENDING','newIds':new,'buildId':BID,'customerAcceptance':False}
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


WITNESS='crays-chuck-core-currentness.service'
WITNESS_OLD=Path('/srv/crays/releases/member-original-context46-20261109-01/witness-currentness42/serve_exact_member46_common_currentness.py')
WITNESS_PROPS=['User','Group','InaccessiblePaths','BindReadOnlyPaths','BindPaths','ReadOnlyPaths','TemporaryFileSystem','RootDirectory','RootImage','ProtectSystem','CapabilityBoundingSet','NoNewPrivileges','DropInPaths','FragmentPath']
CURRENT_IDS={'member':'2676bc4d4a5f73d96da75fe94166e2adb024542ca1ac0a8d3effe0568a736d9a','common':'a02f02d380da1f1f3964356c7040716868420d11552c19703bc5a4f799ea74e5','work':'79e8075fc39266ced0c45b8c41ffc64232e3d00cb837df88478fe8f8968359a6'}
def witness_properties():
 answer=subprocess.run(['/usr/bin/systemctl','show',WITNESS,'--property='+','.join(WITNESS_PROPS)],capture_output=True,text=True,timeout=10)
 need(answer.returncode==0,'EXACT_CURRENT_WITNESS_PROPERTIES');return dict(v.split('=',1)for v in answer.stdout.splitlines()if'='in v)
def witness_argv():
 answer=subprocess.run(['/usr/bin/systemctl','show',WITNESS,'--property=ExecStart','--value'],capture_output=True,text=True,timeout=10)
 need(answer.returncode==0 and answer.stdout.count('argv[]=')==1,'ONE_EXACT_WITNESS_COMMAND');return answer.stdout.split('argv[]=',1)[1].split(' ; ignore_errors=',1)[0]
def namespace_holders(inode):
 rows=[]
 for p in Path('/proc').iterdir():
  if not p.name.isdigit():continue
  try:
   if (p/'ns/net').stat().st_ino==inode:rows.append({'pid':int(p.name),'ticks':p.joinpath('stat').read_text().rsplit(')',1)[1].split()[19],'cgroup':p.joinpath('cgroup').read_text().strip()})
  except (FileNotFoundError,ProcessLookupError):continue
 return rows
def capture(r):
 own('capture',r);current50_binding();u,q,_=modules();need(not PRE.exists(),'NEW_CURRENT51_PREIMAGE_ONLY')
 pre={'containers':{},'units':{},'unitFilesSHA256':{},'controlsSHA256':{}}
 for role,cid in CURRENT_IDS.items():
  c=u['inspect'](cid);need(c['Id']==cid and c['State']['Running'],'CURRENT42_ORIGINAL_FAMILY')
  c['id']=cid;c['process']=q['process'](c['State']['Pid']);c['netns']=os.readlink(Path('/proc',str(c['State']['Pid']),'ns/net'));pre['containers'][role]=c
 for name in UNITS:
  pre['units'][name]=q['show'](name)
  raw=subprocess.check_output(['/usr/bin/systemctl','show',name,'--property=FragmentPath','--property=DropInPaths'],text=True,timeout=10)
  props=dict(v.split('=',1)for v in raw.splitlines()if'='in v)
  import shlex
  for path in [props['FragmentPath'],*shlex.split(props['DropInPaths'])]:
   if path:pre['unitFilesSHA256'][path]=sha(stable(path,2097152))
 for name,path in PATHS.items():pre['controlsSHA256'][name]=sha(stable(path))
 registry=next(m['Source']for m in pre['containers']['common']['Mounts']if m['Destination']=='/srv/crays/runtime/common-canonical-20261106-01/MODULE_REGISTRY.json')
 raw=stable(registry,8388608);pre['registryRow']={'path':registry,'sha256':sha(raw),'bytes':len(raw)}
 pre['witnessProperties']=witness_properties();pre['witnessArgv']=witness_argv()
 pre['witnessSourceSHA256']=sha(stable(WITNESS_OLD,131072))
 ns=Path('/proc',str(pre['containers']['member']['process']['pid']),'ns/net').stat().st_ino
 holders=namespace_holders(ns)
 allowed=tuple('/'+v for v in CURRENT_IDS.values())+tuple('/'+v for v in UNITS)
 allowed+=tuple('/system.slice/docker-'+v+'.scope' for v in CURRENT_IDS.values())
 need(all(any(x in row['cgroup']for x in allowed)for row in holders),'FOREIGN_NAMESPACE_HOLDER_BLOCKS_SWITCH')
 pre['namespaceHolders']=holders
 pre['observedAtUnix']=time.time();pre['edgeFileSHA256']=sha(stable('/srv/crays/runtime/private-edge-caddy-20261106-03/Caddyfile.private',65536))
 current50_binding(pre);put(PRE,pre);return {'status':'CURRENT51_PRIVATE_PREIMAGE_CAPTURED_NO_RUNTIME_CHANGE','preimagePath':str(PRE),'preimageSHA256':sha(stable(PRE,16777216,True)),'ids':CURRENT_IDS}
def install_owned_witness42(new_member,pre,q,journal):
 need(re.fullmatch('[a-f0-9]{64}',new_member)and new_member not in CURRENT_IDS.values(),'ACTUAL_NEW42_MEMBER_CID')
 need(witness_properties()==pre['witnessProperties'] and witness_argv()==pre['witnessArgv']=='/usr/bin/python3 -I -B '+str(WITNESS_OLD),'CURRENT07_WITNESS_EXACT_PREIMAGE')
 props=pre['witnessProperties']
 need(props['User']==props['Group']=='root' and props['ProtectSystem']=='strict' and props['NoNewPrivileges']=='yes' and props['CapabilityBoundingSet']=='cap_chown cap_fowner','ORIGINAL_WITNESS_SANDBOX_PRESERVED')
 need(q['show'](WITNESS)['MainPID']=='0','WITNESS_PHYSICALLY_STOPPED_BEFORE_ARGV_CHANGE')
 original=stable(WITNESS_OLD,131072);need(sha(original)==pre['witnessSourceSHA256'] and original.count(CURRENT_IDS['member'].encode())==1,'ONE_ORIGINAL07_ANCHOR_LITERAL')
 updated=original.replace(CURRENT_IDS['member'].encode(),new_member.encode(),1)
 directory=RELEASE/'witness-currentness51';need(not directory.exists(),'OWN42_WITNESS_SOURCE_ABSENT');directory.mkdir(mode=0o755);os.chmod(directory,0o755)
 script=directory/'serve_exact_member51_common_currentness.py';put(script,updated,0o444)
 drop=Path('/etc/systemd/system/crays-chuck-core-currentness.service.d/zzzzz.member51-owned-anchor.conf')
 need(not os.path.lexists(drop),'OWN42_WITNESS_DROPIN_ABSENT')
 raw=('[Service]\nExecStart=\nExecStart=/usr/bin/python3 -I -B '+str(script)+'\n').encode()
 journal('WITNESS42_SOURCE_AND_DROPIN_INTENT.json',{'originalSHA256':sha(original),'newSHA256':sha(updated),'newMember':new_member,'dropin':str(drop),'dropinSHA256':sha(raw),'onlyOneAdmittedAnchorLiteralAndArgvPathChanged':True})
 put(drop,raw,0o444);q['cmd'](['/usr/bin/systemctl','daemon-reload'],timeout=15)
 after=witness_properties();need(all(after[k]==props[k]for k in WITNESS_PROPS if k!='DropInPaths')and after['DropInPaths']==props['DropInPaths']+' '+str(drop)and witness_argv()=='/usr/bin/python3 -I -B '+str(script),'EXACT42_WITNESS_ONLY_SOURCE_PATH_DROPIN')
 journal('WITNESS42_SOURCE_AND_DROPIN_ACTUAL.json',{'sourceSHA256':sha(updated),'dropinSHA256':sha(raw),'sameSandboxAndOriginalValidators':True,'started':False})

if __name__=='__main__':
 try:
  r=json.loads(stable(sys.argv[1],131072,True));phase=sys.argv[2];need(phase in('capture','adopt'),'EXACT42_PHASE');PRE_SHA=r.get('preimageSHA256');print(json.dumps(capture(r)if phase=='capture'else adopt(r)))
 except BaseException as e:print(json.dumps({'status':'MEMBER51_STOP_NO_REPLAY','phase':PHASE,'guard':str(e)if isinstance(e,RuntimeError)else None,'errorClass':type(e).__name__,'privateValuesReturned':False}));raise SystemExit(1)
