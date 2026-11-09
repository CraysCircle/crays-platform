"""One Root-reviewed original public-pool admission. No SQL/role/credential mutation."""
from pathlib import Path
import os,sys,json,hashlib,stat,subprocess,time,signal
P=Path(__file__).resolve().parent
SRC=Path('/srv/crays/migration-work/20261108/websites/club-credential-consumer-source13-20261108-02')
PROJECTION=Path('/srv/crays/private/club-public-rds-login-20261108-17/app-environment.private.json')
IMAGE='sha256:604f3de71d0154e7bfdb812fda4461c1f15d9e1827d75a399654a5b5bb46ae8b'
DEPS='/srv/crays/acceptance/public-frontends-20261105-01/web-pro/8dc8d503dbfac3f218363f0dc28492b953e3a2b3ee6e8627c368026c26a010ec/root/node_modules'
NAME='crays-club-original-pool-admission20-20261108-01'
OWNER='01a1b9fb-cf93-7de1-97a3-ceac6824969a'
KEY='CRAYS_CLUBS_PUBLIC_PRODUCTION_DATABASE_URL'
PINS={'admit_original_public_role_prosrc_flags.candidate.cjs':'e475647caafe3726184b4a6f1d4900d9d99c70bcbc26ff476aca28d479df310b','original-public-pool.cjs':'1e5c5acc9780915e4999e26b0a71666b92025e993116653129851b1328effabe','expected-functions.json':'f321e008c7e49a94f3c827c9153b55d3567ae1a50e731794a4925f2db7491d52','rds-regional-ca.pem':'a2c1bf4e3775a038e1db2cf92f9792c94855f20c6e1a72ada7587cb29e242c6e'}
def need(v,c):
 if not v:raise RuntimeError(c)
def sha(b):return hashlib.sha256(b).hexdigest()
def docker(*args,timeout=10,check=True,input=None):
 p=subprocess.run(['/usr/bin/docker',*args],input=input,capture_output=True,timeout=timeout,env={'PATH':'/usr/bin:/bin'})
 if check:need(p.returncode==0,'OWN_DOCKER_'+args[0].upper()+'_FAILED')
 return p
def field(cid,fmt):return docker('inspect','--format',fmt,cid).stdout.decode().strip()
def physical(cid):
 pid=int(field(cid,'{{.State.Pid}}'));need(pid>0,'OWN_LIVE_PID_REQUIRED')
 root=Path('/proc')/str(pid);ticks=(root/'stat').read_text().rsplit(')',1)[1].split()[19]
 group=(root/'cgroup').read_text().strip().split(':',2)[-1]
 need(cid in group and '..'not in group.split('/'),'OWN_CGROUP_REQUIRED')
 return pid,ticks,Path('/sys/fs/cgroup')/group.lstrip('/')
def terminal(cid,identity):
 need(field(cid,'{{.State.Running}} {{.State.Pid}}')=='false 0','OWN_CLIENT_NOT_TERMINAL')
 if identity:
  pid,ticks,cg=identity;f=Path('/proc')/str(pid)/'stat'
  need(not f.exists()or f.read_text().rsplit(')',1)[1].split()[19]!=ticks,'OWN_PID_STILL_LIVE')
  f=cg/'cgroup.procs';need(not f.exists()or not f.read_text().strip(),'OWN_CGROUP_STILL_LIVE')
def absent(target):
 r=docker('inspect',target,check=False)
 if r.returncode==0:return False
 text=r.stderr.decode('utf-8',errors='replace').strip().lower()
 need(r.returncode==1 and r.stdout.strip()==b'[]'and text in {'error: no such object: '+target.lower(),'error: no such container: '+target.lower()},'DOCKER_ABSENCE_UNCERTAIN_RETAIN_LEASE')
 return True
def main():
 os.umask(0o077)
 def interrupted(*a):raise KeyboardInterrupt()
 signal.signal(signal.SIGTERM,interrupted);signal.signal(signal.SIGINT,interrupted)
 need(os.getuid()==0 and Path('/sys/devices/virtual/dmi/id/board_asset_tag').read_text().strip()=='i-0eb300e1b02414d8f','EXACT_EXISTING_ROOT_AWS_HOST_REQUIRED')
 need(len(sys.argv)==2,'EXACT_ROOT_REVIEW_REQUIRED')
 rp=Path(sys.argv[1]).resolve();need(str(rp).startswith('/srv/crays/migration-work/20261108/root/'),'ROOT_REVIEW_CUSTODY_REQUIRED')
 review=json.loads(rp.read_bytes());need(review.get('authority')=='Root'and review.get('independentlyReviewed')is True and review.get('readOnlyAdmissionApproved')is True,'INDEPENDENT_ROOT_READONLY_ADMISSION_REQUIRED')
 need(review['controllerSHA256']==sha(Path(__file__).read_bytes()),'EXACT_REVIEWED_CONTROLLER_REQUIRED')
 for name,h in PINS.items():need(sha((SRC/name).read_bytes())==h,'EXACT_ORIGINAL_PUBLIC_SOURCE_REQUIRED')
 for name in ['admit_original_public_role_prosrc_flags.candidate.cjs','original-public-pool.cjs','rds-regional-ca.pem']:need(sha((P/'public'/name).read_bytes())==PINS[name],'EXACT_READABLE_PUBLIC_BIND_FILES_REQUIRED')
 need(review['source13InputSHA256']==PINS,'EXACT_REVIEWED_ORIGINAL_INPUTS_REQUIRED')
 need(review['credentialProjectionPath']==str(PROJECTION),'EXACT_EXISTING_ROOT_PRIVATE_PROJECTION_REQUIRED')
 fd=os.open(PROJECTION,os.O_RDONLY|os.O_NOFOLLOW|os.O_NONBLOCK)
 try:
  st=os.fstat(fd);need(stat.S_ISREG(st.st_mode)and st.st_uid==1000 and st.st_gid==1000 and stat.S_IMODE(st.st_mode)==0o400 and st.st_nlink==1 and st.st_size<=8192,'EXACT_APP_USER_PROJECTION_CUSTODY_REQUIRED')
  raw=os.read(fd,8193);after=os.fstat(fd)
  need((st.st_dev,st.st_ino,st.st_size,st.st_mtime_ns,st.st_ctime_ns)==(after.st_dev,after.st_ino,after.st_size,after.st_mtime_ns,after.st_ctime_ns)and len(raw)==st.st_size and sha(raw)==review['credentialProjectionSHA256'],'PINNED_PRIVATE_PROJECTION_CHANGED')
 finally:os.close(fd)
 private=json.loads(raw);raw=None;need(set(private)=={KEY}and isinstance(private[KEY],str),'ONE_ORIGINAL_CLUB_PURPOSE_ONLY')
 expected=json.loads((SRC/'expected-functions.json').read_bytes())['functions']
 payload=json.dumps({'rootReviewedReadOnlyExecution':True,'originalSourceSHA256':'bd93fafc12ff3aa159e54909a997903f2011bf3fb8fc2f94f7f44f1eabec3e79','rdsCASHA256':PINS['rds-regional-ca.pem'],'purpose':KEY,'ordinaryRoleBinding':private[KEY],'expectedFunctions':expected}).encode();private.clear()
 out=P/'execution01';out.mkdir(mode=0o700)
 lease=P/'LEASE_ACTIVE.json';lf=os.open(lease,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o600);ls=os.fstat(lf)
 with os.fdopen(lf,'w')as f:json.dump({'owner':OWNER,'containerName':NAME,'controllerSHA256':review['controllerSHA256'],'rootReviewSHA256':sha(rp.read_bytes()),'purpose':'original public pool readonly admission, existing credential only'},f)
 result={'status':'INCOMPLETE','databaseOrRoleWrites':False,'newCredentialGenerated':False,'privateValuesPrinted':False,'cleanupErrors':[]}
 cid=None;ident=None;attempted=False
 try:
  need(absent(NAME),'OWN_PREVIOUS_ATTEMPT_EXISTS_NO_REPLAY')
  args=['create','--pull=never','--name',NAME,'--label','crays.website.owner='+OWNER,'--label','crays.website.controller='+review['controllerSHA256'],'--network','crays-private-app-canonical-20261106-01','--user','1000:1000','--workdir','/app','--read-only','--cap-drop=ALL','--security-opt=no-new-privileges','--cpus=0.25','--memory=268435456','--memory-swap=268435456','--pids-limit=64','--log-driver=none','--tmpfs','/tmp:rw,nosuid,noexec,nodev,size=8388608','--mount','type=bind,src='+DEPS+',dst=/app/node_modules,readonly','--env','NODE_EXTRA_CA_CERTS=/qualification/rds-regional-ca.pem']
  for name in ['admit_original_public_role_prosrc_flags.candidate.cjs','original-public-pool.cjs','rds-regional-ca.pem']:args+=['--mount','type=bind,src='+str(P/'public'/name)+',dst=/qualification/'+name+',readonly']
  args+=['--entrypoint','sleep',IMAGE,'90'];attempted=True
  created=docker(*args,timeout=15);cid=created.stdout.decode().strip();need(len(cid)==64,'EXACT_CREATED_CID_REQUIRED')
  result['containerId']=cid;docker('start',cid);ident=physical(cid)
  probe=docker('exec','-i',cid,'node','/qualification/admit_original_public_role_prosrc_flags.candidate.cjs',input=payload,timeout=35,check=False);payload=None
  need(len(probe.stdout)<24000 and not probe.stderr,'SAFE_ORIGINAL_ADMISSION_OUTPUT_REQUIRED')
  rows=[json.loads(line)for line in probe.stdout.splitlines()if line.startswith(b'{')];need(len(rows)==1 and rows[0].get('privateValuesPrinted')is False,'EXACT_NONPRIVATE_ADMISSION_RESULT_REQUIRED')
  result['nativeAdmission']=rows[0];result['probeExitCode']=probe.returncode
  need(probe.returncode==0 and rows[0]['status']=='ORIGINAL_PUBLIC_ROLE_TLS_SCRAM_SEVEN_RPC_AND_ALL_SOURCE_GUARDS_PASS','ORIGINAL_CONSUMER_ADMISSION_NOT_PASSED')
  result['status']='ORIGINAL_CLUB_PUBLIC_POOL_ALL_GUARDS_TLS_SCRAM_SEVEN_RPC_NATIVE_PASS'
 except BaseException as e:
  result['status']='ORIGINAL_CLUB_POOL_ADMISSION_STOP_NO_REPLAY';result['errorClass']=type(e).__name__;result['guard']=str(e)if str(e).isupper()and len(str(e))<160 else None
 finally:
  signal.signal(signal.SIGTERM,signal.SIG_IGN);signal.signal(signal.SIGINT,signal.SIG_IGN)
  payload=None
  try:
   if not cid and attempted:
    if not absent(NAME):
     candidate=field(NAME,'{{.Id}}');need(field(candidate,'{{index .Config.Labels "crays.website.owner"}}')==OWNER and field(candidate,'{{index .Config.Labels "crays.website.controller"}}')==review['controllerSHA256'],'UNCERTAIN_CREATE_OWNERSHIP_REQUIRED');cid=candidate
   if cid:
    if field(cid,'{{.State.Running}}')=='true':
     if ident is None:ident=physical(cid)
     docker('stop','--time','3',cid,timeout=8,check=False)
    try:terminal(cid,ident)
    except BaseException:
     docker('kill',cid,check=False);time.sleep(.3);terminal(cid,ident)
    result['ownPIDAndCgroupPhysicallyStopped']=True
    docker('rm',cid);need(absent(cid),'OWN_CLIENT_REMOVAL_REQUIRED');result['temporaryNodeClientPhysicallyRemoved']=True
   else:need(absent(NAME),'UNCERTAIN_OWN_NAME_REMAINS')
   current=lease.lstat();need((current.st_dev,current.st_ino)==(ls.st_dev,ls.st_ino),'OWN_LEASE_IDENTITY_CHANGED');lease.unlink();result['ownLeaseReleasedAfterPhysicalCleanup']=True
  except BaseException as e:result['cleanupErrors'].append({'errorClass':type(e).__name__})
  (out/'RESULT_ACTUAL.json').write_text(json.dumps(result,indent=2));print(json.dumps(result))
 return 0 if result['status']=='ORIGINAL_CLUB_PUBLIC_POOL_ALL_GUARDS_TLS_SCRAM_SEVEN_RPC_NATIVE_PASS'and not result['cleanupErrors']else 1
if __name__=='__main__':raise SystemExit(main())
