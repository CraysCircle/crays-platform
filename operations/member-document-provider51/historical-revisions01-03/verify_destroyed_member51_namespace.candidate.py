"""Read-only exact destroyed-original-namespace proof for closed Member51 intent."""
from pathlib import Path
import os,stat
def verify(pre,u,need):
 old=pre['containers']['member'];inode=int(old['netns'].split('[')[1][:-1]);sandbox=Path(old['NetworkSettings']['SandboxKey'])
 need(not sandbox.exists(),'ORIGINAL_DOCKER_SANDBOX_MUST_BE_ABSENT')
 for role,row in pre['containers'].items():
  c=u['inspect'](row['id']);need(not c['State']['Running'] and c['State']['Pid']==0,'ALL_ORIGINAL_FAMILY_PHYSICALLY_TERMINAL')
  cg=Path('/sys/fs/cgroup/system.slice')/('docker-'+row['id']+'.scope')
  if cg.exists():need(all(not p.read_text().strip()for p in cg.rglob('cgroup.procs')),'ORIGINAL_FAMILY_CGROUP_EMPTY')
 for row in pre['namespaceHolders']:
  p=Path('/proc',str(row['pid']))
  if p.exists():
   try:need(p.joinpath('stat').read_text().rsplit(')',1)[1].split()[19]!=str(row['ticks']),'ORIGINAL_NAMESPACE_PROCESS_STILL_LIVE')
   except (FileNotFoundError,ProcessLookupError):pass
 for p in Path('/proc').iterdir():
  if not p.name.isdigit():continue
  try:
   need(p.joinpath('ns/net').stat().st_ino!=inode,'ORIGINAL_NETWORK_NAMESPACE_HAS_PROCESS_HOLDER')
   for fd in (p/'fd').iterdir():
    try:
     target=os.readlink(fd)
     need(target!='net:['+str(inode)+']' and target!='/proc/'+str(old['process']['pid'])+'/net/unix','ORIGINAL_NETWORK_NAMESPACE_HAS_OPEN_FD')
    except (FileNotFoundError,ProcessLookupError):pass
  except (FileNotFoundError,ProcessLookupError):pass
 for line in Path('/proc/self/mountinfo').read_text().splitlines():
  text=line.split()[4].replace('\\040',' ').replace('\\011','\t').replace('\\134','\\')
  try:need(Path(text).stat().st_ino!=inode,'ORIGINAL_NETWORK_NAMESPACE_STILL_MOUNTED')
  except (FileNotFoundError,ProcessLookupError):pass
 paths=['/run/crays/nostr-core-runtime-v1/policy/policy.sock','/run/crays/nostr-core-runtime-v1/registry/control.sock','/run/crays-chuck-core-currentness/status.sock']
 need(all(not os.path.lexists(p)for p in paths),'RECOVERY_ONLY_ALREADY_ABSENT_ORIGINAL_SOCKET_PATHS')
 return {'originalNetns':old['netns'],'originalSandboxAbsent':True,'originalFamilyAndNamespaceHoldersTerminal':True,'originalNetnsProcessFDAndMountAbsent':True,'allThreeSocketPathsAbsent':True,'oldNamespaceTableSubstituted':False}
