#!/usr/bin/env python3
"""Original shared Swift client -> real public Core HTTPS; own TLS restart persistence."""
import importlib.util,pathlib,os,json,sys,hashlib,subprocess,time,ssl,socket
p=pathlib.Path(__file__).with_name('run-http-sql.py');spec=importlib.util.spec_from_file_location('admission',p);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
run=m.ROOT/'.qualification/native-shared-https-v45-20261025';key='craysIosNativeSharedHttps';native=pathlib.Path('/home/craysdev/codex-chat-projects/openclaw/apps/ios');unit='crays-native-core-https.service'
files=[m.ROOT/'scripts/native-server/check-native-shared-https.swift',m.ROOT/'scripts/native-server/crays-native-core-https-ip.service',pathlib.Path(__file__),native/'Configuration/OwnerDevelopment.xcconfig']
files+=list((native/'CraysCore/Sources').rglob('*.swift'))
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def pins():return {str(p):sha(p)for p in files}
def cmd(args,timeout=15):return subprocess.run(args,text=True,capture_output=True,check=True,timeout=timeout).stdout
def show(name):return dict(l.split('=',1)for l in cmd(['/usr/bin/systemctl','show',name,'-p','ActiveState','-p','MainPID','-p','InvocationID']).splitlines())
def cert():
 with socket.create_connection(('87.106.245.200',443),timeout=5)as raw:
  with ssl.create_default_context().wrap_socket(raw,server_hostname='87.106.245.200')as s:
   assert ('IP Address','87.106.245.200')in s.getpeercert()['subjectAltName'];return hashlib.sha256(s.getpeercert(binary_form=True)).hexdigest()
def main():
 lease=None;out={'status':'PREPARING','sourceBefore':pins(),'modelCall':False,'schemaOrCredentialChanged':False};binary=run/'readback'
 try:
  with m.locks():
   x=json.loads(m.REGISTRY.read_text())
   if any(x.get(k)for k in ['heavy','heavyLease','heavyBuildLease','exclusiveHeavy']):print('BusyNoQueue',flush=True);return 75
   assert not run.exists();run.mkdir(mode=0o700)
   lease={'leaseId':'CRAYS-NATIVE-SHARED-HTTPS-'+str(os.getpid()),'ownerThreadId':m.OWNER,'pid':os.getpid(),'startTicks':m.ticks(os.getpid()),'state':'active','issuedAt':m.now(),'CPUs':1,'memoryMiB':1536,'scope':'Existing signed HTTPS edge50%CPU/512MiB plus finite shared-client compiler/readback50%CPU/1GiB; restart only own HTTPS edge, require same trusted certificate; actual shared Swift reader with existing expired token; no model/Core/owner restart'}
   x['heavy']=[lease];x[key]=lease;m.write_registry(x)
  others=['crays-native-core-http.service','crays-native-owner-consumer.service','crays-owner-tools-whatsapp-live.service'];out['othersBefore']={u:show(u)for u in others}
  assert pathlib.Path('/etc/systemd/system/'+unit).read_bytes()==(m.ROOT/'scripts/native-server/crays-native-core-https-ip.service').read_bytes()
  before=show(unit);assert before['ActiveState']=='active';original_cert=cert();out['edgeBefore']=before
  cmd(['/usr/bin/sudo','-n','/usr/bin/systemctl','restart',unit],30)
  after=show(unit);assert after['ActiveState']=='active'and after['InvocationID']!=before['InvocationID'];deadline=time.monotonic()+30
  while True:
   try:restored_cert=cert();break
   except (OSError,ssl.SSLError):
    if time.monotonic()>=deadline:raise
    time.sleep(1)
  assert restored_cert==original_cert;out.update(edgeAfter=after,sameTrustedLeafCertificateAfterRestart=True,certificateSHA256=original_cert)
  build=native/'CraysCore/.build/debug';modules=build/'Modules';objects=sorted((build/'CraysCore.build').glob('*.swift.o'));assert objects and (modules/'CraysCore.swiftmodule').exists()
  out['compiledModulePins']={str(p):sha(p)for p in [modules/'CraysCore.swiftmodule',*objects]}
  compiler=native/'.toolchains/swift-6.4.1/usr/bin/swiftc';out['compilerSHA256']=sha(compiler.resolve())
  env={'PATH':'/usr/bin:/bin','LANG':'C.UTF-8','LC_ALL':'C.UTF-8','CRAYS_NATIVE_SWIFT_HTTPS_RESULT':str(run/'RESULT.json'),'CLANG_MODULE_CACHE_PATH':str(native/'.toolchains/module-cache'),'SWIFTPM_MODULECACHE_OVERRIDE':str(native/'.toolchains/module-cache')}
  with(run/'compile.log').open('w')as log:r=subprocess.run([str(compiler),'-parse-as-library','-I',str(modules),str(m.ROOT/'scripts/native-server/check-native-shared-https.swift'),*[str(p)for p in objects],'-o',str(binary)],cwd=native,env=env,stdout=log,stderr=subprocess.STDOUT,timeout=60)
  out['compileExit']=r.returncode
  if r.returncode:raise RuntimeError('Shared native client probe compile failed')
  out['derivedProbeBinary']={'sha256':sha(binary),'bytes':binary.stat().st_size}
  with(run/'actual-readback.log').open('w')as log:r=subprocess.run([str(binary)],cwd=native,env=env,stdout=log,stderr=subprocess.STDOUT,timeout=30)
  out['actualReadbackExit']=r.returncode
  if r.returncode:raise RuntimeError('Actual shared native HTTPS readback failed')
  result=json.loads((run/'RESULT.json').read_text());assert result['signInRequiredReturned']and not result['actualCurrentOwnerLoginOrNativeReplyAccepted']
  out['othersAfter']={u:show(u)for u in others};assert out['othersBefore']==out['othersAfter']
  out['status']='PASS_ACTUAL_SHARED_SWIFT_HTTPS_DENIAL_AND_OWN_EDGE_RESTART_NOT_IOS_LOGIN';return 0
 except BlockingIOError:
  if lease is None:print('BusyNoQueue coordination mutex',flush=True);return 75
  raise
 except BaseException as e:out['status']='FAIL';out['errorType']=type(e).__name__;raise
 finally:
  if binary.exists():binary.unlink();out['derivedProbeBinaryRemovedNoDuplicateBuild']=True
  if lease:
   out['sourceAfter']=pins();out['sourceUnchanged']=out['sourceBefore']==out['sourceAfter'];m.atomic(run/'RUN.json',out)
   for retry in range(100):
    try:
     with m.locks():
      x=json.loads(m.REGISTRY.read_text());assert x.get('heavy')==[lease]and x.get(key)==lease
      x['heavy']=[];x[key]={**lease,'state':'terminal_returned','returnedAt':m.now()};m.write_registry(x)
     break
    except BlockingIOError:time.sleep(.1)
   else:raise RuntimeError('Own terminal lease return pending; no foreign lease changed')
   out['ownLeaseReturned']=True;m.atomic(run/'RUN.json',out);print(json.dumps({'status':out['status'],'ownLeaseReturned':True}),flush=True)
if __name__=='__main__':sys.exit(m.run_with_termination_cleanup(main))
