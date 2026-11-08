"""CANDIDATE ONLY: original Postiz frontend in a bounded isolated container. Requires independent review."""
import argparse,fcntl,hashlib,json,os,pathlib,re,signal,stat,subprocess,threading,time,uuid
OWNER='01a1b9f3-700f-78b2-ad73-b6d9334c4ac4'
IMAGE='sha256:44587056a2696bd6f126ffdbe111ab0b20db75907fa0f67e213554fc68f680a9'
NAME='crays-delivery-postiz-frontend-isolated-20261108-01'
ROOT=pathlib.Path('/srv/crays/migration-work/20261108/delivery/postiz-frontend-isolated01')
CMD='while [ ! -f /admission/START_NATIVE ]; do sleep 0.1; done; exec pnpm --dir /app/apps/frontend start'
LIMIT=2*1024*1024
HEAVY_LOCK=pathlib.Path('/srv/crays/migration-work/20261108/root/ROOT_HEAVY_EXECUTION.lock')
HEAVY_FD=None
ROOT_FENCE=pathlib.Path('/srv/crays/migration-work/20261108/root/ROOT_HEAVY_ATTEMPT_ACTIVE.json')
FRONTEND_PACKAGE_SHA256='eba260fc863e54268e2532954b615d1b403b0c23f6c03187e121fb24a524033f'
def need(v,k):
 if not v:raise RuntimeError(k)
def sha(b):return hashlib.sha256(b).hexdigest()
def docker(*args,timeout=12):
 return subprocess.run(['/usr/bin/docker',*args],capture_output=True,timeout=timeout,env={'PATH':'/usr/bin:/bin'})
def put(p,value):
 raw=(json.dumps(value,sort_keys=True)+'\n').encode();fd=os.open(p,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o400)
 with os.fdopen(fd,'wb')as f:f.write(raw);f.flush();os.fsync(f.fileno())
 fd=os.open(p.parent,os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW)
 try:os.fsync(fd)
 finally:os.close(fd)
def protected_ancestry(path):
 for p in [path,*path.parents]:
  need(not p.is_symlink(),'NO_SYMLINK_ANCESTOR');st=p.stat();need(st.st_uid==0 and st.st_mode&0o022==0,'PROTECTED_ROOT_ANCESTRY')
def exact_file(path,pin):
 p=pathlib.Path(path);need(p.is_absolute()and '..'not in p.parts and p.is_file()and not p.is_symlink(),'EXACT_PRIVATE_INPUT_FILE')
 need(p.resolve()==p,'NO_INPUT_SYMLINK_ANCESTOR')
 protected_ancestry(p.parent)
 st=p.stat();need(st.st_uid==0 and st.st_mode&0o077==0 and st.st_size<=1048576,'PRIVATE_INPUT_CUSTODY')
 raw=p.read_bytes();need(sha(raw)==pin,'PRIVATE_INPUT_SHA256');return raw
def read_root_recovery_fence():
 need(ROOT_FENCE.is_file()and not ROOT_FENCE.is_symlink()and ROOT_FENCE.resolve()==ROOT_FENCE,'ROOT_RECOVERY_FENCE_REQUIRED')
 protected_ancestry(ROOT_FENCE.parent);st=ROOT_FENCE.stat();need(st.st_uid==0 and st.st_mode&0o077==0 and st.st_size<=16384,'PROTECTED_ROOT_RECOVERY_FENCE')
 raw=ROOT_FENCE.read_bytes();f=json.loads(raw)
 need(f.get('schema')=='crays.root.heavy-attempt-active.v1'and f.get('ownerThread')==OWNER and f.get('attemptScope')=='delivery.postiz-frontend-isolated01'and f.get('containerName')==NAME and f.get('image')==IMAGE and f.get('runtimeRoot')==str(ROOT),'EXACT_ROOT_RECOVERY_FENCE_SCOPE')
 need(isinstance(f.get('sourcePacketSHA256'),str)and re.fullmatch('[0-9a-f]{64}',f['sourcePacketSHA256'])and f.get('removeOnlyBy')=='Root'and f.get('ttlReleaseAllowed')is False and f.get('foreignHeavyAdmissionsBlocked')is True,'ROOT_RECOVERY_CUSTODY_CONTRACT')
 return {'path':str(ROOT_FENCE),'sha256':sha(raw),'sourcePacketSHA256':f['sourcePacketSHA256']}
def proc_binding(pid,cid):
 p=pathlib.Path('/proc')/str(pid)
 try:
  ticks=int((p/'stat').read_text().rsplit(')',1)[1].split()[19])
  rows=(p/'cgroup').read_text().splitlines()
 except FileNotFoundError:raise RuntimeError('OWN_PID_DISAPPEARED_BEFORE_BINDING')
 rel=[x.split(':',2)[2]for x in rows if x.startswith('0::')]
 need(len(rel)==1 and cid in rel[0]and '..'not in rel[0].split('/'),'EXACT_OWN_PID_CGROUP')
 return {'pid':pid,'startTicks':ticks,'cgroup':rel[0]}
def lifetime_alive(bound):
 p=pathlib.Path('/proc')/str(bound['pid'])
 try:
  ticks=int((p/'stat').read_text().rsplit(')',1)[1].split()[19])
  rows=(p/'cgroup').read_text()
 except FileNotFoundError:return False
 return ticks==bound['startTicks'] or bound['containerId']in rows
def group_gone(pgid):
 try:os.killpg(pgid,0);return False
 except ProcessLookupError:return True
def main():
 global HEAVY_FD
 os.umask(0o077)
 ap=argparse.ArgumentParser();ap.add_argument('--binding',required=True);ap.add_argument('--binding-sha256',required=True);ap.add_argument('--heavy-lock-fd',type=int);a=ap.parse_args()
 need(re.fullmatch('[0-9a-f]{64}',a.binding_sha256),'BINDING_PIN_REQUIRED')
 binding=json.loads(exact_file(a.binding,a.binding_sha256))
 need(set(binding)=={'launchPath','launchSHA256','envJsonPath','userJsonPath','expectedUser','ownerThread','image','root','name'},'EXACT_BINDING_FIELDS')
 need(binding['ownerThread']==OWNER and binding['image']==IMAGE and binding['root']==str(ROOT)and binding['name']==NAME,'BOUND_OWN_FRONTEND_IDENTITY')
 need(binding['expectedUser']in['','root','0','0:0'],'ORIGINAL_ROOT_USER_REQUIRED')
 need(re.fullmatch('[0-9a-f]{64}',binding['launchSHA256']),'LAUNCH_SHA_REQUIRED')
 launch=json.loads(exact_file(binding['launchPath'],binding['launchSHA256']))
 if isinstance(launch,list):
  need(len(launch)==1 and isinstance(launch[0],dict),'SINGLETON_DOCKER_INSPECT_ONLY');launch=launch[0]
 need(isinstance(launch,dict)and launch.get('Image')==IMAGE and launch.get('Name')=='/crays-main-postiz-app-v2','EXACT_ORIGINAL_APP_INSPECT_IDENTITY')
 need(isinstance(launch.get('Config'),dict)and launch['Config'].get('WorkingDir')=='/app'and not launch['Config'].get('Volumes'),'ORIGINAL_WORKDIR_AND_NO_VOLUMES')
 def select(parts):
  need(isinstance(parts,list)and 0<len(parts)<=8 and all(isinstance(k,str)and re.fullmatch('[A-Za-z_][A-Za-z0-9_]*',k)for k in parts),'EXACT_JSON_KEY_PATH_REQUIRED')
  v=launch
  for k in parts:need(isinstance(v,dict)and k in v,'EXACT_LAUNCH_FIELD_MISSING');v=v[k]
  return v
 env=select(binding['envJsonPath']);user=select(binding['userJsonPath'])
 need(user==binding['expectedUser'],'ORIGINAL_EFFECTIVE_ROOT_USER')
 need(isinstance(env,list)and all(isinstance(x,str)and '='in x and '\n'not in x and '\r'not in x and '\x00'not in x for x in env),'ORIGINAL_ENV_FILE_REPRESENTABLE')
 keys=[x.split('=',1)[0]for x in env]
 need(len(keys)==len(set(keys))and all(re.fullmatch('[A-Za-z_][A-Za-z0-9_]*',k)for k in keys),'ORIGINAL_ENV_KEYS_UNAMBIGUOUS')
 # No values, environment hashes, credentials, command diagnostics or launch content are emitted.
 need(all(x.split('=',1)[1].strip()==x.split('=',1)[1]for x in env),'NO_ENV_PARSER_WHITESPACE_AMBIGUITY')
 need(os.geteuid()==0,'ROOT_HOST_REQUIRED')
 # Admission never creates or writes the shared lock. Busy is not an application attempt.
 need(HEAVY_LOCK.is_file()and not HEAVY_LOCK.is_symlink()and HEAVY_LOCK.resolve()==HEAVY_LOCK,'EXISTING_SHARED_HEAVY_LOCK_REQUIRED')
 HEAVY_FD=a.heavy_lock_fd if a.heavy_lock_fd is not None else os.open(HEAVY_LOCK,os.O_RDONLY|os.O_NOFOLLOW)
 lockst=os.fstat(HEAVY_FD);need(stat.S_ISREG(lockst.st_mode)and lockst.st_uid==0 and (lockst.st_dev,lockst.st_ino)==(HEAVY_LOCK.stat().st_dev,HEAVY_LOCK.stat().st_ino),'EXACT_SHARED_HEAVY_LOCK_INODE')
 try:fcntl.flock(HEAVY_FD,fcntl.LOCK_EX|fcntl.LOCK_NB)
 except BlockingIOError:
  os.close(HEAVY_FD);HEAVY_FD=None;raise RuntimeError('ADMISSION_NOT_EXECUTED_SHARED_HEAVY_LOCK_BUSY')
 root_fence=read_root_recovery_fence()
 need(not ROOT.exists()and not ROOT.is_symlink(),'FRESH_ROOT_NO_REPLAY')
 parent=ROOT.parent;need(parent.is_dir()and parent.resolve()==parent,'EXISTING_OWN_PARENT');protected_ancestry(parent)
 mount=subprocess.run(['/usr/bin/findmnt','--noheadings','--output','TARGET,FSTYPE','--target',str(parent)],capture_output=True,timeout=5,env={'PATH':'/usr/bin:/bin'})
 need(mount.returncode==0 and mount.stdout.decode().split()in[['/srv/crays','ext4'],['/srv/crays','xfs']],'APPROVED_PERSISTENT_EBS_MOUNT')
 headroom=int(next(x.split()[1]for x in pathlib.Path('/proc/meminfo').read_text().splitlines()if x.startswith('MemAvailable:')))*1024
 disk=os.statvfs(parent);need(headroom>=4*1024**3 and disk.f_bavail*disk.f_frsize>=64*1024**2,'FRESH_MEMORY_EBS_HEADROOM')
 r=docker('inspect',NAME);need(r.returncode==1 and r.stdout.strip()==b'[]'and r.stderr.decode().strip()=='error: no such object: '+NAME,'FRESH_CONTAINER_NO_REPLAY')
 r=docker('image','inspect',IMAGE);need(r.returncode==0,'ORIGINAL_IMAGE_PRESENT')
 image=json.loads(r.stdout)[0];need(image['Id']==IMAGE and not image['Config'].get('Volumes'),'EXACT_IMAGE_NO_IMPLICIT_VOLUMES')
 attempt=uuid.uuid4().hex;admission=ROOT/'admission';envpath=ROOT/'original-environment.private.env';root_created=False;admission_created=False;env_created=False;intent_created=False
 cid=None;attempted=False;attached=None;bound=None;threads=[];reader_entries=[];log_fds={};pipes=[];groups=[];lock=threading.Lock();stop_event=threading.Event()
 stats={'stdout':{'observedBytes':0,'storedBytes':0,'overLimit':False,'readerFailure':False,'eof':False},'stderr':{'observedBytes':0,'storedBytes':0,'overLimit':False,'readerFailure':False,'eof':False}}
 total=[0];native_ready=False;marker_written=False;failure=None;cleanup=False;native_exit=None;native_oom=None;cleanup_errors=[]
 def interrupted(signum,frame):raise RuntimeError('OWN_FRONTEND_INTERRUPTED')
 oldterm=signal.signal(signal.SIGTERM,interrupted);oldint=signal.signal(signal.SIGINT,interrupted);oldalarm=signal.signal(signal.SIGALRM,interrupted)
 def own():
  r=docker('inspect',cid or NAME)
  if r.returncode==1 and r.stdout.strip()==b'[]'and r.stderr.decode().strip()=='error: no such object: '+(cid or NAME):return None
  need(r.returncode==0,'INSPECTION_UNCERTAIN_RETAIN_JOB');v=json.loads(r.stdout)[0];h=v['HostConfig'];c=v['Config']
  need(v['Name']=='/'+NAME and v['Image']==IMAGE and c['Labels'].get('crays.owner.thread')==OWNER and c['Labels'].get('crays.admission.attempt')==attempt,'OWN_IDENTITY_REQUIRED')
  mounts=v['Mounts'];need(len(mounts)==1 and mounts[0]['Type']=='bind'and mounts[0]['Source']==str(admission)and mounts[0]['Destination']=='/admission'and not mounts[0]['RW'],'EXACT_OWN_MARKER_MOUNT')
  need(h['NetworkMode']=='none'and not h.get('PortBindings')and not h.get('PublishAllPorts')and h['ReadonlyRootfs']and h['Memory']==805306368 and h['MemorySwap']==805306368 and h['NanoCpus']==500000000 and h['PidsLimit']==128,'EXACT_ISOLATION_RESOURCE_LIMITS')
  need(set(h['CapDrop'])=={'ALL'}and'no-new-privileges:true'in h['SecurityOpt']and not h.get('Privileged')and not h.get('Devices')and h['RestartPolicy']['Name']=='no'and h['LogConfig']['Type']=='none'and not h.get('Tmpfs')and not h.get('PidMode')and not h.get('Binds')and not h.get('DeviceRequests')and h.get('IpcMode')in['private',''],'NO_HIDDEN_RUNTIME_ESCAPE_OR_OVERLAY')
  need(c['User']=='0:0'and c['WorkingDir']=='/app'and c['Entrypoint']==['/bin/sh']and c['Cmd']==['-c',CMD],'EXACT_ORIGINAL_FRONTEND_BRANCH')
  actualenv=c.get('Env')or[];expected=dict(x.split('=',1)for x in image['Config'].get('Env')or[])
  expected.update(dict(x.split('=',1)for x in env));need(len(actualenv)==len(expected)and dict(x.split('=',1)for x in actualenv)==expected,'ORIGINAL_EFFECTIVE_ENV_MATCH')
  return v
 def capture(stream,label,fd):
  s=stats[label]
  try:
   while True:
    chunk=os.read(stream.fileno(),65536)
    if not chunk:
     s['eof']=True;break
    with lock:
     s['observedBytes']+=len(chunk);room=max(0,LIMIT-total[0]);stored=chunk[:room];total[0]+=len(stored)
     if len(stored)<len(chunk):s['overLimit']=True;stop_event.set()
    if stored:
     view=memoryview(stored)
     while view:
      written=os.write(fd,view);need(written>0,'LOG_WRITE_PROGRESS');view=view[written:]
     s['storedBytes']+=len(stored)
  except BaseException:s['readerFailure']=True;stop_event.set()
  finally:
   try:os.fsync(fd)
   except BaseException:s['readerFailure']=True;stop_event.set()
   os.close(fd)
 try:
  ROOT.mkdir(mode=0o700);root_created=True
  admission.mkdir(mode=0o700);admission_created=True
  fd=os.open(envpath,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o400);env_created=True
  with os.fdopen(fd,'wb')as f:f.write(('\n'.join(env)+'\n').encode());f.flush();os.fsync(f.fileno())
  put(ROOT/'INTENT.json',{'ownerThread':OWNER,'attempt':attempt,'image':IMAGE,'name':NAME,'noReplay':True,'scope':'ORIGINAL_FRONTEND_START_ONLY_NETWORK_NONE_NO_PORTS','bindingSHA256':a.binding_sha256,'launchSHA256':binding['launchSHA256']});intent_created=True
  args=['create','--pull=never','--name',NAME,'--label','crays.owner.thread='+OWNER,'--label','crays.admission.attempt='+attempt,'--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges:true','--memory','768m','--memory-swap','768m','--cpus','0.5','--pids-limit','128','--user','0:0','--workdir','/app','--restart','no','--log-driver','none','--env-file',str(envpath),'--mount','type=bind,src='+str(admission)+',dst=/admission,readonly','--entrypoint','/bin/sh',IMAGE,'-c',CMD]
  attempted=True;r=docker(*args);need(r.returncode==0 and re.fullmatch(b'[0-9a-f]{64}',r.stdout.strip()),'CREATE_UNCERTAIN_INSPECT_SAME_OWN_NAME');cid=r.stdout.decode().strip();v=own();need(not v['State']['Running']and v['State']['Pid']==0,'NEVER_STARTED_PREIMAGE')
  attached=subprocess.Popen(['/usr/bin/docker','start','-a',cid],stdout=subprocess.PIPE,stderr=subprocess.PIPE,start_new_session=True,env={'PATH':'/usr/bin:/bin'})
  groups.append(attached.pid);pipes=[attached.stdout,attached.stderr]
  for stream,label in [(attached.stdout,'stdout'),(attached.stderr,'stderr')]:
   fd=os.open(ROOT/(label+'.private.log'),os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o400)
   log_fds[label]=fd;thread=threading.Thread(target=capture,args=(stream,label,fd),daemon=False);threads.append(thread);reader_entries.append((label,thread));thread.start()
  gate_deadline=time.monotonic()+12
  while True:
   v=own();need(v is not None,'OWN_PREMARKER_CONTAINER_EXISTS')
   if v['State']['Running']and v['State']['Pid']>0:break
   need(time.monotonic()<gate_deadline and attached.poll()is None and not stop_event.is_set(),'OWN_PREMARKER_START_DEADLINE');time.sleep(0.1)
  bound=proc_binding(v['State']['Pid'],cid);bound['containerId']=cid
  st=dict(x.split(':',1)for x in pathlib.Path('/proc',str(bound['pid']),'status').read_text().splitlines()if ':'in x)
  need(st['Uid'].split()==['0']*4 and st['NoNewPrivs'].strip()=='1'and all(int(st[k].strip(),16)==0 for k in ['CapBnd','CapEff','CapPrm']),'ACTUAL_ROOT_UID_CAP0_NNP')
  put(ROOT/'PREMARKER_BOUND.json',{'attempt':attempt,'physicalBinding':bound,'hardLimitsVerified':True,'network':'none','ports':False,'envValuesOrHashesLogged':False})
  v=own();need(proc_binding(v['State']['Pid'],cid)=={k:bound[k]for k in ['pid','startTicks','cgroup']},'SAME_PREMARKER_LIFETIME')
  packagejs="const f=require('node:fs'),c=require('node:crypto');const b=f.readFileSync('/app/apps/frontend/package.json');const j=JSON.parse(b);process.exit(b.length===517&&c.createHash('sha256').update(b).digest('hex')==='"+FRONTEND_PACKAGE_SHA256+"'&&j.scripts.start==='dotenv -e ../../.env -- next start -p 4200'?0:1);"
  r=docker('exec','--user','0:0',cid,'node','-e',packagejs,timeout=5);need(r.returncode==0,'EXACT_ORIGINAL_FRONTEND_PACKAGE_AND_START_SCRIPT')
  # Only host marker creation releases native pnpm. Native frontend files remain unchanged.
  need({label for label,t in reader_entries if t.ident is not None}=={'stdout','stderr'},'BOTH_CAPTURE_READERS_STARTED_BEFORE_NATIVE')
  signal.setitimer(signal.ITIMER_REAL,90);fd=os.open(admission/'START_NATIVE',os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o400);os.close(fd);marker_written=True
  started=time.monotonic();deadline=started+90
  healthjs="const n=require('node:net');const s=n.createConnection({host:'127.0.0.1',port:4200});s.setTimeout(800);s.on('connect',()=>{s.end();process.exit(0)});s.on('error',()=>process.exit(1));s.on('timeout',()=>{s.destroy();process.exit(1)});"
  while time.monotonic()<deadline:
   v=own();need(v is not None and v['State']['Running']and not v['State'].get('OOMKilled'),'ORIGINAL_FRONTEND_STILL_RUNNING')
   need(proc_binding(v['State']['Pid'],cid)=={k:bound[k]for k in ['pid','startTicks','cgroup']},'SAME_NATIVE_LIFETIME')
   need(not stop_event.is_set(),'PROTECTED_LOG_CAP_OR_READER_FAILURE')
   left=deadline-time.monotonic()
   if left<3:break
   r=docker('exec','--user','0:0',cid,'node','-e',healthjs,timeout=min(3,left))
   if r.returncode==0:native_ready=True;break
   time.sleep(0.3)
  need(native_ready,'ORIGINAL_NATIVE_PORT4200_NOT_READY_WITHIN90S')
 except BaseException as e:
  failure=str(e)if re.fullmatch('[A-Z][A-Z0-9_]{3,120}',str(e))else'PROTECTED_FRONTEND_EXECUTION_FAILURE'
 finally:
  signal.setitimer(signal.ITIMER_REAL,0);signal.signal(signal.SIGTERM,signal.SIG_IGN);signal.signal(signal.SIGINT,signal.SIG_IGN);signal.signal(signal.SIGALRM,signal.SIG_IGN)
  try:
   if attempted:
    v=own()
    if v is not None:
     cid=v['Id']
     if v['State']['Pid']>0:
      fresh=proc_binding(v['State']['Pid'],cid);fresh['containerId']=cid
      if bound is None:bound=fresh
      else:need(fresh==bound,'CLEANUP_SAME_OWN_LIFETIME')
     if v['State']['Running']:
      try:docker('stop','--time','3',cid,timeout=7)
      except subprocess.TimeoutExpired:pass
      v=own()
      if v is not None and v['State']['Running']:
       try:docker('kill','--signal','KILL',cid,timeout=5)
       except subprocess.TimeoutExpired:pass
       v=own()
     need(v is not None and not v['State']['Running']and v['State']['Pid']==0,'PHYSICAL_CONTAINER_STOP_REQUIRED')
     native_exit=v['State'].get('ExitCode');native_oom=v['State'].get('OOMKilled')
     need(attached is None or bound is not None,'STARTED_ADMISSION_LIFETIME_UNBOUND')
     need(bound is None or not lifetime_alive(bound),'ORIGINAL_PID_LIFETIME_MUST_RETURN')
     cg=pathlib.Path('/sys/fs/cgroup')/bound['cgroup'].lstrip('/')if bound else None
     need(cg is None or not(cg/'cgroup.procs').exists()or not(cg/'cgroup.procs').read_text().strip(),'OWN_CGROUP_MUST_RETURN')
     r=docker('rm',cid);need(r.returncode==0 and own()is None,'OWN_CONTAINER_REMOVAL_REQUIRED')
    elif bound:
     need(not lifetime_alive(bound),'ABSENT_CONTAINER_PID_MUST_RETURN')
     cg=pathlib.Path('/sys/fs/cgroup')/bound['cgroup'].lstrip('/');need(not(cg/'cgroup.procs').exists()or not(cg/'cgroup.procs').read_text().strip(),'ABSENT_CONTAINER_CGROUP_MUST_RETURN')
   cleanup=True
  except BaseException as e:
   failure=str(e)if re.fullmatch('[A-Z][A-Z0-9_]{3,120}',str(e))else'PROTECTED_FRONTEND_CLEANUP_FAILURE';cleanup_errors.append(failure);cleanup=False
  finally:
   try:
    if attached:
     try:attached.wait(timeout=5)
     except subprocess.TimeoutExpired:
      os.killpg(attached.pid,signal.SIGTERM)
      try:attached.wait(timeout=3)
      except subprocess.TimeoutExpired:os.killpg(attached.pid,signal.SIGKILL);attached.wait(timeout=3)
     need(group_gone(attached.pid),'OWN_ATTACH_PROCESS_GROUP_RETURN')
    for thread in threads:
     if thread.ident is not None:thread.join(timeout=5)
    for label,thread in reader_entries:
     if thread.ident is None:os.close(log_fds[label])
    need(all(not t.is_alive()for t in threads),'ALL_LOG_READERS_PHYSICALLY_RETURN')
    for p in pipes:p.close()
    started_labels={label for label,t in reader_entries if t.ident is not None}
    need(all(stats[label]['eof']and not stats[label]['readerFailure']for label in started_labels),'COMPLETE_STARTED_LOG_READERS_CAPTURE')
    need(cleanup,'CONTAINER_PHYSICAL_RETURN_UNRESOLVED_RETAIN_INPUTS')
    if root_created:
     if admission_created:
      need(not admission.is_symlink(),'OWN_ADMISSION_DIRECTORY_BEFORE_MARKER_ACCESS')
      if admission.exists():
       need(admission.stat().st_uid==0 and admission.stat().st_mode&0o777==0o700,'OWN_PRIVATE_ADMISSION_DIRECTORY')
       if (admission/'START_NATIVE').exists():
        need(marker_written and not(admission/'START_NATIVE').is_symlink(),'OWN_CREATED_MARKER_BEFORE_UNLINK');(admission/'START_NATIVE').unlink()
       admission.rmdir()
      need(not admission.exists(),'OWN_ADMISSION_PHYSICAL_RETURN')
     if env_created:
      if envpath.exists():
       need(not envpath.is_symlink()and envpath.stat().st_uid==0 and envpath.stat().st_mode&0o777==0o400,'OWN_PRIVATE_ENV_FILE_BEFORE_REMOVE');envpath.unlink()
      need(not envpath.exists(),'OWN_PRIVATE_ENV_PHYSICAL_RETURN')
   except BaseException as e:
    cleanup=False;failure=str(e)if re.fullmatch('[A-Z][A-Z0-9_]{3,120}',str(e))else'PROTECTED_ATTACH_OR_LOG_RETURN_FAILURE';cleanup_errors.append(failure)

   # Retain private logs and evidence; never delete uncertain marker/env custody.
   logfiles={}
   if root_created:
    for label in ['stdout','stderr']:
     if label not in log_fds:continue
     path=ROOT/(label+'.private.log')
     if path.is_file()and not path.is_symlink():
      data=path.read_bytes();need(len(data)<=LIMIT,'BOUNDED_PRIVATE_LOG_ARTIFACT');logfiles[label]={'path':str(path),'bytes':len(data),'sha256':sha(data),'mode':oct(path.stat().st_mode&0o777),'ownerUID':path.stat().st_uid}
   summary={'pass':bool(native_ready and native_oom is False and cleanup and failure is None and not any(s['overLimit']for s in stats.values())),'scope':'ORIGINAL_FRONTEND_NATIVE_TCP4200_ONLY_NOT_SSR_AUTH_CUSTOMER_ACCEPTANCE','image':IMAGE,'attempt':attempt,'lifecycleStartedBeforeOwnFilesystemWrites':True,'rootCreated':root_created,'admissionCreated':admission_created,'envFileCreated':env_created,'appIntentCreated':intent_created,'containerCreateAttempted':attempted,'markerReleased':marker_written,'nativePort4200Ready':native_ready,'physicalCleanupComplete':cleanup,'leaseReturned':cleanup,'rootBlocker':not cleanup,'privateLogsRetained':True,'logArtifacts':logfiles,'attachNativeReturnCode':attached.returncode if attached else None,'nativeContainerExitCode':native_exit,'nativeContainerOOMKilled':native_oom,'cleanupFailures':cleanup_errors,'frontendPackageSHA256':FRONTEND_PACKAGE_SHA256,'physicalBinding':bound,'rootRecoveryFence':root_fence,'rootFenceNeverModifiedOrRemoved':True,'startedCaptureReaders':[label for label,t in reader_entries if t.ident is not None],'noGeneralSideEffectClaim':True,'logByteLimitCombined':LIMIT,'diagnostics':stats,'safeGuard':failure,'rawLogsOrEnvPrinted':False,'sourceOrProductFilesChanged':False,'customerAcceptance':False,'noReplay':True}
   receipt_path=ROOT/'ACTUAL.json'if root_created else pathlib.Path(a.binding).parent/'LIFECYCLE_PRECREATE_FAILURE.json'
   put(receipt_path,summary);print(json.dumps(summary,sort_keys=True))
   if not cleanup:
    # Finite failed lifecycle: retain artifacts and explicitly refuse a resource-return claim.
    print(json.dumps({'status':'UNRETURNED_LIFECYCLE_ROOT_BLOCKER','leaseReturned':False,'ownerThread':OWNER,'attempt':attempt,'noReplay':True}),flush=True)
   os.close(HEAVY_FD);HEAVY_FD=None
   signal.signal(signal.SIGTERM,oldterm);signal.signal(signal.SIGINT,oldint);signal.signal(signal.SIGALRM,oldalarm)
 return 0 if summary['pass']else 1
if __name__=='__main__':
 try:raise SystemExit(main())
 except SystemExit:raise
 except BaseException as e:
  msg=str(e);print(json.dumps({'pass':False,'admissionNotExecuted':msg=='ADMISSION_NOT_EXECUTED_SHARED_HEAVY_LOCK_BUSY','safeGuard':msg if re.fullmatch('[A-Z][A-Z0-9_]{3,120}',msg)else'PROTECTED_PREFLIGHT_FAILURE','noReplay':True}));raise SystemExit(1)
