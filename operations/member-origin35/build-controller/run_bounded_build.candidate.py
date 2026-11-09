"""Root-reviewed finite own AWS member origin build. No live adoption."""
from pathlib import Path
import os,sys,json,hashlib,stat,subprocess,time,fcntl,signal,datetime
P=Path(__file__).resolve().parent
OWNER='01a19c4c-4e60-7eb3-93ea-0a15a89cfae0'
NAME='crays-member-origin35-build-20261109-01'
IMAGE='sha256:752ea8a2f758c34002a0461bd9f1cee4f9a3c36d48494586f60ffce1fc708e0e'
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
def need(v,m):
 if not v:raise RuntimeError(m)
def cmd(*a,timeout=12,check=True):
 r=subprocess.run(['/usr/bin/docker',*a],capture_output=True,text=True,timeout=timeout,env={'PATH':'/usr/bin:/bin'})
 if check:need(r.returncode==0,'DOCKER_'+a[0]+'_FAILED')
 return r
def field(c,f):return cmd('inspect','--format',f,c).stdout.strip()
def absent(c):
 r=cmd('inspect',c,check=False)
 if r.returncode==0:return False
 need(r.returncode==1 and r.stdout.strip()=='[]' and r.stderr.strip().lower() in {'error: no such object: '+c.lower(),'error: no such container: '+c.lower()},'ABSENCE_UNCERTAIN_RETAIN_LEASE')
 return True
def identity(c):
 pid=int(field(c,'{{.State.Pid}}'));need(pid>0,'OWN_PID_REQUIRED')
 p=Path('/proc')/str(pid);ticks=p.joinpath('stat').read_text().rsplit(')',1)[1].split()[19];cg=p.joinpath('cgroup').read_text().strip().split(':',2)[-1]
 need(c in cg and '..' not in cg.split('/'),'OWN_CGROUP_REQUIRED')
 return pid,ticks,Path('/sys/fs/cgroup')/cg.lstrip('/')
def stopped(c,proof):
 need(field(c,'{{.State.Running}} {{.State.Pid}}')=='false 0','NOT_PHYSICALLY_STOPPED')
 if proof:
  pid,ticks,cg=proof;f=Path('/proc')/str(pid)/'stat';need(not f.exists() or f.read_text().rsplit(')',1)[1].split()[19]!=ticks,'OWN_PID_ALIVE')
  f=cg/'cgroup.procs';need(not f.exists() or not f.read_text().strip(),'OWN_CGROUP_POPULATED')
def protected(p):
 p=Path(p).resolve();s=p.lstat();need(str(p).startswith('/srv/crays/migration-work/20261108/root/') and stat.S_ISREG(s.st_mode) and s.st_uid==0 and not stat.S_IMODE(s.st_mode)&0o022,'PROTECTED_ROOT_FILE_REQUIRED');return p
def main():
 os.umask(0o077)
 need(os.getuid()==0 and Path('/sys/devices/virtual/dmi/id/board_asset_tag').read_text().strip()=='i-0eb300e1b02414d8f','EXACT_AWS_HOST_REQUIRED')
 need(len(sys.argv)==2,'ROOT_REVIEW_REQUIRED')
 rp=protected(sys.argv[1]);r=json.loads(rp.read_bytes())
 need(r.get('authority')=='Root' and r.get('executionApproved') is True and r.get('independentlyReviewed') is True and r.get('noConcurrentSharedRuntimeCorrection') is True,'ROOT_INDEPENDENT_EXECUTION_WINDOW_REQUIRED')
 now=datetime.datetime.now(datetime.timezone.utc);ws=datetime.datetime.fromisoformat(r['windowStartUTC'].replace('Z','+00:00'));we=datetime.datetime.fromisoformat(r['windowEndUTC'].replace('Z','+00:00'))
 need(ws<=now and now+datetime.timedelta(seconds=240)<=we,'EXACT_FINITE_WINDOW_REQUIRED')
 need(set(r['inputSHA256'])=={'build_module.cjs','run_bounded_build.candidate.py'},'ALL_INPUT_PINS_REQUIRED')
 for n,h in r['inputSHA256'].items():need('/' not in n and sha(P/n)==h,'EXACT_REVIEWED_SOURCE_REQUIRED')
 workspace=Path(r['sourceWorkspace']).resolve();dependencies=Path(r['dependencyRoot']).resolve()
 for p in [workspace,dependencies]:need(str(p).startswith('/srv/crays/migration-work/20261108/root/') and p.is_dir(),'OWN_AWS_INPUT_CUSTODY_REQUIRED')
 ir=protected(r['verifiedInputsReceipt']);need(sha(ir)==r['verifiedInputsReceiptSHA256'],'EXACT_RESTORED_INPUT_RECEIPT_REQUIRED')
 inputs=json.loads(ir.read_bytes());need(inputs.get('allSourceCapturePinsVerified') is True and inputs.get('allDependencyCapturePinsVerified') is True and inputs.get('exactTwoLinePatchVerified') is True,'CAPTURE_EXTRACTION_AND_PATCH_REQUIRED')
 need(inputs.get('sourceCaptureRowsSHA256')=='b1f37f7849fb0ccd41d9a20c62a4d7032e2fa12b6e63b0437aefe597c68a849e','EXACT_CANONICAL_SOURCE_REQUIRED')
 need(sha(workspace/'candidate/src/integration/original-platform-identity.ts')==r['patchedPredicateSHA256'],'EXACT_PATCHED_PREDICATE_REQUIRED')
 for n,v in {'vite':'8.1.4','typescript':'5.9.3','react':'19.2.4','react-dom':'19.2.4'}.items():need(json.loads((dependencies/n/'package.json').read_bytes())['version']==v,'ORIGINAL_DEPENDENCY_VERSION_REQUIRED')
 need(cmd('image','inspect','--format','{{.Id}}',IMAGE).stdout.strip()==IMAGE,'EXACT_EXISTING_NODE_IMAGE_REQUIRED')
 mem=int(next(x.split()[1] for x in Path('/proc/meminfo').read_text().splitlines() if x.startswith('MemAvailable:')))*1024;need(mem>=2147483648,'AVAILABLE_BUILD_MEMORY_REQUIRED')
 lock=P.parent/'ROOT_HEAVY_EXECUTION.lock';fd=os.open(lock,os.O_RDONLY|os.O_NOFOLLOW);fcntl.flock(fd,fcntl.LOCK_EX|fcntl.LOCK_NB)
 fence=P.parent/'ROOT_HEAVY_ATTEMPT_ACTIVE.json';need(not fence.exists() and absent(NAME),'NO_CONCURRENT_OR_REPLAY_REQUIRED')
 targets=r['sharedRuntimeGenerations'];need(isinstance(targets,dict) and len(targets)>=3,'EXACT_SHARED_GENERATIONS_REQUIRED')
 before={c:identity(c)[:2] for c in targets};need(all(list(before[c])==targets[c] for c in targets),'SHARED_GENERATION_DRIFT')
 out=P/'execution01';out.mkdir(mode=0o700);lease=P/'LEASE_ACTIVE.json'
 lf=os.open(lease,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o600);lst=os.fstat(lf)
 with os.fdopen(lf,'w') as f:json.dump({'owner':OWNER,'name':NAME,'reviewSHA256':sha(rp),'sourceSHA256':sha(__file__),'maximumSeconds':240},f)
 ff=os.open(fence,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o600);fst=os.fstat(ff)
 with os.fdopen(ff,'w') as f:json.dump({'owner':OWNER,'scope':'member-origin35-build','pid':os.getpid(),'automaticReplay':False},f)
 result={'status':'INCOMPLETE','liveAdopted':False,'XXLWrites':False,'cleanupErrors':[]};cid=None;proof=None;attempted=False
 def record():(out/'RESULT_ACTUAL.json').write_text(json.dumps(result,indent=2))
 def alarm(*x):raise TimeoutError('FINITE_BUILD_EXPIRED')
 old=signal.signal(signal.SIGALRM,alarm);term=signal.signal(signal.SIGTERM,alarm);signal.alarm(210)
 try:
  attempted=True
  cid=cmd('create','--name',NAME,'--label','crays.website.owner='+OWNER,'--label','crays.website.source='+sha(__file__),'--pull=never','--user','0:0','--network','none','--cpus=0.5','--memory=1610612736','--memory-swap=1610612736','--pids-limit=128','--read-only','--cap-drop=ALL','--security-opt=no-new-privileges','--log-driver=none','--tmpfs','/tmp:rw,nosuid,nodev,size=134217728,mode=1777','--env','HOME=/tmp/home','--env','NODE_OPTIONS=--max-old-space-size=1200','--mount','type=bind,src='+str(P)+',dst=/job,readonly','--mount','type=bind,src='+str(workspace)+',dst=/work,readonly','--mount','type=bind,src='+str(dependencies)+',dst=/work/candidate/node_modules,readonly','--mount','type=bind,src='+str(out)+',dst=/output','--entrypoint','/bin/sh',IMAGE,'-c','i=0; while [ ! -f /output/START_APPROVED ]; do i=$((i+1)); [ "$i" -lt 100 ] || exit 90; sleep 0.1; done; node /job/build_module.cjs > /output/build.stdout.txt 2> /output/build.stderr.txt',timeout=20).stdout.strip()
  need(len(cid)==64 and all(x in '0123456789abcdef' for x in cid),'OWN_CID_REQUIRED');result['containerId']=cid;record()
  cmd('start',cid);proof=identity(cid);result.update({'ownPID':proof[0],'ownStartTicks':proof[1],'ownCgroup':str(proof[2])});record();(out/'START_APPROVED').write_text('OWN_PID_CGROUP_BOUND')
  result['exitCode']=cmd('wait',cid,timeout=180).stdout.strip();stopped(cid,proof)
  need({c:identity(c)[:2] for c in targets}==before,'SHARED_GENERATION_CHANGED')
  need(result['exitCode']=='0' and (out/'BUILD_ACTUAL.json').is_file(),'BUILD_FAILED_INSPECT_NO_REPLAY')
  actual=json.loads((out/'BUILD_ACTUAL.json').read_bytes());need(actual['status']=='OWN_ORIGIN_MODULE_BUILD_PASS_ADOPTION_PENDING','BUILD_ACTUAL_REQUIRED')
  result.update({'status':'OWN_ORIGIN_MODULE_BUILD_PASS_ADOPTION_PENDING','buildActualSHA256':sha(out/'BUILD_ACTUAL.json'),'moduleManifestSHA256':sha(out/'MODULE_MANIFEST.json'),'moduleVersion':actual['version']})
 except BaseException as e:result.update({'status':'STOP_INSPECT_SAME_ATTEMPT_NO_REPLAY','errorClass':type(e).__name__,'guard':str(e)[:180]})
 finally:
  signal.alarm(0);signal.signal(signal.SIGALRM,old);signal.signal(signal.SIGTERM,term)
  try:
   if not cid and attempted and not absent(NAME):
    candidate=field(NAME,'{{.Id}}');need(field(candidate,'{{index .Config.Labels "crays.website.owner"}}')==OWNER and field(candidate,'{{index .Config.Labels "crays.website.source"}}')==sha(__file__),'UNCERTAIN_CREATE_NOT_OWNED');cid=candidate
   if cid:
    if field(cid,'{{.State.Running}}')=='true':
     if proof is None:proof=identity(cid)
     cmd('stop','--time','3',cid,timeout=8,check=False)
    try:stopped(cid,proof)
    except BaseException:cmd('kill',cid,check=False);time.sleep(.3);stopped(cid,proof)
    result['ownPIDCgroupPhysicallyStopped']=True;cmd('rm',cid);need(absent(cid),'OWN_CONTAINER_REMAINS');result['ownContainerPhysicallyRemoved']=True
   else:need(absent(NAME),'UNCERTAIN_CREATE_REMAINS')
   s=lease.lstat();need((s.st_dev,s.st_ino)==(lst.st_dev,lst.st_ino),'OWN_LEASE_CHANGED');lease.unlink();result['ownLeaseReleasedAfterPhysicalCleanup']=True
   s=fence.lstat();need((s.st_dev,s.st_ino)==(fst.st_dev,fst.st_ino),'ROOT_FENCE_CHANGED');fence.unlink();result['rootFenceReleasedAfterPhysicalCleanup']=True
  except BaseException as e:result['cleanupErrors'].append({'errorClass':type(e).__name__,'guard':str(e)[:160]})
  record();os.close(fd);print(json.dumps(result))
 return 0 if result['status']=='OWN_ORIGIN_MODULE_BUILD_PASS_ADOPTION_PENDING' and not result['cleanupErrors'] else 1
if __name__=='__main__':raise SystemExit(main())
