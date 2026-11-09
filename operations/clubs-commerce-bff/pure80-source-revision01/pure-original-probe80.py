import os,sys,json,stat,hashlib,ast,time,signal,fcntl,datetime,re
from pathlib import Path
CONTROLLER=Path('/srv/crays/migration-work/20261108/business/bff-build80/build80.controller.rev02.py')
CONTROLLER_SHA='2ba93e1f58a2e93549491407bd9d1c0d0d6440fb114df683d10d601e95cd9e52'
ROOT=Path('/srv/crays/migration-work/20261108/root')
LOCK=ROOT/'ROOT_HEAVY_EXECUTION.lock'
FENCE=ROOT/'ROOT_HEAVY_ATTEMPT_ACTIVE.json'
OUT=CONTROLLER.parent/'pure-original-probe01'
WORKER_ACTUAL=CONTROLLER.parent/'build-execution01'/'WORKER_ACTUAL.json'
CLEANUP_ACTUAL=CONTROLLER.parent/'build-execution01'/'PHYSICAL_RETURN_RECOVERY01_ACTUAL.json'
NAME='crays-business-bff80-pure-original-probe01'
LABEL='crays.business.bff80.pure-original-probe'
JS="import {readFileSync,realpathSync} from 'node:fs';\nimport {createHash} from 'node:crypto';\nimport {spawnSync} from 'node:child_process';\nconst check=(v)=>{if(!v)throw new Error('PURE_PROBE_HOLD');};\nconst timer=setTimeout(()=>process.exit(3),12000);\ntry{\n check(process.cwd()==='/app'&&process.execPath==='/usr/local/bin/node'&&realpathSync(process.execPath)==='/usr/local/bin/node'&&process.versions.node==='22.23.2');\n const pins=[[\"package.json\",282,\"78c6b9b0c5a7ed424fba9cb5c81f8b278ea8d8553b58c52b1f41b80de73a2172\"],[\"package-lock.json\",5729,\"3bc3d679850e3e7181dcce08b5f78068e214d937a27a5817756eaa5bd5b7c6ef\"],[\"server.mjs\",11839,\"6d14df24cbb8471bf36270546461ef8c398bdd8ee9e62d880368661d813e04a9\"],[\"lib.mjs\",63459,\"aa171859f5569f4ae52412f4b1ce872d62e55e16c0b4a9ebee6359af343960be\"]];\n for(const [name,size,sha]of pins){const b=readFileSync('/app/'+name);check(b.length===size&&createHash('sha256').update(b).digest('hex')===sha);}\n for(const name of ['server.mjs','lib.mjs']){\n  const r=spawnSync('/usr/local/bin/node',['--check','/app/'+name],{timeout:3000,maxBuffer:4096,env:{PATH:'/usr/local/bin:/usr/bin:/bin',NODE_ENV:'production',NODE_OPTIONS:'',NODE_PATH:''}});\n  check(!r.error&&r.status===0&&r.signal===null&&r.stdout.length===0&&r.stderr.length===0);\n }\n const lib=await import('file:///app/lib.mjs');\n check(lib.CONTRACT_VERSION==='cclub068.clubs-booking-consequence-bff.v1');\n check([\"ClubsCommerceBffError\",\"addHeldItemToVendure\",\"assertSafePublicResponse\",\"claimHoldBoundCart\",\"claimOrderCommand\",\"cancelOrderInVendure\",\"completeHoldBoundCart\",\"completeOrderCommand\",\"decryptVendureSession\",\"encryptVendureSession\",\"issueTestHold\",\"markHoldBoundCartUnknown\",\"markOrderCommandUnknown\",\"parseBrowserRequest\",\"prepareHoldBoundCart\",\"prepareOrderCommand\",\"publicAppliedCart\",\"publicOrderCommand\",\"publicError\",\"readAdapterHealth\",\"readPreparedModels\",\"sha256\",\"settleTestCheckoutInVendure\",\"refundTestPaymentInVendure\",\"verifyTrustedB2cAssertion\"].every(name=>typeof lib[name]==='function'));\n const pg=await import('pg');\n const pkg=JSON.parse(readFileSync('/app/node_modules/pg/package.json','utf8'));\n check(pkg.name==='pg'&&pkg.version==='8.22.0'&&typeof pg.default.Pool==='function'&&typeof pg.default.Client==='function');\n clearTimeout(timer);\n console.log(JSON.stringify({status:'BFF80_PURE_ORIGINAL_SYNTAX_IMPORT_PASS',syntaxFiles:2,imagePublicFileHashes:4,nodeVersion:'22.23.2',pgVersion:'8.22.0',libImport:true,serverNamedImportsResolved:25,pgImport:true,serverImported:false,poolOrClientInstantiated:false,listenerOrNetworkRequest:false,functionalAcceptance:false}));\n}catch{clearTimeout(timer);console.log(JSON.stringify({status:'BFF80_PURE_ORIGINAL_SYNTAX_IMPORT_HOLD'}));process.exitCode=3;}\n"
class Hold(Exception):pass
def need(v,label):
 if not v:raise Hold(label)
def ident(s):return(s.st_dev,s.st_ino,s.st_mode,s.st_uid,s.st_gid,s.st_nlink,s.st_size,s.st_mtime_ns,s.st_ctime_ns)
def stable(path,cap,sha=None):
 fd=os.open(path,os.O_RDONLY|os.O_NOFOLLOW|os.O_CLOEXEC)
 try:
  st=os.fstat(fd);need(stat.S_ISREG(st.st_mode)and st.st_uid==st.st_gid==0 and st.st_nlink==1 and not stat.S_IMODE(st.st_mode)&0o022 and 0<st.st_size<=cap,'PUBLIC_ROOT_FILE_CUSTODY')
  raw=os.read(fd,cap+1);need(len(raw)==st.st_size and ident(st)==ident(os.fstat(fd))==ident(path.lstat()),'PUBLIC_ROOT_FILE_STABLE')
  if sha is not None:need(hashlib.sha256(raw).hexdigest()==sha,'PUBLIC_ROOT_FILE_PIN')
  return raw
 finally:os.close(fd)
def cgroup_empty(cid):
 p=Path('/sys/fs/cgroup/system.slice')/('docker-'+cid+'.scope')
 if not p.exists():return True
 need(p.is_dir()and not p.is_symlink(),'OWN_CGROUP_PATH')
 events=dict(line.split()for line in(p/'cgroup.events').read_text().splitlines())
 need(events.get('populated')in('0','1'),'OWN_CGROUP_EVENTS')
 return events['populated']=='0'
def main():
 admission=globals().get('ROOT_BFF80_PURE_PROBE_ADMISSION')
 fields={'schema','rootHeavyWindowAuthorized','pureProbeAuthorized','notBeforeUTC','notAfterUTC','workerActualSHA256','cleanupActualSHA256','imageId','independentProbeReviewSHA256'}
 need(type(admission)is dict and set(admission)==fields,'EXACT_PROBE_ADMISSION')
 need(admission['schema']=='crays.business.bff80.pure-probe-admission.v1'and admission['rootHeavyWindowAuthorized']is True and admission['pureProbeAuthorized']is True,'ROOT_PROBE_SCOPE')
 need(all(type(admission[k])is str and re.fullmatch('[a-f0-9]{64}',admission[k])for k in('workerActualSHA256','cleanupActualSHA256','independentProbeReviewSHA256'))and re.fullmatch('sha256:[a-f0-9]{64}',admission['imageId']),'EXACT_PROBE_PUBLIC_PINS')
 now=datetime.datetime.now(datetime.timezone.utc);parse=lambda v:datetime.datetime.fromisoformat(v.replace('Z','+00:00'))
 need(parse(admission['notBeforeUTC'])<=now and now+datetime.timedelta(seconds=60)<=parse(admission['notAfterUTC']),'CURRENT_ROOT_PROBE_WINDOW')
 need(os.geteuid()==0 and Path('/sys/devices/virtual/dmi/id/board_asset_tag').read_text().strip()=='i-0eb300e1b02414d8f','EXACT_ROOT_HOST')
 raw=stable(CONTROLLER,65536,CONTROLLER_SHA);need(len(raw)==27542,'EXACT_EXISTING_CONTROLLER_SIZE')
 ns={'__name__':'bff80_probe_existing_guards','__file__':str(CONTROLLER)};exec(compile(raw,str(CONTROLLER),'exec'),ns)
 ns['BUDGET']=time.monotonic()+45
 ns['ENV']={'PATH':'/usr/bin:/bin','DOCKER_HOST':'unix:///var/run/docker.sock','DOCKER_CONFIG':str(ns['CONTEXT'])}
 command=ns['command']
 for p in(Path('/srv'),Path('/srv/crays'),CONTROLLER.parent,ROOT):ns['directory'](p)
 storage=ns['public_bytes'](ns['STORAGE'],262144,ns['STORAGE_SHA']);guard={'__name__':'bff80_probe_existing_storage','__file__':str(ns['STORAGE'])}
 exec(compile(storage,str(ns['STORAGE']),'exec'),guard);guard['verify_data_mount'](Path('/srv/crays'))
 need(not os.path.lexists(OUT),'PROBE_ATTEMPT_EXISTS_NO_REPLAY')
 lockfd=os.open(LOCK,os.O_RDWR|os.O_NOFOLLOW|os.O_CLOEXEC);lockst=os.fstat(lockfd)
 need(stat.S_ISREG(lockst.st_mode)and lockst.st_uid==0 and lockst.st_nlink==1 and not stat.S_IMODE(lockst.st_mode)&0o022 and ident(lockst)==ident(LOCK.lstat()),'ROOT_LOCK_CUSTODY')
 fcntl.flock(lockfd,fcntl.LOCK_EX|fcntl.LOCK_NB)
 fencefd=None;fencest=None;context=None;attempted=False;cid=None;mark=None;success=False;returned=False
 result={'status':'BFF80_PURE_PROBE_HOLD','functionalAcceptance':False,'runtimeServiceActivated':False,'databaseOrPrivateBindingsTouched':False,'automaticReplayAllowed':False}
 def inspect_owned():
  r=command(['/usr/bin/docker','inspect',NAME],check=False)
  if r.returncode:
   need(b'no such'in r.stderr.lower(),'OWN_INSPECT_UNCERTAIN');return None
  rows=json.loads(r.stdout);need(len(rows)==1,'ONE_OWN_PROBE')
  o=rows[0];need(o['Name']=='/'+NAME and o['Image']==admission['imageId']and o['Config']['Labels'].get(LABEL)==CONTROLLER_SHA,'OWN_CONTAINER_CUSTODY')
  return o
 try:
  need(not os.path.lexists(FENCE),'ROOT_FENCE_BUSY')
  context=ns['context_open']();ns['context_recheck'](context)
  workerraw=stable(WORKER_ACTUAL,1064,admission['workerActualSHA256']);need(len(workerraw)==1064,'EXACT_ORIGINAL_WORKER_RECEIPT_SIZE')
  worker=json.loads(workerraw)
  need(worker.get('status')=='BFF80_ORIGINAL_SOURCE_IMAGE_BUILT_NOT_STARTED'and worker.get('sourceSHA256')==CONTROLLER_SHA and worker.get('dockerBuildTerminalSuccess')is True and worker['result']['imageId']==admission['imageId'],'EXACT_BUILT_IMAGE')
  cleanup=json.loads(stable(CLEANUP_ACTUAL,16384,admission['cleanupActualSHA256']))
  need(cleanup.get('status')=='BFF80_IMAGE_BUILT_PHYSICAL_RETURN_RECOVERED'and cleanup.get('success')is True and cleanup.get('imageBuilt')is True and cleanup.get('imageId')==admission['imageId']and cleanup.get('buildRepeated')is False and cleanup.get('rootFenceReleased')is True,'EXACT_SEPARATE_ROOT_CLEANUP_COMPLETE')
  physical=cleanup['physicalReturn']
  need(all(physical.get(k)is True for k in('physicalReturnVerified','mainPidZeroAndInactive','ownSliceAbsentOrPopulatedZero','ownDockerWorkersTerminal')),'EXACT_ROOT_CLEANUP_PHYSICAL_RETURN')
  ns['verify_result_image'](admission['imageId'])
  image=json.loads(command(['/usr/bin/docker','image','inspect',admission['imageId']]).stdout)[0]
  conf=image['Config'];need(not conf.get('Volumes'),'NO_IMAGE_VOLUMES')
  env=conf.get('Env')or[];need(len(env)<=16 and all(isinstance(v,str)and v.split('=',1)[0]in('PATH','NODE_VERSION','YARN_VERSION','NODE_ENV')for v in env),'NO_PRIVATE_OR_PRELOAD_IMAGE_ENV')
  info=json.loads(command(['/usr/bin/docker','info','--format','{"CgroupDriver":{{json .CgroupDriver}},"CgroupVersion":{{json .CgroupVersion}}}']).stdout)
  need(info=={'CgroupDriver':'systemd','CgroupVersion':'2'},'EXACT_SYSTEMD_CGROUP2')
  need(inspect_owned()is None,'OWN_CONTAINER_ALREADY_EXISTS')
  physical_mark,terminal=ns['helper_terminal_functions']()
  OUT.mkdir(mode=0o700);ns['fsyncdir'](OUT.parent)
  ns['put'](OUT/'ONCE_INTENT.json',{'admission':admission,'controllerSHA256':CONTROLLER_SHA,'runtimeServiceActivated':False})
  fencefd=os.open(FENCE,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW|os.O_CLOEXEC,0o400);fencest=os.fstat(fencefd)
  body=json.dumps({'owner':'business-bff80-pure-original-probe01','imageId':admission['imageId'],'attemptRoot':str(OUT),'fenceIsNotTTL':True},sort_keys=True,separators=(',',':')).encode()
  need(os.write(fencefd,body)==len(body),'FULL_FENCE_WRITE');os.fsync(fencefd);ns['fsyncdir'](ROOT)
  attempted=True
  argv=['/usr/bin/docker','create','--name',NAME,'--pull=never','--platform=linux/amd64','--network=none','--read-only','--user=node','--workdir=/app','--entrypoint=/usr/local/bin/node','--no-healthcheck','--restart=no','--cap-drop=ALL','--security-opt=no-new-privileges','--pids-limit=32','--memory=134217728','--memory-swap=134217728','--cpu-period=100000','--cpu-quota=25000','--cgroup-parent=system.slice','--ulimit=core=0:0','--log-driver=none','--env=NODE_OPTIONS=','--env=NODE_PATH=','--label',LABEL+'='+CONTROLLER_SHA,admission['imageId'],'--input-type=module','--eval',JS]
  created=command(argv,cap=8).stdout.decode().strip();need(re.fullmatch('[a-f0-9]{64}',created),'EXACT_CREATED_CID');cid=created
  own=inspect_owned();need(own['Id']==cid and own['State']['Pid']==0 and not own['State']['Running'],'OWN_CREATED_STATE')
  h=own['HostConfig'];c=own['Config']
  need(not own['Mounts']and h['NetworkMode']=='none'and not h.get('PortBindings')and h['ReadonlyRootfs']is True and h['Memory']==134217728 and h['MemorySwap']==134217728 and h['PidsLimit']==32 and h['CpuPeriod']==100000 and h['CpuQuota']==25000 and h['CgroupParent']=='system.slice'and not h['Privileged']and h['RestartPolicy']['Name']=='no'and h.get('CapDrop')==['ALL']and h.get('SecurityOpt')in(['no-new-privileges'],['no-new-privileges:true'])and h['LogConfig']['Type']=='none'and not h.get('Binds')and not h.get('PublishAllPorts'),'ISOLATED_PROBE_CONTAINER')
  need(c['Entrypoint']==['/usr/local/bin/node']and c['WorkingDir']=='/app'and c['User']=='node'and c['Healthcheck']['Test']==['NONE']and c['Cmd']==['--input-type=module','--eval',JS],'EXACT_NODE_PURE_COMMAND')
  attached=command(['/usr/bin/docker','start','--attach',cid],cap=16)
  need(not attached.stderr and len(attached.stdout)<=4096,'BOUNDED_PURE_PROBE_OUTPUT')
  evidence=json.loads(attached.stdout)
  need(evidence=={'status':'BFF80_PURE_ORIGINAL_SYNTAX_IMPORT_PASS','syntaxFiles':2,'imagePublicFileHashes':4,'nodeVersion':'22.23.2','pgVersion':'8.22.0','libImport':True,'serverNamedImportsResolved':25,'pgImport':True,'serverImported':False,'poolOrClientInstantiated':False,'listenerOrNetworkRequest':False,'functionalAcceptance':False},'EXACT_NODE_PURE_PROBE_EVIDENCE')
  own=inspect_owned();need(not own['State']['Running']and own['State']['Pid']==0 and own['State']['ExitCode']==0 and cgroup_empty(cid),'OWN_PROBE_TERMINAL')
  ns['context_recheck'](context)
  result.update(status='BFF80_PURE_ORIGINAL_SYNTAX_IMPORT_PASS',syntaxFiles=2,imagePublicFileHashes=4,serverNamedImportsResolved=25,libAndPgImportedWithoutInstantiation=True,nodeVersion='22.23.2',pgVersion='8.22.0',serverImported=False,listenerOrNetworkRequest=False)
  success=True
 finally:
  signal.alarm(0);ns['BUDGET']=time.monotonic()+15
  try:
   if attempted:
    own=inspect_owned()
    need(own is not None or cid is not None,'CREATE_RETURN_UNCERTAIN_NO_PHYSICAL_CLAIM')
    if own is not None:
     cid=own['Id']
     if own['State']['Running']:
      if mark is None:mark=physical_mark(own)
      command(['/usr/bin/docker','stop','--time=2',cid],cap=5,check=False)
      own=inspect_owned()
      if own is not None and own['State']['Running']:command(['/usr/bin/docker','kill',cid],cap=3,check=False)
     if mark is not None:terminal(mark)
     own=inspect_owned();need(own is not None and not own['State']['Running']and own['State']['Pid']==0 and cgroup_empty(cid),'OWN_PROBE_PHYSICAL_RETURN')
     command(['/usr/bin/docker','rm',cid],cap=5);need(inspect_owned()is None and cgroup_empty(cid),'OWN_PROBE_REMOVED_EMPTY')
   returned=True
  except BaseException:result['physicalReturnUncertain']=True
  if context is not None:ns['context_close'](context)
  if fencefd is not None:
   if success and returned:
    need((fencest.st_dev,fencest.st_ino)==(os.fstat(fencefd).st_dev,os.fstat(fencefd).st_ino)==(FENCE.lstat().st_dev,FENCE.lstat().st_ino),'OWN_FENCE_NAMED_IDENTITY')
    need(ident(lockst)==ident(os.fstat(lockfd))==ident(LOCK.lstat()),'ROOT_LOCK_NAMED_IDENTITY')
    FENCE.unlink();ns['fsyncdir'](ROOT);result['rootFenceReleasedAfterPhysicalReturn']=True
   os.close(fencefd)
  os.close(lockfd)
  result['success']=success and returned and result.get('rootFenceReleasedAfterPhysicalReturn')is True
  result['physicalReturnVerified']=returned
  if OUT.exists():ns['put'](OUT/'RESULT_ACTUAL.json',result)
  print(json.dumps(result,sort_keys=True,separators=(',',':')))
 return 0 if result.get('success')else 1
def interrupted(*a):raise Hold('PURE_PROBE_FINITE_DEADLINE')
if __name__=='__main__':
 signal.signal(signal.SIGALRM,interrupted);signal.alarm(45)
 try:raise SystemExit(main())
 except (Exception,KeyboardInterrupt):
  print(json.dumps({'status':'BFF80_PURE_PROBE_HOLD','automaticReplayAllowed':False,'functionalAcceptance':False}));raise SystemExit(1)
 finally:signal.alarm(0)
