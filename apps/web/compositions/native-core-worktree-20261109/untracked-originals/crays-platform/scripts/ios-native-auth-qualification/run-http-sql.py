#!/usr/bin/env python3
"""One bounded own PostgreSQL/HTTP qualification. No production state or new packages."""
import contextlib, datetime, fcntl, hashlib, json, os, pathlib, shutil, signal, stat, subprocess, sys, tempfile, time
ROOT=pathlib.Path(__file__).resolve().parents[2]
PGROOT=pathlib.Path('/srv/crays/openclaw/oca063/native-core-postgresql/20261013-current/plain-index-successor/native-root')
PGBIN=PGROOT/'usr/lib/postgresql/16/bin'
CONTROL=pathlib.Path('/srv/crays/worktrees/club-manager-main-01a0d2f9/docs/main-control')
REGISTRY=CONTROL/'growth-foundations-20261004/LEASES.json'
LOCKS=[CONTROL/'.root-coordination.lock',pathlib.Path(str(REGISTRY)+'.lock'),REGISTRY.parent/'.root-coordination.lock',pathlib.Path(str(REGISTRY)+'.root-coordination.lock')]
OWNER='01a14a1b-49b3-7010-ae5f-129347c14e6f'
LEASE_KEY='craysIosNativeHttpSql'
now=lambda:datetime.datetime.now(datetime.timezone.utc).isoformat()
def atomic(path,value,mode=0o600):
 fd,name=tempfile.mkstemp(prefix='.ios-native-',dir=path.parent)
 try:
  os.fchmod(fd,mode)
  with os.fdopen(fd,'w') as stream:json.dump(value,stream,indent=2);stream.write('\n');stream.flush();os.fsync(stream.fileno())
  os.replace(name,path)
 finally:
  if os.path.exists(name):os.unlink(name)
@contextlib.contextmanager
def locks():
 with contextlib.ExitStack() as stack:
  for path in LOCKS:
   fd=os.open(path,os.O_RDONLY|os.O_NOFOLLOW);stream=stack.enter_context(os.fdopen(fd,'r'));info=os.fstat(fd)
   assert stat.S_ISREG(info.st_mode) and info.st_uid==os.getuid() and info.st_nlink==1
   fcntl.flock(fd,fcntl.LOCK_EX|fcntl.LOCK_NB)
  yield
def write_registry(value):
 info=REGISTRY.lstat();assert stat.S_ISREG(info.st_mode) and info.st_uid==os.getuid() and info.st_nlink==1
 atomic(REGISTRY,value,stat.S_IMODE(info.st_mode))
def ticks(pid):return pathlib.Path(f'/proc/{pid}/stat').read_text().rsplit(')',1)[1].split()[19]
def source_hashes():
 paths=list(PGROOT.rglob('*'));return {str(p.relative_to(PGROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in paths if p.is_file() and not p.is_symlink()}
def qualification_inputs():
 names=['scripts/ios-native-auth-qualification/managed-core-communication-constraints.json','scripts/ios-native-auth-qualification/auth.test.mjs','scripts/ios-native-auth-qualification/run-http-sql.py','scripts/ios-native-auth-qualification/http-sql.test.mjs','scripts/ios-native-auth-qualification/runtime-source-loader.mjs','scripts/ios-native-auth-qualification/original-gateway-peer.mjs','scripts/ios-native-auth-qualification/sdk-source-bindings.mjs','scripts/ios-native-auth-qualification/sdk-source-bindings.json','database/migrations/0210_native_personal_messenger.sql','database/migrations/0211_native_personal_runtime_attempts.sql','database/migrations/0211_native_personal_runtime_attempts.down.sql','database/migrations/0212_native_personal_identity_transaction_scope.sql','database/migrations/0212_native_personal_identity_transaction_scope.down.sql','database/migrations/0213_native_personal_verified_principal_scope.sql','database/migrations/0213_native_personal_verified_principal_scope.down.sql','src/db/personal-messenger-adapter.ts','database/migrations/0214_native_personal_agent_responses.sql','database/migrations/0214_native_personal_agent_responses.down.sql','src/graphql/native-personal-messenger-documents.ts','src/lib/native-personal-messenger.ts','src/graphql/schema.graphql','src/graphql/schema.ts','src/graphql/generated/resolvers-types.ts','src/graphql/generated/client/persisted-documents.json','src/db/native-personal-runtime-repository.ts','src/lib/native-personal-sdk-dispatch.ts','src/lib/native-personal-gateway-transport.ts','scripts/ios-native-auth-qualification/original-gateway-peer.mjs','src/lib/native-personal-chuck-host.ts','src/lib/native-personal-agent-route.ts','src/lib/native-personal-chuck-worker.ts','src/lib/native-personal-chuck-lifecycle.ts','scripts/ios-native-auth-qualification/chuck-worker.test.mjs','scripts/ios-native-auth-qualification/run-private-http-sql.py','scripts/ios-native-auth-qualification/original-sdk-server-fixture.mjs','scripts/ios-native-auth-qualification/controlled-local-model.mjs','scripts/ios-native-auth-qualification/controlled-core-identity-proxy.mjs','scripts/ios-native-auth-qualification/runtime-node-sdk4.json']
 names += ['scripts/ios-native-auth-qualification/original-core-rpc-fixture.mjs','scripts/ios-native-auth-qualification/original-core-rpc-fixture.sql','src/db/core-identity-runtime-pool.ts','src/db/core-identity-runtime-rpc.ts','src/lib/native-core-identity-lookup.ts','src/lib/native-auth/native-auth0-verifier.mjs','src/lib/native-auth/native-core-identity-boundary.mjs','src/lib/native-auth/native-personal-core-boundary.mjs']
 names += ['src/db/personal-agent-assignment.ts','database/migrations/0207_personal_agent_standard_assignment.sql','database/migrations/0208_personal_agent_baseline_deliveries.sql']
 for package in (ROOT.parent/'scripts').glob('personal-agent-standard-package-*'):
  names += [str(path.relative_to(ROOT.parent)).replace('scripts/','../scripts/',1) for path in package.rglob('*') if path.is_file() and path.suffix in {'.mjs','.json'}]
 names += ['src/app/api/native/personal-message-originals/route.ts', 'src/lib/native-auth/native-personal-originals-multipart.mjs', 'src/lib/native-auth/native-personal-originals-multipart.d.mts', 'scripts/ios-native-auth-qualification/native-originals-multipart.test.mjs', 'src/db/personal-message-attachment-custody.ts', 'src/db/personal-message-attachment-input.mjs', 'src/db/personal-message-attachment-input.d.mts', 'database/migrations/0215_personal_message_attachment_custody.sql', 'database/migrations/0215_personal_message_attachment_custody.down.sql', 'scripts/ios-native-auth-qualification/personal-attachment-input.test.mjs', 'scripts/ios-native-auth-qualification/atomic-personal-originals-input.test.mjs', 'scripts/ios-native-auth-qualification/personal-attachment-core-cases.mjs']
 names += ['src/app/api/native/personal-message-originals/read/route.ts','src/lib/native-auth/native-personal-original-read.mjs','src/lib/native-auth/native-personal-original-read.d.mts','scripts/ios-native-auth-qualification/native-original-read.test.mjs']
 names += ['database/migrations/0217_personal_message_original_display_name.sql','database/migrations/0217_personal_message_original_display_name.down.sql','scripts/ios-native-auth-qualification/personal-original-display-name.test.mjs']
 names += ['src/db/personal-feed-effects.ts','database/migrations/0216_personal_feed_effects.sql','database/migrations/0216_personal_feed_effects.down.sql','scripts/ios-native-auth-qualification/personal-feed-core-cases.mjs']
 return {name:hashlib.sha256((ROOT/name).read_bytes()).hexdigest() for name in names}
def main():
 assert os.getuid()==1000
 assert len(sys.argv)==2 and sys.argv[1] in {'v1','v2','v3','v4','v5','v6','v7','v8','v9','v10','v11','v12','v13','v14','v15','v16','v17','v18','v19','v20','v21','v22','v23','v24','v25','v26','v27','v28','v29','v30','v31','v32','v33','v34','v35','v36','v37','v38','v39','v40','v41','v42','v43','v44','v45','v46','v47','v48','v49','v50','v51','v52','v53','v54','v55','v56','v57','v58','v59','v60','v61','v62','v63','v64','v65','v66','v67','v68','v75','v76','v77','v78','v79','v80','v81','v82','v83','v84','v85','v86','v87','v88','v89','v90','v91','v92','v93','v94','v95','v96','v97','v98','v99','v100'},'Explicit unique run identifier required'
 node=json.loads((ROOT/('scripts/ios-native-auth-qualification/runtime-node-sdk4.json' if sys.argv[1] in {'v61','v62','v63','v64','v65','v66','v67','v68','v75','v76','v77','v78','v79','v80','v81','v82','v83','v84','v85','v86','v87','v88','v89','v90','v91','v92','v93','v94','v95','v96','v97','v98','v99','v100'} else 'scripts/ios-native-auth-qualification/runtime-node.json')).read_text());assert hashlib.sha256(pathlib.Path(node['path']).read_bytes()).hexdigest()==node['sha256']
 version=sys.argv[1];run=ROOT/'.qualification'/('native-http-sql-'+version);assert not run.exists(),'Never overwrite/restart a prior run'
 lease=None;admission_locked=False;socket_parent=None;started=False;start_attempted=False;terminal=True;outcome={'schema':'crays.ios.native-http-sql-run.v1','recordedAtUTC':now(),'status':'PREPARING','version':version,'productionChanged':False,'qualificationInputsBefore':qualification_inputs()}
 env=os.environ.copy();env['LD_LIBRARY_PATH']=str(PGROOT/'usr/lib/x86_64-linux-gnu');env['LANG']='C.UTF-8';env['LC_ALL']='C.UTF-8'
 pgpid=None;pgstart=None;data=run/'data'
 try:
  with locks():
   admission_locked=True
   registry=json.loads(REGISTRY.read_text())
   if any(registry.get(key) for key in ['heavy','heavyLease','heavyBuildLease','exclusiveHeavy']):print('WAIT_RESOURCE_OCCUPIED_NO_QUEUE');return 75
   available=int(next(line.split()[1] for line in pathlib.Path('/proc/meminfo').read_text().splitlines() if line.startswith('MemAvailable:')))*1024
   if available<4*1024**3:print('WAIT_RESOURCE_MEMORY_NO_QUEUE');return 75
   run.mkdir(parents=True,mode=0o700)
   candidate_lease={'leaseId':'CRAYS-IOS-NATIVE-HTTP-SQL-'+version+'-'+str(os.getpid()),'ownerThreadId':OWNER,'pid':os.getpid(),'startTicks':ticks(os.getpid()),'state':'active','issuedAt':now(),'CPUs':1,'memoryMiB':2048,'scope':'Own synthetic Core PostgreSQL, actual GraphQL HTTP and controlled loopback original SDK peer qualification only; no production, native-login or product admission'}
   registry['heavy']=[candidate_lease];registry[LEASE_KEY]=candidate_lease;write_registry(registry);lease=candidate_lease;atomic(run/'OWN_LEASE.json',lease)
  before=source_hashes();atomic(run/'PG_SOURCE_BEFORE.json',before)
  socket_parent=pathlib.Path(tempfile.mkdtemp(prefix='crays-ios-native-sql-'));os.chmod(socket_parent,0o700);socket=socket_parent/'socket';socket.mkdir(mode=0o700)
  def command(name,args,timeout=60,command_env=None):
   with (run/(name+'.log')).open('w') as output:
    result=subprocess.run(args,cwd=ROOT,env=command_env or env,stdout=output,stderr=subprocess.STDOUT,timeout=timeout)
   outcome.setdefault('commands',[]).append({'name':name,'exitCode':result.returncode});atomic(run/'RUN.json',outcome);return result.returncode
  assert command('initdb',[str(PGBIN/'initdb'),'-D',str(data),'-L',str(PGROOT/'usr/share/postgresql/16'),'--locale=C.UTF-8','--encoding=UTF8','--auth-local=trust','--auth-host=reject','--username=ios_native_fixture','--no-instructions'])==0
  start_attempted=True
  assert command('pg-start',[str(PGBIN/'pg_ctl'),'-D',str(data),'-l',str(run/'postgres.log'),'-o',"-h '' -k "+str(socket)+" -p 5432 -c shared_buffers=32MB -c max_connections=8 -c dynamic_shared_memory_type=mmap",'-w','start'])==0
  started=True;pgpid=int((data/'postmaster.pid').read_text().splitlines()[0]);pgstart=ticks(pgpid)
  assert command('createdb',[str(PGBIN/'createdb'),'-h',str(socket),'-p','5432','-U','ios_native_fixture','ios_native_qualification'])==0
  from urllib.parse import urlencode
  node_env=env.copy();
  if version in {'v54','v55','v56','v57','v58','v59','v60','v61','v62','v63','v64','v65','v66','v67','v68','v75','v76','v77','v78','v79','v80','v81','v82','v83','v84','v85','v86','v87','v88','v89','v90','v91','v92','v93','v94','v95','v96','v97','v98','v99','v100'}:
   forbidden=['OPENAI_API_KEY','ANTHROPIC_API_KEY','OPENCLAW_CONFIG_PATH','OPENCLAW_AGENT_DIR']
   assert not any(node_env.get(k) for k in forbidden),'Qualification rejects ambient provider/runtime authority'
   isolated_sdk_state=socket_parent/'sdk-state';isolated_sdk_state.mkdir(mode=0o700)
   node_env['OPENCLAW_STATE_DIR']=str(isolated_sdk_state)
   if version in {'v79','v80','v81','v82','v83','v84','v85','v86','v87','v88','v89','v90','v91','v92','v93','v94','v95','v96','v97','v98','v99','v100'}:
    for name in ['home','cache','tmp']:(socket_parent/name).mkdir(mode=0o700)
    node_env.update({'HOME':str(socket_parent/'home'),'XDG_CACHE_HOME':str(socket_parent/'cache'),'TMPDIR':str(socket_parent/'tmp')})
  node_env.update(CRAYS_NATIVE_SQL_FIXTURE_SOCKET=str(socket),CRAYS_NATIVE_HTTP_SOCKET=str(socket/'http.sock'),CRAYS_NATIVE_SQL_FIXTURE_RESULT=str(run/'HTTP_SQL_RESULT.json'),CRAYS_DATABASE_URL='postgresql://ios_native_fixture@localhost/ios_native_qualification?'+urlencode({'host':str(socket)}),CRAYS_DATABASE_SSL='disable',CRAYS_DATABASE_POOL_MAX='2')
  if version in {'v80','v81','v82','v83','v84','v85','v86','v87','v88','v89','v90','v91','v92','v93','v94','v95','v96','v97','v98','v99','v100'}:node_env['CRAYS_NATIVE_PERSONAL_ATTACHMENT_CUSTODY_QUALIFICATION']='true'
  if version in {'v61','v62','v63','v64','v65','v66','v67','v68','v75','v76','v77','v78','v79','v80','v81','v82','v83','v84','v85','v86','v87','v88','v89','v90','v91','v92','v93','v94','v95','v96','v97','v98','v99','v100'}:node_env['CRAYS_NATIVE_ADMISSION_PINS_PATH']=str(run/'ADMISSION_SOURCE_PINS.json')
  if version in {'v91','v92','v93','v94','v95','v96','v97','v98','v99','v100'}:node_env['CRAYS_NATIVE_PERSONAL_FEED_QUALIFICATION']='true'
  assert command('actual-native-admission-tests',[node['path'],'--max-old-space-size=384','--test','scripts/ios-native-auth-qualification/auth.test.mjs'],120,node_env)==0
  assert command('actual-native-eslint',[node['path'],'node_modules/eslint/bin/eslint.js','src/db/personal-feed-effects.ts','src/lib/identity.ts','src/lib/auth-session-mapping.ts','src/db/account-email-verification.ts','src/db/core-identity-repository.ts','src/lib/native-core-auth.ts','src/graphql/context.ts','src/graphql/schema.ts','src/graphql/native-identity-documents.ts','src/lib/native-personal-messenger.ts','src/db/personal-messenger-adapter.ts','src/db/personal-message-attachment-custody.ts','src/app/api/native/personal-message-originals/route.ts','src/app/api/native/personal-message-originals/read/route.ts','src/db/native-personal-runtime-repository.ts','src/lib/native-personal-sdk-dispatch.ts','src/lib/native-personal-gateway-transport.ts','src/lib/native-personal-chuck-host.ts','src/lib/native-personal-agent-route.ts','src/lib/native-personal-chuck-worker.ts','src/lib/native-personal-chuck-lifecycle.ts','src/graphql/native-personal-messenger-documents.ts'],90,node_env)==0
  feed_code=None
  if version in {'v93','v94','v95','v96','v97','v98','v99','v100'}:
   node_env['CRAYS_NATIVE_CONTROLLED_ORIGINAL_RPC_SQL']='true'
   node_env['CRAYS_NATIVE_REAL_GATEWAY_ROOT']=str(run/'sdk-fixture')
   feed_code=command('actual-http-sql-tests',[node['path'],'--max-old-space-size=1024','--conditions=react-server','--test','scripts/ios-native-auth-qualification/http-sql.test.mjs'],240,node_env)
   assert feed_code==0,'ACTUAL_FEED_CORE_QUALIFICATION_FAILED'
  # Record full-tree diagnostics; existing unrelated failures do not become a
  # native PASS. This is observation, not a full-build acceptance assertion.
  if version=='v86':
   prior=json.loads((ROOT/'.qualification/native-http-sql-v85/RUN.json').read_text());assert prior['fullTypescriptExitCode']==0 and prior['qualificationInputsUnchanged']
   current=qualification_inputs();assert all(current[k]==v for k,v in prior['qualificationInputsBefore'].items() if k.startswith('src/'))
   outcome['fullTypescriptNotRepeated']='Actual v85 full TypeScript passed; pinned product source unchanged. v86 separates foreign contact and binding-denial fixtures; no product change.'
  elif version in {'v83','v84'}:
   prior=json.loads((ROOT/'.qualification/native-http-sql-v82/RUN.json').read_text());assert prior['fullTypescriptExitCode']==0 and prior['qualificationInputsUnchanged']
   current=qualification_inputs();assert all(current[k]==v for k,v in prior['qualificationInputsBefore'].items() if k.startswith('src/'))
   outcome['fullTypescriptNotRepeated']='Actual v82 full TypeScript passed; exact product TypeScript inputs unchanged. v83 fixes fixture paths and copied fixture timestamps only.'
  elif version in {'v77','v78','v79'}:
   prior=json.loads((ROOT/'.qualification/native-http-sql-v76/RUN.json').read_text());assert prior['fullTypescriptExitCode']==0 and prior['qualificationInputsUnchanged']
   current=qualification_inputs();assert all(current[k]==v for k,v in prior['qualificationInputsBefore'].items() if k.startswith('src/'))
   outcome['fullTypescriptNotRepeated']='Actual v76 full TypeScript passed; all pinned product TypeScript inputs unchanged; this lane qualifies SQL/test changes and actual managed Core checks separately.'
  elif version=='v75':
   prior=json.loads((ROOT/'.qualification/native-core-release-candidate-v110/RUN.json').read_text());assert prior['status']=='PASS_FRESH_SOURCE_INSTALL_AND_FULL_BUILD_NOT_DEPLOYED'
   product={n:h for n,h in prior['overlaySourcePins'].items() if n.startswith('crays-platform/src/')}
   assert all(hashlib.sha256((ROOT.parent/n).read_bytes()).hexdigest()==h for n,h in product.items()),'PRODUCT_CHANGED_SINCE_FULL_V110_BUILD'
   outcome['fullTypescriptNotRepeated']='Exact product src hashes unchanged from fresh v110 full Next+TypeScript; current changes are qualification only.'
   outcome['unchangedProductSourcePinsFromV110']=product
  elif version in {'v66'}: outcome['fullTypescriptNotRepeated']='Actual v65 passed; production TypeScript unchanged, tests now cover concurrent first binds and revoked contact with real rate window.'
  elif version in {'v61','v62'}: outcome['fullTypescriptNotRepeated']='Actual v60 passed; production TypeScript unchanged, only qualification scripts changed.'
  elif version in {'v56','v57','v58','v59','v60','v63','v64','v65','v66','v67','v68','v75','v76','v77','v78','v79','v80','v81','v82','v83','v84','v85','v86','v87','v88','v89','v90','v91','v92','v93','v94','v95','v96','v97','v98','v99','v100'}: outcome['fullTypescriptExitCode']=command('full-typescript',[node['path'],'--max-old-space-size=1536','node_modules/typescript/bin/tsc','--noEmit','--incremental','false','--pretty','false','--project','tsconfig.json'],240,node_env)
  elif version in {'v7','v8','v9','v10','v11','v12','v13','v14','v15','v16','v17','v18','v19','v20','v21','v22','v23','v24','v25','v26','v27','v28','v29','v30','v31','v32','v33','v34','v35','v36','v37','v38','v39','v40','v41','v42','v43','v44','v45','v46','v47','v48','v49','v50','v51','v52','v53','v54'}: outcome['fullTypescriptNotRepeated']='Full TypeScript/build deliberately not repeated in this bounded HTTP/SQL qualification; separate full-source diagnostics retained'
  else: outcome['fullTypescriptExitCode']=command('full-typescript',[node['path'],'--max-old-space-size=1024','node_modules/typescript/bin/tsc','--noEmit','--incremental','false'],120,node_env)
  if version in {'v76','v80','v81','v82','v85','v87','v88','v89','v90','v91','v92','v93','v94','v95','v96','v97','v98','v99','v100'}:assert outcome.get('fullTypescriptExitCode')==0,'CURRENT_FULL_TYPESCRIPT_REQUIRED'
  if version=='v90':assert command('original-read-components',[node['path'],'--test','scripts/ios-native-auth-qualification/native-original-read.test.mjs'],90,node_env)==0
  if version in {'v60','v61','v62','v63','v64','v65','v66','v67','v68','v75','v76','v77','v78','v79','v80','v81','v82','v83','v84','v85','v86','v87','v88','v89','v90','v91','v92','v93','v94','v95','v96','v97','v98','v99','v100'}: assert command('worker-unit-tests',[node['path'],'--conditions=react-server','--test','scripts/ios-native-auth-qualification/chuck-worker.test.mjs'],30,node_env)==0
  if version in {'v75','v76','v77','v78','v79','v80','v81','v82','v83','v84','v85','v86','v87','v88','v89','v90','v91','v92','v93','v94','v95','v96','v97','v98','v99','v100'}:node_env['CRAYS_NATIVE_CONTROLLED_ORIGINAL_RPC_SQL']='true'
  if version in {'v61','v62','v67','v68','v75','v76','v77','v78','v79','v80','v81','v82','v83','v84','v85','v86','v87','v88','v89','v90','v91','v92','v93','v94','v95','v96','v97','v98','v99','v100'}:node_env['CRAYS_NATIVE_REAL_GATEWAY_ROOT']=str(run/'sdk-fixture')
  code=feed_code if feed_code is not None else command('actual-http-sql-tests',[node['path'],'--max-old-space-size='+('1024' if version in {'v61','v62','v67','v68','v75','v76','v77','v78','v79','v80','v81','v82','v83','v84','v85','v86','v87','v88','v89','v90','v91','v92','v93','v94','v95','v96','v97','v98','v99','v100'} else '512'),'--conditions=react-server','--test','scripts/ios-native-auth-qualification/http-sql.test.mjs'],240 if version in {'v68','v75','v76','v77','v78','v79','v80','v81','v82','v83','v84','v85','v86','v87','v88','v89','v90','v91','v92','v93','v94','v95','v96','v97','v98','v99','v100'} else 180,node_env)
  outcome['status']='PASS_BOUNDED_HTTP_SQL_NOT_PRODUCT' if code==0 else 'FAIL_ACTUAL_HTTP_SQL'
  outcome['actualTestExitCode']=code
  return 0 if code==0 else 1
 except BlockingIOError as error:
  if lease is None and not admission_locked:
   # Another coordinator may briefly hold an original mutex. No lease/run or
   # worker exists yet; report normal no-queue admission, not a SQL failure.
   print('WAIT_RESOURCE_COORDINATION_LOCK_NO_QUEUE');return 75
  outcome['status']='FAIL';outcome['errorType']=type(error).__name__
  raise
 except BaseException as error:
  outcome['status']='INTERRUPTED_SIGNAL' if isinstance(error,TerminationRequested) else 'FAIL';outcome['errorType']=type(error).__name__
  if isinstance(error,TerminationRequested):outcome['terminationSignal']=error.signum
  raise
 finally:
  if start_attempted:
   try:
    if not (data/'postmaster.pid').exists():
     status=subprocess.run([str(PGBIN/'pg_ctl'),'-D',str(data),'status'],env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL).returncode
     assert status==3;outcome['ownPostgresTerminal']=True
    else:
     if pgpid is None:pgpid=int((data/'postmaster.pid').read_text().splitlines()[0]);pgstart=ticks(pgpid)
     assert int((data/'postmaster.pid').read_text().splitlines()[0])==pgpid and ticks(pgpid)==pgstart
    if pgpid is not None:outcome['ownPostgresStopExit']=command('only-own-pg-stop',[str(PGBIN/'pg_ctl'),'-D',str(data),'-m','fast','-w','stop'])
    status=subprocess.run([str(PGBIN/'pg_ctl'),'-D',str(data),'status'],env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL).returncode
    outcome['ownPostgresTerminal']=status==3 and not (data/'postmaster.pid').exists();terminal=outcome['ownPostgresTerminal']
   except BaseException as error:terminal=False;outcome['stopErrorType']=type(error).__name__
  if lease:
   after=source_hashes();outcome['postgresNativeSourceUnchanged']=after==before if 'before' in locals() else False
   if terminal:
    with locks():
     registry=json.loads(REGISTRY.read_text());assert registry.get('heavy')==[lease] and registry.get(LEASE_KEY)==lease
     registry['heavy']=[];registry[LEASE_KEY]={**lease,'state':'terminal_returned','returnedAt':now()};write_registry(registry)
    outcome['onlyOwnLeaseReturned']=True
   else:outcome['leaseRetainedForUnprovenTerminal']=True
   outcome['qualificationInputsAfter']=qualification_inputs()
   outcome['qualificationInputsUnchanged']=outcome['qualificationInputsBefore']==outcome['qualificationInputsAfter']
   if not outcome['qualificationInputsUnchanged']:outcome['status']='FAIL_QUALIFICATION_INPUT_CHANGED'
   outcome['socketDirectory']=str(socket_parent) if socket_parent else None;atomic(run/'RUN.json',outcome)
   if not outcome['qualificationInputsUnchanged']:raise RuntimeError('Qualification inputs changed during actual run')
   print(json.dumps({'run':str(run),'status':outcome.get('status'),'ownPostgresTerminal':outcome.get('ownPostgresTerminal'),'onlyOwnLeaseReturned':outcome.get('onlyOwnLeaseReturned')}),flush=True)
  if socket_parent and terminal:
   # Private socket directory created by this invocation only; no source/data deletion.
   shutil.rmtree(socket_parent)
class TerminationRequested(BaseException):
 def __init__(self,signum):
  self.signum=signum
  super().__init__('Qualification terminated by signal '+str(signum))

def run_with_termination_cleanup(work=None):
 """SIGTERM unwinds the existing own-process/lease finally; no foreign cleanup.
 A repeated TERM during bounded cleanup must not interrupt that cleanup again.
 SIGKILL cannot be handled and still requires explicit terminal reconciliation.
 """
 previous=signal.getsignal(signal.SIGTERM)
 def terminate(signum,frame):
  signal.signal(signal.SIGTERM,signal.SIG_IGN)
  raise TerminationRequested(signum)
 signal.signal(signal.SIGTERM,terminate)
 try:
  return (work or main)()
 except TerminationRequested as error:
  return 128+error.signum
 finally:
  signal.signal(signal.SIGTERM,previous)

if __name__=='__main__':sys.exit(run_with_termination_cleanup())
