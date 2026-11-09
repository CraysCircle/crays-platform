"""Root-only finite same-CID Team transport adoption. No Member/Work restart, no Docker create, no customer/auth changes."""
from pathlib import Path
import os,stat,json,hashlib,runpy,subprocess,time,sys,signal,copy,fcntl,traceback
H=Path(__file__).resolve().parent
BASE=Path('/srv/crays/migration-work/20261108/root/member26-existing-family-continuation07-rev03')
OUT=Path('/srv/crays/acceptance/common-club-origin35-adoption-20261109-01')
PRE=H/'stage01/CURRENT_FAMILY35_PREIMAGE.private.json'
LISTENER=Path('/srv/crays/releases/nostr-original-core-addon-20261108-18/common-machine57/listener.nostr18-machine57.candidate.mjs')
OLD='7e8b668caf10118d84082f8fd68a63e390a3ee36a2e0da7b022a06d7203fa5bb'
NEW='7e8b668caf10118d84082f8fd68a63e390a3ee36a2e0da7b022a06d7203fa5bb'
COMMIT=Path('/srv/crays/acceptance/common-private-team-transport33-20261108-01/RESULT_ACTUAL.json')
COMMIT_SHA='d602b8f271025eb283d46bf7f444c1aa5a2c922fac6c6de3b5a06535013126b4'
m=runpy.run_path(str(BASE/'member26_lifecycle.candidate.py'))
for n in ['need','sha','canon','stable','put','sync']:globals()[n]=m[n]
UNITS=m['UNITS'];PATHS=m['PATHS']
PHASE='ADMISSION'
def json_physical(values):
 pid,ticks,cgroup=values
 need(type(pid)is int and type(ticks)is str and isinstance(cgroup,Path),'EXACT_PID_TICKS_CGROUP_PATH_SHAPE')
 return [pid,ticks,str(cgroup)]
def read_control(path):
 s=path.lstat();need(path.resolve()==path and stat.S_ISREG(s.st_mode)and s.st_uid==s.st_gid==0 and stat.S_IMODE(s.st_mode)==0o444 and s.st_nlink==1,'EXACT_ORIGINAL_PUBLIC_CONTROL_CUSTODY')
 return stable(path,131072)
def main(r):
 global PHASE
 need(os.getuid()==0 and Path('/sys/devices/virtual/dmi/id/board_asset_tag').read_text().strip()=='i-0eb300e1b02414d8f','EXACT_ROOT_HOST_REQUIRED')
 need(r.get('executionApproved')is True and r.get('independentReviewSHA256')and r.get('controllerSHA256')==sha(stable(Path(__file__),131072)),'EXACT_ROOT_INDEPENDENT_SOURCE_REVIEW')
 for n,h in r['sourcePins'].items():need(Path(n).name==n and sha(stable(H/n,131072))==h,'EXACT_SOURCE32_PINS')
 need(os.environ.get('INVOCATION_ID')and r.get('freshExclusiveWindowApproved')is True and 0<r['windowExpiresAtUnix']-time.time()<=600,'ROOT_EXCLUSIVE_WINDOW_REQUIRED')
 cg=Path('/sys/fs/cgroup')/Path('/proc/self/cgroup').read_text().strip().split(':',2)[-1].lstrip('/')
 need(cg.name=='crays-common35-adopt-20261109-01.service'and int((cg/'memory.max').read_text())<=1073741824 and int((cg/'memory.swap.max').read_text())==0 and int((cg/'pids.max').read_text())<=128,'FINITE_OWN_RESOURCE_UNIT')
 quota,period=(cg/'cpu.max').read_text().split();need(quota!='max'and int(quota)/int(period)<=.5,'HALF_CPU_BOUND')
 need(not OUT.exists(),'EXCLUSIVE_NO_REPLAY_INTENT')
 preRaw=stable(PRE,16777216,True);need(sha(preRaw)==r['preimageSHA256'],'EXACT_PRIVATE_PREIMAGE')
 pre=json.loads(preRaw);u=runpy.run_path(str(H/'qualified_container_physical.py'));q=runpy.run_path(str(H/'qualified53_exact_helpers.py'))
 committed=stable(COMMIT,131072,True);need(sha(committed)==COMMIT_SHA,'ACTUAL_COMMITTED_MEMBER26_REQUIRED');ack=json.loads(committed)
 need(ack['ids']==pre['ids']and ack['generation']['controlsSHA256']==pre['controlsSHA256'],'EXACT_CURRENT07_GENERATION')
 crraw=stable(r['originalCommon11RootReviewPath'],131072,True);need(sha(crraw)==r['originalCommon11RootReviewSHA256'],'ORIGINAL_COMMON11_REVIEW_CHAIN');cr=json.loads(crraw)
 need(r.get('boundedPrivateCommonMaintenanceApproved')is True,'ROOT_BOUNDED_PRIVATE_COMMON_MAINTENANCE_REQUIRED')
 edge05=stable('/srv/crays/acceptance/root-shared-private-family-maintenance28-20261108-05/reopen-apply/RESULT_ACTUAL.json',131072,True)
 need(sha(edge05)=='4dab13e68b69f6144bb0a642deec5f293a4e11002dd7718cfd7148f102293d59'and json.loads(edge05)['afterSHA256']==pre['edgeGuard']['fileSHA256']=='f9f992e24a6973d1b64cb225390959cb4d89c8d5ccac98466fbf52752b36260c','EXACT_REOPENED_CADDY05_BASELINE')
 def preserved():
  for guard in [pre['edgeGuard'],pre['qloGuard']]:
   live=u['inspect'](guard['id'])
   need(live['State']['Running']and json_physical(u['physical'](live))==guard['physical']and all(u['canon'](live[k])==guard['hashes'][k]for k in ['Config','HostConfig','Mounts']),'CADDY05_AND_RUNNING_QLO44_PRESERVED')
  ep=Path('/srv/crays/runtime/private-edge-caddy-20261106-03/Caddyfile.private');es=ep.lstat()
  need([es.st_dev,es.st_ino]==pre['edgeGuard']['fileMetadata']and sha(stable(ep,131072))==pre['edgeGuard']['fileSHA256'],'CADDY05_BYTES_AND_INODE_UNCHANGED')
 preserved()
 def fresh():
  b=stable(r['sourceFencePath'],16384,True);need(sha(b)==r['sourceFenceSHA256'],'SOURCE_FENCE_SHA');f=json.loads(b)
  need(f.get('sourceArchiveSHA256')=='71084517d7378bb3b6125e161135bd71d921f6ad63b187b9b790cb645f85c53a'and f.get('sourceWriterFenceStillEffective')is True and f.get('originalSourceUnitsPhysicallyStopped')is True and f.get('sourceRestartApproved')is False and 0<=time.time()-f['observedAtUnix']<=120,'FRESH_ORIGINAL_SOURCE_FENCE_REQUIRED')
 def family(role):
  c=u['inspect'](pre['ids'][role]);p=pre['containers'][role]
  need(c['State']['Running']and u['physical'](c)[:2]==tuple(p['physical'][:2])and all(u['canon'](c[k])==p['hashes'][k]for k in ['Config','HostConfig','Mounts']),'EXACT_UNCHANGED_RUNNING_'+role.upper())
  return c
 fresh();preserved();member=family('member');work=family('work');common=family('common')
 need(common['HostConfig']['NetworkMode']=='container:'+member['Id']and work['HostConfig']['NetworkMode']=='container:'+member['Id'],'SAME_MEMBER_NAMESPACE_ONLY')
 need(common['Config']['Cmd']==['/run/crays/common-private-edge-listener.mjs'],'EXACT_EXISTING_LISTENER_ENTRY')
 rows=[v for v in common['Mounts']if v['Destination']=='/run/crays/common-private-edge-listener.mjs']
 need(len(rows)==1 and rows[0]['Source']==str(LISTENER)and rows[0]['RW']is False,'EXACT_BOUND_LISTENER_FILE')
 old=stable(LISTENER,131072);new=old
 need(sha(old)==OLD and sha(new)==NEW,'EXACT_UNCHANGED_CURRENT33_LISTENER')
 st=LISTENER.lstat();meta=[st.st_dev,st.st_ino,st.st_uid,st.st_gid,stat.S_IMODE(st.st_mode),st.st_nlink]
 need(meta==pre['listenerMetadata']and st.st_uid==0 and not st.st_mode&0o022,'EXACT_LISTENER_OWNER_MODE_INODE')
 registry=Path('/srv/crays/releases/nostr-original-core-addon-20261108-18/common-machine57/MODULE_REGISTRY.member26.json')
 registryOld=stable(registry,8388608);registryStat=registry.lstat();registryMeta=[registryStat.st_dev,registryStat.st_ino,registryStat.st_uid,registryStat.st_gid,stat.S_IMODE(registryStat.st_mode),registryStat.st_nlink]
 need(registryMeta==pre['registryMetadata']and registryStat.st_uid==0 and not registryStat.st_mode&0o022 and registryStat.st_nlink==1 and sha(registryOld)==pre['registryRow']['sha256']=='b0f083fe97b7a4cc2da1937a65ad9edcfa9babdd20b0b28462010f7514c2ae5a','EXACT_CURRENT32_BOUND_REGISTRY')
 stageRaw=stable(r['clubStageActualPath'],131072,True);need(sha(stageRaw)==r['clubStageActualSHA256'],'ACTUAL_CLUB35_IMMUTABLE_STAGE_PIN');stage=json.loads(stageRaw)
 need(stage.get('status')=='CLUB35_IMMUTABLE_MODULE_DESCRIPTOR_AND_CURRENT33_PREIMAGE_STAGED_NOT_ADOPTED'and stage.get('root')=='/srv/crays/acceptance/unified-static-20261105-01/artifacts/clubMember-origin35-7e7915d4e15c66b1/dist'and stage.get('version')=='club-member-7e7915d4e15c66b1'and stage.get('files')==48 and stage.get('liveRegistryOrRuntimeChanged')is False and stage.get('memberWorkQloAndCaddyPreserved')is True and stage.get('preimageSHA256')==r['preimageSHA256'],'EXACT_PASSED_CLUB35_STAGE')
 descriptor=H/'stage01/MODULE_REGISTRY.club35.json';need(stage['registryPath']==str(descriptor),'EXACT_STAGED_CLUB35_DESCRIPTOR_PATH')
 registryNew=stable(descriptor,8388608);ds=descriptor.lstat();need(ds.st_uid==0 and not ds.st_mode&0o022 and ds.st_nlink==1 and sha(registryNew)==stage['registrySHA256']and len(registryNew)==stage['registryBytes'],'ACTUAL_IMMUTABLE_CLUB35_DESCRIPTOR')
 manifestRaw=stable('/srv/crays/migration-work/20261108/root/member-origin-binding35-build01/execution01/MODULE_MANIFEST.json',131072)
 need(sha(manifestRaw)=='5dd49cd0773ffa89b9897614b44998a826b525896d8d45c926f6c349ca1cf54b','EXACT_FROZEN_CLUB35_MANIFEST')
 project=runpy.run_path(str(H/'project_exact_club_registry35.candidate.py'))['project_registry']
 need(project(registryOld,json.loads(manifestRaw))==registryNew,'EXACT_CLUB35_ACTIVE_ROW_RETAIN606_ALL_OTHERS_UNCHANGED')
 nextRegistryRow={'path':str(registry),'sha256':sha(registryNew),'bytes':len(registryNew)}
 controls={n:read_control(p)for n,p in PATHS.items()}
 need({n:sha(b)for n,b in controls.items()}==pre['controlsSHA256'],'EXACT_CURRENT07_FOUR_CONTROLS')
 for name,v in pre['unitFiles'].items():need(sha(stable(name,2097152))==v,'ORIGINAL_MANAGED_UNIT_FILES_UNCHANGED')
 for name,v in pre['units'].items():
  live=q['show'](name);need(live['InvocationID']==v['InvocationID']and live['MainPID']==v['MainPID']and live['ActiveState']=='active','EXACT_CURRENT07_UNIT_GENERATIONS')
 # Keep the live retained Member namespace proc-seq FD before stopping any owner.
 ap=q['process'](member['State']['Pid']);netfd=os.open('/proc/'+str(ap['pid'])+'/net/unix',os.O_RDONLY|os.O_NOFOLLOW)
 sockets={}
 for text in ['/run/crays/nostr-core-runtime-v1/policy/policy.sock','/run/crays/nostr-core-runtime-v1/registry/control.sock','/run/crays-chuck-core-currentness/status.sock']:
  p=Path(text);v=None
  if os.path.lexists(p):
   s=p.lstat();need(stat.S_ISSOCK(s.st_mode)and s.st_uid==s.st_gid==1000 and stat.S_IMODE(s.st_mode)==0o600 and s.st_nlink==1,'EXACT_CURRENT_OWN_SOCKET')
   v=[s.st_dev,s.st_ino,s.st_uid,s.st_gid,stat.S_IMODE(s.st_mode),s.st_nlink]
  sockets[text]=v
 OUT.mkdir(mode=0o700);sync(OUT.parent)
 def journal(n,v):put(OUT/n,v)
 journal('INTENT.json',{'status':'SAME_COMMON35_CLUB_ORIGIN_MODULE_ADOPTION','previousActualSHA256':COMMIT_SHA,'ids':pre['ids'],'noMemberWorkRestart':True,'listenerBeforeSHA256':OLD,'listenerAfterSHA256':NEW,'automaticReplayAllowed':False})
 stopped=False;casDone=False;registryCasDone=False;published=False
 signal.signal(signal.SIGTERM,lambda*a:(_ for _ in()).throw(KeyboardInterrupt()))
 signal.signal(signal.SIGINT,lambda*a:(_ for _ in()).throw(KeyboardInterrupt()))
 try:
  fresh();preserved()
  PHASE='EXACT_OWN_GENERATION_PHYSICAL_QUIESCE'
  q['cmd'](['/usr/bin/systemctl','stop',*UNITS],timeout=45)
  for name in UNITS:
   v=q['show'](name);need(v['MainPID']=='0'and v['ActiveState']in('inactive','failed'),'OWN_UNIT_PHYSICAL_TERMINAL')
   p=Path('/sys/fs/cgroup/system.slice')/name
   if p.exists():need(all(not x.read_text().strip()for x in p.rglob('cgroup.procs')),'OWN_CGROUP_EMPTY')
  need(u['halt'](common['Id'],u['physical'](common)),'SAME_COMMON_OLD_PROCESS_PHYSICALLY_TERMINATED');stopped=True
  family('member');family('work');preserved()
  journal('QUIESCENCE_ACK.json',{'sameCommonStopped':True,'sixOwnUnitsPhysicallyTerminal':True,'memberWorkProcessesPreserved':True})
  PHASE='ARCHIVE_EXACT_CURRENT07_CONTROLS'
  for n,p in PATHS.items():
   need(read_control(p)==controls[n],'CONTROL_CHANGED_BEFORE_ARCHIVE');s=p.lstat()
   put(OUT/('prior11-'+n),controls[n],0o444);journal(n+'.ARCHIVE_INTENT.json',{'sha256':sha(controls[n]),'device':s.st_dev,'inode':s.st_ino})
   now=p.lstat();need((now.st_dev,now.st_ino,now.st_ctime_ns)==(s.st_dev,s.st_ino,s.st_ctime_ns),'CONTROL_INODE_CAS')
   p.unlink();sync(p.parent);journal(n+'.ARCHIVE_ACK.json',{'archived':True,'previousGenerationPreserved':True})
  fresh();preserved()
  need(stable(LISTENER,131072)==old and LISTENER.lstat().st_ino==meta[1],'CURRENT33_LISTENER_UNCHANGED_NO_WRITE')
  PHASE='OWN_BOUND_CLUB35_REGISTRY_INODE_CAS'
  journal('registry33.original.public.json',registryOld)
  registryFD=os.open(registry,os.O_RDWR|os.O_NOFOLLOW)
  try:
   fcntl.flock(registryFD,fcntl.LOCK_EX|fcntl.LOCK_NB);rs=os.fstat(registryFD)
   need([rs.st_dev,rs.st_ino,rs.st_uid,rs.st_gid,stat.S_IMODE(rs.st_mode),rs.st_nlink]==registryMeta,'EXACT_REGISTRY_FD_INODE_OWNER_MODE')
   observed=bytearray()
   while len(observed)<rs.st_size:
    part=os.read(registryFD,min(1048576,rs.st_size-len(observed)));need(part,'COMPLETE_REGISTRY_CAS_READ');observed.extend(part)
   need(bytes(observed)==registryOld,'EXACT_REGISTRY_BYTES_CAS_PREIMAGE')
   journal('REGISTRY_WRITE_INTENT.json',{'beforeSHA256':sha(registryOld),'afterSHA256':sha(registryNew),'metadata':registryMeta,'club35OnlyActiveAndRetained606Projection':True,'clubStageActualSHA256':sha(stageRaw),'automaticReplayAllowed':False})
   os.lseek(registryFD,0,0);remaining=memoryview(registryNew)
   while remaining:
    count=os.write(registryFD,remaining);need(count>0,'COMPLETE_PUBLIC_REGISTRY_WRITE');remaining=remaining[count:]
   os.ftruncate(registryFD,len(registryNew));os.fsync(registryFD)
   need(stable(registry,8388608)==registryNew and registry.lstat().st_ino==rs.st_ino,'EXACT_CLUB35_REGISTRY_CAS_POSTIMAGE')
  finally:os.close(registryFD)
  registryCasDone=True;journal('REGISTRY_WRITE_ACK.json',{'beforeSHA256':sha(registryOld),'afterSHA256':sha(registryNew),'sameInode':True,'samePathAndOwnerMode':True,'onlyClubMemberRowAndRetained606Changed':True,'allOtherModulesUnchanged':True})
  PHASE='FULL_ORIGINAL_CURRENT_SOURCE_GENERATION'
  context={'newMember':member['Id'],'newCommon':common['Id'],'newWork':work['Id'],'expectedCommon':pre['expectedCommon'],'expectedCommonMounts':{k:tuple(v)for k,v in pre['expectedCommonMounts'].items()},'originalCommon':pre['containers']['common']['originalForVerifier'],'familyPreimage':{'units':pre['units'],'controlsSHA256':pre['controlsSHA256'],'containers':{'common':{'id':common['Id']}}},'registryRow':nextRegistryRow,'previousRegistryRow':pre['registryRow'],'output':str(OUT/'generation'),'parentOutput':str(OUT),'newMemberProcess':ap,'oldNetUnixFD':netfd,'socketPreimages':sockets}
  generation=runpy.run_path(str(H/'finish_same_common_origin35_generation.candidate.py'))['finish'](r,cr,context)
  published=True;family('member');family('work');preserved()
  final=u['inspect'](common['Id']);need(final['State']['Running']and final['Id']==common['Id']and all(u['canon'](final[k])==pre['containers']['common']['hashes'][k]for k in ['Config','HostConfig','Mounts']),'SAME_COMMON_CONFIG_MOUNTS_IMAGE_PRESERVED')
  result={'status':'SAME_COMMON35_ORIGIN_MODULE_FULL_SOURCE_GENERATION_READY','previousCombined33ActualSHA256':COMMIT_SHA,'ids':pre['ids'],'memberProcess':pre['containers']['member']['physical'][:2],'workProcess':pre['containers']['work']['physical'][:2],'commonProcess':u['physical'](final)[:2],'club35RegistrySHA256':sha(registryNew),'clubStageActualSHA256':sha(stageRaw),'listenerSHA256':NEW,'listenerPath':str(LISTENER),'teamHost':'team.craysclub.com','teamUpstream':'127.0.0.1:19109','privateIngress':'172.24.0.2:8990','sameMemberWorkPreserved':True,'generation':generation,'caddy05PreservedOpen':True,'customerAcceptance':False,'automaticReplayAllowed':False}
  journal('RESULT_ACTUAL.json',result);return result
 except BaseException as e:
  signal.signal(signal.SIGTERM,signal.SIG_IGN);signal.signal(signal.SIGINT,signal.SIG_IGN)
  errors=[]
  try:q['cmd'](['/usr/bin/systemctl','stop',*UNITS],timeout=45)
  except BaseException as z:errors.append(type(z).__name__)
  try:
   c=u['inspect'](common['Id'])
   if c['State']['Running']:need(u['halt'](common['Id'],u['physical'](c)),'ONLY_AFFECTED_COMMON_TERMINAL')
  except BaseException as z:errors.append(type(z).__name__)
  frames=[{'file':Path(f.filename).name,'line':f.lineno,'function':f.name}for f in traceback.extract_tb(sys.exc_info()[2])]
  journal('CLOSED_FAILURE.json',{'phase':PHASE,'errorClass':type(e).__name__,'guard':str(e)if isinstance(e,RuntimeError)else None,'publicSourceFrames':frames,'listenerCASCompleted':casDone,'registryCASCompleted':registryCasDone,'generationPublished':published or(OUT/'generation/START_PUBLICATION_ACK.json').exists(),'cleanupErrors':errors,'sameMemberWorkNotStopped':True,'noAutomaticReplay':True});raise
 finally:os.close(netfd)
if __name__=='__main__':
 try:print(json.dumps(main(json.loads(stable(sys.argv[1],131072,True)))))
 except BaseException as e:print(json.dumps({'status':'COMMON35_STOP_NO_REPLAY','phase':PHASE,'errorClass':type(e).__name__,'safeGuard':str(e)if isinstance(e,RuntimeError)else None,'privateValuesReturned':False}));raise SystemExit(1)
