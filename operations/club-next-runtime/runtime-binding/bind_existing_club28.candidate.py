"""Root-only Club28 adoption into the existing singleton site. Source only until Root review.
No Caddy/DNS/shared-family writes. Never replay an uncertain intent.
"""
from pathlib import Path, PurePosixPath
import os,sys,json,hashlib,stat,copy,subprocess,signal,time,argparse,importlib.util
BASE=Path('/srv/crays')
JOB=BASE/'migration-work/20261108/root/club28-existing-runtime-bind-source01'
RELEASE=BASE/'releases/club-original-saas28-20261109-01'
OUT=BASE/'acceptance/club-original-saas28-bind-20261109-01'
BUILD=BASE/'migration-work/20261108/websites/club-original-saas-build21-20261108-01'
MANIFEST=BUILD/'COMPILED_RELEASE27_MANIFEST.json'
MANIFEST_SHA='ec2c1e7e8ee875e99c3235db3f089502eee69dcc1cff2be9561f418fd7fbbca5'
BUILD_ID='aySu5l_FzwATUE3NCHrmf'
OLD='96a573cc2b34c9284f708a63f74776658c1a87799f85fa7d023eef96fd717ba3'
NAME='crays-acceptance-public-club-saas28-20261109-01'
IMAGE='sha256:752ea8a2f758c34002a0461bd9f1cee4f9a3c36d48494586f60ffce1fc708e0e'
NET='crays-acceptance-public-static-20261105-01'
NETID='fd541962418c24223d4b467427ced8662ac254c4f55e8ad06bc6ea6c2b5beaca'
IP='172.18.0.11'
EDGE=BASE/'runtime/private-edge-caddy-20261106-03/Caddyfile.private'
EDGE_SHA='f9f992e24a6973d1b64cb225390959cb4d89c8d5ccac98466fbf52752b36260c'
ENV=BASE/'private/club-public-rds-login-20261108-17/app-environment.private.json'
CA=ENV.parent/'rds-regional-ca.pem'
CA_SHA='a2c1bf4e3775a038e1db2cf92f9792c94855f20c6e1a72ada7587cb29e242c6e'
TEMPLATE=BUILD/'private-app-bootstrap.template.cjs'
TEMPLATE_SHA='14061ea234fa915e9b7f2628fb52380f47030a238c904d083f03a37f6f5ed7c9'
HELPER=BASE/'incoming/org-private-correction-20261107-02-r04/install_org_private_candidate.py'
HELPER_SHA='157996e57ce3fd6ccfaf9d764f86a80edf9220d05f19987b5337bc61ce096aa0'
FP={'Config':'5ec32681814620ba27229e4256661146a97b3f81c2f6e9952fe4760a016fd283','HostConfig':'aabb4fd962030d7f65ef6d1e5ddb0c71b3d73007495544da0d2338a81eff3bad','Mounts':'80a8c3833ca2e7afc6a58f3cf5e715770c191058b6b9675a3b0cfa6e270ea6c2'}
# These are the exact current shared containers, never mutation targets.
PRESERVE=['0fa6bba9af8e7bb592e72b86afddf0d5702d892e72c5f62f6f415f735886872f','06a9a5a92df9bcd3fd3675a09172123333f68a1825df5c07a7ba5724a70eb071','435314e3c20f063e31197ec7319cb564a60048a0c0f38fc5d1aefcf0c397add0','826680e27113c9834990fa46ad54905ea2dbc758c12bf519f09731c4ea7ef815','20003ed249ddaf862469f7397c10aa21d8c24b134412da05f1d11e35ef2667d5']
M=None
def need(v,g):
 if not v:raise RuntimeError(g)
def sha(p):
 with Path(p).open('rb')as f:return hashlib.file_digest(f,'sha256').hexdigest()
def digest(v):return hashlib.sha256(json.dumps(v,sort_keys=True,separators=(',',':')).encode()).hexdigest()
def leaf(p,uid,gid,mode):
 p=Path(p);s=p.lstat();need(stat.S_ISREG(s.st_mode)and s.st_uid==uid and s.st_gid==gid and stat.S_IMODE(s.st_mode)==mode and s.st_nlink==1,'QUALIFIED_LEAF_CUSTODY_REQUIRED');return s
def loadhelper():
 global M
 need(sha(HELPER)==HELPER_SHA,'ORIGINAL_PHYSICAL_HELPER_CHANGED')
 spec=importlib.util.spec_from_file_location('qualified_physical_helper',HELPER);M=importlib.util.module_from_spec(spec);spec.loader.exec_module(M)
def inspect(cid):return M.inspect(cid)
def dock(*a,**kw):return M.docker(*a,**kw)
def write(p,v):M.write(p,v)
def shared():
 need(sha(EDGE)==EDGE_SHA,'CURRENT05_EDGE_BYTES_CHANGED')
 result={}
 for cid in PRESERVE:
  c=inspect(cid);need(c['Id']==cid and c['State']['Running'],'CURRENT_SHARED_FAMILY_NOT_RUNNING')
  result[cid]={'mark':M.mark(c),'image':c['Image'],'config':digest(c['Config']),'host':digest(c['HostConfig']),'mounts':digest(c['Mounts'])}
 return result
def review(path,action):
 p=Path(path);s=leaf(p,0,0,0o400);v=json.loads(p.read_text());now=time.time()
 need(0<=now-s.st_mtime<=120 and 0<=now-v['issuedEpoch']<=120,'FRESH_ROOT_SOURCE_FENCE_REQUIRED')
 need(v['action']==action and v['sourceSHA256']==sha(__file__) and v['oldId']==OLD and v['edgeSHA256']==EDGE_SHA and v['manifestSHA256']==MANIFEST_SHA and v['buildId']==BUILD_ID and v['singletonSameIPReplacementApproved']is True and v['privateProjectionQualified']is True,'EXACT_ROOT_REVIEW_REQUIRED')
 return v
def compiled():
 need(sha(MANIFEST)==MANIFEST_SHA,'EXACT_BUILD08_MANIFEST_REQUIRED')
 v=json.loads(MANIFEST.read_text());need(v['status']=='ORIGINAL_CLUB_SOURCE15_ENDPOINT_NEXT_BUILD_PASS_NOT_INSTALLED'and v['buildId']==BUILD_ID and v['compiledRoot']==str(BUILD/'source/.next')and v['originalPublicAndDependencyMountsMustBeRetained']is True,'ORIGINAL_BUILD28_CONTRACT_REQUIRED')
 rows=v['compiledFiles'];need(len(rows)==3554 and sum(r['bytes']for r in rows)==110079078,'EXACT_COMPILED_FILESET_REQUIRED');seen=set()
 for r in rows:
  rel=PurePosixPath(r['relativePath']);need(not rel.is_absolute()and rel.parts[0]=='.next'and'..'not in rel.parts and str(rel)not in seen,'SAFE_EXACT_COMPILED_PATH_REQUIRED');seen.add(str(rel))
 return rows
def sealed():
 rows=compiled();need((RELEASE/'.next/BUILD_ID').read_text().strip()==BUILD_ID,'SEALED_BUILD_ID_CHANGED')
 need({str(p.relative_to(RELEASE))for p in(RELEASE/'.next').rglob('*')if p.is_file()}=={r['relativePath']for r in rows},'SEALED_FILESET_CHANGED')
 for r in rows:
  p=RELEASE/r['relativePath'];leaf(p,1000,1000,0o444);need(p.stat().st_size==r['bytes']and sha(p)==r['sha256'],'SEALED_COMPILED_BODY_CHANGED')
 return rows
def seal(args):
 review(args.review,'seal');before=shared();rows=compiled();need(not os.path.lexists(RELEASE)and not os.path.lexists(OUT),'EXISTING_STAGE_INTENT_NO_REPLAY')
 # All source files are checked before the first stage write.
 for r in rows:
  p=BUILD/'source'/r['relativePath'];s=p.lstat();need(stat.S_ISREG(s.st_mode)and s.st_size==r['bytes']and sha(p)==r['sha256'],'BUILD08_SOURCE_BODY_CHANGED')
 review(args.review,'seal');OUT.mkdir(mode=0o700);write(OUT/'SEAL_INTENT.json',{'manifestSHA256':MANIFEST_SHA,'buildId':BUILD_ID,'replayAllowed':False})
 RELEASE.mkdir(mode=0o755)
 for r in rows:
  src=BUILD/'source'/r['relativePath'];dst=RELEASE/r['relativePath'];dst.parent.mkdir(mode=0o755,parents=True,exist_ok=True);fd=os.open(dst,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o444)
  with src.open('rb')as f,os.fdopen(fd,'wb')as out:
   while True:
    b=f.read(1048576)
    if not b:break
    out.write(b)
   out.flush();os.fsync(out.fileno())
  os.chown(dst,1000,1000);os.chmod(dst,0o444)
 for d in sorted([p for p in RELEASE.rglob('*')if p.is_dir()],key=lambda p:len(p.parts),reverse=True):os.chown(d,1000,1000);os.chmod(d,0o555)
 os.chown(RELEASE,1000,1000);os.chmod(RELEASE,0o555);sealed();need(shared()==before,'SHARED_FAMILY_CHANGED_DURING_SEAL')
 r={'status':'BUILD28_SEALED_NOT_INSTALLED','manifestSHA256':MANIFEST_SHA,'buildId':BUILD_ID,'files':len(rows),'bytes':sum(x['bytes']for x in rows),'root':str(RELEASE),'sharedFamilyUnchanged':True,'replayAllowed':False};write(OUT/'SEALED_ACTUAL.json',r);return r
def admit_old(running=True):
 c=inspect(OLD);need(c['Id']==OLD and c['Image']==IMAGE and{key:digest(c[key])for key in FP}==FP,'EXACT_EXISTING_CLUB_PREIMAGE_REQUIRED')
 need(c['Config']['User']=='1000:1000'and c['Config']['WorkingDir']=='/app'and c['Config']['Entrypoint']==['/usr/local/bin/node']and c['Config']['Cmd']==['/app/node_modules/next/dist/bin/next','start','--hostname','0.0.0.0','--port','8080'],'EXACT_CLUB_EXECUTION_REQUIRED')
 need(c['State']['Running']==running and not c['State']['OOMKilled'],'EXACT_CLUB_STATE_REQUIRED')
 return c
def private_bootstrap(path):
 # Executed by Root only. Private values and their digest remain in RAM/private file.
 leaf(ENV,1000,1000,0o400);need(ENV.stat().st_size<=8192,'PRIVATE_PROJECTION_BOUND_REQUIRED');fd=os.open(ENV,os.O_RDONLY|os.O_NOFOLLOW)
 try:
  a=os.fstat(fd);body=os.read(fd,8193);b=os.fstat(fd);need((a.st_dev,a.st_ino,a.st_size,a.st_mtime_ns,a.st_ctime_ns)==(b.st_dev,b.st_ino,b.st_size,b.st_mtime_ns,b.st_ctime_ns),'PRIVATE_PROJECTION_GENERATION_CHANGED')
 finally:os.close(fd)
 v=json.loads(body);need(set(v)=={'CRAYS_CLUBS_PUBLIC_PRODUCTION_DATABASE_URL'}and isinstance(v['CRAYS_CLUBS_PUBLIC_PRODUCTION_DATABASE_URL'],str)and v['CRAYS_CLUBS_PUBLIC_PRODUCTION_DATABASE_URL'],'ONE_QUALIFIED_ORIGINAL_PURPOSE_REQUIRED')
 leaf(CA,1000,1000,0o444);need(sha(CA)==CA_SHA and sha(TEMPLATE)==TEMPLATE_SHA,'ORIGINAL_TEMPLATE_OR_CA_CHANGED')
 template=TEMPLATE.read_text();need(template.count('__ROOT_PRIVATE_PROJECTION_SHA256__')==1,'EXACT_TEMPLATE_MARKER_REQUIRED')
 data=template.replace('__ROOT_PRIVATE_PROJECTION_SHA256__',hashlib.sha256(body).hexdigest()).encode();write(path,data);os.chown(path,1000,1000);os.chmod(path,0o400)
 body=None;v=None;data=None
def expectations(old,bootstrap):
 c=copy.deepcopy(old['Config']);c['Image']=IMAGE
 env=c['Env'];key='NODE_EXTRA_CA_CERTS';oldca=[x for x in env if x.split('=',1)[0]==key];need(not oldca or oldca==[key+'=/run/crays-club-public/rds-regional-ca.pem'],'ORIGINAL_CA_ENV_CONFLICT')
 need(not any(x.split('=',1)[0]=='CRAYS_CLUBS_PUBLIC_PRODUCTION_DATABASE_URL'for x in env),'PRIVATE_URL_MUST_NOT_BE_DOCKER_ENV')
 if not oldca:env.append(key+'=/run/crays-club-public/rds-regional-ca.pem')
 c['Entrypoint']=['/usr/local/bin/node','--require','/run/crays-club-public/bootstrap.cjs']
 h=copy.deepcopy(old['HostConfig']);need(not h.get('Binds')and not h.get('PortBindings'),'ORIGINAL_BIND_MECHANISM_REQUIRED')
 mounts=h['Mounts'];matches=[m for m in mounts if m['Target']=='/app/.next'];need(len(matches)==1 and matches[0]['Source']==str(BASE/'releases/club-legal-crays-ag-20261107-01/.next')and matches[0]['ReadOnly']is True,'EXACT_OLD_NEXT_MOUNT_REQUIRED');matches[0]['Source']=str(RELEASE/'.next')
 proto=copy.deepcopy(matches[0])
 for source,target in[(ENV,'environment.private.json'),(bootstrap,'bootstrap.cjs'),(CA,'rds-regional-ca.pem')]:
  target='/run/crays-club-public/'+target;need(not any(m['Target']==target for m in mounts),'PRIVATE_TARGET_ALREADY_PRESENT');m=copy.deepcopy(proto);m['Source']=str(source);m['Target']=target;mounts.append(m)
 need(len(mounts)==len(old['HostConfig']['Mounts'])+3 and all(m['ReadOnly']is True for m in mounts),'ONLY_THREE_RO_LEAVES_ALLOWED')
 return c,h
def new_admit(cid,config,host):
 c=inspect(cid);need(c['Id']==cid and c['Name']=='/'+NAME and c['Image']==IMAGE and c['Config']==config,'NEW_CLUB_CONFIG_MISMATCH')
 observed=copy.deepcopy(c['HostConfig']);expected=copy.deepcopy(host)
 if expected.get('OomKillDisable')is None and observed.get('OomKillDisable')is False:expected['OomKillDisable']=False
 need(observed==expected,'NEW_CLUB_HOSTCONFIG_MISMATCH')
 need({m['Destination']:m['Source']for m in c['Mounts']}=={m['Target']:m['Source']for m in host['Mounts']}and all(not m['RW']for m in c['Mounts']),'NEW_CLUB_EXACT_RO_MOUNTS_REQUIRED');return c
def stop_terminal(cid,config=None,host=None):
 need(config is not None and host is not None,'OWNED_NEW_ADMISSION_REQUIRED');c=new_admit(cid,config,host)
 mark=M.mark(c)if c['State']['Running']else None
 if c['State']['Running']:
  try:dock('stop','--time','15',cid,timeout=30)
  finally:
   c=inspect(cid)
   if c['State']['Running']:dock('kill',cid,timeout=15)
 c=inspect(cid);need(not c['State']['Running']and c['State']['Pid']==0,'OWN_CLUB_NOT_TERMINAL')
 if mark:M.terminal(mark)
def netread():return json.loads(dock('network','inspect',NETID,timeout=8))[0]
def others(net,owned):return {cid:v for cid,v in net['Containers'].items()if cid not in owned}
def bind(args):
 review(args.review,'bind');sealed();need((OUT/'SEALED_ACTUAL.json').is_file()and not os.path.lexists(OUT/'BIND_INTENT.json'),'SEALED_RELEASE_REQUIRED_NO_REPLAY')
 family=shared();old=admit_old();mark=M.mark(old);need(mark['pid']==1081952 and mark['ticks']=='25485691','EXACT_CURRENT_CLUB_PROCESS_REQUIRED')
 ep=old['NetworkSettings']['Networks'];need(set(ep)=={NET}and ep[NET]['NetworkID']==NETID and ep[NET]['IPAddress']==IP and ep[NET]['IPAMConfig']['IPv4Address']==IP,'EXACT_SINGLE_STATIC_CLUB_ENDPOINT_REQUIRED');ep=ep[NET]
 n=netread();foreign=others(n,{OLD});need(n['Id']==NETID,'EXACT_WEBSITE_NETWORK_REQUIRED')
 q=subprocess.run(['/usr/bin/docker','inspect',NAME],capture_output=True,timeout=8);need(q.returncode==1 and b'no such object'in q.stderr.lower(),'NEW_NAME_EXISTS_NO_REPLAY')
 bootstrap=OUT/'bootstrap.private.cjs';private_bootstrap(bootstrap);config,host=expectations(old,bootstrap)
 # Private exact preimage is retained for explicit rollback, never emitted.
 write(OUT/'BEFORE.private.json',{'old':old,'mark':mark,'foreign':foreign,'family':family,'config':config,'host':host})
 review(args.review,'bind');write(OUT/'BIND_INTENT.json',{'oldId':OLD,'newName':NAME,'buildId':BUILD_ID,'ip':IP,'edgeSHA256':EDGE_SHA,'replayAllowed':False,'parallelServingStackAllowed':False})
 signal.signal(signal.SIGTERM,lambda *a:(_ for _ in()).throw(KeyboardInterrupt()));signal.signal(signal.SIGINT,lambda *a:(_ for _ in()).throw(KeyboardInterrupt()))
 cid=None;admitted=False
 try:
  dock('stop','--time','15',OLD,timeout=30);c=admit_old(False);need(c['State']['Pid']==0,'OLD_CLUB_PID_NOT_ZERO');M.terminal(mark)
  dock('network','disconnect',NETID,OLD,timeout=15);need(NET not in inspect(OLD)['NetworkSettings']['Networks']and others(netread(),{OLD})==foreign,'OLD_ENDPOINT_DISCONNECT_NOT_EXACT')
  # Docker CLI create is avoided: JSON preserves every admitted original field.
  import http.client,socket
  class UnixDocker(http.client.HTTPConnection):
   def connect(self):self.sock=socket.socket(socket.AF_UNIX,socket.SOCK_STREAM);self.sock.settimeout(self.timeout);self.sock.connect('/var/run/docker.sock')
  payload=copy.deepcopy(config);payload['HostConfig']=host;payload['NetworkingConfig']={'EndpointsConfig':{NET:{'IPAMConfig':{'IPv4Address':IP},'Aliases':ep.get('Aliases'),'DriverOpts':ep.get('DriverOpts'),'GwPriority':ep.get('GwPriority',0)}}}
  conn=UnixDocker('localhost',timeout=25)
  try:
   conn.request('POST','/containers/create?name='+NAME,json.dumps(payload).encode(),{'Content-Type':'application/json'});r=conn.getresponse();body=r.read(1048577);need(r.status==201 and len(body)<=1048576,'CREATE_RESULT_UNCERTAIN_INSPECT_NO_REPLAY');cid=json.loads(body)['Id']
  finally:conn.close()
  write(OUT/'CREATED.json',{'id':cid});new_admit(cid,config,host);admitted=True;write(OUT/'NEW_ADMITTED.json',{'id':cid,'name':NAME,'buildId':BUILD_ID})
  need(not inspect(OLD)['State']['Running'],'OLD_MUST_BE_TERMINAL_BEFORE_NEW_START');dock('start',cid,timeout=25);c=new_admit(cid,config,host);need(c['State']['Running']and c['State']['Pid']>0 and not c['State']['OOMKilled'],'NEW_CLUB_RUNNING_REQUIRED')
  nep=c['NetworkSettings']['Networks'];need(set(nep)=={NET}and nep[NET]['NetworkID']==NETID and nep[NET]['IPAddress']==IP,'SAME_ORIGINAL_ROUTED_ENDPOINT_REQUIRED')
  need(others(netread(),{OLD,cid})==foreign and shared()==family,'FOREIGN_ENDPOINT_OR_SHARED_FAMILY_CHANGED')
  # Runtime readiness/product GETs belong to existing Acceptance18, bound to this actual.
  r={'status':'CLUB28_SINGLETON_BOUND_RUNNING_PENDING_ACCEPTANCE18','oldRetainedId':OLD,'newId':cid,'process':M.mark(c),'buildId':BUILD_ID,'manifestSHA256':MANIFEST_SHA,'ip':IP,'edgeSHA256':EDGE_SHA,'edgeUnchanged':True,'sharedFamilyUnchanged':True,'originalPublicAndDependencyMountsRetained':True,'readinessAccepted':False,'customerAcceptance':False,'replayAllowed':False};write(OUT/'RESULT_ACTUAL.json',r);return r
 except BaseException as e:
  signal.signal(signal.SIGTERM,signal.SIG_IGN);signal.signal(signal.SIGINT,signal.SIG_IGN)
  stopped=False
  try:
   # An uncertain create response is inspected by exact own name, never recreated.
   if cid is None:
    q=subprocess.run(['/usr/bin/docker','inspect',NAME],capture_output=True,timeout=8)
    if q.returncode==0:cid=json.loads(q.stdout)[0]['Id']
    else:need(q.returncode==1 and b'no such object'in q.stderr.lower(),'UNKNOWN_CREATE_INSPECTION_REQUIRED')
   if cid is not None:
    new_admit(cid,config,host);stop_terminal(cid,config,host);stopped=True
  finally:write(OUT/'CLOSED_FAILURE.json',{'errorClass':type(e).__name__,'guard':str(e)if isinstance(e,RuntimeError)else None,'newId':cid,'ownedNewPhysicallyStopped':stopped,'explicitRollbackRequired':True,'replayAllowed':False})
  raise
def rollback(args):
 review(args.review,'rollback');need(not os.path.lexists(OUT/'ROLLBACK_INTENT.json'),'ROLLBACK_INTENT_EXISTS_NO_REPLAY');pre=json.loads((OUT/'BEFORE.private.json').read_text());need(shared()==pre['family'],'SHARED_FAMILY_CHANGED_BEFORE_ROLLBACK');old=admit_old(False)
 write(OUT/'ROLLBACK_INTENT.json',{'oldId':OLD,'ip':IP,'replayAllowed':False})
 signal.signal(signal.SIGTERM,lambda *a:(_ for _ in()).throw(KeyboardInterrupt()));signal.signal(signal.SIGINT,lambda *a:(_ for _ in()).throw(KeyboardInterrupt()))
 q=subprocess.run(['/usr/bin/docker','inspect',NAME],capture_output=True,timeout=8);cid=None
 if q.returncode==0:
  cid=json.loads(q.stdout)[0]['Id'];stop_terminal(cid,pre['config'],pre['host'])
  if NET in inspect(cid)['NetworkSettings']['Networks']:dock('network','disconnect',NETID,cid,timeout=15)
 else:need(q.returncode==1 and b'no such object'in q.stderr.lower(),'UNKNOWN_OWNED_RUNTIME_STATE')
 need(others(netread(),{OLD,cid})==pre['foreign'],'FOREIGN_ENDPOINTS_CHANGED')
 if NET not in old['NetworkSettings']['Networks']:
  # Reconnect only the preserved old singleton at its original explicit address.
  ep=pre['old']['NetworkSettings']['Networks'][NET];cmd=['network','connect','--ip',IP]
  for alias in ep.get('Aliases')or[]:cmd+=['--alias',alias]
  dock(*cmd,NETID,OLD,timeout=15)
 dock('start',OLD,timeout=25);c=admit_old();need(c['NetworkSettings']['Networks'][NET]['IPAddress']==IP and others(netread(),{OLD,cid})==pre['foreign']and shared()==pre['family'],'ORIGINAL_SINGLETON_RESTORE_REQUIRED')
 r={'status':'ORIGINAL_CLUB_SINGLETON_ROLLBACK_RUNNING_PENDING_READINESS','id':OLD,'process':M.mark(c),'ip':IP,'sharedFamilyUnchanged':True,'edgeUnchanged':True,'readinessAccepted':False,'replayAllowed':False};write(OUT/'ROLLBACK_ACTUAL.json',r);return r
def main():
 os.umask(0o077);need(os.getuid()==0,'ROOT_REQUIRED')
 need(Path('/sys/devices/virtual/dmi/id/board_asset_tag').read_text().strip()=='i-0eb300e1b02414d8f','EXACT_AWS_HOST_REQUIRED')
 a=argparse.ArgumentParser();a.add_argument('--action',choices=['seal','bind','rollback'],required=True);a.add_argument('--review',required=True);args=a.parse_args();loadhelper();r={'seal':seal,'bind':bind,'rollback':rollback}[args.action](args);print(json.dumps(r))
if __name__=='__main__':
 try:main()
 except BaseException as e:print(json.dumps({'status':'CLUB28_STOPPED_INSPECT_SAME_INTENT','errorClass':type(e).__name__,'guard':str(e)if isinstance(e,RuntimeError)else None,'replayAllowed':False}));sys.exit(1)
