"""Minimal AWS-only derivative of the existing qualified isolated Work build lifecycle.
Never imports the XXL own_lease module; Root supplies an exact qualified AWS provider.
Preparation does not authorize execution. Root must bind its serial window and dispatch.
"""
from pathlib import Path
import argparse,datetime,hashlib,importlib.util,json,os,signal,subprocess,sys,time,uuid
ENTRY=Path('/srv/crays/migration-work/20261108/inventory/personal-frontend-build-entry-20261108-02/BUILD_ENTRY.json')
ENTRY_SHA='b8a81b2d36d158355eb9f30ad11dbe7af18a573619773b51386950bec0b7afbe'
IMAGE='sha256:752ea8a2f758c34002a0461bd9f1cee4f9a3c36d48494586f60ffce1fc708e0e'
OWNER='01a1bb4e-4065-7c61-946d-8e27b288997a'
AWS=Path('/srv/crays/migration-work/20261108')
def now():return datetime.datetime.now(datetime.timezone.utc).isoformat()
def digest(b):return hashlib.sha256(b).hexdigest()
def save(path,value):
 data=json.dumps(value,sort_keys=True,indent=2).encode()
 fd=os.open(path,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o600)
 with os.fdopen(fd,'wb') as f:f.write(data);f.flush();os.fsync(f.fileno())
def main():
 p=argparse.ArgumentParser()
 for name in ['lease-module','lease-module-sha256','lease-registry','root-window-record','root-window-sha256','unit']:
  p.add_argument('--'+name,required=True)
 a=p.parse_args();os.umask(0o077);sys.dont_write_bytecode=True
 assert os.getuid()==0,'EXPLICIT_UID0_OUT_CUSTODY_REQUIRED'
 def aws_path(value):
  x=Path(value);assert x.is_absolute() and not x.is_symlink()
  assert x.resolve().is_relative_to(AWS),'AWS_ONLY_CONTRACT_REQUIRED'
  return x
 provider=aws_path(a.lease_module);reg=aws_path(a.lease_registry);window=aws_path(a.root_window_record)
 assert digest(provider.read_bytes())==a.lease_module_sha256
 assert digest(window.read_bytes())==a.root_window_sha256
 window_json=json.loads(window.read_bytes())
 raw=ENTRY.read_bytes();assert digest(raw)==ENTRY_SHA;entry=json.loads(raw)
 spec=importlib.util.spec_from_file_location('root_qualified_aws_lease',provider)
 L=importlib.util.module_from_spec(spec);spec.loader.exec_module(L)
 assert Path(L.REG).resolve()==reg.resolve() and Path(L.CONTROL).resolve().is_relative_to(AWS)
 for fn in ['locks','transition']:assert callable(getattr(L,fn))
 attempt=uuid.uuid4().hex
 case=ENTRY.parent.parent/('personal-build-execution-'+attempt);case.mkdir(mode=0o700,exist_ok=False)
 began=time.monotonic();work_end=began+390;hard_end=began+420
 report={'status':'INCOMPLETE','startedAtUTC':now(),'entrySHA256':ENTRY_SHA,'attempt':attempt,
         'providerPath':str(provider),'providerSHA256':a.lease_module_sha256,'registry':str(reg),
         'rootWindowPath':str(window),'rootWindowSHA256':a.root_window_sha256,
         'fullFunctionalAcceptance':False,'runtimeChanged':False,'XXLWrites':False,
         'leaseReturned':False,'containers':[]}
 lease={'ownerThreadId':OWNER,'leaseId':'AWS-PERSONAL-FRONTEND-'+attempt,'unit':a.unit,
        'controllerPID':os.getpid(),'controllerStartTicks':Path('/proc/self/stat').read_text().rsplit(')',1)[1].split()[19],
        'invocationId':os.environ.get('INVOCATION_ID'),'issuedAt':now(),'maximumSeconds':420,
        'hardCapMiB':2048,'cpu':1,'rootWindowSHA256':a.root_window_sha256,
        'scope':'Exact original1489 source with13 retained overlays; original dependency closure plus exact original Recharts closure; isolated typecheck and Vite only; no live activation'}
 claimed=False;records=report['containers'];event_no=0
 def event(kind,value):
  nonlocal event_no
  event_no+=1;save(case/('%03d-%s.json'%(event_no,kind)),value)
 def cli(args,timeout=5):
  remaining=hard_end-time.monotonic();assert remaining>0,'TOTAL420_DEADLINE_LEASE_RETAINED'
  return subprocess.run(['docker',*args],capture_output=True,text=True,timeout=min(timeout,remaining))
 def checked(ref,role):
  q=cli(['container','inspect',ref]);assert q.returncode==0,'INSPECT_UNRESOLVED'
  d=json.loads(q.stdout)[0];labels=d['Config'].get('Labels') or {}
  assert labels.get('crays.owner.thread')==OWNER and labels.get('crays.inventory.attempt')==attempt
  assert labels.get('crays.inventory.role')==role and d['Config']['User']=='0:0' and d['Image']==IMAGE
  h=d['HostConfig'];assert h['NetworkMode']=='none' and not h.get('PortBindings')
  assert h['ReadonlyRootfs'] and h['Memory']==2147483648 and h['MemorySwap']==2147483648
  assert h['NanoCpus']==1000000000 and h['PidsLimit']==192
  assert 'ALL' in h['CapDrop'] and any(x.startswith('no-new-privileges') for x in h['SecurityOpt'])
  expected=sorted((m['source'],m['target'],not m['readOnly']) for m in entry['mounts'])
  actual=sorted((m['Source'],m['Destination'],m['RW']) for m in d['Mounts'] if m['Type']=='bind')
  assert actual==expected,'EXACT_ORIGINAL_MOUNTS_REQUIRED'
  assert set(h['Tmpfs'])=={'/tmp','/work/node_modules/.vite-temp'}
  return d
 def observe(r,d):
  pid=d['State']['Pid']
  if not pid:return
  try:
   ticks=Path('/proc/%s/stat'%pid).read_text().rsplit(')',1)[1].split()[19]
   cgs=[x[3:] for x in Path('/proc/%s/cgroup'%pid).read_text().splitlines() if x.startswith('0::')]
   assert len(cgs)==1
   cg=Path('/sys/fs/cgroup')/cgs[0].lstrip('/')
   assert r['cid'] in str(cg),'CONTAINER_CGROUP_BINDING_REQUIRED'
   if not r.get('worker'):
    r['worker']={'pid':pid,'ticks':ticks,'cgroup':str(cg)};event('worker-observed',r)
  except FileNotFoundError:pass
 def returned(r):
  if r.get('objectRemoved'):return
  d=checked(r['cid'],r['role']);observe(r,d)
  if d['State'].get('Paused'):cli(['unpause',r['cid']],3)
  if d['State']['Running']:
   try:cli(['stop','--time','2',r['cid']],4)
   except subprocess.TimeoutExpired:pass
   d=checked(r['cid'],r['role'])
   if d['State']['Running']:cli(['kill',r['cid']],3)
  deadline=min(hard_end,time.monotonic()+8)
  while True:
   d=checked(r['cid'],r['role'])
   physical=not d['State']['Running'] and not d['State'].get('Restarting') and d['State']['Pid']==0
   w=r.get('worker')
   if w:
    try:physical=physical and Path('/proc/%s/stat'%w['pid']).read_text().rsplit(')',1)[1].split()[19]!=w['ticks']
    except FileNotFoundError:pass
    cg=Path(w['cgroup'])/'cgroup.procs'
    physical=physical and (not cg.exists() or not cg.read_text().strip())
   elif r.get('startAttempted'):physical=False
   if physical:break
   assert time.monotonic()<deadline,'PHYSICAL_END_UNPROVEN_LEASE_RETAINED'
   time.sleep(.1)
  r['physicalEndProven']=True;event('physical-end',r)
  try:q=cli(['rm',r['cid']],4)
  except subprocess.TimeoutExpired:q=None
  if q is None or q.returncode!=0:
   probe=cli(['container','inspect',r['cid']],3)
   assert probe.returncode==1 and probe.stderr.strip()=='Error: No such container: '+r['cid'],'OWN_REMOVE_UNRESOLVED'
  r['objectRemoved']=True;event('own-object-returned',r)
 old=signal.signal(signal.SIGTERM,lambda *_:(_ for _ in ()).throw(KeyboardInterrupt()))
 try:
  assert entry['buildStarted'] is False and entry['originalPackageLockUnchanged']
  assert (Path(entry['dependencyRoot'])/'node_modules/.vite-temp').is_dir()
  out=ENTRY.parent/'dist';assert out.stat().st_uid==0 and out.stat().st_gid==0
  assert not any(out.iterdir()),'OWN_OUTPUT_NOT_EMPTY_NO_BLIND_REPLAY'
  with L.locks():
   oldraw=L.REG.read_bytes();meta=L.REG.stat();before=json.loads(oldraw)
   assert not any(before.get(k) for k in ['heavy','heavyLease','heavyBuildLease','exclusiveHeavy','databaseMutation','databaseImport','importMutation','exclusiveWriter']),'FOREIGN_LEASE_OCCUPIED'
   after=json.loads(oldraw);after['heavy']=[lease];after['heavyLease']=lease
   L.transition(before,after,oldraw,meta);claimed=True
  event('lease-claimed',lease)
  for role,key,cap in [('typecheck','typecheckArgv',150),('vite','viteArgv',240)]:
   assert time.monotonic()<work_end,'TOTAL_WORK_DEADLINE'
   argv=list(entry[key]);assert argv[:2]==['docker','run'];argv[1]='create'
   i=argv.index(IMAGE)
   argv[i:i]=['--user=0:0','--label=crays.owner.thread='+OWNER,'--label=crays.inventory.attempt='+attempt,'--label=crays.inventory.role='+role]
   name=next(x.split('=',1)[1] for x in argv if x.startswith('--name='))
   r={'name':name,'role':role,'startAttempted':False};records.append(r);event('create-intent',{'record':r,'argv':argv})
   try:q=subprocess.run(argv,capture_output=True,text=True,timeout=8)
   except subprocess.TimeoutExpired:q=None
   try:d=checked(name,role)
   except BaseException:
    r['createUnresolved']=True;raise RuntimeError('CREATE_UNKNOWN_NO_REPLAY_LEASE_RETAINED')
   r['cid']=d['Id'];assert d['Name'].lstrip('/')==name
   assert d['State']['Status']=='created','UNEXPECTED_PREVIOUS_CONTAINER'
   event('create-resolved',r)
   deadline=min(work_end,time.monotonic()+cap)
   event('start-intent',r)
   assert time.monotonic()<deadline,'WORK_DEADLINE_BEFORE_START_CREATED_CONTAINER_RETURN_ONLY'
   r['startAttempted']=True
   try:cli(['start',r['cid']],5)
   except subprocess.TimeoutExpired:pass
   while True:
    d=checked(r['cid'],role);observe(r,d);state=d['State']
    if not state['Running'] and state['Status'] in ['exited','dead']:break
    if not state['Running'] and state['Status']=='created':raise RuntimeError('START_UNKNOWN_NO_REPLAY')
    assert time.monotonic()<deadline,'OWN_BUILD_DEADLINE'
    time.sleep(.2)
   r.update(exitCode=state['ExitCode'],oomKilled=state.get('OOMKilled',False))
   log=case/(role+'.log')
   fd=os.open(log,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o600)
   with os.fdopen(fd,'wb') as f:subprocess.run(['docker','logs',r['cid']],stdout=f,stderr=subprocess.STDOUT,timeout=5)
   r['logPath']=str(log);returned(r)
   assert r['exitCode']==0 and not r['oomKilled'],'BUILD_FAILED_NO_BLIND_RETRY'
  assert (out/'index.html').is_file(),'OUTPUT_INDEX_MISSING'
  report['status']='TYPECHECK_AND_VITE_PASS_RUNTIME_AND_FUNCTIONAL_ACCEPTANCE_PENDING'
 except BaseException as e:
  report.update(errorType=type(e).__name__,error=str(e)[:220])
 finally:
  ok=True
  for r in records:
   if not r.get('cid'):ok=False;continue
   try:returned(r)
   except BaseException as e:r['cleanupError']=type(e).__name__+':'+str(e)[:180];ok=False
  if claimed and ok:
   try:
    with L.locks():
     oldraw=L.REG.read_bytes();meta=L.REG.stat();before=json.loads(oldraw)
     assert before.get('heavyLease')==lease and before.get('heavy')==[lease],'OWN_CAS_MISMATCH'
     after=json.loads(oldraw);after['heavy']=[];after['heavyLease']=None;L.transition(before,after,oldraw,meta)
    report['leaseReturned']=True
   except BaseException as e:report['leaseReturnError']=type(e).__name__+':'+str(e)[:160]
  report['finishedAtUTC']=now();report['elapsedSeconds']=time.monotonic()-began
  signal.signal(signal.SIGTERM,old)
  save(case/'RESULT_ACTUAL.json',report);print(json.dumps(report))
 return 0 if report['status'].startswith('TYPECHECK_AND_VITE_PASS') and report['leaseReturned'] else 1
if __name__=='__main__':raise SystemExit(main())
