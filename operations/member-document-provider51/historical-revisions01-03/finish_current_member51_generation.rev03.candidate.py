"""Root-only ONE original full source-generation/Common replacement.
No17 PID-only policy, no fixture identity, no source-owner credentials rewritten.
Failure stops owned new family and retains all generations; never stale rollback.
"""
from pathlib import Path
import os,stat,json,hashlib,runpy,sys,time,uuid,subprocess,copy,signal,re,contextlib,io
H=Path(__file__).resolve().parent;OUT=Path('/srv/crays/acceptance/common25-full-source-generation-20261108-11')
RELEASE=Path('/srv/crays/releases/nostr-original-core-addon-20261108-18');RAM=Path('/run/crays/nostr-core-runtime-v1')
OLD='0af175e4c5c2531fd463fbc572d456fcd722bd06dca8f754434f9cbbea0a2c07';ANCHOR='c46e256272ea07b12480d9e0211bd397fc76a8f27f9df9b67b30b527112b6b84'
SDK='crays-owner-tools-whatsapp-live.service';BROKERS=['crays-owner-document-broker.service','crays-owner-workflow-broker.service'];WITNESS='crays-chuck-core-currentness.service';GO='crays-nostr-native-registry18.service';STS='crays-nostr-scoped-sts18.service'
CURRENT=Path('/srv/crays/runtime/chuck-core-currentness-20261107-07');CONTROL=Path('/srv/crays/runtime/chuck-profile-control-20261107-20')
PATHS={'PUBLIC_PROCESS_BINDING.root.json':CURRENT/'PUBLIC_PROCESS_BINDING.root.json','OWNER_BINDING.json':CONTROL/'owner/OWNER_BINDING.json','DEPLOYMENT.json':CONTROL/'deployment/DEPLOYMENT.json','START.json':CONTROL/'deployment/START.json'}
sha=lambda b:hashlib.sha256(b).hexdigest()
def need(v,g):
 if not v:raise RuntimeError(g)
def stable(path,maximum=32768):
 p=Path(path);need(p.resolve()==p,'ROOT_CANONICAL_CONTROL_REQUIRED');fd=os.open(p,os.O_RDONLY|os.O_NOFOLLOW)
 try:
  s=os.fstat(fd);registry=str(p)=='/srv/crays/runtime/common-canonical-20261106-01/MODULE_REGISTRY.json'
  need(stat.S_ISREG(s.st_mode)and s.st_nlink==1 and 0<s.st_size<=maximum,'ROOT_STABLE_CONTROL_CUSTODY_REQUIRED')
  if registry:need(s.st_uid==s.st_gid==1000 and stat.S_IMODE(s.st_mode)==0o400 and s.st_size==3831694,'EXACT_ORIGINAL_REGISTRY_CUSTODY_REQUIRED')
  else:need(s.st_uid==0 and not s.st_mode&0o022,'ROOT_STABLE_CONTROL_CUSTODY_REQUIRED')
  b=os.read(fd,maximum+1);a=os.fstat(fd);c=p.lstat();key=lambda v:(v.st_dev,v.st_ino,v.st_size,v.st_mtime_ns,v.st_ctime_ns,v.st_uid,v.st_gid,v.st_mode,v.st_nlink)
  need(len(b)==s.st_size and key(s)==key(a)==key(c),'ROOT_CONTROL_CHANGED')
  if registry:need(sha(b)=='e31374e652898c8993112e493d2fc3ccff104f15c0da8c293ece9c1b47f234cf','EXACT_ORIGINAL_REGISTRY_SHA_REQUIRED')
  return b
 finally:os.close(fd)
def finish(parent_review,original_review,ctx):
 global H,OUT,ANCHOR,OLD
 HERE=Path(__file__).resolve().parent
 H=Path('/srv/crays/migration-work/20261108/root/common11-source-author01')
 OUT=Path(ctx['output']);ANCHOR=ctx['newMember'];OLD=ctx['originalCommon']['id'];r=dict(original_review)
 r.update(sourceFencePath=parent_review['sourceFencePath'],sourceFenceSHA256=parent_review['sourceFenceSHA256'])
 q=runpy.run_path(str(H/'qualified53_exact_helpers.py'));u=runpy.run_path(str(H/'qualified_container_physical.py'));show=q['show'];cmd=q['cmd'];process=q['process'];canon=q['canonical']
 before=ctx['familyPreimage']['units'];newcid=ctx['newCommon'];old=ctx['originalCommon'];expected=ctx['expectedCommon'];ap=ctx['newMemberProcess']
 netns=os.readlink(Path('/proc',str(ap['pid']),'ns/net'));baseArchive=Path('/srv/crays/acceptance/common25-full-source-generation-20261108-05')
 current11={n:stable(Path(ctx['parentOutput'])/('prior11-'+n))for n in PATHS}
 need({n:sha(b)for n,b in current11.items()}==ctx['familyPreimage']['controlsSHA256'],'ACTUAL_ARCHIVED11_CONTROL_CHAIN_REQUIRED')
 current11pub,current11owner,current11policy,current11start=[json.loads(current11[n])for n in PATHS]
 def anchor_current():
  a=u['inspect'](ANCHOR);need(a['State']['Running']and process(a['State']['Pid'])==ap and os.readlink(Path('/proc',str(ap['pid']),'ns/net'))==netns,'NEW_MEMBER46_ANCHOR_PHYSICAL_CONTINUITY')
 def fresh_fence():
  fence=stable(r['sourceFencePath'],16384);need(sha(fence)==r['sourceFenceSHA256'],'FRESH_ORIGINAL_SOURCE_FENCE_SHA');f=json.loads(fence)
  need(f.get('sourceArchiveSHA256')=='71084517d7378bb3b6125e161135bd71d921f6ad63b187b9b790cb645f85c53a'and f.get('sourceWriterFenceStillEffective')is True and f.get('originalSourceUnitsPhysicallyStopped')is True and f.get('sourceRestartApproved')is False and 0<=time.time()-f['observedAtUnix']<=120,'FRESH_ORIGINAL_SOURCE_FENCE_REQUIRED')
 def admit_new():
  verifier=runpy.run_path(str(HERE/'member51_lifecycle.candidate.py'))
  c=verifier['admit_created'](u,newcid,expected,ctx['expectedCommonMounts'],'common',old,ANCHOR)
  return c
 controlsWritten=[];published=False;newservices=False;lastGo={'phase':'NOT_STARTED'}
 oldcontrols={n:stable(baseArchive/('prior-'+n))for n in PATHS};oldmodes={n:stat.S_IMODE((Path(ctx['parentOutput'])/('prior11-'+n)).lstat().st_mode)for n in PATHS}
 need({n:sha(b)for n,b in oldcontrols.items()}==r['oldControlSHA256'],'EXACT_ORIGINAL05_37SDK36WITNESS_ARCHIVE_REQUIRED')
 wp,owner,policy,start=[json.loads(oldcontrols[n])for n in PATHS]
 need(start['policySHA256']==sha(oldcontrols['DEPLOYMENT.json'])and policy['ownerPolicySHA256']==sha(oldcontrols['OWNER_BINDING.json'])and policy['witness']['policySHA256']==sha(oldcontrols['PUBLIC_PROCESS_BINDING.root.json']),'ORIGINAL05_ARCHIVED_CHAIN_REQUIRED')
 need(current11owner['scope']==owner['scope'],'ORIGINAL_OWNER_SCOPE_UNCHANGED')
 stage=stable(r['stageReceiptPath'],131072);need(sha(stage)==r['stageReceiptSHA256'],'ACTUAL_EXISTING_COMMON25_PUBLIC_STAGE_REQUIRED');sp=json.loads(stage);manifest=stable(RELEASE/'PUBLIC_RELEASE_MANIFEST25.json',131072)
 need(sha(manifest)==sp['manifestSHA256'],'UNCHANGED33_PUBLIC_RELEASE_MANIFEST_REQUIRED')

 def public_row(rel):
  b=stable(RELEASE/rel,16777216);return {'sha256':sha(b),'bytes':len(b)}
 previousFiles=copy.deepcopy(json.loads(manifest)['files'])
 replacements={
  'common-machine57/common-host.machine57.candidate.cjs':('common-machine57/common-host.native-graphql49.candidate.cjs','f726cd9fb8a44309408da26f5d1ad621ef8de127028cf2d9f2b4fa09f44742f1'),
  'runtime-core-adoption18-executable/serve-original-host.nostr18-machine57.candidate.mjs':('runtime-core-adoption18-executable/serve-original-host.native-graphql49.candidate.mjs','6541b66ceb48214977bb8b584bb54975238041155b4788714386cd9312ce829c'),
  'common-machine57/listener.nostr18-machine57.candidate.mjs':('common-machine57/listener.original-messaging-nostr50.candidate.mjs','284044a37f516d2fd9fbe3004773b40100bf7c6711c452936bf364f0395c3db6')}
 for oldrel,(newrel,pin)in replacements.items():
  need(oldrel in previousFiles,'CURRENT_FULL46_SOURCE_PREDECESSOR');row=public_row(newrel);need(row['sha256']==pin,'EXACT_CURRENT_FULL46_SOURCE_BYTES')
  if oldrel!=newrel:del previousFiles[oldrel]
  previousFiles[newrel]=row
 classify=runpy.run_path(str(HERE/'classify_exact_member50_runtime_addons.candidate.py'))['classify']
 currentAddons,currentPolicy=classify(previousFiles,ctx['previousRegistryRow'])
 need(current11policy['sourceFiles']==policy['sourceFiles']+[{k:z[k]for k in ('path','sha256')}for z in currentPolicy] and current11pub['publicSourceFiles']==wp['publicSourceFiles']+currentAddons,'EXACT_CURRENT_FULL46_64_62_SOURCE_CLOSURE')
 projectedFiles=copy.deepcopy(previousFiles)
 classify51=runpy.run_path(str(HERE/'classify_exact_member51_runtime_addons.candidate.py'))['classify'];addons,policyaddons=classify51(projectedFiles,ctx['registryRow'])
 need(len(current11pub['publicSourceFiles'])==64 and len(current11policy['sourceFiles'])==62 and len(addons)==28 and len(policyaddons)==25 and len(policy['sourceFiles'])==37 and len(wp['publicSourceFiles'])==36 and sum(z['bytes']for z in wp['publicSourceFiles']+addons)<=32*1024*1024,'EXACT_CURRENT_FULL64_62_BOUNDS_PRESERVED')
 need([z for z in currentAddons if z['path']!=ctx['previousRegistryRow']['path']]==[z for z in addons if z['path']!=ctx['registryRow']['path']],'ONLY_MEMBER51_REGISTRY_SOURCE_ROW_CHANGED')
 for row in addons:need(len(stable(row['path'],16777216))==row['bytes'] and sha(stable(row['path'],16777216))==row['sha256'],'ALL_CURRENT48_SOURCE_BYTES_MATCH')
 for name in [SDK,*BROKERS,WITNESS,GO,STS]:
  state=show(name);need(state['MainPID']=='0'and state['ActiveState']in('inactive','failed'),'ALL_ORIGINAL_OWN_UNITS_TERMINAL_BEFORE_GENERATION')
  cg=Path('/sys/fs/cgroup/system.slice')/name
  if cg.exists():need(all(not p.read_text().strip()for p in cg.rglob('cgroup.procs')),'ORIGINAL_OWN_CGROUP_EMPTY_BEFORE_GENERATION')
 ns=RAM/'network/common.netns';need((ns.stat().st_dev,ns.stat().st_ino)==(Path('/proc',str(ap['pid']),'ns/net').stat().st_dev,Path('/proc',str(ap['pid']),'ns/net').stat().st_ino),'EXACT_REBOUND_NEW_MEMBER_GO_NAMESPACE')
 sdk10base=Path('/srv/crays/migration-work/20261108/root/common10-sdk-source-projection01');sdk10prebytes=stable(sdk10base/'UNIT_PREIMAGE10.json',32768);need(sha(sdk10prebytes)=='a141597f75d2aae453ffa6dd084a918cd21d84d8454fb2d687681058a89bc81d','EXACT_SDK10_ORIGINAL_UNIT_PREIMAGE');sdk10pre=json.loads(sdk10prebytes)
 import shlex
 def sdk_property(k):return cmd(['/usr/bin/systemctl','show',SDK,'--property='+k,'--value'],timeout=10).decode().strip()
 def sdk10_current():
  drop=Path(sdk10pre['DropInPaths'].split()[-1]+'.common25-public-release10.conf');need(sha(stable(drop))=='d7a6c938dcbf2a528e5c090a6a5c9d4b6b1677f7f163b6008527cf740de13e8b','EXACT_SDK10_ADDITIVE_DROPIN')
  for p,h in sdk10pre['unitFiles'].items():need(sha(stable(p,2097152))==h,'ALL_ORIGINAL_SDK_UNIT_FILES_PRESERVED')
  need(shlex.split(sdk_property('DropInPaths'))==shlex.split(sdk10pre['DropInPaths'])+[str(drop)],'ONLY_APPROVED_SDK10_DROPIN_ADDED')
  need(shlex.split(sdk_property('InaccessiblePaths'))==[x for x in shlex.split(sdk10pre['InaccessiblePaths'])if x!='/srv']and sdk_property('TemporaryFileSystem')=='/srv:ro,size=16M,mode=0755','EXACT_EMPTY_READONLY_SRV_PROJECTION')
  for k in ['BindReadOnlyPaths','BindPaths']:
   tokens=shlex.split(sdk_property(k));pair=str(RELEASE)+':'+str(RELEASE)+':rbind';own=[v for v in tokens if str(RELEASE)in v];need(own==([pair]if k=='BindReadOnlyPaths'else[]),'EXACT_ONE_SDK_READONLY_PUBLIC_RELEASE_BIND')
   if k=='BindReadOnlyPaths':tokens.remove(pair)
   need(sha(' '.join(tokens).encode())==sdk10pre[k]['sha256'],'ALL_OTHER_ORIGINAL_SDK_BINDINGS_UNCHANGED')
 sdk10_current()
 fm=subprocess.run(['/usr/bin/findmnt','-n','-o','FSTYPE','-T',str(RAM)],capture_output=True,text=True,check=True,timeout=5);need(fm.stdout.strip()=='tmpfs','EXACT_EXISTING_RAM_TMPFS_REQUIRED')
 for path,uid,mode in [(RAM,0,0o755),*( (RAM/n,1000,0o700)for n in ['credentials','sts','policy','registry'])]:
  st=path.lstat();need(path.resolve()==path and stat.S_ISDIR(st.st_mode)and st.st_uid==st.st_gid==uid and stat.S_IMODE(st.st_mode)==mode,'EXACT_EXISTING_RAM_DIRECTORY_CUSTODY_REQUIRED')
 projector=RELEASE/'runtime-core-adoption18-executable/project_exact14_credentials_to_common_ram.candidate.py';need(sha(stable(projector,131072))==r['nostrPreparationSourceSHA256'][projector.name],'ORIGINAL14_PROJECTOR_SOURCE_PIN_REQUIRED');pm=runpy.run_path(str(projector));sourcefd=pm['directory_fd'](pm['SOURCE'])
 try:
  for src,dst in pm['FILES'].items():
   original=pm['read_private'](sourcefd,src,262144);target=RAM/'credentials'/dst;fd=os.open(target,os.O_RDONLY|os.O_NOFOLLOW)
   try:
    st=os.fstat(fd);need(stat.S_ISREG(st.st_mode)and st.st_uid==st.st_gid==1000 and st.st_nlink==1 and stat.S_IMODE(st.st_mode)==0o400 and 0<st.st_size<=262144,'ORIGINAL14_RAM_FILE_CUSTODY_REQUIRED');body=os.read(fd,262145);after=os.fstat(fd);need(len(body)==st.st_size and body==original and (st.st_dev,st.st_ino,st.st_size,st.st_mtime_ns)==(after.st_dev,after.st_ino,after.st_size,after.st_mtime_ns),'SAME_ORIGINAL14_RAM_BYTES_REQUIRED');body=None;original=None
   finally:os.close(fd)
 finally:os.close(sourcefd)
 nroot=RELEASE/'runtime-core-adoption18-executable'
 for template,unitName in [('crays-nostr-native-registry16.service.candidate',GO),('crays-nostr-scoped-sts16.service.candidate',STS)]:need(stable('/etc/systemd/system/'+unitName,32768)==stable(nroot/template,32768),'EXACT_INSTALLED_ORIGINAL18_UNITS_REQUIRED')
 aclpath=Path('/srv/crays/acceptance/common25-release-parent-traverse-acl-20261108-07/RESULT_ACTUAL.json');aclraw=stable(aclpath,32768);acl=json.loads(aclraw);need(acl.get('status')=='EXACT_RELEASE_PARENT_TRAVERSE_ONLY_ACL_QUALIFIED'and acl.get('target')=='/srv/crays/releases'and acl.get('device')==66309 and acl.get('inode')==5767169 and acl.get('uid1000EffectivePermissions')==acl.get('uid61304EffectivePermissions')=='--x'and acl.get('owningGroupEffectivePermissions')==acl.get('otherEffectivePermissions')=='---'and acl.get('defaultACLAbsent')is True and acl.get('runtimeStarted')is False,'ACTUAL_ACL07_TRAVERSE_ONLY_POSTIMAGE_REQUIRED')
 import struct
 expectedacl=struct.pack('<I',2)+b''.join(struct.pack('<HHI',*e)for e in [(1,7,0xffffffff),(2,1,1000),(2,1,61304),(4,0,0xffffffff),(16,1,0xffffffff),(32,0,0xffffffff)]);releaseparent=Path('/srv/crays/releases');rst=releaseparent.lstat();need((rst.st_dev,rst.st_ino,rst.st_uid,rst.st_gid,stat.S_IMODE(rst.st_mode))==(66309,5767169,0,0,0o710)and releaseparent.resolve()==releaseparent and os.getxattr(releaseparent,'system.posix_acl_access')==expectedacl and acl['aclSHA256']==sha(expectedacl),'EXACT_CURRENT_ACL07_KERNEL_POSTIMAGE_REQUIRED')
 checks={1000:[{'path':str(RELEASE/'bin/nostr-native-registry'),'mode':os.R_OK|os.X_OK},{'path':'/srv/crays/runtime-data/nostr-relay-v1','mode':os.R_OK|os.W_OK|os.X_OK},{'path':str(RAM/'registry'),'mode':os.R_OK|os.W_OK|os.X_OK},{'path':str(RAM/'policy'),'mode':os.X_OK}],61304:[{'path':row['path'],'mode':os.R_OK}for row in policyaddons]}
 checks[1000]+=[{'path':str(Path('/srv/crays/releases/member-document-provider51-20261109-01')/p),'mode':os.R_OK}for p in ['app/server.js','app/package.json','app/.next/BUILD_ID','member-code/member_rds_runtime_boot.cjs','member-code/original-rds-guard-probe.cjs']]
 uidCode="import os,json,sys;uid=int(sys.argv[1]);rows=json.load(sys.stdin);os.setgroups([]);os.setgid(uid);os.setuid(uid);assert os.getuid()==os.geteuid()==uid;print(json.dumps([os.access(row['path'],row['mode'],effective_ids=True)for row in rows]))"
 uidProof={}
 for uid,rows in checks.items():
  probe=subprocess.run(['/usr/bin/python3','-I','-B','-c',uidCode,str(uid)],input=canon(rows),capture_output=True,timeout=5,env={'PATH':'/usr/bin:/bin','LANG':'C'});need(probe.returncode==0 and json.loads(probe.stdout)==[True]*len(rows),'EXACT_ORIGINAL_UID_PUBLIC_SOURCE_AND_GO_DATA_ACCESS_REQUIRED');uidProof[str(uid)]={'allRequiredAccessQualified':True,'pathsChecked':len(rows)}
 policySocket=RAM/'policy/policy.sock';registrySocket=RAM/'registry/control.sock'
 fresh_fence();anchor_current();OUT.mkdir(mode=0o700);q['syncdir'](OUT.parent)
 def save(n,v):q['put'](OUT/n,canon(v),0o400)
 save('INTENT.json',{'status':'ORIGINAL_FULL26_GENERATION_ON_NEW_MEMBER_NAMESPACE','newCommon':newcid,'newMember':ANCHOR,'oldControls':ctx['familyPreimage']['controlsSHA256'],'originalOwnerScopePreserved':True,'automaticReplayAllowed':False})
 # The old namespace file descriptor was opened BEFORE physical quiescence.
 # Check all original owners terminal, and old/new/host kernel tables, before unlink.
 currentStopped=u['inspect'](newcid);need(not currentStopped['State']['Running']and currentStopped['State']['Pid']==0,'SAME_EXISTING_COMMON_PHYSICALLY_STOPPED_BEFORE_FRESH_SOCKET_CAS')
 stopped=u['inspect'](ctx['originalCommon']['id']);need(not stopped['State']['Running']and stopped['State']['Pid']==0,'OLD_COMMON_SOCKET_OWNER_TERMINAL')
 for role,key,processKey in [('member','newMember','newMemberProcess'),('work','newWork','newWorkProcess')]:
  prior=ctx['familyPreimage']['containers'][role];oldRole=u['inspect'](prior['id'])
  need(not oldRole['State']['Running'] and oldRole['State']['Pid']==0,'OLD_MEMBER_WORK_NAMESPACE_OWNERS_TERMINAL')
  live=u['inspect'](ctx[key])
  if role=='work':
   verifier=runpy.run_path(str(HERE/'member51_lifecycle.candidate.py'));live=verifier['admit_created'](u,ctx[key],ctx['expectedWork'],ctx['expectedWorkMounts'],'work',prior,ANCHOR)
  need(live['State']['Running'] and process(live['State']['Pid'])==ctx[processKey] and os.readlink(Path('/proc',str(live['State']['Pid']),'ns/net'))==netns,'EXACT_MEMBER_WORK_SUCCESSORS_LIVE_IN_NEW_NAMESPACE')
 def kernel_rows():
  fd=ctx['oldNetUnixFD']
  if fd is None:
   need(ctx.get('originalNamespaceDestroyed')is True and all(v is None for v in ctx['socketPreimages'].values()),'DESTROYED_ORIGINAL_NAMESPACE_AND_ONLY_ABSENT_SOCKETS_REQUIRED')
   verifier=runpy.run_path(str(HERE/'verify_destroyed_member51_namespace.candidate.py'))
   verifier['verify'](ctx['familyPreimage'],u,need)
   texts=[Path('/proc',str(ap['pid']),'net/unix').read_text(),Path('/proc/net/unix').read_text()]
  else:
   os.lseek(fd,0,os.SEEK_SET);body=bytearray()
   while True:
    chunk=os.read(fd,65536)
    if not chunk:break
    body.extend(chunk);need(len(body)<=4194304,'BOUNDED_RETAINED_OLD_UNIX_TABLE')
   texts=[bytes(body).decode(),Path('/proc',str(ap['pid']),'net/unix').read_text(),Path('/proc/net/unix').read_text()]
  need(all(len(t)<=4194304 for t in texts),'BOUNDED_OWN_UNIX_TABLES')
  return [row.split(maxsplit=7)for t in texts for row in t.splitlines()[1:]]
 sockets={str(policySocket):[str(policySocket),'/run/crays/nostr-runtime/policy/policy.sock'],str(registrySocket):[str(registrySocket),'/run/crays/nostr-runtime/registry/control.sock'],'/run/crays-chuck-core-currentness/status.sock':['/run/crays-chuck-core-currentness/status.sock']}
 for index,(text,aliases)in enumerate(sockets.items()):
  path=Path(text);prior=ctx['socketPreimages'][text]
  need(not any(len(row)==8 and row[7]in aliases for row in kernel_rows()),'OLD_NEW_HOST_KERNEL_SOCKET_OWNERS_ABSENT_REQUIRED')
  if prior is None:need(not os.path.lexists(path),'NO_SOCKET_APPEARED_AFTER_ABSENT_PREIMAGE');continue
  if not os.path.lexists(path):
   save('SOCKET_'+str(index)+'_ALREADY_ABSENT_ACK.json',{'removedByOriginalShutdown':True,'allOriginalOwnersPhysicallyTerminal':True,'oldNewHostKernelOwnersAbsent':True,'unlinkPerformed':False});continue
  parent=path.parent;ps=parent.lstat();need(parent.resolve()==parent and stat.S_ISDIR(ps.st_mode)and ps.st_uid in(0,1000)and not ps.st_mode&0o022,'EXACT_OWN_SOCKET_PARENT_CUSTODY')
  dfd=os.open(parent,os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW)
  try:
   st=os.stat(path.name,dir_fd=dfd,follow_symlinks=False);actual=[st.st_dev,st.st_ino,st.st_uid,st.st_gid,stat.S_IMODE(st.st_mode),st.st_nlink]
   need(stat.S_ISSOCK(st.st_mode)and actual==prior,'EXACT_OLD_SOCKET_INODE_CAS_REQUIRED')
   save('SOCKET_'+str(index)+'_UNLINK_INTENT.json',{'path':text,'preimage':prior,'allOriginalOwnersPhysicallyTerminal':True,'oldNewHostKernelOwnersAbsent':True})
   need(not any(len(row)==8 and row[7]in aliases for row in kernel_rows()),'SOCKET_KERNEL_OWNER_REAPPEARED')
   now=os.stat(path.name,dir_fd=dfd,follow_symlinks=False);need((now.st_dev,now.st_ino,now.st_ctime_ns)==(st.st_dev,st.st_ino,st.st_ctime_ns),'SOCKET_INODE_CHANGED_BEFORE_UNLINK')
   os.unlink(path.name,dir_fd=dfd);os.fsync(dfd);save('SOCKET_'+str(index)+'_UNLINK_ACK.json',{'sameInodeRemoved':True,'noKernelOwner':True})
  finally:os.close(dfd)
 need(not os.path.lexists('/run/crays-chuck-core-currentness/status.sock'),'ORIGINAL_WITNESS_SOCKET_ABSENT_BEFORE_START_REQUIRED')
 need(not os.path.lexists(registrySocket),'ORIGINAL_REGISTRY_SOCKET_ABSENT_BEFORE_START_REQUIRED');need(not os.path.lexists(policySocket),'ORIGINAL_POLICY_SOCKET_ABSENT_BEFORE_START_REQUIRED');stsfile=RAM/'sts/session.json';priorSts=stsfile.stat().st_mtime_ns if stsfile.exists()else None;newservices=True;cmd(['/usr/bin/systemctl','start',STS],timeout=10);deadline=time.monotonic()+30
 while not stsfile.exists()or stsfile.stat().st_mtime_ns==priorSts:need(time.monotonic()<deadline and show(STS)['ActiveState']=='active','SCOPED_STS_REFRESH_TIMEOUT');time.sleep(.2)
 u['api']('POST','/containers/'+newcid+'/start',statuses=(204,));c=admit_new();need(c['State']['Running'],'NEW_COMMON_BOOTSTRAP_ALIVE_REQUIRED');cp=process(c['State']['Pid']);ns=lambda n:int(os.readlink(Path('/proc',str(cp['pid']),'ns',n)).split('[')[1][:-1]);need('net:['+str(ns('net'))+']'==netns and cp['uid']==1000,'NEW_COMMON_SAME_MEMBER_NETNS_UID_REQUIRED');save('COMMON_BOOTSTRAP_PHYSICAL_ACK.json',{'id':newcid,'process':cp,'pidNamespaceInode':ns('pid'),'networkNamespaceInode':ns('net')})
 # Go NewUnixCoreAuthority requires an existing Core socket; Common PID
 # bootstrap alone is not readiness for its asynchronous original constructor.
 registryRoot=Path('/srv/crays/runtime-data/nostr-relay-v1');dr=registryRoot.lstat();need(registryRoot.resolve()==registryRoot and stat.S_ISDIR(dr.st_mode)and dr.st_uid==dr.st_gid==1000 and stat.S_IMODE(dr.st_mode)==0o700,'ORIGINAL_REGISTRY_DURABLE_ROOT_CUSTODY_REQUIRED');registryEntries=sum(1 for _ in registryRoot.iterdir());need(registryEntries<=20000,'ORIGINAL_REGISTRY_METADATA_BOUND_REQUIRED');save('REGISTRY_ROOT_PRESTART_ACK.json',{'canonical':True,'uid':1000,'gid':1000,'mode':'0700','entryCount':registryEntries,'effectiveUIDAccessAlreadyQualified':True,'filesChanged':False})
 lastGo={'phase':'WAIT_COMMON_OWNED_CORE_POLICY_SOCKET','finalQualified':False};coreDeadline=time.monotonic()+25;coreSocketReady=None;coreAlias='/run/crays/nostr-runtime/policy/policy.sock'
 while time.monotonic()<coreDeadline:
  live=admit_new();need(live['State']['Running']and live['State']['Pid']==cp['pid']and process(cp['pid'])==cp,'EXACT_SAME_CAP0_NNP_COMMON_REQUIRED_DURING_CORE_SOCKET_WAIT');anchor_current();parent=policySocket.parent;parentMeta=parent.lstat();need(parent.resolve()==parent and stat.S_ISDIR(parentMeta.st_mode)and parentMeta.st_uid==parentMeta.st_gid==1000 and stat.S_IMODE(parentMeta.st_mode)==0o700,'ORIGINAL_CORE_SOCKET_PARENT_CUSTODY_REQUIRED')
  if os.path.lexists(policySocket):
   sm=policySocket.lstat();need(policySocket.resolve()==policySocket and stat.S_ISSOCK(sm.st_mode)and sm.st_uid==sm.st_gid==1000 and stat.S_IMODE(sm.st_mode)==0o600,'ORIGINAL_NEW_CORE_SOCKET_CUSTODY_REQUIRED');inside=Path('/proc',str(cp['pid']),'root',coreAlias.lstrip('/')).stat();need((inside.st_dev,inside.st_ino)==(sm.st_dev,sm.st_ino),'ACTUAL_COMMON_NAMESPACE_CORE_SOCKET_SAME_INODE_REQUIRED');commonSocketIds=set()
   for currentfd in Path('/proc',str(cp['pid']),'fd').iterdir():
    try:link=os.readlink(currentfd)
    except FileNotFoundError:continue
    match=re.fullmatch(r'socket:\[(\d+)\]',link)
    if match:commonSocketIds.add(match[1])
   active=[row.split(maxsplit=7)for row in Path('/proc',str(ap['pid']),'net/unix').read_text().splitlines()[1:]];matches=[row for row in active if len(row)==8 and row[7]in(str(policySocket),coreAlias)and row[6]in commonSocketIds and int(row[3],16)&0x10000]
   if len(matches)==1 and process(cp['pid'])==cp:
    coreSocketReady={'device':sm.st_dev,'inode':sm.st_ino,'uid':1000,'gid':1000,'mode':'0600','commonPID':cp['pid'],'commonStartTicks':cp['startTicks'],'memberNamespaceUnchanged':True,'sameCommonFilesystemSocket':True,'actualCommonFDAndKernelListener':True,'createdAfterOriginalStaleSocketAbsence':True};lastGo={'phase':'CORE_POLICY_SOCKET_QUALIFIED_BEFORE_GO','finalQualified':False};break
  time.sleep(.2)
 save('CORE_POLICY_READINESS_PHASE_ACTUAL.json',{'phase':lastGo['phase'],'qualified':coreSocketReady is not None});need(coreSocketReady is not None,'ORIGINAL_COMMON_OWNED_CORE_POLICY_SOCKET_START_TIMEOUT');save('ORIGINAL_CORE_POLICY_SOCKET_READY_ACK.json',coreSocketReady)
 cmd(['/usr/bin/systemctl','start',GO],timeout=10);deadline=time.monotonic()+15;goPhysical=None;lastGo={'phase':'WAIT_EXACT_EXEC_NETNS','finalQualified':False}
 while time.monotonic()<deadline:
  go=show(GO);lastGo.update(activeState=go['ActiveState'],mainPID=go['MainPID']);need(go['ActiveState']in('activating','active'),'ORIGINAL_GO_START_FAILED_CLOSED');pid=int(go['MainPID'])
  if pid>0:
   try:
    # MainPID can temporarily name the systemd pre-exec child. Admission must
    # wait for the exact executable/netns, then still require strict cap0/NNP.
    same=os.readlink(Path('/proc',str(pid),'ns/net'))==netns and os.readlink(Path('/proc',str(pid),'exe'))==str(RELEASE/'bin/nostr-native-registry')
    if same:
     lastGo['phase']='EXACT_EXEC_NETNS_WAIT_CAP0_NNP';gp=process(pid);socketIds=set()
     for ownfd in Path('/proc',str(pid),'fd').iterdir():
      try:link=os.readlink(ownfd)
      except FileNotFoundError:continue
      match=re.fullmatch(r'socket:\[(\d+)\]',link)
      if match:socketIds.add(match[1])
     listen=any(row.split()[1]=='0100007F:'+format(18990,'04X')and row.split()[3]=='0A'and row.split()[9]in socketIds for row in Path('/proc',str(pid),'net/tcp').read_text().splitlines()[1:]);lastGo.update(phase='STRICT_PROCESS_WAIT_OWN_LISTENER',uid=gp['uid'],noNewPrivs=gp['noNewPrivs'],capMasks=gp['capMasks'],ownedListener=listen)
     if listen and gp['uid']==1000 and process(pid)==gp and os.readlink(Path('/proc',str(pid),'exe'))==str(RELEASE/'bin/nostr-native-registry')and os.readlink(Path('/proc',str(pid),'ns/net'))==netns:goPhysical=gp;lastGo.update(phase='FINAL_QUALIFIED',finalQualified=True);break
   except FileNotFoundError:lastGo['phase']='PROCESS_CHANGED_DURING_START'
   except RuntimeError as error:
    if str(error)!='EXACT_CAP0_NNP_PROCESS':raise
    lastGo['phase']='EXACT_EXEC_NETNS_WAIT_CAP0_NNP'
  time.sleep(.2)
 save('GO_READINESS_PHASE_ACTUAL.json',lastGo);need(goPhysical is not None,'ORIGINAL_GO_STRICT_CAP0_NNP_OWN_LISTENER_START_TIMEOUT');save('ORIGINAL_GO_PHYSICAL_READY_ACK.json',{'process':goPhysical,'loopback18990Listening':True,'sameMemberNamespace':True});fresh_fence();anchor_current();sdk10_current();cmd(['/usr/bin/systemctl','start','--no-block',SDK],timeout=3);sv=q['wait_original_manager25']();sp=process(int(sv['MainPID']));need(sv['UID']=='61304'and sv['InvocationID']!=before[SDK]['InvocationID']and sv['InvocationID']not in('1ba220459bf94c4183fcb086c9327aaa','2d383d519502435b810f30a75fa7c499'),'ACTUAL_NEW_ORIGINAL_SDK_REQUIRED');preflight=q['original_preflight34_and_namespace'](sp['pid'],sv['InvocationID'],r['originalFiveReadOnlyBindings'])
 # Prove the real SDK mount namespace, not merely the host-UID ACL.
 sdkMounts=[line.split()for line in Path('/proc',str(sp['pid']),'mountinfo').read_text().splitlines()];srvRows=[row for row in sdkMounts if row[4]=='/srv'];releaseRows=[row for row in sdkMounts if row[4]==str(RELEASE)];need(len(srvRows)==len(releaseRows)==1 and 'ro'in srvRows[0][5].split(',')and srvRows[0][srvRows[0].index('-')+1]=='tmpfs'and 'ro'in releaseRows[0][5].split(','),'ACTUAL_SDK_EMPTY_READONLY_SRV_AND_PUBLIC_BIND')
 sourceStat=RELEASE.stat();insideStat=Path('/proc',str(sp['pid']),'root',str(RELEASE).lstrip('/')).stat();need((sourceStat.st_dev,sourceStat.st_ino)==(insideStat.st_dev,insideStat.st_ino),'ACTUAL_SDK_PUBLIC_RELEASE_SAME_INODE');save('SDK10_ACTUAL_PUBLIC_SOURCE_NAMESPACE_ACK.json',{'emptyReadonlySrv':True,'singleReadonlyPublicRelease':True,'sameSourceInode':True,'originalOtherBindingsPreserved':True,'sdkInvocation':sv['InvocationID']})
 sdk={'unit':SDK,'invocationId':sv['InvocationID'],'pid':sp['pid'],'startedMonotonicUSec':int(sv['ExecMainStartTimestampMonotonic']),'uid':61304};actual={'id':newcid,'image':c['Image'],'process':cp,'pidNamespaceInode':ns('pid'),'networkNamespaceInode':ns('net'),**{key:u['canon'](c[field])for field,key in [('Config','configSHA256'),('HostConfig','hostConfigSHA256'),('Mounts','mountsSHA256')]}}
 anchor_current();observedAnchor=u['inspect'](ANCHOR);anchorPhysical=process(observedAnchor['State']['Pid']);need(anchorPhysical==ap,'EXACT_CURRENT_OWN_MEMBER_ANCHOR_PROCESS')
 anchorEndpoints=[e for e in observedAnchor['NetworkSettings']['Networks'].values()if e['NetworkID']==wp['appNetwork']['id']]
 need(len(anchorEndpoints)==1 and anchorEndpoints[0]['IPAddress']=='172.24.0.2','EXACT_ORIGINAL_APP_NETWORK_CURRENT_MEMBER_ENDPOINT')
 anchorKeys=set(wp['common']['namespaceAnchor']['process']);need(anchorKeys<=set(anchorPhysical),'ORIGINAL_ANCHOR_PROCESS_SCHEMA_PRESERVED')
 ownedAnchor={'id':ANCHOR,'process':{k:anchorPhysical[k]for k in anchorKeys},'appEndpointSHA256':sha(canon(anchorEndpoints[0])),'networkNamespaceInode':int(netns.split('[')[1][:-1])}
 new=runpy.run_path(str(HERE/'derive_exact_member46_anchor_generation.candidate.py'))['derive'](wp,owner,policy,start,actual_common=actual,actual_anchor=ownedAnchor,expected_anchor_id=ANCHOR,sdk=sdk,sdk_process=sp,boot_id=str(uuid.uuid4()),qualified_public_addons=addons,qualified_policy_addons=policyaddons)
 code='/opt/crays/openclaw/personal-services/crays-native-profile-runtime-v1/code/infra/openclaw/candidates/native-core-sdk-profile-deployment-v0.1.6/';validate="import fs from 'node:fs';import{captureProfileDeploymentPolicy}from '"+code+"endpoint-currentness.mjs';import{captureSupervisorStartDescriptor}from '"+code+"start-descriptor.mjs';const x=JSON.parse(fs.readFileSync(0,'utf8'));captureProfileDeploymentPolicy(x.policy);captureSupervisorStartDescriptor(x.start);";v=subprocess.run(['/usr/bin/docker','--config',str(q['BASE']/'empty-docker-config'),'exec','--interactive','--user','1000:1000',newcid,'node','--input-type=module','-e',validate],input=canon({'policy':json.loads(new['DEPLOYMENT.json']),'start':json.loads(new['START.json'])}),capture_output=True,timeout=5,env={'PATH':'/usr/bin:/bin','LANG':'C'});need(v.returncode==0 and not v.stdout,'ORIGINAL_PURE_SCHEMA_VALIDATION_REQUIRED')
 anchor_current();need(process(cp['pid'])==cp and process(sp['pid'])==sp,'PUBLICATION_PROCESS_CONTINUITY_REQUIRED')
 for name in ['PUBLIC_PROCESS_BINDING.root.json','OWNER_BINDING.json','DEPLOYMENT.json']:
  need(not os.path.lexists(PATHS[name]),'EXCLUSIVE_NEW_GENERATION_CONTROL_REQUIRED');save(name+'.PUBLICATION_INTENT.json',{'name':name,'sha256':sha(new[name])});q['put'](PATHS[name],new[name],oldmodes[name]);controlsWritten.append(name);save(name+'.PUBLICATION_ACK.json',{'name':name,'sha256':sha(new[name])})
 cmd(['/usr/bin/systemctl','start',WITNESS],timeout=10);need(show(WITNESS)['ActiveState']=='active','ORIGINAL_NEW_WITNESS_REQUIRED');socket=Path('/run/crays-chuck-core-currentness/status.sock');deadline=time.monotonic()+15
 while not socket.exists():need(time.monotonic()<deadline,'ORIGINAL_WITNESS_SOCKET_TIMEOUT');time.sleep(.2)
 ws=socket.lstat();need(stat.S_ISSOCK(ws.st_mode)and ws.st_uid==ws.st_gid==1000 and stat.S_IMODE(ws.st_mode)==0o600,'ORIGINAL_WITNESS_SOCKET_CUSTODY_REQUIRED');wstate=show(WITNESS);need(wstate['InvocationID']!=before[WITNESS]['InvocationID']and int(wstate['MainPID'])>0,'ACTUAL_NEW_ORIGINAL_WITNESS_REQUIRED');wfd=set()
 for fd in Path('/proc',wstate['MainPID'],'fd').iterdir():
  try:link=os.readlink(fd)
  except FileNotFoundError:continue
  match=re.fullmatch(r'socket:\[(\d+)\]',link)
  if match:wfd.add(match[1])
 need(len([z for z in (x.split(maxsplit=7)for x in Path('/proc/net/unix').read_text().splitlines()[1:])if len(z)==8 and z[7]==str(socket)and z[6]in wfd and int(z[3],16)&0x10000])==1,'NEW_ORIGINAL_WITNESS_PHYSICAL_LISTENER_REQUIRED');save('START_PUBLICATION_INTENT.json',{'name':'START.json','sha256':sha(new['START.json'])});q['put'](PATHS['START.json'],new['START.json'],oldmodes['START.json']);controlsWritten.append('START.json');save('START_PUBLICATION_ACK.json',{'name':'START.json','sha256':sha(new['START.json'])});published=True
 deadline=time.monotonic()+60;ready=False
 while time.monotonic()<deadline:
  need(show(SDK)['InvocationID']==sdk['invocationId']and show(SDK)['MainPID']==str(sp['pid']),'ORIGINAL_NEW_SDK_GENERATION_CONTINUITY')
  ready=any(row.split()[1]=='010018AC:'+format(policy['port'],'04X')and row.split()[3]=='0A'for row in Path('/proc/net/tcp').read_text().splitlines()[1:])
  if ready:break
  time.sleep(.2)
 need(ready and process(cp['pid'])==cp and process(sp['pid'])==sp and all(show(x)['ActiveState']=='active'for x in [*BROKERS,WITNESS,GO,STS]),'ORIGINAL_NEW_FAMILY_LISTENER_READY_REQUIRED');anchor_current();need(all(stable(PATHS[n])==new[n]for n in PATHS),'EXACT_NEW_SOURCE_GENERATION_CHAIN_REQUIRED');save('RESULT_ACTUAL.json',{'status':'COMMON25_ORIGINAL_FULL_SOURCE_GENERATION_READY_CUSTOMER_ACCEPTANCE_PENDING','oldCommonRetained':OLD,'newCommon':newcid,'actualCommon':actual,'sdk':sdk,'originalPreflight':preflight,'controlsSHA256':{n:sha(b)for n,b in new.items()},'newMember26AnchorStableWithinGeneration':True,'sameMemberNetnsGoAndCommon':True,'originalOwnerScopeAndStateCredentialsPreserved':True,'fixturePrincipalCreated':False,'modelCalls':0,'customerAcceptance':False,'replayAllowed':False});return {'status':'MEMBER51_ORIGINAL_FULL_SOURCE_GENERATION_READY','newCommon':newcid,'sdk':sdk,'controlsSHA256':{n:sha(b)for n,b in new.items()},'customerAcceptance':False}
