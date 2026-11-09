#!/usr/bin/env python3
"""Single changed native customer product path, existing normal own admission.
No whole old suite replay, no production/account/SDK/model calls or new packages.
"""
import importlib.util,pathlib,os,sys,json,hashlib,subprocess,tempfile,shutil
path=pathlib.Path(__file__).with_name('run-http-sql.py')
spec=importlib.util.spec_from_file_location('existing_core_admission',path);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
ROOT=m.ROOT
run=ROOT/'.qualification/native-customer-materializer-v8-20261025'
KEY='craysIosNativeCustomerMaterializer'
def pin():
 names=['src/db/personal-agent-assignment.ts','src/db/personal-messenger-adapter.ts','src/db/native-personal-runtime-repository.ts','database/migrations/0218_native_customer_person_binding.sql','database/migrations/0218_native_customer_person_binding.down.sql','scripts/ios-native-auth-qualification/focused-native-customer-fixture.mjs','scripts/ios-native-auth-qualification/customer-materializer-source-check.mjs','scripts/ios-native-auth-qualification/original-canonical-person-accounts-0350.fixture.sql','scripts/ios-native-auth-qualification/run-customer-materializer-v8.py','src/lib/personal-agent-baseline-host.ts','../infra/openclaw/runtime/personal-agent-materializer/code/resolve-core-assignment-customer.mjs','../infra/openclaw/runtime/personal-agent-materializer/code/server-general-materializer.customer.candidate.mjs','../infra/openclaw/runtime/personal-agent-materializer/code/HOST_COMPOSITION_CUSTOMER_SOURCE_PINS.json','../infra/openclaw/runtime/personal-agent-materializer/code/qualify-host-customer-composition.mjs','src/lib/personal-agent-baseline-deployment.ts','../infra/openclaw/runtime/personal-agent-materializer/code/authenticated-baseline-v3.mjs','../infra/openclaw/connections/personal-account/slack-installation-v1/core-person-v3.mjs','../infra/openclaw/connections/personal-account/slack-installation-v1/person-pg-context-v3.mjs']
 return {n:hashlib.sha256((ROOT/n).read_bytes()).hexdigest() for n in names}
def main():
 assert os.getuid()==1000 and not run.exists()
 lease=None;data=run/'data';sockparent=None;started=False;out={'status':'PREPARING','sourceBefore':pin(),'productionChanged':False}
 env={'PATH':'/usr/bin:/bin','LANG':'C.UTF-8','LC_ALL':'C.UTF-8','LD_LIBRARY_PATH':str(m.PGROOT/'usr/lib/x86_64-linux-gnu')}
 def command(label,args,seconds=45,vars=None):
  with (run/(label+'.log')).open('w') as f:r=subprocess.run(args,cwd=ROOT,env=vars or env,stdout=f,stderr=subprocess.STDOUT,timeout=seconds)
  out.setdefault('commands',[]).append({'name':label,'exitCode':r.returncode});m.atomic(run/'RUN.json',out)
  if r.returncode:raise RuntimeError(label+' failed: '+str(r.returncode))
 try:
  with m.locks():
   reg=json.loads(m.REGISTRY.read_text())
   if any(reg.get(k) for k in ['heavy','heavyLease','heavyBuildLease','exclusiveHeavy']):print('BusyNoQueue',flush=True);return 75
   if int(next(x.split()[1] for x in pathlib.Path('/proc/meminfo').read_text().splitlines() if x.startswith('MemAvailable:')))<4*1024*1024:print('MemoryNoQueue',flush=True);return 75
   run.mkdir(mode=0o700)
   lease={'leaseId':'CRAYS-IOS-NATIVE-CUSTOMER-BASELINE-'+str(os.getpid()),'ownerThreadId':m.OWNER,'pid':os.getpid(),'startTicks':m.ticks(os.getpid()),'state':'active','issuedAt':m.now(),'CPUs':1,'memoryMiB':2048,'scope':'Changed native Core0350/0218 customer binding, actual non-bypass SQL transaction path and current server typecheck only; no unchanged old suite/native/provider/live call'}
   reg['heavy']=[lease];reg[KEY]=lease;m.write_registry(reg);m.atomic(run/'OWN_LEASE.json',lease)
  node=json.loads((ROOT/'scripts/ios-native-auth-qualification/runtime-node-sdk4.json').read_text());assert hashlib.sha256(pathlib.Path(node['path']).read_bytes()).hexdigest()==node['sha256']
  sockparent=pathlib.Path(tempfile.mkdtemp(prefix='crays-ios-native-sql-'));os.chmod(sockparent,0o700);sock=sockparent/'socket';sock.mkdir(mode=0o700)
  command('initdb',[str(m.PGBIN/'initdb'),'-D',str(data),'-L',str(m.PGROOT/'usr/share/postgresql/16'),'--locale=C.UTF-8','--encoding=UTF8','--auth-local=trust','--auth-host=reject','--username=ios_native_fixture','--no-instructions'])
  command('pg-start',[str(m.PGBIN/'pg_ctl'),'-D',str(data),'-l',str(run/'postgres.log'),'-o',"-h '' -k "+str(sock)+" -p 5432 -c shared_buffers=32MB -c max_connections=8 -c dynamic_shared_memory_type=mmap",'-w','start']);started=True
  command('createdb',[str(m.PGBIN/'createdb'),'-h',str(sock),'-p','5432','-U','ios_native_fixture','ios_native_qualification'])
  from urllib.parse import urlencode
  node_env={**env,'CRAYS_DATABASE_URL':'postgresql://ios_native_fixture@localhost/ios_native_qualification?'+urlencode({'host':str(sock)}),'CRAYS_DATABASE_SSL':'disable','CRAYS_DATABASE_POOL_MAX':'2','CRAYS_NATIVE_SQL_FIXTURE_SOCKET':str(sock),'CRAYS_NATIVE_CUSTOMER_FIXTURE':'synthetic-source-composition-only','CRAYS_NATIVE_CONTROLLED_ORIGINAL_RPC_SQL':'true','CRAYS_NATIVE_CUSTOMER_RESULT':str(run/'PRODUCT_RESULT.json')}
  command('changed-customer-baseline-source',[node['path'],'--max-old-space-size=512','--conditions=react-server','scripts/ios-native-auth-qualification/customer-materializer-source-check.mjs'],60,node_env)
  out['status']='PASS_CHANGED_NATIVE_CUSTOMER_SOURCE_NOT_PRODUCTIVE_OWNER';return 0
 except BaseException as e:
  out['status']='FAIL_CHANGED_NATIVE_CUSTOMER_SOURCE';out['errorType']=type(e).__name__;raise
 finally:
  terminal=True
  if lease:
   if (data/'postmaster.pid').exists():
    try:command('own-pg-stop',[str(m.PGBIN/'pg_ctl'),'-D',str(data),'-m','fast','-w','stop'],20)
    except BaseException:terminal=False
   terminal=terminal and not (data/'postmaster.pid').exists();out['ownPostgresTerminal']=terminal
   out['sourceAfter']=pin();out['sourceUnchanged']=out['sourceBefore']==out['sourceAfter'];m.atomic(run/'RUN.json',out)
   if terminal:
    with m.locks():
     reg=json.loads(m.REGISTRY.read_text());assert reg.get('heavy')==[lease] and reg.get(KEY)==lease
     reg['heavy']=[];reg[KEY]={**lease,'state':'terminal_returned','returnedAt':m.now()};m.write_registry(reg)
    out['ownLeaseReturned']=True;m.atomic(run/'RUN.json',out)
   if terminal and sockparent:shutil.rmtree(sockparent)
   print(json.dumps({'status':out['status'],'run':str(run),'terminal':terminal,'ownLeaseReturned':out.get('ownLeaseReturned',False)}),flush=True)
if __name__=='__main__':sys.exit(m.run_with_termination_cleanup(main))
