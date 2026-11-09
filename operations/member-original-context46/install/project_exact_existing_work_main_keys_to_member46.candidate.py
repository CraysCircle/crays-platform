"""Root-reviewed private projection of exactly five already configured Main keys.
No identity/provider/database/service call. Original Member fields stay identical.
"""
from pathlib import Path
import os,stat,json,hashlib,sys,time,subprocess
H=Path(__file__).resolve().parent
MEMBER=Path('/srv/crays/private/member-nextcloud-consumer26/environment.private.json')
WORK=Path('/srv/crays/private/work24-qlo-runtime-20261108-01/environment-tls37.private.json')
DEST=Path('/srv/crays/private/member-original-context46-20261109-01')
KEYS=('CRAYS_CORE_IDENTITY_RPC_DATABASE_URL','CRAYS_CORE_IDENTITY_RPC_DATABASE','CRAYS_RUNTIME_DEPLOYMENT_ENV','CRAYS_AWS_DB_TARGET_BINDINGS_FILE','CRAYS_AWS_DB_TARGET_BINDINGS_SHA256')
CID='9e3bffe1affbfab8f880ceafc5f071223d0eb8232e5c1b05640495f9d9f6b4b0'
def need(ok,label):
 if not ok:raise RuntimeError(label)
def sha(b):return hashlib.sha256(b).hexdigest()
def metadata(s):return {'device':s.st_dev,'inode':s.st_ino,'ctimeNs':s.st_ctime_ns,'size':s.st_size,'uid':s.st_uid,'gid':s.st_gid,'mode':stat.S_IMODE(s.st_mode),'nlink':s.st_nlink}
def read_exact(p,expected=None,limit=65536):
 fd=os.open(p,os.O_RDONLY|os.O_NOFOLLOW|os.O_NONBLOCK)
 try:
  a=os.fstat(fd);need(stat.S_ISREG(a.st_mode)and a.st_nlink==1 and 0<a.st_size<limit,'BOUNDED_REGULAR_INPUT_REQUIRED')
  if expected is not None:need(metadata(a)==expected,'EXACT_FRESH_ENVIRONMENT_METADATA_PREIMAGE_REQUIRED')
  b=os.read(fd,limit);z=os.fstat(fd)
  need(len(b)==a.st_size and metadata(a)==metadata(z)==metadata(p.lstat()),'ENVIRONMENT_CHANGED_DURING_RAM_READ')
  return b,a
 finally:os.close(fd)
def put(p,b,uid,gid,mode):
 fd=os.open(p,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,mode)
 try:
  os.fchown(fd,uid,gid);os.fchmod(fd,mode);v=memoryview(b)
  while v:
   n=os.write(fd,v);need(n>0,'COMPLETE_NEW_PRIVATE_PROJECTION_REQUIRED');v=v[n:]
  os.fsync(fd)
 finally:os.close(fd)
def main(review):
 os.umask(0o077)
 need(os.getuid()==0 and Path('/sys/devices/virtual/dmi/id/board_asset_tag').read_text().strip()=='i-0eb300e1b02414d8f','EXACT_AWS_ROOT_HOST_REQUIRED')
 rb,_=read_exact(Path(review),limit=131072);r=json.loads(rb)
 need(r.get('executionApproved')is True and r.get('independentReviewSHA256')and r.get('controllerSHA256')==sha(Path(__file__).read_bytes()),'EXACT_INDEPENDENT_PROJECTION_REVIEW_REQUIRED')
 need(os.environ.get('INVOCATION_ID') and r.get('freshExclusiveWindowApproved')is True and 0<r['windowExpiresAtUnix']-time.time()<=300,'FINITE_ROOT_PROJECTION_WINDOW_REQUIRED')
 unit='crays-member46-environment-20261109-01.service'
 cg=Path('/sys/fs/cgroup')/Path('/proc/self/cgroup').read_text().strip().split(':',2)[-1].lstrip('/')
 need(cg.name==unit and int((cg/'memory.max').read_text())<=268435456 and int((cg/'memory.swap.max').read_text())==0 and int((cg/'pids.max').read_text())<=32,'FINITE_ENVIRONMENT_PROJECTION_CGROUP_REQUIRED')
 fence,_=read_exact(Path('/srv/crays/migration-work/20261108/root/ROOT_HEAVY_ATTEMPT_ACTIVE.json'),limit=16384)
 need(sha(fence)==r['rootHeavyFenceSHA256'] and json.loads(fence)['unit']==unit,'EXACT_ROOT_PROJECTION_FENCE_REQUIRED')
 receipt=Path('/srv/crays/acceptance/member42-family-adoption-20261109-01/RESULT_ACTUAL.json').read_bytes()
 need(sha(receipt)=='813a9a412fcf552afbd0f1152b1e7b8a354af65bb9a216a6fdb0126fb61bd5c5','EXACT42_FAMILY_PREDECESSOR_RECEIPT_REQUIRED')
 c=json.loads(subprocess.check_output(['/usr/bin/docker','inspect',CID],timeout=10))[0]
 need(c['Id']==CID and c['State']['Running'] and c['Config']['User']=='1000:1000','EXACT_ORIGINAL42_MEMBER_PRINCIPAL_REQUIRED')
 mounts={m['Destination']:m for m in c['Mounts']}
 need(mounts['/run/crays/member/environment.private.json']['Source']==str(MEMBER) and mounts['/run/crays/member/environment.private.json']['RW']is False,'EXACT42_CURRENT_ENVIRONMENT_BIND_REQUIRED')
 memberraw,ms=read_exact(MEMBER,r['memberEnvironmentPreimage'])
 workraw,ws=read_exact(WORK,r['workEnvironmentPreimage'])
 need((ms.st_uid,ms.st_gid,stat.S_IMODE(ms.st_mode))==(1000,1000,0o600),'ORIGINAL_MEMBER_ENVIRONMENT_CUSTODY_REQUIRED')
 need((ws.st_uid,ws.st_gid,stat.S_IMODE(ws.st_mode))==(1000,32022,0o400) and sha(workraw)=='3507491ab9d14b043b0ac7d105f83238c279aafaee4ced202ae6c8c15dcafe53','EXACT_LIVE_WORK_BOOTSTRAP_ENVIRONMENT_REQUIRED')
 member=json.loads(memberraw);work=json.loads(workraw)
 need(all(isinstance(k,str)and isinstance(v,str)and'\0'not in v for k,v in member.items()),'ORIGINAL_MEMBER_STRING_ENVIRONMENT_REQUIRED')
 need(all(k in work and isinstance(work[k],str)and work[k]and'\0'not in work[k]for k in KEYS),'EXACT_EXISTING_FIVE_WORK_KEYS_REQUIRED')
 need(work['CRAYS_CORE_IDENTITY_RPC_DATABASE']=='crays_forest_city_main_test_20260925'and work['CRAYS_RUNTIME_DEPLOYMENT_ENV']=='aws-acceptance'and work['CRAYS_AWS_DB_TARGET_BINDINGS_FILE']=='/run/crays-bindings/acceptance/work-db-targets.json','EXACT_MAIN_PURPOSE_TARGET_REQUIRED')
 merged={**member,**{k:work[k]for k in KEYS}}
 need(all(merged[k]==v for k,v in member.items()if k not in KEYS),'EVERY_ORIGINAL_MEMBER_NONMAIN_FIELD_PRESERVED')
 need(all(not k.startswith(('PG','AWS_','VERCEL_'))for k in merged),'ORIGINAL_MEMBER_BOOTLOADER_KEY_POLICY_REQUIRED')
 need(merged['CRAYS_AWS_MEMBER_ORIGIN']=='https://member.crays.world'and merged['PORT']=='8991'and merged['HOSTNAME']=='127.0.0.1','ORIGINAL_MEMBER_ORIGIN_AND_ENDPOINT_UNCHANGED')
 body=(json.dumps(merged,sort_keys=True,separators=(',',':'))+'\n').encode();need(len(body)<65536,'ORIGINAL_MEMBER_BOOTLOADER_SIZE_BOUND')
 need(not DEST.exists(),'EXCLUSIVE_NEW_PRIVATE_ENVIRONMENT_NO_REPLAY')
 DEST.mkdir(mode=0o700)
 put(DEST/'INTENT.json',(json.dumps({'status':'EXACT_FIVE_EXISTING_WORK_KEYS_IN_ORIGINAL_MEMBER_ENVIRONMENT','automaticReplayAllowed':False,'runtimeChanged':False})+'\n').encode(),0,0,0o400)
 put(DEST/'environment.private.json',body,1000,1000,0o600)
 reread,ds=read_exact(DEST/'environment.private.json')
 need(reread==body and ds.st_uid==ds.st_gid==1000 and stat.S_IMODE(ds.st_mode)==0o600,'ORIGINAL_MEMBER_BOOTLOADER_COMPATIBLE_POSTIMAGE_REQUIRED')
 result={'status':'ORIGINAL_MEMBER_ENVIRONMENT_FIVE_EXISTING_MAIN_KEYS_PROJECTED_NOT_INSTALLED','destination':str(DEST/'environment.private.json'),'uid':1000,'gid':1000,'mode':'0600','onlyProjectedKeyNames':list(KEYS),'allOtherOriginalMemberFieldsUnchanged':True,'sourceEnvironmentFilesUnchanged':True,'privateValuesOrCredentialHashesReturned':False,'runtimeChanged':False,'automaticReplayAllowed':False}
 put(DEST/'RESULT_ACTUAL.json',(json.dumps(result,indent=2)+'\n').encode(),0,0,0o400)
 return result
if __name__=='__main__':
 try:print(json.dumps(main(sys.argv[1])))
 except BaseException as e:print(json.dumps({'status':'MEMBER46_ENVIRONMENT_PROJECTION_STOP_NO_REPLAY','errorClass':type(e).__name__,'guard':str(e)if isinstance(e,RuntimeError)else None,'privateValuesReturned':False}));raise SystemExit(1)
