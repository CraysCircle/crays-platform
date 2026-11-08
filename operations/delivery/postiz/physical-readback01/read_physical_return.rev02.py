import pathlib,os,stat,json,hashlib,subprocess,re
ROOT=pathlib.Path('/srv/crays/migration-work/20261108/delivery/postiz-frontend-isolated01')
STAGE=pathlib.Path('/srv/crays/incoming/delivery-postiz-frontend-isolated-20261108-01')
NAME='crays-delivery-postiz-frontend-isolated-20261108-01'
OWNER='01a1b9f3-700f-78b2-ad73-b6d9334c4ac4'
IMAGE='sha256:44587056a2696bd6f126ffdbe111ab0b20db75907fa0f67e213554fc68f680a9'
def need(v,k):
 if not v:raise RuntimeError(k)
def checked(p,limit):
 s=p.lstat();need(stat.S_ISREG(s.st_mode)and not p.is_symlink()and s.st_uid==0 and s.st_gid==0 and stat.S_IMODE(s.st_mode)==0o400 and s.st_size<=limit,'PROTECTED_BOUNDED_OWN_FILE')
 fd=os.open(p,os.O_RDONLY|os.O_NOFOLLOW)
 with os.fdopen(fd,'rb')as f:
  t=os.fstat(f.fileno());need((s.st_dev,s.st_ino)==(t.st_dev,t.st_ino),'SAME_OWN_INPUT_INODE');b=f.read(limit+1)
 need(len(b)==s.st_size,'COMPLETE_BOUNDED_OWN_FILE');return b
def lifetime_alive(bound):
 p=pathlib.Path('/proc')/str(bound['pid'])
 try:
  ticks=int((p/'stat').read_text().rsplit(')',1)[1].split()[19]);rows=(p/'cgroup').read_text()
 except FileNotFoundError:return False
 return ticks==bound['startTicks']or bound['containerId']in rows
try:
 need(os.getuid()==0 and pathlib.Path('/sys/devices/virtual/dmi/id/board_asset_tag').read_text().strip()=='i-0eb300e1b02414d8f','EXACT_EXISTING_HOST')
 for p in [ROOT,STAGE,*ROOT.parents,*STAGE.parents]:
  s=p.lstat();need(stat.S_ISDIR(s.st_mode)and not p.is_symlink()and s.st_uid==0 and not(stat.S_IMODE(s.st_mode)&0o022),'PROTECTED_OWN_ANCESTRY')
 source=checked(STAGE/'qualify_original_frontend.candidate.py',65536)
 need(hashlib.sha256(source).hexdigest()=='506ef15f0f324801540bb39441a9e7db023bc7d378c16ad9b5cea60d551a6bc2','EXACT_EXECUTED_REVIEWED_SOURCE')
 binding=checked(STAGE/'binding.json',4096);need(hashlib.sha256(binding).hexdigest()=='83a82fb3057632fb3a851c5810e6f452869ad8133cd852329c238e522b13fd14','EXACT_EXECUTED_BINDING')
 b=checked(ROOT/'ACTUAL.json',65536);actual=json.loads(b)
 ib=checked(ROOT/'INTENT.json',65536);intent=json.loads(ib)
 need(intent['ownerThread']==OWNER and intent['image']==IMAGE and intent['name']==NAME and intent['attempt']==actual['attempt'],'EXACT_OWN_ACTUAL_INTENT')
 need(actual['image']==IMAGE and actual['customerAcceptance']is False and actual['rootFenceNeverModifiedOrRemoved']is True,'EXACT_ORIGINAL_ISOLATED_SCOPE')
 r=subprocess.run(['/usr/bin/docker','inspect',NAME],capture_output=True,timeout=12,env={'PATH':'/usr/bin:/bin'})
 absent=r.returncode==1 and r.stdout.strip()==b'[]'and r.stderr.decode().strip()=='error: no such object: '+NAME
 need(absent,'OWN_CONTAINER_NOT_PHYSICALLY_ABSENT')
 bound=actual.get('physicalBinding')
 pid_returned=bound is None or not lifetime_alive(bound)
 cgroup_returned=bound is None
 if bound is not None:
  need(re.fullmatch('[0-9a-f]{64}',bound['containerId'])and bound['containerId']in bound['cgroup']and '..'not in bound['cgroup'].split('/'),'OWN_BOUND_CGROUP_PATH')
  procs=pathlib.Path('/sys/fs/cgroup')/bound['cgroup'].lstrip('/')/'cgroup.procs'
  cgroup_returned=not procs.exists()or not procs.read_text().strip()
 need(pid_returned and cgroup_returned,'OWN_BOUND_LIFETIME_CGROUP_NOT_RETURNED')
 need(not(ROOT/'original-environment.private.env').exists()and not(ROOT/'original-environment.private.env').is_symlink()and not(ROOT/'admission').exists()and not(ROOT/'admission').is_symlink(),'OWN_PRIVATE_INPUTS_NOT_RETURNED')
 logs={};combined=0
 for label,e in actual['logArtifacts'].items():
  need(label in ['stdout','stderr']and e['path']==str(ROOT/(label+'.private.log')),'EXACT_OWN_PRIVATE_LOG_PATH')
  raw=checked(ROOT/(label+'.private.log'),2097152);combined+=len(raw)
  need(len(raw)==e['bytes']and hashlib.sha256(raw).hexdigest()==e['sha256'],'EXACT_PRIVATE_LOG_BYTES_SHA')
  logs[label]={'bytes':len(raw),'sha256':e['sha256'],'root0400':True}
 need(combined<=2097152,'COMBINED_PRIVATE_LOG_LIMIT')
 required=['physicalCleanupComplete','leaseReturned','rootCreated','appIntentCreated','lifecycleStartedBeforeOwnFilesystemWrites']
 need(all(actual.get(k)is True for k in required),'ACTUAL_PHYSICAL_RETURN_REQUIRED')
 started=set(actual.get('startedCaptureReaders',[]));need(started<=set(['stdout','stderr'])and all(actual['diagnostics'][k]['eof']and not actual['diagnostics'][k]['readerFailure']for k in started),'ACTUAL_STARTED_READERS_COMPLETE')
 native_accepted=actual.get('pass')is True and actual.get('markerReleased')is True and actual.get('nativePort4200Ready')is True and actual.get('nativeContainerOOMKilled')is False and actual.get('safeGuard')is None and started=={'stdout','stderr'}and not any(actual['diagnostics'][k]['overLimit']for k in started)
 fence=pathlib.Path('/srv/crays/migration-work/20261108/root/ROOT_HEAVY_ATTEMPT_ACTIVE.json')
 fence_present=fence.exists()
 fence_sha=None
 if fence_present:fence_sha=hashlib.sha256(checked(fence,16384)).hexdigest()
 print(json.dumps({'pass':True,'scope':actual['scope'],'actualSHA256':hashlib.sha256(b).hexdigest(),'intentSHA256':hashlib.sha256(ib).hexdigest(),'originalImage':IMAGE,'attempt':actual['attempt'],'physicalBinding':bound,'sourceAndBindingHashesExact':True,'nativePort4200Ready':actual.get('nativePort4200Ready'),'nativeContainerOOMKilled':actual.get('nativeContainerOOMKilled'),'nativeOriginalFrontendStartupAccepted':native_accepted,'nativeActualSafeGuard':actual.get('safeGuard'),'ownContainerPhysicallyAbsent':True,'ownPIDStartticksAndCgroupReturned':True,'privateEnvAndAdmissionPhysicallyAbsent':True,'privateLogArtifacts':logs,'combinedLogBytes':combined,'completeBoundedReaderDiagnostics':True,'rootFenceObservedPresent':fence_present,'rootFenceObservedSHA256':fence_sha,'rootFenceNeverModifiedOrRemovedByReadback':True,'globalRootLeaseReleaseClaimed':False,'sourceOrRuntimeMutation':False,'rawLogsOrEnvironmentPrinted':False,'customerAcceptance':False}))
except BaseException as e:
 m=str(e);print(json.dumps({'pass':False,'safeGuard':m if re.fullmatch('[A-Z][A-Z0-9_]{3,120}',m)else'PROTECTED_OWN_READBACK_FAILURE','sourceOrRuntimeMutation':False,'rawLogsOrEnvironmentPrinted':False,'noReplay':True}));raise SystemExit(1)
