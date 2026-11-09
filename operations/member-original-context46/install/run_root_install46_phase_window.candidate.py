"""One Root-admitted finite46 install phase; no replay or approval inference."""
from pathlib import Path
import os,stat,json,hashlib,fcntl,subprocess,datetime,sys,time
H=Path(__file__).resolve().parent
R=Path('/srv/crays/migration-work/20261108/root')
PHASES={
 'stage':('stage_exact_completed_member46_release.candidate.py',1073741824,128,300),
 'environment':('project_exact_existing_work_main_keys_to_member46.candidate.py',268435456,32,60),
 'capture':('member46_lifecycle.candidate.py',1073741824,128,120),
 'adopt':('member46_lifecycle.candidate.py',1073741824,128,480)}
def need(ok,label):
 if not ok:raise RuntimeError(label)
def digest(b):return hashlib.sha256(b).hexdigest()
def stable(p,maximum=131072,private=False):
 p=Path(p);need(p.resolve()==p,'CANONICAL_ROOT_ADMISSION_REQUIRED')
 fd=os.open(p,os.O_RDONLY|os.O_NOFOLLOW)
 try:
  a=os.fstat(fd);need(stat.S_ISREG(a.st_mode)and a.st_nlink==1 and 0<a.st_size<=maximum and a.st_uid==0 and not a.st_mode&0o022,'ROOT_STABLE_ADMISSION_REQUIRED')
  if private:need(not a.st_mode&0o077,'PRIVATE_ROOT_ADMISSION_REQUIRED')
  b=os.read(fd,maximum+1);z=os.fstat(fd)
  key=lambda s:(s.st_dev,s.st_ino,s.st_ctime_ns,s.st_mtime_ns,s.st_size)
  need(len(b)==a.st_size and key(a)==key(z)==key(p.lstat()),'ROOT_ADMISSION_CHANGED')
  return b
 finally:os.close(fd)
def put(p,b):
 fd=os.open(p,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o400)
 try:
  os.fchmod(fd,0o400);v=memoryview(b)
  while v:
   n=os.write(fd,v);need(n>0,'COMPLETE_ROOT_WINDOW_RECORD_REQUIRED');v=v[n:]
  os.fsync(fd)
 finally:os.close(fd)
def main(phase,review):
 os.umask(0o077)
 need(phase in PHASES and os.getuid()==0 and Path('/sys/devices/virtual/dmi/id/board_asset_tag').read_text().strip()=='i-0eb300e1b02414d8f','EXACT_ROOT46_PHASE_HOST_REQUIRED')
 data=json.loads(subprocess.check_output(['findmnt','-J','-T','/srv/crays','-o','TARGET,SOURCE,FSTYPE,UUID']))
 need(data.get('filesystems')==[{'target':'/srv/crays','source':'/dev/nvme1n1','fstype':'ext4','uuid':'c8aa4ad5-d490-45f9-98ec-fab5a3ff28e9'}],'EXACT_EXISTING_DATA_VOLUME_REQUIRED')
 review=Path(review);need(review==H/('ROOT_'+phase.upper()+'46_APPROVED.json'),'EXACT_ROOT_PHASE_ADMISSION_PATH_REQUIRED')
 raw=stable(review,262144,True);r=json.loads(raw)
 need(r.get('executionApproved')is True and r.get('phase')==phase and 0<=time.time()-r['rootApprovedAtUnix']<=300,'FRESH_EXPLICIT_ROOT_PHASE_ADMISSION_REQUIRED')
 controller,memory,tasks,seconds=PHASES[phase]
 need(r['controllerSHA256']==digest(stable(H/controller)),'EXACT_PHASE_CONTROLLER_REVIEW_REQUIRED')
 review1=H/'INDEPENDENT_INSTALL46_SOURCE_REVIEW.json'
 need(digest(stable(review1))=='3854c4eaf9078e023f346499b630dd64c889367811d532b74eb152038f4e93ba' and r['independentReviewSHA256']=='3854c4eaf9078e023f346499b630dd64c889367811d532b74eb152038f4e93ba','EXACT_INDEPENDENT_INSTALL46_REVIEW_REQUIRED')
 business=Path('/srv/crays/migration-work/20261109/root/member-common-main46-independent-review01/INDEPENDENT_COMMON_MAIN46_SOURCE_REVIEW_ACTUAL.json')
 need(digest(stable(business))=='faaded802b2941dcf1d8236d60729c26f7e278f1e42c1136bbef84b34b536d34','EXACT_INDEPENDENT_COMMON_MAIN46_REVIEW_REQUIRED')
 need(r.get('githubExactByteAckVerified')is True,'ROOT_GITHUB_EXACT_BYTE_ACK_REQUIRED')
 ack=Path(r['githubAckEvidencePath']);need(str(ack).startswith('/srv/crays/migration-work/')and digest(stable(ack,1048576))==r['githubAckEvidenceSHA256'],'EXACT_ROOT_GITHUB_ACK_EVIDENCE_REQUIRED')
 for name,h in r['sourcePins'].items():need(Path(name).name==name and digest(stable(H/name,262144))==h,'EXACT_CURRENT_PHASE_SOURCE_PINS_REQUIRED')
 unit='crays-member46-'+phase+'-20261109-01.service'
 lock=os.open(R/'ROOT_HEAVY_EXECUTION.lock',os.O_RDWR|os.O_NOFOLLOW)
 st=os.fstat(lock);need(stat.S_ISREG(st.st_mode)and st.st_nlink==1 and st.st_uid==0,'EXACT_EXISTING_ROOT_LOCK_REQUIRED')
 fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
 fence=R/'ROOT_HEAVY_ATTEMPT_ACTIVE.json'
 try:
  need(not fence.exists(),'ROOT_OTHER_ATTEMPT_ACTIVE')
  need(not (H/('ROOT_'+phase.upper()+'46_WINDOW_APPROVED.json')).exists(),'EXCLUSIVE_PHASE_WINDOW_NO_REPLAY')
  now=time.time();fencebytes=(json.dumps({'schema':'crays.root.heavy-attempt.v1','owner':'Root','purpose':'member-original-context46-'+phase,'unit':unit,'startedAtUnix':now,'controllerSHA256':r['controllerSHA256'],'automaticReplayAllowed':False},sort_keys=True)+'\n').encode()
  admitted=dict(r);admitted.update(freshExclusiveWindowApproved=True,windowExpiresAtUnix=now+min(seconds+45,590),rootHeavyFenceSHA256=digest(fencebytes))
  if phase=='stage':need(admitted.get('stageOnly')is True and admitted.get('runtimeChangeApproved')is False,'STAGE_ONLY_ROOT_ADMISSION_REQUIRED')
  childReview=H/('ROOT_'+phase.upper()+'46_WINDOW_APPROVED.json')
  put(childReview,(json.dumps(admitted,sort_keys=True,indent=2)+'\n').encode());put(fence,fencebytes)
  command=['systemd-run','--unit='+unit,'--wait','--quiet','--property=Type=exec','--property=MemoryMax='+str(memory),'--property=MemorySwapMax=0','--property=TasksMax='+str(tasks),'--property=CPUQuota=50%','--property=RuntimeMaxSec='+str(seconds),'--property=TimeoutStopSec=20','--property=KillMode=control-group','--property=UMask=0077','--property=StandardOutput=null','--property=StandardError=null','/usr/bin/python3','-I','-B',str(H/controller),str(childReview)]
  if phase in ('capture','adopt'):command.append(phase)
  q=subprocess.run(command,capture_output=True,timeout=seconds+45)
  state=subprocess.check_output(['systemctl','show',unit,'-p','ActiveState','-p','SubState','-p','MainPID','-p','ControlGroup','-p','ExecMainStatus'],text=True,timeout=10)
  state=dict(v.split('=',1)for v in state.splitlines()if'='in v)
  cg=Path('/sys/fs/cgroup/system.slice')/unit
  empty=not cg.exists()or all(not p.read_text().strip()for p in cg.rglob('cgroup.procs'))
  need(state['MainPID']=='0'and state['ActiveState']in('inactive','failed')and empty,'PHYSICAL_OWN_PHASE_UNIT_RETURN_REQUIRED')
  need(stable(fence,16384,True)==fencebytes,'EXACT_OWN_ROOT_PHASE_FENCE_REQUIRED')
  result={'status':'ROOT46_PHASE_RETURNED','phase':phase,'systemdRunExit':q.returncode,'unitReturn':state,'physicalReturn':True,'cgroupEmptyOrAbsent':True,'automaticReplayAllowed':False,'rawLogsReturned':False,'githubAckEvidenceSHA256':r['githubAckEvidenceSHA256']}
  fence.unlink();result['rootFenceReleased']=True
  put(H/('ROOT_'+phase.upper()+'46_EXECUTION_ACTUAL.json'),(json.dumps(result,indent=2)+'\n').encode())
  print(json.dumps(result));return q.returncode
 finally:fcntl.flock(lock,fcntl.LOCK_UN);os.close(lock)
if __name__=='__main__':
 try:raise SystemExit(main(sys.argv[1],sys.argv[2]))
 except Exception as e:
  print(json.dumps({'status':'ROOT46_PHASE_STOP_INSPECT_SAME_HANDLE','errorClass':type(e).__name__,'guard':str(e)if isinstance(e,RuntimeError)else None,'automaticReplayAllowed':False,'privateValuesPrinted':False}));raise SystemExit(1)
