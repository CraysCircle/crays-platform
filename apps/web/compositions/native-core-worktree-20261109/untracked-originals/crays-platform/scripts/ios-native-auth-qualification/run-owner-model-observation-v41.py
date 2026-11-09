#!/usr/bin/env python3
"""Normal own admission; read-only actual existing Core/SDK owner session."""
import importlib.util,pathlib,os,json,sys,hashlib,subprocess,time
p=pathlib.Path(__file__).with_name('run-http-sql.py');spec=importlib.util.spec_from_file_location('admission',p);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
run=m.ROOT/'.qualification/native-owner-model-observation-v41-20261025';key='craysIosNativeOwnerModelObservation'
files=['scripts/native-server/owner-consumer.mjs','scripts/native-server/inspect-owner-session-model.mjs','scripts/native-server/run-owner-model-observation.mjs','scripts/native-server/source-loader.mjs','src/lib/native-personal-gateway-transport.ts','scripts/ios-native-auth-qualification/run-owner-model-observation-v41.py']
def pins():return {f:hashlib.sha256((m.ROOT/f).read_bytes()).hexdigest() for f in files}
def main():
 lease=None;out={'status':'PREPARING','sourceBefore':pins(),'requestedMethods':['chat.history'],'newModelCalls':0,'productionConfigurationChanged':False}
 try:
  with m.locks():
   x=json.loads(m.REGISTRY.read_text())
   if any(x.get(k) for k in ['heavy','heavyLease','heavyBuildLease','exclusiveHeavy']):print('BusyNoQueue',flush=True);return 75
   assert not run.exists();run.mkdir(mode=0o700)
   lease={'leaseId':'CRAYS-IOS-ACTUAL-OWNER-MODEL-READ-'+str(os.getpid()),'ownerThreadId':m.OWNER,'pid':os.getpid(),'startTicks':m.ticks(os.getpid()),'state':'active','issuedAt':m.now(),'CPUs':1,'memoryMiB':1024,'scope':'Read-only actual admitted existing owner chat.history; original Core identity/assignment/host checks; no model/provider request, claim, settings change or new SDK scope'}
   x['heavy']=[lease];x[key]=lease;m.write_registry(x)
  n=json.loads((m.ROOT/'scripts/ios-native-auth-qualification/runtime-node-sdk4.json').read_text());assert hashlib.sha256(pathlib.Path(n['path']).read_bytes()).hexdigest()==n['sha256']
  env={'PATH':'/usr/bin:/bin','LANG':'C.UTF-8','LC_ALL':'C.UTF-8','HOME':'/home/craysdev','CRAYS_NATIVE_OWNER_MODEL_OBSERVATION_RESULT':str(run/'OBSERVATION.json')}
  with(run/'actual-owner-observation.log').open('w')as f:r=subprocess.run([n['path'],'--max-old-space-size=512','scripts/native-server/run-owner-model-observation.mjs'],cwd=m.ROOT,env=env,stdout=f,stderr=subprocess.STDOUT,timeout=60)
  out['actualObservationExitCode']=r.returncode
  if r.returncode:raise RuntimeError('Actual owner metadata observation failed')
  result=json.loads((run/'OBSERVATION.json').read_text());assert result['exactExistingCoreAndSdkSessionMatched'] and result['newModelCalls']==0 and result['newOutboxClaims']==0
  out['status']='PASS_ACTUAL_OWNER_SESSION_METADATA_NOT_CAPABILITY_OR_MODEL_GRANT';return 0
 except BlockingIOError:
  if lease is None:print('BusyNoQueue coordination mutex',flush=True);return 75
  raise
 except BaseException as e:out['status']='FAIL';out['errorType']=type(e).__name__;raise
 finally:
  if lease:
   out['sourceAfter']=pins();out['sourceUnchanged']=out['sourceBefore']==out['sourceAfter'];m.atomic(run/'RUN.json',out)
   for retry in range(100):
    try:
     with m.locks():
      x=json.loads(m.REGISTRY.read_text());assert x.get('heavy')==[lease] and x.get(key)==lease
      x['heavy']=[];x[key]={**lease,'state':'terminal_returned','returnedAt':m.now()};m.write_registry(x)
     break
    except BlockingIOError:time.sleep(.1)
   else:raise RuntimeError('Own terminal lease return pending; no foreign lease changed')
   out['ownLeaseReturned']=True;m.atomic(run/'RUN.json',out);print(json.dumps({'status':out['status'],'ownLeaseReturned':True}),flush=True)
if __name__=='__main__':sys.exit(m.run_with_termination_cleanup(main))
