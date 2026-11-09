"""Root-reviewed private Org replacement only. No DNS/SG/public TLS operations.
Phases are separate one-shot intents. Never replay after an uncertain result.
"""
from pathlib import Path,PurePosixPath
import os,sys,json,hashlib,tarfile,argparse,subprocess,time,urllib.request,urllib.error,runpy,stat,signal,fcntl
B=Path('/srv/crays');ROOT=B/'releases/org-current-home-correction-20261107-02';OUT=B/'acceptance/org-current-home-correction-20261107-02'
OLD='9ed987292e4b28da24f02290de1cdce1f782e4402bb4cbcdc31ecb1e6afa404d';OLDROOT=B/'releases/org-account-next-20261106-01';EDGE='20003ed249ddaf862469f7397c10aa21d8c24b134412da05f1d11e35ef2667d5';EDGE_IMAGE='sha256:4c6e91c6ed0e2fa03efd5b44747b625fec79bc9cd06ac5235a779726618e530d';EDGEFILE=B/'runtime/private-edge-caddy-20261106-03/Caddyfile.private';EDGE_SHA='934a07d10a1de218a40188471c01dcddff797cfbf8b54f251605872d1783591c'
IMAGE='sha256:752ea8a2f758c34002a0461bd9f1cee4f9a3c36d48494586f60ffce1fc708e0e';NET='crays-private-app-canonical-20261106-01';NETID='f023edae110b963b4c6a24ae708256c02c6c962fb0302f5d23bd52b615244dea';NAME='crays-acceptance-public-org-current-home-20261107-02';OWNER='01a19c4c-4e60-7eb3-93ea-0a15a89cfae0';LIB=B/'acceptance/public-frontends-20261105-01/web-pro/8dc8d503dbfac3f218363f0dc28492b953e3a2b3ee6e8627c368026c26a010ec/root/node_modules'
ARCHIVE_SHA='36ec254d9d10d619a7261bffbce41ba700bb3b3106f48d9d2beb14ccfb73a047';MANIFEST_SHA='a88fbe744e7cc05dbd3ca8f161b7c14f6fdf781863821262b2d839cf9f2b82d4';BID='yWLUpNSNt_VqJRfO-g2G-';MNAME='ORG_CURRENT_HOME_CORRECTION_RELEASE_MANIFEST.json';ORIGINAL_SHA='16bf8a1b541cbe9c65a7aefd2289d957391a6b944cfcc1d7b222feaa3a8722d7'
def need(v,g):
 if not v:raise RuntimeError(g)
def sha(p):
 with p.open('rb')as f:return hashlib.file_digest(f,'sha256').hexdigest()
def write(p,v):
 data=v if isinstance(v,bytes)else(json.dumps(v,indent=2)+'\n').encode();fd=os.open(p,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o400)
 with os.fdopen(fd,'wb')as f:f.write(data);f.flush();os.fsync(f.fileno())
def docker(*args,input=None,timeout=30):
 r=subprocess.run(['/usr/bin/docker',*args],input=input,capture_output=True,timeout=timeout,env={'PATH':'/usr/bin:/bin'});need(r.returncode==0,'DOCKER_RESULT_FAILED_INSPECT_NO_REPLAY');return r.stdout
def inspect(ref):return json.loads(docker('inspect',ref,timeout=8))[0]
def custody(c,name=None):
 need(c['Image']==IMAGE and c['Config']['User']=='1000:1000'and c['Config']['Labels'].get('crays.owner.thread')==OWNER and c['HostConfig']['NetworkMode']==NET,'ORG_CUSTODY_CHANGED')
 if name:need(c['Name']=='/'+name,'ORG_CONTAINER_NAME_CHANGED')
 h=c['HostConfig'];need(h['ReadonlyRootfs']and h['CapDrop']==['ALL']and'no-new-privileges:true'in h['SecurityOpt']and not h.get('PortBindings')and h['Memory']==768*1024**2 and h['PidsLimit']==96 and h['NanoCpus']==1000000000,'ORG_RUNTIME_BOUNDARY_CHANGED');need(all(not m['RW']for m in c['Mounts']),'ORG_WRITABLE_MOUNT')
 need(not any(k.split('=',1)[0].startswith(('AWS_','AUTH0_','DATABASE_'))for k in c['Config']['Env']),'UNEXPECTED_PRIVATE_CREDENTIAL_KEYS')
def mark(c):
 pid=c['State']['Pid'];p=Path('/proc')/str(pid);return {'pid':pid,'ticks':(p/'stat').read_text().rsplit(')',1)[1].split()[19],'cgroup':(p/'cgroup').read_text().strip().split(':',2)[-1]}
def terminal(m):
 p=Path('/proc')/str(m['pid'])/'stat';need(not p.exists()or p.read_text().rsplit(')',1)[1].split()[19]!=m['ticks'],'OLD_PROCESS_STILL_ALIVE');c=Path('/sys/fs/cgroup')/m['cgroup'].lstrip('/')/'cgroup.procs';need(not c.exists()or not c.read_text().strip(),'STOPPED_CONTAINER_CGROUP_NOT_EMPTY')
def edge(running=True):
 e=inspect(EDGE);need(e['Image']==EDGE_IMAGE and e['Name']=='/crays-private-edge-caddy-20261106-03'and(not running or e['State']['Running'])and e['HostConfig']['NetworkMode']=='host','EDGE_CUSTODY_CHANGED');return e
class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,*a):return None
def get(ip,path,host='www.crays.org'):
 q=urllib.request.Request('http://'+ip+':8080'+path,headers={'Host':host,'Accept-Encoding':'identity'})
 try:r=urllib.request.build_opener(NoRedirect).open(q,timeout=8)
 except urllib.error.HTTPError as e:r=e
 with r:return r.status,r.read(2*1024**2+1)
def edge_get(path):
 q=urllib.request.Request('http://127.0.0.1:18080'+path,headers={'Host':'www.crays.org','Accept-Encoding':'identity'})
 with urllib.request.urlopen(q,timeout=4)as r:return r.status,r.read(2*1024**2+1)
def safe(m):need(m.isfile()and not m.islnk()and not m.issym()and not m.name.startswith('/')and'..'not in PurePosixPath(m.name).parts,'UNSAFE_ARCHIVE_MEMBER')
def extract(tf,m,pin):
 safe(m);need(m.size==pin['bytes'],'SIZE_CHANGED');dest=ROOT/m.name;dest.parent.mkdir(mode=0o700,parents=True,exist_ok=True);fd=os.open(dest,os.O_CREAT|os.O_EXCL|os.O_WRONLY|os.O_NOFOLLOW,0o400);d=hashlib.sha256()
 with tf.extractfile(m)as src,os.fdopen(fd,'wb')as out:
  while chunk:=src.read(1024**2):d.update(chunk);out.write(chunk)
  out.flush();os.fsync(out.fileno())
 need(d.hexdigest()==pin['sha256'],'BODY_HASH_CHANGED');os.chown(dest,1000,1000)
def materialize(descriptor):
 need(ROOT.parent.is_dir()and ROOT.parent.resolve()==ROOT.parent and ROOT.parent.stat().st_uid==0 and not stat.S_IMODE(ROOT.parent.stat().st_mode)&0o022,'UNSAFE_RELEASE_PARENT');need(not os.path.lexists(ROOT)and not OUT.exists(),'EXISTING_INSTALL_STATE_INSPECT_NO_REPLAY');old=inspect(OLD);custody(old);need(old['State']['Running'],'OLD_ORG_NOT_RUNNING');edge();need(sha(EDGEFILE)==EDGE_SHA,'EDGE_CHANGED_REVIEW_CURRENT_SNAPSHOT')
 d=json.loads(Path(descriptor).read_text());need(d['schema']=='crays.versioned-transfer.v1'and d['bucket']=='crays-acceptance-backups-391674093840-eu-central-2'and d['sha256']==ARCHIVE_SHA and d['bytes']==48124389 and d['versionId']and d['versionId']!='null','VERSIONED_TRANSFER_BINDING_REQUIRED')
 need(d['key']=='restore/approved/public-frontends/20261107/org-current-home-correction-'+ARCHIVE_SHA+'.tar.gz','TRANSFER_KEY_CHANGED')
 helper=B/'incoming/guest-runtime-bootstrap-20261105-01/verified_s3_download.candidate.py';need(sha(helper)=='bfe3b6b501a3e50b74d7dfc7ef0f7b11e554d0d5c0b862d2057e168e45db6823','DOWNLOAD_HELPER_CHANGED');g=runpy.run_path(str(helper));g['STORAGE']['verify_data_mount'](B)
 import shutil;need(shutil.disk_usage(B).free>2*1024**3,'STORAGE_RESERVE_REQUIRED')
 import boto3
 from botocore.config import Config
 cfg=Config(retries={'total_max_attempts':1},connect_timeout=10,read_timeout=30);a=boto3.client('sts',region_name='eu-central-2',config=cfg).get_caller_identity();need(a['Account']=='391674093840'and a['Arn'].startswith('arn:aws:sts::391674093840:assumed-role/crays-standing-owner-host-v1/'),'WRONG_NATIVE_ROLE');release=g['materialize'](boto3.client('s3',region_name='eu-central-2',config=cfg),d,B/'incoming')
 original=B/'incoming'/(ORIGINAL_SHA+'.blob');need(original.is_file()and not original.is_symlink()and original.stat().st_size==656506880 and sha(original)==ORIGINAL_SHA,'QUALIFIED_EXISTING_ORIGINAL_ARCHIVE_REQUIRED')
 with tarfile.open(release['path'],'r:*')as tf,tarfile.open(original,'r:')as orig:
  members=tf.getmembers();need(len(members)==2675 and len({m.name for m in members})==2675,'PACKAGE_MEMBERS_CHANGED')
  for m in members:safe(m)
  raw=tf.extractfile(MNAME).read();need(hashlib.sha256(raw).hexdigest()==MANIFEST_SHA,'MANIFEST_CHANGED');manifest=json.loads(raw);pins={r['relativePath']:r for r in manifest['files']};need(len(pins)==2674 and sum(r['bytes']for r in pins.values())==246508094 and manifest['buildId']==BID and manifest['retainedRoutes']==2518,'PACKAGE_BINDING_CHANGED');need(set(pins)=={m.name for m in members if m.name!=MNAME},'PACKAGE_FILE_SET_CHANGED')
  source=orig.extractfile('PRESERVATION_MANIFEST.json').read();need(hashlib.sha256(source).hexdigest()=='b2bf64322bb0677f392c23db19b23488df1f5a0e24432b106d92548b8b00f7a0','ORIGINAL_ASSET_MANIFEST_CHANGED');assets={r['path']:r for r in json.loads(source)['files']if r['path'].startswith('public/assets/')};need(len(assets)==567 and sum(r['bytes']for r in assets.values())==436401722,'ORIGINAL_ASSET_SET_CHANGED')
  overrides={p for p in pins if p.startswith('public/assets/')};need(len(overrides)==7 and set(assets)&overrides=={'public/assets/css/crays-modern-overrides.css','public/assets/js/site.js'},'EXACT_ASSET_OVERRIDE_SET_CHANGED')
  OUT.mkdir(mode=0o700);write(OUT/'MATERIALIZE_INTENT.json',{'archive':d,'target':str(ROOT),'automaticReplay':False});ROOT.mkdir(mode=0o700)
  # New regular files only. Never link/write any existing source or release inode.
  for name,pin in assets.items():
   if name not in overrides:extract(orig,orig.getmember(name),pin)
  for m in members:
   pin={'bytes':len(raw),'sha256':MANIFEST_SHA}if m.name==MNAME else pins[m.name];extract(tf,m,pin)
  (ROOT/'node_modules').mkdir(mode=0o500);need(len(json.loads((ROOT/'data/routes.json').read_text()))==2518 and json.loads((ROOT/'.next/required-server-files.json').read_text())['config']['skipTrailingSlashRedirect']is True,'SOURCE_RUNTIME_BINDING_CHANGED')
  receipt={'status':'ORG_CORRECTED_RELEASE_MATERIALIZED_NOT_STARTED','archiveSHA256':ARCHIVE_SHA,'versionId':d['versionId'],'manifestSHA256':MANIFEST_SHA,'buildId':BID,'packageFiles':2674,'existingOriginalAssetsReused':565,'includedAssetDelta':7,'allFileBodiesMatched':True,'hardlinksCreated':False,'originalChanged':False};write(ROOT/'RECOVERY_ACTUAL.json',receipt);write(OUT/'MATERIALIZED_ACTUAL.json',receipt)
 for p in sorted((p for p in ROOT.rglob('*')if p.is_dir()),key=lambda p:len(p.parts),reverse=True):os.chown(p,1000,1000);os.chmod(p,0o500)
 os.chown(ROOT,1000,1000);os.chmod(ROOT,0o500)
 return receipt


def cas_edge(expected_hashes,new,state,label):
 """One inode, one lockedFD, complete preimage; potential mutation marked first."""
 edge(running=False);fd=os.open(EDGEFILE,os.O_RDWR|os.O_NOFOLLOW);pre=None;attempted=False
 try:
  fcntl.flock(fd,fcntl.LOCK_EX|fcntl.LOCK_NB);st=os.fstat(fd);ls=os.lstat(EDGEFILE);inode=[st.st_dev,st.st_ino];need(stat.S_ISREG(st.st_mode)and st.st_uid==0 and inode==[ls.st_dev,ls.st_ino],'EDGE_INODE_OWNER_CHANGED');need(state.get('edgeInode')in[None,inode],'EDGE_INODE_CHANGED');state['edgeInode']=inode
  with os.fdopen(os.dup(fd),'rb')as f:f.seek(0);pre=f.read(65537)
  need(len(pre)<65537 and hashlib.sha256(pre).hexdigest()in expected_hashes,'EDGE_PREIMAGE_CAS_FAILED')
  need([os.lstat(EDGEFILE).st_dev,os.lstat(EDGEFILE).st_ino]==inode,'EDGE_PATH_REPLACED')
  write(OUT/(label+'_WRITE_ATTEMPT.json'),{'inode':inode,'preimageSHA256':hashlib.sha256(pre).hexdigest(),'proposedSHA256':hashlib.sha256(new).hexdigest(),'mayHaveMutated':True})
  state['edgeMutationAttempted']=True;attempted=True
  os.lseek(fd,0,os.SEEK_SET);offset=0
  while offset<len(new):
   n=os.write(fd,new[offset:]);need(n>0,'EDGE_SHORT_WRITE');offset+=n
  os.ftruncate(fd,len(new));os.fsync(fd);os.lseek(fd,0,os.SEEK_SET);body=os.read(fd,65537);need(hashlib.sha256(body).hexdigest()==hashlib.sha256(new).hexdigest(),'EDGE_POSTWRITE_HASH_FAILED');need([os.lstat(EDGEFILE).st_dev,os.lstat(EDGEFILE).st_ino]==inode,'EDGE_PATH_REPLACED_AFTER_WRITE');state.setdefault('edgeKnownHashes',set()).add(hashlib.sha256(new).hexdigest());return
 except BaseException:
  if attempted:
   # Record any partial bytes, then restore known preimage on this same lockedFD.
   try:
    os.lseek(fd,0,os.SEEK_SET);state.setdefault('edgeKnownHashes',set()).add(hashlib.sha256(os.read(fd,65537)).hexdigest())
   except BaseException:pass
   try:
    os.lseek(fd,0,os.SEEK_SET);offset=0
    while offset<len(pre):
     n=os.write(fd,pre[offset:]);need(n>0,'EDGE_PREIMAGE_SHORT_RESTORE');offset+=n
    os.ftruncate(fd,len(pre));os.fsync(fd);os.lseek(fd,0,os.SEEK_SET);need(os.read(fd,65537)==pre,'EDGE_PREIMAGE_RESTORE_FAILED');state.setdefault('edgeKnownHashes',set()).add(hashlib.sha256(pre).hexdigest())
   except BaseException:state['sameFDPreimageRestoreUncertain']=True
  raise
 finally:os.close(fd)
def restart_edge_ready(expected=None):
 # Existing Caddy admin is OFF. No reload command or admin listener is used.
 edge(running=False);docker('restart','--time','10',EDGE,timeout=40);deadline=time.monotonic()+30
 while True:
  try:
   e=edge();st,body=edge_get('/');need(st==200,'EDGE_NOT_READY')
   if expected is not None:need(expected in body,'EDGE_DOCUMENT_NOT_EXPECTED')
   return
  except(urllib.error.URLError,TimeoutError,RuntimeError):
   need(time.monotonic()<deadline,'EDGE_RESTART_READINESS_TIMEOUT');time.sleep(1)
def stop_new_owned(cid):
 # No kill before exact ownCID admission. After admission, inspect uncertainty
 # must not skip a bounded kill/physicalcheck for this same immutableCID.
 if cid is None:
  q=subprocess.run(['/usr/bin/docker','inspect',NAME],capture_output=True,timeout=8)
  if q.returncode==1 and b'no such object'in q.stderr.lower():return {'absent':True}
  need(q.returncode==0,'NEW_ADOPTION_INSPECT_UNCERTAIN');cid=json.loads(q.stdout)[0]['Id']
 c=inspect(cid);custody(c,NAME);need({m['Destination']:m['Source']for m in c['Mounts']}=={'/app':str(ROOT),'/app/node_modules':str(LIB)},'NEW_ADOPTION_MOUNTS_CHANGED');worker=mark(c)if c['State']['Running']else None
 if c['State']['Running']:
  try:docker('stop','--time','10',cid,timeout=25)
  except BaseException:pass
 try:c=inspect(cid);custody(c,NAME)
 except BaseException:c=None
 if c is None or c['State']['Running']:
  try:docker('kill',cid,timeout=15)
  except BaseException:pass
 try:
  c=inspect(cid);custody(c,NAME);need(not c['State']['Running']and c['State']['Pid']==0,'NEW_PROCESS_NOT_TERMINAL');unknown=False
 except BaseException:
  need(worker is not None,'NEW_NO_PHYSICAL_MARK_AND_INSPECT_UNKNOWN');terminal(worker);unknown=True
 if worker:terminal(worker)
 return {'stoppedRetainedId':cid,'physicalTerminationVerified':True,'dockerFinalInspectUnavailable':unknown}
def best_receipt(name,data):
 try:write(OUT/name,data)
 except BaseException as e:print(json.dumps({'unconditionalSanitizedReceipt':data,'receiptPersistenceError':type(e).__name__}))
def recover_failed_replace(state,before,cid):
 """Independent bounded attempts: no oldstart/edge failure skips ownnew stop."""
 results=[]
 def attempt(label,fn):
  try:value=fn();results.append({'step':label,'success':True,'value':value});return True
  except BaseException as e:results.append({'step':label,'success':False,'errorClass':type(e).__name__});return False
 def old_start():
  old=inspect(OLD);custody(old)
  snapshot=json.loads((OUT/'BEFORE_SNAPSHOT.json').read_text());need(old['Name']==snapshot['oldName']and old['Image']==snapshot['oldImage']and old['Mounts']==snapshot['oldMounts'],'OLD_SNAPSHOT_CUSTODY_CHANGED')
  if not old['State']['Running']:docker('start',OLD,timeout=25)
  old=inspect(OLD);custody(old);need(old['State']['Running']and set(old['NetworkSettings']['Networks'])=={NET}and old['NetworkSettings']['Networks'][NET]['NetworkID']==NETID and old['NetworkSettings']['Networks'][NET]['IPAddress']==snapshot['oldIP'],'OLD_NETWORK_IP_CHANGED');deadline=time.monotonic()+30
  while True:
   try:
    st,body=get(snapshot['oldIP'],'/');need(st==200 and hashlib.sha256(body).hexdigest()==snapshot['oldRootBodySHA256'],'OLD_ORIGINAL_BODY_CHANGED');break
   except(urllib.error.URLError,TimeoutError):need(time.monotonic()<deadline,'OLD_BODY_READINESS_TIMEOUT');time.sleep(1)
  return {'retainedId':OLD,'exactIPAndOriginalBodyVerified':True}
 attempt('oldstart',old_start)
 def old_edge_restore():
  snapshot=json.loads((OUT/'BEFORE_SNAPSHOT.json').read_text());bound=inspect(OLD);custody(bound);need(bound['Name']==snapshot['oldName']and bound['Image']==snapshot['oldImage']and bound['Mounts']==snapshot['oldMounts']and set(bound['NetworkSettings']['Networks'])=={NET}and bound['NetworkSettings']['Networks'][NET]['NetworkID']==NETID and bound['NetworkSettings']['Networks'][NET]['IPAddress']==snapshot['oldIP'],'OLD_EDGE_TARGET_CUSTODY_OR_IP_CHANGED')
  if state.get('edgeMutationAttempted'):
   known=state.get('edgeKnownHashes',set())|{EDGE_SHA,state.get('candidateSHA256','')};cas_edge(known,before,state,'EDGE_FAILURE_ROLLBACK');restart_edge_ready()
  need(sha(EDGEFILE)==EDGE_SHA,'OLD_EDGE_HASH_NOT_RESTORED');st,body=edge_get('/');snapshot=json.loads((OUT/'BEFORE_SNAPSHOT.json').read_text());need(st==200 and hashlib.sha256(body).hexdigest()==snapshot['oldRootBodySHA256'],'OLD_EDGE_ORIGINAL_BODY_MISMATCH');return {'edgeSHA256':EDGE_SHA}
 attempt('edgerestore',old_edge_restore)
 attempt('newadopt_stop_physical',lambda:stop_new_owned(cid))
 receipt={'status':'FAILED_PRIVATE_REPLACE_CLEANUP_ATTEMPTED','steps':results,'edgeMayHaveMutated':state.get('edgeMutationAttempted',False),'sameFDPreimageRestoreUncertain':state.get('sameFDPreimageRestoreUncertain',False),'newIdResponse':cid,'automaticReplayAllowed':False,'allCleanupStepsSucceeded':all(x['success']for x in results)};best_receipt('FAILED_REPLACE_ROLLBACK_RESULT.json',receipt);return receipt

def replace():
 need((OUT/'MATERIALIZED_ACTUAL.json').exists()and not(OUT/'REPLACE_INTENT.json').exists(),'REPLACE_STATE_INSPECT_NO_REPLAY');need(sha(ROOT/MNAME)==MANIFEST_SHA and(ROOT/'.next/BUILD_ID').read_text().strip()==BID,'MATERIALIZED_RELEASE_CHANGED');old=inspect(OLD);custody(old);need(old['State']['Running'],'OLD_ORG_NOT_RUNNING');need({m['Destination']:m['Source']for m in old['Mounts']}=={'/app':str(OLDROOT),'/app/node_modules':str(LIB)},'OLD_MOUNTS_CHANGED');edge();before=EDGEFILE.read_bytes();need(hashlib.sha256(before).hexdigest()==EDGE_SHA,'EDGE_SNAPSHOT_CHANGED');oldip=old['NetworkSettings']['Networks'][NET]['IPAddress'];needle=('reverse_proxy '+oldip+':8080 {').encode();need(before.count(needle)==1 and b'http://www.crays.org:18080, http://crays.org:18080 {'in before,'ORG_ROUTE_BINDING_CHANGED')
 net=json.loads(docker('network','inspect',NET,timeout=8))[0];need(net['Id']==NETID and not net['Internal']and net['Options'].get('com.docker.network.bridge.enable_icc')=='false','NETWORK_CHANGED');need(int(next(v.split()[1]for v in Path('/proc/meminfo').read_text().splitlines()if v.startswith('MemAvailable:')))>2*1024**2,'MEMORY_RESERVE_REQUIRED')
 for pkg,version in[('next','16.2.10'),('react','19.2.4'),('react-dom','19.2.4')]:need(json.loads((LIB/pkg/'package.json').read_text())['version']==version,'DEPENDENCY_CHANGED')
 q=subprocess.run(['/usr/bin/docker','inspect',NAME],capture_output=True,timeout=8);need(q.returncode==1 and b'no such object'in q.stderr.lower(),'EXISTING_NEW_CONTAINER_INSPECT_NO_REPLAY');write(OUT/'Caddyfile.before.exact',before);write(OUT/'BEFORE_SNAPSHOT.json',{'oldId':OLD,'oldName':old['Name'],'oldImage':old['Image'],'oldIP':oldip,'oldMounts':old['Mounts'],'oldProcessMark':mark(old),'oldRootBodySHA256':hashlib.sha256(get(oldip,'/')[1]).hexdigest(),'edgeId':EDGE,'edgeSHA256':EDGE_SHA,'newRelease':str(ROOT)});write(OUT/'REPLACE_INTENT.json',{'automaticReplay':False,'publicIngress':False,'installerRevision':4})
 cid=None;success=False;state={'edgeMutationAttempted':False,'edgeKnownHashes':{EDGE_SHA}}
 try:
  cid=docker('create','--pull=never','--name',NAME,'--label','crays.owner.thread='+OWNER,'--label','crays.release.unit=web-org','--network',NET,'--read-only','--cap-drop','ALL','--security-opt','no-new-privileges:true','--user','1000:1000','--memory','768m','--memory-swap','768m','--cpus','1','--pids-limit','96','--restart','no','--log-driver','json-file','--log-opt','max-size=1m','--log-opt','max-file=1','--tmpfs','/tmp:rw,nosuid,nodev,noexec,size=33554432,mode=1777','--workdir','/app','--env','NODE_ENV=production','--env','NEXT_TELEMETRY_DISABLED=1','--env','NODE_OPTIONS=--max-old-space-size=512','--mount','type=bind,src='+str(ROOT)+',dst=/app,readonly','--mount','type=bind,src='+str(LIB)+',dst=/app/node_modules,readonly','--entrypoint','/usr/local/bin/node',IMAGE,'/app/node_modules/next/dist/bin/next','start','--hostname','0.0.0.0','--port','8080').decode().strip();write(OUT/'CREATED.json',{'id':cid});docker('start',cid,timeout=25);deadline=time.monotonic()+35
  while True:
   c=inspect(cid);custody(c,NAME);need(c['State']['Running'],'NEW_ORG_EXITED');ip=c['NetworkSettings']['Networks'][NET]['IPAddress']
   try:status,body=get(ip,'/');break
   except urllib.error.URLError:need(time.monotonic()<deadline,'NEW_READINESS_TIMEOUT');time.sleep(1)
  need(status==200 and b'Forest City'in body and b'href="/account"'in body,'CURRENT_ORG_HOME_FAILED');routes=[]
  for path in['/association','/en','/de','/es','/ca','/fr','/pt','/it']:
   for form in[path,path+'/']:
    st,b=get(ip,form);need(st==200,'ORIGINAL_SLASH_FORM_FAILED');routes.append({'path':form,'status':st})
  st,b=get(ip,'/account');need(st==200 and b'https://member.crays.world/auth/login'in b and b'Sign in to continue'in b,'ACCOUNT_REGRESSION');st,b=get(ip,'/api/nostr/config');need(st==200 and json.loads(b)['identity']['privateKeyPolicy']=='never ask, never store, never send','READONLY_API_REGRESSION')
  manifest=json.loads((ROOT/MNAME).read_text())
  for row in manifest['files']:
   if row['relativePath'].startswith('public/assets/'):
    st,b=get(ip,'/'+row['relativePath'][7:]);need(st==200 and hashlib.sha256(b).hexdigest()==row['sha256'],'DELTA_ASSET_BODY_FAILED')
  write(OUT/'PRE_SWITCH_CHECKS_PASS.json',{'id':cid,'ip':ip,'routes':routes,'deltaAssets':7,'account':True,'readOnlyApi':True,'oldStillRunning':inspect(OLD)['State']['Running'],'customerAccepted':False})
  candidate=before.replace(needle,('reverse_proxy '+ip+':8080 {').encode(),1);state['candidateSHA256']=hashlib.sha256(candidate).hexdigest();state['edgeKnownHashes'].add(state['candidateSHA256']);adapt=json.loads(docker('exec','-i',EDGE,'caddy','adapt','--adapter','caddyfile','--config','/dev/stdin',input=candidate,timeout=15));need(adapt and b'auto_https off'in candidate and b'admin off'in candidate,'PRIVATE_ONLY_ADAPT_FAILED');write(OUT/'Caddyfile.after.exact',candidate)
  cas_edge({EDGE_SHA},candidate,state,'EDGE_FORWARD');restart_edge_ready(b'Forest City')
  for path in['/de/','/account']:need(edge_get(path)[0]==200,'EDGE_ROUTE_FAILED')
  oldmark=mark(inspect(OLD));docker('stop','--time','15',OLD,timeout=30);old=inspect(OLD);need(not old['State']['Running']and old['State']['Pid']==0,'OLD_STOP_UNCERTAIN_INSPECT');terminal(oldmark);receipt={'status':'ORG_PRIVATE_PREVIEW_REPLACED_ONLY','installerRevision':4,'oldRetainedId':OLD,'newId':cid,'newIP':ip,'edgeId':EDGE,'edgeInode':state['edgeInode'],'edgeBeforeSHA256':EDGE_SHA,'edgeAfterSHA256':state['candidateSHA256'],'buildId':BID,'publicDNSOrIngressChanged':False,'browserAcceptance':False,'realLoginAccepted':False,'caddyAdminRemainsOff':True};write(OUT/'REPLACED_ACTUAL.json',receipt);success=True;return receipt
 finally:
  if not success:
   signal.signal(signal.SIGTERM,signal.SIG_IGN);signal.signal(signal.SIGINT,signal.SIG_IGN);recover_failed_replace(state,before,cid)

def rollback():
 receipt=json.loads((OUT/'REPLACED_ACTUAL.json').read_text());need(not(OUT/'ROLLBACK_INTENT.json').exists(),'ROLLBACK_ALREADY_ATTEMPTED');old=inspect(OLD);custody(old);before=(OUT/'Caddyfile.before.exact').read_bytes();need(hashlib.sha256(before).hexdigest()==EDGE_SHA,'ROLLBACK_SNAPSHOT_CHANGED');write(OUT/'ROLLBACK_INTENT.json',{'automaticReplay':False,'installerRevision':4})
 signal.signal(signal.SIGTERM,signal.SIG_IGN);signal.signal(signal.SIGINT,signal.SIG_IGN)
 state={'edgeMutationAttempted':True,'edgeKnownHashes':{receipt['edgeAfterSHA256'],EDGE_SHA},'edgeInode':receipt['edgeInode'],'candidateSHA256':receipt['edgeAfterSHA256']};result=None
 try:
  result=recover_failed_replace(state,before,receipt['newId']);need(result['allCleanupStepsSucceeded'],'ROLLBACK_INCOMPLETE_INSPECT_RECEIPT');r={'status':'ORG_ORIGINAL_PRIVATE_PREVIEW_RESTORED','oldId':OLD,'newRetainedStoppedId':receipt['newId'],'edgeSHA256':EDGE_SHA,'caddyAdminRemainsOff':True};write(OUT/'ROLLED_BACK_ACTUAL.json',r);return r
 finally:best_receipt('EXPLICIT_ROLLBACK_FINAL_RESULT.json',{'status':'EXPLICIT_ROLLBACK_BOUNDED_RECOVERY_FINISHED','allIndependentStepsSucceeded':bool(result and result['allCleanupStepsSucceeded']),'recoveryResult':result,'automaticReplay':False})
if __name__=='__main__':
 signal.signal(signal.SIGTERM,lambda *a:(_ for _ in()).throw(KeyboardInterrupt()));signal.signal(signal.SIGINT,lambda *a:(_ for _ in()).throw(KeyboardInterrupt()));a=argparse.ArgumentParser();a.add_argument('--phase',required=True,choices=['materialize','replace-preview','rollback-preview']);a.add_argument('--release-transfer');n=a.parse_args()
 try:
  need(os.getuid()==0 and Path('/sys/devices/virtual/dmi/id/board_asset_tag').read_text().strip()=='i-0eb300e1b02414d8f','WRONG_HOST');r=materialize(n.release_transfer)if n.phase=='materialize'else replace()if n.phase=='replace-preview'else rollback();print(json.dumps(r))
 except BaseException as e:print(json.dumps({'status':'STOPPED_INSPECT_SAME_INTENT_NO_REPLAY','errorClass':type(e).__name__,'guard':str(e)if isinstance(e,RuntimeError)else None}));sys.exit(1)
