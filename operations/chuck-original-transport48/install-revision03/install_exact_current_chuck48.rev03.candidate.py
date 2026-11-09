"""Root-only finite current Member46 family adoption; no build/stage/DB/provider changes. Derived from proven26 physical lifecycle and35 source-generation logic; no replay of prior failed intents."""
from pathlib import Path
import os,stat,json,hashlib,runpy,subprocess,sys,time,copy,urllib.parse,signal,socket,struct,re
H=Path(__file__).resolve().parent
COMMON=Path('/srv/crays/migration-work/20261108/root/common11-source-author01')
PRE=H/'CURRENT_FAMILY42_PREIMAGE.private.json'
PRE_SHA=None
BUILD_SHA=None
BID=None
RELEASE=Path('/srv/crays/releases/member-original-context46-20261109-01')
REGISTRY=Path('/srv/crays/releases/nostr-original-core-addon-20261108-18/common-machine57/MODULE_REGISTRY.member46.json')
OUT=Path('/srv/crays/acceptance/chuck48-family-adoption-20261109-01')
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
 unit='crays-chuck48-'+phase+'-20261109-01.service';cg=Path('/sys/fs/cgroup')/Path('/proc/self/cgroup').read_text().strip().split(':',2)[-1].lstrip('/')
 need(cg.name==unit and int((cg/'memory.max').read_text())<=1073741824 and int((cg/'memory.swap.max').read_text())==0 and int((cg/'pids.max').read_text())<=128,'EXACT_PHASE26_RESOURCE_CGROUP_REQUIRED')
 quota,period=(cg/'cpu.max').read_text().split();need(quota!='max'and int(quota)/int(period)<=.5,'FINITE_HALF_CPU_REQUIRED')

 fence=stable('/srv/crays/migration-work/20261108/root/ROOT_HEAVY_ATTEMPT_ACTIVE.json',16384,True);need(sha(fence)==r['rootHeavyFenceSHA256']and json.loads(fence).get('unit')==unit,'EXACT_OWN42_ROOT_WINDOW_FENCE')


def modules():
 need(sha(stable(COMMON/'coordinate_full_common_generation25.candidate.py',65536))=='d4c4cd040b449821e285b89ba8d2f8de6774449c1cf1485f131ccbd26b2c570d','ORIGINAL_COMMON11_SOURCE_REQUIRED')
 m=json.loads(stable(COMMON/'SOURCE_MANIFEST_COMMON11.json'))
 for name,h in m['files'].items():
  if name.endswith('.py'):need(sha(stable(COMMON/name,131072))==h,'ORIGINAL53_DERIVER_AND_HELPER_PINS_REQUIRED')
 return runpy.run_path(str(COMMON/'qualified_container_physical.py')),runpy.run_path(str(COMMON/'qualified53_exact_helpers.py')),runpy.run_path(str(H/'project_exact_member46_successor_payloads.candidate.py'))


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



IDS={'member':'2676bc4d4a5f73d96da75fe94166e2adb024542ca1ac0a8d3effe0568a736d9a','work':'79e8075fc39266ced0c45b8c41ffc64232e3d00cb837df88478fe8f8968359a6','common':'011e92f2cd77c631b60b2e4cc7d008dc0e36ff9b169f9ae59a59abe4836544fc'}
CURRENT_RECEIPT=Path('/srv/crays/acceptance/member46-family-adoption-20261109-01/RESULT_ACTUAL.json')
CURRENT_RECEIPT_SHA='2676cc795e2b0a49a51af4ef9a6433f54ffdf1382111a07749aeff32bb068f3a'
OLD_LISTENER=Path('/srv/crays/releases/nostr-original-core-addon-20261108-18/common-machine57/listener.nostr18-machine57.candidate.mjs')
NEW_LISTENER=OLD_LISTENER.parent/'listener.chuck-original-transport48.candidate.mjs'
GUEST='/run/crays/common-private-edge-listener.mjs'
PRODUCTS49=[('common-host.native-graphql49.candidate.cjs', '/srv/crays/releases/nostr-original-core-addon-20261108-18/common-machine57/common-host.native-graphql49.candidate.cjs', 'f726cd9fb8a44309408da26f5d1ad621ef8de127028cf2d9f2b4fa09f44742f1', '/srv/crays/releases/common-canonical-20261106-01/common/common-host.cjs', '/srv/crays/releases/nostr-original-core-addon-20261108-18/common-machine57/common-host.membership-title47.candidate.cjs', '822fab2fc20aba7cd6cd45e50089efaf8756425a5695db215eca2311b4ddb1d4'), ('serve-original-host.native-graphql49.candidate.mjs', '/srv/crays/releases/nostr-original-core-addon-20261108-18/runtime-core-adoption18-executable/serve-original-host.native-graphql49.candidate.mjs', '6541b66ceb48214977bb8b584bb54975238041155b4788714386cd9312ce829c', '/srv/crays/releases/common-canonical-20261106-01/runtime-source/src/chuck/server/serve-original-host.mjs', '/srv/crays/releases/nostr-original-core-addon-20261108-18/runtime-core-adoption18-executable/serve-original-host.membership47.candidate.mjs', '0ad8a6ba71c37e8d28bce7cab8d3b740188cbbe2eebdaca30f621870a1a9138e')]
def install(r):
 global PHASE
 own('install',r)
 need(r.get('githubExactByteAckVerified') is True and sha(stable(r['githubAckEvidencePath'],131072,True))==r['githubAckEvidenceSHA256'],'ACTUAL_EXACT_GIT_BYTE_ACK')
 need(not OUT.exists() and not os.path.lexists(NEW_LISTENER),'ONE_OWN_ATTEMPT_AND_PUBLIC_ADDON_ABSENT')
 raw=stable(CURRENT_RECEIPT,131072,True);need(sha(raw)==CURRENT_RECEIPT_SHA,'EXACT_ACTUAL_FULL46_RUNTIME')
 receipt=json.loads(raw);need(receipt['newIds']==IDS and receipt['generation']['status']=='MEMBER46_ORIGINAL_FULL_SOURCE_GENERATION_READY','EXACT_FULL46_FAMILY_IDS')
 source=stable(H/'listener.chuck-original-transport.candidate.mjs',131072);need(sha(source)=='30376559572bf19be05d3e1b724c20de026455361e0cd7e1d749b1056e2aa777' and sha(stable(OLD_LISTENER,131072))=='7e8b668caf10118d84082f8fd68a63e390a3ee36a2e0da7b022a06d7203fa5bb','EXACT_OLD_AND_REVIEWED_NEW_LISTENER')
 for name,target,pin,guest,oldpath,oldpin in PRODUCTS49:
  need(not os.path.lexists(target) and sha(stable(H/name,131072))==pin and sha(stable(oldpath,131072))==oldpin,'EXACT_COMMON49_SERVE49_SOURCE_PREIMAGES')
 crraw=stable(r['originalCommon11RootReviewPath'],131072,True);need(sha(crraw)==r['originalCommon11RootReviewSHA256'],'ORIGINAL_COMMON11_ROOT_AUTHORITY');cr=json.loads(crraw)
 need(cr['executionApproved'] is True and cr['controllerSHA256']=='d4c4cd040b449821e285b89ba8d2f8de6774449c1cf1485f131ccbd26b2c570d','ORIGINAL_COMMON11_APPROVED_INPUTS')
 ingress=stable(r['ingressClosedActualPath'],131072,True);iv=json.loads(ingress);need(sha(ingress)==r['ingressClosedActualSHA256'] and iv['memberCommonWorkPrivateIngressClosed'] is True and iv['allOtherSitesPreserved'] is True and iv['sharedEdgeOwnedByRoot'] is True,'ACTUAL_SCOPED_INGRESS_CLOSED')
 # These exact original helper bytes are already source-qualified by the retained original manifest.
 manifest=json.loads(stable(COMMON/'SOURCE_MANIFEST_COMMON11.json'))
 for n,h in manifest['files'].items():
  if n.endswith('.py'):need(sha(stable(COMMON/n,131072))==h,'ORIGINAL_COMMON_HELPERS_UNCHANGED')
 u=runpy.run_path(str(COMMON/'qualified_container_physical.py'));q=runpy.run_path(str(COMMON/'qualified53_exact_helpers.py'));verifier=runpy.run_path(str(H/'member46_lifecycle.candidate.py'))
 pre={'containers':{},'units':{},'unitFilesSHA256':{},'controlsSHA256':{}}
 import shlex
 for role,cid in IDS.items():
  c=u['inspect'](cid);need(c['Id']==cid and c['State']['Running'],'EXACT_CURRENT_RUNNING_FAMILY');c['id']=cid;c['process']=q['process'](c['State']['Pid']);c['netns']=os.readlink(Path('/proc',str(c['State']['Pid']),'ns/net'));pre['containers'][role]=c
 need(len({c['netns']for c in pre['containers'].values()})==1,'ONE_CURRENT_MEMBER_WORK_COMMON_NAMESPACE')
 nsPath=Path('/run/crays/nostr-core-runtime-v1/network/common.netns');m=pre['containers']['member'];need(nsPath.stat().st_ino==int(m['netns'].split('[')[1][:-1]),'EXACT_EXISTING_GO_MEMBER_NAMESPACE_BIND')
 for name in UNITS:
  pre['units'][name]=q['show'](name);need(pre['units'][name]['ActiveState']=='active' and int(pre['units'][name]['MainPID'])>0,'ORIGINAL_SIX_MANAGER_UNITS_ACTIVE')
  text=q['cmd'](['/usr/bin/systemctl','show',name,'--property=FragmentPath','--property=DropInPaths'],timeout=10).decode();props=dict(x.split('=',1)for x in text.splitlines()if'='in x)
  for p in [props['FragmentPath'],*shlex.split(props['DropInPaths'])]:
   if p:pre['unitFilesSHA256'][p]=sha(stable(p,2097152))
 need(pre['units'][UNITS[0]]['InvocationID']==receipt['generation']['sdk']['invocationId'] and int(pre['units'][UNITS[0]]['MainPID'])==receipt['generation']['sdk']['pid'],'CURRENT_FULL46_SDK_GENERATION')
 for n,path in PATHS.items():pre['controlsSHA256'][n]=sha(stable(path,131072));need(pre['controlsSHA256'][n]==receipt['generation']['controlsSHA256'][n],'ACTUAL_CURRENT_FOUR_CONTROL_CHAIN')
 def preserved():
  for role in ('member','work'):
   p=pre['containers'][role];c=u['inspect'](p['id'])
   need(c['State']['Running'] and q['process'](c['State']['Pid'])==p['process'] and os.readlink(Path('/proc',str(c['State']['Pid']),'ns/net'))==p['netns'],'MEMBER_WORK_PROCESS_AND_NETNS_PRESERVED')
   need(all(u['canon'](c[k])==u['canon'](p[k])for k in ('Config','HostConfig','Mounts','NetworkSettings')),'MEMBER_WORK_CONFIG_AND_NETWORKS_PRESERVED')
  need(nsPath.stat().st_ino==int(m['netns'].split('[')[1][:-1]),'GO_NAMESPACE_BIND_PRESERVED')
 preserved()
 # Registry and every existing source row are admitted again by the finisher before any new generation starts.
 regMount=[x for x in pre['containers']['common']['Mounts']if x['Destination']=='/srv/crays/runtime/common-canonical-20261106-01/MODULE_REGISTRY.json'];need(len(regMount)==1 and regMount[0]['Source']==str(REGISTRY) and regMount[0]['RW'] is False,'UNCHANGED_FULL46_REGISTRY_MOUNT')
 rb=stable(REGISTRY,8388608);registry={'path':str(REGISTRY),'sha256':sha(rb),'bytes':len(rb)}
 need(json.loads(rb)['member']['buildId']=='LbgKfWM3XAR5fr7rTk3b6','UNCHANGED_ACTUAL46_MEMBER_BUILD')
 old=pre['containers']['common'];cfgkeys=runpy.run_path(str(H/'project_exact_member46_recovery_payloads.candidate.py'))['CONFIG_KEYS']
 payload={k:copy.deepcopy(v)for k,v in old['Config'].items()if k in cfgkeys};payload.pop('Hostname',None);payload.pop('Domainname',None);payload.pop('ExposedPorts',None);host=copy.deepcopy(old['HostConfig']);need(host['NetworkMode']=='container:'+IDS['member'],'SAME_MEMBER_NETWORK_ANCHOR')
 expected={x['Destination']:(x['Source'],x['RW'],x['Type'])for x in old['Mounts']};need(len(expected)==len(old['Mounts']) and expected[GUEST]==(str(OLD_LISTENER),False,'bind'),'SOLE_READONLY_LISTENER_PREIMAGE')
 changed=0
 for row in host.get('Mounts')or[]:
  if row.get('Target')==GUEST:need(row['Source']==str(OLD_LISTENER) and row.get('ReadOnly') is True,'EXACT_LISTENER_MOUNT_PREIMAGE');row['Source']=str(NEW_LISTENER);changed+=1
 for i,b in enumerate(host.get('Binds')or[]):
  parts=b.split(':')
  if parts[1]==GUEST:need(parts[0]==str(OLD_LISTENER) and parts[2]=='ro','EXACT_LISTENER_BIND_PREIMAGE');parts[0]=str(NEW_LISTENER);host['Binds'][i]=':'.join(parts);changed+=1
 need(changed==1,'EXACT_ONE_LISTENER_MOUNT_DELTA');expected[GUEST]=(str(NEW_LISTENER),False,'bind');payload['HostConfig']=host
 for name,target,pin,guest,oldpath,oldpin in PRODUCTS49:
  need(expected[guest]==(oldpath,False,'bind'),'EXACT_CURRENT49_READONLY_MOUNT_PREIMAGE');count=0
  for row in host.get('Mounts')or[]:
   if row.get('Target')==guest:need(row['Source']==oldpath and row.get('ReadOnly') is True,'EXACT_CURRENT49_MOUNT_SOURCE');row['Source']=target;count+=1
  for i,b in enumerate(host.get('Binds')or[]):
   parts=b.split(':')
   if parts[1]==guest:need(parts[0]==oldpath and parts[2]=='ro','EXACT_CURRENT49_BIND_SOURCE');parts[0]=target;host['Binds'][i]=':'.join(parts);count+=1
  need(count==1,'ONE_COMMON49_OR_SERVE49_MOUNT_ONLY');expected[guest]=(target,False,'bind')
 name=old['Name'].lstrip('/')+'-chuck48-candidate';absent=u['api']('GET','/containers/'+urllib.parse.quote(name,safe='')+'/json',statuses=(200,404));need(not isinstance(absent,dict)or'Id'not in absent,'NO_PRIOR_COMMON48_ATTEMPT')
 OUT.mkdir(mode=0o700);sync(OUT.parent)
 def journal(n,v):put(OUT/n,v)
 journal('INTENT.json',{'status':'CURRENT_FULL46_CHUCK48_LISTENER_ONLY_INSTALL_ONCE','currentFamilyReceiptSHA256':CURRENT_RECEIPT_SHA,'existingIds':IDS,'memberWorkPreserved':True,'automaticReplayAllowed':False})
 journal('CURRENT_FAMILY48_PREIMAGE.private.json',pre);journal('COMMON_CREATE_INTENT.private.json',{'name':name,'payload':payload,'expectedMounts':expected})
 socketPreimages={}
 for text in ['/run/crays/nostr-core-runtime-v1/policy/policy.sock','/run/crays/nostr-core-runtime-v1/registry/control.sock','/run/crays-chuck-core-currentness/status.sock']:
  value=None
  if os.path.lexists(text):
   st=Path(text).lstat();need(stat.S_ISSOCK(st.st_mode)and st.st_uid==st.st_gid==1000 and stat.S_IMODE(st.st_mode)==0o600 and st.st_nlink==1,'ORIGINAL_CURRENT_SOCKET_CUSTODY');value=[st.st_dev,st.st_ino,st.st_uid,st.st_gid,stat.S_IMODE(st.st_mode),st.st_nlink]
  socketPreimages[text]=value
 newcid=None;oldfd=None;published=False
 def stop_units():
  q['cmd'](['/usr/bin/systemctl','stop',*UNITS],timeout=45)
  for n in UNITS:
   state=q['show'](n);need(state['MainPID']=='0'and state['ActiveState']in('inactive','failed'),'EXACT_SIX_UNITS_STOPPED')
   cg=Path('/sys/fs/cgroup/system.slice')/n
   if cg.exists():need(all(not x.read_text().strip()for x in cg.rglob('cgroup.procs')),'EXACT_SIX_CGROUPS_EMPTY')
 signal.signal(signal.SIGTERM,lambda*a:(_ for _ in()).throw(KeyboardInterrupt()));signal.signal(signal.SIGINT,lambda*a:(_ for _ in()).throw(KeyboardInterrupt()))
 try:
  PHASE='PUBLISH_VERSIONED_LISTENER_ONCE';journal('PUBLIC_ADDON_INTENT.json',{'path':str(NEW_LISTENER),'sha256':sha(source),'bytes':len(source)});put(NEW_LISTENER,source,0o644);journal('PUBLIC_ADDON_ACK.json',{'sha256':sha(stable(NEW_LISTENER,131072))})
  for index,(name,target,pin,guest,oldpath,oldpin)in enumerate(PRODUCTS49):
   b=stable(H/name,131072);journal('PRODUCT49_'+str(index)+'_PUBLICATION_INTENT.json',{'path':target,'sha256':pin,'bytes':len(b)});put(Path(target),b,0o644);need(sha(stable(target,131072))==pin,'EXACT_PRODUCT49_PUBLISHED_BYTES');journal('PRODUCT49_'+str(index)+'_PUBLICATION_ACK.json',{'path':target,'sha256':pin,'exclusiveNewFile':True})
  oldfd=os.open('/proc/'+str(m['process']['pid'])+'/net/unix',os.O_RDONLY|os.O_NOFOLLOW)
  PHASE='SIX_UNITS_AND_OLD_COMMON_PHYSICAL_STOP';stop_units();need(u['halt'](old['id'],u['physical'](u['inspect'](old['id']))),'OLD_COMMON_PHYSICALLY_TERMINAL');preserved();journal('OLD_COMMON_TERMINAL.json',{'id':old['id'],'physicalReturned':True,'memberWorkStillSameProcesses':True})
  for n,path in PATHS.items():
   need(sha(stable(path,131072))==pre['controlsSHA256'][n],'ACTUAL_CURRENT_CONTROL_ARCHIVE_CAS');st=path.lstat();journal(n+'.ARCHIVE_INTENT.json',{'sha256':pre['controlsSHA256'][n],'device':st.st_dev,'inode':st.st_ino});os.rename(path,OUT/('prior11-'+n));sync(path.parent);sync(OUT);journal(n+'.ARCHIVE_ACK.json',{'sha256':pre['controlsSHA256'][n],'device':st.st_dev,'inode':st.st_ino})
  PHASE='CREATE_COMMON48_ONLY'
  try:newcid=u['api']('POST','/containers/create?name='+urllib.parse.quote(name,safe=''),payload)['Id']
  except BaseException:
   found=u['api']('GET','/containers/'+urllib.parse.quote(name,safe='')+'/json',statuses=(200,404))
   if isinstance(found,dict)and'Id'in found:newcid=found['Id'];verifier['admit_created'](u,newcid,payload,expected,'common',old,IDS['member'])
   raise
  c=verifier['admit_created'](u,newcid,payload,expected,'common',old,IDS['member']);need(not c['State']['Running']and c['State']['Pid']==0,'COMMON48_CREATED_STOPPED');journal('COMMON_CREATED.json',{'id':newcid,'mountDeltas':[GUEST,*[row[3]for row in PRODUCTS49]]})
  canonical=old['Name'].lstrip('/');journal('COMMON_NAME_COMMIT_INTENT.json',{'oldId':old['id'],'newId':newcid,'canonical':canonical});u['api']('POST','/containers/'+old['id']+'/rename?name='+urllib.parse.quote(canonical+'-before-chuck48',safe=''),statuses=(204,));u['api']('POST','/containers/'+newcid+'/rename?name='+urllib.parse.quote(canonical,safe=''),statuses=(204,));need(u['inspect'](newcid)['Name']=='/'+canonical,'CANONICAL_COMMON48_NAME')
  preserved();PHASE='ORIGINAL_FULL48_SOURCE_AND_SDK_GENERATION'
  ctx={'newMember':IDS['member'],'newCommon':newcid,'newWork':IDS['work'],'expectedCommon':payload,'expectedCommonMounts':expected,'originalCommon':old,'familyPreimage':pre,'registryRow':registry,'output':str(OUT/'generation'),'parentOutput':str(OUT),'newMemberProcess':m['process'],'oldNetUnixFD':oldfd,'socketPreimages':socketPreimages}
  generation=runpy.run_path(str(H/'finish_chuck48_current_generation.rev03.candidate.py'))['finish'](r,cr,ctx);published=True;preserved()
  final={**IDS,'common':newcid}
  journal('RESULT_ACTUAL.json',{'status':'CHUCK48_ORIGINAL_TRANSPORT_AND_FULL_SDK_GENERATION_COMMITTED_INGRESS_REOPEN_PENDING','oldIds':IDS,'newIds':final,'buildId':'LbgKfWM3XAR5fr7rTk3b6','build42ActualSHA256':'a5801c8264029da53299cb9ba1d9097414d1f4f05ba7eecbe672302e29365317','generation':generation,'originalFull46ReceiptSHA256':CURRENT_RECEIPT_SHA,'memberWorkCIDsAndProcessesPreserved':True,'listenerSHA256':sha(source),'commonGraphQLTargetSourceSHA256':PRODUCTS49[0][2],'serveSourceSHA256':PRODUCTS49[1][2],'exactReadonlyMountDeltas':3,'sharedIngressReopened':False,'customerAcceptance':False,'automaticReplayAllowed':False})
  return {'status':'CHUCK48_ORIGINAL_FULL_GENERATION_READY_INGRESS_REOPEN_PENDING','newCommon':newcid,'memberWorkPreserved':True}
 except BaseException as error:
  signal.signal(signal.SIGTERM,signal.SIG_IGN);signal.signal(signal.SIGINT,signal.SIG_IGN);cleanup=[]
  try:stop_units()
  except BaseException as e:cleanup.append(type(e).__name__)
  if newcid:
   try:
    c=u['inspect'](newcid)
    if c['State']['Running']:need(u['halt'](newcid,u['physical'](c)),'OWN_NEW_COMMON_PHYSICAL_CLEANUP')
   except BaseException as e:cleanup.append(type(e).__name__)
  try:preserved()
  except BaseException as e:cleanup.append('PRESERVED_MEMBER_WORK_'+type(e).__name__)
  journal('CLOSED_FAILURE.json',{'phase':PHASE,'guard':str(error)if isinstance(error,RuntimeError)else None,'errorClass':type(error).__name__,'newCommon':newcid,'preservedMember':IDS['member'],'preservedWork':IDS['work'],'fullGenerationPublished':published or(OUT/'generation/START_PUBLICATION_ACK.json').exists(),'cleanupErrors':cleanup,'maintenanceRemainsClosed':True,'automaticReplayAllowed':False});raise
 finally:
  if oldfd is not None:os.close(oldfd)
if __name__=='__main__':
 try:
  r=json.loads(stable(sys.argv[1],131072,True));need(sys.argv[2]=='install','EXACT_CHUCK48_INSTALL_PHASE');print(json.dumps(install(r)))
 except BaseException as e:print(json.dumps({'status':'CHUCK48_STOP_NO_REPLAY','phase':PHASE,'errorClass':type(e).__name__,'guard':str(e)if isinstance(e,RuntimeError)else None}));raise SystemExit(1)
