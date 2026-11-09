"""Source-only candidate: Root immutable50 module/descriptor stage; no live mutation."""
from pathlib import Path
import os,json,hashlib,runpy,sys,stat
H=Path(__file__).resolve().parent
BUILD=Path('/srv/crays/migration-work/20261109/root/member-graphql-origin50-build02-mountpoint-recovery01/execution01')
REGISTRY=Path('/srv/crays/releases/nostr-original-core-addon-20261108-18/common-machine57/MODULE_REGISTRY.member46.json')
NEW=REGISTRY.with_name('MODULE_REGISTRY.member50.json')
HISTORY=Path('/srv/crays/acceptance/unified-static-20261105-01/artifacts/clubMember-retained-club-member-7e7915d4e15c66b1')
HISTORY_GUEST='/srv/crays/releases/common-canonical-20261106-01/member-history/club-member-7e7915d4e15c66b1/dist'
OUT=H/'stage02';TARGET=Path('/srv/crays/acceptance/unified-static-20261105-01/artifacts/clubMember-origin50-20261109-01')
def main(r):
 os.umask(0o022)
 m=runpy.run_path(str(H/'install_exact_current_module50.rev04.candidate.py'));need=m['need'];read=m['stable'];put=m['put'];sha=m['sha']
 need(os.getuid()==0 and Path('/sys/devices/virtual/dmi/id/board_asset_tag').read_text().strip()=='i-0eb300e1b02414d8f','EXACT_AWS_ROOT_HOST')
 need(r.get('executionApproved')is True and r.get('stageOnly')is True and sha(read(__file__,131072))==r['controllerSHA256'] and r.get('independentReviewSHA256'),'ROOT_REVIEWED_STAGE_ONLY')
 for n,h in r['sourcePins'].items():need(Path(n).name==n and sha(read(H/n,131072))==h,'EXACT_STAGE_SOURCE_PINS')
 need(not OUT.exists() and not TARGET.exists() and not os.path.lexists(NEW)and not os.path.lexists(HISTORY),'ONE_NEW_IMMUTABLE_STAGE')
 result=read(BUILD/'RESULT_ACTUAL.json',131072,True)
 # These two original worker outputs contain public source/build metadata only.
 # Preserve the private RESULT guard; permit original0644 only on these exact SHA-bound metadata files.
 def public_worker_metadata(name):
  need(name in('BUILD_ACTUAL.json','MODULE_MANIFEST.json'),'EXACT_PUBLIC_WORKER_METADATA_ONLY');path=BUILD/name;body=read(path,131072);st=path.lstat()
  need(st.st_uid==0 and st.st_nlink==1 and stat.S_ISREG(st.st_mode)and not st.st_mode&0o022,'ROOT_OWNED_NONWRITABLE_PUBLIC_BUILD_METADATA');return body
 actual=public_worker_metadata('BUILD_ACTUAL.json');manifest=public_worker_metadata('MODULE_MANIFEST.json')
 need(sha(result)==r['buildResultSHA256'] and sha(actual)==r['buildActualSHA256'] and sha(manifest)==r['moduleManifestSHA256'],'REAL_BUILD50_ACTUAL_PINS')
 rr=json.loads(result);aa=json.loads(actual);mm=json.loads(manifest)
 need(rr['status']==aa['status']=='OWN_ORIGIN_MODULE_BUILD_PASS_ADOPTION_PENDING' and rr['exitCode']=='0' and rr['ownPIDCgroupPhysicallyStopped']is True and rr['ownContainerPhysicallyRemoved']is True and rr['rootFenceReleasedAfterPhysicalCleanup']is True and not rr['cleanupErrors'],'SUCCESSFUL_PHYSICALLY_RETURNED_BUILD50')
 need(rr['buildActualSHA256']==sha(actual) and rr['moduleManifestSHA256']==sha(manifest) and aa['files']==mm['files'] and aa['version']==mm['version'] and aa['serverBoundaryAbsent']is True,'EXACT50_WORKER_MANIFEST')
 rows=[z for z in aa['sourcePins']if z['path']=='src/lib/clubs/member-graphql-transport.ts'];need(len(rows)==1 and rows[0]['sha256']=='bbf7b455ed31dcfbb1911be7fa3b7457e8f290dbd1ca98b450a1920af693c8e2','REVIEWED_ORIGIN50_COMPILED')
 old=read(REGISTRY,8388608);project=runpy.run_path(str(H/'project_exact_club_registry50.rev02.candidate.py'))['project'];descriptor=project(old,mm,str(BUILD/'MODULE_MANIFEST.json'),sha(manifest),str(TARGET/'dist'))
 historyParent=HISTORY.parent;hp=historyParent.lstat();need(historyParent.resolve()==historyParent and stat.S_ISDIR(hp.st_mode)and hp.st_uid==0 and not hp.st_mode&0o022,'ORIGINAL_ALLOWED_HISTORY_PARENT_CUSTODY')
 previous=json.loads(old)['clubMember'];oldRoot=Path(previous['root']);need(previous['version']=='club-member-7e7915d4e15c66b1'and len(previous['files'])==48 and oldRoot.resolve()==oldRoot,'EXACT_ORIGINAL35_MODULE_HISTORY_SOURCE')
 for n,h in previous['files'].items():need(Path(n).name==n and sha(read(oldRoot/n,16777216))==h,'EXACT_ORIGINAL35_HISTORY_SOURCE_BYTES')
 need(set(f.name for f in(BUILD/'dist').iterdir())==set(mm['files']),'EXACT_BUILD_DIST_NO_EXTRA')
 for n,h in mm['files'].items():need(sha(read(BUILD/'dist'/n,16777216))==h,'EXACT_BUILT_DIST_BYTES')
 OUT.mkdir(mode=0o700);put(OUT/'INTENT.json',{'newRoot':str(TARGET),'newRegistry':str(NEW),'buildResultSHA256':sha(result),'automaticReplayAllowed':False})
 put(OUT/'HISTORY35_COPY_INTENT.json',{'sourceRoot':str(oldRoot),'historyRoot':str(HISTORY/'dist'),'version':previous['version'],'files':previous['files'],'exclusiveCopiesOnly':True,'hardlinksUsed':False})
 HISTORY.mkdir(mode=0o755);os.chmod(HISTORY,0o755);(HISTORY/'dist').mkdir(mode=0o755);os.chmod(HISTORY/'dist',0o755)
 for n,h in previous['files'].items():
  b=read(oldRoot/n,16777216);need(sha(b)==h,'HISTORY_SOURCE_STABLE_DURING_COPY');target=HISTORY/'dist'/n;put(target,b,0o444);need(sha(read(target,16777216))==h and(target.stat().st_dev,target.stat().st_ino)!=(oldRoot.joinpath(n).stat().st_dev,oldRoot.joinpath(n).stat().st_ino),'BYTE_EXACT_EXCLUSIVE_HISTORY_COPY_NOT_HARDLINK')
 put(OUT/'HISTORY35_COPY_ACK.json',{'historyRoot':str(HISTORY/'dist'),'version':previous['version'],'files':48,'allBytesAndHashesMatched':True,'originalAssetsChanged':False,'hardlinksUsed':False})
 TARGET.mkdir(mode=0o755);os.chmod(TARGET,0o755);(TARGET/'dist').mkdir(mode=0o755);os.chmod(TARGET/'dist',0o755)
 for n,h in mm['files'].items():
  b=read(BUILD/'dist'/n,16777216);need(sha(b)==h,'SOURCE_STABLE_DURING_STAGE');put(TARGET/'dist'/n,b,0o444)
 put(NEW,descriptor,0o444);put(OUT/'RESULT_ACTUAL.json',{'status':'IMMUTABLE_MODULE50_AND_NEW_REGISTRY_STAGED_NOT_ADOPTED','newRoot':str(TARGET/'dist'),'registry':{'path':str(NEW),'sha256':sha(descriptor),'bytes':len(descriptor)},'oldRegistrySHA256':sha(old),'moduleVersion':mm['version'],'moduleManifestSHA256':sha(manifest),'buildResultSHA256':sha(result),'buildActualSHA256':sha(actual),'everyOtherRegistryRowUnchanged':True,'retainedCurrent35HostRoot':str(HISTORY/'dist'),'retainedCurrent35GuestRoot':HISTORY_GUEST,'retainedCurrent35ByteExactFiles':48,'liveRuntimeChanged':False})
 return {'status':'IMMUTABLE_MODULE50_STAGE_PASS_NOT_ADOPTED'}
if __name__=='__main__':print(json.dumps(main(json.loads(Path(sys.argv[1]).read_bytes()))))
