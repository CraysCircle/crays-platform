"""Same closed Member51 intent: no create, archive, rename, registry or witness replay."""
from pathlib import Path
import os,stat,json,runpy,sys,signal,time
H=Path(__file__).resolve().parent
m=runpy.run_path(str(H/'member51_lifecycle.candidate.py'))
need,stable,sha,put=m['need'],m['stable'],m['sha'],m['put']
O=m['OUT'];R=O/'same-intent-forward01'
NEW={'member':'a3ac8493303614ff53079c006e3dcdcfc4d751a5e86731b65a442be163138590','common':'6f787c2639726c1d85ed4d07fb43eabab12aad61feca004d2863438ca7542583','work':'99f0e5118f1b01417e7f2bb4efa364ac77d31b796cd35ed128c4330a244fe7e3'}
def own(phase,r):
 need(os.getuid()==0 and Path('/sys/devices/virtual/dmi/id/board_asset_tag').read_text().strip()=='i-0eb300e1b02414d8f','EXACT_AWS_ROOT_HOST_REQUIRED')
 need(r.get('executionApproved')is True and r.get('controllerSHA256')==sha(stable(Path(__file__),131072))and r.get('independentReviewSHA256')and r.get('phase')==phase,'EXACT_PHASE_ROOT_INDEPENDENT_REVIEW_REQUIRED')
 for name,h in r['sourcePins'].items():need(Path(name).name==name and sha(stable(H/name,131072))==h,'EXACT_SOURCE26_PINS_REQUIRED')
 need(os.environ.get('INVOCATION_ID')and r.get('freshExclusiveWindowApproved')is True and 0<r['windowExpiresAtUnix']-time.time()<=600,'FRESH_ROOT_EXCLUSIVE_WINDOW_REQUIRED')
 unit='crays-member51-'+phase+'-20261109-01.service';cg=Path('/sys/fs/cgroup')/Path('/proc/self/cgroup').read_text().strip().split(':',2)[-1].lstrip('/')
 need(cg.name==unit and int((cg/'memory.max').read_text())<=1073741824 and int((cg/'memory.swap.max').read_text())==0 and int((cg/'pids.max').read_text())<=128,'EXACT_PHASE26_RESOURCE_CGROUP_REQUIRED')
 quota,period=(cg/'cpu.max').read_text().split();need(quota!='max'and int(quota)/int(period)<=.5,'FINITE_HALF_CPU_REQUIRED')

 fence=stable('/srv/crays/migration-work/20261108/root/ROOT_HEAVY_ATTEMPT_ACTIVE.json',16384,True);need(sha(fence)==r['rootHeavyFenceSHA256']and json.loads(fence).get('unit')==unit,'EXACT_OWN42_ROOT_WINDOW_FENCE')



def main(r):
 own('recover',r)
 u,q,_=m['modules']()
 preRaw=stable(m['PRE'],16777216,True);need(sha(preRaw)==r['preimageSHA256'],'ORIGINAL_CAPTURE_PREIMAGE_REQUIRED');pre=json.loads(preRaw)
 m['current50_binding']()
 fail=stable(O/'CLOSED_FAILURE.json',131072,True)
 need(sha(fail)=='a14e23b991c508e4456c2f61d7a06e11f298d8ecc6a85d2bbdf4dbc42009c7bc','EXACT_SINGLE_FAILED51_INTENT_REQUIRED')
 fv=json.loads(fail);need(fv['newIds']==NEW and fv['cleanupErrors']==[] and fv['fullGenerationPublished']is False and fv['guard']=='EXACT_CURRENT_FULL46_64_62_SOURCE_CLOSURE','EXACT_PRE_SOCKET_PRE_PUBLICATION_FAILURE')
 need(not R.exists()and not(O/'generation').exists()and not(O/'RESULT_ACTUAL.json').exists(),'ONE_FORWARD_INTENT_NO_REPLAY')
 for n,p in m['PATHS'].items():
  need(not p.exists()and sha(stable(O/('prior11-'+n)))==pre['controlsSHA256'][n],'ORIGINAL_ARCHIVES_RETAINED_NO_LIVE_CONTROLS')
 stageRaw=stable(m['RELEASE']/'STAGE_ACTUAL.json');need(sha(stageRaw)==r['stageActualSHA256'],'EXACT_ALREADY_STAGED51')
 stage=json.loads(stageRaw);manifestRaw=stable(m['RELEASE']/'RELEASE_MANIFEST.json');need(sha(manifestRaw)==stage['releaseManifestSHA256'],'EXACT_STAGED_MANIFEST')
 release=json.loads(manifestRaw)
 for rel,row in release['files'].items():need(sha(stable(m['RELEASE']/rel,67108864))==row['sha256'],'IMMUTABLE51_RELEASE_BYTES')
 need(stage['buildId']=='Em8YqZapuRa58BfKC5hRh','ACTUAL_COMPLETED51_BUILD')
 release['registry']={'path':str(m['REGISTRY']),'sha256':release['files']['common/MODULE_REGISTRY.member51.json']['sha256'],'bytes':release['files']['common/MODULE_REGISTRY.member51.json']['bytes']}
 need(sha(stable(m['REGISTRY']))==release['registry']['sha256'],'EXISTING_SDK_REGISTRY51_MIRROR_UNCHANGED')
 common=Path('/srv/crays/releases/nostr-original-core-addon-20261108-18/common-machine57/common-host.native-graphql49.candidate.cjs')
 release['commonSource']={'path':str(common),'sha256':sha(stable(common)),'bytes':len(stable(common))}
 need(release['commonSource']['sha256']=='f726cd9fb8a44309408da26f5d1ad621ef8de127028cf2d9f2b4fa09f44742f1','CURRENT_COMMON49_PRESERVED')
 anonymous=json.loads(stable(O/'MEMBER51_ANONYMOUS_ACTUAL.json',32768))
 need(anonymous['buildId']==stage['buildId']and anonymous['status']=='CANONICAL_MEMBER_PRIVATE_ANONYMOUS_BOUNDARIES_AND_ORIGINAL_SDK_TRANSACTION_PASS'and anonymous['customerCoreReadOrWritePerformed']is False,'EXISTING_GENUINE51_ANONYMOUS_PASS')
 crRaw=stable(r['originalCommon11RootReviewPath'],131072,True);need(sha(crRaw)==r['originalCommon11RootReviewSHA256'],'ORIGINAL_COMMON_APPROVED_INPUTS');cr=json.loads(crRaw)
 need(cr['executionApproved']is True and cr['controllerSHA256']=='d4c4cd040b449821e285b89ba8d2f8de6774449c1cf1485f131ccbd26b2c570d','ORIGINAL_COMMON11_APPROVAL')
 ingress=stable(r['ingressClosedActualPath'],131072,True);need(sha(ingress)==r['ingressClosedActualSHA256'],'ACTUAL_CLOSED_INGRESS')
 iv=json.loads(ingress);need(iv.get('memberCommonWorkPrivateIngressClosed')is True and iv.get('allOtherSitesPreserved')is True and iv.get('sharedEdgeOwnedByRoot')is True,'EXACT_PRIVATE_INGRESS_CLOSED')
 def fresh():
  fraw=stable(r['sourceFencePath'],16384,True);need(sha(fraw)==r['sourceFenceSHA256'],'FRESH_SOURCE_FENCE_SHA');f=json.loads(fraw)
  need(f.get('sourceArchiveSHA256')=='71084517d7378bb3b6125e161135bd71d921f6ad63b187b9b790cb645f85c53a'and f.get('sourceWriterFenceStillEffective')is True and f.get('originalSourceUnitsPhysicallyStopped')is True and f.get('sourceRestartApproved')is False and 0<=time.time()-f['observedAtUnix']<=120,'FRESH_ORIGINAL_SOURCE_FENCE')
 def units_terminal():
  for n in m['UNITS']:
   s=q['show'](n);need(s['MainPID']=='0'and s['ActiveState']in('inactive','failed'),'OWN_SIX_UNITS_TERMINAL')
   cg=Path('/sys/fs/cgroup/system.slice')/n
   if cg.exists():need(all(not p.read_text().strip()for p in cg.rglob('cgroup.procs')),'OWN_SIX_CGROUPS_EMPTY')
 units_terminal();fresh()
 for p,h in pre['unitFilesSHA256'].items():need(sha(stable(p,2097152))==h,'ALL_EXISTING_ORIGINAL_UNIT_FILES_UNCHANGED')
 w=json.loads(stable(O/'WITNESS42_SOURCE_AND_DROPIN_ACTUAL.json'))
 ws=m['RELEASE']/'witness-currentness51/serve_exact_member51_common_currentness.py'
 wd=Path('/etc/systemd/system/crays-chuck-core-currentness.service.d/zzzzz.member51-owned-anchor.conf')
 need(sha(stable(ws))==w['sourceSHA256']and sha(stable(wd))==w['dropinSHA256']and m['witness_argv']()=='/usr/bin/python3 -I -B '+str(ws),'EXISTING51_WITNESS_ACK_UNCHANGED')
 plans={};mounts={}
 for role,cid in NEW.items():
  ack=json.loads(stable(O/(role+'_CREATED.json'),16777216,True));need(ack['id']==cid,'EXACT_CREATED51_CID')
  intent=json.loads(stable(O/(role+'_CREATE_INTENT.private.json'),16777216,True));plans[role]=intent['payload'];mounts[role]={k:tuple(v)for k,v in intent['expectedMounts'].items()}
  c=m['admit_created'](u,cid,plans[role],mounts[role],role,pre['containers'][role],NEW['member'])
  need(not c['State']['Running']and c['State']['Pid']==0 and c['Name']==pre['containers'][role]['Name'],'SAME_CREATED_CID_TERMINAL_AND_CANONICAL_NAME')
  need(u['canon'](c['Config'])==ack['configSHA256']and u['canon'](c['HostConfig'])==ack['hostConfigSHA256']and u['canon'](c['Mounts'])==ack['mountsSHA256'],'EXACT_CREATED_CONFIG_HOST_MOUNT_ACK')
 verify=runpy.run_path(str(H/'verify_destroyed_member51_namespace.candidate.py'))['verify']
 destroyed=verify(pre,u,need)
 go=Path('/run/crays/nostr-core-runtime-v1/network/common.netns')
 goAck=json.loads(stable(O/'GO_NETNS_REBOUND_ACTUAL.json'));need(goAck['newMember']==NEW['member']and go.stat().st_ino==goAck['newNamespaceInode'],'EXISTING_NEW_GO_BIND_ACK')
 R.mkdir(mode=0o700);m['sync'](R.parent);put(R/'INTENT.json',{'status':'SAME_MEMBER51_CREATED_FAMILY_FORWARD_ONCE','newIds':NEW,'oldNamespace':destroyed,'noCreateArchiveRenameRegistryWitnessReplay':True,'automaticReplayAllowed':False})
 def save(n,v):put(R/n,v)
 signal.signal(signal.SIGTERM,lambda*a:(_ for _ in()).throw(KeyboardInterrupt()))
 signal.signal(signal.SIGINT,lambda*a:(_ for _ in()).throw(KeyboardInterrupt()))
 try:
  fresh();verify(pre,u,need)
  u['api']('POST','/containers/'+NEW['member']+'/start',statuses=(204,))
  member=m['admit_created'](u,NEW['member'],plans['member'],mounts['member'],'member',pre['containers']['member'],NEW['member'])
  need(member['State']['Running'],'SAME_MEMBER_RUNNING');ap=q['process'](member['State']['Pid'])
  ep=plans['member']['NetworkingConfig']['EndpointsConfig'];nets=member['NetworkSettings']['Networks'];need(set(nets)==set(ep),'EXACT_FIVE_NETWORKS')
  for n,e in ep.items():
   v=nets[n];prior=pre['containers']['member']['NetworkSettings']['Networks'][n]
   need(v['NetworkID']==prior['NetworkID']and v['IPAddress']==e['IPAMConfig']['IPv4Address']and v.get('GwPriority',0)==e['GwPriority'],'EXACT_NETWORK_IP_PRIORITY')
   own={NEW['member'],NEW['member'][:12]};need(set(v.get('Aliases')or[])-own==set(e.get('Aliases')or[])-own,'EXACT_NETWORK_ALIASES')
  expectedGW=[v['Gateway']for v in pre['containers']['member']['NetworkSettings']['Networks'].values()if v.get('GwPriority',0)==max(e['GwPriority']for e in ep.values())]
  need(len(expectedGW)==1 and m['default_gateway'](ap['pid'])==expectedGW[0],'EXACT_ORIGINAL_DEFAULT_GATEWAY')
  proc=Path('/proc',str(ap['pid']),'ns/net');before=go.stat()
  save('GO_NETNS_REBIND_INTENT.json',{'priorInode':before.st_ino,'newMember':NEW['member'],'newPID':ap['pid'],'newStartTicks':ap['startTicks'],'newNamespaceInode':proc.stat().st_ino})
  if (before.st_dev,before.st_ino)!=(proc.stat().st_dev,proc.stat().st_ino):
   need(before.st_ino==goAck['newNamespaceInode'],'EXACT_OWN_PRIOR_NEW_GO_NAMESPACE')
   q['cmd'](['/usr/bin/umount',str(go)],timeout=5);base=go.lstat();need(stat.S_ISREG(base.st_mode)and base.st_uid==0 and not base.st_mode&0o077,'ORIGINAL_GO_PLACEHOLDER')
   q['cmd'](['/usr/bin/mount','--bind',str(proc),str(go)],timeout=5)
  need((go.stat().st_dev,go.stat().st_ino)==(proc.stat().st_dev,proc.stat().st_ino),'EXACT_ACTUAL_MEMBER_GO_NAMESPACE')
  save('GO_NETNS_REBOUND_ACTUAL.json',{'newMember':NEW['member'],'newNamespaceInode':proc.stat().st_ino})
  u['api']('POST','/containers/'+NEW['work']+'/start',statuses=(204,))
  work=m['admit_created'](u,NEW['work'],plans['work'],mounts['work'],'work',pre['containers']['work'],NEW['member'])
  need(work['State']['Running'],'SAME_WORK_RUNNING');wp=q['process'](work['State']['Pid'])
  need(os.readlink(Path('/proc',str(wp['pid']),'ns/net'))==os.readlink(proc),'SAME_MEMBER_WORK_NAMESPACE')
  fresh();destroyed=verify(pre,u,need);save('OLD_NAMESPACE_DESTROYED_ACTUAL.json',destroyed)
  ctx={'newMember':NEW['member'],'newCommon':NEW['common'],'newWork':NEW['work'],'expectedCommon':plans['common'],'expectedCommonMounts':mounts['common'],'originalCommon':pre['containers']['common'],'familyPreimage':pre,'registryRow':release['registry'],'output':str(R/'generation'),'parentOutput':str(O),'newMemberProcess':ap,'newWorkProcess':wp,'expectedWork':plans['work'],'expectedWorkMounts':mounts['work'],'oldNetUnixFD':None,'socketPreimages':{p:None for p in ['/run/crays/nostr-core-runtime-v1/policy/policy.sock','/run/crays/nostr-core-runtime-v1/registry/control.sock','/run/crays-chuck-core-currentness/status.sock']},'previousRegistryRow':pre['registryRow'],'commonSourceRow':release['commonSource'],'originalNamespaceDestroyed':True}
  f=runpy.run_path(str(H/'finish_current_member51_generation.rev03.candidate.py'))
  generation=f['finish'](r,cr,ctx)
  result={'status':'MEMBER51_IMMUTABLE_RELEASE_AND_ORIGINAL_FULL_SDK_GENERATION_COMMITTED_INGRESS_REOPEN_PENDING','oldIds':{k:v['id']for k,v in pre['containers'].items()},'newIds':NEW,'buildId':stage['buildId'],'build42ActualSHA256':'ba713db5124d0a76c78c764e0bcacb0bae8e37f7aebc94e53728afeb5a9f1bf5','originalPrincipalUIDPasswordProviderAndTestScopePreserved':True,'customerAuth0DocumentS3Acceptance':False,'otherIndependentNextcloudAndWebsitesUntouched':True,'sharedIngressReopened':False,'generation':generation,'automaticReplayAllowed':False,'sameCreatedFamilyForwardRecovery':True}
  save('RESULT_ACTUAL.json',result);put(O/'RESULT_ACTUAL.json',result)
  return {'status':result['status'],'newIds':NEW,'customerAcceptance':False}
 except BaseException as e:
  signal.signal(signal.SIGTERM,signal.SIG_IGN);signal.signal(signal.SIGINT,signal.SIG_IGN);errors=[]
  try:q['cmd'](['/usr/bin/systemctl','stop',*m['UNITS']],timeout=45);units_terminal()
  except BaseException as z:errors.append(type(z).__name__)
  for role in ('common','work','member'):
   try:
    c=u['inspect'](NEW[role])
    if c['State']['Running']:need(u['halt'](NEW[role],u['physical'](c)),'OWN_SUCCESSOR_PHYSICAL_CLEANUP')
    else:need(c['State']['Pid']==0,'OWN_SUCCESSOR_PID_ZERO')
   except BaseException as z:errors.append(type(z).__name__)
  save('CLOSED_FAILURE.json',{'errorClass':type(e).__name__,'guard':str(e)if isinstance(e,RuntimeError)else None,'cleanupErrors':errors,'newIds':NEW,'ingressReopenForbidden':True,'automaticReplayAllowed':False});raise
if __name__=='__main__':
 try:print(json.dumps(main(json.loads(stable(sys.argv[1],131072,True)))))
 except BaseException as e:
  print(json.dumps({'status':'MEMBER51_FORWARD_STOP_NO_REPLAY','errorClass':type(e).__name__,'guard':str(e)if isinstance(e,RuntimeError)else None}));raise SystemExit(1)
