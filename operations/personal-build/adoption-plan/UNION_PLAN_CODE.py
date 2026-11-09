from pathlib import Path,PurePosixPath
import os,json,hashlib,stat,shutil,subprocess,datetime
REG=Path('/srv/crays/releases/nostr-original-core-addon-20261108-18/common-machine57/MODULE_REGISTRY.work24.json')
REG_SHA='b73b92d3f6882ccca30991e46d27dbf029ec94e89768573d10cfad32cb232fa4'
BRANCH_SHA='73c6fce3d86da8f15f6ef17a3573922f29ad1495a3c487b22c9dda7bef52b684'
COMMON_PROOF=Path('/srv/crays/acceptance/common25-full-source-generation-20261108-11/RESULT_ACTUAL.json')
COMMON_PROOF_SHA='9530f0a9da0395ec16a81c3301bbd4653b0d6a80a5c066cf175c51983e6414ec'
CID='302c64c31fe9a9106e7a1a962f51ec293eeacd83afb934a71d134abe69746387'
PID=1271052
CONTAINER_REG='/srv/crays/runtime/common-canonical-20261106-01/MODULE_REGISTRY.json'
MAN=Path('/srv/crays/migration-work/20261108/inventory/personal-build02-output-digest-20261108-01/ACTUAL_BUILD_OUTPUT_MANIFEST.json')
MAN_SHA='2d969e7f0ff8aa1b34ea5e5195007a69e9fdc931384b41e47c1709ac73cdfd06'
CASE=Path('/srv/crays/migration-work/20261108/inventory/personal-runtime-adoption-20261108-01')
assert os.getuid()==0
os.umask(0o077)
def sha(b):return hashlib.sha256(b).hexdigest()
def canonical(x):return json.dumps(x,sort_keys=True,separators=(',',':')).encode()
def save(path,data):
 b=data if isinstance(data,bytes) else json.dumps(data,sort_keys=True,indent=2).encode()
 fd=os.open(path,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o600)
 with os.fdopen(fd,'wb')as f:f.write(b);f.flush();os.fsync(f.fileno())
 return {'path':str(path),'bytes':len(b),'sha256':sha(b)}
def current():
 assert sha(COMMON_PROOF.read_bytes())==COMMON_PROOF_SHA
 q=subprocess.run(['docker','container','inspect',CID],capture_output=True,text=True,timeout=10);assert q.returncode==0
 d=json.loads(q.stdout)[0];assert d['Id']==CID and d['State']['Running'] and d['State']['Pid']==PID
 mounts=[m for m in d['Mounts']if m['Destination']==CONTAINER_REG]
 assert len(mounts)==1 and mounts[0]['Source']==str(REG) and not mounts[0]['RW']
 raw=REG.read_bytes();assert sha(raw)==REG_SHA
 assert sha((Path('/proc')/str(PID)/'root'/CONTAINER_REG.lstrip('/')).read_bytes())==REG_SHA
 r=json.loads(raw);assert sha(canonical(r['personal']))==BRANCH_SHA
 return raw,r
def source_row(root,rel,digest,provenance,expected=None):
 p=PurePosixPath(rel);assert not p.is_absolute()and'..'not in p.parts and str(p)==rel and rel not in('','.');f=root.joinpath(*p.parts)
 meta=f.lstat();assert stat.S_ISREG(meta.st_mode)and not f.is_symlink()
 assert f.resolve().is_relative_to(root.resolve())
 if expected is not None:assert meta.st_size==expected['bytes']and stat.S_IMODE(meta.st_mode)==expected['mode']
 assert isinstance(digest,str)and len(digest)==64 and all(c in'0123456789abcdef'for c in digest)
 return {'path':rel,'sourcePath':str(f),'sourceRoot':str(root),'sha256':digest,'bytes':meta.st_size,'mode':stat.S_IMODE(meta.st_mode),'device':meta.st_dev,'inode':meta.st_ino,'mtimeNs':str(meta.st_mtime_ns),'ctimeNs':str(meta.st_ctime_ns),'provenance':provenance}
raw,r=current()
mb=MAN.read_bytes();assert sha(mb)==MAN_SHA;m=json.loads(mb)
old=r['personal'];assert len(old['files'])==23588
oldroot=Path(old['root']);assert str(oldroot)=='/srv/crays/acceptance/unified-static-20261105-01/artifacts/personal'
newroot=Path(m['dist']);assert str(newroot)=='/srv/crays/migration-work/20261108/inventory/personal-frontend-build-entry-20261108-02/dist'
new={f['path']:f for f in m['files']};assert len(new)==513
oldRows={p:source_row(oldroot,p,h,'CURRENT_COMMON11_DECLARED_PERSONAL')for p,h in old['files'].items()}
newRows={p:source_row(newroot,p,f['sha256'],'ACTUAL_PERSONAL_BUILD02_OUTPUT',f)for p,f in new.items()}
selected=dict(oldRows);selected.update(newRows)
parents=set()
for rel in selected:
 parents.update(str(p)for p in PurePosixPath(rel).parents if str(p)!='.')
v=os.statvfs(CASE.parent);block=v.f_frsize;free=v.f_bavail*block
allocated=sum(((f['bytes']+block-1)//block)*block for f in selected.values())+len(parents)*block+64*1024**2
logical=sum(f['bytes']for f in selected.values())
overlap=set(oldRows)&set(newRows);same=sum(oldRows[p]['sha256']==newRows[p]['sha256']for p in overlap)
summary={'oldDeclaredFiles':23588,'actualBuildFiles':513,'overlappingPaths':len(overlap),'identicalOverlapPins':same,'changedOverlapPins':len(overlap)-same,'newOnlyPaths':len(set(newRows)-set(oldRows)),'unionFiles':len(selected),'oldDeclaredBytes':sum(f['bytes']for f in oldRows.values()),'newBuildBytes':sum(f['bytes']for f in newRows.values()),'unionLogicalBytes':logical,'estimatedOwnCopyAllocatedBytesWith64MiBMetadataMargin':allocated,'filesystemBlockBytes':block,'freeBytesBeforeCopy':free,'estimatedFreeAfterCopy':free-allocated,'limitUnionBytes':2*1024**3,'requiredFreeReserveBytes':8*1024**3,'copyScopeAllowed':logical<=2*1024**3 and free-allocated>=8*1024**3}
CASE.mkdir(mode=0o700,exist_ok=False)
code=save(CASE/'UNION_PLAN_CODE.py',CODE_SOURCE.encode());assert code['sha256']==CODE_SHA
base=save(CASE/'BASE_CURRENT_REGISTRY_PREIMAGE.json',raw)
plan={'schema':'crays.personal.current-common11-static-union-plan.v1','status':'DECLARED_PATHS_ONLY_SCOPE_ALLOWED_NO_COPY'if summary['copyScopeAllowed']else'STOP_UNION_SIZE_OR_FREE_RESERVE_SCOPE_REQUIRES_ROOT','atUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'summary':summary,'code':code,'registryPreimage':base,'hostRegistryPath':str(REG),'registrySHA256':REG_SHA,'personalBranchSHA256':BRANCH_SHA,'common11ProofPath':str(COMMON_PROOF),'common11ProofSHA256':COMMON_PROOF_SHA,'commonCID':CID,'commonPID':PID,'containerRegistryPath':CONTAINER_REG,'oldRoot':str(oldroot),'actualOutputManifest':{'path':str(MAN),'sha256':MAN_SHA},'newBuildRoot':str(newroot),'targetImmutableRoot':str(CASE/'static-union'),'oldDeclaredRows':list(oldRows.values()),'newBuildRows':list(newRows.values()),'selectedUnionRows':list(selected.values()),'allOldDeclaredPathsRetained':set(oldRows)<=set(selected),'buildOverridesOldOnPathCollision':True,'oldPreimagesWritten':False,'directoryWalkPerformed':False,'sourceContentHashingPerformed':False,'copiedFiles':0,'sharedRuntimeChanged':False,'activationAllowed':False,'rootFutureActivationMustRecheckCIDHostAndMountedRegistryPreimage':True,'rootMustRebaseIfNonPersonalCurrentBranchChanges':True,'newReadonlySamePathMountRequired':str(CASE/'static-union'),'atomicReplaceOfOldRegistryHostPathDoesNotUpdateExistingContainerFileBind':True}
proof=save(CASE/'UNION_PLAN.json',plan)
assert current()[0]==raw
print(json.dumps({'summary':summary,'plan':proof,'code':code,'registryPreimage':base,'sharedRuntimeChanged':False,'copiedFiles':0}))
