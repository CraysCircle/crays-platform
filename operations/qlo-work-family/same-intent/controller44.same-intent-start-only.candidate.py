"""Own original gateway once-start candidate. Requires actual Root TLS receipts.

No envelope may be built until Root's actual TLS/public-trust/Work postimage and
boolean original-consumer equality are independently bound. Not executed yet.
"""
from pathlib import Path
import hashlib
import http.client
import json
import os
import re
import runpy
import socket
import ssl
import stat
import subprocess
import time

PLAN_SHA = '46db8a7df103f8e94a8e613cf2e38ef7608d315acfbc75e357f70b2bf0e23eec'
Q = Path('/srv/crays/runtime/business-qlo-20261108-01')
OUT = Q / 'gateway-start44'
EDGE = '20003ed249ddaf862469f7397c10aa21d8c24b134412da05f1d11e35ef2667d5'
EDGE_ROOT = Path('/srv/crays/runtime/private-edge-caddy-20261106-03')
WORK = '06a9a5a92df9bcd3fd3675a09172123333f68a1825df5c07a7ba5724a70eb071'
MEMBER = '0fa6bba9af8e7bb592e72b86afddf0d5702d892e72c5f62f6f415f735886872f'
DB = 'ac0839f3d6b11a1d08e6af3f503a33fea3030a119c5fdd16bc38a48d620226fb'
WEB = 'cf9c80ed35866706b4fd6fed56a7003685b67d8123f1f8cc69c6052881117f90'
BRIDGE = '172.26.0.1'
IP = '172.26.0.3'
PUBLIC_SOURCE = {
    'server.mjs': '642e68a03e6d3331ad4e29c036d41f0797c11a165725fbb2b82d304c2e7adb57',
    'provider-room-inventory.mjs': '24cb98700f736780e583599dbd8e2bd82c969e0838119a5215221601a9291167',
    'provider-property-services.mjs': '8430d78393d58326e8b602f770dfa3a6a7161bb202ab82959522de7b5da9ba75',
}
REPORT = {'status': 'GATEWAY44_INCOMPLETE', 'gatewayId': None,
          'createAttempted': False, 'startAttempted': False,
          'edgeOrWorkOrNetworkOrDatabaseChanged': False,
          'newBusinessCodeWritten': False, 'credentialsGeneratedByGateway44': False,
          'rootRotation79BindingAdopted': False, 'customerAccepted': False,
          'automaticRetry': False}
OWN = False
CID = None


def need(value, guard):
    if not value:
        raise RuntimeError(guard)


def sha(body):
    return hashlib.sha256(body).hexdigest()


def put(name, value):
    fd = os.open(OUT / name, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o400)
    with os.fdopen(fd, 'w') as f:
        json.dump(value, f, indent=2)
        f.write('\n')
        f.flush()
        os.fsync(f.fileno())


def dock(*args, timeout=20):
    r = subprocess.run(['/usr/bin/docker', *args], capture_output=True,
                       timeout=timeout, env={'PATH': '/usr/bin:/bin'})
    need(r.returncode == 0 and len(r.stdout) <= 1048576,
         'DOCKER_OPERATION_FAILED_INSPECT_SAME_INTENT')
    return r.stdout


def inspect(identity):
    return json.loads(dock('inspect', identity))[0]


def directory(path, mode):
    st = path.lstat()
    need(path.resolve() == path and stat.S_ISDIR(st.st_mode) and st.st_uid == 0
         and stat.S_IMODE(st.st_mode) == mode, 'ORIGINAL_PROTECTED_DIRECTORY_CUSTODY')


def regular(path, mode, maximum):
    st = path.lstat()
    need(path.resolve() == path and stat.S_ISREG(st.st_mode) and st.st_uid == 0
         and st.st_nlink == 1 and stat.S_IMODE(st.st_mode) == mode
         and 0 < st.st_size <= maximum, 'EXACT_ORIGINAL_PROTECTED_FILE_CUSTODY')
    return path.read_bytes()


def original_state(identity):
    obj = inspect(identity)
    s = obj['State']
    need(obj['Id'] == identity and s['Running'] and s['Pid'] > 0,
         'ORIGINAL_QLO_DATABASE_AND_WEB_RUNNING')
    return {'id': identity, 'pid': s['Pid'], 'startedAt': s['StartedAt']}


def request_gateway(path, token=None):
    c = http.client.HTTPConnection(IP, 8080, timeout=8, source_address=(BRIDGE, 0))
    try:
        headers = {'Host': 'team.craysclub.com'}
        if token is not None:
            headers['Authorization'] = 'Bearer ' + token
        c.request('GET', path, headers=headers)
        r = c.getresponse()
        body = r.read(262145)
        need(len(body) <= 262144, 'BOUNDED_ORIGINAL_GATEWAY_PROTOCOL_RESPONSE')
        return r.status, body
    finally:
        c.close()


def protected79(path, maximum):
    directory(Q / 'key-rotation79', 0o700)
    need(path.resolve() == path, 'ROTATION79_CANONICAL_PROTECTED_PATH')
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_CLOEXEC)
    try:
        before = os.fstat(fd)
        need(stat.S_ISREG(before.st_mode) and before.st_uid == 0 and before.st_gid == 0
             and before.st_nlink == 1 and stat.S_IMODE(before.st_mode) == 0o400
             and 0 < before.st_size <= maximum, 'ROTATION79_PROTECTED_FILE_CUSTODY')
        raw = os.read(fd, maximum + 1)
        after = os.fstat(fd)
        identity = lambda s: (s.st_dev, s.st_ino, s.st_size, s.st_mtime_ns, s.st_ctime_ns,
                              s.st_mode, s.st_uid, s.st_gid, s.st_nlink)
        need(len(raw) == before.st_size and identity(before) == identity(after)
             and identity(before) == identity(path.lstat()), 'ROTATION79_STABLE_PROTECTED_FD')
    finally:
        os.close(fd)
    return raw, before


def unique79(pairs):
    result = {}
    for key, value in pairs:
        need(key not in result, 'ROTATION79_DUPLICATE_JSON_KEY')
        result[key] = value
    return result


def qualify_rotation79():
    proof = globals().get('ROOT79_ROTATION_PROOF')
    need(type(proof) is dict and set(proof) == {'actualSHA256', 'sourceSHA256', 'reviewSHA256'},
         'ROOT79_EXACT_PUBLIC_PROOF_FIELDS')
    need(all(type(v) is str and re.fullmatch('[a-f0-9]{64}', v) for v in proof.values()),
         'ROOT79_FROZEN_PUBLIC_PROOF_PINS')
    base = Q / 'key-rotation79'
    raw, _ = protected79(base / 'ACTUAL.json', 65536)
    need(sha(raw) == proof['actualSHA256'], 'ROOT79_EXACT_ACTUAL_RECEIPT')
    actual = json.loads(raw, object_pairs_hook=unique79)
    expected = json.loads("{\"schema\":\"crays.qlo.account2.aws-rotation79.actual.v1\",\"status\":\"QLO_AWS_ACCOUNT2_ROTATION79_COMPLETE\",\"accountId\":2,\"newProtectedBindingRef\":\"/srv/crays/runtime/business-qlo-20261108-01/key-rotation79/bindings/qlo-provider-read-webservice-key\",\"privateCustodyRef\":\"/srv/crays/runtime/business-qlo-20261108-01/key-rotation79/CUSTODY.private.json\",\"newKeyFileUid\":0,\"newKeyFileGid\":0,\"newKeyFileMode\":\"0400\",\"newKeyFileBytes\":33,\"newKeyFileNlink\":1,\"oldKeyDenied\":true,\"newKeyReadonlyProbe\":true,\"baselineAclUnchanged\":true,\"knownOtherAccountStatusesUnchanged\":true,\"knownOtherAccountIds\":[1,3,5],\"commitReconciled\":true,\"rotationComplete\":true,\"publicKeyValuesOrHashesLogged\":false,\"sourceXLXXLChanged\":false,\"gatewayStarted\":false,\"fullCustomerAcceptance\":false,\"allConsumersIdentified\":false,\"account5Rotated\":false}")
    need(type(actual) is dict and set(actual) == set(expected) | {'sourceReviewPins'},
         'ROOT79_PUBLIC_ACTUAL_SCHEMA')
    need(all(type(actual[k]) is type(v) and actual[k] == v for k, v in expected.items()),
         'ROOT79_ROTATION_AND_DENIAL_READONLY_ACTUALS_REQUIRED')
    need(actual['knownOtherAccountIds'] == [1, 3, 5] and all(type(v) is int for v in actual['knownOtherAccountIds']),
         'ROOT79_EXACT_KNOWN_OTHER_ACCOUNT_IDS_ONLY')
    source_pins = {'sourceSHA256': proof['sourceSHA256'], 'reviewSHA256': proof['reviewSHA256']}
    need(actual['sourceReviewPins'] == source_pins, 'ROOT79_SOURCE_REVIEW_CHAIN')
    raw, _ = protected79(base / 'CUSTODY.private.json', 65536)
    custody = json.loads(raw, object_pairs_hook=unique79)
    fields = {'schema', 'accountId', 'newProtectedBindingRef', 'oldBindingRef', 'uid', 'gid',
              'mode', 'nlink', 'dev', 'inode', 'bytes', 'newSecretLength', 'sha256',
              'createdBeforeDatabaseCommit', 'sourceReviewPins',
              'historicalOriginalCustody19CanonicalSHA256'}
    need(type(custody) is dict and set(custody) == fields, 'ROOT79_PRIVATE_CUSTODY_SCHEMA')
    need(custody['schema'] == 'crays.qlo.account2.aws-rotation79.private-custody.v1'
         and type(custody['accountId']) is int and custody['accountId'] == 2
         and custody['newProtectedBindingRef'] == expected['newProtectedBindingRef']
         and custody['oldBindingRef'] == str(Q / 'gateway-originals19/bindings/qlo-provider-read-webservice-key')
         and custody['sourceReviewPins'] == source_pins
         and custody['createdBeforeDatabaseCommit'] is True, 'ROOT79_PRIVATE_CUSTODY_BINDINGS')
    need(all(type(custody[k]) is int for k in ['uid', 'gid', 'nlink', 'dev', 'inode', 'bytes', 'newSecretLength'])
         and custody['uid'] == custody['gid'] == 0 and custody['mode'] == '0400'
         and custody['nlink'] == 1 and custody['bytes'] == 33 and custody['newSecretLength'] == 32,
         'ROOT79_PRIVATE_FILE_IDENTITY_TYPES')
    need(all(type(custody[k]) is str and re.fullmatch('[a-f0-9]{64}', custody[k])
             for k in ['sha256', 'historicalOriginalCustody19CanonicalSHA256']),
         'ROOT79_PRIVATE_DIGEST_FORMAT_ONLY')
    directory(base / 'bindings', 0o700)
    raw, info = protected79(Path(custody['newProtectedBindingRef']), 33)
    need(info.st_dev == custody['dev'] and info.st_ino == custody['inode']
         and len(raw) == 33 and re.fullmatch(b'[a-f0-9]{32}\\n', raw)
         and sha(raw) == custody['sha256'], 'ROOT79_NEW_READKEY_PRIVATE_EQUALITY')
    del raw, actual
    return custody


def native_main():
    global OWN, CID
    os.umask(0o077)
    need(os.getuid() == 0 and
         Path('/sys/devices/virtual/dmi/id/board_asset_tag').read_text().strip() ==
         'i-0eb300e1b02414d8f', 'EXACT_EXISTING_AWS_ROOT_ONLY')
    facts = globals().get('ACTUAL_ROOT44_FACTS')
    need(isinstance(facts, dict) and set(facts) == {
        'workContainerId', 'currentEdgeSHA256', 'publicCaSHA256',
        'rootActualReceiptSHA256', 'originalConsumerTokenEqualityProven',
        'actualCoreWriterAndServerBindingVerified'}, 'ACTUAL_REVIEWED_ROOT_RECEIPT_FACTS_ONLY')
    for key in ['currentEdgeSHA256', 'publicCaSHA256', 'rootActualReceiptSHA256']:
        need(isinstance(facts[key], str) and re.fullmatch('[a-f0-9]{64}', facts[key]),
             'ACTUAL_ROOT_PUBLIC_PIN_REQUIRED')
    need(facts['workContainerId'] == WORK and
         facts['originalConsumerTokenEqualityProven'] is True and
         facts['actualCoreWriterAndServerBindingVerified'] is True,
         'ACTUAL_ROOT_ORIGINAL_TOKEN_CORE_WRITER_AND_WORK_POSTIMAGE_PROOF_REQUIRED')
    plan = globals().get('REVIEWED_GATEWAY39_PLAN')
    need(isinstance(plan, bytes) and sha(plan) == PLAN_SHA, 'EXACT_REVIEWED_ORIGINAL_GATEWAY39_PLAN')
    m = {'__name__': 'gateway39_definitions_only'}
    exec(compile(plan, 'reviewed-gateway39-plan', 'exec'), m)
    directory(Q, 0o711)
    directory(Q / 'gateway-originals19', 0o700)
    directory(Q / 'gateway-originals19/bindings', 0o700)
    directory(Q / 'gateway-originals19/app', 0o755)
    guard = Path('/srv/crays/incoming/guest-runtime-bootstrap-20261105-01/persistent_storage_guards.candidate.py')
    need(sha(guard.read_bytes()) == '3efa226b84d375cf96f911c620b7dbefa814f0c54abb8fa61944d0aeb658c739',
         'EXACT_EXISTING_PERSISTENT_STORAGE_GUARD')
    runpy.run_path(str(guard))['verify_data_mount'](Path('/srv/crays'))
    directory(OUT, 0o700)
    need(not os.path.lexists(OUT / 'CONTINUATION01_INTENT.json')
         and not os.path.lexists(OUT / 'GATEWAY44_CONTINUATION01_ACTUAL.json'),
         'SAME_INTENT_CONTINUATION_ALREADY_ADMITTED_INSPECT_NO_REPLAY')
    previous_raw = regular(OUT / 'GATEWAY44_ACTUAL.json', 0o400, 65536)
    need(sha(previous_raw) == 'a2f54f572faad37092fe9bfafaa92bef6fa27d934cf4ae3ae9309d8008b1f27f',
         'EXACT_PREVIOUS_STOP_RECEIPT_REQUIRED')
    previous = json.loads(previous_raw)
    CID = '826680e27113c9834990fa46ad54905ea2dbc758c12bf519f09731c4ea7ef815'
    need(previous['gatewayId'] == CID and previous['createAttempted'] is True
         and previous['startAttempted'] is False
         and previous['safeGuard'] == 'EXACT_OWN_CREATED_GATEWAY_IMAGE_NAMESPACE_PRIVILEGE_AND_RESOURCE_BOUNDARY',
         'EXACT_CREATED_NEVER_START_ATTEMPTED_SAME_INTENT_REQUIRED')
    intent_raw = regular(OUT / 'INTENT.json', 0o400, 65536)
    need(sha(intent_raw) == 'ab19f3e08d33c757185c47f011122ee773a431408eadcd2366323b05795844a5',
         'EXACT_ORIGINAL_ONCE_INTENT_REQUIRED')
    existing_intent = json.loads(intent_raw)
    created_raw = regular(OUT / 'CREATED_ACTUAL.json', 0o400, 65536)
    need(sha(created_raw) == '968f7fd2a8731938569796ae5f694ae28e8b582fd31a12309d55bc47ffc13666'
         and json.loads(created_raw)['id'] == CID, 'EXACT_CREATED_RECEIPT_REQUIRED')
    REPORT.update(gatewayId=CID, createAttempted=False, originalCreateAttempted=True,
                  sameIntentContinuation=True, previousStopReceiptSHA256=sha(previous_raw))
    image = json.loads(dock('image', 'inspect', m['IMAGE']))[0]
    need(image['Id'] == m['IMAGE'] and image['Config']['WorkingDir'] == '/app'
         and image['Config']['User'] == 'root'
         and image['Config']['Cmd'] == ['node', '/app/server.mjs'], 'QUALIFIED_ORIGINAL_IMAGE30_CONFIG')
    image30 = json.loads((Q / 'gateway-image30/IMAGE30_ACTUAL.json').read_text())
    need(image30.get('status') == 'ORIGINAL_QLO_GATEWAY_SOURCE_DOCKERFILE_IMAGE_AND_MODULE_ADMISSION_PASS'
         and image30.get('imageId') == m['IMAGE'] and image30.get('originalSourceFiles') == PUBLIC_SOURCE,
         'EXACT_ORIGINAL_IMAGE30_ADMISSION')
    for name, digest in PUBLIC_SOURCE.items():
        need(sha(regular(Q / 'gateway-originals19/app' / name, 0o444, 100000)) == digest,
             'ORIGINAL_GATEWAY_PUBLIC_SOURCE_UNCHANGED')
    private79 = qualify_rotation79()
    need(m['READ_KEY'] == Path(private79['newProtectedBindingRef']), 'ROOT79_PLAN_READKEY_REF')
    REPORT.update(rootRotation79BindingAdopted=True, root79ActualReceiptSHA256=globals()['ROOT79_ROTATION_PROOF']['actualSHA256'],
                  nativeAccount2IncidentResolved=False, allConsumersIdentified=False, account5Rotated=False)
    # Custody19 remains the historical original archive, not current account2 authentication.
    # Full private-file digests are compared in RAM and never exported.
    custody = json.loads(regular(Q / 'gateway-originals19/MATERIALIZE19_ACTUAL.json', 0o600, 262144))
    need(sha(json.dumps(custody, sort_keys=True, separators=(',', ':')).encode()) == private79['historicalOriginalCustody19CanonicalSHA256']
         and custody.get('status') == 'ORIGINAL_QLO_GATEWAY_FILES_KEYS_AND_NATIVE_ACCOUNT2_CUSTODY_PASS_NOT_STARTED',
         'EXACT_ORIGINAL_NATIVE_CUSTODY19_RECEIPT')
    pins = {entry['name']: entry for entry in custody['files']}
    for name in ['team-consumer-token', 'qlo-provider-read-webservice-key', 'qlo-import-receipt.json']:
        private_body = regular(Q / 'gateway-originals19/bindings' / name, 0o400, 262144)
        need(len(private_body) == pins[name]['bytes'] and sha(private_body) == pins[name]['sha256'],
             'FULL_ORIGINAL_PROTECTED_BINDING_CHANGED_REQUIRE_COORDINATED_REVIEW')
        del private_body
    del pins, custody
    token = regular(Q / 'gateway-originals19/bindings/team-consumer-token', 0o400, 256).decode().strip()
    need(32 <= len(token) <= 128 and '\n' not in token and '\r' not in token, 'ORIGINAL_TEAM_CONSUMER_FORMAT')
    edge = inspect(EDGE)
    need(edge['Id'] == EDGE and edge['State']['Running'] and
         edge['HostConfig']['NetworkMode'] == 'host', 'EXACT_ROOT_EDGE_STILL_RUNNING')
    need(sha(regular(EDGE_ROOT / 'Caddyfile.private', 0o400, 65536)) == facts['currentEdgeSHA256'],
         'ACTUAL_REVIEWED_ROOT_EDGE_POSTIMAGE')
    ca_st = m['CA'].lstat()
    need(m['CA'].resolve() == m['CA'] and stat.S_ISREG(ca_st.st_mode) and ca_st.st_uid == 0
         and not ca_st.st_mode & 0o022 and 0 < ca_st.st_size < 65536,
         'PUBLIC_NAMED_CA_ONLY_NO_PRIVATE_KEYS')
    need(sha(m['CA'].read_bytes()) == facts['publicCaSHA256'], 'ACTUAL_VERIFIED_ROOT_PUBLIC_CA_SHA')
    work = inspect(WORK)
    need(work['Id'] == WORK and work['State']['Running'] and
         work['HostConfig']['NetworkMode'] == 'container:' + MEMBER and
         work['Config']['WorkingDir'] == '/srv/crays/releases/work24-qlo-20261108-01/app',
         'CURRENT_ROOT_WORK24_POSTRESTART_NAMESPACE')
    code = "const f=require('fs');const p='/srv/crays/releases/work24-qlo-20261108-01/app/.next-aws-work24-qlo';const m=JSON.parse(f.readFileSync(p+'/server/app-paths-manifest.json','utf8'));process.stdout.write(JSON.stringify({build:f.readFileSync(p+'/BUILD_ID','utf8').trim(),routes:['/api/crays/clubs/team/launch/issue/route','/api/crays/clubs/team/launch/redeem/route','/api/crays/clubs/team/session/route'].every(r=>typeof m[r]==='string')}));"
    build = json.loads(dock('exec', WORK, 'node', '-e', code))
    need(build == {'build': m['BUILD'], 'routes': True}, 'CURRENT_ORIGINAL_WORK24_BUILD_AND_THREE_ROUTES')
    net = json.loads(dock('network', 'inspect', m['NETWORK']))[0]
    endpoints = net.get('Containers', {})
    need(net['Driver'] == 'bridge' and net['Internal'] and any(
         v.get('Subnet') == '172.26.0.0/16' and v.get('Gateway') == BRIDGE
         for v in net['IPAM']['Config']) and DB in endpoints and
         endpoints[DB]['IPv4Address'] == '172.26.0.2/16' and not any(
                   v['IPv4Address'].split('/')[0] == IP for k, v in endpoints.items() if k != CID),
         'ORIGINAL_QLO_NETWORK_AND_FREE_GATEWAY_ADDRESS')
    original = [original_state(DB), original_state(WEB)]
    names = dock('ps', '-a', '--format', '{{.Names}}').decode().splitlines()
    need(names.count(m['NAME']) == 1 and inspect(m['NAME'])['Id'] == CID,
         'EXACT_RETAINED_ORIGINAL_GATEWAY_NAME_SAME_INTENT')
    ctx = ssl.create_default_context(cafile=str(m['CA']))
    ctx.minimum_version = ssl.TLSVersion.TLSv1_2
    need(ctx.check_hostname and ctx.verify_mode == ssl.CERT_REQUIRED, 'VERIFIED_CHAIN_AND_HOSTNAME_ONLY')
    with socket.create_connection((BRIDGE, 443), timeout=8, source_address=(BRIDGE, 0)) as raw:
        with ctx.wrap_socket(raw, server_hostname='member.crays.world') as peer:
            need(('DNS', 'member.crays.world') in peer.getpeercert().get('subjectAltName', []),
                 'ACTUAL_CANONICAL_CORE_PEER')
    actual = {'workContainerId': WORK, 'workBuildId': m['BUILD'],
              'currentEdgeSHA256': facts['currentEdgeSHA256'], 'publicCaSHA256': facts['publicCaSHA256'],
              'trustedCanonicalPeerVerified': True, 'originalConsumerTokenEqualityVerified': True,
              'actualCoreWriterAndServerBindingVerified': True, 'gatewayAddressFreeVerified': True,
              'originalImageAndBindingsVerified': True}
    args = m['create_arguments'](actual)
    need(existing_intent['admission'] == actual
         and existing_intent['rootActualReceiptSHA256'] == facts['rootActualReceiptSHA256']
         and existing_intent['originalQloPhysical'] == original,
         'SAME_INTENT_ADMISSION_AND_ORIGINAL_QLO_PHYSICAL_UNCHANGED')
    created = inspect(CID)
    hc = created['HostConfig']
    conf = created['Config']
    need(created['Id'] == CID and created['Name'] == '/' + m['NAME']
         and created['Image'] == m['IMAGE'] and created['State']['Pid'] == 0
         and not created['State']['Running'] and created['State']['Status'] == 'created'
         and created['State']['StartedAt'] == '0001-01-01T00:00:00Z'
         and created['RestartCount'] == 0 and hc['NetworkMode'] == m['NETWORK']
         and hc['ReadonlyRootfs'] and not hc.get('Privileged')
         and not hc.get('PublishAllPorts') and not hc.get('PortBindings')
         and hc['RestartPolicy']['Name'] == 'no'
         and hc['CapDrop'] == ['ALL'] and {v[4:] if v.startswith('CAP_') else v for v in hc['CapAdd']} == {'SETUID', 'SETGID'}
         and 'no-new-privileges:true' in hc['SecurityOpt']
         and hc['Memory'] == 192 * 1024**2 and hc['MemorySwap'] == 192 * 1024**2
         and hc['NanoCpus'] == 250000000 and hc['PidsLimit'] == 64
         and conf['User'] == image['Config']['User']
         and conf['Entrypoint'] == image['Config']['Entrypoint']
         and conf['Cmd'] == image['Config']['Cmd'],
         'EXACT_OWN_CREATED_GATEWAY_IMAGE_NAMESPACE_PRIVILEGE_AND_RESOURCE_BOUNDARY')
    mounts = {v['Destination']: v for v in created['Mounts']}
    expected_mounts = {'/run/crays/' + n: str(m['READ_KEY'] if n == 'qlo-provider-read-webservice-key' else Q / 'gateway-originals19/bindings' / n)
                       for n in ['team-consumer-token', 'qlo-provider-read-webservice-key', 'qlo-import-receipt.json']}
    expected_mounts['/run/crays/tls37-root.crt'] = str(m['CA'])
    need(set(mounts) == set(expected_mounts) and all(
         mounts[dst]['Type'] == 'bind' and not mounts[dst]['RW']
         and mounts[dst]['Source'] == src for dst, src in expected_mounts.items()),
         'EXACT_FOUR_READONLY_BINDINGS_NO_CORE_DATABASE_ASSERTION_OR_PKI_DIRECTORY')
    put('CONTINUATION01_INTENT.json', {
        'status': 'SAME_ORIGINAL_GATEWAY44_START_ONLY_ONCE',
        'gatewayId': CID, 'previousStopSHA256': sha(previous_raw),
        'originalIntentSHA256': sha(intent_raw),
        'rootActualReceiptSHA256': facts['rootActualReceiptSHA256'],
        'createAllowed': False, 'automaticReplay': False})
    OWN = True
    REPORT['startAttempted'] = True
    dock('start', CID)
    obj = inspect(CID)
    need(obj['Id'] == CID and obj['Name'] == '/' + m['NAME'] and obj['Image'] == m['IMAGE']
         and obj['State']['Running'] and obj['State']['Pid'] > 0
         and set(obj['NetworkSettings']['Networks']) == {m['NETWORK']}
         and obj['NetworkSettings']['Networks'][m['NETWORK']]['IPAddress'] == IP,
         'EXACT_ORIGINAL_GATEWAY_RUNNING_IN_OWN_FIXED_ADDRESS')
    pid = obj['State']['Pid']
    # Only bounded readiness GETs may repeat; create/start never repeat.
    ready = False
    for attempt in range(10):
        try:
            status, body = request_gateway('/healthz')
            ready = status == 200 and json.loads(body) == {'status': 'ready', 'qlo': 'provider_readable'}
        except (ConnectionError, OSError, http.client.HTTPException):
            pass
        if ready:
            break
        time.sleep(0.2)
    need(ready, 'ORIGINAL_GATEWAY_QLO_HEALTH_NOT_READY')
    status_fields = dict(line.split(':', 1) for line in Path('/proc', str(pid), 'status').read_text().splitlines() if ':' in line)
    need(status_fields['Uid'].split() == ['1000'] * 4 and status_fields['Gid'].split() == ['1000'] * 4,
         'ORIGINAL_GATEWAY_PRIVILEGE_DROP_TO_NODE')
    need(int(status_fields['CapEff'].strip(), 16) == 0
         and status_fields['NoNewPrivs'].strip() == '1', 'DROPPED_EFFECTIVE_CAPABILITIES_AND_NO_NEW_PRIVILEGES')
    owned_sockets = set()
    for fd in Path('/proc', str(pid), 'fd').iterdir():
        try:
            link = os.readlink(fd)
        except FileNotFoundError:
            continue
        match = re.fullmatch(r'socket:\[([0-9]+)\]', link)
        if match:
            owned_sockets.add(match.group(1))
    listener = [line.split() for line in Path('/proc', str(pid), 'net/tcp').read_text().splitlines()[1:]]
    need(any(row[1] == '00000000:1F90' and row[3] == '0A' and row[9] in owned_sockets
             for row in listener), 'ORIGINAL_NODE_PROCESS_OWNS_NATIVE_IPV4_PORT8080_LISTENER')
    start_ticks = Path('/proc', str(pid), 'stat').read_text().rsplit(')', 1)[1].split()[19]
    cgroup = Path('/proc', str(pid), 'cgroup').read_text().strip()
    need(CID in cgroup, 'OWN_PHYSICAL_GATEWAY_CGROUP_REQUIRED')
    need(request_gateway('/api/session')[0] == 401, 'GATEWAY_TO_CORE_VERIFIED_TLS_ORIGINAL_CONSUMER_EMPTY_SESSION_DENIAL')
    need(request_gateway('/operations')[0] == 401, 'ANONYMOUS_PROPERTY_WORKSPACE_DENIED')
    need(request_gateway('/api/provider/hotels')[0] == 401, 'ANONYMOUS_NATIVE_PROVIDER_DENIED')
    status, body = request_gateway('/api/provider/hotels', token)
    provider = json.loads(body)
    need(status == 200 and isinstance(provider, dict) and provider.get('status') == 'ready'
         and provider.get('authority') == 'qlo'
         and {h['externalKey'] for h in provider['hotels']} == {'CRAYS-FC-GOLF-HOTEL', 'CRAYS-FC-MARINA-HOTEL'}
         and provider.get('inventoryStatus') == 'channel_manager_pending'
         and provider.get('paymentStatus') == 'payment_setup_pending',
         'ORIGINAL_SERVICE_PRINCIPAL_NATIVE_PROVIDER_READ_AND_EXISTING_IMPORT_RELATIONSHIPS')
    del token, body, provider
    _, current_key = protected79(m['READ_KEY'], 33)
    mounted_key = Path('/proc', str(pid), 'root/run/crays/qlo-provider-read-webservice-key').stat()
    need(current_key.st_dev == private79['dev'] and current_key.st_ino == private79['inode']
         and mounted_key.st_dev == current_key.st_dev and mounted_key.st_ino == current_key.st_ino
         and mounted_key.st_size == 33, 'ROOT79_CURRENT_PRIVATE_KEY_MOUNT_INODE')
    del private79
    need([original_state(DB), original_state(WEB)] == original, 'ORIGINAL_QLO_PROCESSES_UNCHANGED')
    REPORT.update(status='ORIGINAL_GATEWAY44_RUNNING_PRIVATE_PROTOCOL_PASS_CUSTOMER_PENDING',
        pid=pid, startTicks=start_ticks, cgroup=cgroup, originalImage=m['IMAGE'],
        actualRootReceiptSHA256=facts['rootActualReceiptSHA256'],
        edgeSHA256=facts['currentEdgeSHA256'], publicCaSHA256=facts['publicCaSHA256'],
        originalSourceUnchanged=True, originalQloProcessesUnchanged=True,
        originalUidGid=1000, nativeQloProviderHealthy=True,
        originalProcessOwnsPort8080Listener=True, effectiveCapabilitiesDropped=True,
        originalConsumerCoreVerifiedTlsEmptySessionDenied=True,
        anonymousWorkspaceAndProviderDenied=True, originalServicePrincipalProviderRead=True,
        nativeQloUiSessionBridgeAccepted=False, genuineAuth0CustomerAccepted=False)


if __name__ == '__main__':
    try:
        native_main()
    except Exception as exc:
        REPORT.update(status='GATEWAY44_STOP_INSPECT_SAME_INTENT_NO_REPLAY',
                      errorClass=type(exc).__name__,
                      safeGuard=str(exc) if type(exc) is RuntimeError else None,
                      createdOrStartOutcomeMayRequireInspection=REPORT['createAttempted'])
        # Retain any exact owned container for diagnosis. No implicit replay,
        # replacement, foreign service changes, stop or resource-release claim.
    if OWN:
        put('GATEWAY44_CONTINUATION01_ACTUAL.json', REPORT)
    print(json.dumps(REPORT))
    if REPORT['status'] != 'ORIGINAL_GATEWAY44_RUNNING_PRIVATE_PROTOCOL_PASS_CUSTOMER_PENDING':
        raise SystemExit(1)
