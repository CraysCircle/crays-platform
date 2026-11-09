#!/usr/bin/env python3
"""Finite current product source compile; original normal admission, no PG/old suite replay."""
import importlib.util,pathlib,os,json,sys,hashlib,subprocess
p=pathlib.Path(__file__).with_name('run-http-sql.py');spec=importlib.util.spec_from_file_location('original_admission',p);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
run=m.ROOT/'.qualification/native-product-types-v3-20261025';key='craysIosNativeProductTypes'
files=['src/db/core-identity-runtime-pool.ts','src/lib/native-core-identity-lookup.ts','tsconfig.json','scripts/ios-native-auth-qualification/native-identity-config-check.mjs']
def pin():return{f:hashlib.sha256((m.ROOT/f).read_bytes()).hexdigest() for f in files}
def main():
 lease=None;out={'status':'PREPARING','sourceBefore':pin(),'productiveChanges':False}
 try:
  with m.locks():
   x=json.loads(m.REGISTRY.read_text())
   if any(x.get(k) for k in ['heavy','heavyLease','heavyBuildLease','exclusiveHeavy']):print('BusyNoQueue',flush=True);return 75
   assert not run.exists();run.mkdir(mode=0o700)
   lease={'leaseId':'CRAYS-IOS-NATIVE-PRODUCT-TYPES-'+str(os.getpid()),'ownerThreadId':m.OWNER,'pid':os.getpid(),'startTicks':m.ticks(os.getpid()),'state':'active','issuedAt':m.now(),'CPUs':1,'memoryMiB':2048,'scope':'Actual product source compile and changed native identity config only; no unchanged SQL/test/provider run'}
   x['heavy']=[lease];x[key]=lease;m.write_registry(x)
  n=json.loads((m.ROOT/'scripts/ios-native-auth-qualification/runtime-node-sdk4.json').read_text());assert hashlib.sha256(pathlib.Path(n['path']).read_bytes()).hexdigest()==n['sha256']
  env={'PATH':'/usr/bin:/bin','LANG':'C.UTF-8'}
  for name,args,limit in [('native-identity-config',[n['path'],'--max-old-space-size=256','--conditions=react-server','scripts/ios-native-auth-qualification/native-identity-config-check.mjs'],15),('current-server-types',[n['path'],'--max-old-space-size=1024','node_modules/typescript/bin/tsc','--noEmit','--incremental','false'],90)]:
   with(run/(name+'.log')).open('w')as f:r=subprocess.run(args,cwd=m.ROOT,env=env,stdout=f,stderr=subprocess.STDOUT,timeout=limit)
   out.setdefault('commands',[]).append({'name':name,'exitCode':r.returncode});m.atomic(run/'RUN.json',out)
   if r.returncode:out['status']='FAIL_PRODUCT_SOURCE_CHECK';return 1
  out['status']='PASS_CURRENT_PRODUCT_TYPES_AND_CHANGED_IDENTITY_CONFIG_NOT_LIVE';return 0
 finally:
  if lease:
   out['sourceAfter']=pin();out['sourceUnchanged']=out['sourceAfter']==out['sourceBefore'];
   with m.locks():
    x=json.loads(m.REGISTRY.read_text());assert x.get('heavy')==[lease] and x.get(key)==lease
    x['heavy']=[];x[key]={**lease,'state':'terminal_returned','returnedAt':m.now()};m.write_registry(x)
   out['ownLeaseReturned']=True;m.atomic(run/'RUN.json',out);print(json.dumps(out),flush=True)
if __name__=='__main__':sys.exit(m.run_with_termination_cleanup(main))
