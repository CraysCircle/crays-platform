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
ORIGINAL=Path('/srv/crays/acceptance/member46-family-adoption-20261109-01')
FAILED=Path('/srv/crays/acceptance/member46-family-recovery-20261109-01')
OUT=Path('/srv/crays/acceptance/member46-family-continuation-20261109-01')
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
 unit='crays-member46-'+phase+'-20261109-01.service';cg=Path('/sys/fs/cgroup')/Path('/proc/self/cgroup').read_text().strip().split(':',2)[-1].lstrip('/')
 need(cg.name==unit and int((cg/'memory.max').read_text())<=1073741824 and int((cg/'memory.swap.max').read_text())==0 and int((cg/'pids.max').read_text())<=128,'EXACT_PHASE26_RESOURCE_CGROUP_REQUIRED')
 quota,period=(cg/'cpu.max').read_text().split();need(quota!='max'and int(quota)/int(period)<=.5,'FINITE_HALF_CPU_REQUIRED')

 fence=stable('/srv/crays/migration-work/20261108/root/ROOT_HEAVY_ATTEMPT_ACTIVE.json',16384,True);need(sha(fence)==r['rootHeavyFenceSHA256']and json.loads(fence).get('unit')==unit,'EXACT_OWN42_ROOT_WINDOW_FENCE')


def modules():
 need(sha(stable(COMMON/'coordinate_full_common_generation25.candidate.py',65536))=='d4c4cd040b449821e285b89ba8d2f8de6774449c1cf1485f131ccbd26b2c570d','ORIGINAL_COMMON11_SOURCE_REQUIRED')
 m=json.loads(stable(COMMON/'SOURCE_MANIFEST_COMMON11.json'))
 for name,h in m['files'].items():
  if name.endswith('.py'):need(sha(stable(COMMON/name,131072))==h,'ORIGINAL53_DERIVER_AND_HELPER_PINS_REQUIRED')
 return runpy.run_path(str(COMMON/'qualified_container_physical.py')),runpy.run_path(str(COMMON/'qualified53_exact_helpers.py')),runpy.run_path(str(H/'project_exact_member46_recovery_payloads.candidate.py'))


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


WITNESS='crays-chuck-core-currentness.service'
WITNESS_OLD=Path('/srv/crays/releases/member-provider-account42-20261109-01/witness-currentness42/serve_exact_member42_common_currentness.py')
WITNESS_PROPS=['User','Group','InaccessiblePaths','BindReadOnlyPaths','BindPaths','ReadOnlyPaths','TemporaryFileSystem','RootDirectory','RootImage','ProtectSystem','CapabilityBoundingSet','NoNewPrivileges','DropInPaths','FragmentPath']
CURRENT_IDS={'member':'9e3bffe1affbfab8f880ceafc5f071223d0eb8232e5c1b05640495f9d9f6b4b0','common':'9fb959aa2c4a2ccf4bb2d2b71f422f11fbeea3c1ec5544b81d086fe74da33056','work':'db90b85630a333f0097a237f6d13f4bc882db656bb5c30a19d12f98b996b6371'}
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
 own('capture',r);u,q,_=modules();need(not PRE.exists(),'NEW_CURRENT42_PREIMAGE_ONLY')
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
 put(PRE,pre);return {'status':'CURRENT42_PRIVATE_PREIMAGE_CAPTURED_NO_RUNTIME_CHANGE','preimagePath':str(PRE),'preimageSHA256':sha(stable(PRE,16777216,True)),'ids':CURRENT_IDS}
def install_owned_witness42(new_member,pre,q,journal):
 need(re.fullmatch('[a-f0-9]{64}',new_member)and new_member not in CURRENT_IDS.values(),'ACTUAL_NEW42_MEMBER_CID')
 need(witness_properties()==pre['witnessProperties'] and witness_argv()==pre['witnessArgv']=='/usr/bin/python3 -I -B '+str(WITNESS_OLD),'CURRENT07_WITNESS_EXACT_PREIMAGE')
 props=pre['witnessProperties']
 need(props['User']==props['Group']=='root' and props['ProtectSystem']=='strict' and props['NoNewPrivileges']=='yes' and props['CapabilityBoundingSet']=='cap_chown cap_fowner','ORIGINAL_WITNESS_SANDBOX_PRESERVED')
 need(q['show'](WITNESS)['MainPID']=='0','WITNESS_PHYSICALLY_STOPPED_BEFORE_ARGV_CHANGE')
 original=stable(WITNESS_OLD,131072);need(sha(original)==pre['witnessSourceSHA256'] and original.count(CURRENT_IDS['member'].encode())==1,'ONE_ORIGINAL07_ANCHOR_LITERAL')
 updated=original.replace(CURRENT_IDS['member'].encode(),new_member.encode(),1)
 directory=RELEASE/'witness-currentness42';need(not directory.exists(),'OWN42_WITNESS_SOURCE_ABSENT');directory.mkdir(mode=0o755);os.chmod(directory,0o755)
 script=directory/'serve_exact_member46_common_currentness.py';put(script,updated,0o444)
 drop=Path('/etc/systemd/system/crays-chuck-core-currentness.service.d/zzzzz.member46-owned-anchor.conf')
 need(not os.path.lexists(drop),'OWN42_WITNESS_DROPIN_ABSENT')
 raw=('[Service]\nExecStart=\nExecStart=/usr/bin/python3 -I -B '+str(script)+'\n').encode()
 journal('WITNESS42_SOURCE_AND_DROPIN_INTENT.json',{'originalSHA256':sha(original),'newSHA256':sha(updated),'newMember':new_member,'dropin':str(drop),'dropinSHA256':sha(raw),'onlyOneAdmittedAnchorLiteralAndArgvPathChanged':True})
 put(drop,raw,0o444);q['cmd'](['/usr/bin/systemctl','daemon-reload'],timeout=15)
 after=witness_properties();need(all(after[k]==props[k]for k in WITNESS_PROPS if k!='DropInPaths')and after['DropInPaths']==props['DropInPaths']+' '+str(drop)and witness_argv()=='/usr/bin/python3 -I -B '+str(script),'EXACT42_WITNESS_ONLY_SOURCE_PATH_DROPIN')
 journal('WITNESS42_SOURCE_AND_DROPIN_ACTUAL.json',{'sourceSHA256':sha(updated),'dropinSHA256':sha(raw),'sameSandboxAndOriginalValidators':True,'started':False})

def recover_old_socket_table(pre):
 ns=Path('/run/crays/nostr-core-runtime-v1/network/common.netns')
 before=os.stat('/proc/self/ns/net')
 original=os.open('/proc/self/ns/net',os.O_RDONLY|os.O_CLOEXEC) # Follow only exact self nsfs magic link
 need((os.fstat(original).st_dev,os.fstat(original).st_ino)==(before.st_dev,before.st_ino),'EXACT_ORIGINAL_SELF_NAMESPACE_FD')
 retained=os.open(ns,os.O_RDONLY|os.O_NOFOLLOW);table=None
 try:
  need(os.fstat(retained).st_ino==int(pre['containers']['member']['netns'].split('[')[1][:-1]),'EXACT_RETAINED_NAMESPACE_FD')
  try:
   os.setns(retained,0);table=os.open('/proc/self/net/unix',os.O_RDONLY|os.O_NOFOLLOW)
  finally:os.setns(original,0)
  need((os.stat('/proc/self/ns/net').st_dev,os.stat('/proc/self/ns/net').st_ino)==(before.st_dev,before.st_ino)==(os.fstat(original).st_dev,os.fstat(original).st_ino),'HOST_NETWORK_NAMESPACE_RESTORED')
  return table
 except BaseException:
  if table is not None:os.close(table)
  raise
 finally:os.close(retained);os.close(original)


IDS={'member':'2676bc4d4a5f73d96da75fe94166e2adb024542ca1ac0a8d3effe0568a736d9a','work':'79e8075fc39266ced0c45b8c41ffc64232e3d00cb837df88478fe8f8968359a6','common':'1aacb02fc8e651b6b07c894d8ea51497c7b55ed2790ae99f467e0bf91672b22a'}
FAILED_SHA='e5cd56c077375885d41277c818e938ab7ca42f839c4bf795a6160462f0ec4b75'
SERVE_PATH=Path('/srv/crays/releases/nostr-original-core-addon-20261108-18/runtime-core-adoption18-executable/serve-original-host.membership47.candidate.mjs');SERVE_SHA='0ad8a6ba71c37e8d28bce7cab8d3b740188cbbe2eebdaca30f621870a1a9138e';OLD_SERVE=Path('/srv/crays/releases/nostr-original-core-addon-20261108-18/runtime-core-adoption18-executable/serve-original-host.nostr18-machine57.candidate.mjs');OLD_SERVE_SHA='0f260882804f088e941b98facba94aabcf9d8290dbba021168d2a6613483b2b0'
def continue_family(r):
 global PHASE
 own('continuation',r);u,q,p=modules();pre=load_pre()
 need(not OUT.exists(),'EXCLUSIVE_CONTINUATION_ONCE')
 failure=stable(FAILED/'CLOSED_FAILURE.json',16384,True);need(sha(failure)==FAILED_SHA,'EXACT_RECOVERY_FAILURE_CHECKPOINT')
 f=json.loads(failure);need(f['newIds']==IDS and f['guard']=='EXACT_SAME_CAP0_NNP_COMMON_REQUIRED_DURING_CORE_SOCKET_WAIT' and f['cleanupErrors']==[] and f['fullGenerationPublished'] is False,'EXACT_PREPUBLICATION_FAILED_COMMON')
 need(set(x.name for x in (FAILED/'generation').iterdir())=={'INTENT.json','REGISTRY_ROOT_PRESTART_ACK.json','COMMON_BOOTSTRAP_PHYSICAL_ACK.json'},'ONLY_PREBOOTSTRAP_GENERATION_JOURNAL')
 need(not (FAILED/'RESULT_ACTUAL.json').exists() and not (ORIGINAL/'RESULT_ACTUAL.json').exists(),'NO_COMMITTED_RESULT')
 need(sha(stable(SERVE_PATH,131072))==SERVE_SHA and sha(stable(OLD_SERVE,131072))==OLD_SERVE_SHA,'EXACT_SINGLE_PIN_SOURCE_DERIVATION')
 oldbody=stable(OLD_SERVE,131072);need(stable(SERVE_PATH,131072)==oldbody.replace(b"sha256:'59c7d6975c8bca52b4ca9097aeda15fe05f9a5888a0e350fe99774a6202ce6e8'",b"sha256:'822fab2fc20aba7cd6cd45e50089efaf8756425a5695db215eca2311b4ddb1d4'"),'ONLY_ONE_HARDCODED_PIN_DELTA')
 bid=r['actualBuildId'];need(bid=='LbgKfWM3XAR5fr7rTk3b6' and r['actualBuildSHA256']=='a5801c8264029da53299cb9ba1d9097414d1f4f05ba7eecbe672302e29365317','UNCHANGED_ACTUAL46_BUILD')
 stage=stable(RELEASE/'STAGE_ACTUAL.json',131072);need(sha(stage)==r['stageActualSHA256'],'UNCHANGED46_STAGE')
 rel=json.loads(stable(RELEASE/'RELEASE_MANIFEST.json',8388608));need(sha(stable(RELEASE/'RELEASE_MANIFEST.json',8388608))==json.loads(stage)['releaseManifestSHA256'],'UNCHANGED46_MANIFEST')
 for name,row in rel['files'].items():need(sha(stable(RELEASE/name,67108864))==row['sha256'],'UNCHANGED46_RELEASE_BYTES')
 env=stable('/srv/crays/private/member-original-context46-20261109-01/RESULT_ACTUAL.json',16384,True);need(sha(env)==r['environmentProjectionActualSHA256'],'UNCHANGED_ENV_PROJECTION_RECEIPT')
 crraw=stable(r['originalCommon11RootReviewPath'],131072,True);need(sha(crraw)==r['originalCommon11RootReviewSHA256'],'ORIGINAL_COMMON11_AUTHORITY');cr=json.loads(crraw)
 ingress=stable(r['ingressClosedActualPath'],131072,True);need(sha(ingress)==r['ingressClosedActualSHA256'] and json.loads(ingress)['memberCommonWorkPrivateIngressClosed'] is True,'ACTUAL_FAMILY_INGRESS_STAYS_CLOSED')
 def fresh():
  b=stable(r['sourceFencePath'],16384,True);need(sha(b)==r['sourceFenceSHA256'],'FRESH_SOURCE_FENCE_SHA');v=json.loads(b)
  need(v['sourceWriterFenceStillEffective'] is True and v['originalSourceUnitsPhysicallyStopped'] is True and v['sourceRestartApproved'] is False and v['sourceArchiveSHA256']=='71084517d7378bb3b6125e161135bd71d921f6ad63b187b9b790cb645f85c53a' and 0<=time.time()-v['observedAtUnix']<=120,'FRESH_SOURCE_FENCE')
 fresh()
 plans={};mounts={};current={}
 for role,cid in IDS.items():
  plan,expected=p['payload'](pre['containers'][role],role,IDS['member'] if role!='member' else None)
  c=admit_created(u,cid,plan,expected,role,pre['containers'][role],IDS['member']);need(not c['State']['Running'] and c['State']['Pid']==0 and c['Name']==pre['containers'][role]['Name'],'EXACT_STOPPED_CANONICAL46_FAMILY')
  plans[role]=plan;mounts[role]=expected;current[role]=c
 need(p['endpoints'](pre['containers']['member']) and set(current['member']['NetworkSettings']['Networks'])==set(pre['containers']['member']['NetworkSettings']['Networks']),'MEMBER_FIVE_ENDPOINTS_RETAINED')
 for name,oldnet in pre['containers']['member']['NetworkSettings']['Networks'].items():
  net=current['member']['NetworkSettings']['Networks'][name];need(net['NetworkID']==oldnet['NetworkID'] and net.get('IPAMConfig',{}).get('IPv4Address')==oldnet['IPAddress'] and net.get('IPAddress','')=='' and net.get('Gateway','')=='' and net.get('GwPriority',0)==oldnet.get('GwPriority',0),'EXACT_FIVE_NETWORK_IP_PRIORITY')
 for name,path in PATHS.items():
  need(not os.path.lexists(path) and sha(stable(ORIGINAL/('prior11-'+name)))==pre['controlsSHA256'][name],'NO_CURRENT_CONTROLS_AND_EXACT_ARCHIVE')
 for name in UNITS:
  v=q['show'](name);need(v['MainPID']=='0' and v['ActiveState'] in ('inactive','failed'),'ALL_NATIVE_UNITS_STOPPED')
  cg=Path('/sys/fs/cgroup/system.slice')/name
  if cg.exists():need(all(not z.read_text().strip() for z in cg.rglob('cgroup.procs')),'ALL_NATIVE_CGROUPS_EMPTY')
 witness=json.loads(stable(FAILED/'WITNESS42_SOURCE_AND_DROPIN_ACTUAL.json',16384,True));wi=json.loads(stable(FAILED/'WITNESS42_SOURCE_AND_DROPIN_INTENT.json',16384,True))
 need(wi['newMember']==IDS['member'] and sha(stable(wi['dropin'],16384))==wi['dropinSHA256'],'EXACT_ALREADY_INSTALLED_WITNESS')
 for path,h in pre['unitFilesSHA256'].items():need(sha(stable(path,2097152))==h,'ORIGINAL_UNIT_BYTES_UNCHANGED')
 nsPath=Path('/run/crays/nostr-core-runtime-v1/network/common.netns');retained=nsPath.stat();need(retained.st_ino==4026532360 and not namespace_holders(retained.st_ino),'EXACT_FAILED_NAMESPACE_RETAINED_EMPTY')
 oldfdPre=copy.deepcopy(pre);oldfdPre['containers']['member']['netns']='net:['+str(retained.st_ino)+']'
 socketPreimages={}
 for text in ['/run/crays/nostr-core-runtime-v1/policy/policy.sock','/run/crays/nostr-core-runtime-v1/registry/control.sock','/run/crays-chuck-core-currentness/status.sock']:
  v=None
  if os.path.lexists(text):
   st=Path(text).lstat();need(stat.S_ISSOCK(st.st_mode) and st.st_uid==st.st_gid==1000 and stat.S_IMODE(st.st_mode)==0o600 and st.st_nlink==1,'EXACT_STOPPED_FAMILY_SOCKET_CUSTODY');v=[st.st_dev,st.st_ino,st.st_uid,st.st_gid,stat.S_IMODE(st.st_mode),st.st_nlink]
  socketPreimages[text]=v
 commonGuest='/srv/crays/releases/common-canonical-20261106-01/runtime-source/src/chuck/server/serve-original-host.mjs'
 changed=0
 for row in plans['common']['HostConfig'].get('Mounts') or []:
  if row.get('Target')==commonGuest:need(row['Source']==str(OLD_SERVE) and row.get('ReadOnly') is True,'ORIGINAL_SERVE_MOUNT_PREIMAGE');row['Source']=str(SERVE_PATH);changed+=1
 for i,b in enumerate(plans['common']['HostConfig'].get('Binds') or []):
  parts=b.split(':')
  if parts[1]==commonGuest:need(parts[0]==str(OLD_SERVE) and parts[2]=='ro','ORIGINAL_SERVE_BIND_PREIMAGE');parts[0]=str(SERVE_PATH);plans['common']['HostConfig']['Binds'][i]=':'.join(parts);changed+=1
 need(changed==1 and mounts['common'][commonGuest]==(str(OLD_SERVE),False,'bind'),'ONE_SERVE_BIND_DELTA');mounts['common'][commonGuest]=(str(SERVE_PATH),False,'bind')
 cjsGuest='/srv/crays/releases/common-canonical-20261106-01/common/common-host.cjs';oldCjs='/srv/crays/releases/nostr-original-core-addon-20261108-18/common-machine57/common-host.main-context46.candidate.cjs';newCjs='/srv/crays/releases/nostr-original-core-addon-20261108-18/common-machine57/common-host.membership-title47.candidate.cjs'
 need(sha(stable(newCjs,131072))=='822fab2fc20aba7cd6cd45e50089efaf8756425a5695db215eca2311b4ddb1d4','EXACT_REVIEWED_TITLE47_SOURCE')
 changedCjs=0
 for row in plans['common']['HostConfig'].get('Mounts') or []:
  if row.get('Target')==cjsGuest:need(row['Source']==oldCjs and row.get('ReadOnly') is True,'COMMON46_SOURCE_PREIMAGE');row['Source']=newCjs;changedCjs+=1
 for i,b in enumerate(plans['common']['HostConfig'].get('Binds') or []):
  parts=b.split(':')
  if parts[1]==cjsGuest:need(parts[0]==oldCjs and parts[2]=='ro','COMMON46_BIND_PREIMAGE');parts[0]=newCjs;plans['common']['HostConfig']['Binds'][i]=':'.join(parts);changedCjs+=1
 need(changedCjs==1 and mounts['common'][cjsGuest]==(oldCjs,False,'bind'),'ONE_REVIEWED_TITLE47_BIND_DELTA');mounts['common'][cjsGuest]=(newCjs,False,'bind')
 name=pre['containers']['common']['Name'].lstrip('/')+'-continuation46-candidate'
 found=u['api']('GET','/containers/'+urllib.parse.quote(name,safe='')+'/json',statuses=(200,404));need(not isinstance(found,dict) or 'Id' not in found,'NO_PRIOR_CONTINUATION_COMMON')
 OUT.mkdir(mode=0o700);sync(OUT.parent)
 def journal(n,v):put(OUT/n,v)
 journal('INTENT.json',{'status':'MEMBER46_SERVE_PIN_CONTINUATION_ONCE','failedRecoverySHA256':FAILED_SHA,'existingIds':IDS,'onlyCommonRecreated':True,'memberWorkRecreated':False,'automaticReplayAllowed':False})
 newcid=None;oldFD=None;published=False
 def stop():
  q['cmd'](['/usr/bin/systemctl','stop',*UNITS],timeout=45)
  for cid in [newcid,IDS['common'],IDS['work'],IDS['member']]:
   if cid:
    c=u['inspect'](cid)
    if c['State']['Running']:need(u['halt'](cid,u['physical'](c)),'CONTINUATION_CLEANUP_PHYSICAL_HALT')
 signal.signal(signal.SIGTERM,lambda*a:(_ for _ in()).throw(KeyboardInterrupt()))
 signal.signal(signal.SIGINT,lambda*a:(_ for _ in()).throw(KeyboardInterrupt()))
 try:
  PHASE='RECOVER_FAILED_NAMESPACE_SOCKET_TABLE';oldFD=recover_old_socket_table(oldfdPre)
  PHASE='START_EXISTING_MEMBER_AND_WORK'
  for role in ('member','work'):
   journal(role+'_START_INTENT.json',{'id':IDS[role],'sameExistingContainer':True});u['api']('POST','/containers/'+IDS[role]+'/start',statuses=(204,))
   c=admit_created(u,IDS[role],plans[role],mounts[role],role,pre['containers'][role],IDS['member']);need(c['State']['Running'],'EXISTING46_CONTAINER_RUNNING');journal(role+'_STARTED.json',{'id':IDS[role],'process':q['process'](c['State']['Pid'])})
  member=u['inspect'](IDS['member']);ap=q['process'](member['State']['Pid']);proc=Path('/proc',str(ap['pid']),'ns/net')
  actualNets=member['NetworkSettings']['Networks'];need(set(actualNets)==set(pre['containers']['member']['NetworkSettings']['Networks']),'ALL_FIVE_RUNNING_NETWORKS')
  for name,oldnet in pre['containers']['member']['NetworkSettings']['Networks'].items():
   net=actualNets[name];need(net['NetworkID']==oldnet['NetworkID'] and net['IPAddress']==oldnet['IPAddress'] and net.get('GwPriority',0)==oldnet.get('GwPriority',0),'ALL_FIVE_RUNNING_NETWORK_IDS_IPS_PRIORITIES')
  need(default_gateway(ap['pid'])==pre['containers']['member']['NetworkSettings']['Networks'][max(pre['containers']['member']['NetworkSettings']['Networks'],key=lambda n:pre['containers']['member']['NetworkSettings']['Networks'][n].get('GwPriority',0))]['Gateway'],'ORIGINAL_DEFAULT_GATEWAY_PRESERVED')
  if (nsPath.stat().st_dev,nsPath.stat().st_ino)!=(proc.stat().st_dev,proc.stat().st_ino):
   need((nsPath.stat().st_dev,nsPath.stat().st_ino)==(retained.st_dev,retained.st_ino),'RETAINED_NAMESPACE_BIND_CAS')
   journal('GO_NETNS_REBIND_INTENT.json',{'priorInode':retained.st_ino,'newInode':proc.stat().st_ino,'sameMember':IDS['member']})
   q['cmd'](['/usr/bin/umount',str(nsPath)],timeout=5);z=nsPath.lstat();need(stat.S_ISREG(z.st_mode) and z.st_uid==0 and not z.st_mode&0o077,'ORIGINAL_NS_PLACEHOLDER');q['cmd'](['/usr/bin/mount','--bind',str(proc),str(nsPath)],timeout=5)
  need((nsPath.stat().st_dev,nsPath.stat().st_ino)==(proc.stat().st_dev,proc.stat().st_ino),'CURRENT_MEMBER_NS_BIND');journal('GO_NETNS_CURRENT_ACK.json',{'member':IDS['member'],'namespaceInode':proc.stat().st_ino})
  PHASE='CREATE_ONLY_COMMON_SERVE_PIN_SUCCESSOR';journal('COMMON_CREATE_INTENT.private.json',{'name':name,'payload':plans['common'],'expectedMounts':mounts['common']})
  try:newcid=u['api']('POST','/containers/create?name='+urllib.parse.quote(name,safe=''),plans['common'])['Id']
  except BaseException:
   c=u['api']('GET','/containers/'+urllib.parse.quote(name,safe='')+'/json',statuses=(200,404))
   if isinstance(c,dict) and 'Id' in c:newcid=c['Id'];admit_created(u,newcid,plans['common'],mounts['common'],'common',pre['containers']['common'],IDS['member'])
   raise
  c=admit_created(u,newcid,plans['common'],mounts['common'],'common',pre['containers']['common'],IDS['member']);need(not c['State']['Running'] and c['State']['Pid']==0,'NEW_COMMON_CREATED_STOPPED')
  journal('COMMON_CREATED.json',{'id':newcid,'onlyServeMountChanged':True})
  canonical=pre['containers']['common']['Name'].lstrip('/')
  journal('COMMON_NAME_COMMIT_INTENT.json',{'old':IDS['common'],'new':newcid,'canonical':canonical})
  u['api']('POST','/containers/'+IDS['common']+'/rename?name='+urllib.parse.quote(canonical+'-failed-serve46',safe=''),statuses=(204,));u['api']('POST','/containers/'+newcid+'/rename?name='+urllib.parse.quote(canonical,safe=''),statuses=(204,))
  need(u['inspect'](newcid)['Name']=='/'+canonical,'CANONICAL_COMMON_ACK')
  fresh();PHASE='ORIGINAL_FULL_COMMON_AND_SDK_CONTINUATION'
  registry={'path':str(REGISTRY),'sha256':sha(stable(REGISTRY,8388608)),'bytes':len(stable(REGISTRY,8388608))}
  need(registry['sha256']==rel['files']['common/MODULE_REGISTRY.member46.json']['sha256'],'UNCHANGED46_REGISTRY')
  commonSource=Path('/srv/crays/releases/nostr-original-core-addon-20261108-18/common-machine57/common-host.membership-title47.candidate.cjs')
  cb=stable(commonSource,131072);need(sha(cb)=='822fab2fc20aba7cd6cd45e50089efaf8756425a5695db215eca2311b4ddb1d4','EXACT_REVIEWED_TITLE47_COMMON')
  ctx={'newMember':IDS['member'],'newCommon':newcid,'newWork':IDS['work'],'expectedCommon':plans['common'],'expectedCommonMounts':mounts['common'],'originalCommon':pre['containers']['common'],'familyPreimage':pre,'registryRow':registry,'output':str(OUT/'generation'),'parentOutput':str(ORIGINAL),'newMemberProcess':ap,'oldNetUnixFD':oldFD,'socketPreimages':socketPreimages,'previousRegistryRow':pre['registryRow'],'commonSourceRow':{'path':str(commonSource),'sha256':sha(cb),'bytes':len(cb)},'serveSourceRow':{'path':str(SERVE_PATH),'sha256':SERVE_SHA,'bytes':len(stable(SERVE_PATH,131072))}}
  generation=runpy.run_path(str(H/'finish_member46_continuation_generation.candidate.py'))['finish'](r,cr,ctx);published=True
  final={'member':IDS['member'],'work':IDS['work'],'common':newcid}
  journal('RESULT_ACTUAL.json',{'status':'MEMBER46_IMMUTABLE_RELEASE_AND_ORIGINAL_FULL_SDK_GENERATION_COMMITTED_INGRESS_REOPEN_PENDING','oldIds':{k:v['id']for k,v in pre['containers'].items()},'newIds':final,'buildId':bid,'build42ActualSHA256':r['actualBuildSHA256'],'generation':generation,'recoveryLineage':{'originalFailureSHA256':'e01082ad8440cea405006b49edab8cc7a1c8dbc56984c09c9829ea8b10e08975','failedRecoverySHA256':FAILED_SHA,'recoveryPath':str(OUT),'previousRecoveryPath':str(FAILED),'onlyCommonServePinSuccessor':True},'sharedIngressReopened':False,'customerAuth0DocumentS3Acceptance':False,'automaticReplayAllowed':False})
  return {'status':'MEMBER46_CONTINUATION_COMMITTED_INGRESS_REOPEN_PENDING','newIds':final}
 except BaseException as error:
  signal.signal(signal.SIGTERM,signal.SIG_IGN);signal.signal(signal.SIGINT,signal.SIG_IGN)
  cleanup=[]
  try:stop()
  except BaseException as z:cleanup.append(type(z).__name__)
  journal('CLOSED_FAILURE.json',{'phase':PHASE,'guard':str(error) if isinstance(error,RuntimeError) else None,'errorClass':type(error).__name__,'newCommon':newcid,'retainedIds':IDS,'fullGenerationPublished':published or (OUT/'generation/START_PUBLICATION_ACK.json').exists(),'cleanupErrors':cleanup,'automaticReplayAllowed':False,'ingressReopenForbidden':True});raise
 finally:
  if oldFD is not None:os.close(oldFD)
if __name__=='__main__':
 try:
  r=json.loads(stable(sys.argv[1],131072,True));need(sys.argv[2]=='continuation','EXACT_CONTINUATION_PHASE');PRE_SHA=r['preimageSHA256'];print(json.dumps(continue_family(r)))
 except BaseException as e:
  print(json.dumps({'status':'CONTINUATION_STOP_NO_REPLAY','phase':PHASE,'errorClass':type(e).__name__,'guard':str(e) if isinstance(e,RuntimeError) else None}));raise SystemExit(1)
