"""Source-only BFF80 build admission primitives; never invoked on source preparation."""
import os,json,stat,hashlib,subprocess,time,tarfile,gzip,io
from pathlib import Path
CONTEXT=Path('/srv/crays/migration-work/20261108/business/bff-build80/public-context')
PINS=[["Dockerfile",1249,"01062ffdf49886d0b65bb9c1334702ebc779d28647d21b7de9086eafae29b9da"],["package.json",282,"78c6b9b0c5a7ed424fba9cb5c81f8b278ea8d8553b58c52b1f41b80de73a2172"],["package-lock.json",5729,"3bc3d679850e3e7181dcce08b5f78068e214d937a27a5817756eaa5bd5b7c6ef"],["server.mjs",11839,"6d14df24cbb8471bf36270546461ef8c398bdd8ee9e62d880368661d813e04a9"],["lib.mjs",63459,"aa171859f5569f4ae52412f4b1ce872d62e55e16c0b4a9ebee6359af343960be"]]
BASE='docker.io/library/node@sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32'
BASE_ID='sha256:395425e54d98ebbd748d388685a0c2de151a30fa92fffc10ba30fa63f3db64d6'
DIFF_IDS=["sha256:34884abbe92863fce933ed7c39c0e045631af0ed86d5cc0dfbdf9fdca426ce3c","sha256:5654eeaf04645c03fadc59bca7835753203d173222ab6ad8729f75b3dde98784","sha256:fe2c6446e3d9c78c5f734536452b9ea4bf7c4c46c4b4a575d2973b79691ec57a","sha256:baf2266664bacf240e13831e4192f8c92196c603ce8a20a4a50035ad87f8f2fb"]
OWN_TAG='crays-business-clubs-commerce-bff:original-source-20261109-80'
class Hold(Exception):pass
def need(v,label):
 if not v:raise Hold(label)
def ident(s):return(s.st_dev,s.st_ino,s.st_mode,s.st_uid,s.st_gid,s.st_nlink,s.st_size,s.st_mtime_ns,s.st_ctime_ns)
def context_open():
 need(CONTEXT.resolve()==CONTEXT,'CANONICAL_EXISTING_OWN_STAGE')
 d=os.open(CONTEXT,os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW|os.O_CLOEXEC);fds=[];proof=[]
 try:
  st=os.fstat(d);need(st.st_uid==0 and stat.S_IMODE(st.st_mode)==0o700,'OWN_STAGED_CONTEXT_CUSTODY')
  need(set(os.listdir(d))=={n for n,z,h in PINS},'EXACT_FIVE_STAGED_FILES')
  for name,size,h in PINS:
   fd=os.open(name,os.O_RDONLY|os.O_NOFOLLOW|os.O_CLOEXEC,dir_fd=d);fds.append(fd);a=os.fstat(fd)
   need(stat.S_ISREG(a.st_mode)and a.st_uid==0 and a.st_gid==0 and a.st_nlink==1 and stat.S_IMODE(a.st_mode)==0o444 and a.st_size==size,'ORIGINAL_STAGED_FILE_CUSTODY')
   raw=b''
   while len(raw)<=size:
    part=os.read(fd,min(8192,size+1-len(raw)))
    if not part:break
    raw+=part
   need(len(raw)==size and hashlib.sha256(raw).hexdigest()==h,'ORIGINAL_FIVE_FILE_BYTES')
   need(ident(a)==ident(os.fstat(fd))==ident(os.stat(name,dir_fd=d,follow_symlinks=False)),'STABLE_ORIGINAL_CONTEXT_FILE')
   proof.append((fd,name,a))
  return d,st,proof
 except BaseException:
  for fd in fds:os.close(fd)
  os.close(d);raise
def context_recheck(p):
 d,st,rows=p
 need(ident(st)==ident(os.fstat(d))==ident(CONTEXT.lstat()),'ORIGINAL_CONTEXT_DIRECTORY_CHANGED')
 need(set(os.listdir(d))=={n for n,z,h in PINS},'ORIGINAL_CONTEXT_FILESET_CHANGED')
 for fd,name,a in rows:need(ident(a)==ident(os.fstat(fd))==ident(os.stat(name,dir_fd=d,follow_symlinks=False)),'ORIGINAL_CONTEXT_FILE_CHANGED')
def context_close(p):
 for fd,name,a in p[2]:os.close(fd)
 os.close(p[0])
def docker_metadata(args):
 r=subprocess.run(['/usr/bin/docker',*args],capture_output=True,timeout=8,env=ENV)
 need(r.returncode==0 and len(r.stdout)<=65536,'PUBLIC_DOCKER_METADATA_HOLD')
 return json.loads(r.stdout)
def require_existing_original_base():
 rows=docker_metadata(['image','inspect',BASE]);need(len(rows)==1,'EXACT_BASE_PRESENT_NO_IMPLICIT_PULL')
 x=rows[0];known={'sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32','sha256:76789712cd1ae89a1225eac9077010d68987a423588042dac30446f502f1858c',BASE_ID}
 need(x['Id']in known and x.get('Os')=='linux'and x.get('Architecture')=='amd64'and x.get('RootFS',{}).get('Layers')==DIFF_IDS,'EXACT_ORIGINAL_NODE_BASE_CONFIG_AND_DIFFIDS')
 digests=x.get('RepoDigests')or[];need(any(v.endswith('@'+BASE.split('@')[1])and v.split('@')[0]in('node','library/node','docker.io/library/node')for v in digests),'EXACT_ORIGINAL_NODE_INDEX_REFERENCE')
 descriptor=x.get('Descriptor')
 if descriptor is not None:
  kinds={'sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32':('application/vnd.oci.image.index.v1+json','application/vnd.docker.distribution.manifest.list.v2+json'),'sha256:76789712cd1ae89a1225eac9077010d68987a423588042dac30446f502f1858c':('application/vnd.oci.image.manifest.v1+json','application/vnd.docker.distribution.manifest.v2+json')}
  need(type(descriptor)is dict and descriptor.get('digest')in kinds and descriptor.get('mediaType')in kinds[descriptor['digest']],'CONSISTENT_BASE_DESCRIPTOR')
 semantics={BASE_ID:'config','sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32':'oci-index','sha256:76789712cd1ae89a1225eac9077010d68987a423588042dac30446f502f1858c':'linux-amd64-manifest'}
 return {'baseLocalId':x['Id'],'baseIdSemantics':semantics[x['Id']],'originalConfigAnchor':BASE_ID,'exactImmutableReferenceAndAllFourDiffIDsVerified':True,'originalDockerfilePreserved':True,'nativeOriginalImageByteParityProven':False}

CONTEXT_ARCHIVE=CONTEXT.parent/'original-context.public.tar.gz'
GZIP_SHA='7786f70ab42afb9370ba185122bd10553e9c35bcacbf95884395a670cfc71823'
TAR_SHA='68b32dbfbec036fad75d0e33b53d2fb2d4a049135bc5026a249d9d50456ac8fd'
def original_build_stdin():
 fd=os.open(CONTEXT_ARCHIVE,os.O_RDONLY|os.O_NOFOLLOW|os.O_CLOEXEC)
 try:
  a=os.fstat(fd);need(stat.S_ISREG(a.st_mode)and a.st_uid==a.st_gid==0 and a.st_nlink==1 and stat.S_IMODE(a.st_mode)==0o400 and a.st_size==17995,'ORIGINAL_ARCHIVE_CUSTODY')
  gz=b''
  while len(gz)<=17995:
   part=os.read(fd,min(8192,17996-len(gz)))
   if not part:break
   gz+=part
  need(len(gz)==17995 and hashlib.sha256(gz).hexdigest()==GZIP_SHA and ident(a)==ident(os.fstat(fd))==ident(CONTEXT_ARCHIVE.lstat()),'ORIGINAL_ARCHIVE_IDENTITY_BYTES')
  with gzip.GzipFile(fileobj=io.BytesIO(gz),mode='rb')as z:raw=z.read(92161)
  need(len(raw)==92160 and hashlib.sha256(raw).hexdigest()==TAR_SHA,'EXACT_ORIGINAL_BUILD_STDIN_TAR')
  expected={n:(size,h)for n,size,h in PINS}
  with tarfile.open(fileobj=io.BytesIO(raw),mode='r:')as tf:
   rows=tf.getmembers();need(len(rows)==5 and {m.name for m in rows}==set(expected),'EXACT_ORIGINAL_TAR_FIVE_FILES')
   for m in rows:
    size,h=expected[m.name];need(m.type==tarfile.REGTYPE and m.size==size and not m.pax_headers,'EXACT_ORIGINAL_TAR_FILE_KIND')
    body=tf.extractfile(m).read(size+1);need(len(body)==size and hashlib.sha256(body).hexdigest()==h,'EXACT_ORIGINAL_TAR_FILE_BODY')
  return raw
 finally:os.close(fd)

# Controller binding from exact reviewed Root38 still required:
# existing global lock/exclusive fence + fresh Root window and backend facts,
# own managed slice/cgroup-parent + resource-bound once unit, ownership-marked Docker workers,
# terminal physical cleanup with fence retained on uncertainty. No guessed backend dispatch.

import sys,fcntl,signal,datetime,ast,resource
ROOT=Path('/srv/crays/migration-work/20261108/root')
LOCK=ROOT/'ROOT_HEAVY_EXECUTION.lock'
FENCE=ROOT/'ROOT_HEAVY_ATTEMPT_ACTIVE.json'
OUT=CONTEXT.parent/'build-execution01'
ADMISSION=CONTEXT.parent/'ROOT_BUILD80_RECOVERY01_ADMISSION.json'
UNIT='crays-business-bff80-build01.service'
SLICE='craysbff80build01.slice'
CG=Path('/sys/fs/cgroup')/SLICE
HELPER=Path('/srv/crays/incoming/org-private-correction-20261107-02-r04/install_org_private_candidate.py')
HELPER_SHA='157996e57ce3fd6ccfaf9d764f86a80edf9220d05f19987b5337bc61ce096aa0'
STORAGE=Path('/srv/crays/incoming/guest-runtime-bootstrap-20261105-01/persistent_storage_guards.candidate.py')
STORAGE_SHA='3efa226b84d375cf96f911c620b7dbefa814f0c54abb8fa61944d0aeb658c739'
ENV={'PATH':'/usr/bin:/bin','DOCKER_HOST':'unix:///var/run/docker.sock','DOCKER_BUILDKIT':'0','DOCKER_CONFIG':str(OUT/'docker-config-empty')}
BUDGET=0.0
def remaining(cap):
 left=BUDGET-time.monotonic()
 need(left>0,'CONTROLLER_DEADLINE')
 return min(cap,left)
def command(argv,cap=8,check=True):
 r=subprocess.run(argv,capture_output=True,timeout=remaining(cap),env=ENV)
 need(len(r.stdout)<=262144 and len(r.stderr)<=262144,'BOUNDED_COMMAND_METADATA')
 if check:need(r.returncode==0,'CONTROL_COMMAND_HOLD')
 return r
def public_bytes(path,maximum,expected=None):
 need(path.is_absolute()and path.resolve()==path,'CANONICAL_PUBLIC_SOURCE_OR_REVIEW')
 fd=os.open(path,os.O_RDONLY|os.O_NOFOLLOW|os.O_CLOEXEC)
 try:
  st=os.fstat(fd);need(stat.S_ISREG(st.st_mode)and st.st_uid==st.st_gid==0 and st.st_nlink==1 and not stat.S_IMODE(st.st_mode)&0o022 and 0<st.st_size<=maximum,'PUBLIC_SOURCE_OR_REVIEW_CUSTODY')
  raw=b''
  while len(raw)<=maximum:
   block=os.read(fd,min(8192,maximum+1-len(raw)))
   if not block:break
   raw+=block
  need(len(raw)==st.st_size and ident(st)==ident(os.fstat(fd))==ident(path.lstat()),'PUBLIC_SOURCE_OR_REVIEW_STABLE')
  if expected is not None:need(hashlib.sha256(raw).hexdigest()==expected,'EXACT_PUBLIC_SOURCE_OR_REVIEW_SHA')
  return raw
 finally:os.close(fd)
def directory(path):
 need(path.resolve()==path,'CANONICAL_ROOT_DIRECTORY')
 st=path.lstat();need(stat.S_ISDIR(st.st_mode)and st.st_uid==0 and not stat.S_IMODE(st.st_mode)&0o022,'ROOT_DIRECTORY_CUSTODY')
def fsyncdir(p):
 fd=os.open(p,os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW|os.O_CLOEXEC)
 try:os.fsync(fd)
 finally:os.close(fd)
def create(path,raw,mode=0o400):
 fd=os.open(path,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW|os.O_CLOEXEC,mode)
 with os.fdopen(fd,'wb')as f:f.write(raw);f.flush();os.fchmod(f.fileno(),mode);os.fsync(f.fileno())
 fsyncdir(path.parent)
def put(path,obj):create(path,(json.dumps(obj,sort_keys=True,separators=(',',':'))+'\n').encode())
def iso(s):return datetime.datetime.fromisoformat(s.replace('Z','+00:00'))
def reviewed(minimum_remaining=660):
 raw_review=public_bytes(ADMISSION,16384)
 r=json.loads(raw_review)
 selfsha=hashlib.sha256(public_bytes(Path(__file__),65536)).hexdigest()
 need(r.get('schema')=='crays.business.bff80.root-build-admission.v1'and r.get('status')=='ROOT_BFF80_ONCE_BUILD_ADMITTED'and r.get('sourceSHA256')==selfsha,'EXACT_ROOT_BUILD_SOURCE_ADMISSION')
 for k in ('independentSourceReviewPassed','rootHeavyWindowAuthorized','legacySharedDaemonBuildAuthorized','originalNpmNetworkAuthorized','ownArtifactTagCreateOnlyAuthorized','noRuntimeBindingsOrDatabaseScope'):
  need(r.get(k)is True,'EXPLICIT_ROOT_BUILD_SCOPE_REQUIRED')
 need(r.get('ownedImageTag')==OWN_TAG and r.get('instanceId')=='i-0eb300e1b02414d8f','EXACT_ROOT_BUILD_TARGET')
 now=datetime.datetime.now(datetime.timezone.utc)
 need(iso(r['notBeforeUTC'])<=now and now+datetime.timedelta(seconds=minimum_remaining)<=iso(r['notAfterUTC']),'CURRENT_ROOT_BUILD_WINDOW_REQUIRED')
 return r,selfsha,hashlib.sha256(raw_review).hexdigest()
def show(name):
 r=command(['/usr/bin/systemctl','show',name,'--no-pager','--all','--property=LoadState,ActiveState,SubState,MainPID,ControlGroup,Result,FragmentPath,Transient,InvocationID'],check=False)
 d={}
 for line in r.stdout.decode().splitlines():
  if '='in line:
   k,v=line.split('=',1);d[k]=v
 need(d.get('LoadState')in('loaded','not-found'),'SYSTEMD_UNIT_METADATA')
 return d
def require_absent_unit(name):
 d=show(name)
 if d.get('LoadState')=='not-found':return
 need(name==SLICE and d.get('LoadState')=='loaded'and d.get('ActiveState')=='inactive'and d.get('SubState')=='dead'and d.get('MainPID','0')=='0'and d.get('ControlGroup')==''and d.get('FragmentPath')==''and d.get('Transient')=='no'and d.get('InvocationID')==''and not os.path.lexists(CG),'OWN_UNIT_OR_SLICE_EXISTS_NO_REPLAY')
def own_unit():
 d=show(UNIT)
 if d.get('LoadState')=='not-found':return d
 need(d.get('ControlGroup')in('', '/'+SLICE+'/'+UNIT),'EXACT_OWN_UNIT_CGROUP')
 return d
def cg_populated():
 if not CG.exists():return False
 need(CG.is_dir()and not CG.is_symlink(),'OWN_SLICE_DIRECTORY')
 d=dict(line.split()for line in(CG/'cgroup.events').read_text().splitlines())
 need(d.get('populated')in('0','1'),'OWN_CGROUP_EVENTS')
 return d['populated']=='1'
def slice_limits():
 d=show(SLICE);need(d.get('ControlGroup')=='/'+SLICE,'EXACT_OWN_SLICE_CGROUP')
 need((CG/'memory.max').read_text().strip()=='536870912'and(CG/'memory.swap.max').read_text().strip()=='0'and(CG/'pids.max').read_text().strip()=='128','AGGREGATE_BUILD_MEMORY_SWAP_TASK_LIMITS')
 q,p=(CG/'cpu.max').read_text().split();need(q!='max'and int(q)>0 and int(p)>0 and int(q)*2<=int(p),'AGGREGATE_BUILD_CPU_HALF_CORE')
def own_scope_ids():
 if not CG.exists():return []
 rows=list(CG.iterdir());need(len(rows)<=64,'BOUNDED_OWN_SLICE_CHILDREN')
 ids=[]
 for p in rows:
  if not p.is_dir():continue
  if p.name==UNIT:continue
  m=__import__('re').fullmatch(r'docker-([a-f0-9]{64})\.scope',p.name)
  need(m is not None,'UNKNOWN_OWN_SLICE_CHILD_REQUIRES_ROOT_RECOVERY')
  ids.append(m.group(1))
 return ids
IFMT='{"Id":{{json .Id}},"Image":{{json .Image}},"CgroupParent":{{json .HostConfig.CgroupParent}},"State":{{json .State}}}'
def own_container(cid):
 r=command(['/usr/bin/docker','inspect','--format',IFMT,cid],check=False)
 if r.returncode:
  need(b'no such'in r.stderr.lower(),'OWN_DOCKER_INSPECT_UNCERTAIN')
  return None
 d=json.loads(r.stdout);need(d.get('Id')==cid and d.get('CgroupParent')==SLICE,'EXACT_OWN_DOCKER_WORKER_PARENT')
 pid=d['State'].get('Pid',0)
 if pid:
  path=Path('/proc',str(pid),'cgroup').read_text().strip().split(':',2)[-1]
  need(path.startswith('/'+SLICE+'/docker-'+cid+'.scope'),'ACTUAL_DOCKER_WORKER_IN_OWN_SLICE')
 return d
def helper_terminal_functions():
 raw=public_bytes(HELPER,131072,HELPER_SHA);tree=ast.parse(raw)
 selected=[n for n in tree.body if isinstance(n,ast.FunctionDef)and n.name in('mark','terminal')]
 need(len(selected)==2,'EXACT_EXISTING_PHYSICAL_HELPER_FUNCTIONS')
 ns={'Path':Path,'need':need}
 exec(compile(ast.Module(body=selected,type_ignores=[]),str(HELPER),'exec'),ns)
 return ns['mark'],ns['terminal']
def require_backend_and_base():
 info=json.loads(command(['/usr/bin/docker','info','--format','{"CgroupDriver":{{json .CgroupDriver}},"CgroupVersion":{{json .CgroupVersion}},"OSType":{{json .OSType}},"DockerRootDir":{{json .DockerRootDir}}}']).stdout)
 need(info.get('CgroupDriver')=='systemd'and str(info.get('CgroupVersion'))=='2'and info.get('OSType')=='linux','QUALIFIED_SYSTEMD_CGROUP2_DOCKER_REQUIRED')
 need(type(info.get('DockerRootDir'))is str and info['DockerRootDir'].startswith('/'),'DOCKER_ROOT_METADATA')
 data=Path(info['DockerRootDir']).resolve(strict=True);directory(data)
 need(data.stat().st_dev==Path('/srv/crays').stat().st_dev,'DOCKER_DATA_ON_QUALIFIED_AWS_DATA_MOUNT')
 v=os.statvfs(data);need(v.f_bavail*v.f_frsize>=2147483648,'FRESH_DOCKER_DATA_SPACE_RESERVE')
 ctrls=Path('/sys/fs/cgroup/cgroup.controllers').read_text().split();need(all(x in ctrls for x in('cpu','memory','pids')),'EXISTING_CGROUP2_RESOURCE_CONTROLLERS')
 helptext=command(['/usr/bin/docker','build','--help']).stdout.decode()
 for flag in('--cgroup-parent','--memory-swap','--cpu-quota','--cpu-period','--force-rm','--iidfile','--platform','--network','--pull'):
  need(flag in helptext,'EXPLICIT_LEGACY_BUILDER_FEATURE_REQUIRED')
 return require_existing_original_base()
def image_tag_absent():
 r=command(['/usr/bin/docker','image','inspect',OWN_TAG],check=False)
 need(r.returncode!=0 and(b'no such image'in r.stderr.lower()or b'no such object'in r.stderr.lower()),'OWN_ARTIFACT_TAG_EXISTS_OR_INSPECT_UNCERTAIN')
def headroom():
 available=int(next(line.split()[1]for line in Path('/proc/meminfo').read_text().splitlines()if line.startswith('MemAvailable:')))*1024
 load=float(Path('/proc/loadavg').read_text().split()[0])
 need(available>=2147483648 and load<=1.0,'FRESH_ROOT_BUILD_MEMORY_CPU_RESERVE')
def verify_result_image(iid):
 rows=docker_metadata(['image','inspect',OWN_TAG]);need(len(rows)==1,'EXACT_OWN_RESULT_IMAGE')
 x=rows[0];c=x.get('Config')or{}
 need(x['Id']==iid and x.get('Os')=='linux'and x.get('Architecture')=='amd64'and x.get('RootFS',{}).get('Layers',[])[:4]==DIFF_IDS,'OWN_RESULT_ORIGINAL_BASE_CHAIN')
 need(c.get('WorkingDir')=='/app'and c.get('User')=='node'and c.get('Cmd')==['node','server.mjs']and c.get('Entrypoint')==['docker-entrypoint.sh']and'NODE_ENV=production'in(c.get('Env')or[]),'ORIGINAL_RESULT_RUNTIME_METADATA_ONLY')
 labels=c.get('Labels')or{}
 need(labels.get('org.opencontainers.image.version')=='1.3.0-cclub068'and labels.get('crays.source-bundle.sha256')=='3aea48235023e32705d3c3e5e127109ba94f26b19dee482bb12a30d2030aae80'and labels.get('crays.live-money.allowed')=='false','ORIGINAL_RESULT_LABELS')
 return {'imageId':iid,'tag':OWN_TAG,'sourceBuiltImageNotNativeOriginalByteIdentity':True,'nativeOriginal8f994ParityProven':False,'runtimeStarted':False,'protectedBindingsIncluded':False,'databaseTouched':False}
def worker(review_sha):
 global BUDGET
 BUDGET=time.monotonic()+555
 r,selfsha,rsha=reviewed(555);need(rsha==review_sha,'EXACT_PARENT_REVIEW_BYTES')
 need('/'+SLICE+'/'+UNIT in Path('/proc/self/cgroup').read_text(),'WORKER_WITHIN_EXACT_OWN_UNIT')
 end=time.monotonic()+8
 while not(OUT/'SLICE_READY.json').exists():
  need(time.monotonic()<end,'OWN_SLICE_READY_TIMEOUT');time.sleep(0.1)
 ready=json.loads(public_bytes(OUT/'SLICE_READY.json',4096))
 need(ready.get('sourceSHA256')==selfsha and ready.get('reviewSHA256')==rsha and ready.get('slice')==SLICE,'EXACT_SLICE_READY_BINDING')
 slice_limits();headroom();base=require_backend_and_base();image_tag_absent()
 directory(OUT/'docker-config-empty');need(not list((OUT/'docker-config-empty').iterdir()),'NO_PRIVATE_DOCKER_AUTH_OR_PROXY_CONFIG')
 context=context_open()
 try:
  tar=original_build_stdin();context_recheck(context)
  put(OUT/'BUILD_ATTEMPTED.json',{'sourceSHA256':selfsha,'reviewSHA256':rsha,'onceOnly':True,'legacyBuilder':True,'cgroupParent':SLICE,'base':base,'originalDockerfileSHA256':PINS[0][2]})
  argv=['/usr/bin/docker','build','--platform=linux/amd64','--pull=false','--no-cache','--force-rm','--rm=true','--memory=536870912','--memory-swap=536870912','--cpu-period=100000','--cpu-quota=50000','--cgroup-parent='+SLICE,'--ulimit=nproc=128:128','--network=default','--quiet','--tag',OWN_TAG,'--file','Dockerfile','--iidfile',str(OUT/'IMAGE_ID.txt'),'-']
  logfd=os.open(OUT/'BUILD.public.log',os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o400)
  resource.setrlimit(resource.RLIMIT_FSIZE,(4194304,4194304))
  with os.fdopen(logfd,'wb')as log:
   p=subprocess.Popen(argv,stdin=subprocess.PIPE,stdout=log,stderr=subprocess.STDOUT,env=ENV,start_new_session=True)
   try:p.communicate(tar,timeout=remaining(480))
   except BaseException:
    p.kill()
    try:p.wait(timeout=3)
    except subprocess.TimeoutExpired:pass
    raise Hold('BUILD_RESPONSE_UNCERTAIN_ROOT_RECOVERY_ONLY')
   log.flush();os.fsync(log.fileno())
  need(p.returncode==0,'BUILD_NOT_SUCCESSFUL_NO_REPLAY')
  iid=public_bytes(OUT/'IMAGE_ID.txt',128).decode().strip()
  need(__import__('re').fullmatch(r'sha256:[a-f0-9]{64}',iid)is not None,'OWN_IMAGE_ID_RECEIPT')
  result=verify_result_image(iid);context_recheck(context);slice_limits()
  put(OUT/'WORKER_ACTUAL.json',{'status':'BFF80_ORIGINAL_SOURCE_IMAGE_BUILT_NOT_STARTED','dockerBuildTerminalSuccess':True,'sourceSHA256':selfsha,'reviewSHA256':rsha,'base':base,'result':result,'originalFiveFileBytesVerified':True,'npmOriginalIgnoreScriptsPreserved':True,'fullCustomerAcceptance':False})
 finally:context_close(context)
def physical_return():
 mark,terminal=helper_terminal_functions()
 unit=own_unit()
 if unit.get('LoadState')!='not-found':
  command(['/usr/bin/systemctl','stop',UNIT],cap=15,check=False)
  unit=own_unit()
  if unit.get('MainPID','0')!='0':
   command(['/usr/bin/systemctl','kill','--signal=SIGKILL',UNIT],cap=8,check=False)
 for cid in own_scope_ids():
  obj=own_container(cid)
  if obj is None:continue
  proof=mark(obj)if obj['State'].get('Running')and obj['State'].get('Pid',0)>0 else None
  if obj['State'].get('Running'):
   need(proof is not None,'OWN_RUNNING_WORKER_PHYSICAL_MARK_REQUIRED')
   command(['/usr/bin/docker','stop','--time=3',cid],cap=8,check=False)
   now=own_container(cid)
   if now and now['State'].get('Running'):command(['/usr/bin/docker','kill',cid],cap=8,check=False)
  if proof:terminal(proof)
  now=own_container(cid)
  if now:
   need(not now['State'].get('Running')and now['State'].get('Pid')==0,'OWN_DOCKER_WORKER_NOT_TERMINAL')
   command(['/usr/bin/docker','rm',cid],cap=8)
 if cg_populated():
  # Only an exclusively created own slice, exact known unit and Docker scopes.
  own_scope_ids()
  fd=os.open(CG,os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW|os.O_CLOEXEC)
  try:
   st=os.fstat(fd);need(ident(st)==ident(CG.lstat()),'OWN_SLICE_NAMED_IDENTITY')
   k=os.open('cgroup.kill',os.O_WRONLY|os.O_NOFOLLOW|os.O_CLOEXEC,dir_fd=fd)
   try:os.write(k,b'1')
   finally:os.close(k)
  finally:os.close(fd)
 end=time.monotonic()+15
 while cg_populated():
  need(time.monotonic()<end,'OWN_SLICE_STILL_POPULATED');time.sleep(0.2)
 unit=own_unit()
 need(unit.get('LoadState')=='not-found'or(unit.get('MainPID','0')=='0'and unit.get('ActiveState')in('inactive','failed')),'OWN_SERVICE_PHYSICAL_RETURN')
 for cid in own_scope_ids():
  obj=own_container(cid);need(obj is None or(not obj['State'].get('Running')and obj['State'].get('Pid')==0),'OWN_DOCKER_FINAL_PHYSICAL_RETURN')
 command(['/usr/bin/systemctl','stop',SLICE],cap=8,check=False)
 need(not cg_populated(),'OWN_SLICE_FINAL_EMPTY')
 return {'mainPidZeroAndInactive':True,'ownSliceAbsentOrPopulatedZero':True,'ownDockerWorkersTerminal':True,'physicalReturnVerified':True}
def parent():
 global BUDGET
 hard_deadline=time.monotonic()+660
 BUDGET=hard_deadline-75
 os.umask(0o077)
 need(os.geteuid()==0 and Path('/sys/devices/virtual/dmi/id/board_asset_tag').read_text().strip()=='i-0eb300e1b02414d8f','EXACT_EXISTING_AWS_ROOT')
 r,selfsha,rsha=reviewed()
 need('/'+SLICE+'/'not in Path('/proc/self/cgroup').read_text(),'ROOT_COORDINATOR_OUTSIDE_WORKER_SLICE')
 for p in(Path('/srv'),Path('/srv/crays'),Path('/srv/crays/migration-work'),ROOT,CONTEXT.parent):directory(p)
 raw=public_bytes(STORAGE,262144,STORAGE_SHA);ns={'__name__':'bff80_existing_storage_guard','__file__':str(STORAGE)};exec(compile(raw,str(STORAGE),'exec'),ns);ns['verify_data_mount'](Path('/srv/crays'))
 helper_terminal_functions()
 need(not os.path.lexists(OUT),'BUILD80_ATTEMPT_EXISTS_INSPECT_NO_REPLAY')
 lockfd=os.open(LOCK,os.O_RDWR|os.O_NOFOLLOW|os.O_CLOEXEC)
 fstate=os.fstat(lockfd);need(stat.S_ISREG(fstate.st_mode)and fstate.st_uid==0 and fstate.st_nlink==1 and not stat.S_IMODE(fstate.st_mode)&0o022 and ident(fstate)==ident(LOCK.lstat()),'ROOT_HEAVY_LOCK_CUSTODY')
 fcntl.flock(lockfd,fcntl.LOCK_EX|fcntl.LOCK_NB)
 fencefd=None;fencest=None;unit_attempted=False;success=False;returned=False;result={'status':'BFF80_BUILD_HOLD','automaticReplayAllowed':False,'runtimeStarted':False,'databaseOrProtectedBindingsTouched':False,'sourceXLXXLWritten':False,'nativeOriginal8f994ParityProven':False}
 try:
  need(not os.path.lexists(FENCE),'GLOBAL_ROOT_ATTEMPT_FENCE_BUSY')
  headroom();require_absent_unit(UNIT);require_absent_unit(SLICE);need(not CG.exists(),'OWN_SLICE_CGROUP_ALREADY_EXISTS')
  base=require_backend_and_base();image_tag_absent()
  p=context_open()
  try:original_build_stdin();context_recheck(p)
  finally:context_close(p)
  OUT.mkdir(mode=0o700);fsyncdir(OUT.parent)
  (OUT/'docker-config-empty').mkdir(mode=0o700);fsyncdir(OUT)
  put(OUT/'ONCE_INTENT.json',{'sourceSHA256':selfsha,'reviewSHA256':rsha,'unit':UNIT,'slice':SLICE,'tag':OWN_TAG,'base':base,'replayAllowed':False})
  fencefd=os.open(FENCE,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW|os.O_CLOEXEC,0o400);fencest=os.fstat(fencefd)
  payload=json.dumps({'owner':'business-bff80-original-build01','sourceSHA256':selfsha,'reviewSHA256':rsha,'unit':UNIT,'slice':SLICE,'attemptRoot':str(OUT),'fenceIsNotTTL':True},sort_keys=True,separators=(',',':')).encode()
  need(os.write(fencefd,payload)==len(payload),'ROOT_FENCE_FULL_WRITE');os.fsync(fencefd);fsyncdir(ROOT)
  unit_attempted=True
  command(['/usr/bin/systemd-run','--unit='+UNIT,'--slice='+SLICE,'--service-type=exec','--property=MemoryMax=536870912','--property=MemorySwapMax=0','--property=TasksMax=64','--property=CPUQuota=50%','--property=CPUQuotaPeriodSec=100ms','--property=RuntimeMaxSec=600','--property=TimeoutStopSec=10','--property=KillMode=control-group','--property=StandardOutput=null','--property=StandardError=null','/usr/bin/python3','-I','-B','-S',str(Path(__file__)),'worker',rsha],cap=12)
  command(['/usr/bin/systemctl','set-property','--runtime',SLICE,'MemoryMax=536870912','MemorySwapMax=0','TasksMax=128','CPUQuota=50%','CPUQuotaPeriodSec=100ms'],cap=8)
  slice_limits();own_unit()
  put(OUT/'SLICE_READY.json',{'sourceSHA256':selfsha,'reviewSHA256':rsha,'slice':SLICE,'resourceLimitsVerified':True})
  end=min(time.monotonic()+575,BUDGET)
  while True:
   unit=own_unit()
   if unit.get('LoadState')=='not-found'or(unit.get('MainPID','0')=='0'and unit.get('ActiveState')in('inactive','failed')):break
   need(time.monotonic()<end,'BUILD_UNIT_DEADLINE');time.sleep(0.5)
  actual=json.loads(public_bytes(OUT/'WORKER_ACTUAL.json',16384))
  need(actual.get('status')=='BFF80_ORIGINAL_SOURCE_IMAGE_BUILT_NOT_STARTED'and actual.get('dockerBuildTerminalSuccess')is True and actual.get('sourceSHA256')==selfsha and actual.get('reviewSHA256')==rsha,'EXACT_WORKER_TERMINAL_SUCCESS_RECEIPT')
  result.update(status='BFF80_ORIGINAL_SOURCE_IMAGE_BUILT_NOT_STARTED',workerActual=actual);success=True
 except BaseException as e:
  result['errorClass']=type(e).__name__;result['guard']=str(e)if isinstance(e,Hold)else None
 finally:
  signal.signal(signal.SIGTERM,signal.SIG_IGN);signal.signal(signal.SIGINT,signal.SIG_IGN)
  BUDGET=hard_deadline
  try:
   if unit_attempted:result['physicalReturn']=physical_return()
   else:result['physicalReturn']={'noOwnedUnitCreationAttempted':True,'physicalReturnVerified':True}
   returned=True
  except BaseException as e:result['physicalReturn']={'physicalReturnVerified':False,'errorClass':type(e).__name__}
  if fencefd is not None:
   # Failure/uncertain daemon response retains the exclusive fence even if currently empty.
   if success and returned:
    try:
     need((FENCE.lstat().st_dev,FENCE.lstat().st_ino)==(fencest.st_dev,fencest.st_ino)==(os.fstat(fencefd).st_dev,os.fstat(fencefd).st_ino),'OWN_ROOT_FENCE_IDENTITY')
     need(ident(os.fstat(lockfd))==ident(LOCK.lstat()),'ROOT_LOCK_NAME_UNCHANGED')
     FENCE.unlink();fsyncdir(ROOT);result['rootFenceReleasedAfterPhysicalReturn']=True
    except BaseException:result['rootFenceReleasedAfterPhysicalReturn']=False
   else:result['rootFenceReleasedAfterPhysicalReturn']=False
   os.close(fencefd)
  else:result['rootFenceCreated']=False
  result['success']=success and returned and result.get('rootFenceReleasedAfterPhysicalReturn')is True
  result['recoveryOnlyIfIncomplete']=not result['success']
  if OUT.exists():
   try:put(OUT/'RESULT_ACTUAL.json',result)
   except BaseException:result['actualReceiptPersistenceUncertain']=True
  os.close(lockfd)
  print(json.dumps(result,sort_keys=True,separators=(',',':')))
 return 0 if result.get('success')else 1
def interrupted(*a):raise Hold('ROOT_BUILD_SIGNAL_INTERRUPTED')
if __name__=='__main__':
 signal.signal(signal.SIGTERM,interrupted);signal.signal(signal.SIGINT,interrupted)
 try:
  need(len(sys.argv)>=2,'ROOT_BUILD_MODE_REQUIRED')
  if sys.argv[1]=='parent':raise SystemExit(parent())
  need(sys.argv[1]=='worker'and len(sys.argv)==3,'EXACT_WORKER_INVOCATION')
  worker(sys.argv[2])
 except (Exception,KeyboardInterrupt)as e:
  print(json.dumps({'status':'BFF80_BUILD_GUARD_HOLD','guard':str(e)if isinstance(e,Hold)else None,'errorClass':type(e).__name__,'automaticReplayAllowed':False}));raise SystemExit(1)
