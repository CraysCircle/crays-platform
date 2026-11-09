"""Pure finite actual executable-source classification; no IO or runtime changes."""
from pathlib import PurePosixPath
RELEASE='/srv/crays/releases/nostr-original-core-addon-20261108-18/'
PACKAGING=frozenset(['.package/node-closure21.tar.gz','.package/NODE_CLOSURE_EXACT4166_FILES.json','runtime-core-adoption18-executable/project_exact14_credentials_to_common_ram.candidate.py','runtime-core-adoption18-executable/crays-nostr-native-registry16.service.candidate','runtime-core-adoption18-executable/crays-nostr-scoped-sts16.service.candidate','runtime-pool-s3-binding10-rev03/systemd-loadcredential-binding10.candidate.mjs'])
PROVIDER_PROCESS=frozenset(['bin/nostr-native-registry','runtime-core-adoption18-executable/refresh_scoped_sts16.candidate.py','runtime-pool-s3-binding10-rev03/scoped-sts-lease10.candidate.py'])
REGISTRY='common-machine57/MODULE_REGISTRY.member50.json'
def classify(files,registry):
 if len(files)!=33 or not PACKAGING<=set(files) or not PROVIDER_PROCESS<=set(files):raise RuntimeError('EXACT33_PACKAGE_CLASSIFICATION_REQUIRED')
 if set(registry)!={'path','sha256','bytes'} or registry['path']!=RELEASE+REGISTRY:raise RuntimeError('EXACT_GENERATED_REGISTRY_REQUIRED')
 witness=[{'path':RELEASE+n,'sha256':r['sha256'],'bytes':r['bytes']}for n,r in files.items()if n not in PACKAGING]+[registry]
 policy=[r for r in witness if r['path'][len(RELEASE):]not in PROVIDER_PROCESS]
 if len(witness)!=28 or len(policy)!=25:raise RuntimeError('EXACT28_WITNESS25_COMMON_CLOSURE_REQUIRED')
 if any(not r['path'].endswith(('.mjs','.cjs'))and r['path']!=RELEASE+REGISTRY for r in policy):raise RuntimeError('COMMON_JS_AND_REAL_REGISTRY_ONLY')
 return witness,policy
