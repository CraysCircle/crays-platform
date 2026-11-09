"""Ordinary Member build only. Root supplies the existing qualified AWS source,
existing dependencies/toolchain and fresh exclusive build-window admission.
No downloads, credentials, SQL, runtime/service/network/edge changes."""
from pathlib import Path
import os,stat,json,hashlib,shutil,subprocess,sys,datetime,re
ROOT=Path(__file__).resolve().parent
OUT=Path('/srv/crays/migration-work/20261109/root/member-document-provider51-build01')
AUTH=Path('/srv/crays/migration-work/20261108/root/member-current-original-source-authority01/CURRENT_MEMBER_SOURCE_AUTHORITY_ACTUAL.json')
AUTH_SHA='f36e363209f7977a1ceb1c3fc2c5c3c8f720755690e34667495bf89fec15e8c2'
OVERLAY_SHA='2f03b4fa91e784230772849baba55fe3765e3d56e0a0ca848e8cdd4c3c7ede51'
OLD_HANDLER_SHA='8ef51fad36b40c519d373e56c9eebab2f458aecbb422c7506f804f257ec00c0e'
TARGET_REL='src/lib/clubs/member073-native-provider-binding.ts'
def need(v,g):
 if not v:raise RuntimeError(g)
def sha(b):return hashlib.sha256(b).hexdigest()
def read(p,limit=1048576):
 f=os.open(p,os.O_RDONLY|os.O_NOFOLLOW|os.O_NONBLOCK)
 try:
  a=os.fstat(f);need(stat.S_ISREG(a.st_mode)and a.st_nlink==1 and 0<a.st_size<=limit,'BOUNDED_REGULAR_FIXED_FILE_REQUIRED')
  b=os.read(f,limit+1);z=os.fstat(f);need(len(b)==a.st_size and(a.st_dev,a.st_ino,a.st_size,a.st_mtime_ns,a.st_ctime_ns)==(z.st_dev,z.st_ino,z.st_size,z.st_mtime_ns,z.st_ctime_ns),'STABLE_FILE_REQUIRED');return b
 finally:os.close(f)
def sync(p):
 f=os.open(p,os.O_DIRECTORY|os.O_NOFOLLOW);os.fsync(f);os.close(f)
def save(p,v):
 b=v if isinstance(v,bytes)else(json.dumps(v,sort_keys=True,indent=2)+'\n').encode();f=os.open(p,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o400)
 try:
  os.fchmod(f,0o400);buf=memoryview(b)
  while buf:
   n=os.write(f,buf);need(n>0,'COMPLETE_OWN_FILE_WRITE_REQUIRED');buf=buf[n:]
  os.fsync(f)
 finally:os.close(f)
 sync(p.parent)
def canonical_dir(value):
 p=Path(value);need(p.is_absolute()and str(p).startswith('/srv/crays/')and p.resolve()==p and p.is_dir(),'EXISTING_CANONICAL_AWS_SOURCE_DEPENDENCY_DIRECTORY_REQUIRED');return p
def main(review):
 os.umask(0o077);need(os.getuid()==0 and Path('/sys/devices/virtual/dmi/id/board_asset_tag').read_text().strip()=='i-0eb300e1b02414d8f','EXACT_AWS_ROOT_HOST_REQUIRED')
 r=json.loads(read(Path(review)));need(r.get('executionApproved')is True and r.get('controllerSHA256')==sha(read(Path(__file__)))and r.get('independentReviewSHA256'),'EXACT_ROOT_BUILD_SOURCE_REVIEW_REQUIRED')
 need(r.get('freshExclusiveBuildWindowApproved')is True and r.get('unit')=='crays-member-document-provider51-build-20261109-01.service'and os.environ.get('INVOCATION_ID'),'ROOT_FRESH_BOUNDED_SYSTEMD_BUILD_WINDOW_REQUIRED')
 cg=Path('/sys/fs/cgroup')/Path('/proc/self/cgroup').read_text().strip().split(':',2)[-1].lstrip('/')
 need(cg.name==r['unit']and(cg/'memory.max').read_text().strip().isdigit()and int((cg/'memory.max').read_text())<=6442450944 and int((cg/'pids.max').read_text())<=256,'EXACT_OWN_RESOURCE_CGROUP_REQUIRED')
 expiry=datetime.datetime.fromisoformat(r['buildWindowExpiresAtUTC'].replace('Z','+00:00'));now=datetime.datetime.now(datetime.timezone.utc)
 need(0<(expiry-now).total_seconds()<=900,'FRESH_ROOT_BUILD_WINDOW_REQUIRED')
 need(sha(read(AUTH))==AUTH_SHA,'ACTUAL_LATEST_MEMBER_ORIGINAL_SOURCE_AUTHORITY_REQUIRED')
 for n,h in r['sourcePins'].items():need(Path(n).name==n and sha(read(ROOT/n))==h,'EXACT_PUBLIC_BUILD_SOURCE_PIN_REQUIRED')
 source=canonical_dir(r['existingAWSMemberRdsSourceRoot']);deps=canonical_dir(r['existingQualifiedNodeModulesRoot'])
 need(source==Path('/srv/crays/migration-work/20261109/root/member-club-session-envelope46-build01/source'),'EXACT_SUCCESSFUL_CURRENT46_SOURCE_REQUIRED')
 need(source!=deps and not OUT.exists(),'EXCLUSIVE_NEW_BUILD_OUT_REQUIRED')
 need(sha(read(source/'package.json'))==r['sourcePackageSHA256']and sha(read(source/'package-lock.json'))==r['sourceLockSHA256'],'EXACT_ORIGINAL_BUILD_PACKAGE_AND_LOCK_REQUIRED')
 need(sha(read(deps/'next/package.json'))==r['nextPackageSHA256']and(deps/'next/dist/bin/next').is_file(),'QUALIFIED_EXISTING_NEXT_DEPENDENCIES_REQUIRED')
 node=Path(r['existingNodeBinary']);need(node.resolve()==node and node.is_file()and os.access(node,os.X_OK)and sha(read(node,167772160))==r['nodeBinarySHA256'],'QUALIFIED_EXISTING_NODE_BINARY_REQUIRED')
 guard=json.loads(read(ROOT/'GUARD_BUILD51_SOURCE_PROVENANCE.json'))
 need(sha(read(source.parent/'RESULT_ACTUAL.json'))==guard['successful46ResultSHA256']and json.loads(read(source.parent/'RESULT_ACTUAL.json'))['newBuildId']==guard['current46BuildId'],'EXACT_SUCCESSFUL46_BUILD_RECEIPT_REQUIRED')
 for rel,h in guard['source46Pins'].items():need(sha(read(source/rel))==h,'EXACT_CURRENT46_MAIN_NATIVE_CONTEXT_REQUIRED')
 for rel,h in guard['source28Pins'].items():need(sha(read(source/rel))==h,'ALL_EXISTING_CANONICAL_RDS_TRANSPORT_ADAPTERS_PRESERVED')
 overlay=read(ROOT/'member073-native-provider-binding.candidate.ts')
 need(sha(overlay)==OVERLAY_SHA,'EXACT_REVIEWED_DOCUMENT_PROVIDER51_SOURCE_REQUIRED')
 need(sha(read(source/TARGET_REL))==OLD_HANDLER_SHA,'ORIGINAL_OR_EXACT_APPROVED_DOCUMENT_PROVIDER51_HANDLER_REQUIRED')
 OUT.mkdir(mode=0o700);sync(OUT.parent);save(OUT/'INTENT.json',{'status':'ROOT_ADMITTED_ORDINARY_MEMBER_BUILD_ONCE','sourceAuthoritySHA256':AUTH_SHA,'overlaySHA256':OVERLAY_SHA,'automaticReplayAllowed':False,'noRuntimeOrCredentialChange':True})
 child=None
 try:
  target=OUT/'source';target.mkdir(mode=0o700);manifest={}
  for root,dirs,files in os.walk(source,followlinks=False):
   dirs[:]=sorted(x for x in dirs if x not in('node_modules','.next','.git'))
   root=Path(root)
   for d in dirs:need(not(root/d).is_symlink(),'NO_SOURCE_DIRECTORY_SYMLINK_REQUIRED')
   dest=target/root.relative_to(source);dest.mkdir(mode=0o700,parents=True,exist_ok=True)
   for n in sorted(files):
    need(not n.startswith('.env')and'.private'not in n,'NO_PRIVATE_BUILD_SOURCE_REQUIRED')
    p=root/n;need(not p.is_symlink()and p.is_file(),'NO_SOURCE_FILE_SYMLINK_REQUIRED');rel=str(p.relative_to(source));b=read(p,33554432);manifest[rel]=sha(b);save(dest/n,b);os.chmod(dest/n,0o600)
  os.symlink(str(deps),target/'node_modules',target_is_directory=True)
  handler=target/TARGET_REL;need(sha(read(handler))==manifest[TARGET_REL],'OWN_COPIED_HANDLER_PREIMAGE_REQUIRED')
  # Only the own newly copied build tree changes; original source stays intact.
  f=os.open(handler,os.O_WRONLY|os.O_TRUNC|os.O_NOFOLLOW)
  try:
   v=memoryview(overlay)
   while v:
    n=os.write(f,v);need(n>0,'FULL_OWN_OVERLAY_WRITE_REQUIRED');v=v[n:]
   os.fsync(f)
  finally:os.close(f)
  need(sha(read(handler))==OVERLAY_SHA,'EXACT_DOCUMENT_PROVIDER51_OVERLAY_POSTIMAGE_REQUIRED')
  save(OUT/'SOURCE_INPUT_MANIFEST.json',{'files':manifest,'onlyAdmittedDelta':TARGET_REL,'afterSHA256':OVERLAY_SHA,'all27OtherTransportAdaptersPreserved':True,'onlyExactReviewedDocsSelectorChangesWithin28':True,'sourceAuthoritySHA256':AUTH_SHA})
  env={'PATH':str(node.parent)+':/usr/bin:/bin','LANG':'C.UTF-8','HOME':str(OUT),'NODE_ENV':'production','NEXT_TELEMETRY_DISABLED':'1','CRAYS_PERFORMANCE_BUILD_SERIAL':'true','NODE_OPTIONS':'--max-old-space-size=3072'}
  with open(OUT/'build.stdout.private.log','xb')as sout,open(OUT/'build.stderr.private.log','xb')as serr:
   child=subprocess.Popen([str(node),str(deps/'next/dist/bin/next'),'build','--webpack'],cwd=target,env=env,stdout=sout,stderr=serr,start_new_session=True)
   rc=child.wait(timeout=720)
  save(OUT/'BUILD_PROCESS_EXIT_ACTUAL.json',{'exitCode':rc,'pid':child.pid,'rawLogsReturned':False})
  need(rc==0,'ORDINARY_MEMBER_BUILD_FAILED_INSPECT_OWN_LOGS')
  bid=read(target/'.next/BUILD_ID',128).decode().strip();need(bool(re.fullmatch('[A-Za-z0-9_-]{1,100}',bid)),'NATIVE_NEW_BUILD_ID_REQUIRED')
  for rel,h in guard['source28Pins'].items():need(sha(read(source/rel))==h and sha(read(target/rel))==(OVERLAY_SHA if rel==TARGET_REL else h),'CURRENT46_TRANSPORTS_PRESERVED_EXCEPT_EXACT_DOCS51_SELECTOR')
  need(sha(read(source/TARGET_REL))==manifest[TARGET_REL],'SOURCE_ORIGINAL_HANDLER_UNCHANGED')
  for rel,h in guard['source46Pins'].items():need(sha(read(source/rel))==h and sha(read(target/rel))==h,'CURRENT46_MAIN_NATIVE_CONTEXT_UNCHANGED')
  result={'status':'ORDINARY_MEMBER_DOCUMENT_PROVIDER51_BUILD_PASSED_NOT_DEPLOYED','newBuildId':bid,'buildSourceRoot':str(target),'existingDependenciesReused':True,'latestOriginalAuthoritySHA256':AUTH_SHA,'all27OtherTransportAdaptersPreserved':True,'onlyExactReviewedDocsSelectorChangesWithin28':True,'onlyDocumentProviderAws51Delta':True,'privatePrincipalCopiedOrMounted':False,'runtimeServiceLifecycleChanged':False,'needsRootCoordinatedMemberNamespaceAndSDKGenerationAdoption':True,'realCustomerDocumentAndS3AcceptancePending':True}
  save(OUT/'RESULT_ACTUAL.json',result);return result
 except BaseException as e:
  if child is not None and child.poll()is None:
   os.killpg(child.pid,15)
   try:child.wait(timeout=15)
   except subprocess.TimeoutExpired:os.killpg(child.pid,9);child.wait(timeout=10)
  save(OUT/'STOP_ACTUAL.json',{'status':'MEMBER51_BUILD_STOP_NO_REPLAY','errorClass':type(e).__name__,'safeGuard':str(e)if isinstance(e,RuntimeError)and re.fullmatch('[A-Z0-9_]{1,120}',str(e))else None,'logsProtected':True,'runtimeChanged':False});raise
if __name__=='__main__':
 try:print(json.dumps(main(sys.argv[1])))
 except BaseException as e:print(json.dumps({'status':'MEMBER51_BUILD_STOP_NO_REPLAY','errorClass':type(e).__name__,'privateValuesPrinted':False}));raise SystemExit(1)
