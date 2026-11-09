"""One existing-AWS Member42 build. No deployment, DB, credentials or source deletion."""
from pathlib import Path
import os,json,hashlib,fcntl,subprocess,datetime,sys,stat
P=Path('/srv/crays/migration-work/20261109/root/document-provider-aws51-source01')
R=Path('/srv/crays/migration-work/20261108/root')
UNIT='crays-member-document-provider51-build-20261109-01.service'
def need(ok,label):
 if not ok:raise RuntimeError(label)
def digest(b):return hashlib.sha256(b).hexdigest()
def write_new(p,b):
 fd=os.open(p,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o400)
 try:
  os.fchmod(fd,0o400)
  with os.fdopen(fd,'wb',closefd=False)as f:f.write(b);f.flush();os.fsync(f.fileno())
 finally:os.close(fd)
def mount_guard():
 data=json.loads(subprocess.check_output(['findmnt','-J','-T','/srv/crays','-o','TARGET,SOURCE,FSTYPE,UUID']))
 need(data.get('filesystems')==[{'target':'/srv/crays','source':'/dev/nvme1n1','fstype':'ext4','uuid':'c8aa4ad5-d490-45f9-98ec-fab5a3ff28e9'}],'EXACT_EXISTING_DATA_VOLUME_REQUIRED')
 need(Path('/srv/crays').resolve()==Path('/srv/crays'),'CANONICAL_DATA_ROOT_REQUIRED')
def main(review_path,review_sha):
 os.umask(0o077)
 need(os.getuid()==0 and Path('/sys/devices/virtual/dmi/id/board_asset_tag').read_text().strip()=='i-0eb300e1b02414d8f','EXACT_AWS_ROOT_HOST_REQUIRED')
 mount_guard()
 review_path=Path(review_path)
 need(review_path.is_file() and not review_path.is_symlink() and review_path.resolve()==review_path and str(review_path).startswith('/srv/crays/migration-work/20261109/root/'),'OWN_EXISTING_BUILD_REVIEW_REQUIRED')
 rb=review_path.read_bytes();need(digest(rb)==review_sha,'EXACT_INDEPENDENT_BUILD_REVIEW_REQUIRED')
 body=(P/'build_member_document_provider51.rev02.candidate.py').read_bytes()
 need(digest(body)=='37aa41f3cefa49dfe4f9bb0b9cdcca59f7f4a0f7c1401fe7ae6017f1f460f47d','EXACT_BUILD51_CONTROLLER_REQUIRED')
 proposal_raw=(P/'BUILD51_REV02_REVIEW_PROPOSAL.json').read_bytes()
 need(digest(proposal_raw)=='f8662e3d529e5da710475d9e23bdd66a2a5c54304416d03dbd1d06bce1e8f1c6','EXACT_BUILD_PROPOSAL_REQUIRED')
 lock=os.open(R/'ROOT_HEAVY_EXECUTION.lock',os.O_RDWR|os.O_NOFOLLOW)
 st=os.fstat(lock);need(stat.S_ISREG(st.st_mode) and st.st_nlink==1,'EXACT_ROOT_LOCK_FILE_REQUIRED')
 fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
 fence=R/'ROOT_HEAVY_ATTEMPT_ACTIVE.json'
 need(not fence.exists(),'ROOT_OTHER_ATTEMPT_ACTIVE')
 mount_guard()
 mem={l.split(':')[0]:int(l.split()[1])*1024 for l in Path('/proc/meminfo').read_text().splitlines() if l.split(':')[0]=='MemAvailable'}
 v=os.statvfs('/srv/crays')
 need(mem['MemAvailable']>=8*1024**3 and v.f_bavail*v.f_frsize>=4*1024**3,'BUILD_RESOURCE_HEADROOM_REQUIRED')
 now=datetime.datetime.now(datetime.timezone.utc)
 admission=json.loads(proposal_raw);admission.update(executionApproved=True,freshExclusiveBuildWindowApproved=True,resourceWindowUnbound=False,independentReviewSHA256=review_sha,buildWindowExpiresAtUTC=(now+datetime.timedelta(seconds=895)).isoformat())
 write_new(P/'ROOT_BUILD51_APPROVED.json',(json.dumps(admission,sort_keys=True,indent=2)+'\n').encode())
 fence_bytes=(json.dumps({'schema':'crays.root.heavy-attempt.v1','owner':'Root','purpose':'member-document-provider51-build','unit':UNIT,'startedAtUTC':now.isoformat(),'controllerSHA256':digest(body),'automaticReplayAllowed':False},sort_keys=True)+'\n').encode()
 write_new(fence,fence_bytes)
 result={'schema':'crays.member.build51.root-execution.v1','runtimeInstalled':False,'unit':UNIT,'automaticReplayAllowed':False}
 try:
  command=['systemd-run','--unit='+UNIT,'--wait','--quiet','--property=Type=exec','--property=MemoryMax=6442450944','--property=TasksMax=256','--property=CPUQuota=150%','--property=RuntimeMaxSec=840','--property=TimeoutStopSec=20','--property=KillMode=control-group','--property=UMask=0077','--property=StandardOutput=null','--property=StandardError=null','/usr/bin/python3','-I','-B',str(P/'build_member_document_provider51.rev02.candidate.py'),str(P/'ROOT_BUILD51_APPROVED.json')]
  q=subprocess.run(command,capture_output=True,text=True,timeout=875)
  result['systemdRunExit']=q.returncode
  unit_raw=subprocess.check_output(['systemctl','show',UNIT,'-p','ActiveState','-p','SubState','-p','MainPID','-p','ControlGroup','-p','ExecMainStatus'],text=True)
  unit=dict(line.split('=',1)for line in unit_raw.splitlines()if'='in line)
  cg=Path('/sys/fs/cgroup/system.slice')/UNIT
  empty=not cg.exists()or not (cg/'cgroup.procs').read_text().strip()
  need(unit.get('MainPID')=='0' and unit.get('ActiveState')in('inactive','failed')and empty,'PHYSICAL_BUILD_UNIT_RETURN_REQUIRED')
  result.update(unitReturn=unit,cgroupEmptyOrAbsent=True,physicalReturn=True)
  output=Path('/srv/crays/migration-work/20261109/root/member-document-provider51-build01/RESULT_ACTUAL.json')
  if output.exists():result['buildResult']=json.loads(output.read_text())
  need(fence.read_bytes()==fence_bytes,'EXACT_OWN_BUILD_FENCE_REQUIRED')
  fence.unlink();result['rootFenceReleased']=True
  write_new(P/'ROOT_BUILD51_EXECUTION_ACTUAL.json',(json.dumps(result,indent=2)+'\n').encode())
  print(json.dumps(result))
  return q.returncode
 finally:
  fcntl.flock(lock,fcntl.LOCK_UN);os.close(lock)
if __name__=='__main__':
 try:raise SystemExit(main(sys.argv[1],sys.argv[2]))
 except Exception as e:
  print(json.dumps({'status':'ROOT_BUILD51_STOP_INSPECT_SAME_HANDLE','errorClass':type(e).__name__,'guard':str(e) if isinstance(e,RuntimeError)else None,'automaticReplayAllowed':False}))
  raise SystemExit(1)
