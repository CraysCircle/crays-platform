"""Same-family Work-only RDS switch. No DB/role/password/source/edge mutations.

Common ingress is stopped before old Work; precommit restores original Work.
After durable release commit (or an uncertain commit write), legacy DB fallback
is forbidden. Member remains running and all existing networks remain attached.
"""
from pathlib import Path
import copy, fcntl, hashlib, http.client, importlib.util, json, os, re, signal, socket, stat, subprocess, time, urllib.parse

HERE = Path(__file__).resolve().parent
OUT = Path('/srv/crays/acceptance/work-only-rds-replacement-20261107-23')
PUBLIC = Path('/srv/crays/runtime/work-rds-runtime-bindings-20261107-22')
PRIVATE = Path('/srv/crays/runtime/work-rds-five-purpose-20261107-17')
RELEASE = Path('/srv/crays/releases/work-rds-20261107-21')
EDGE = Path('/srv/crays/runtime/private-edge-caddy-20261106-03/Caddyfile.private')
OWNER = '01a19c4c-4e60-7eb3-93ea-0a15a89cfae0'
IMAGE = 'sha256:752ea8a2f758c34002a0461bd9f1cee4f9a3c36d48494586f60ffce1fc708e0e'
BUILD_ID = 'rNUQWkZCrGVOyAZRBvnJw'
SAFE_RESULT = None

def need(v, code):
    if not v:
        raise RuntimeError(code)
def sha(raw):
    return hashlib.sha256(raw).hexdigest()
def canon(v):
    return sha(json.dumps(v, sort_keys=True, separators=(',', ':')).encode())
def file_sha(path):
    with path.open('rb') as f:
        return hashlib.file_digest(f, 'sha256').hexdigest()
class Unix(http.client.HTTPConnection):
    def connect(self):
        self.sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM); self.sock.settimeout(self.timeout); self.sock.connect('/var/run/docker.sock')
class DockerOperationError(RuntimeError):
    def __init__(self, method, path, status, raw):
        super().__init__('DOCKER_API_OPERATION_FAILED'); self.safe = {'method': method, 'operation': path.split('?')[0], 'httpStatus': status, 'bodySHA256': sha(raw)}
def api(method, path, body=None, statuses=(200, 201, 204)):
    c = Unix('localhost', timeout=15)
    try:
        c.request(method, path, None if body is None else json.dumps(body).encode(), {'Content-Type': 'application/json'})
        r = c.getresponse(); raw = r.read(8000000)
        if r.status not in statuses: raise DockerOperationError(method, path, r.status, raw)
        return json.loads(raw) if raw else None
    finally:
        c.close()
def inspect(cid):
    return api('GET', '/containers/' + cid + '/json')
def absent(name):
    value = api('GET', '/containers/' + name + '/json', statuses=(200, 404))
    return 'Id' not in value
def fingerprints(c):
    return {k: canon(c[k]) for k in ['Config', 'HostConfig', 'Mounts']}
def physical(c):
    pid = c['State']['Pid']; ticks = None; cg = None
    if pid:
        p = Path('/proc') / str(pid); ticks = (p / 'stat').read_text().rsplit(')', 1)[1].split()[19]
        text = (p / 'cgroup').read_text().strip().split(':', 2)[-1]
        need(c['Id'] in text and '..' not in text.split('/'), 'EXACT_CONTAINER_CGROUP_REQUIRED')
        cg = Path('/sys/fs/cgroup') / text.lstrip('/')
    return pid, ticks, cg
def terminal(cid, proof):
    c = inspect(cid); pid, ticks, cg = proof
    need(not c['State']['Running'] and c['State']['Pid'] == 0, 'OWN_CONTAINER_NOT_TERMINAL')
    if pid:
        p = Path('/proc') / str(pid) / 'stat'
        need(not p.exists() or p.read_text().rsplit(')', 1)[1].split()[19] != ticks, 'OWN_PID_STILL_ALIVE')
    if cg:
        p = cg / 'cgroup.procs'; need(not p.exists() or not p.read_text().strip(), 'OWN_CGROUP_STILL_ALIVE')
    return True
def halt(cid, proof):
    # CID was admitted before this call; GET failures cannot suppress stop/kill.
    try: api('POST', '/containers/' + cid + '/stop?t=5', statuses=(204, 304))
    except BaseException: pass
    try: return terminal(cid, proof)
    except BaseException: pass
    try: api('POST', '/containers/' + cid + '/kill', statuses=(204, 409))
    except BaseException: pass
    try: return terminal(cid, proof)
    except BaseException: return False
def write(path, raw, mode=0o600):
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, mode)
    with os.fdopen(fd, 'wb') as f:
        f.write(raw); f.flush(); os.fchmod(f.fileno(), mode); os.fsync(f.fileno())
def record(value):
    tmp = OUT / ('result-' + str(time.time_ns()) + '.next.private.json')
    write(tmp, (json.dumps(value, indent=2) + '\n').encode()); os.replace(tmp, OUT / 'RESULT_ACTUAL.json')
    fd = os.open(OUT, os.O_RDONLY | os.O_DIRECTORY)
    try: os.fsync(fd)
    finally: os.close(fd)
def protected_file(path, digest, uid, gid, mode, maximum=100000):
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW)
    try:
        before = os.fstat(fd)
        need(stat.S_ISREG(before.st_mode) and (before.st_uid, before.st_gid, stat.S_IMODE(before.st_mode), before.st_nlink) == (uid, gid, mode, 1) and before.st_size <= maximum, 'EXACT_EXISTING_PRIVATE_BINDING_CUSTODY_REQUIRED')
        h = hashlib.sha256(); size = 0
        while True:
            block = os.read(fd, 65536)
            if not block: break
            size += len(block); need(size <= maximum, 'PRIVATE_BINDING_SIZE_REQUIRED'); h.update(block)
        after = os.fstat(fd); current = path.lstat()
        need((before.st_dev, before.st_ino, before.st_size, before.st_mtime_ns, before.st_ctime_ns) == (after.st_dev, after.st_ino, after.st_size, after.st_mtime_ns, after.st_ctime_ns) and (current.st_dev, current.st_ino) == (before.st_dev, before.st_ino) and size == before.st_size and h.hexdigest() == digest, 'EXACT_EXISTING_PRIVATE_BINDING_HASH_REQUIRED')
    finally: os.close(fd)
def docker(*args, timeout=20):
    return subprocess.run(['/usr/bin/docker', *args], capture_output=True, text=True, timeout=timeout, env={'PATH': '/usr/bin:/bin'})
def tcp_ready(cid, port, seconds=90):
    deadline = time.monotonic() + seconds
    code = "const s=require('net').connect(" + str(port) + ",'127.0.0.1',()=>s.end());s.on('error',()=>process.exitCode=1);s.setTimeout(2000,()=>{s.destroy();process.exitCode=1})"
    while True:
        c = inspect(cid); need(c['State']['Running'], 'EXPECTED_RUNTIME_EXITED_BEFORE_READY')
        q = docker('exec', cid, 'node', '-e', code, timeout=4)
        if q.returncode == 0: return True
        need(time.monotonic() < deadline, 'RUNTIME_TCP_START_DEADLINE'); time.sleep(.5)
def common_ready(cid):
    tcp_ready(cid, 8990, 60)
    q = docker('exec', cid, 'node', '-e', "require('http').get({host:'127.0.0.1',port:8990,path:'/',headers:{host:'member.crays.world'},timeout:5000},r=>{r.resume();r.on('end',()=>console.log(r.statusCode))}).on('error',()=>process.exitCode=1)", timeout=8)
    need(q.returncode == 0 and q.stdout.strip() == '200', 'COMMON_ANONYMOUS_ROOT_REQUIRED')
    return True

def main():
    global SAFE_RESULT
    os.umask(0o077)
    need(os.getuid() == 0 and Path('/sys/devices/virtual/dmi/id/board_asset_tag').read_text().strip() == 'i-0eb300e1b02414d8f', 'EXACT_EXISTING_ROOT_HOST_REQUIRED')
    admission = json.loads((HERE / 'admission.json').read_text()); need(admission['executionApproved'] is True, 'INDEPENDENT_EXECUTION_REVIEW_REQUIRED')
    for name, digest in admission['inputSHA256'].items():
        need(sha((HERE / name).read_bytes()) == digest, 'EXACT_REVIEWED_INPUT_REQUIRED')
    q = json.loads((HERE / 'custody-actual.json').read_text()); need(canon(q) == admission['custodyCanonicalSHA256'], 'EXACT_CURRENT_FAMILY_RECEIPT_REQUIRED')
    p = json.loads((HERE / 'native21-actual.json').read_text())
    need(canon(p) == admission['native21CanonicalSHA256'] and p['status'] == 'WORK21_ORIGINAL_STARTER_NATIVE_STATIC_ORIGIN_ANONYMOUS_PASS' and p['ownContainerPhysicallyRemoved'] and p['cleanupErrors'] == [] and all(x['pass'] for x in p['nativeResult']['checks']), 'ACTUAL21_NATIVE_STARTER_PASS_REQUIRED')
    live21 = json.loads(Path('/srv/crays/acceptance/work-rds-original-starter-native-20261107-21/NATIVE_PROBE_ACTUAL.json').read_text()); need(canon(live21) == canon(p), 'NATIVE21_RECEIPT_CHANGED')
    g = json.loads((HERE / 'guards19-actual.json').read_text())
    need(canon(g) == admission['guards19CanonicalSHA256'] and g['allFivePassed'] and g['temporaryProbeAndCredentialJobPhysicallyRemoved'], 'ACTUAL19_FIVE_GUARDS_REUSED_REQUIRED')
    binding = g['installedPrivateBinding']
    protected_file(PRIVATE / 'environment.private.json', binding['environmentSHA256'], 1000, 32022, 0o400)
    protected_file(PRIVATE / 'finance-context-uri.private', binding['financeFileSHA256'], 0, 32022, 0o440)
    protected_file(PRIVATE / 'database-bindings/work-db-targets.json', binding['manifestSHA256'], 0, 32022, 0o444)
    for purpose in ['coreIdentity', 'clubProperty', 'originalMember', 'scheduling', 'financeContext']:
        protected_file(PRIVATE / 'database-bindings' / (purpose + '-ca.pem'), binding['caSHA256'], 0, 32022, 0o444)
    need(file_sha(RELEASE / 'RELEASE_MANIFEST.json') == 'c946d5f0adc4c0aaf0b527ccc01c16e205d820355c2d2dff653f3a3d085ac584', 'EXACT21_RELEASE_MANIFEST_REQUIRED')
    old = {key: inspect(row['id']) for key, row in q['family'].items()}
    ids = {key: c['Id'] for key, c in old.items()}
    for key, c in old.items():
        row = q['family'][key]
        need(c['State']['Running'] and fingerprints(c) == row['fingerprints'] and c['State']['Pid'] == row['pid'] and physical(c)[1] == row['ticks'], 'CURRENT_FAMILY_PREIMAGE_CHANGED')
    edgefd = os.open(EDGE, os.O_RDONLY | os.O_NOFOLLOW); fcntl.flock(edgefd, fcntl.LOCK_SH | fcntl.LOCK_NB)
    edge_initial = os.fstat(edgefd)
    def edge_guard():
        current = EDGE.lstat(); observed = os.fstat(edgefd); os.lseek(edgefd, 0, 0); raw = os.read(edgefd, 1000000)
        need((current.st_dev, current.st_ino) == (observed.st_dev, observed.st_ino) == (edge_initial.st_dev, edge_initial.st_ino) and sha(raw) == q['currentEdgeSHA256'], 'CURRENT_EDGE_PREIMAGE_CHANGED')
        blocks = []; depth = 0; active = []
        for line in raw.decode().splitlines():
            if depth == 0: active = []
            active.append(line); depth += line.count('{') - line.count('}')
            need(depth >= 0, 'EXACT_EDGE_ROUTE_PARSE_REQUIRED')
            if depth == 0 and active and active[0].startswith('http://'): blocks.append('\n'.join(active) + '\n')
        member = [b for b in blocks if 'member.crays.world:18080' in b.splitlines()[0]]
        need(depth == 0 and len(member) == 1 and sha(member[0].encode()) == '7922e46aaa888d4dbf303677140e4fb213c3404ed5422ff72462e00431c6c815', 'QUALIFIED_MEMBER_INGRESS_BLOCK_REQUIRED')
        need(re.findall(r'(?m)^\s*reverse_proxy\s+([^\s{]+)', member[0]) == ['172.24.0.2:8990'] and all(str(port) not in raw.decode() for port in [8991, 8993, 19109]) and not any(re.search(r'172\.24\.0\.2:\d+', b) for b in blocks if b != member[0]), 'COMMON_MUST_BE_SOLE_PRIVATE_FAMILY_INGRESS')
    edge_guard()
    need(old['common']['HostConfig']['NetworkMode'] == old['work']['HostConfig']['NetworkMode'] == 'container:' + ids['member'], 'SAME_MEMBER_NAMESPACE_REQUIRED')
    need(not OUT.exists() and not PUBLIC.exists(), 'OWN_PRIOR_REPLACEMENT_INTENT_NO_REPLAY')
    spec = importlib.util.spec_from_file_location('work_projection', HERE / 'project_work_only_payload.py'); projection = importlib.util.module_from_spec(spec); spec.loader.exec_module(projection)
    payload = projection.project(old['work'])
    name = old['work']['Name'].lstrip('/'); archived = name + '-before-rds-20261107-23'; failed = name + '-failed-rds-20261107-23'
    need(absent(archived) and absent(failed), 'OWN_ARCHIVE_AND_FAILURE_NAMES_MUST_BE_ABSENT')
    OUT.mkdir(mode=0o700)
    result = {'status': 'WORK23_ADMITTED', 'phase': 'PREPARE_PUBLIC_CLOSURE', 'releaseCommitted': False, 'commitWriteAttempted': False, 'oldDatabaseAutomaticRollbackAllowed': True, 'ingressBlocked': False, 'databaseRoleOrPasswordWrites': False, 'edgeWritten': False, 'allFiveCheckoutGuardsReusedFrom19': True, 'fullCustomerAcceptance': False}; SAFE_RESULT = result
    record(result)
    new_id = None; new_admitted = False; create_attempted = False; new_proof = (0, None, None); common_stopped = False; old_stopped = False; commit_attempted = False; errors = []
    original_proofs = {key: physical(c) for key, c in old.items()}
    def anchor_guard():
        c = inspect(ids['member']); need(c['State']['Running'] and c['State']['Pid'] == old['member']['State']['Pid'] and fingerprints(c) == q['family']['member']['fingerprints'], 'PROTECTED_MEMBER_CHANGED')
        networks = {k: {'id': v['NetworkID'], 'ip': v['IPAddress']} for k, v in c['NetworkSettings']['Networks'].items()}
        need(networks == q['networkIdsAndAddresses'], 'PROTECTED_NETWORK_OR_EDGE_CHANGED'); edge_guard()
    def owned(cid):
        c = inspect(cid)
        need(c['Image'] == IMAGE and c['Name'].lstrip('/') in [name, failed] and c['Config']['Labels'].get('crays.owner.thread') == OWNER and c['Config']['Labels'].get('crays.work.transition') == 'work-rds-20261107-23' and c['HostConfig']['NetworkMode'] == 'container:' + ids['member'] and not c['HostConfig'].get('PortBindings'), 'EXACT_NEW_WORK_CUSTODY_REQUIRED')
        return c
    def rename(cid, destination, allowed):
        c = inspect(cid); need(c['Name'].lstrip('/') in allowed, 'EXACT_RENAME_PREIMAGE_REQUIRED')
        if c['Name'] != '/' + destination:
            need(absent(destination), 'RENAME_DESTINATION_MUST_BE_ABSENT'); api('POST', '/containers/' + cid + '/rename?name=' + urllib.parse.quote(destination, safe=''))
        need(inspect(cid)['Name'] == '/' + destination, 'EXACT_RENAME_READBACK_REQUIRED')
    signal.signal(signal.SIGTERM, lambda *_: (_ for _ in ()).throw(KeyboardInterrupt()))
    signal.signal(signal.SIGINT, lambda *_: (_ for _ in ()).throw(KeyboardInterrupt()))
    try:
        # Only five tiny public files. No private binding is rewritten or copied.
        public_pins = json.loads((HERE / 'public-closure-files.json').read_text())
        PUBLIC.mkdir(mode=0o755); os.chmod(PUBLIC, 0o755)
        for relative, digest in public_pins.items():
            need(not Path(relative).is_absolute() and '..' not in Path(relative).parts, 'OWN_PUBLIC_RELATIVE_PATH_REQUIRED')
            dest = PUBLIC / relative
            for parent in reversed(list(dest.parent.parents)):
                if parent == PUBLIC or parent.is_relative_to(PUBLIC):
                    parent.mkdir(mode=0o755, exist_ok=True); os.chmod(parent, 0o755)
            dest.parent.mkdir(mode=0o755, exist_ok=True); os.chmod(dest.parent, 0o755)
            raw = (HERE / 'public' / relative).read_bytes(); need(sha(raw) == digest, 'EXACT_PUBLIC_RUNTIME_CLOSURE_REQUIRED'); write(dest, raw, 0o444)
        anchor_guard(); result['phase'] = 'QUIESCE_COMMON_INGRESS'; record(result)
        common_stopped = halt(ids['common'], original_proofs['common']); need(common_stopped, 'ORIGINAL_COMMON_QUIESCENCE_REQUIRED'); result['ingressBlocked'] = True; record(result)
        result['phase'] = 'STOP_ORIGINAL_WORK'; record(result)
        old_stopped = halt(ids['work'], original_proofs['work']); need(old_stopped, 'ORIGINAL_WORK_PHYSICAL_STOP_REQUIRED')
        rename(ids['work'], archived, [name, archived]); anchor_guard()
        result['phase'] = 'CREATE_SAME_NAMESPACE_WORK_RDS'; record(result); create_attempted = True
        new_id = api('POST', '/containers/create?name=' + urllib.parse.quote(name, safe=''), payload)['Id']; c = owned(new_id); new_admitted = True
        actual_config = copy.deepcopy(c['Config'])
        for k in ['Hostname', 'Domainname']: actual_config.pop(k, None)
        need(actual_config == projection.expected_config(old['work']), 'EXACT_NEW_CONFIG_AND_INHERITED_EXPOSED_PORTS_REQUIRED')
        expected_host = copy.deepcopy(payload['HostConfig']); actual_host = copy.deepcopy(c['HostConfig'])
        # Docker's previously qualified null→false normalization only, no general relaxation.
        if expected_host.get('OomKillDisable') is None and actual_host.get('OomKillDisable') is False: expected_host['OomKillDisable'] = False
        need(actual_host == expected_host, 'EXACT_NEW_HOSTCONFIG_REQUIRED')
        actual_mounts = {(m['Source'], m['Destination'], m['RW']) for m in c['Mounts'] if m['Type'] == 'bind'}
        expected_mounts = {(m['Source'], m['Target'], not m.get('ReadOnly', False)) for m in payload['HostConfig']['Mounts']}
        need(actual_mounts == expected_mounts, 'EXACT_TEN_NEW_WORK_MOUNTS_REQUIRED')
        result['newWorkId'] = new_id; result['phase'] = 'START_NEW_WORK_METADATA_ONLY'; record(result)
        api('POST', '/containers/' + new_id + '/start'); c = owned(new_id); new_proof = physical(c)
        tcp_ready(new_id, 19109, 90)
        probe = docker('exec', new_id, 'node', '/run/crays-work-code/auth0-anonymous-probe.cjs', timeout=35)
        need(probe.returncode == 0 and len(probe.stdout) <= 65536, 'ORIGINAL_WORK_ANONYMOUS_AUTH0_PROBE_REQUIRED')
        proof = json.loads(probe.stdout); need(proof['actualSdkRedirectClientAndCallbackPassed'] and proof['anonymousWorkAuthorityDenied'] and proof['wrongOriginRejected'] and proof['buildId'] == BUILD_ID, 'EXACT_ORIGINAL_WORK_AUTH0_AND_BUILD_PROOF_REQUIRED')
        result['originalAnonymousAuth0Proof'] = proof; anchor_guard()
        need(terminal(ids['common'], original_proofs['common']), 'INGRESS_MUST_REMAIN_BLOCKED_BEFORE_COMMIT')
        result['phase'] = 'DURABLE_RDS_RELEASE_COMMIT'; result['commitWriteAttempted'] = True; result['oldDatabaseAutomaticRollbackAllowed'] = False; commit_attempted = True; record(result)
        marker = {'newWorkId': new_id, 'rdsEnvironmentSHA256': binding['environmentSHA256'], 'buildId': BUILD_ID, 'legacyDatabaseFallbackForbidden': True}
        write(OUT / 'RELEASE_COMMIT.json', (json.dumps(marker, indent=2) + '\n').encode()); fd = os.open(OUT, os.O_RDONLY | os.O_DIRECTORY)
        try: os.fsync(fd)
        finally: os.close(fd)
        result['releaseCommitted'] = True; record(result)
        result['phase'] = 'REOPEN_SAME_COMMON_INGRESS'; record(result)
        api('POST', '/containers/' + ids['common'] + '/start', statuses=(204, 304)); common_ready(ids['common']); result['ingressBlocked'] = False
        anchor_guard()
        need(fingerprints(inspect(ids['common'])) == q['family']['common']['fingerprints'] and inspect(ids['common'])['State']['Running'] and owned(new_id)['State']['Running'], 'FINAL_COMMON_WORK_METADATA_REQUIRED')
        result.update(status='WORK_ONLY_EXACT_RDS_RELEASE_RUNNING_PRIVATE_PASS', phase='COMPLETE', originalWorkRetainedStopped=terminal(ids['work'], original_proofs['work']), memberAndNetworksAndEdgeUnchanged=True, commonConfigurationUnchangedAndRunning=True, originalFinanceRWPurposeRetained=True)
        record(result); print(json.dumps(result)); return 0
    except BaseException as e:
        result.update(status='WORK23_STOP_INSPECT_NO_REPLAY', dockerFailure=e.safe if isinstance(e, DockerOperationError) else None, errorClass=type(e).__name__, safeGuard=str(e) if isinstance(e, RuntimeError) and re.fullmatch('[A-Z][A-Z0-9_]{3,120}', str(e)) else None)
    finally:
        signal.signal(signal.SIGTERM, signal.SIG_IGN); signal.signal(signal.SIGINT, signal.SIG_IGN)
        if result['status'] != 'WORK_ONLY_EXACT_RDS_RELEASE_RUNNING_PRIVATE_PASS':
            def attempt(step, fn):
                try: return fn()
                except BaseException as e: errors.append({'step': step, 'errorClass': type(e).__name__}); return None
            if create_attempted and not new_admitted:
                c = attempt('adopt_exact_new_create_outcome', lambda: owned(name))
                if c: new_id = c['Id']; new_admitted = True; new_proof = attempt('capture_new_physical_proof', lambda: physical(c)) or new_proof
            new_terminal = not create_attempted
            if new_admitted:
                c = attempt('capture_current_new_proof', lambda: owned(new_id))
                if c and c['State']['Pid']: new_proof = attempt('new_running_physical_proof', lambda: physical(c)) or new_proof
                new_terminal = attempt('independent_stop_new_work', lambda: halt(new_id, new_proof)) is True
            elif create_attempted:
                new_terminal = attempt('new_name_absence_after_unknown_create', lambda: absent(name)) is True
            result['newWorkPhysicallyQuiesced'] = new_terminal
            if commit_attempted:
                # A local commit fsync failure is ambiguous: never expose the legacy DB.
                result['oldDatabaseAutomaticRollbackAllowed'] = False
                current_common = attempt('capture_postcommit_common_physical', lambda: physical(inspect(ids['common']))) or original_proofs['common']
                result['commonIngressPhysicallyQuiesced'] = attempt('postcommit_common_quiesce', lambda: halt(ids['common'], current_common)) is True
                result['ingressBlocked'] = True if result['commonIngressPhysicallyQuiesced'] else None
            else:
                if new_terminal:
                    if new_admitted: attempt('retain_failed_new_work_name', lambda: rename(new_id, failed, [name, failed]))
                    restored = attempt('restore_exact_old_work_name', lambda: rename(ids['work'], name, [name, archived]))
                    def restore_old_runtime():
                        need(inspect(ids['work'])['Name'] == '/' + name, 'ORIGINAL_WORK_NAME_REQUIRED_FOR_RESTORE')
                        api('POST', '/containers/' + ids['work'] + '/start', statuses=(204, 304)); tcp_ready(ids['work'], 19109, 90)
                        need(fingerprints(inspect(ids['work'])) == q['family']['work']['fingerprints'], 'ORIGINAL_WORK_CONFIG_MUST_BE_EXACT')
                        return True
                    old_ready = attempt('restore_original_work_start_and_readiness', restore_old_runtime) is True
                    result['originalWorkRestoredNamedAndReady'] = old_ready
                    if old_ready:
                        def reopen_original_common():
                            api('POST', '/containers/' + ids['common'] + '/start', statuses=(204, 304)); return common_ready(ids['common'])
                        reopened = attempt('restore_same_common_and_anonymous_ready', reopen_original_common) is True
                        result['ingressBlocked'] = False if reopened else None
                else:
                    result['ingressBlocked'] = True if attempt('retain_common_quiescence', lambda: halt(ids['common'], original_proofs['common'])) is True else None
            result['protectedMemberNetworkEdgeUnchanged'] = attempt('final_protected_member_network_edge', anchor_guard) is None and not any(x['step'] == 'final_protected_member_network_edge' for x in errors)
            result['recoveryErrors'] = errors
            # Receipt persistence is independent of every recovery step; no unguarded record before cleanup.
            try: record(result)
            except BaseException: pass
            print(json.dumps(result))
    return 1

if __name__ == '__main__':
    try: raise SystemExit(main())
    except Exception as error:
        value = SAFE_RESULT or {'status': 'WORK23_PREFLIGHT_STOP_NO_APP_CHANGE'}
        value.update(errorClass=type(error).__name__, safeGuard=str(error) if isinstance(error, RuntimeError) and re.fullmatch('[A-Z][A-Z0-9_]{3,120}', str(error)) else None)
        if OUT.exists():
            try: record(value)
            except BaseException: pass
        print(json.dumps(value)); raise SystemExit(1)
