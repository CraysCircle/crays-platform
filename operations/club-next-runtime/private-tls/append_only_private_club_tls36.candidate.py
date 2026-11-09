"""Root Club-only private TLS append; reuse qualified exact-Caddy CAS/restart helpers."""
from pathlib import Path
import os,json,hashlib,time,sys,importlib.util,socket,ssl,signal
P=Path(__file__).resolve().parent
OUT=Path('/srv/crays/acceptance/club-private-tls36-20261109-01')
HELPER=Path('/srv/crays/incoming/org-private-correction-20261107-02-r04/install_org_private_candidate.py')
HELPER_SHA='157996e57ce3fd6ccfaf9d764f86a80edf9220d05f19987b5337bc61ce096aa0'
FRAGMENT=Path('/srv/crays/migration-work/20261108/root/club28-custom-listener-source01/CLUB_PRIVATE_TLS.append.caddyfile')
FRAGMENT_SHA='95995cdfeceff9f50b3acd321ab9211779df3621502ed811463dbcb331d9cc22'
BEFORE_SHA='f9f992e24a6973d1b64cb225390959cb4d89c8d5ccac98466fbf52752b36260c'
CA=Path('/srv/crays/migration-work/20261108/root/personal-anonymous-browser35-source07/private-edge-root.crt')
CA_SHA='3a25dd9df750d267599f165f391223018e068508c0c5b8b6968bc67079e68418'
SHARED=['0fa6bba9af8e7bb592e72b86afddf0d5702d892e72c5f62f6f415f735886872f','06a9a5a92df9bcd3fd3675a09172123333f68a1825df5c07a7ba5724a70eb071','435314e3c20f063e31197ec7319cb564a60048a0c0f38fc5d1aefcf0c397add0','826680e27113c9834990fa46ad54905ea2dbc758c12bf519f09731c4ea7ef815']
M=None
def need(v,g):
 if not v:raise RuntimeError(g)
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def fp(c):return {k:hashlib.sha256(json.dumps(c[k],sort_keys=True,separators=(',',':')).encode()).hexdigest()for k in ['Config','HostConfig','Mounts']}
def shared():
 result={}
 for cid in SHARED:
  c=M.inspect(cid);need(c['Id']==cid and c['State']['Running'],'CURRENT_SHARED_FAMILY_REQUIRED');result[cid]={'mark':M.mark(c),'image':c['Image'],'fingerprints':fp(c)}
 return result
def main():
 global M
 os.umask(0o077);need(os.getuid()==0 and len(sys.argv)==2,'ROOT_REVIEW_REQUIRED')
 need(Path('/sys/devices/virtual/dmi/id/board_asset_tag').read_text().strip()=='i-0eb300e1b02414d8f','EXACT_AWS_HOST_REQUIRED')
 rp=Path(sys.argv[1]);s=rp.lstat();need(s.st_uid==s.st_gid==0 and s.st_mode&511==256 and s.st_nlink==1 and not rp.is_symlink(),'ROOT_REVIEW_CUSTODY_REQUIRED')
 r=json.loads(rp.read_text());need(0<=time.time()-r['issuedEpoch']<=120 and r['sourceSHA256']==sha(__file__)and r['fragmentSHA256']==FRAGMENT_SHA and r['appendOnlyClubPrivateTLSApproved']is True,'FRESH_EXACT_ROOT_REVIEW_REQUIRED')
 need(sha(HELPER)==HELPER_SHA and sha(FRAGMENT)==FRAGMENT_SHA and sha(CA)==CA_SHA,'FROZEN_SOURCE_INPUTS_REQUIRED')
 spec=importlib.util.spec_from_file_location('qualified_caddy_exact_helpers',HELPER);M=importlib.util.module_from_spec(spec);spec.loader.exec_module(M);M.OUT=OUT
 edge=M.edge();mark=M.mark(edge);need(mark['pid']==1572197 and mark['ticks']=='29726305','EXACT_CURRENT_CADDY05_REQUIRED');beforefp=fp(edge)
 before=M.EDGEFILE.read_bytes();need(hashlib.sha256(before).hexdigest()==BEFORE_SHA and not os.path.lexists(OUT),'EXACT_PREIMAGE_NO_PRIOR_INTENT_REQUIRED')
 fragment=FRAGMENT.read_bytes();candidate=before+fragment;need(candidate.startswith(before)and len(candidate)==len(before)+len(fragment),'ONLY_EXACT_APPEND_ALLOWED')
 adapted=json.loads(M.docker('exec','-i',M.EDGE,'caddy','adapt','--adapter','caddyfile','--config','/dev/stdin',input=candidate,timeout=20));need(adapted and b'admin off'in candidate,'CURRENT_CADDY_ADAPT_REQUIRED')
 family=shared();OUT.mkdir(mode=0o700);M.write(OUT/'Caddyfile.before.exact',before);M.write(OUT/'Caddyfile.after.exact',candidate)
 M.write(OUT/'INTENT.json',{'containerId':M.EDGE,'beforeSHA256':BEFORE_SHA,'afterSHA256':hashlib.sha256(candidate).hexdigest(),'fragmentSHA256':FRAGMENT_SHA,'onlyClubTLSAppend':True,'publicDNSOrAWSIngressChanged':False,'automaticReplay':False})
 signal.signal(signal.SIGTERM,lambda *a:(_ for _ in()).throw(KeyboardInterrupt()));signal.signal(signal.SIGINT,lambda *a:(_ for _ in()).throw(KeyboardInterrupt()))
 state={'edgeMutationAttempted':False,'edgeKnownHashes':{BEFORE_SHA}}
 try:
  M.cas_edge({BEFORE_SHA},candidate,state,'CLUB_TLS36_APPEND')
  M.restart_edge_ready()
  after=M.edge();newmark=M.mark(after);need(newmark!=mark and fp(after)==beforefp and shared()==family and M.EDGEFILE.read_bytes()==candidate,'ONLY_SAME_CADDY_RESTART_ALLOWED')
  context=ssl.create_default_context(cafile=str(CA))
  with socket.socket(socket.AF_INET,socket.SOCK_STREAM)as raw:
   raw.settimeout(15);raw.connect(('172.26.0.1',443))
   with context.wrap_socket(raw,server_hostname='www.craysclub.com')as tls:
    cert=tls.getpeercert();need(tls.version()in ['TLSv1.2','TLSv1.3']and any(k=='DNS'and v=='www.craysclub.com'for k,v in cert.get('subjectAltName',[])),'ORIGINAL_CA_VERIFIED_CLUB_SNI_REQUIRED')
    protocol=tls.version()
  result={'status':'PRIVATE_CLUB_TLS36_APPEND_AND_VERIFIED_SNI_READY','containerId':M.EDGE,'process':newmark,'beforeSHA256':BEFORE_SHA,'afterSHA256':hashlib.sha256(candidate).hexdigest(),'deviceInode':state['edgeInode'],'onlyExactClubAppend':True,'existingSitesAndSharedFamilyPreserved':True,'existingInternalCAUsed':True,'verifiedSNI':'www.craysclub.com','TLSVersion':protocol,'publicDNSOrIngressChanged':False,'customerAcceptance':False,'automaticReplay':False}
  M.write(OUT/'RESULT_ACTUAL.json',result);print(json.dumps(result))
 except BaseException as e:
  M.write(OUT/'CLOSED_FAILURE.json',{'errorClass':type(e).__name__,'guard':str(e)if isinstance(e,RuntimeError)else None,'edgeMutationAttempted':state['edgeMutationAttempted'],'explicitSameIntentInspectionRequired':True,'automaticReplay':False})
  raise
if __name__=='__main__':
 try:main()
 except BaseException as e:print(json.dumps({'status':'CLUB_TLS36_STOP_INSPECT_SAME_INTENT','errorClass':type(e).__name__,'guard':str(e)if isinstance(e,RuntimeError)else None}));sys.exit(1)
