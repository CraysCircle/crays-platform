"""Root-only one-intent same-CID Club native origin configuration correction.
No recreate/build/network/edge/SQL operations. Private data never emitted.
"""
from pathlib import Path
import os,sys,json,hashlib,stat,signal,time,argparse,importlib.util,copy
P=Path(__file__).resolve().parent
OUT=Path('/srv/crays/acceptance/club-original-saas28-native-origin-config-20261109-01')
CID='a3241204260829ee45128bd4080e9febbc17452c060e53faf8fc5a9b482af06c'
PID=1674200
TICKS='30545453'
B=Path('/srv/crays/acceptance/club-original-saas28-bind-20261109-01/bootstrap.private.cjs')
ENV=Path('/srv/crays/private/club-public-rds-login-20261108-17/app-environment.private.json')
TEMPLATE=Path('/srv/crays/migration-work/20261108/websites/club-original-saas-build21-20261108-01/private-app-bootstrap.template.cjs')
TEMPLATE_SHA='14061ea234fa915e9b7f2628fb52380f47030a238c904d083f03a37f6f5ed7c9'
REQUIRED=Path('/srv/crays/releases/club-original-saas28-20261109-01/.next/required-server-files.json')
REQUIRED_SHA='9a5b015780ff3b5332835d0f8f44800953589f04b63624a6d683e7c1cb58f416'
FRAGMENT=P/'native-origin-config.append.cjs'
RECEIPT=Path('/srv/crays/acceptance/club-original-saas28-bind-20261109-01/RESULT_ACTUAL.json')
RECEIPT_SHA='a68544e808693bfcb344634ca69acb073f48f184cdf5e9fb7e0fa01f5cf92eff'
HELPER=Path('/srv/crays/incoming/org-private-correction-20261107-02-r04/install_org_private_candidate.py')
HELPER_SHA='157996e57ce3fd6ccfaf9d764f86a80edf9220d05f19987b5337bc61ce096aa0'
EDGE=Path('/srv/crays/runtime/private-edge-caddy-20261106-03/Caddyfile.private')
EDGE_SHA='f9f992e24a6973d1b64cb225390959cb4d89c8d5ccac98466fbf52752b36260c'
NETS={'crays-acceptance-public-static-20261105-01':'fd541962418c24223d4b467427ced8662ac254c4f55e8ad06bc6ea6c2b5beaca','crays-private-app-canonical-20261106-01':'f023edae110b963b4c6a24ae708256c02c6c962fb0302f5d23bd52b615244dea'}
SHARED=['0fa6bba9af8e7bb592e72b86afddf0d5702d892e72c5f62f6f415f735886872f','06a9a5a92df9bcd3fd3675a09172123333f68a1825df5c07a7ba5724a70eb071','435314e3c20f063e31197ec7319cb564a60048a0c0f38fc5d1aefcf0c397add0','826680e27113c9834990fa46ad54905ea2dbc758c12bf519f09731c4ea7ef815','20003ed249ddaf862469f7397c10aa21d8c24b134412da05f1d11e35ef2667d5']
M=None
def need(v,g):
 if not v:raise RuntimeError(g)
def sha(p):
 with Path(p).open('rb')as f:return hashlib.file_digest(f,'sha256').hexdigest()
def digest(v):return hashlib.sha256(json.dumps(v,sort_keys=True,separators=(',',':')).encode()).hexdigest()
def leaf(p,uid,gid,mode):
 s=p.lstat();need(stat.S_ISREG(s.st_mode)and s.st_uid==uid and s.st_gid==gid and stat.S_IMODE(s.st_mode)==mode and s.st_nlink==1,'EXACT_LEAF_CUSTODY_REQUIRED');return s
def custody(s):return(s.st_dev,s.st_ino,s.st_uid,s.st_gid,stat.S_IMODE(s.st_mode),s.st_nlink)
def readleaf(p,uid,gid,mode,limit):
 leaf(p,uid,gid,mode);fd=os.open(p,os.O_RDONLY|os.O_NOFOLLOW)
 try:
  s=os.fstat(fd);need(s.st_size<=limit,'BOUNDED_LEAF_REQUIRED');b=os.read(fd,limit+1);t=os.fstat(fd)
  need(custody(s)==custody(t)and(s.st_size,s.st_mtime_ns,s.st_ctime_ns)==(t.st_size,t.st_mtime_ns,t.st_ctime_ns)and len(b)==s.st_size,'LEAF_GENERATION_CHANGED');return b,s
 finally:os.close(fd)
def inspect():return M.inspect(CID)
def family():
 need(sha(EDGE)==EDGE_SHA,'CURRENT05_CADDY_BYTES_CHANGED')
 r={}
 for cid in SHARED:
  c=M.inspect(cid);need(c['Id']==cid and c['State']['Running'],'CURRENT_SHARED_FAMILY_REQUIRED')
  r[cid]={'physical':M.mark(c),'image':c['Image'],'config':digest(c['Config']),'host':digest(c['HostConfig']),'mounts':digest(c['Mounts']),'networks':c['NetworkSettings']['Networks']}
 return r
def endpoints():
 r={}
 for name,nid in NETS.items():
  n=json.loads(M.docker('network','inspect',nid,timeout=8))[0];need(n['Id']==nid and n['Name']==name,'EXACT_EXISTING_NETWORK_REQUIRED')
  r[nid]={k:v for k,v in n['Containers'].items()if k!=CID}
 return r
def routes(pid):
 lines=Path('/proc',str(pid),'net/route').read_text().splitlines()[1:];r=sorted(tuple(l.split()[i]for i in [0,1,2,3,6,7])for l in lines)
 need(any(x[1]=='00000000'and x[2]=='010018AC'for x in r),'EXISTING_QUALIFIED_RDS_DEFAULT_ROUTE_REQUIRED');return r
def invariant(c):
 return {'Id':c['Id'],'Name':c['Name'],'Image':c['Image'],'Config':c['Config'],'HostConfig':c['HostConfig'],'Mounts':c['Mounts'],'Networks':c['NetworkSettings']['Networks']}
def running():
 c=inspect();need(c['Id']==CID and c['State']['Running']and c['State']['Pid']>0 and not c['State']['OOMKilled'],'EXACT_RUNNING_CLUB_REQUIRED');return c
def terminal(mark=None):
 c=inspect()
 if c['State']['Running']:
  mark=mark or M.mark(c)
  try:M.docker('stop','--time','15',CID,timeout=30)
  finally:
   c=inspect()
   if c['State']['Running']:M.docker('kill',CID,timeout=15)
 c=inspect();need(not c['State']['Running']and c['State']['Pid']==0,'SAME_CLUB_NOT_TERMINAL')
 if mark:M.terminal(mark)
def fresh(review_path,fragment_sha):
 s=leaf(review_path,0,0,0o400);r=json.loads(review_path.read_text());now=time.time()
 need(0<=now-s.st_mtime<=120 and 0<=now-r['issuedEpoch']<=120,'FRESH_ROOT_SOURCE_FENCE_REQUIRED')
 need(r['sourceSHA256']==sha(__file__)and r['fragmentSHA256']==fragment_sha and r['currentId']==CID and r['pid']==PID and str(r['ticks'])==TICKS and r['sameCIDRestartAndSameInodeCASApproved']is True,'EXACT_ROOT_EXECUTION_REVIEW_REQUIRED')
def main():
 global M
 os.umask(0o077);need(os.getuid()==0 and Path('/sys/devices/virtual/dmi/id/board_asset_tag').read_text().strip()=='i-0eb300e1b02414d8f','EXACT_ROOT_AWS_HOST_REQUIRED')
 a=argparse.ArgumentParser();a.add_argument('--review',required=True);args=a.parse_args();review=Path(args.review)
 need(sha(HELPER)==HELPER_SHA,'QUALIFIED_PHYSICAL_HELPER_CHANGED');spec=importlib.util.spec_from_file_location('qualified_same_club_physical',HELPER);M=importlib.util.module_from_spec(spec);spec.loader.exec_module(M)
 fragment=FRAGMENT.read_bytes();fragment_sha=hashlib.sha256(fragment).hexdigest();fresh(review,fragment_sha)
 need(sha(RECEIPT)==RECEIPT_SHA and sha(TEMPLATE)==TEMPLATE_SHA and sha(REQUIRED)==REQUIRED_SHA,'EXACT_ORIGINAL_BIND_AND_SOURCE_PINS_REQUIRED')
 c=running();mark=M.mark(c);need(mark['pid']==PID and mark['ticks']==TICKS,'CURRENT_CLUB_GENERATION_CHANGED');before=invariant(c)
 need(c['Image']=='sha256:752ea8a2f758c34002a0461bd9f1cee4f9a3c36d48494586f60ffce1fc708e0e'and c['Config']['Entrypoint']==['/usr/local/bin/node','--require','/run/crays-club-public/bootstrap.cjs'],'EXACT_EXISTING_BOOTSTRAP_EXECUTION_REQUIRED')
 nets=c['NetworkSettings']['Networks'];need(set(nets)==set(NETS)and all(nets[n]['NetworkID']==nid for n,nid in NETS.items())and nets['crays-acceptance-public-static-20261105-01']['IPAddress']=='172.18.0.11'and nets['crays-private-app-canonical-20261106-01']['IPAddress']=='172.24.0.3'and nets['crays-private-app-canonical-20261106-01']['GwPriority']==1,'EXACT_SITE_AND_RDS_ENDPOINTS_REQUIRED')
 need([m for m in c['Mounts']if m['Destination']=='/run/crays-club-public/bootstrap.cjs']==[m for m in c['Mounts']if m['Destination']=='/run/crays-club-public/bootstrap.cjs'and m['Source']==str(B)and not m['RW']],'EXACT_READONLY_PRIVATE_BOOTSTRAP_BIND_REQUIRED')
 need(len([m for m in c['Mounts']if m['Destination']=='/run/crays-club-public/bootstrap.cjs'])==1,'ONE_PRIVATE_BOOTSTRAP_MOUNT_REQUIRED')
 env,envstat=readleaf(ENV,1000,1000,0o400,8192);e=json.loads(env);need(set(e)=={'CRAYS_CLUBS_PUBLIC_PRODUCTION_DATABASE_URL'}and isinstance(e['CRAYS_CLUBS_PUBLIC_PRODUCTION_DATABASE_URL'],str)and e['CRAYS_CLUBS_PUBLIC_PRODUCTION_DATABASE_URL'],'ONE_ORIGINAL_QUALIFIED_PRIVATE_PURPOSE_REQUIRED')
 template=TEMPLATE.read_bytes();need(template.count(b'__ROOT_PRIVATE_PROJECTION_SHA256__')==1,'ORIGINAL_PRIVATE_TEMPLATE_MARKER_REQUIRED');expected=template.replace(b'__ROOT_PRIVATE_PROJECTION_SHA256__',hashlib.sha256(env).hexdigest().encode())
 original,bs=readleaf(B,1000,1000,0o400,32768);need(original==expected,'EXACT_ORIGINAL_PRIVATE_BOOTSTRAP_REQUIRED')
 e=None;expected=None
 config=json.loads(REQUIRED.read_bytes())['config'];need(config['experimental']['trustHostHeader']is False,'EXACT_COMPILED_NATIVE_CONFIG_REQUIRED')
 shared=family();foreign=endpoints();before_routes=routes(PID);need(not os.path.lexists(OUT),'EXISTING_SAME_INTENT_NO_REPLAY')
 fresh(review,fragment_sha);OUT.mkdir(mode=0o700);M.write(OUT/'bootstrap.before.private.cjs',original)
 M.write(OUT/'PRESERVED_PREIMAGE.private.json',{'club':before,'shared':shared,'foreignEndpoints':foreign,'routes':before_routes,'bootstrapCustody':list(custody(bs))})
 M.write(OUT/'INTENT.json',{'id':CID,'oldPid':PID,'oldTicks':TICKS,'publicFragmentSHA256':fragment_sha,'compiledServerConfigSHA256':REQUIRED_SHA,'sameInodeCAS':True,'sameCIDRestart':True,'replayAllowed':False})
 signal.signal(signal.SIGTERM,lambda *a:(_ for _ in()).throw(KeyboardInterrupt()));signal.signal(signal.SIGINT,lambda *a:(_ for _ in()).throw(KeyboardInterrupt()))
 cas=False;start_attempted=False
 try:
  terminal(mark);need(family()==shared and endpoints()==foreign,'SHARED_FAMILY_OR_FOREIGN_ENDPOINTS_CHANGED_BEFORE_CAS')
  fd=os.open(B,os.O_RDWR|os.O_NOFOLLOW)
  try:
   s=os.fstat(fd);need(custody(s)==custody(bs)and s.st_size==len(original),'SAME_PRIVATE_BOOTSTRAP_INODE_REQUIRED');body=os.read(fd,32769);need(body==original,'PRIVATE_BOOTSTRAP_CAS_PREIMAGE_CHANGED')
   current_env,current_envstat=readleaf(ENV,1000,1000,0o400,8192);need(current_env==env and custody(current_envstat)==custody(envstat),'PRIVATE_PROJECTION_GENERATION_CHANGED');current_env=None
   replacement=original+fragment;os.lseek(fd,0,os.SEEK_SET);view=memoryview(replacement)
   while view:
    n=os.write(fd,view);need(n>0,'PRIVATE_BOOTSTRAP_WRITE_PROGRESS_REQUIRED');view=view[n:]
   os.ftruncate(fd,len(replacement));os.fsync(fd);s=os.fstat(fd);need(custody(s)==custody(bs),'PRIVATE_BOOTSTRAP_INODE_OR_CUSTODY_CHANGED')
   os.lseek(fd,0,os.SEEK_SET);need(os.read(fd,len(replacement)+1)==replacement,'PRIVATE_BOOTSTRAP_CAS_POSTIMAGE_CHANGED');cas=True
  finally:os.close(fd)
  M.write(OUT/'CAS_ACK.json',{'sameInode':True,'originalPrivateTemplatePreserved':True,'publicFragmentAppended':True,'privateValuesOrDigestsPrinted':False})
  need(invariant(inspect())==before and family()==shared and endpoints()==foreign,'PRESTART_PRESERVATION_REQUIRED')
  start_attempted=True;M.docker('start',CID,timeout=25);after=running();newmark=M.mark(after)
  need(invariant(after)==before and newmark['pid']!=PID and family()==shared and endpoints()==foreign and routes(newmark['pid'])==before_routes and sha(REQUIRED)==REQUIRED_SHA,'SAME_CID_CONFIG_MOUNTS_ROUTES_AND_SHARED_PRESERVATION_REQUIRED')
  r={'status':'SAME_CLUB_NATIVE_ORIGIN_CONFIG_BOUND_RUNNING_PENDING_ACCEPTANCE18','id':CID,'oldPid':PID,'oldTicks':TICKS,'process':newmark,'buildId':'aySu5l_FzwATUE3NCHrmf','compiledServerConfigSHA256':REQUIRED_SHA,'publicFragmentSHA256':fragment_sha,'privateEdgeSHA256':EDGE_SHA,'sameBootstrapInode':True,'sameCID':True,'allOriginalMountsConfigImageEndpointsPreserved':True,'sharedFamilyAndCaddyPreserved':True,'readinessAccepted':False,'customerAcceptance':False,'replayAllowed':False};M.write(OUT/'RESULT_ACTUAL.json',r);print(json.dumps(r))
 except BaseException as e:
  signal.signal(signal.SIGTERM,signal.SIG_IGN);signal.signal(signal.SIGINT,signal.SIG_IGN);stopped=False
  try:
   terminal();stopped=True
  finally:M.write(OUT/'CLOSED_FAILURE.json',{'status':'SAME_INTENT_STOPPED_EXPLICIT_INSPECTION_REQUIRED','errorClass':type(e).__name__,'guard':str(e)if isinstance(e,RuntimeError)else None,'sameId':CID,'casAcknowledged':cas,'startAttempted':start_attempted,'sameClubPhysicallyStopped':stopped,'protectedBeforeBytes':str(OUT/'bootstrap.before.private.cjs'),'automaticRollbackOrReplayAllowed':False})
  raise
if __name__=='__main__':
 try:main()
 except BaseException as e:print(json.dumps({'status':'STOPPED_INSPECT_SAME_INTENT','errorClass':type(e).__name__,'guard':str(e)if isinstance(e,RuntimeError)else None,'replayAllowed':False}));sys.exit(1)
