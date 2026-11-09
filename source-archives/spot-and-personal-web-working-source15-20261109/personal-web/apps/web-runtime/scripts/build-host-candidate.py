"""Own bounded frontend build, using the existing XXL heavy-work lease protocol."""
from pathlib import Path
import contextlib, datetime, fcntl, json, os, subprocess, time, argparse

root = Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--current',action='store_true');parser.add_argument('--current-405c',action='store_true');parser.add_argument('--pagination',action='store_true');parser.add_argument('--media-widget',action='store_true');args=parser.parse_args()
app = root if args.media_widget else root / ('integration/pagination-host-candidate' if args.pagination else 'integration/current-host-405c-candidate' if args.current_405c else 'integration/current-host-candidate' if args.current else 'integration/host-candidate')
out = root / ('.qualification/media-widget-v04/build-r3' if args.media_widget else '.qualification/host-pagination-v04-r2/build' if args.pagination else '.qualification/host-current-405c-v03/build' if args.current_405c else '.qualification/host-current-v03/build' if args.current else '.qualification/host-production-v03/build')
out.mkdir(parents=True, exist_ok=True)
control = Path('/srv/crays/worktrees/club-manager-main-01a0d2f9/docs/main-control')
registry = control / 'growth-foundations-20261004/LEASES.json'
lease = ('PERSONAL-WEB-NOSTR-01a183ad-media-widget-v04-r3' if args.media_widget else 'PERSONAL-WEB-NOSTR-01a183ad-v04-r2' if args.pagination else 'PERSONAL-WEB-NOSTR-01a183ad-v03') + ('-current-405c' if args.current_405c else '-current' if args.current else '')
now = lambda: datetime.datetime.now(datetime.timezone.utc).isoformat()

def put(path, value):
    temporary = path.with_suffix(path.suffix + '.nostr-01a183ad.tmp')
    temporary.write_text(json.dumps(value, indent=2) + '\n')
    os.replace(temporary, path)

@contextlib.contextmanager
def locks():
    with contextlib.ExitStack() as stack:
        for path in [control / '.root-coordination.lock', Path(str(registry) + '.lock'), registry.parent / '.root-coordination.lock']:
            handle = stack.enter_context(path.open('a+'))
            fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
        yield

assert os.environ.get('INVOCATION_ID'), 'Run only in own bounded systemd build unit'
deadline = time.monotonic() + 90
while True:
    try:
        with locks():
            data = json.loads(registry.read_text())
            memory = int(next(line.split()[1] for line in Path('/proc/meminfo').read_text().splitlines() if line.startswith('MemAvailable:'))) * 1024
            if data.get('heavy') not in (None, [], {}) or data.get('heavyLease') is not None or memory < 3 * 1024**3:
                raise BlockingIOError()
            entry = {'ownerThreadId':'01a183ad-4854-7cb2-9518-ad67bf453db4', 'leaseId':lease,
                     'controllerPID':os.getpid(), 'controllerStartTicks':Path('/proc/self/stat').read_text().rsplit(')',1)[1].split()[19],
                     'issuedAt':now(), 'maximumSeconds':540, 'hardCapMiB':2048, 'cpu':2, 'nice':10,
                     'scope':'Own isolated current registered Personal frontend Nostr/profile public data integration build only; no Auth/Core/Member/Work/Gym changes or server publication'}
            data['heavy'] = [entry]; data['heavyLease'] = entry
            put(registry, data); put(out / 'BUILD_CLAIM.json', entry)
        break
    except BlockingIOError:
        if time.monotonic() > deadline:
            put(out / 'RESOURCE_WAIT_TERMINAL.json', {'at':now(), 'state':'NO_RESOURCE_CLAIM', 'noForeignLeaseChanged':True})
            raise SystemExit('NO_RESOURCE_CLAIM')
        time.sleep(2)

results = []
try:
    env = {**os.environ, 'PATH':'/opt/node-v22.18.0-linux-x64/bin:/usr/bin:/bin', 'NODE_ENV':'production', 'NODE_OPTIONS':'--max-old-space-size=1536'}
    stages=[('bundle',['node_modules/esbuild/bin/esbuild','.qualification/media-widget-v04/entry.tsx','--bundle','--format=esm','--platform=browser','--target=es2022','--jsx=automatic','--alias:react='+str(root/'node_modules/react'),'--alias:react-dom='+str(root/'node_modules/react-dom'),'--external:/assets/*','--external:/brand/*','--outfile=.qualification/media-widget-v04/app.js'])] if args.media_widget else [('typecheck',['node_modules/typescript/bin/tsc']), ('bundle',['node_modules/vite/bin/vite.js','build'])]
    for name, args in stages:
        with (out / (name + '.log')).open('w') as log:
            process = subprocess.run(['/opt/node-v22.18.0-linux-x64/bin/node', *args], cwd=app, env=env, stdout=log, stderr=subprocess.STDOUT, timeout=240)
        results.append({'stage':name, 'exitCode':process.returncode})
        if process.returncode:
            raise RuntimeError(name + ' failed')
finally:
    while True:
        try:
            with locks():
                data = json.loads(registry.read_text())
                assert data['heavyLease']['leaseId'] == lease
                assert data['heavyLease']['controllerPID'] == os.getpid()
                data['heavy'] = []; data['heavyLease'] = None; put(registry, data)
            break
        except BlockingIOError:
            time.sleep(.2)
    put(out / 'BUILD_RESULT.json', {'at':now(), 'results':results, 'matchingHeavyReturned':True, 'host8990Changed':False})
print(json.dumps(results), flush=True)
