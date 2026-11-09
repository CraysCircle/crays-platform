"""Root-only public immutable materialization of already completed Build51; no runtime lifecycle or private inputs."""
from pathlib import Path
import os,stat,json,hashlib,sys,time,runpy
RELEASE=Path('/srv/crays/releases/member-document-provider51-20261109-01')
BUILD=Path('/srv/crays/migration-work/20261109/root/member-document-provider51-build01')
BUILD_SHA=None
BID=None
OLD_BID='LbgKfWM3XAR5fr7rTk3b6'
def need(v,g):
 if not v:raise RuntimeError(g)


def sha(b):return hashlib.sha256(b).hexdigest()


def canon(v):return json.dumps(v,sort_keys=True,separators=(',',':')).encode()


def stable(p,maximum=8388608,root=False):
 p=Path(p);fd=os.open(p,os.O_RDONLY|os.O_NOFOLLOW|os.O_NONBLOCK)
 try:
  a=os.fstat(fd);need(stat.S_ISREG(a.st_mode)and a.st_nlink==1 and 0<=a.st_size<=maximum,'BOUNDED_STABLE_REGULAR_FILE_REQUIRED')
  if root:need(a.st_uid==0 and not a.st_mode&0o077,'ROOT_PRIVATE_FILE_CUSTODY_REQUIRED')
  result=bytearray()
  while len(result)<a.st_size:
   b=os.read(fd,min(1048576,a.st_size-len(result)));need(b,'FULL_STABLE_READ_REQUIRED');result.extend(b)
  z=os.fstat(fd);v=p.lstat();key=lambda s:(s.st_dev,s.st_ino,s.st_size,s.st_mtime_ns,s.st_ctime_ns,s.st_mode,s.st_uid,s.st_gid)
  need(key(a)==key(z)==key(v),'FILE_CHANGED_DURING_READ');return bytes(result)
 finally:os.close(fd)


def sync(p):
 fd=os.open(p,os.O_DIRECTORY|os.O_NOFOLLOW);os.fsync(fd);os.close(fd)


def put(p,b,mode=0o400,uid=0,gid=0):
 if not isinstance(b,bytes):b=(json.dumps(b,sort_keys=True,indent=2)+'\n').encode()
 fd=os.open(p,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,mode)
 try:
  os.fchown(fd,uid,gid);os.fchmod(fd,mode);v=memoryview(b)
  while v:
   n=os.write(fd,v);need(n>0,'FULL_EXCLUSIVE_WRITE_REQUIRED');v=v[n:]
  os.fsync(fd)
 finally:os.close(fd)
 sync(p.parent)


def copy_tree(source,target,files,prefix,skip_root_modules=False):
 for parent,dirs,names in os.walk(source,followlinks=False):
  parent=Path(parent);rel=parent.relative_to(source);dest=target/rel;dest.mkdir(mode=0o755,parents=True,exist_ok=True)
  for directory in [dest,*dest.parents]:
   if directory==RELEASE:break
   need(directory.is_relative_to(RELEASE),'OWN_NEW_PUBLIC_DIRECTORY_ONLY');os.chmod(directory,0o755)
  for n in list(dirs):
   p=parent/n
   if p.is_symlink():
    need(skip_root_modules and str(p.relative_to(source))=='node_modules','NO_UNQUALIFIED_RELEASE_DIRECTORY_SYMLINK');dirs.remove(n)
  for n in sorted(names):
   p=parent/n;need(not p.is_symlink()and not n.startswith('.env')and'.private'not in n and n not in('credentials','id_rsa','id_ed25519'),'PUBLIC_REGULAR_RELEASE_BYTES_ONLY')
   b=stable(p,67108864);relative=(Path(prefix)/rel/n).as_posix();dst=target/rel/n
   if dst.exists():need(stable(dst,67108864)==b,'EXACT_DUPLICATE_RELEASE_CONTENT_REQUIRED')
   else:put(dst,b,0o644)
   files[relative]={'sha256':sha(b),'bytes':len(b)}


def main(review):
 global BID,BUILD_SHA
 os.umask(0o077)
 need(os.getuid()==0 and Path('/sys/devices/virtual/dmi/id/board_asset_tag').read_text().strip()=='i-0eb300e1b02414d8f','EXACT_ROOT_AWS_INSTANCE')
 r=json.loads(stable(review,131072,True))
 BID=r['actualBuildId'];BUILD_SHA=r['actualBuildSHA256']
 need(BID=='Em8YqZapuRa58BfKC5hRh' and BUILD_SHA=='ba713db5124d0a76c78c764e0bcacb0bae8e37f7aebc94e53728afeb5a9f1bf5' and r['actualBuildPhysicalReturnSHA256']=='25ba76f54ed7a8fbf276e2ab972501ef29749ac2e5ee4738bcfdaa920705db79','EXACT_COMPLETED_ROOT_BUILD51_AND_RETURN_REQUIRED')
 need(isinstance(BID,str) and BID!=OLD_BID and len(BID)<=100 and isinstance(BUILD_SHA,str) and len(BUILD_SHA)==64,'REAL_COMPLETED51_BUILD_BINDING_REQUIRED')
 need(r.get('executionApproved') is True and r.get('stageOnly') is True and r.get('runtimeChangeApproved') is False and r.get('controllerSHA256')==sha(stable(__file__,131072)),'ROOT_REVIEWED_STAGE_ONLY')
 need(os.environ.get('INVOCATION_ID') and 0<r['windowExpiresAtUnix']-time.time()<=600,'ROOT_FINITE_STAGE_WINDOW')
 cg=Path('/sys/fs/cgroup')/Path('/proc/self/cgroup').read_text().strip().split(':',2)[-1].lstrip('/')
 need(cg.name=='crays-member51-stage-20261109-01.service' and int((cg/'memory.max').read_text())<=1073741824 and int((cg/'pids.max').read_text())<=128,'FINITE_STAGE_RESOURCE_UNIT')
 need(int((cg/'memory.swap.max').read_text())==0,'ZERO_SWAP_STAGE_WINDOW')
 quota,period=(cg/'cpu.max').read_text().split();need(quota!='max' and int(quota)/int(period)<=.5,'HALF_CPU_STAGE_WINDOW')
 fence_raw=stable('/srv/crays/migration-work/20261108/root/ROOT_HEAVY_ATTEMPT_ACTIVE.json',16384,True)
 need(sha(fence_raw)==r['rootHeavyFenceSHA256'] and json.loads(fence_raw).get('unit')=='crays-member51-stage-20261109-01.service','EXACT_OWN_ROOT_STAGE_FENCE')
 before=stable(BUILD/'RESULT_ACTUAL.json',131072,True);need(sha(before)==BUILD_SHA,'EXACT_COMPLETED_BUILD42')
 build=json.loads(before)
 need(build['status']=='ORDINARY_MEMBER_DOCUMENT_PROVIDER51_BUILD_PASSED_NOT_DEPLOYED' and build['newBuildId']==BID and build['all27OtherTransportAdaptersPreserved'] is True and build['onlyExactReviewedDocsSelectorChangesWithin28'] is True and build['onlyDocumentProviderAws51Delta'] is True,'ACTUAL_BUILD42_ONLY')
 returned=stable('/srv/crays/migration-work/20261109/root/document-provider-aws51-source01/ROOT_BUILD51_EXECUTION_ACTUAL.json',131072,True)
 need(sha(returned)==r['actualBuildPhysicalReturnSHA256'],'BUILD42_RETURN_RECEIPT')
 ack=json.loads(returned);need(ack['physicalReturn'] is True and ack['rootFenceReleased'] is True and ack['systemdRunExit']==0,'BUILD42_PHYSICALLY_RETURNED')
 source=BUILD/'source';need(str(source)==build['buildSourceRoot'] and stable(source/'.next/BUILD_ID',128).decode().strip()==BID,'BUILD42_SOURCE')
 need(sha(stable(source/'.next/BUILD_ID',128))=='d3cc43f03cf15fe1214043666e62b74da5f34c378b90059eda0367432c21d2af','EXACT_ACTUAL_BUILD51_ID_FILE_REQUIRED')
 guardPath=Path('/srv/crays/migration-work/20261109/root/document-provider-aws51-source01/GUARD_BUILD51_SOURCE_PROVENANCE.json')
 guardRaw=stable(guardPath,131072);need(sha(guardRaw)=='7c3618825d5538e5599f4956cc45076a38dbcd6f4fca4188349743659b4a4243','REVIEWED_BUILD51_SOURCE_PROVENANCE');guard=json.loads(guardRaw)
 for rel,digest in guard['source28Pins'].items():need(sha(stable(source/rel,33554432))==('2f03b4fa91e784230772849baba55fe3765e3d56e0a0ca848e8cdd4c3c7ede51' if rel=='src/lib/clubs/member073-native-provider-binding.ts' else digest),'EXACT27_TRANSPORT_AND_SOLE_DOCS51_DELTA')
 for rel,digest in guard['source46Pins'].items():need(sha(stable(source/rel,33554432))==digest,'EXACT_ALL8_CURRENT46_MAIN_NATIVE_CONTEXT_PINS')
 projection=Path(__file__).parent/'project_exact_member51_successor_payloads.candidate.py'
 need(sha(stable(projection,131072))==r['projectionSHA256'],'REVIEWED_PURE_PROJECTION')
 m=runpy.run_path(str(projection))
 oldcode=Path('/srv/crays/releases/member-original-context46-20261109-01/member-code')
 boot=stable(oldcode/'member_rds_runtime_boot.cjs',65536)
 need(sha(boot)=='0b29235b3fc627536ea80355fac288d321071c3f9cca9c1e871a0b068b5b791c' and boot.count(OLD_BID.encode())==1,'CURRENT26_BOOT_ONLY_BUILD_GUARD')
 newboot=boot.replace(OLD_BID.encode(),BID.encode(),1)
 probe=stable(oldcode/'original-rds-guard-probe.cjs',1048576)
 need(sha(probe)=='f1f5a544905fb3d248b7bdbca8c2edcd38a51273aaa008b5764034e89d9ad1f3','UNCHANGED_ORIGINAL_GUARD')
 placeholder=oldcode/'nextcloud-original-member-document-principal.private.json'
 need(stable(placeholder,1)==b'','ONLY_EMPTY_PUBLIC_MOUNTPOINT')
 registry_path=Path('/srv/crays/releases/nostr-original-core-addon-20261108-18/common-machine57/MODULE_REGISTRY.member50.json')
 registry_before=stable(registry_path,8388608)
 need(sha(registry_before)==r['currentRegistrySHA256'],'EXACT_CURRENT35_REGISTRY')
 registry=m['registry'](json.loads(registry_before),BID)
 need(not RELEASE.exists(),'EXCLUSIVE_NEW42_RELEASE_NO_REPLAY')
 RELEASE.mkdir(mode=0o755);os.chmod(RELEASE,0o755);sync(RELEASE.parent)
 put(RELEASE/'INTENT.json',{'status':'MEMBER51_PUBLIC_IMMUTABLE_STAGE_ONLY','buildId':BID,'runtimeChanged':False,'automaticReplayAllowed':False})
 files={}
 # Only leaves consumed by the unchanged image are copied; its dependencies and original public mount stay in place.
 app=RELEASE/'app';app.mkdir(mode=0o755)
 copy_tree(source/'.next/standalone/.next',app/'.next',files,'app/.next')
 copy_tree(source/'.next/static',app/'.next/static',files,'app/.next/static')
 copy_tree(source/'src',app/'src',files,'app/src')
 for name in ('server.js','package.json'):
  body=stable(source/'.next/standalone'/name,1048576);put(app/name,body,0o644);files['app/'+name]={'sha256':sha(body),'bytes':len(body)}
 need(stable(app/'.next/BUILD_ID',128).decode().strip()==BID,'EXACT_STAGED_BUILD42')
 code=RELEASE/'member-code';code.mkdir(mode=0o755);os.chown(code,1000,1000)
 for name,body in [('member_rds_runtime_boot.cjs',newboot),('original-rds-guard-probe.cjs',probe)]:
  put(code/name,body,0o400,1000,1000);files['member-code/'+name]={'sha256':sha(body),'bytes':len(body)}
 put(code/'nextcloud-original-member-document-principal.private.json',b'',0o600,1000,1000)
 files['member-code/nextcloud-original-member-document-principal.private.json']={'sha256':sha(b''),'bytes':0}
 common=RELEASE/'common';common.mkdir(mode=0o755);os.chmod(common,0o755)
 registry_raw=(json.dumps(registry,ensure_ascii=False,indent=2)+'\n').encode();put(common/'MODULE_REGISTRY.member51.json',registry_raw,0o644)
 files['common/MODULE_REGISTRY.member51.json']={'sha256':sha(registry_raw),'bytes':len(registry_raw)}
 manifest={'schema':'crays.immutable.next.release.v1','buildId':BID,'actualBuildSHA256':BUILD_SHA,'files':files,'runtimeImage':'sha256:604f3de71d0154e7bfdb812fda4461c1f15d9e1827d75a399654a5b5bb46ae8b','publicAssetsAndImageDependenciesPreserved':True,'onlyBootBuildGuardLiteralChanged':True,'registryBeforeSHA256':sha(registry_before),'registryAfterSHA256':sha(registry_raw),'privateEnvironmentOrCredentialReadCopiedOrRewritten':False,'runtimeInstalled':False}
 put(RELEASE/'RELEASE_MANIFEST.json',manifest,0o644)
 result={'status':'IMMUTABLE_MEMBER51_PUBLIC_RELEASE_STAGED_NOT_INSTALLED','buildId':BID,'releaseManifestSHA256':sha(stable(RELEASE/'RELEASE_MANIFEST.json',16777216)),'noRuntimeMutation':True,'needsReviewedCurrent35FamilyCoordinator':True}
 put(RELEASE/'STAGE_ACTUAL.json',result);return result
if __name__=='__main__':
 try:print(json.dumps(main(sys.argv[1])))
 except BaseException as e:
  print(json.dumps({'status':'MEMBER51_STAGE_STOP_NO_REPLAY','errorClass':type(e).__name__,'runtimeChanged':False}));raise SystemExit(1)
