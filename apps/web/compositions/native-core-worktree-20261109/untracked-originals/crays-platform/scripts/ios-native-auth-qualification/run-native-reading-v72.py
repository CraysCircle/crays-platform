#!/usr/bin/env python3
import importlib.util,pathlib,os,json,sys,subprocess,time
p=pathlib.Path(__file__).with_name('run-http-sql.py');s=importlib.util.spec_from_file_location('admission',p);m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
native=pathlib.Path('/home/craysdev/codex-chat-projects/openclaw/apps/ios');run=m.ROOT/'.qualification/native-reading-v72-20261026';key='craysIosNativeReading'
def main():
 lease=None;out={'status':'PREPARING','actualIOS':False}
 try:
  with m.locks():
   x=json.loads(m.REGISTRY.read_text())
   if any(x.get(k)for k in ['heavy','heavyLease','heavyBuildLease','exclusiveHeavy']):print('BusyNoQueue',flush=True);return 75
   run.mkdir(mode=0o700)
   lease={'leaseId':'CRAYS-NATIVE-READING-'+str(os.getpid()),'ownerThreadId':m.OWNER,'pid':os.getpid(),'startTicks':m.ticks(os.getpid()),'state':'active','issuedAt':m.now(),'CPUs':1,'memoryMiB':2048,'scope':'Own account reading archive and actual driver position regression; no live service/schema/provider changes'}
   x['heavy']=[lease];x[key]=lease;m.write_registry(x)
  env={**os.environ,'CLANG_MODULE_CACHE_PATH':str(native/'.toolchains/module-cache'),'SWIFTPM_MODULECACHE_OVERRIDE':str(native/'.toolchains/module-cache')}
  args=[str(native/'.toolchains/swift-6.4.1/usr/bin/swift'),'test','--package-path','CraysCore','--scratch-path','CraysCore/.build','--cache-path','.toolchains/package-cache','--config-path','.toolchains/package-config','--security-path','.toolchains/package-security','--disable-dependency-cache','--jobs','1','--filter','NativeReadingArchiveTests|PublicMediaPlaybackSessionTests|PublicNostrBookmarkTests']
  with(run/'swift.log').open('w')as log:r=subprocess.run(args,cwd=native,env=env,stdout=log,stderr=subprocess.STDOUT,timeout=160)
  out.update(exitCode=r.returncode,status='PASS_FOCUSED_LINUX_CORE'if r.returncode==0 else'FAIL');return r.returncode
 finally:
  if lease:
   m.atomic(run/'RUN.json',out)
   with m.locks():
    x=json.loads(m.REGISTRY.read_text());assert x.get('heavy')==[lease];x['heavy']=[];x[key]={**lease,'state':'terminal_returned','returnedAt':m.now()};m.write_registry(x)
   print(json.dumps(out),flush=True)
if __name__=='__main__':sys.exit(m.run_with_termination_cleanup(main))
