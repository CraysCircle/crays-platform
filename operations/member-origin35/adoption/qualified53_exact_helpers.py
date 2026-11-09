"""Exact helper definitions retained from qualified53; no main/controller replay."""
from pathlib import Path
import os,stat,json,hashlib,subprocess,time
BASE=Path('/srv/crays/releases/chuck-core-composition-20261107-07')
UNIT='crays-owner-tools-whatsapp-live.service'
BROKERS=['crays-owner-document-broker.service','crays-owner-workflow-broker.service']
sha=lambda b:hashlib.sha256(b).hexdigest()
canonical=lambda x:json.dumps(x,sort_keys=True,separators=(',',':')).encode()
def need(v,g):
 if not v:raise RuntimeError(g)

def private(p,mode=0o600,limit=131072):
 p=Path(p);need(p.resolve()==p,'CANONICAL_ROOT_INPUT');fd=os.open(p,os.O_RDONLY|os.O_NOFOLLOW|os.O_NONBLOCK)
 with os.fdopen(fd,'rb')as f:
  s=os.fstat(f.fileno());need(stat.S_ISREG(s.st_mode)and s.st_uid==0 and s.st_nlink==1 and stat.S_IMODE(s.st_mode)==mode and s.st_size<=limit,'ROOT_INPUT_CUSTODY');b=f.read(limit+1);t=os.fstat(f.fileno());q=p.lstat();need(len(b)==s.st_size and(s.st_dev,s.st_ino,s.st_size,s.st_mtime_ns,s.st_ctime_ns)==(t.st_dev,t.st_ino,t.st_size,t.st_mtime_ns,t.st_ctime_ns)and(q.st_dev,q.st_ino)==(s.st_dev,s.st_ino),'ROOT_INPUT_CHANGED');return b

def parent(p,mode=None):
 s=p.lstat();need(stat.S_ISDIR(s.st_mode)and s.st_uid==0 and p.resolve()==p and not stat.S_IMODE(s.st_mode)&0o022 and(mode is None or stat.S_IMODE(s.st_mode)==mode),'ROOT_DIRECTORY_CUSTODY')

def syncdir(p):
 fd=os.open(p,os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW)
 try:os.fsync(fd)
 finally:os.close(fd)

def put(p,b,mode=0o444):
 fd=os.open(p,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,mode)
 with os.fdopen(fd,'wb')as f:os.fchmod(f.fileno(),mode);f.write(b);f.flush();os.fsync(f.fileno())
 syncdir(p.parent)

def cmd(a,timeout=8):
 r=subprocess.run(a,capture_output=True,timeout=timeout,env={'PATH':'/usr/sbin:/usr/bin:/sbin:/bin','LC_ALL':'C'});need(r.returncode==0 and len(r.stdout)<2*1024**2,'FIXED_RUNTIME_COMMAND_FAILED');return r.stdout

def show(u):return dict(l.split('=',1)for l in cmd(['/usr/bin/systemctl','show',u,'--property=Id,MainPID,ActiveState,InvocationID,UID,ControlGroup,ExecMainStartTimestampMonotonic,Restart']).decode().splitlines()if'='in l)

def process(pid):
 p=Path('/proc',str(pid));tick=lambda:p.joinpath('stat').read_text().rsplit(')',1)[1].split()[19];before=tick();s=dict(x.split(':',1)for x in p.joinpath('status').read_text().splitlines()if':'in x);ids=list(map(int,s['Uid'].split()));need(len(set(ids))==1,'PROCESS_SINGLE_UID');v={'pid':pid,'startTicks':int(before),'uid':ids[0],'cgroup':p.joinpath('cgroup').read_text().strip(),'capMasks':{k:s[k].strip()for k in ['CapInh','CapPrm','CapEff','CapBnd','CapAmb']},'noNewPrivs':int(s['NoNewPrivs'])};need(before==tick()and all(int(x,16)==0 for x in v['capMasks'].values())and v['noNewPrivs']==1,'EXACT_CAP0_NNP_PROCESS');return v

def docker(*args):return json.loads(cmd(['/usr/bin/docker','--config',str(BASE/'empty-docker-config'),*args]))

def original_preflight34_and_namespace(pid,invocation,expected):
 p=Path('/proc',str(pid),'root/run/crays-owner-tools-whatsapp-live/START_VERIFIED.json')
 fd=os.open(p,os.O_RDONLY|os.O_NOFOLLOW|os.O_NONBLOCK)
 try:
  st=os.fstat(fd);need(stat.S_ISREG(st.st_mode) and st.st_uid==61304 and st.st_nlink==1 and stat.S_IMODE(st.st_mode)==0o600 and st.st_size<=4096,'ORIGINAL_NATIVE_START_VERIFIED_CUSTODY')
  b=os.read(fd,4097);z=os.fstat(fd);need((st.st_dev,st.st_ino,st.st_size,st.st_mtime_ns)==(z.st_dev,z.st_ino,z.st_size,z.st_mtime_ns) and len(b)==st.st_size,'STABLE_ORIGINAL_NATIVE_PREFLIGHT_PROOF')
 finally:os.close(fd)
 proof=json.loads(b);need(proof=={'invocationId':invocation,'admissionSha256':'428cf212ad91eda6bc43d788d4daddb92cb51dcc47ac5c0c0e3ed69dbf17ff94','allBoundBytesMatch':True,'fullInventoryRescannedOnRestart':False},'ORIGINAL_NATIVE_ALL6668_BINDING_BYTES_VERIFIED')
 mountrows=[x.split() for x in Path('/proc',str(pid),'mountinfo').read_text().splitlines()];targets={}
 for pair in expected:
  source,target=pair.split(':');matches=[x for x in mountrows if x[4]==target]
  need(len(matches)==1 and 'ro' in matches[0][5].split(','),'ACTUAL_FIVE33_NAMESPACE_BINDS_READONLY')
  a=Path(source).stat();z=Path('/proc',str(pid),'root',target.lstrip('/')).stat()
  need((a.st_dev,a.st_ino)==(z.st_dev,z.st_ino),'ACTUAL_FIVE33_NAMESPACE_SAME_SOURCE_IDENTITY')
  targets[target]={'readOnly':True,'sameSourceIdentity':True}
 return {'originalNativeStartVerified':True,'all6668RuntimeBindingBytesMatch':True,'original221CodeFilesVerified':True,'invocationId':invocation,'fiveCorrectedReadOnlyMounts':targets}

def wait_original_manager25():
 # Respect original workflow notify 15s and SDK TimeoutStartUSec 90s.
 # Poll only these admitted units; this does not launch a substitute service.
 deadline=time.monotonic()+110
 while True:
  remaining=deadline-time.monotonic();need(remaining>0,'ORIGINAL_NATIVE_MANAGER_READINESS_TIMEOUT')
  raw=cmd(['/usr/bin/systemctl','show',UNIT,*BROKERS,'--property=Id,MainPID,ActiveState,InvocationID,UID,ControlGroup,ExecMainStartTimestampMonotonic,Restart,Job'],timeout=min(3,remaining))
  rows={}
  for block in raw.decode().strip().split('\n\n'):
   v=dict(l.split('=',1)for l in block.splitlines()if'='in l)
   need(v.get('Id')in [UNIT,*BROKERS]and v['Id']not in rows,'EXACT_MANAGER_READINESS_UNITS');rows[v['Id']]=v
  need(set(rows)==set([UNIT,*BROKERS]),'EXACT_MANAGER_READINESS_UNIT_COUNT')
  for u,v in rows.items():
   # A queued start may still expose the previous failed state. An unqueued
   # failed unit is a known native failure and must enter cleanup immediately.
   need(not(v['ActiveState']=='failed'and v.get('Job','0')in('','0')),'ORIGINAL_NATIVE_START_FAILED')
  v=rows[UNIT]
  if v['ActiveState']=='active'and int(v['MainPID'])>0 and all(rows[u]['ActiveState']=='active'for u in BROKERS):return v
  time.sleep(min(.2,max(0,deadline-time.monotonic())))
