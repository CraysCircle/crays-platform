"""Root-only Club28 adoption into the existing singleton site. Source only until Root review.
No Caddy/DNS/shared-family writes. Never replay an uncertain intent.
"""
from pathlib import Path, PurePosixPath
import os,sys,json,hashlib,stat,copy,subprocess,signal,time,argparse,importlib.util
BASE=Path('/srv/crays')
JOB=BASE/'migration-work/20261108/root/club38-member-runtime-install01'
RELEASE=BASE/'releases/club-original-saas38-20261109-01'
OUT=BASE/'acceptance/club-member-runtime38-20261109-01'
CACHE=BASE/'runtime/club-native-image-cache37-20261109-01'
CACHE_TARGET=RELEASE/'.next/cache'
CACHE_CONFIG=BASE/'migration-work/20261108/root/club-native-image-cache37-source01/native-image-cache-bound.cjs'
CACHE_CONFIG_SHA='8f129109ec9c4a10ac61e7aa48ea230d00237ee0aa147ee4b949018b494f921a'
SOURCE18=BASE/'migration-work/20261108/root/club28-private-https-acceptance18-source03/execution03/RESULT_ACTUAL.json'
SOURCE18_SHA='e782a6756342205a6c0ef6329233cd97ebb0c6b8a844775c4ed4b49ec3f8e492'
SEALED_RECEIPT=BASE/'acceptance/club-original-saas38-seal-20261109-01/SEALED_ACTUAL.json'
SEALED_SHA='5634116c09715fe2a9f1c7454fa1083b7b0e4ef0e6be1451b2f2f7c2301ff43c'
CURRENT_RECEIPT=BASE/'acceptance/club-original-saas28-custom-listener-bind-20261109-01/RESULT_ACTUAL.json'
CURRENT_RECEIPT_SHA='0e2b656ebefc44bfcc17b69fb5cb8977f86eca40a593b7c8d62608e5eac493e0'
PRIVATE=BASE/'private/club38-member-runtime-20261109-01'
BOOTSTRAP=PRIVATE/'bootstrap.private.cjs'
ORIGIN_APPEND=BASE/'migration-work/20261108/root/club28-native-origin-config-source01/native-origin-config.append.cjs'
ORIGIN_APPEND_SHA='672a68880a7c9fcbd6543396a8de3c9b49c39c37d71c3c60dc530ed6ff00b40f'
LISTENER=BASE/'migration-work/20261108/root/club28-custom-listener-source01/custom-listener.cjs'
LISTENER_SHA='8d9e51d4b5d5e3532289f3ff9e17072bc911914cce38b06c76f98a7aa139d380'
BUILD=BASE/'migration-work/20261108/root/club38-original-rds-build01'
MANIFEST=BUILD/'COMPILED_RELEASE38_MANIFEST.json'
MANIFEST_SHA='fb2a5cbe1d46cdcda8162ce23194237fac1972771c34cbc351be8db3294f52a5'
BUILD_ID='oBGvsXCd08tp4gsMwOOo5'
OLD='d1ec58adc81956d5a52abb50b82ff7def6e13aab1a07422321e6fc1a0d964366'
NAME='crays-acceptance-public-club-member38-20261109-01'
IMAGE='sha256:752ea8a2f758c34002a0461bd9f1cee4f9a3c36d48494586f60ffce1fc708e0e'
NET='crays-acceptance-public-static-20261105-01'
NETID='fd541962418c24223d4b467427ced8662ac254c4f55e8ad06bc6ea6c2b5beaca'
EGRESS='crays-private-app-canonical-20261106-01'
EGRESS_ID='f023edae110b963b4c6a24ae708256c02c6c962fb0302f5d23bd52b615244dea'
IP='172.18.0.11'
EDGE=BASE/'runtime/private-edge-caddy-20261106-03/Caddyfile.private'
EDGE_SHA='16c60f4013876ef2db3807d3112bfb7636d962305091050bdc5759d7c579c014'
ENV=PRIVATE/'environment.private.json'
CA=BASE/'private/club-public-rds-login-20261108-17/rds-regional-ca.pem'
CA_SHA='a2c1bf4e3775a038e1db2cf92f9792c94855f20c6e1a72ada7587cb29e242c6e'
TEMPLATE=JOB/'private-app-bootstrap38.template.cjs'
TEMPLATE_SHA='525a57490b5a0b479602478cb9cbc6254430f93759881a1fcd8a9e18d8af5990'
HELPER=BASE/'incoming/org-private-correction-20261107-02-r04/install_org_private_candidate.py'
HELPER_SHA='157996e57ce3fd6ccfaf9d764f86a80edf9220d05f19987b5337bc61ce096aa0'
FP={'Config':'4692664e23d7887fc5519e56f15ef0aef8455ca848a9d0fc10a1b7e9ee262798','HostConfig':'2c2d4cdc143afc49ca9ea145f42f1988d534b1a3da8a09b5913b383fd83eaade','Mounts':'b0f1efb909351d0ee54bb84219c3e36e6a03e7c97d6ddf25b900cb6cf646c786'}
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
 v=json.loads(MANIFEST.read_text());need(v['status']=='CURRENT_CLUB_ORIGINAL_ADAPTER_RDS_BUILD_PASS_NOT_INSTALLED'and v['buildId']==BUILD_ID and v['compiledRoot']==str(BUILD/'source/.next')and v['originalPublicAndDependencyMountsMustBeRetained']is True,'ORIGINAL_BUILD28_CONTRACT_REQUIRED')
 rows=v['compiledFiles'];need(len(rows)==3554 and sum(r['bytes']for r in rows)==110083500,'EXACT_COMPILED_FILESET_REQUIRED');seen=set()
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
 need(c['Config']['User']=='1000:1000'and c['Config']['WorkingDir']=='/app'and c['Config']['Entrypoint']==['/usr/local/bin/node','--require','/run/crays-club-public/bootstrap.cjs','--require','/run/crays-club-public/native-image-cache-bound.cjs']and c['Config']['Cmd']==['/run/crays-club-public/custom-listener.cjs'],'EXACT_CLUB_EXECUTION_REQUIRED')
 need(c['State']['Running']==running and not c['State']['OOMKilled'],'EXACT_CLUB_STATE_REQUIRED')
 return c
def private_bootstrap():
 need(not os.path.lexists(PRIVATE),'PRIOR_PRIVATE_PROJECTION_INSPECT_NO_REPLAY')
 leaf(CA,1000,1000,0o444);need(sha(CA)==CA_SHA and sha(TEMPLATE)==TEMPLATE_SHA and sha(ORIGIN_APPEND)==ORIGIN_APPEND_SHA,'QUALIFIED_PRIVATE_SOURCES_CHANGED')
 seed=json.loads((BASE/'acceptance/club38-original-public-identities-repair-20261109-01/RESULT_ACTUAL.json').read_text())
 need(seed['status']=='CLUB38_ORIGINAL_TWO_IDENTITIES_RESTORED_RUNTIME_READ_PASS'and seed['seedRowsCommitted']and seed['runtimeReadAccepted']and not seed['cleanupErrors'],'ORIGINAL_PUBLIC_IDENTITIES_REPAIR_REQUIRED')
 ack=json.loads((BASE/'migration-work/20261108/github/club-source38-source01/GITHUB_BUILD38_SOURCE_ACK_ACTUAL.json').read_text())
 need(ack['repository']=='CraysCircle/crays-platform'and ack['sourceCommit']=='5ca2e4de262027a830131de8df9252558a6183a3'and ack['sourceTagAndCommitVerified']and ack['originalCompiledManifestSHA256']==MANIFEST_SHA and ack['originalRdsAdapterSHA256']=='5490f6a92c466227589a3977c794c45b688893d92a9b3d8f6fd715b9be240b69','EXACT_GITHUB_BUILD38_MAPPING_REQUIRED')
 parts=[
 (BASE/'private/club-public-rds-login-20261108-17/app-environment.private.json',{'CRAYS_CLUBS_PUBLIC_PRODUCTION_DATABASE_URL'}),
 (BASE/'private/club38-member-identity-20261109-01/environment.private.json',{'AUTH0_CLUBS_BASE_URL','AUTH0_CLUBS_CLIENT_ID','AUTH0_CLUBS_CLIENT_SECRET','AUTH0_CLUBS_DOMAIN','AUTH0_CLUBS_SECRET','CRAYS_CORE_ORIGINAL_MEMBER_RPC_DATABASE_URL','CRAYS_CORE_ORIGINAL_MEMBER_RPC_CONTRACT','CRAYS_CORE_ORIGINAL_MEMBER_RPC_XL_TARGET','CRAYS_AWS_IDENTITY_TRANSPORT','CRAYS_AWS_IDENTITY_APPROVAL'}),
 (BASE/'private/club38-public-identity-reader-20261109-01/environment.private.json',{'CRAYS_DATABASE_URL','CRAYS_DATABASE_POOL_MAX','CRAYS_DATABASE_SSL'})]
 values={}
 for p,keys in parts:
  leaf(p,1000,1000,0o400)
  fd=os.open(p,os.O_RDONLY|os.O_NOFOLLOW)
  try:
   a=os.fstat(fd);raw=os.read(fd,16385);b=os.fstat(fd)
   need(a.st_size<=16384 and(a.st_dev,a.st_ino,a.st_size,a.st_mtime_ns,a.st_ctime_ns)==(b.st_dev,b.st_ino,b.st_size,b.st_mtime_ns,b.st_ctime_ns),'PRIVATE_SOURCE_CUSTODY_CHANGED')
  finally:os.close(fd)
  v=json.loads(raw);need(set(v)==keys and all(isinstance(x,str)and x for x in v.values())and not(set(values)&keys),'EXACT_DISJOINT_EXISTING_PURPOSES_REQUIRED');values.update(v)
 import urllib.parse
 host='crays-prod-postgres-20261106-01.cpewggqg89tp.eu-central-2.rds.amazonaws.com'
 expected={'CRAYS_CLUBS_PUBLIC_PRODUCTION_DATABASE_URL':('crays_clubs_public_rpc_runtime_v1','neondb'),'CRAYS_CORE_ORIGINAL_MEMBER_RPC_DATABASE_URL':('crays_core_member_identity_rpc_runtime_v3','member_core_01a11155_20261011'),'CRAYS_DATABASE_URL':('crays_club_member_eligibility_runtime_v1','crays_forest_city_main_test_20260925')}
 for key,(user,db)in expected.items():
  u=urllib.parse.urlsplit(values[key]);need(u.scheme in['postgresql','postgres']and u.hostname==host and u.port==5432 and u.username==user and u.path=='/'+db and u.password,'EXACT_SEPARATE_RDS_PURPOSE_BINDINGS_REQUIRED')
 need(values['AUTH0_CLUBS_BASE_URL']=='https://www.craysclub.com'and values['CRAYS_DATABASE_POOL_MAX']=='2'and values['CRAYS_DATABASE_SSL']=='require'and values['CRAYS_CORE_ORIGINAL_MEMBER_RPC_XL_TARGET']=='aws-member-v1'and values['CRAYS_AWS_IDENTITY_TRANSPORT']=='aws-original-identity-v1','EXACT_APPROVED_CLUB_MEMBER_RUNTIME_VALUES_REQUIRED')
 body=(json.dumps(values,sort_keys=True,separators=(',',':'))+'\n').encode();need(len(body)<=8192,'QUALIFIED_BOOTSTRAP_ENV_BOUND_REQUIRED')
 template=TEMPLATE.read_bytes();need(template.count(b'__ROOT_PRIVATE_PROJECTION_SHA256__')==1,'ONE_PRIVATE_TEMPLATE_PIN_REQUIRED')
 bootstrap=template.replace(b'__ROOT_PRIVATE_PROJECTION_SHA256__',hashlib.sha256(body).hexdigest().encode())+ORIGIN_APPEND.read_bytes()
 PRIVATE.mkdir(mode=0o700)
 for path,data in[(ENV,body),(BOOTSTRAP,bootstrap)]:
  fd=os.open(path,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o400)
  with os.fdopen(fd,'wb')as f:f.write(data);f.flush();os.fsync(f.fileno());os.fchown(f.fileno(),1000,1000)
 write(PRIVATE/'PROJECTION_ACTUAL.json',{'status':'EXACT_EXISTING_FOURTEEN_CLUB_MEMBER_RUNTIME_FIELDS_PROJECTED','publicBaseURL':'https://www.craysclub.com','privateValuesPrinted':False,'existingCredentialsUnchanged':True,'newHumanIdentityOrSessionCreated':False,'keyCount':14,'runtimeInstalled':False})
 values.clear();body=None;v=None;raw=None;bootstrap=None

def expectations(old):
 c=copy.deepcopy(old['Config']);c['Image']=IMAGE
 need(c['Entrypoint']==['/usr/local/bin/node','--require','/run/crays-club-public/bootstrap.cjs','--require','/run/crays-club-public/native-image-cache-bound.cjs']and c['Cmd']==['/run/crays-club-public/custom-listener.cjs'],'EXACT_EXISTING_LISTENER_AND_CACHE_PRELOAD')
 h=copy.deepcopy(old['HostConfig']);need(not h.get('Binds')and not h.get('PortBindings'),'ORIGINAL_BIND_MECHANISM_REQUIRED')
 mounts=h['Mounts'];targets={m['Target']:m for m in mounts}
 for source,target in[(RELEASE/'.next','/app/.next'),(BOOTSTRAP,'/run/crays-club-public/bootstrap.cjs'),(ENV,'/run/crays-club-public/environment.private.json')]:
  need(target in targets and targets[target]['ReadOnly'],'EXACT_EXISTING_READONLY_MOUNT_REQUIRED');targets[target]['Source']=str(source)
 need('/run/crays/member-postgres-ca.crt'not in targets,'MEMBER_CA_ALIAS_ALREADY_PRESENT')
 m=copy.deepcopy(targets['/run/crays-club-public/rds-regional-ca.pem']);m['Target']='/run/crays/member-postgres-ca.crt';m['Source']=str(CA);m['ReadOnly']=True;mounts.append(m)
 need(len(mounts)==len(old['HostConfig']['Mounts'])+1 and sum(not m.get('ReadOnly',False)for m in mounts)==1 and targets['/app/.next/cache']['Source']==str(CACHE),'ONLY_COMPILED_BOOTSTRAP_ENV_AND_MEMBER_CA_CHANGE')
 return c,h

def new_admit(cid,config,host):
 c=inspect(cid);need(c['Id']==cid and c['Name']=='/'+NAME and c['Image']==IMAGE and c['Config']==config,'NEW_CLUB_CONFIG_MISMATCH')
 observed=copy.deepcopy(c['HostConfig']);expected=copy.deepcopy(host)
 if expected.get('OomKillDisable')is None and observed.get('OomKillDisable')is False:expected['OomKillDisable']=False
 need(observed==expected,'NEW_CLUB_HOSTCONFIG_MISMATCH')
 need({m['Destination']:m['Source']for m in c['Mounts']}=={m['Target']:m['Source']for m in host['Mounts']}and {m['Destination']for m in c['Mounts']if m['RW']}=={'/app/.next/cache'},'NEW_CLUB_EXACT_RO_MOUNTS_REQUIRED');return c
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
 review(args.review,'bind');sealed();need(sha(SEALED_RECEIPT)==SEALED_SHA and not os.path.lexists(OUT),'EXACT_CURRENT_AND_SEALED_RECEIPTS_REQUIRED_NO_REPLAY');leaf(LISTENER,1000,1000,0o444);need(sha(LISTENER)==LISTENER_SHA and sha(CACHE_CONFIG)==CACHE_CONFIG_SHA and sha(SOURCE18)==SOURCE18_SHA,'EXACT_LISTENER_CACHE_CONFIG_AND_SOURCE18_PINS_REQUIRED');leaf(CACHE_CONFIG,1000,1000,0o444);need(CACHE.is_dir()and CACHE_TARGET.is_dir(),'EXISTING_CACHE_AND_SEALED_TARGET_REQUIRED')
 family=shared();old=admit_old();mark=M.mark(old);need(mark['pid']==1705628 and mark['ticks']=='30822459','EXACT_CURRENT_CLUB_PROCESS_REQUIRED')
 ep=old['NetworkSettings']['Networks'];need(set(ep)=={NET,EGRESS}and ep[NET]['NetworkID']==NETID and ep[NET]['IPAddress']==IP and ep[NET]['IPAMConfig']['IPv4Address']==IP and ep[EGRESS]['NetworkID']==EGRESS_ID and ep[EGRESS]['IPAddress']=='172.24.0.3'and ep[EGRESS]['GwPriority']==1,'EXACT_CURRENT_SITE_AND_RDS_ENDPOINTS_REQUIRED');ep=ep[NET]
 n=netread();foreign=others(n,{OLD});need(n['Id']==NETID,'EXACT_WEBSITE_NETWORK_REQUIRED');egress=egressread();egress_foreign=others(egress,{OLD});need(OLD in egress['Containers'],'CURRENT_CLUB_EGRESS_PREIMAGE_REQUIRED')
 q=subprocess.run(['/usr/bin/docker','inspect',NAME],capture_output=True,timeout=8);need(q.returncode==1 and b'no such object'in q.stderr.lower(),'NEW_NAME_EXISTS_NO_REPLAY')
 private_bootstrap();original18=json.loads(SOURCE18.read_text());need(original18['containerId']=='ce77bafdbf172f389d207ef413d058949411b9f6f324982c31a9f5ca79601710'and original18['buildId']=='aySu5l_FzwATUE3NCHrmf'and original18['status']=='FIVE_AMBASSADORS_PORTRAIT_BYTES_TWO_PROPERTY_CONTENT_PLANNING_AND_BOUNDED_RAW_MEDIA_SEARCH_SSR_PASS_BROWSER_AND_CUSTOMER_OPEN','EXACT_ORIGINAL_SOURCE18_APPLICABILITY_REQUIRED');config,host=expectations(old);review(args.review,'bind');OUT.mkdir(mode=0o700)
 # Private exact preimage is retained for explicit rollback, never emitted.
 write(OUT/'BEFORE.private.json',{'old':old,'mark':mark,'foreign':foreign,'egressForeign':egress_foreign,'family':family,'config':config,'host':host})
 review(args.review,'bind');write(OUT/'BIND_INTENT.json',{'oldId':OLD,'newName':NAME,'buildId':BUILD_ID,'ip':IP,'edgeSHA256':EDGE_SHA,'replayAllowed':False,'parallelServingStackAllowed':False,'egressNetworkId':EGRESS_ID,'egressGwPriority':1})
 signal.signal(signal.SIGTERM,lambda *a:(_ for _ in()).throw(KeyboardInterrupt()));signal.signal(signal.SIGINT,lambda *a:(_ for _ in()).throw(KeyboardInterrupt()))
 cid=None;admitted=False
 try:
  dock('stop','--time','15',OLD,timeout=30);c=admit_old(False);need(c['State']['Pid']==0,'OLD_CLUB_PID_NOT_ZERO');M.terminal(mark)
  write(OUT/'CACHE_REUSE_ACK.json',{'existingHostPath':str(CACHE),'target':'/app/.next/cache','nativeNextMaximumDiskCacheSize':134217728,'originalCachedImagesRetained':True,'cacheDataRemoved':False})
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
  r={'status':'CLUB38_ORIGINAL_RDS_MEMBER_AUTH0_SINGLETON_BOUND_RUNNING_CUSTOMER_OPEN','oldRetainedId':OLD,'newId':cid,'process':M.mark(c),'buildId':BUILD_ID,'manifestSHA256':MANIFEST_SHA,'ip':IP,'egressNetworkId':EGRESS_ID,'egressIP':nep[EGRESS]['IPAddress'],'egressGwPriority':1,'edgeSHA256':EDGE_SHA,'edgeUnchanged':True,'sharedFamilyUnchanged':True,'originalPublicAndDependencyMountsRetained':True,'existingPrivatePreloadCustodyRetained':True,'existingFourteenFieldMemberAuth0RdsProjectionInstalled':True,'newPublicListenerSHA256':LISTENER_SHA,'nativeImageCacheConfigSHA256':CACHE_CONFIG_SHA,'nativeImageMaximumDiskCacheSize':134217728,'nativeImageCacheHostPath':str(CACHE),'source18ProofApplicability':{'status':'ORIGINAL_PUBLIC_SOURCE18_REQUIRES_NEW_BUILD38_HTTP_ACCEPTANCE','originalSource18Path':str(SOURCE18),'originalSource18SHA256':SOURCE18_SHA,'originalRootBindingSHA256':original18['rootBindingSHA256'],'oldContainerId':OLD,'newContainerId':cid,'buildId':BUILD_ID,'edgeSHA256':EDGE_SHA,'compiledFileBodiesUnchanged':False,'originalListenerUnchanged':True,'originalPrivateBootstrapAndProjectionUnchanged':False,'originalAssetAndDependencyMountsUnchanged':True,'siteAndRdsAddressesPreserved':True,'onlyCompiledBootstrapEnvironmentAndMemberCaChanged':True,'originalGetReceiptUnmodified':True,'newHttpChecksExecuted':False},'readinessAccepted':False,'customerAcceptance':False,'replayAllowed':False};write(OUT/'RESULT_ACTUAL.json',r);return r
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

