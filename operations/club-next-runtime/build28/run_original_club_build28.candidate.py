"""Existing Club Next webpack build only, after original-pool admission and Root resource window."""
from pathlib import Path
import os,sys,json,hashlib,subprocess,runpy,datetime,signal,time
P=Path('/srv/crays/migration-work/20261108/websites/club-original-saas-build21-20261108-01')
HELPER=Path('/srv/crays/migration-work/20261108/websites/club-original-ordinary-pool20-rev02-qualified-source02/run_original_pool_readonly_once.candidate.py')
HELPER_SHA='9a3bf2ae8926906a48d5b267443a64ef64558873059f4f1aef638ede8e5df2b1'
NAME='crays-club-source15-build28-20261108-01'
OWNER='01a1b9fb-cf93-7de1-97a3-ceac6824969a'
IMAGE='sha256:752ea8a2f758c34002a0461bd9f1cee4f9a3c36d48494586f60ffce1fc708e0e'
def sha(b):return hashlib.sha256(b).hexdigest()
def need(v,g):
 if not v:raise RuntimeError(g)
def main():
 os.umask(0o077)
 def interrupted(*a):raise KeyboardInterrupt()
 signal.signal(signal.SIGTERM,interrupted);signal.signal(signal.SIGINT,interrupted)
 need(os.getuid()==0 and Path('/sys/devices/virtual/dmi/id/board_asset_tag').read_text().strip()=='i-0eb300e1b02414d8f','EXACT_AWS_ROOT_HOST_REQUIRED')
 need(len(sys.argv)==2,'ROOT_REVIEW_REQUIRED')
 rp=Path(sys.argv[1]).resolve();need(str(rp).startswith('/srv/crays/migration-work/20261108/root/'),'ROOT_REVIEW_CUSTODY_REQUIRED')
 rev=json.loads(rp.read_bytes())
 need(rev.get('authority')=='Root'and rev.get('buildApproved')is True and rev.get('independentlyReviewed')is True and rev.get('exclusiveBuildWindowApproved')is True,'ROOT_BOUNDED_BUILD_AND_WINDOW_REQUIRED')
 need(rev['controllerSHA256']==sha(Path(__file__).read_bytes()),'EXACT_BUILD_SOURCE_REVIEW_REQUIRED')
 need(rev.get('buildOriginalGoogleFontsApproved')is True and rev.get('buildNetworkName')=='bridge','ROOT_ORIGINAL_FONT_EGRESS_BUILD_REVIEW_REQUIRED')
 now=datetime.datetime.now(datetime.timezone.utc)
 need(datetime.datetime.fromisoformat(rev['windowStartUTC'].replace('Z','+00:00'))<=now and now+datetime.timedelta(seconds=560)<=datetime.datetime.fromisoformat(rev['windowEndUTC'].replace('Z','+00:00')),'EXACT_560_SECOND_BUILD_WINDOW_REQUIRED')
 ordinary=Path(rev['ordinaryAdmissionActualPath']);need(str(ordinary).startswith('/srv/crays/migration-work/20261108/'),'EXACT_EXISTING_ORDINARY_ACTUAL_REQUIRED')
 raw=ordinary.read_bytes();a=json.loads(raw)
 need(sha(raw)==rev['ordinaryAdmissionActualSHA256']and a['status']=='ORIGINAL_CLUB_PUBLIC_POOL_ALL_GUARDS_TLS_SCRAM_SEVEN_RPC_NATIVE_PASS'and a['temporaryNodeClientPhysicallyRemoved']is True and not a['cleanupErrors'],'ACTUAL_ORIGINAL_POOL_PASS_AND_PHYSICAL_RETURN_REQUIRED')
 need(sha(HELPER.read_bytes())==HELPER_SHA,'EXISTING_PHYSICAL_HELPERS_REQUIRED')
 h=runpy.run_path(str(HELPER));docker,field,physical,terminal,absent=(h[k]for k in ['docker','field','physical','terminal','absent'])
 previous=P/'build-execution07/RESULT_ACTUAL.json';previous_raw=previous.read_bytes()
 need(sha(previous_raw)=='ded07502b8d56288900dcfa7355252b5d34e60feee94b7119b2b70152e40606d','EXACT_PREVIOUS_27_TERMINAL_OUTCOME_REQUIRED')
 previous_actual=json.loads(previous_raw)
 need(previous_actual.get('oomKilled')is True and all(previous_actual.get(k)is True for k in ['ownPIDAndCgroupPhysicallyStopped','ownBuildContainerPhysicallyRemoved','ownLeaseReleasedAfterPhysicalCleanup'])and not previous_actual.get('cleanupErrors')and absent(previous_actual['containerId']),'PREVIOUS_27_PHYSICAL_RETURN_REQUIRED')
 available=next(int(line.split()[1])*1024 for line in Path('/proc/meminfo').read_text().splitlines()if line.startswith('MemAvailable:'))
 need(available>=12884901888,'EXISTING_HOST_TWELVE_GIB_AVAILABLE_REQUIRED')
 state=json.loads((P/'SOURCE_TREE24_ORIGINAL_INTEGRATION_ACTUAL.json').read_bytes());need(state['status']=='EXACT_LATEST_CLUB_SOURCE15_BUILD_TREE_READY_NOT_BUILT','EXACT_SOURCE_TREE_REQUIRED')
 need(sha((P/'SOURCE_TREE24_ORIGINAL_INTEGRATION_ACTUAL.json').read_bytes())==rev['sourceTreeActualSHA256'],'EXACT_SOURCE_TREE_REVIEW_REQUIRED')
 for row in state['sourceFiles']:
  expected=state['onlyApplicationDelta']['sha256']if row['path']==state['onlyApplicationDelta']['path']else row['sha256']
  need(sha((P/'source'/row['path']).read_bytes())==expected,'DERIVED_SOURCE_INPUT_CHANGED')
 need(field(state['borrowedClubCID'],'{{.State.Running}} {{.State.Pid}}')=='true '+str(state['borrowedClubPID']),'ORIGINAL_CLUB_SOURCE_VIEW_CHANGED')
 need(Path('/proc',str(state['borrowedClubPID']),'stat').read_text().rsplit(')',1)[1].split()[19]==state['borrowedClubStartTicks'],'ORIGINAL_CLUB_SOURCE_GENERATION_CHANGED')
 out=P/'build-execution08';out.mkdir(mode=0o700);os.chown(out,1000,1000)
 lease=P/'LEASE_ACTIVE.json';fd=os.open(lease,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o600);ls=os.fstat(fd)
 with os.fdopen(fd,'w')as f:json.dump({'owner':OWNER,'name':NAME,'sourceSHA256':rev['controllerSHA256'],'rootReviewSHA256':sha(rp.read_bytes()),'maximumSeconds':560,'cpu':1,'memoryBytes':10737418240},f)
 result={'status':'INCOMPLETE','credentialsReadOrInBuild':False,'networkEnabled':True,'sourceOriginalsModified':False,'runtimeEdgeChanged':False,'cleanupErrors':[]}
 cid=None;proof=None;attempted=False;started=time.monotonic()
 try:
  need(absent(NAME),'OWN_PRIOR_BUILD_EXISTS_NO_REPLAY')
  argv=['create','--pull=never','--name',NAME,'--label','crays.website.owner='+OWNER,'--label','crays.website.controller='+rev['controllerSHA256'],'--network','bridge','--user','1000:1000','--workdir','/build','--read-only','--cap-drop=ALL','--security-opt=no-new-privileges','--cpus=1','--memory=10737418240','--memory-swap=10737418240','--pids-limit=256','--log-driver=none','--tmpfs','/tmp:rw,nosuid,nodev,size=134217728,mode=1777','--mount','type=bind,src='+str(P/'source')+',dst=/build','--mount','type=bind,src='+state['dependenciesReadonlyMount']+',dst=/build/node_modules,readonly','--mount','type=bind,src='+state['borrowedOriginalPublicView']+',dst=/original-public,readonly','--mount','type=bind,src='+str(out)+',dst=/output','--entrypoint','/bin/sh',IMAGE,'-c','exec env -i PATH=/usr/local/bin:/usr/bin:/bin HOME=/tmp NODE_ENV=production NODE_OPTIONS=--max-old-space-size=3072 NEXT_TELEMETRY_DISABLED=1 CRAYS_PERFORMANCE_BUILD_SERIAL=true node /build/node_modules/next/dist/bin/next build --webpack > /output/build.stdout.txt 2> /output/build.stderr.txt']
  original_view_mounts=state['borrowedOriginalPublicNestedReadonlyMounts']
  anchor=argv.index('--entrypoint')
  extra=[]
  for m in original_view_mounts:
   need(m['readonly']is True and m['source'].startswith('/srv/crays/')and m['target'].startswith('/original-public/')and ','not in m['source']and ','not in m['target'],'EXACT_ORIGINAL_READONLY_PUBLIC_SUBMOUNT_REQUIRED')
   extra+=['--mount','type=bind,src='+m['source']+',dst='+m['target']+',readonly']
  argv[anchor:anchor]=extra
  attempted=True;made=docker(*argv,timeout=20);cid=made.stdout.decode().strip();need(len(cid)==64,'EXACT_OWN_BUILD_CID_REQUIRED')
  result['containerId']=cid
  try:
   start_result=docker('start',cid,timeout=20,check=False)
   result['dockerStart']={'returnCode':start_result.returncode,'stdout':start_result.stdout[:16384].decode(errors='replace'),'stderr':start_result.stderr[:16384].decode(errors='replace'),'stdoutTruncated':len(start_result.stdout)>16384,'stderrTruncated':len(start_result.stderr)>16384}
  except subprocess.TimeoutExpired as e:
   result['dockerStart']={'timedOut':True,'stdout':(e.stdout or b'')[:16384].decode(errors='replace'),'stderr':(e.stderr or b'')[:16384].decode(errors='replace')}
   raise
  finally:
   if result.get('dockerStart',{}).get('returnCode')!=0:
    try:
     state_result=docker('inspect','--format','{{json .State}}',cid,timeout=5,check=False)
     if state_result.returncode==0:
      own_state=json.loads(state_result.stdout)
      result['dockerStateBeforeCleanup']={k:own_state.get(k)for k in ['Status','Running','Pid','ExitCode','Error','OOMKilled','StartedAt','FinishedAt']}
     else:result['dockerStateCaptureFailed']={'returnCode':state_result.returncode}
    except BaseException as e:result['dockerStateCaptureFailed']={'errorClass':type(e).__name__}
    (out/'START_FAILURE_BEFORE_CLEANUP_ACTUAL.json').write_text(json.dumps(result,indent=2))
  need(start_result.returncode==0,'OWN_DOCKER_START_FAILED')
  proof=physical(cid);result['pid']=proof[0];result['ticks']=proof[1]
  waited=docker('wait',cid,timeout=500);result['exitCode']=waited.stdout.decode().strip();result['oomKilled']=field(cid,'{{.State.OOMKilled}}')=='true'
  need(result['exitCode']=='0','EXISTING_ORIGINAL_CLUB_NEXT_BUILD_FAILED')
  nextdir=P/'source/.next';bid=(nextdir/'BUILD_ID').read_text().strip();need(bid and bid!='MKqk1B-xeW6DX8QPKUAfx','NEW_ENDPOINT_BUILD_REQUIRED')
  need(field(state['borrowedClubCID'],'{{.State.Running}} {{.State.Pid}}')=='true '+str(state['borrowedClubPID'])and Path('/proc',str(state['borrowedClubPID']),'stat').read_text().rsplit(')',1)[1].split()[19]==state['borrowedClubStartTicks'],'BORROWED_PUBLIC_SOURCE_GENERATION_CHANGED')
  files=[]
  for directory,dirs,names in os.walk(nextdir,followlinks=False):
   dirs[:]=[d for d in dirs if d not in ['cache','standalone','dev','node_modules']]
   for name in names:
    f=Path(directory)/name;need(f.is_file()and not f.is_symlink(),'REGULAR_COMPILED_FILE_REQUIRED')
    raw=f.read_bytes();files.append({'relativePath':f.relative_to(P/'source').as_posix(),'bytes':len(raw),'sha256':sha(raw)})
  manifest={'status':'ORIGINAL_CLUB_SOURCE15_ENDPOINT_NEXT_BUILD_PASS_NOT_INSTALLED','buildId':bid,'compiledRoot':str(nextdir),'baselineManifestSHA256':state['baselineManifestSHA256'],'onlyApplicationDelta':state['onlyApplicationDelta'],'compiledFiles':files,'originalPublicAndDependencyMountsMustBeRetained':True,'runtimeInstalled':False,'customerAcceptance':False}
  with(P/'COMPILED_RELEASE27_MANIFEST.json').open('x')as f:json.dump(manifest,f,indent=2)
  result.update(status='ORIGINAL_CLUB_SOURCE15_BUILD_PASS_NOT_INSTALLED',buildId=bid,compiledRoot=str(nextdir),compiledFiles=len(files),compiledBytes=sum(f['bytes']for f in files),manifestSHA256=sha((P/'COMPILED_RELEASE27_MANIFEST.json').read_bytes()))
 except BaseException as e:
  result.update(status='ORIGINAL_CLUB_BUILD_STOP_NO_REPLAY',errorClass=type(e).__name__,guard=str(e)if str(e).isupper()and len(str(e))<160 else None)
 finally:
  signal.signal(signal.SIGTERM,signal.SIG_IGN);signal.signal(signal.SIGINT,signal.SIG_IGN)
  try:
   if not cid and attempted:
    if not absent(NAME):
     c=field(NAME,'{{.Id}}');need(field(c,'{{index .Config.Labels "crays.website.owner"}}')==OWNER and field(c,'{{index .Config.Labels "crays.website.controller"}}')==rev['controllerSHA256'],'UNCERTAIN_BUILD_OWNERSHIP_REQUIRED');cid=c
   if cid:
    if field(cid,'{{.State.Running}}')=='true':
     if proof is None:proof=physical(cid)
     docker('stop','--time','3',cid,timeout=8,check=False)
    try:terminal(cid,proof)
    except BaseException:
     docker('kill',cid,check=False);time.sleep(.3);terminal(cid,proof)
    result['ownPIDAndCgroupPhysicallyStopped']=True
    docker('rm',cid);need(absent(cid),'OWN_BUILD_CONTAINER_NOT_REMOVED');result['ownBuildContainerPhysicallyRemoved']=True
   else:need(absent(NAME),'UNCERTAIN_BUILD_NAME_REMAINS')
   st=lease.lstat();need((st.st_dev,st.st_ino)==(ls.st_dev,ls.st_ino),'OWN_BUILD_LEASE_CHANGED');lease.unlink();result['ownLeaseReleasedAfterPhysicalCleanup']=True
  except BaseException as e:result['cleanupErrors'].append({'errorClass':type(e).__name__})
  result['elapsedSeconds']=round(time.monotonic()-started,3);(out/'RESULT_ACTUAL.json').write_text(json.dumps(result,indent=2));print(json.dumps(result))
 return 0 if result['status']=='ORIGINAL_CLUB_SOURCE15_BUILD_PASS_NOT_INSTALLED'and not result['cleanupErrors']else 1
if __name__=='__main__':raise SystemExit(main())
