"""Pure original-gateway Docker projection; never invokes Docker or reads secrets.

The native admission/once-dispatch must be separately reviewed after Root's
actual Work24/TLS37 receipts. This module is deliberately not a launcher.
"""
from pathlib import Path
import re

IMAGE = 'sha256:190ad343504d8807d1cebaadccf37c3c4858114175fe844100e874a90cf92686'
NAME = 'crays-business-qlo-gateway-20261108-35'
NETWORK = 'crays-business-qlo-private-20261108-01'
ROOT = Path('/srv/crays/runtime/business-qlo-20261108-01')
CA = Path('/srv/crays/runtime/private-edge-caddy-20261106-03/data/caddy/pki/authorities/crays-qlo-private-20261108/root.crt')
BUILD = 'kMjI_RyB7jmjx596KU3t7'
READ_KEY = ROOT / 'key-rotation79/bindings/qlo-provider-read-webservice-key'


def need(condition, guard):
    if not condition:
        raise RuntimeError(guard)


def create_arguments(actual):
    """Accept only public native admission facts, returning an inert argv list.

    Facts are required, not invented by this planner. Their actual provenance,
    exact current checks and protected intent are native dispatch prerequisites.
    """
    need(isinstance(actual, dict), 'ACTUAL_NATIVE_ADMISSION_REQUIRED')
    need(set(actual) == {
        'workContainerId', 'workBuildId', 'currentEdgeSHA256', 'publicCaSHA256',
        'trustedCanonicalPeerVerified', 'originalConsumerTokenEqualityVerified',
        'actualCoreWriterAndServerBindingVerified', 'gatewayAddressFreeVerified',
        'originalImageAndBindingsVerified',
    }, 'EXACT_ADMISSION_FIELDS_ONLY')
    for name in ['workContainerId', 'currentEdgeSHA256', 'publicCaSHA256']:
        need(isinstance(actual[name], str) and re.fullmatch(r'[a-f0-9]{64}', actual[name]),
             'ACTUAL_PUBLIC_PIN_REQUIRED_' + name)
    need(actual['workBuildId'] == BUILD, 'EXACT_CURRENT_WORK24_BUILD')
    for name in ['trustedCanonicalPeerVerified', 'originalConsumerTokenEqualityVerified',
                 'actualCoreWriterAndServerBindingVerified', 'gatewayAddressFreeVerified',
                 'originalImageAndBindingsVerified']:
        need(actual[name] is True, 'ACTUAL_NATIVE_GATE_REQUIRED_' + name)
    args = ['/usr/bin/docker', 'create', '--name', NAME, '--pull=never',
            '--network', NETWORK, '--ip', '172.26.0.3',
            '--add-host', 'member.crays.world:172.26.0.1',
            '--add-host', 'qlo-original-upstream:172.26.0.2',
            '--read-only', '--cap-drop', 'ALL', '--cap-add', 'SETUID',
            '--cap-add', 'SETGID', '--security-opt', 'no-new-privileges:true',
            '--memory', '192m', '--memory-swap', '192m', '--cpus', '0.25',
            '--pids-limit', '64', '--restart', 'no',
            '--log-driver', 'local', '--log-opt', 'max-size=1m',
            '--log-opt', 'max-file=2']
    environment = {
        'NODE_ENV': 'production', 'PORT': '8080',
        'CRAYS_CLUBS_CORE_BASE_URL': 'https://member.crays.world',
        'CRAYS_CLUBS_QLO_UPSTREAM': 'http://qlo-original-upstream',
        'CRAYS_CLUBS_B2B_START_URL': 'https://member.crays.world/en/clubs/operations',
        'CRAYS_CLUBS_TEAM_CONSUMER_TOKEN_FILE': '/run/crays/team-consumer-token',
        'CRAYS_CLUBS_QLO_PROVIDER_READ_KEY_FILE': '/run/crays/qlo-provider-read-webservice-key',
        'CRAYS_CLUBS_QLO_IMPORT_RECEIPT_FILE': '/run/crays/qlo-import-receipt.json',
        'NODE_EXTRA_CA_CERTS': '/run/crays/tls37-root.crt',
    }
    for key, value in environment.items():
        args += ['--env', key + '=' + value]
    for name in ['team-consumer-token', 'qlo-provider-read-webservice-key', 'qlo-import-receipt.json']:
        source = READ_KEY if name == 'qlo-provider-read-webservice-key' else ROOT / 'gateway-originals19/bindings' / name
        args += ['--mount', 'type=bind,src=' + str(source)
                 + ',dst=/run/crays/' + name + ',readonly']
    args += ['--mount', 'type=bind,src=' + str(CA) + ',dst=/run/crays/tls37-root.crt,readonly', IMAGE]
    # Original image USER/ENTRYPOINT/CMD are intentionally inherited: protected
    # file loading as root, then original setgid/setuid before serving as node.
    return args


if __name__ == '__main__':
    raise SystemExit('SOURCE_ONLY_NOT_A_NATIVE_LAUNCHER')
