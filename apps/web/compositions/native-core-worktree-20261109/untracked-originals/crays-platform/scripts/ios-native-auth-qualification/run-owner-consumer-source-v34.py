#!/usr/bin/env python3
"""Finite current product source compile; original normal admission, no PG/old suite replay."""
import importlib.util,pathlib,os,json,sys,hashlib,subprocess
p=pathlib.Path(__file__).with_name('run-http-sql.py');spec=importlib.util.spec_from_file_location('original_admission',p);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
run=m.ROOT/'.qualification/native-owner-consumer-source-v34-20261025';key='craysIosOwnerConsumerSource'
files=['src/db/native-personal-service-admission.ts','src/db/account-email-verification.ts','src/lib/native-core-auth.ts','src/db/native-personal-runtime-pool.ts','src/lib/native-personal-sdk-dispatch.ts','src/lib/native-personal-gateway-transport.ts','src/lib/native-personal-chuck-host.ts','src/lib/native-personal-chuck-lifecycle.ts','scripts/native-server/owner-consumer.mjs','scripts/native-server/run-first-owner-dialog.mjs','scripts/native-server/source-loader.mjs','scripts/ios-native-auth-qualification/transport-principal.test.mjs','scripts/ios-native-auth-qualification/run-owner-consumer-source-v34.py']
def pin():return{f:hashlib.sha256((m.ROOT/f).read_bytes()).hexdigest() for f in files}
def main():
 lease=None;out={'status':'PREPARING','sourceBefore':pin(),'productiveChanges':False}
 try:
  with m.locks():
   x=json.loads(m.REGISTRY.read_text())
   if any(x.get(k) for k in ['heavy','heavyLease','heavyBuildLease','exclusiveHeavy']):print('BusyNoQueue',flush=True);return 75
   assert not run.exists();run.mkdir(mode=0o700)
   lease={'leaseId':'CRAYS-IOS-NATIVE-CURRENT-PRODUCT-TYPES-'+str(os.getpid()),'ownerThreadId':m.OWNER,'pid':os.getpid(),'startTicks':m.ticks(os.getpid()),'state':'active','issuedAt':m.now(),'CPUs':1,'memoryMiB':2048,'scope':'Unchanged product role verifier against actual original Neon metadata captured as exact restricted role; no network/DB/SDK/provider or synthetic principal replay'}
   x['heavy']=[lease];x[key]=lease;m.write_registry(x)
  n=json.loads((m.ROOT/'scripts/ios-native-auth-qualification/runtime-node-sdk4.json').read_text());assert hashlib.sha256(pathlib.Path(n['path']).read_bytes()).hexdigest()==n['sha256']
  env={'PATH':'/usr/bin:/bin','LANG':'C.UTF-8'}
  jobs=[('current-types',[n['path'],'--max-old-space-size=1536','node_modules/typescript/bin/tsc','--noEmit','--incremental','false'],90),('changed-native-host-lint',[n['path'],'node_modules/eslint/bin/eslint.js','src/db/native-personal-service-admission.ts','src/db/account-email-verification.ts','src/lib/native-core-auth.ts','src/lib/native-personal-sdk-dispatch.ts','src/lib/native-personal-gateway-transport.ts','src/lib/native-personal-chuck-host.ts','src/lib/native-personal-chuck-lifecycle.ts'],30),('scoped-user-and-machine-transport',[n['path'],'--max-old-space-size=256','--test','scripts/ios-native-auth-qualification/transport-principal.test.mjs'],15)]
  for name,args,limit in jobs:
   with(run/(name+'.log')).open('w')as f:r=subprocess.run(args,cwd=m.ROOT,env=env,stdout=f,stderr=subprocess.STDOUT,timeout=limit)
   out.setdefault('commands',[]).append({'name':name,'exitCode':r.returncode});m.atomic(run/'RUN.json',out)
   if r.returncode:out['status']='FAIL_CURRENT_OWNER_HOST_SOURCE';return 1
  out['status']='PASS_CURRENT_OWNER_HOST_TYPES_LINT_AND_16_TRANSPORT_CASES_NOT_NATIVE_DEVICE';return 0
 finally:
  if lease:
   out['sourceAfter']=pin();out['sourceUnchanged']=out['sourceAfter']==out['sourceBefore'];
   for retry in range(100):
    try:
     with m.locks():
      x=json.loads(m.REGISTRY.read_text());assert x.get('heavy')==[lease] and x.get(key)==lease
      x['heavy']=[];x[key]={**lease,'state':'terminal_returned','returnedAt':m.now()};m.write_registry(x)
     break
    except BlockingIOError:__import__('time').sleep(.1)
   else:raise RuntimeError('Own terminal return pending')
   out['ownLeaseReturned']=True;m.atomic(run/'RUN.json',out);print(json.dumps(out),flush=True)
if __name__=='__main__':sys.exit(m.run_with_termination_cleanup(main))
