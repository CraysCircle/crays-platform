"""Root-reviewed immutable ClubMember35 stage and current33 preimage capture. No live adoption."""
from pathlib import Path
import os,stat,json,hashlib,runpy,sys
H=Path(__file__).resolve().parent
SOURCE=Path('/srv/crays/migration-work/20261108/root/member-origin-binding35-build01/execution01')
OUT=H/'stage01'
ROOT=Path('/srv/crays/acceptance/unified-static-20261105-01/artifacts/clubMember-origin35-7e7915d4e15c66b1')
REGISTRY=Path('/srv/crays/releases/nostr-original-core-addon-20261108-18/common-machine57/MODULE_REGISTRY.member26.json')
COMMON33=Path('/srv/crays/acceptance/common-private-team-transport33-20261108-01/RESULT_ACTUAL.json')
EDGE05=Path('/srv/crays/acceptance/root-shared-private-family-maintenance28-20261108-05/reopen-apply/RESULT_ACTUAL.json')
EDGEFILE=Path('/srv/crays/runtime/private-edge-caddy-20261106-03/Caddyfile.private')
QLO='826680e27113c9834990fa46ad54905ea2dbc758c12bf519f09731c4ea7ef815'
sha=lambda b:hashlib.sha256(b).hexdigest()
def need(v,g):
 if not v:raise RuntimeError(g)
def stable(p,maxbytes=8388608):
 p=Path(p);need(p.resolve()==p,'CANONICAL_SOURCE_ONLY')
 fd=os.open(p,os.O_RDONLY|os.O_NOFOLLOW)
 try:
  a=os.fstat(fd);need(stat.S_ISREG(a.st_mode)and a.st_nlink==1 and 0<a.st_size<=maxbytes,'BOUNDED_REGULAR_SOURCE')
  chunks=[];total=0
  while True:
   b=os.read(fd,min(1048576,maxbytes+1-total))
   if not b:break
   chunks.append(b);total+=len(b);need(total<=maxbytes,'SOURCE_BOUND')
  raw=b''.join(chunks);keys=lambda s:(s.st_dev,s.st_ino,s.st_mode,s.st_uid,s.st_gid,s.st_size,s.st_mtime_ns,s.st_ctime_ns)
  need(keys(a)==keys(os.fstat(fd))==keys(p.lstat())and len(raw)==a.st_size,'STABLE_SOURCE')
  return raw
 finally:os.close(fd)
def put(p,b,mode=0o400):
 if not isinstance(b,bytes):b=(json.dumps(b,sort_keys=True,indent=2)+'\n').encode()
 fd=os.open(p,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,mode)
 with os.fdopen(fd,'wb')as f:f.write(b);f.flush();os.fsync(f.fileno())
def main(r):
 os.umask(0o022)
 need(os.geteuid()==0 and Path('/sys/devices/virtual/dmi/id/board_asset_tag').read_text().strip()=='i-0eb300e1b02414d8f','ROOT_EXISTING_HOST_ONLY')
 need(r.get('executionApproved')is True and r.get('sourceSHA256')==sha(stable(__file__)) and r.get('stageOnly')is True,'ROOT_STAGE_ONLY_REVIEW_REQUIRED')
 for n,h in r['sourcePins'].items():need(Path(n).name==n and sha(stable(H/n))==h,'EXACT_STAGE_HELPER_PIN')
 need(not OUT.exists()and not ROOT.exists(),'STAGE_INTENT_EXISTS_INSPECT_NO_REPLAY')
 build=stable(SOURCE/'BUILD_ACTUAL.json');mr=stable(SOURCE/'MODULE_MANIFEST.json')
 need(sha(build)=='3ea042b9c2d2f6e959b4215d8c6f42535df088222469e31ca5e1dd9f78b2c2aa'and sha(mr)=='5dd49cd0773ffa89b9897614b44998a826b525896d8d45c926f6c349ca1cf54b','EXACT_PASSED_BUILD35')
 ba=json.loads(build);manifest=json.loads(mr)
 need(ba['status']=='OWN_ORIGIN_MODULE_BUILD_PASS_ADOPTION_PENDING'and ba['serverBoundaryAbsent']is True and ba['liveAdopted']is False and ba['files']==manifest['files'],'PASSED_PUBLIC_MODULE_BUILD_ONLY')
 registry=stable(REGISTRY);need(sha(registry)=='b0f083fe97b7a4cc2da1937a65ad9edcfa9babdd20b0b28462010f7514c2ae5a','EXACT_CURRENT33_REGISTRY')
 project=runpy.run_path(str(H/'project_exact_club_registry35.candidate.py'))['project_registry']
 descriptor=project(registry,manifest)
 raw33=stable(COMMON33);need(sha(raw33)=='d602b8f271025eb283d46bf7f444c1aa5a2c922fac6c6de3b5a06535013126b4','EXACT_CURRENT33_ACTUAL');a33=json.loads(raw33)
 er=stable(EDGE05);need(sha(er)=='4dab13e68b69f6144bb0a642deec5f293a4e11002dd7718cfd7148f102293d59'and sha(stable(EDGEFILE))=='f9f992e24a6973d1b64cb225390959cb4d89c8d5ccac98466fbf52752b36260c','EXACT_UNCHANGED_OPEN_CADDY05')
 oldpre=Path('/srv/crays/migration-work/20261108/root/common-team-personal33-adoption-source01/CURRENT_FAMILY33_PREIMAGE.private.json')
 pr=stable(oldpre);need(sha(pr)=='faae405053e378cc91093d17d79b9f998a456108aa870079813ef7878daa7eaa','PINNED_EXISTING_PREIMAGE_TEMPLATE')
 pre=json.loads(pr);need(pre['ids']==a33['ids'],'SAME_CURRENT33_FAMILY')
 u=runpy.run_path(str(H/'qualified_container_physical.py'));q=runpy.run_path(str(H/'qualified53_exact_helpers.py'))
 for role in ['member','work','common']:
  c=u['inspect'](a33['ids'][role]);need(c['State']['Running']and list(u['physical'](c)[:2])==a33[role+'Process']and all(u['canon'](c[k])==pre['containers'][role]['hashes'][k]for k in ['Config','HostConfig','Mounts']),'EXACT_CURRENT33_UNCHANGED_'+role.upper())
  pre['containers'][role]['physical']=list(u['physical'](c))
 pre['controlsSHA256']=a33['generation']['controlsSHA256']
 for n,p in runpy.run_path(str(H/'member26_lifecycle.candidate.py'))['PATHS'].items():need(sha(stable(p))==pre['controlsSHA256'][n],'EXACT_CURRENT33_CONTROL')
 pre['units']={n:q['show'](n)for n in runpy.run_path(str(H/'member26_lifecycle.candidate.py'))['UNITS']}
 for n,v in pre['units'].items():need(v['ActiveState']=='active'and int(v['MainPID'])>0 and v['InvocationID'],'EXACT_CURRENT_SIX_UNITS')
 need(pre['units']['crays-owner-tools-whatsapp-live.service']['InvocationID']==a33['generation']['sdk']['invocationId'],'CURRENT33_SDK_INVOCATION')
 for n,h in pre['unitFiles'].items():need(sha(stable(n))==h,'ORIGINAL_UNIT_FILES_UNCHANGED')
 pre['registryRow']={'path':str(REGISTRY),'sha256':sha(registry),'bytes':len(registry)}
 for key,path in [('registryMetadata',REGISTRY),('listenerMetadata',Path('/srv/crays/releases/nostr-original-core-addon-20261108-18/common-machine57/listener.nostr18-machine57.candidate.mjs'))]:
  s=path.lstat();pre[key]=[s.st_dev,s.st_ino,s.st_uid,s.st_gid,stat.S_IMODE(s.st_mode),s.st_nlink]
 ec=u['inspect'](json.loads(er)['containerId']);need(ec['State']['Running'],'CURRENT_CADDY_RUNNING')
 pre['edgeGuard']={'id':ec['Id'],'physical':list(u['physical'](ec)),'hashes':{k:u['canon'](ec[k])for k in ['Config','HostConfig','Mounts']},'fileSHA256':sha(stable(EDGEFILE)),'fileMetadata':[EDGEFILE.stat().st_dev,EDGEFILE.stat().st_ino]}
 qc=u['inspect'](QLO);need(qc['State']['Running']and list(u['physical'](qc)[:2])==[1626455,'30108680'],'EXACT_RUNNING_QLO44')
 pre['qloGuard']={'id':QLO,'physical':list(u['physical'](qc)),'hashes':{k:u['canon'](qc[k])for k in ['Config','HostConfig','Mounts']}}
 files=manifest['files'];need(set(p.name for p in (SOURCE/'dist').iterdir())==set(files),'EXACT_DIST48_NO_EXTRA_FILES')
 for n,h in files.items():need(sha(stable(SOURCE/'dist'/n))==h,'EXACT_DIST_ARTIFACT')
 OUT.mkdir(mode=0o700);put(OUT/'INTENT.json',{'status':'CLUB35_IMMUTABLE_STAGE_ONLY','automaticReplayAllowed':False})
 ROOT.mkdir(mode=0o755);(ROOT/'dist').mkdir(mode=0o755)
 for n,h in files.items():
  raw=stable(SOURCE/'dist'/n);need(sha(raw)==h,'BUILD_SOURCE_STABLE_DURING_COPY');put(ROOT/'dist'/n,raw,0o444)
  need(sha(stable(ROOT/'dist'/n))==h,'IMMUTABLE_COPY_BYTE_EXACT')
 for d in [ROOT,ROOT/'dist']:need(stat.S_IMODE(d.stat().st_mode)==0o755 and d.stat().st_uid==0,'PUBLIC_MODULE_DIRECTORY_CUSTODY')
 for n in files:
  host=(ROOT/'dist'/n).stat();inside=(Path('/proc',str(pre['containers']['common']['physical'][0]),'root')/str(ROOT/'dist'/n).lstrip('/')).stat()
  need((host.st_dev,host.st_ino)==(inside.st_dev,inside.st_ino)and stat.S_IMODE(host.st_mode)==0o444 and host.st_uid==0,'SAME_COMMON_PUBLIC_BIND_NEW_MODULE_VISIBILITY')
 put(OUT/'MODULE_REGISTRY.club35.json',descriptor,0o444)
 put(OUT/'CURRENT_FAMILY35_PREIMAGE.private.json',pre)
 put(OUT/'RESULT_ACTUAL.json',{'status':'CLUB35_IMMUTABLE_MODULE_DESCRIPTOR_AND_CURRENT33_PREIMAGE_STAGED_NOT_ADOPTED','root':str(ROOT/'dist'),'version':manifest['version'],'files':48,'registryPath':str(OUT/'MODULE_REGISTRY.club35.json'),'registrySHA256':sha(descriptor),'registryBytes':len(descriptor),'preimagePath':str(OUT/'CURRENT_FAMILY35_PREIMAGE.private.json'),'preimageSHA256':sha(stable(OUT/'CURRENT_FAMILY35_PREIMAGE.private.json')),'moduleManifestPath':str(SOURCE/'MODULE_MANIFEST.json'),'moduleManifestSHA256':sha(mr),'liveRegistryOrRuntimeChanged':False,'memberWorkQloAndCaddyPreserved':True,'customerAcceptance':False})
 print(json.dumps({'status':'STAGE35_PASS_NOT_ADOPTED','actualPath':str(OUT/'RESULT_ACTUAL.json'),'actualSHA256':sha(stable(OUT/'RESULT_ACTUAL.json'))}))
if __name__=='__main__':main(json.loads(stable(sys.argv[1])))
