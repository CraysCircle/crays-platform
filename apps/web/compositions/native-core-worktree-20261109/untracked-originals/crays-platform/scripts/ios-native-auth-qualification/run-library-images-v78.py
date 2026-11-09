#!/usr/bin/env python3
"""Finite exact frozen Library browser reference, synthetic local state and loopback only."""
import importlib.util,pathlib,os,json,sys,hashlib,subprocess
p=pathlib.Path(__file__).with_name('run-http-sql.py');s=importlib.util.spec_from_file_location('admission',p);m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
stage='observation';assert len(sys.argv)==1
run=m.ROOT/('.qualification/native-library-images-v78-'+stage+'-20261026');key='craysIosNativeLibraryFrozenSource'
names=[]
external=pathlib.Path('/srv/crays/worktrees/ios-core-native-01a14a1b/.task-work/native-library-current-20261026/verify-reading-leaf-actual-width-simulator.py')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def pins():return {str(external):sha(external)}
def main():
 lease=None;out={'status':'PREPARING','stage':stage,'sourceBefore':pins(),'productionSchemaChanged':False}
 try:
  with m.locks():
   x=json.loads(m.REGISTRY.read_text())
   if any(x.get(k)for k in ['heavy','heavyLease','heavyBuildLease','exclusiveHeavy']):print('BusyNoQueue',flush=True);return 75
   run.mkdir(mode=0o700);lease={'leaseId':'CRAYS-NATIVE-LIBRARY-FROZEN-SOURCE-'+str(os.getpid()),'ownerThreadId':m.OWNER,'pid':os.getpid(),'startTicks':m.ticks(os.getpid()),'state':'active','issuedAt':m.now(),'CPUs':1,'memoryMiB':1024,'scope':'Exact frozen Library source capture at requested393x852 via original Playwright/headless browser; isolated synthetic local storage, loopback egress only; no canonical records or live credentials'};x['heavy']=[lease];x[key]=lease;m.write_registry(x)
  node=json.loads((m.ROOT/'scripts/ios-native-auth-qualification/runtime-node-sdk4.json').read_text());assert sha(pathlib.Path(node['path']))==node['sha256']
  env={'PATH':'/usr/bin:/bin','LANG':'C.UTF-8','LC_ALL':'C.UTF-8','GOMAXPROCS':'1'}
  def command(name,args):
   with(run/(name+'.log')).open('w')as log:r=subprocess.run(args,cwd=m.ROOT,env=env,stdout=log,stderr=subprocess.STDOUT,timeout=50)
   out.setdefault('commands',[]).append({'name':name,'exitCode':r.returncode})
   if r.returncode:raise RuntimeError(name+' failed')
  command('reading-simulator-images',['/usr/bin/python3',str(external),str(run/'reference')])
  out['status']='PASS_ACTUAL8_NATIVE_PNG_INTEGRITY_NOT_FULL_VIEW';return 0
 except BaseException as e:out['status']='FAIL';out['errorType']=type(e).__name__;raise
 finally:
  if lease:
   out['sourceAfter']=pins();out['sourceUnchanged']=out['sourceAfter']==out['sourceBefore'];m.atomic(run/'RUN.json',out)
   with m.locks():
    x=json.loads(m.REGISTRY.read_text());assert x.get('heavy')==[lease];x['heavy']=[];x[key]={**lease,'state':'terminal_returned','returnedAt':m.now()};m.write_registry(x)
   out['ownLeaseReturned']=True;m.atomic(run/'RUN.json',out);print(json.dumps({'status':out['status'],'ownLeaseReturned':True}),flush=True)
if __name__=='__main__':sys.exit(m.run_with_termination_cleanup(main))
