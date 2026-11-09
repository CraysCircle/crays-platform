"""Exact Member51 namespace lifetimes: immutable prior destruction, current owned processes."""
from pathlib import Path
import os,stat,json,hashlib
O=Path('/srv/crays/acceptance/member51-family-adoption-20261109-01')
H=Path('/srv/crays/migration-work/20261109/root/member-document-provider51-lifecycle-source01')
NEW={'member':'a3ac8493303614ff53079c006e3dcdcfc4d751a5e86731b65a442be163138590','common':'6f787c2639726c1d85ed4d07fb43eabab12aad61feca004d2863438ca7542583','work':'99f0e5118f1b01417e7f2bb4efa364ac77d31b796cd35ed128c4330a244fe7e3'}
PINS={'INTENT.json':'6da68ec6eded74f4ff59ae6b8f6ed1f8abab854774d372026acb73a9fd42c273','CLOSED_FAILURE.json':'a7e9506be0a6901f47569a385b85021666d6bf5bd39ba1d7baec852a1f6e32b0','GO_NETNS_REBIND_INTENT.json':'71e2ad2861061142b266112fa0868aa7873ea49bc4ef18fdb4aa6836eb074a37','GO_NETNS_REBOUND_ACTUAL.json':'00cdd794ddb5981f862b39073a81db18fc418e8e9704396a81121761d988fa15'}
def read(p,need,pin=None):
 fd=os.open(p,os.O_RDONLY|os.O_NOFOLLOW|os.O_NONBLOCK)
 try:
  a=os.fstat(fd);need(stat.S_ISREG(a.st_mode)and a.st_uid==0 and a.st_nlink==1 and not a.st_mode&0o077 and 0<a.st_size<131072,'EXACT_ROOT_LIFETIME_RECEIPT_CUSTODY')
  raw=os.read(fd,a.st_size+1);b=os.fstat(fd);c=p.lstat()
  need(len(raw)==a.st_size and (a.st_dev,a.st_ino,a.st_size,a.st_mtime_ns)==(b.st_dev,b.st_ino,b.st_size,b.st_mtime_ns)==(c.st_dev,c.st_ino,c.st_size,c.st_mtime_ns),'LIFETIME_RECEIPT_STABLE')
  if pin:need(hashlib.sha256(raw).hexdigest()==pin,'EXACT_PRIOR_LIFETIME_RECEIPT_SHA')
  return json.loads(raw)
 finally:os.close(fd)
def gone(pid,ticks,need):
 p=Path('/proc',str(pid),'stat')
 try:need(p.read_text().rsplit(')',1)[1].split()[19]!=str(ticks),'PRIOR_NAMESPACE_PROCESS_LIFETIME_STILL_LIVE')
 except (FileNotFoundError,ProcessLookupError):pass
def terminal(cid,u,need):
 c=u['inspect'](cid);need(not c['State']['Running']and c['State']['Pid']==0,'EXACT_NAMESPACE_OWNER_TERMINAL')
 cg=Path('/sys/fs/cgroup/system.slice')/('docker-'+cid+'.scope')
 if cg.exists():need(all(not p.read_text().strip()for p in cg.rglob('cgroup.procs')),'EXACT_NAMESPACE_OWNER_CGROUP_EMPTY')
 return c
def verify(pre,u,need,current=None):
 prior=O/'same-intent-forward01'
 r={n:read(prior/n,need,pin)for n,pin in PINS.items()}
 initial=r['INTENT.json'];failure=r['CLOSED_FAILURE.json'];rebind=r['GO_NETNS_REBIND_INTENT.json'];ack=r['GO_NETNS_REBOUND_ACTUAL.json']
 need(initial['newIds']==failure['newIds']==NEW and initial['automaticReplayAllowed']is False and initial['noCreateArchiveRenameRegistryWitnessReplay']is True,'EXACT_PRIOR_FORWARD01_INTENT')
 d=initial['oldNamespace']
 need(d['originalNetns']==pre['containers']['member']['netns']and all(d.get(k)is True for k in ['allThreeSocketPathsAbsent','originalFamilyAndNamespaceHoldersTerminal','originalNetnsProcessFDAndMountAbsent','originalSandboxAbsent'])and d.get('oldNamespaceTableSubstituted')is False,'IMMUTABLE_PRESTART_ORIGINAL_NAMESPACE_DESTRUCTION')
 need(failure['guard']=='ORIGINAL_NETWORK_NAMESPACE_HAS_PROCESS_HOLDER'and failure['cleanupErrors']==[]and failure['ingressReopenForbidden']is True and failure['automaticReplayAllowed']is False,'EXACT_CLOSED_FORWARD01_FAILURE')
 need(rebind['newMember']==ack['newMember']==NEW['member']and rebind['newPID']==2192471 and str(rebind['newStartTicks'])=='34890489'and rebind['priorInode']==4026533828 and rebind['newNamespaceInode']==ack['newNamespaceInode']==4026532415,'EXACT_ACKNOWLEDGED_NEW_NAMESPACE_WITH_RECYCLED_INODE')
 proof=read(H/'RECOVERY51_FORWARD01_NAMESPACE_REUSE_READONLY_ACTUAL.json',need,'7b2eb0a50cc4972f6ea14b2e9d03eff761387e54f93cb625fe8a22a7ca491015')
 need(proof['originalMemberNetns']==d['originalNetns']and proof['originalSandboxKeyExists']is False and proof['generationOutputPresent']is False and proof['currentOriginalInodeHolders']==[]and proof['currentOriginalInodeFDs']==[]and proof['currentGoBindInode']==ack['newNamespaceInode'],'EXACT_POST_CLEANUP_REUSED_NAMESPACE_METADATA')
 need(all(not x['state']['Running']and x['state']['Pid']==0 and x['cgroupProcessCount']==0 for x in proof['containers'])and len(proof['containers'])==6,'EXACT_SIX_TERMINAL_POST_FORWARD01_EVIDENCE')
 for n,pin in PINS.items():need(proof['receipts'][n]['sha256']==pin,'PROVENANCE_RECEIPT_CHAIN')
 need(not(prior/'generation').exists(),'FORWARD01_NEVER_REACHED_GENERATION')
 for role,row in pre['containers'].items():
  terminal(row['id'],u,need)
  gone(row['process']['pid'],row['process']['startTicks'],need)
 for row in pre['namespaceHolders']:gone(row['pid'],row['ticks'],need)
 gone(rebind['newPID'],rebind['newStartTicks'],need)
 need(not Path(pre['containers']['member']['NetworkSettings']['SandboxKey']).exists(),'ORIGINAL_SANDBOX_REMAINS_ABSENT')
 common=terminal(NEW['common'],u,need);need(common['State']['Status']=='created'and common['State']['StartedAt'].startswith('0001-'),'SAME_COMMON_NEVER_STARTED_BEFORE_FRESH_GENERATION')
 paths=['/run/crays/nostr-core-runtime-v1/policy/policy.sock','/run/crays/nostr-core-runtime-v1/registry/control.sock','/run/crays-chuck-core-currentness/status.sock']
 need(all(not os.path.lexists(p)for p in paths),'ONLY_ALREADY_ABSENT_ORIGINAL_SOCKET_PATHS')
 go=Path('/run/crays/nostr-core-runtime-v1/network/common.netns')
 if current is None:
  for role in ['member','work']:terminal(NEW[role],u,need)
  need(go.stat().st_ino==ack['newNamespaceInode'],'EXACT_PRIOR_FORWARD01_GO_ACK_STILL_BOUND')
 else:
  out=O/'same-intent-forward02';need(current.get('recoveryOutput')==str(out),'EXACT_OWN_FORWARD02_CONTEXT')
  ownIntent=read(out/'INTENT.json',need);need(ownIntent['newIds']==NEW and ownIntent['automaticReplayAllowed']is False,'EXACT_OWN_FORWARD02_INTENT')
  ns=None
  for role,key in [('member','newMemberProcess'),('work','newWorkProcess')]:
   c=u['inspect'](NEW[role]);p=current[key]
   need(c['State']['Running']and c['State']['Pid']==p['pid'],'EXACT_CURRENT_OWN_NAMESPACE_PROCESS')
   actual=Path('/proc',str(p['pid']))
   need(actual.joinpath('stat').read_text().rsplit(')',1)[1].split()[19]==str(p['startTicks']),'EXACT_CURRENT_OWN_NAMESPACE_PROCESS_LIFETIME')
   need(actual.joinpath('cgroup').read_text().strip()=='0::/system.slice/docker-'+NEW[role]+'.scope','EXACT_CURRENT_OWN_DOCKER_CGROUP')
   value=(actual.joinpath('ns/net').stat().st_dev,actual.joinpath('ns/net').stat().st_ino)
   if ns is None:ns=value
   else:need(value==ns and c['HostConfig']['NetworkMode']=='container:'+NEW['member'],'EXACT_CURRENT_OWN_SHARED_NAMESPACE')
  ownRebind=read(out/'GO_NETNS_REBIND_INTENT.json',need);ownAck=read(out/'GO_NETNS_REBOUND_ACTUAL.json',need);p=current['newMemberProcess']
  need(ownRebind['newMember']==ownAck['newMember']==NEW['member']and ownRebind['newPID']==p['pid']and str(ownRebind['newStartTicks'])==str(p['startTicks'])and ownRebind['newNamespaceInode']==ownAck['newNamespaceInode']==ns[1],'EXACT_CURRENT_FORWARD02_REBIND_PROCESS_RECEIPTS')
  need((go.stat().st_dev,go.stat().st_ino)==ns,'EXACT_CURRENT_OWN_MEMBER_GO_NAMESPACE_BIND')
 return {'originalNamespaceDestroyedBeforeAnyNewStart':True,'originalProcessLifetimesAndSandboxRemainGone':True,'priorForward01ReceiptsBound':PINS,'originalNumericInodeReuseExplicitlyProven':True,'allThreeSocketPathsAbsent':True,'currentOwnedNamespacePhysicalProof':current is not None,'oldNamespaceTableSubstituted':False}
