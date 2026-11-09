"""One finite original SDK gateway, never the live owner service/profile."""
import pathlib, subprocess, os, sys, json, hashlib, datetime, importlib.util, signal, time, contextlib

ROOT = pathlib.Path('/srv/crays/worktrees/ios-core-native-01a14a1b/crays-platform')
now = lambda: datetime.datetime.now(datetime.timezone.utc).isoformat()
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
assert len(sys.argv) == 2 and sys.argv[1] in {'v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8', 'v9', 'v10', 'v11', 'v12', 'v13', 'v14', 'v15', 'v16', 'v17', 'v18', 'v19', 'v20', 'v21', 'v22'}
version = sys.argv[1]
if os.getuid()==0:
 assert version in {'v4','v5','v6','v7','v8','v9','v10','v11','v12','v13','v14','v15','v16','v17','v18','v19','v20','v21','v22'} and os.readlink('/proc/self/ns/net')!=os.environ['CRAYS_NATIVE_EXPECTED_HOST_NETNS']
 # Only an isolated namespace address; no host interface/route or file mutation.
 subprocess.run(['/usr/sbin/ip','address','add','192.0.2.20/32','dev','lo'],check=True,timeout=5)
 os.setgroups([]);os.setgid(1000);os.setuid(1000)
assert os.getuid()==1000 and os.getgid()==1000
assert os.getresuid()==(1000,1000,1000) and os.getresgid()==(1000,1000,1000)
assert int(next(line.split()[1] for line in pathlib.Path('/proc/self/status').read_text().splitlines() if line.startswith('CapEff:')),16)==0
# Only load mutable repository modules after irreversible credential drop.
spec = importlib.util.spec_from_file_location('original_locks', ROOT/'scripts/ios-native-auth-qualification/run-http-sql.py')
gate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gate)
run = ROOT/'.qualification'/('native-sdk4-real-gateway-'+version)
inputs = [
 'scripts/ios-native-auth-qualification/run-real-gateway.py',
 'scripts/ios-native-auth-qualification/real-gateway-probe.mjs',
 'scripts/ios-native-auth-qualification/controlled-core-identity-proxy.mjs',
 'scripts/ios-native-auth-qualification/controlled-local-model.mjs',
 'scripts/ios-native-auth-qualification/run-http-sql.py',
 'scripts/ios-native-auth-qualification/sdk-source-bindings.mjs',
 'scripts/ios-native-auth-qualification/sdk-source-bindings.json',
 'scripts/ios-native-auth-qualification/runtime-source-loader.mjs',
 'scripts/ios-native-auth-qualification/runtime-node-sdk4.json',
 'src/lib/native-personal-agent-route.ts', 'src/lib/native-personal-gateway-transport.ts',
 'src/lib/native-personal-sdk-dispatch.ts',
 'src/lib/native-personal-chuck-host.ts', 'src/db/native-personal-runtime-repository.ts',
 'scripts/ios-native-auth-qualification/transport-principal.test.mjs',
 'tsconfig.json',
]
pins = lambda: {p: sha(ROOT/p) for p in inputs}
def transient_startup_locks():
 # Retry only a transient metadata mutex, bounded to2s. A held heavy resource
 # still exits immediately below without reserving/queuing any resource.
 for attempt in range(21):
  stack=contextlib.ExitStack()
  try:
   stack.enter_context(gate.locks());return stack
  except BlockingIOError:
   stack.close()
   if attempt==20:raise
   time.sleep(.1)
lease = None
result = {'schema':'crays.native.actual-sdk4-gateway-controller.v1', 'startedAt':now(),
 'scope':'Original SDK4 server/client and ephemeral pairing/session, private network and synthetic state only; no model/owner/Core grant.',
 'inputPinsBefore':pins(), 'productionChanged':False,
 'effectiveUID':os.geteuid(),'effectiveGID':os.getegid(),'effectiveCapabilities':0}
try:
 with (transient_startup_locks() if version in {'v21','v22'} else gate.locks()):
  registry = json.loads(gate.REGISTRY.read_text())
  if any(registry.get(k) for k in ['heavy','heavyLease','heavyBuildLease','exclusiveHeavy']):
   print('WAIT_RESOURCE_OCCUPIED_NO_QUEUE'); sys.exit(75)
  assert not run.exists(), 'Never overwrite/restart an earlier run'
  run.mkdir(mode=0o700)
  private = run/'private'; private.mkdir(mode=0o700)
  for name in ['state','agent']: (private/name).mkdir(mode=0o700)
  lease = {'leaseId':'CRAYS-IOS-REAL-SDK4-GATEWAY-'+version+'-'+str(os.getpid()),
   'ownerThreadId':gate.OWNER,'pid':os.getpid(),'startTicks':gate.ticks(os.getpid()),'state':'active',
   'issuedAt':now(),'CPUs':1,'memoryMiB':2048,'scope':result['scope']}
  registry['heavy']=[lease]; registry['craysIosNativeRealGateway']=lease; gate.write_registry(registry)
  gate.atomic(run/'OWN_LEASE.json',lease)
 node=json.loads((ROOT/'scripts/ios-native-auth-qualification/runtime-node-sdk4.json').read_text())
 assert sha(pathlib.Path(node['path']))==node['sha256']
 hostnet=os.environ['CRAYS_NATIVE_EXPECTED_HOST_NETNS']
 ownnet=os.readlink('/proc/self/ns/net'); assert ownnet!=hostnet
 result['privateNetworkNamespace']=ownnet
 env={'PATH':'/usr/bin:/bin','LANG':'C.UTF-8','LC_ALL':'C.UTF-8',
  'CRAYS_NATIVE_EXPECTED_HOST_NETNS':hostnet,'CRAYS_NATIVE_GATEWAY_PROBE_ROOT':str(run),
  'OPENCLAW_STATE_DIR':str(private/'state'),'OPENCLAW_CONFIG_PATH':str(private/'config.json'),
  'OPENCLAW_AGENT_DIR':str(private/'agent')}
 if version in {'v4','v5','v6','v7','v8','v9','v10','v11','v12','v13','v14','v15','v16','v17','v18','v19','v20','v21','v22'}:env['CRAYS_NATIVE_GATEWAY_PROBE_VARIANT']='controlled-core-proxy'
 if version in {'v8','v9','v10','v11','v12','v13','v14'}:env['CRAYS_NATIVE_GATEWAY_NATIVE_TRANSPORT']='1'
 if version in {'v13','v14'}:env['CRAYS_NATIVE_GATEWAY_LOCAL_MODEL']='1'
 if version=='v14':env['CRAYS_NATIVE_GATEWAY_DISPATCH_RECONCILE']='1'
 if version in {'v15','v16','v17','v18','v19','v20','v21','v22'}:env['CRAYS_NATIVE_GATEWAY_AUTH_TRANSITION']='1'
 if version in {'v17','v18','v19','v20','v21','v22'}:env['CRAYS_NATIVE_GATEWAY_TRANSITION_HEALTH']='1'
 if version=='v19':env['CRAYS_NATIVE_GATEWAY_HEALTH_COMPLETED_LIFECYCLE']='1'
 if version in {'v16','v17','v18','v19','v20','v21','v22'}:
  for name in ['home','cache','tmp']:(private/name).mkdir(mode=0o700)
  env.update({'HOME':str(private/'home'),'XDG_CACHE_HOME':str(private/'cache'),'TMPDIR':str(private/'tmp')})
 if version in {'v8','v9','v10','v11','v12','v13','v14'}:
  for label,args,limit in [
   ('principal-unit-tests',[node['path'],'--conditions=react-server','--test','scripts/ios-native-auth-qualification/transport-principal.test.mjs'],30),
   ('changed-source-eslint',[node['path'],'node_modules/eslint/bin/eslint.js','src/lib/native-personal-gateway-transport.ts','src/lib/native-personal-sdk-dispatch.ts'],30),
   ('full-typescript',[node['path'],'--max-old-space-size=1536','node_modules/typescript/bin/tsc','--noEmit','--incremental','false','--pretty','false','--project','tsconfig.json'],90),
  ]:
   if version in {'v12','v13','v14'} and label=='full-typescript':
    result['fullTypescriptNotRepeated']='Actual v60 full TypeScript passed; current production TypeScript unchanged. This lane changes only qualification scripts and does not repeat compilation.'
    continue
   with (run/(label+'.log')).open('w') as checklog:
    check=subprocess.run(args,cwd=ROOT,env=env,stdout=checklog,stderr=subprocess.STDOUT,timeout=limit)
   result[label+'ExitCode']=check.returncode
   assert check.returncode==0,label+' failed; original server probe not started'
 with (run/'actual-gateway.log').open('w') as out:
  child=subprocess.Popen([node['path'],'--max-old-space-size=1024','--conditions=react-server',
   str(ROOT/'scripts/ios-native-auth-qualification/real-gateway-probe.mjs')],cwd=private,env=env,
   stdout=out,stderr=subprocess.STDOUT,start_new_session=True)
  try: result['probeExitCode']=child.wait(timeout=180)
  except subprocess.TimeoutExpired:
   result['probeTimeout']=True
   os.killpg(child.pid,signal.SIGTERM)
   try: child.wait(timeout=5)
   except subprocess.TimeoutExpired: os.killpg(child.pid,signal.SIGKILL);child.wait(timeout=5)
   result['probeExitCode']=child.returncode
 proof=json.loads((run/'PROBE.json').read_text()) if (run/'PROBE.json').exists() else None
 result['probeStatus']=proof.get('status') if proof else 'NO_TERMINAL_PROOF'
 result['status']='PASS_ORIGINAL_SDK_GATEWAY_NOT_OWNER_MODEL' if result['probeExitCode']==0 and proof and proof['status'] in {'PASS_ORIGINAL_GATEWAY_SESSION_TRANSPORT_NOT_OWNER_MODEL','PASS_ORIGINAL_CORE_PRINCIPAL_CANDIDATE_NOT_NATIVE_TRANSPORT','PASS_ORIGINAL_NATIVE_TRANSPORT_CONTROLLED_PRINCIPAL_NOT_OWNER'} else 'FAIL_ACTUAL_ORIGINAL_GATEWAY'
except BlockingIOError:
 print('WAIT_ORIGINAL_RESOURCE_LOCK_NO_QUEUE');sys.exit(75)
finally:
 if lease:
  # Confirm only this isolated service's children are gone before returning its
  # original resource slot. Never signal a PID from another task/unit.
  cg=pathlib.Path('/proc/self/cgroup').read_text().strip().split('0::',1)[1]
  assert '/crays-ios-core-real-gateway-' in cg
  procs=pathlib.Path('/sys/fs/cgroup'+cg+'/cgroup.procs')
  def remaining(): return [int(p) for p in procs.read_text().split() if int(p)!=os.getpid()]
  for _ in range(10):
   if not remaining(): break
   time.sleep(0.1)
  for pid in remaining():
   try: fd=os.pidfd_open(pid)
   except ProcessLookupError:continue
   try:
    try:
     assert pathlib.Path('/proc/'+str(pid)+'/cgroup').read_text().strip().endswith(cg)
     signal.pidfd_send_signal(fd,signal.SIGTERM)
    except (ProcessLookupError,FileNotFoundError):pass
   finally:os.close(fd)
  for _ in range(30):
   if not remaining():break
   time.sleep(0.1)
  result['ownChildrenTerminal']=not remaining()
  result['inputPinsAfter']=pins();result['inputsUnchanged']=result['inputPinsBefore']==result['inputPinsAfter']
  if not result['inputsUnchanged']:result['status']='FAIL_QUALIFICATION_INPUT_CHANGED'
  if result['ownChildrenTerminal']:
   for attempt in range(30):
    try:
     with gate.locks():
      registry=json.loads(gate.REGISTRY.read_text());assert registry.get('heavy')==[lease] and registry.get('craysIosNativeRealGateway')==lease
      registry['heavy']=[];registry['craysIosNativeRealGateway']={**lease,'state':'terminal_returned','returnedAt':now()};gate.write_registry(registry)
     result['onlyOwnLeaseReturned']=True;break
    except BlockingIOError:time.sleep(0.1)
   if not result.get('onlyOwnLeaseReturned'):result['status']='FAIL_CLEANUP_METADATA_LOCK_LEASE_RETAINED'
  else:result['status']='FAIL_OWN_CHILDREN_NOT_TERMINAL_LEASE_RETAINED'
  result['completedAt']=now();gate.atomic(run/'RUN.json',result)
  print(json.dumps({k:v for k,v in result.items() if k not in {'inputPinsBefore','inputPinsAfter'}}))
if result.get('status')!='PASS_ORIGINAL_SDK_GATEWAY_NOT_OWNER_MODEL':sys.exit(1)
