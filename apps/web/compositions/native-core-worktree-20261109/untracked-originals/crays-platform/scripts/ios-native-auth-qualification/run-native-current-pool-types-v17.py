#!/usr/bin/env python3
"""Finite current product source compile; original normal admission, no PG/old suite replay."""
import importlib.util,pathlib,os,json,sys,hashlib,subprocess
p=pathlib.Path(__file__).with_name('run-http-sql.py');spec=importlib.util.spec_from_file_location('original_admission',p);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
run=m.ROOT/'.qualification/native-current-pool-types-v17-20261025';key='craysIosNativeCurrentProductTypes'
files=['src/db/native-personal-runtime-pool.ts','src/db/native-personal-runtime-access.json','src/db/personal-messenger-adapter.ts','src/db/native-personal-runtime-repository.ts','src/db/personal-message-attachment-custody.ts','src/db/core-identity-runtime-pool.ts','src/lib/native-core-identity-lookup.ts','src/lib/native-personal-messenger.ts','src/lib/native-personal-baseline-materialization.ts','src/lib/personal-agent-baseline-host.ts','src/lib/personal-agent-baseline-deployment.ts','tsconfig.json','database/migrations/0218_native_customer_person_binding.sql','database/migrations/0218_native_customer_person_binding.down.sql','../infra/openclaw/runtime/personal-agent-materializer/code/authenticated-baseline-v3.mjs','../infra/openclaw/runtime/personal-agent-materializer/code/resolve-core-assignment-customer.mjs','../infra/openclaw/runtime/personal-agent-materializer/code/HOST_COMPOSITION_CUSTOMER_SOURCE_PINS.json','scripts/ios-native-auth-qualification/run-native-current-pool-types-v17.py']
def pin():return{f:hashlib.sha256((m.ROOT/f).read_bytes()).hexdigest() for f in files}
def main():
 lease=None;out={'status':'PREPARING','sourceBefore':pin(),'productiveChanges':False}
 try:
  with m.locks():
   x=json.loads(m.REGISTRY.read_text())
   if any(x.get(k) for k in ['heavy','heavyLease','heavyBuildLease','exclusiveHeavy']):print('BusyNoQueue',flush=True);return 75
   assert not run.exists();run.mkdir(mode=0o700)
   lease={'leaseId':'CRAYS-IOS-NATIVE-CURRENT-PRODUCT-TYPES-'+str(os.getpid()),'ownerThreadId':m.OWNER,'pid':os.getpid(),'startTicks':m.ticks(os.getpid()),'state':'active','issuedAt':m.now(),'CPUs':1,'memoryMiB':2048,'scope':'Current product source full strict compilation under original V1001536MiB heap and unchanged2GiB hard limit; no SQL/test/provider replay'}
   x['heavy']=[lease];x[key]=lease;m.write_registry(x)
  n=json.loads((m.ROOT/'scripts/ios-native-auth-qualification/runtime-node-sdk4.json').read_text());assert hashlib.sha256(pathlib.Path(n['path']).read_bytes()).hexdigest()==n['sha256']
  env={'PATH':'/usr/bin:/bin','LANG':'C.UTF-8'}
  for name,args,limit in [('full-current-server-types-original-1536',[n['path'],'--max-old-space-size=1536','node_modules/typescript/bin/tsc','--noEmit','--incremental','false','--pretty','false','--project','tsconfig.json'],90),('changed-native-pool-eslint',[n['path'],'--max-old-space-size=512','node_modules/eslint/bin/eslint.js','src/db/native-personal-runtime-pool.ts','src/db/personal-messenger-adapter.ts','src/db/native-personal-runtime-repository.ts','src/db/personal-message-attachment-custody.ts','src/lib/native-personal-baseline-materialization.ts'],20)]:
   with(run/(name+'.log')).open('w')as f:r=subprocess.run(args,cwd=m.ROOT,env=env,stdout=f,stderr=subprocess.STDOUT,timeout=limit)
   out.setdefault('commands',[]).append({'name':name,'exitCode':r.returncode});m.atomic(run/'RUN.json',out)
   if r.returncode:out['status']='FAIL_PRODUCT_SOURCE_CHECK';return 1
  out['status']='PASS_FULL_CURRENT_PRODUCT_TYPES_NOT_LIVE';return 0
 finally:
  if lease:
   out['sourceAfter']=pin();out['sourceUnchanged']=out['sourceAfter']==out['sourceBefore'];
   with m.locks():
    x=json.loads(m.REGISTRY.read_text());assert x.get('heavy')==[lease] and x.get(key)==lease
    x['heavy']=[];x[key]={**lease,'state':'terminal_returned','returnedAt':m.now()};m.write_registry(x)
   out['ownLeaseReturned']=True;m.atomic(run/'RUN.json',out);print(json.dumps(out),flush=True)
if __name__=='__main__':sys.exit(m.run_with_termination_cleanup(main))
