#!/usr/bin/env python3
"""Own finite original-PG/source qualification; no production connections."""
import importlib.util,pathlib,os,json,sys,hashlib,subprocess,tempfile,shutil,time
p=pathlib.Path(__file__).with_name('run-http-sql.py');spec=importlib.util.spec_from_file_location('admission',p);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
run=m.ROOT/'.qualification/native-original-source-use-v35-20261025';key='craysIosNativeOriginalSourceUse'
files=['src/db/personal-message-attachment-custody.ts', 'src/db/personal-message-original-use-input.mjs', 'src/db/personal-message-original-use-input.d.mts', 'src/db/native-personal-runtime-access.json', 'src/db/native-personal-runtime-access-source-use-candidate.json', 'database/migrations/0223_personal_original_source_use.sql', 'scripts/ios-native-auth-qualification/source-use-fixture-loader.mjs', 'scripts/ios-native-auth-qualification/personal-original-source-use-check.mjs', 'scripts/ios-native-auth-qualification/run-original-source-use-v35.py']
def pin():return {f:hashlib.sha256((m.ROOT/f).read_bytes()).hexdigest() for f in files}
def main():
 lease=None;start=False;temp=None;terminal=True;out={'status':'PREPARING','sourceBefore':pin(),'productiveChanges':False}
 env={'PATH':'/usr/bin:/bin','LANG':'C.UTF-8','LC_ALL':'C.UTF-8','LD_LIBRARY_PATH':str(m.PGROOT/'usr/lib/x86_64-linux-gnu')}
 def command(name,args,limit=30):
  with(run/(name+'.log')).open('w')as f:r=subprocess.run(args,cwd=m.ROOT,env=env,stdout=f,stderr=subprocess.STDOUT,timeout=limit)
  out.setdefault('commands',[]).append({'name':name,'exitCode':r.returncode});m.atomic(run/'RUN.json',out)
  if r.returncode:raise RuntimeError(name+' failed')
 try:
  with m.locks():
   x=json.loads(m.REGISTRY.read_text())
   if any(x.get(k) for k in ['heavy','heavyLease','heavyBuildLease','exclusiveHeavy']):print('BusyNoQueue',flush=True);return 75
   assert not run.exists();run.mkdir(mode=0o700)
   lease={'leaseId':'CRAYS-IOS-CUSTOMER-PERSON-SOURCE-'+str(os.getpid()),'ownerThreadId':m.OWNER,'pid':os.getpid(),'startTicks':m.ticks(os.getpid()),'state':'active','issuedAt':m.now(),'CPUs':1,'memoryMiB':2048,'scope':'Typed original source-use command with actual own PostgreSQL/non-bypass RLS and explicit candidate ACL; synthetic principals, no model/SDK or hosted customer writes'}
   x['heavy']=[lease];x[key]=lease;m.write_registry(x)
  n=json.loads((m.ROOT/'scripts/ios-native-auth-qualification/runtime-node-sdk4.json').read_text());assert hashlib.sha256(pathlib.Path(n['path']).read_bytes()).hexdigest()==n['sha256']
  out['pgSourceBefore']=m.source_hashes()
  temp=pathlib.Path(tempfile.mkdtemp(prefix='crays-ios-native-sql-'));os.chmod(temp,0o700);socket=temp/'socket';socket.mkdir(mode=0o700);data=run/'data'
  command('initdb',[str(m.PGBIN/'initdb'),'-D',str(data),'-L',str(m.PGROOT/'usr/share/postgresql/16'),'--locale=C.UTF-8','--encoding=UTF8','--auth-local=trust','--auth-host=reject','--username=ios_native_fixture','--no-instructions'])
  start=True
  command('start',[str(m.PGBIN/'pg_ctl'),'-D',str(data),'-l',str(run/'postgres.log'),'-o',"-h '' -k "+str(socket)+" -p 5432 -c shared_buffers=32MB -c max_connections=12 -c dynamic_shared_memory_type=mmap",'-w','start'])
  out['ownPgPid']=int((data/'postmaster.pid').read_text().splitlines()[0]);out['ownPgStartTicks']=m.ticks(out['ownPgPid'])
  command('createdb',[str(m.PGBIN/'createdb'),'-h',str(socket),'-U','ios_native_fixture','ios_native_qualification'])
  env.update(CRAYS_NATIVE_SQL_FIXTURE_SOCKET=str(socket),CRAYS_NATIVE_CUSTOMER_RESULT=str(run/'SCOPED_RESULT.json'),CRAYS_NATIVE_CUSTOMER_FIXTURE='synthetic-source-composition-only',CRAYS_NATIVE_CONTROLLED_ORIGINAL_RPC_SQL='true',CRAYS_DATABASE_URL='postgresql://ios_native_fixture@localhost/ios_native_qualification?host='+str(socket),CRAYS_DATABASE_SSL='disable')
  command('actual-source-use-core',[n['path'],'--max-old-space-size=512','scripts/ios-native-auth-qualification/personal-original-source-use-check.mjs'])
  command('current-types',[n['path'],'--max-old-space-size=1536','node_modules/typescript/bin/tsc','--noEmit','--incremental','false'],90)
  command('changed-source-use-lint',[n['path'],'node_modules/eslint/bin/eslint.js','src/db/personal-message-attachment-custody.ts'],30)
  out['status']='PASS_SOURCE_USE_CORE_RLS_CANDIDATE_NOT_MODEL_OR_NATIVE';return 0
 except BlockingIOError:
  if lease is None:print('BusyNoQueue coordination mutex; no own lease or PG worker',flush=True);return 75
  raise
 except BaseException as e:
  out['status']='FAIL';out['errorType']=type(e).__name__;raise
 finally:
  if start:
   try:
    if 'ownPgPid' in out:assert m.ticks(out['ownPgPid'])==out['ownPgStartTicks']
    command('only-own-stop',[str(m.PGBIN/'pg_ctl'),'-D',str(run/'data'),'-m','fast','-w','stop'])
    terminal=not (run/'data/postmaster.pid').exists();out['ownPgTerminal']=terminal
   except BaseException as e:terminal=False;out['cleanupError']=type(e).__name__
  if lease:
   out['sourceAfter']=pin();out['sourceUnchanged']=out['sourceAfter']==out['sourceBefore'];out['pgSourceUnchanged']=m.source_hashes()==out.get('pgSourceBefore')
   if terminal:
    m.atomic(run/'RUN.json',out)
    for retry in range(100):
     try:
      with m.locks():
       x=json.loads(m.REGISTRY.read_text());assert x.get('heavy')==[lease] and x.get(key)==lease
       x['heavy']=[];x[key]={**lease,'state':'terminal_returned','returnedAt':m.now()};m.write_registry(x)
      break
     except BlockingIOError:time.sleep(.1)
    else:raise RuntimeError('Own terminal lease return remains pending; no foreign lease changed')
    out['ownLeaseReturned']=True
    if terminal and (run/'data').is_dir():shutil.rmtree(run/'data');out['disposableSyntheticPgRemovedNoExtraBackup']=True
   m.atomic(run/'RUN.json',out);print(json.dumps({'status':out['status'],'ownLeaseReturned':out.get('ownLeaseReturned'),'ownPgTerminal':out.get('ownPgTerminal')}),flush=True)
  if temp and terminal:shutil.rmtree(temp)
if __name__=='__main__':sys.exit(m.run_with_termination_cleanup(main))
