from pathlib import Path
import http.client,os,stat,json,hashlib,fcntl,runpy,subprocess,time,re,sys,signal
ROOT=Path(__file__).resolve().parent
CFG=Path('/srv/crays/runtime/private-edge-caddy-20261106-03/Caddyfile.private')
NAME='crays-private-edge-caddy-20261106-03'
BASE=Path('/srv/crays/acceptance/chuck48-current39-ingress-20261109-01')
CLOSE_BASE=BASE
u=runpy.run_path(str(ROOT/'qualified_container_physical.py'))
p=runpy.run_path(str(ROOT/'project_exact_seven_chuck48_ingress.candidate.py'))
def need(v,g):
 if not v:raise RuntimeError(g)

def sha(b):return hashlib.sha256(b).hexdigest()

def read(path,expected=None,limit=1048576):
 fd=os.open(path,os.O_RDONLY|os.O_NOFOLLOW|os.O_NONBLOCK)
 try:
  s=os.fstat(fd);need(stat.S_ISREG(s.st_mode)and s.st_uid==0 and s.st_nlink==1 and not s.st_mode&0o022 and 0<s.st_size<=limit,'ROOT_FIXED_FILE_CUSTODY_REQUIRED');raw=os.read(fd,limit+1);t=os.fstat(fd)
  need(len(raw)==s.st_size and(s.st_dev,s.st_ino,s.st_size,s.st_mtime_ns,s.st_ctime_ns)==(t.st_dev,t.st_ino,t.st_size,t.st_mtime_ns,t.st_ctime_ns)and(expected is None or sha(raw)==expected),'STABLE_PINNED_FILE_REQUIRED');return raw,s
 finally:os.close(fd)

def syncdir(path):
 fd=os.open(path,os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW);os.fsync(fd);os.close(fd)

def save(path,value):
 raw=value if isinstance(value,bytes)else(json.dumps(value,sort_keys=True,indent=2)+chr(10)).encode();fd=os.open(path,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o400)
 try:
  os.fchmod(fd,0o400);v=memoryview(raw)
  while v:v=v[os.write(fd,v):]
  os.fsync(fd)
 finally:os.close(fd)
 syncdir(path.parent)

def owned(cid=None):
 c=u['inspect'](cid or NAME);need(c['Name']=='/'+NAME and re.fullmatch('[a-f0-9]{64}',c['Id'])and c['HostConfig']['NetworkMode']=='host'and c['State']['Running'],'EXACT_RUNNING_EXISTING_CADDY_REQUIRED')
 mounts={m['Destination']:m for m in c['Mounts']};need(mounts.get('/etc/caddy/Caddyfile',{}).get('Source')==str(CFG)and mounts['/etc/caddy/Caddyfile']['Type']=='bind'and mounts['/etc/caddy/Caddyfile']['RW']is False,'EXACT_READONLY_FILE_BIND_REQUIRED')
 need(mounts.get('/config',{}).get('Source')=='/srv/crays/runtime/private-edge-caddy-20261106-03/config'and mounts['/config']['Type']=='bind','EXACT_ORIGINAL_CADDY_CONFIG_MOUNT_REQUIRED')
 need(c['Id']=='20003ed249ddaf862469f7397c10aa21d8c24b134412da05f1d11e35ef2667d5','EXACT_CURRENT_SOURCE59_CADDY_CID_REQUIRED');need(c['Image']=='sha256:4c6e91c6ed0e2fa03efd5b44747b625fec79bc9cd06ac5235a779726618e530d','EXACT_CURRENT39_CADDY_IMAGE');physical=u['physical'](c);need(physical[0]>0 and physical[1]is not None and physical[2]is not None,'EXACT_PHYSICAL_CADDY_REQUIRED');return c,physical

def raw_tool(cid,verb,raw):
 need(verb in('adapt','validate'),'EXACT_EXISTING_CADDY_PARSER_VERB_REQUIRED')
 argv=['/usr/bin/docker','exec','-i',cid,'caddy',verb,'--adapter','caddyfile','--config','/dev/stdin']
 r=subprocess.run(argv,input=raw,capture_output=True,timeout=25)
 need(r.returncode==0 and len(r.stdout)<=1048576 and len(r.stderr)<=1048576,'SAME_CADDY_PARSER_OR_VALIDATE_REQUIRED')
 return json.loads(r.stdout)if verb=='adapt'else None

def saved_autosave_config(c,expected):
 # Caddy's existing last-successful autosave; never claim an admin-API query.
 mounts={m['Destination']:m for m in c['Mounts']};path=Path(mounts['/config']['Source'])/'caddy/autosave.json';raw,_=read(path,limit=1048576);need(json.loads(raw)==expected,'EXISTING_CADDY_AUTOSAVE_CONFIG_MATCH_REQUIRED');return sha(raw)

def same(c,ph,fingerprints):
 now,q=owned(c['Id']);need(q[:2]==ph[:2]and u['fingerprints'](now)==fingerprints,'CADDY_GENERATION_OR_CONFIG_CHANGED');return now

def cas(expected,new,inode,out,label):
 fd=os.open(CFG,os.O_RDWR|os.O_NOFOLLOW|os.O_NONBLOCK)
 try:
  fcntl.flock(fd,fcntl.LOCK_EX|fcntl.LOCK_NB);s=os.fstat(fd);need(stat.S_ISREG(s.st_mode)and s.st_uid==0 and s.st_nlink==1 and stat.S_IMODE(s.st_mode)==0o400 and[s.st_dev,s.st_ino]==inode==[CFG.lstat().st_dev,CFG.lstat().st_ino],'EXACT_EXISTING_BOUND_INODE_REQUIRED');raw=os.read(fd,65537);need(sha(raw)==expected and 0<len(new)<=65536,'EXACT_CAS_PREIMAGE_REQUIRED');save(out/(label+'-before.exact'),raw);save(out/(label+'-WRITE_INTENT.json'),{'beforeSHA256':expected,'afterSHA256':sha(new),'deviceInode':inode,'automaticReplayAllowed':False});os.lseek(fd,0,0);buf=memoryview(new)
  while buf:
   n=os.write(fd,buf);need(n>0,'FULL_WRITE_REQUIRED');buf=buf[n:]
  os.ftruncate(fd,len(new));os.fsync(fd);os.lseek(fd,0,0);need(os.read(fd,65537)==new and[CFG.lstat().st_dev,CFG.lstat().st_ino]==inode,'CAS_POSTIMAGE_REQUIRED');save(out/(label+'-WRITE_ACK.json'),{'beforeSHA256':expected,'afterSHA256':sha(new),'inodePreserved':True})
 finally:os.close(fd)

def restart_same(c,ph,out):
 save(out/'SAME_CID_STOP_START_INTENT.json',{'containerId':c['Id'],'oldPid':ph[0],'oldTicks':ph[1],'automaticReplayAllowed':False});need(u['halt'](c['Id'],ph),'EXACT_OLD_CADDY_PHYSICAL_TERMINATION_REQUIRED');save(out/'SAME_CID_STOP_ACK.json',{'physicalOldGenerationTerminated':True});r=u['docker']('start',c['Id'],timeout=25);need(r.returncode==0,'SAME_CID_START_ACK_REQUIRED');deadline=time.monotonic()+30
 while True:
  try:
   now,q=owned(c['Id'])
   if q[0]>0 and q[:2]!=ph[:2]:break
  except RuntimeError:pass
  need(time.monotonic()<deadline,'SAME_CID_NEW_GENERATION_REQUIRED');time.sleep(.2)
 need(u['fingerprints'](now)==u['fingerprints'](c),'ALL_CADDY_CONTAINER_CONFIG_UNCHANGED');save(out/'SAME_CID_START_ACK.json',{'containerId':c['Id'],'pid':q[0],'startTicks':q[1],'oldGenerationPhysicallyTerminated':True});return now,q

def pick(v,keys):
 need(isinstance(keys,list)and 1<=len(keys)<=6,'FINITE_ACTUAL_FIELD_PATH')
 for k in keys:v=v[k]
 return v
def own_listen(c,physical,port,address,label):
 lines=Path('/proc',str(physical[0]),'net/tcp').read_text().splitlines()[1:]
 need(len(lines)<=4096,'BOUNDED_SHARED_NAMESPACE_TCP')
 sockets={row[9]for row in(line.split()for line in lines)if row[3]=='0A'and row[1]==address+':'+format(port,'04X')}
 need(sockets,label+'_KERNEL_LISTEN')
 procs=(Path(physical[2])/'cgroup.procs').read_text();need(len(procs)<=8192,'BOUNDED_OWN_TRANSPORT_CGROUP')
 pids=procs.split();need(0<len(pids)<=128,'BOUNDED_OWN_TRANSPORT_PROCESSES');owned=set()
 for pid in pids:
  folder=Path('/proc',pid,'fd')
  if not folder.exists():continue
  fds=list(folder.iterdir());need(len(fds)<=256,'BOUNDED_OWN_TRANSPORT_FDS')
  for fd in fds:
   try:v=os.readlink(fd)
   except FileNotFoundError:continue
   if v.startswith('socket:[')and v[8:-1]in sockets:owned.add(v[8:-1])
 need(owned,label+'_OWN_PROCESS_FD')
 return sorted(owned)
MEMBER42=Path('/srv/crays/acceptance/member42-family-adoption-20261109-01')
PATHS={'PUBLIC_PROCESS_BINDING.root.json':Path('/srv/crays/runtime/chuck-core-currentness-20261107-07/PUBLIC_PROCESS_BINDING.root.json'),'OWNER_BINDING.json':Path('/srv/crays/runtime/chuck-profile-control-20261107-20/owner/OWNER_BINDING.json'),'DEPLOYMENT.json':Path('/srv/crays/runtime/chuck-profile-control-20261107-20/deployment/DEPLOYMENT.json'),'START.json':Path('/srv/crays/runtime/chuck-profile-control-20261107-20/deployment/START.json')}
def admit_family(r):
 family='46'if r['phase'].startswith('close-')else'48'
 expected={'46':{'root':Path('/srv/crays/acceptance/member46-family-adoption-20261109-01'),'status':'MEMBER46_IMMUTABLE_RELEASE_AND_ORIGINAL_FULL_SDK_GENERATION_COMMITTED_INGRESS_REOPEN_PENDING','buildId':'LbgKfWM3XAR5fr7rTk3b6','buildSHA256':'a5801c8264029da53299cb9ba1d9097414d1f4f05ba7eecbe672302e29365317','generation':'MEMBER46_ORIGINAL_FULL_SOURCE_GENERATION_READY'},'48':{'root':Path('/srv/crays/acceptance/chuck48-family-adoption-20261109-01'),'status':'CHUCK48_ORIGINAL_TRANSPORT_AND_FULL_SDK_GENERATION_COMMITTED_INGRESS_REOPEN_PENDING','buildId':'LbgKfWM3XAR5fr7rTk3b6','buildSHA256':'a5801c8264029da53299cb9ba1d9097414d1f4f05ba7eecbe672302e29365317','generation':'CHUCK48_ORIGINAL_FULL_SOURCE_GENERATION_READY'}}[family]
 need(r['memberActualPath']==str(expected['root']/'RESULT_ACTUAL.json'),'EXACT42_ACTUAL_PATH')
 a=json.loads(read(Path(r['memberActualPath']),r['memberActualSHA256'])[0]);g=a['generation']
 need(a['status']==expected['status']and a['buildId']==expected['buildId']and a['build42ActualSHA256']==expected['buildSHA256']and a['sharedIngressReopened']is False,'ACTUAL42_COMMITTED_ONLY')
 need(g['status']==expected['generation']and g['customerAcceptance']is False,'ACTUAL42_GENERATION_ONLY')
 ids=a['newIds'];need(set(ids)=={'member','common','work'}and len(set(ids.values()))==3 and all(re.fullmatch('[a-f0-9]{64}',v)for v in ids.values())and g['newCommon']==ids['common'],'EXACT_CURRENT48_FAMILY')
 if family=='46':need(all(ids[k]!=a['oldIds'][k]for k in ids),'ORIGINAL46_FAMILY_LINEAGE')
 else:
  need(a['oldIds']=={'member':'2676bc4d4a5f73d96da75fe94166e2adb024542ca1ac0a8d3effe0568a736d9a','work':'79e8075fc39266ced0c45b8c41ffc64232e3d00cb837df88478fe8f8968359a6','common':'011e92f2cd77c631b60b2e4cc7d008dc0e36ff9b169f9ae59a59abe4836544fc'} and ids['member']==a['oldIds']['member'] and ids['work']==a['oldIds']['work'] and ids['common']!=a['oldIds']['common'] and a['memberWorkCIDsAndProcessesPreserved'] is True,'ONLY_COMMON48_REPLACED_MEMBER_WORK_PRESERVED')
 need(set(g['controlsSHA256'])==set(PATHS),'EXACT_FOUR42_CONTROLS');controls={n:json.loads(read(v,g['controlsSHA256'][n])[0])for n,v in PATHS.items()}
 need(controls['START.json']['policySHA256']==g['controlsSHA256']['DEPLOYMENT.json']and controls['DEPLOYMENT.json']['ownerPolicySHA256']==g['controlsSHA256']['OWNER_BINDING.json']and controls['DEPLOYMENT.json']['witness']['policySHA256']==g['controlsSHA256']['PUBLIC_PROCESS_BINDING.root.json'],'EXACT42_CURRENT_CONTROL_CHAIN')
 cs={k:u['inspect'](v)for k,v in ids.items()};ps={k:u['physical'](cs[k])for k in ids}
 need(all(cs[k]['Id']==ids[k]and cs[k]['State']['Running']and ps[k][0]>0 and ps[k][1]is not None for k in ids),'CURRENT42_RUNNING_GENERATION')
 need(all(cs[k]['HostConfig']['NetworkMode']=='container:'+ids['member']for k in ['common','work']),'CURRENT42_MEMBER_NETNS')
 wp=controls['PUBLIC_PROCESS_BINDING.root.json'];policy=controls['DEPLOYMENT.json'];start=controls['START.json'];publicCommon=wp['common'];publicAnchor=publicCommon['namespaceAnchor']
 need(publicCommon['id']==ids['common']and publicCommon['process']['pid']==ps['common'][0]and str(publicCommon['process']['startTicks'])==str(ps['common'][1])and publicAnchor['id']==ids['member']and publicAnchor['process']['pid']==ps['member'][0]and str(publicAnchor['process']['startTicks'])==str(ps['member'][1]),'EXACT42_CONTROL_CURRENT_COMMON_MEMBER_PROCESSES')
 core=policy['coreContainer'];need(core['id']==ids['common']and core['hostPid']==ps['common'][0]and str(core['hostStartTicks'])==str(ps['common'][1])and core['networkNamespaceInode']==Path('/proc',str(ps['member'][0]),'ns/net').stat().st_ino,'EXACT42_POLICY_CURRENT_COMMON_NETNS')
 sdk=g['sdk'];need(sdk['unit']=='crays-owner-tools-whatsapp-live.service'and policy['sdkService']==sdk and wp['sdk']['invocationId']==sdk['invocationId']and wp['sdk']['process']['pid']==sdk['pid']and start['pid']==sdk['pid']and start['invocationId']==sdk['invocationId']and controls['OWNER_BINDING.json']['ownerServiceInvocation']==sdk['invocationId'],'EXACT42_SDK_CONTROL_BINDING')
 sr=subprocess.run(['/usr/bin/systemctl','show',sdk['unit'],'--property=ActiveState,MainPID,InvocationID,ExecMainStartTimestampMonotonic'],capture_output=True,text=True,timeout=10);need(sr.returncode==0 and len(sr.stdout)<=8192,'BOUNDED_CURRENT42_SDK_METADATA');sv=dict(v.split('=',1)for v in sr.stdout.splitlines()if'='in v)
 need(sv['ActiveState']=='active'and int(sv['MainPID'])==sdk['pid']and sv['InvocationID']==sdk['invocationId']and int(sv['ExecMainStartTimestampMonotonic'])==sdk['startedMonotonicUSec']==wp['sdk']['startedMonotonicUSec'],'CURRENT42_SDK_INVOCATION_PID')
 sdkstat=Path('/proc',str(sdk['pid']),'stat').read_text();need(len(sdkstat)<=16384 and sdkstat.rsplit(')',1)[1].split()[19]==str(wp['sdk']['process']['startTicks']),'CURRENT42_SDK_START_TICKS')
 need(cs['member']['NetworkSettings']['Networks']['crays-private-app-canonical-20261106-01']['IPAddress']=='172.24.0.2'and len({Path('/proc',str(ps[k][0]),'ns/net').stat().st_ino for k in ids})==1,'CURRENT42_SHARED_PRIVATE_IP')
 ms=[m for m in cs['common']['Mounts']if m['Destination']=='/run/crays/common-private-edge-listener.mjs'];need(len(ms)==1 and ms[0]['Type']=='bind'and ms[0]['RW']is False,'CURRENT42_READONLY_COMMON_LISTENER')
 listenerSHA='7e8b668caf10118d84082f8fd68a63e390a3ee36a2e0da7b022a06d7203fa5bb'if family=='46'else'30376559572bf19be05d3e1b724c20de026455361e0cd7e1d749b1056e2aa777';read(Path(ms[0]['Source']),listenerSHA)
 edges=own_listen(cs['common'],ps['common'],8990,'020018AC','CURRENT42_COMMON8990');works=own_listen(cs['work'],ps['work'],19109,'0100007F','CURRENT42_WORK19109')
 need(all(u['physical'](u['inspect'](ids[k]))[:2]==ps[k][:2]for k in ids),'CURRENT42_FAMILY_UNCHANGED')
 return p['MEMBER'],{'ids':ids,'processes':{k:list(ps[k][:2])for k in ids},'controlsSHA256':g['controlsSHA256'],'listenerSHA256':listenerSHA,'commonOwnedListenerSocketInodes':edges,'workOwnedLoopbackSocketInodes':works,'edgePort':8990,'memberActualSHA256':r['memberActualSHA256'],'sdk':sdk}
def parser_pair28(cid,opened,closed,work):
 old=raw_tool(cid,'adapt',opened);new=raw_tool(cid,'adapt',closed);raw_tool(cid,'validate',opened);raw_tool(cid,'validate',closed)
 p['validate_adapted'](old,new,work);need(old.get('admin',{}).get('disabled')is True and new.get('admin')==old.get('admin'),'ORIGINAL_ADMIN_OFF')
 return old,new
def verify_closed(r):
 import ssl,socket
 ca=Path(r['publicTLSCAPath']);b,_=read(ca,r['publicTLSCASHA256']);ctx=ssl.create_default_context(cadata=b.decode())
 def get(host,path,https):
  if https:
   class C(http.client.HTTPSConnection):
    def connect(self):
     raw=socket.socket(socket.AF_INET,socket.SOCK_STREAM);raw.settimeout(8);raw.connect(('172.26.0.1',443));self.sock=ctx.wrap_socket(raw,server_hostname=host)
   c=C(host,timeout=8,context=ctx)
  else:c=http.client.HTTPConnection('127.0.0.1',18080,timeout=8)
  try:
   headers={'Host':host}
   # Noncredential matcher probe, used only after seven static handlers are proven loaded.
   if host=='member.crays.world'and https:headers['Authorization']='Bearer crays-static-maintenance-probe'
   c.request('GET',path,headers=headers);v=c.getresponse();body=v.read(1024)
   need(v.status==503 and body==p['BODY'].encode(),'ACTUAL_FAMILY_STATIC503')
  finally:c.close()
 get('member.crays.world','/',False)
 get('member.crays.world','/api/crays/clubs/team/session',True)
 get('team.craysclub.com','/en/clubs/operations',True)
 return True
def preflight28(kind,r,out):
 c,ph=owned();raw,t=read(CFG,limit=65536);need(CFG.resolve()==CFG and[t.st_dev,t.st_ino]==[66309,1491470]and stat.S_IMODE(t.st_mode)==0o400,'EXACT_BOUND_CADDY_INODE')
 bound=Path('/proc',str(ph[0]),'root/etc/caddy/Caddyfile').stat();need((bound.st_dev,bound.st_ino)==(t.st_dev,t.st_ino),'ACTUAL_CADDY_BOUND_INODE')
 proof=None
 if kind=='close':
  target,proof=admit_family(r);need(target==p['MEMBER'],'EXACT_CURRENT42_CLOSE_TARGET')
  candidate=p['close'](raw);old,new=parser_pair28(c['Id'],raw,candidate,p['MEMBER'])
 else:
  need(r['closedActualPath']==str(BASE/'close-apply/RESULT_ACTUAL.json'),'EXACT_OWN42_CLOSED_ACTUAL')
  a=json.loads(read(Path(r['closedActualPath']),r['closedActualSHA256'])[0]);need(a['memberCommonWorkPrivateIngressClosed']is True and sha(raw)==a['afterSHA256']and a['beforeSHA256']==p['ORIGINAL'],'EXACT_OWN42_CLOSED_GATE')
  original=read(BASE/'close-preflight/Caddyfile.before.exact',p['ORIGINAL'],65536)[0];target,proof=admit_family(r);candidate=p['reopen'](original,raw,target);new,old=parser_pair28(c['Id'],candidate,raw,target)
 saved=saved_autosave_config(c,old);same(c,ph,u['fingerprints'](c));read(CFG,sha(raw),65536)
 save(out/'Caddyfile.before.exact',raw);save(out/'Caddyfile.candidate.exact',candidate);save(out/'ADAPTED.before.private.json',old);save(out/'ADAPTED.after.private.json',new)
 result={'kind':kind,'containerId':c['Id'],'imageId':c['Image'],'pid':ph[0],'startTicks':ph[1],'fingerprints':u['fingerprints'](c),'beforeSHA256':sha(raw),'afterSHA256':sha(candidate),'deviceInode':[t.st_dev,t.st_ino],'savedAutosavePreimageSHA256':saved,'allOtherSitesPreserved':True,'exactSevenProxyBlocks':True,'workPhysical':proof,'actualWorkTarget':p['MEMBER'],'sharedEdgeOwnedByRoot':True,'edgeChanged':False,'observedAtUnix':time.time()}
 save(out/'PREFLIGHT_ACTUAL.json',result);return result
def apply28(kind,r,out):
 a=json.loads(read(BASE/(kind+'-preflight')/'PREFLIGHT_ACTUAL.json',r['preflightActualSHA256'])[0]);need(0<=time.time()-a['observedAtUnix']<=120,'FRESH_OWN42_INGRESS_PREFLIGHT')
 c,ph=owned(a['containerId']);need(ph[:2]==(a['pid'],a['startTicks'])and u['fingerprints'](c)==a['fingerprints'],'FRESH_PREFLIGHT_CADDY_GENERATION')
 before=read(BASE/(kind+'-preflight')/'Caddyfile.before.exact',a['beforeSHA256'],65536)[0];after=read(BASE/(kind+'-preflight')/'Caddyfile.candidate.exact',a['afterSHA256'],65536)[0]
 if kind=='close':
  target,proof=admit_family(r);need(proof==a['workPhysical']and target==a['actualWorkTarget'],'SAME_ACTUAL_CURRENT42_CLOSE_FAMILY')
  need(p['close'](before)==after,'EXACT_SEVEN_CLOSE_PROJECTION');old,new=parser_pair28(c['Id'],before,after,p['MEMBER'])
 elif kind=='reopen':
  target,proof=admit_family(r);need(proof==a['workPhysical']and target==a['actualWorkTarget'],'SAME_ACTUAL_ADOPTED_WORK_ENDPOINT')
  original=read(CLOSE_BASE/'close-preflight/Caddyfile.before.exact',p['ORIGINAL'],65536)[0]
  need(p['reopen'](original,before,target)==after,'EXACT_ADOPTED_REOPEN_PROJECTION');new,old=parser_pair28(c['Id'],after,before,target)
 saved_autosave_config(c,old);read(CFG,a['beforeSHA256'],65536);same(c,ph,a['fingerprints'])
 finite_window(r['phase'],r);cas(a['beforeSHA256'],after,a['deviceInode'],out,'FAMILY28');now,q=restart_same(c,ph,out)
 deadline=time.monotonic()+30
 while True:
  try:saved_autosave_config(now,new);break
  except RuntimeError:need(time.monotonic()<deadline,'SAVED_CADDY_AUTOSAVE_POSTIMAGE');time.sleep(.2)
 read(CFG,a['afterSHA256'],65536);need([CFG.stat().st_dev,CFG.stat().st_ino]==a['deviceInode'],'PRESERVED_BOUND_INODE')
 closed=kind!='reopen'
 if closed:verify_closed(r)
 result={'status':'ROOT_PRIVATE_FAMILY_CLOSED'if closed else'ROOT_PRIVATE_FAMILY_REOPENED','memberCommonWorkPrivateIngressClosed':closed,'allOtherSitesPreserved':True,'sharedEdgeOwnedByRoot':True,'containerId':c['Id'],'pid':q[0],'startTicks':q[1],'beforeSHA256':a['beforeSHA256'],'afterSHA256':a['afterSHA256'],'deviceInode':a['deviceInode'],'allSevenStaticHandlersAdaptedAndSaved':closed,'actualThreeHTTPHTTPS503ProbesPassed':closed,'workPhysical':a['workPhysical'],'actualWorkTarget':a['actualWorkTarget'],'originalOldTeamTargetRestored':False,'customerAcceptanceClaimed':False,'adminAPIEnabled':False}
 save(out/'RESULT_ACTUAL.json',result);return result
def finite_window(phase,r):
 need(os.environ.get('INVOCATION_ID')and r.get('freshExclusiveWindowApproved')is True and 0<r['windowExpiresAtUnix']-time.time()<=600,'FRESH_ROOT_EXCLUSIVE_WINDOW_REQUIRED')
 unit='crays-chuck48-ingress-'+phase+'-20261109-01.service';cg=Path('/sys/fs/cgroup')/Path('/proc/self/cgroup').read_text().strip().split(':',2)[-1].lstrip('/')
 need(cg.name==unit and int((cg/'memory.max').read_text())<=1073741824 and int((cg/'memory.swap.max').read_text())==0 and int((cg/'pids.max').read_text())<=128,'EXACT_FINITE_INGRESS_CGROUP')
 quota,period=(cg/'cpu.max').read_text().split();need(quota!='max'and int(quota)/int(period)<=.5,'FINITE_HALF_CPU_REQUIRED')
 raw,_=read('/srv/crays/migration-work/20261108/root/ROOT_HEAVY_ATTEMPT_ACTIVE.json',r['rootHeavyFenceSHA256'],16384);need(json.loads(raw).get('unit')==unit,'EXACT_OWN42_ROOT_WINDOW_FENCE')
def main(phase,path):
 os.umask(0o077);need(os.getuid()==0 and Path('/sys/devices/virtual/dmi/id/board_asset_tag').read_text().strip()=='i-0eb300e1b02414d8f','EXACT_ROOT_HOST')
 r=json.loads(read(Path(path))[0]);need(phase in('close-preflight','close-apply','reopen-preflight','reopen-apply')and r['phase']==phase and r['executionApproved']is True and r['sharedEdgeOwnedByRoot']is True,'ROOT_EXACT_PHASE_REVIEW')
 need(sha(Path(__file__).read_bytes())==r['controllerSHA256']and r['independentReviewSHA256'],'INDEPENDENT_CONTROLLER_REVIEW')
 for name,h in r['sourcePins'].items():need(Path(name).name==name and sha(read(ROOT/name)[0])==h,'EXACT_SOURCE_PIN')
 need(phase.endswith('preflight')or r['sameCIDStopStartApproved']is True,'ROOT_SAME_CID_MAINTENANCE_APPROVAL')
 finite_window(phase,r)
 need(BASE.parent.resolve()==BASE.parent,'CANONICAL_ACCEPTANCE_PARENT')
 if not BASE.exists():BASE.mkdir(mode=0o700);syncdir(BASE.parent)
 need(BASE.resolve()==BASE and BASE.stat().st_uid==0 and stat.S_IMODE(BASE.stat().st_mode)==0o700,'OWN_ACCEPTANCE_CUSTODY')
 out=BASE/phase;out.mkdir(mode=0o700);syncdir(BASE);save(out/'INTENT.json',{'phase':phase,'reviewSHA256':sha(read(Path(path))[0]),'automaticReplayAllowed':False})
 try:return preflight28(phase.split('-')[0],r,out)if phase.endswith('preflight')else apply28(phase.split('-')[0],r,out)
 except BaseException as e:
  save(out/'STOP_ACTUAL.json',{'phase':phase,'errorClass':type(e).__name__,'safeGuard':str(e)if isinstance(e,RuntimeError)and re.fullmatch('[A-Z0-9_]+',str(e))else None,'noAutomaticReplayOrRollback':True});raise
if __name__=='__main__':
 try:print(json.dumps(main(sys.argv[1],sys.argv[2])))
 except BaseException as e:print(json.dumps({'status':'PRIVATE_FAMILY28_STOP_NO_REPLAY','errorClass':type(e).__name__,'privateValuesPrinted':False}));raise SystemExit(1)
