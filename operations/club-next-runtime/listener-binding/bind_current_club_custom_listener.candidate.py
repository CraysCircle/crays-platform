"""Root-only Club28 adoption into the existing singleton site. Source only until Root review.
No Caddy/DNS/shared-family writes. Never replay an uncertain intent.
"""
from pathlib import Path, PurePosixPath
import os,sys,json,hashlib,stat,copy,subprocess,signal,time,argparse,importlib.util
BASE=Path('/srv/crays')
JOB=BASE/'migration-work/20261108/root/club28-custom-listener-source01'
RELEASE=BASE/'releases/club-original-saas28-20261109-01'
OUT=BASE/'acceptance/club-original-saas28-custom-listener-bind-20261109-01'
SEALED_RECEIPT=BASE/'acceptance/club-original-saas28-bind-20261109-01/SEALED_ACTUAL.json'
SEALED_SHA='314aab998a7a79fefe18c6cd9dafe93346db592c962e7ad54c627906ee398ff6'
CURRENT_RECEIPT=BASE/'acceptance/club-original-saas28-native-origin-config-20261109-01/RESULT_ACTUAL.json'
CURRENT_RECEIPT_SHA='98c2a089bb4926ac1062d0da55b11041cb4ecde7e3bac6d1a3c4ca7a42310420'
BOOTSTRAP=BASE/'acceptance/club-original-saas28-bind-20261109-01/bootstrap.private.cjs'
ORIGIN_APPEND=BASE/'migration-work/20261108/root/club28-native-origin-config-source01/native-origin-config.append.cjs'
ORIGIN_APPEND_SHA='672a68880a7c9fcbd6543396a8de3c9b49c39c37d71c3c60dc530ed6ff00b40f'
LISTENER=JOB/'custom-listener.cjs'
LISTENER_SHA='8d9e51d4b5d5e3532289f3ff9e17072bc911914cce38b06c76f98a7aa139d380'
BUILD=BASE/'migration-work/20261108/websites/club-original-saas-build21-20261108-01'
MANIFEST=BUILD/'COMPILED_RELEASE27_MANIFEST.json'
MANIFEST_SHA='ec2c1e7e8ee875e99c3235db3f089502eee69dcc1cff2be9561f418fd7fbbca5'
BUILD_ID='aySu5l_FzwATUE3NCHrmf'
OLD='a3241204260829ee45128bd4080e9febbc17452c060e53faf8fc5a9b482af06c'
NAME='crays-acceptance-public-club-custom-listener28-20261109-01'
IMAGE='sha256:752ea8a2f758c34002a0461bd9f1cee4f9a3c36d48494586f60ffce1fc708e0e'
NET='crays-acceptance-public-static-20261105-01'
NETID='fd541962418c24223d4b467427ced8662ac254c4f55e8ad06bc6ea6c2b5beaca'
EGRESS='crays-private-app-canonical-20261106-01'
EGRESS_ID='f023edae110b963b4c6a24ae708256c02c6c962fb0302f5d23bd52b615244dea'
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
FP={'Config':'80c0418c06173b25f414f0ee7d5bbd88c661cd2b77e338dd8389fde4b05189f8','HostConfig':'4cc8e0f330559979f0bd3faf4cb41bb4ac4460c23b5f173815e701af6d016c53','Mounts':'c2fd91639d2db375524b2d0abe1809b46952a60251cad7196abfacc12d08f09a'}
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
 need(v['action']==action and v['sourceSHA256']==sha(__file__) and v['oldId']==OLD and v['edgeSHA256']==EDGE_SHA and v['manifestSHA256']==MANIFEST_SHA and v['buildId']==BUILD_ID and v['singletonSameIPReplacementApproved']is True and v['privateProjectionQualified']is True and v['qualifiedEgressNetworkId']==EGRESS_ID and v['qualifiedEgressGwPriority']==1,'EXACT_ROOT_REVIEW_REQUIRED')
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
def admit_old(running=True):
 c=inspect(OLD);need(c['Id']==OLD and c['Image']==IMAGE and{key:digest(c[key])for key in FP}==FP,'EXACT_EXISTING_CLUB_PREIMAGE_REQUIRED')
 need(c['Config']['User']=='1000:1000'and c['Config']['WorkingDir']=='/app'and c['Config']['Entrypoint']==['/usr/local/bin/node','--require','/run/crays-club-public/bootstrap.cjs']and c['Config']['Cmd']==['/app/node_modules/next/dist/bin/next','start','--hostname','0.0.0.0','--port','8080'],'EXACT_CLUB_EXECUTION_REQUIRED')
 need(c['State']['Running']==running and not c['State']['OOMKilled'],'EXACT_CLUB_STATE_REQUIRED')
 return c
def private_bootstrap():
 # Root only: compare existing private bootstrap in RAM, never write or output it.
 leaf(ENV,1000,1000,0o400);need(ENV.stat().st_size<=8192,'PRIVATE_PROJECTION_BOUND_REQUIRED')
 fd=os.open(ENV,os.O_RDONLY|os.O_NOFOLLOW)
 try:
  a=os.fstat(fd);body=os.read(fd,8193);b=os.fstat(fd);need((a.st_dev,a.st_ino,a.st_size,a.st_mtime_ns,a.st_ctime_ns)==(b.st_dev,b.st_ino,b.st_size,b.st_mtime_ns,b.st_ctime_ns),'PRIVATE_PROJECTION_GENERATION_CHANGED')
 finally:os.close(fd)
 v=json.loads(body);need(set(v)=={'CRAYS_CLUBS_PUBLIC_PRODUCTION_DATABASE_URL'}and isinstance(v['CRAYS_CLUBS_PUBLIC_PRODUCTION_DATABASE_URL'],str)and v['CRAYS_CLUBS_PUBLIC_PRODUCTION_DATABASE_URL'],'ONE_ORIGINAL_PRIVATE_PURPOSE_REQUIRED')
 leaf(CA,1000,1000,0o444);leaf(BOOTSTRAP,1000,1000,0o400)
 need(sha(CA)==CA_SHA and sha(TEMPLATE)==TEMPLATE_SHA and sha(ORIGIN_APPEND)==ORIGIN_APPEND_SHA,'ORIGINAL_PRIVATE_BOOTSTRAP_SOURCE_PINS_CHANGED')
 template=TEMPLATE.read_bytes();need(template.count(b'__ROOT_PRIVATE_PROJECTION_SHA256__')==1,'ONE_PRIVATE_TEMPLATE_MARKER_REQUIRED')
 expected=template.replace(b'__ROOT_PRIVATE_PROJECTION_SHA256__',hashlib.sha256(body).hexdigest().encode())+ORIGIN_APPEND.read_bytes()
 fd=os.open(BOOTSTRAP,os.O_RDONLY|os.O_NOFOLLOW)
 try:
  a=os.fstat(fd);actual=os.read(fd,32769);b=os.fstat(fd);need(a.st_size<=32768 and(a.st_dev,a.st_ino,a.st_size,a.st_mtime_ns,a.st_ctime_ns)==(b.st_dev,b.st_ino,b.st_size,b.st_mtime_ns,b.st_ctime_ns)and actual==expected,'EXACT_EXISTING_NATIVE_ORIGIN_PRIVATE_BOOTSTRAP_REQUIRED')
 finally:os.close(fd)
 body=None;v=None;actual=None;expected=None
def expectations(old):
 c=copy.deepcopy(old['Config']);c['Image']=IMAGE;c['Cmd']=['/run/crays-club-public/custom-listener.cjs']
 need(c['Entrypoint']==['/usr/local/bin/node','--require','/run/crays-club-public/bootstrap.cjs']and 'NODE_EXTRA_CA_CERTS=/run/crays-club-public/rds-regional-ca.pem'in c['Env'],'EXISTING_PRELOAD_AND_CA_ENV_REQUIRED')
 need(not any(x.split('=',1)[0]=='CRAYS_CLUBS_PUBLIC_PRODUCTION_DATABASE_URL'for x in c['Env']),'PRIVATE_URL_MUST_NOT_BE_DOCKER_ENV')
 h=copy.deepcopy(old['HostConfig']);need(not h.get('Binds')and not h.get('PortBindings'),'ORIGINAL_BIND_MECHANISM_REQUIRED')
 need(len([m for m in old['Mounts']if m['Destination']=='/run/crays-club-public/bootstrap.cjs'and m['Source']==str(BOOTSTRAP)and not m['RW']])==1,'EXISTING_PRIVATE_BOOTSTRAP_MOUNT_REQUIRED')
 mounts=h['Mounts'];proto=next(m for m in mounts if m['Target']=='/run/crays-club-public/bootstrap.cjs')
 target='/run/crays-club-public/custom-listener.cjs';need(not any(m['Target']==target for m in mounts),'LISTENER_TARGET_ALREADY_PRESENT')
 m=copy.deepcopy(proto);m['Source']=str(LISTENER);m['Target']=target;mounts.append(m)
 need(len(mounts)==len(old['HostConfig']['Mounts'])+1 and all(m['ReadOnly']is True for m in mounts),'ONLY_ONE_PUBLIC_RO_LISTENER_LEAF_ALLOWED')
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
def egressread():
 n=json.loads(dock('network','inspect',EGRESS_ID,timeout=8))[0]
 need(n['Id']==EGRESS_ID and n['Name']==EGRESS and n['Driver']=='bridge'and n['Internal']is False and n['IPAM']['Config']==[{'Subnet':'172.24.0.0/16','Gateway':'172.24.0.1'}],'EXACT_QUALIFIED_EGRESS_NETWORK_REQUIRED');return n
def others(net,owned):return {cid:v for cid,v in net['Containers'].items()if cid not in owned}
def bind(args):
 review(args.review,'bind');sealed();need(sha(SEALED_RECEIPT)==SEALED_SHA and sha(CURRENT_RECEIPT)==CURRENT_RECEIPT_SHA and not os.path.lexists(OUT),'EXACT_CURRENT_AND_SEALED_RECEIPTS_REQUIRED_NO_REPLAY');leaf(LISTENER,1000,1000,0o444);need(sha(LISTENER)==LISTENER_SHA,'FROZEN_PUBLIC_LISTENER_CHANGED')
 family=shared();old=admit_old();mark=M.mark(old);need(mark['pid']==1682428 and mark['ticks']=='30616200','EXACT_CURRENT_CLUB_PROCESS_REQUIRED')
 ep=old['NetworkSettings']['Networks'];need(set(ep)=={NET,EGRESS}and ep[NET]['NetworkID']==NETID and ep[NET]['IPAddress']==IP and ep[NET]['IPAMConfig']['IPv4Address']==IP and ep[EGRESS]['NetworkID']==EGRESS_ID and ep[EGRESS]['IPAddress']=='172.24.0.3'and ep[EGRESS]['GwPriority']==1,'EXACT_CURRENT_SITE_AND_RDS_ENDPOINTS_REQUIRED');ep=ep[NET]
 n=netread();foreign=others(n,{OLD});need(n['Id']==NETID,'EXACT_WEBSITE_NETWORK_REQUIRED');egress=egressread();egress_foreign=others(egress,{OLD});need(OLD in egress['Containers'],'CURRENT_CLUB_EGRESS_PREIMAGE_REQUIRED')
 q=subprocess.run(['/usr/bin/docker','inspect',NAME],capture_output=True,timeout=8);need(q.returncode==1 and b'no such object'in q.stderr.lower(),'NEW_NAME_EXISTS_NO_REPLAY')
 private_bootstrap();config,host=expectations(old);review(args.review,'bind');OUT.mkdir(mode=0o700)
 # Private exact preimage is retained for explicit rollback, never emitted.
 write(OUT/'BEFORE.private.json',{'old':old,'mark':mark,'foreign':foreign,'egressForeign':egress_foreign,'family':family,'config':config,'host':host})
 review(args.review,'bind');write(OUT/'BIND_INTENT.json',{'oldId':OLD,'newName':NAME,'buildId':BUILD_ID,'ip':IP,'edgeSHA256':EDGE_SHA,'replayAllowed':False,'parallelServingStackAllowed':False,'egressNetworkId':EGRESS_ID,'egressGwPriority':1})
 signal.signal(signal.SIGTERM,lambda *a:(_ for _ in()).throw(KeyboardInterrupt()));signal.signal(signal.SIGINT,lambda *a:(_ for _ in()).throw(KeyboardInterrupt()))
 cid=None;admitted=False
 try:
  dock('stop','--time','15',OLD,timeout=30);c=admit_old(False);need(c['State']['Pid']==0,'OLD_CLUB_PID_NOT_ZERO');M.terminal(mark)
  dock('network','disconnect',NETID,OLD,timeout=15);dock('network','disconnect',EGRESS_ID,OLD,timeout=15);need(not inspect(OLD)['NetworkSettings']['Networks']and others(netread(),{OLD})==foreign and others(egressread(),{OLD})==egress_foreign,'ONLY_CURRENT_CLUB_ENDPOINTS_DISCONNECTED')
  # Docker CLI create is avoided: JSON preserves every admitted original field.
  import http.client,socket
  class UnixDocker(http.client.HTTPConnection):
   def connect(self):self.sock=socket.socket(socket.AF_UNIX,socket.SOCK_STREAM);self.sock.settimeout(self.timeout);self.sock.connect('/var/run/docker.sock')
  payload=copy.deepcopy(config);payload['HostConfig']=host;payload['NetworkingConfig']={'EndpointsConfig':{NET:{'IPAMConfig':{'IPv4Address':IP},'Aliases':ep.get('Aliases'),'DriverOpts':ep.get('DriverOpts'),'GwPriority':0},EGRESS:{'GwPriority':1}}}
  conn=UnixDocker('localhost',timeout=25)
  try:
   conn.request('POST','/containers/create?name='+NAME,json.dumps(payload).encode(),{'Content-Type':'application/json'});r=conn.getresponse();body=r.read(1048577);need(r.status==201 and len(body)<=1048576,'CREATE_RESULT_UNCERTAIN_INSPECT_NO_REPLAY');cid=json.loads(body)['Id']
  finally:conn.close()
  write(OUT/'CREATED.json',{'id':cid});new_admit(cid,config,host);admitted=True;write(OUT/'NEW_ADMITTED.json',{'id':cid,'name':NAME,'buildId':BUILD_ID})
  need(not inspect(OLD)['State']['Running'],'OLD_MUST_BE_TERMINAL_BEFORE_NEW_START');dock('start',cid,timeout=25);c=new_admit(cid,config,host);need(c['State']['Running']and c['State']['Pid']>0 and not c['State']['OOMKilled'],'NEW_CLUB_RUNNING_REQUIRED')
  nep=c['NetworkSettings']['Networks'];need(set(nep)=={NET,EGRESS}and nep[NET]['NetworkID']==NETID and nep[NET]['IPAddress']==IP and nep[NET]['GwPriority']==0 and nep[EGRESS]['NetworkID']==EGRESS_ID and nep[EGRESS]['GwPriority']==1 and nep[EGRESS]['Gateway']=='172.24.0.1'and nep[EGRESS]['IPAddress']=='172.24.0.3','SAME_SITE_AND_QUALIFIED_EGRESS_ENDPOINTS_REQUIRED')
  need(others(netread(),{OLD,cid})==foreign and others(egressread(),{cid})==egress_foreign and shared()==family,'FOREIGN_ENDPOINT_OR_SHARED_FAMILY_CHANGED')
  # Runtime readiness/product GETs belong to existing Acceptance18, bound to this actual.
  r={'status':'CLUB28_CUSTOM_LISTENER_SINGLETON_BOUND_RUNNING_PENDING_PRIVATE_TLS_ACCEPTANCE18','oldRetainedId':OLD,'newId':cid,'process':M.mark(c),'buildId':BUILD_ID,'manifestSHA256':MANIFEST_SHA,'ip':IP,'egressNetworkId':EGRESS_ID,'egressIP':nep[EGRESS]['IPAddress'],'egressGwPriority':1,'edgeSHA256':EDGE_SHA,'edgeUnchanged':True,'sharedFamilyUnchanged':True,'originalPublicAndDependencyMountsRetained':True,'existingPrivatePreloadRetained':True,'newPublicListenerSHA256':LISTENER_SHA,'readinessAccepted':False,'customerAcceptance':False,'replayAllowed':False};write(OUT/'RESULT_ACTUAL.json',r);return r
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
  if EGRESS in inspect(cid)['NetworkSettings']['Networks']:dock('network','disconnect',EGRESS_ID,cid,timeout=15)
  need(not inspect(cid)['NetworkSettings']['Networks'],'OWNED_NEW_ENDPOINTS_NOT_DETACHED')
 else:need(q.returncode==1 and b'no such object'in q.stderr.lower(),'UNKNOWN_OWNED_RUNTIME_STATE')
 need(others(netread(),{OLD,cid})==pre['foreign']and others(egressread(),{cid})==pre['egressForeign'],'FOREIGN_ENDPOINTS_CHANGED')
 if NET not in old['NetworkSettings']['Networks']:
  # Reconnect only the preserved old singleton at its original explicit address.
  ep=pre['old']['NetworkSettings']['Networks'][NET];cmd=['network','connect','--ip',IP]
  for alias in ep.get('Aliases')or[]:cmd+=['--alias',alias]
  dock(*cmd,NETID,OLD,timeout=15)
 if EGRESS not in inspect(OLD)['NetworkSettings']['Networks']:dock('network','connect','--gw-priority','1',EGRESS_ID,OLD,timeout=15)
 dock('start',OLD,timeout=25);c=admit_old();need(c['NetworkSettings']['Networks'][NET]['IPAddress']==IP and c['NetworkSettings']['Networks'][EGRESS]['IPAddress']=='172.24.0.3'and c['NetworkSettings']['Networks'][EGRESS]['GwPriority']==1 and others(netread(),{OLD,cid})==pre['foreign']and others(egressread(),{cid})==pre['egressForeign']and shared()==pre['family'],'ORIGINAL_SINGLETON_RESTORE_REQUIRED')
 r={'status':'ORIGINAL_CLUB_SINGLETON_ROLLBACK_RUNNING_PENDING_READINESS','id':OLD,'process':M.mark(c),'ip':IP,'sharedFamilyUnchanged':True,'edgeUnchanged':True,'readinessAccepted':False,'replayAllowed':False};write(OUT/'ROLLBACK_ACTUAL.json',r);return r
def main():
 os.umask(0o077);need(os.getuid()==0,'ROOT_REQUIRED')
 need(Path('/sys/devices/virtual/dmi/id/board_asset_tag').read_text().strip()=='i-0eb300e1b02414d8f','EXACT_AWS_HOST_REQUIRED')
 a=argparse.ArgumentParser();a.add_argument('--action',choices=['bind','rollback'],required=True);a.add_argument('--review',required=True);args=a.parse_args();loadhelper();r={'bind':bind,'rollback':rollback}[args.action](args);print(json.dumps(r))
if __name__=='__main__':
 try:main()
 except BaseException as e:print(json.dumps({'status':'CLUB28_STOPPED_INSPECT_SAME_INTENT','errorClass':type(e).__name__,'guard':str(e)if isinstance(e,RuntimeError)else None,'replayAllowed':False}));sys.exit(1)
