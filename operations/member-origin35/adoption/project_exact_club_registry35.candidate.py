"""Pure ClubMember35-only descriptor projection; no IO."""
import copy,json,hashlib,re
BASELINE_SHA='b0f083fe97b7a4cc2da1937a65ad9edcfa9babdd20b0b28462010f7514c2ae5a'
VERSION='club-member-7e7915d4e15c66b1'
BASE_VERSION='club-member-606b24d0f52dacf1'
MANIFEST='/srv/crays/migration-work/20261108/root/member-origin-binding35-build01/execution01/MODULE_MANIFEST.json'
MANIFEST_SHA='5dd49cd0773ffa89b9897614b44998a826b525896d8d45c926f6c349ca1cf54b'
ROOT='/srv/crays/acceptance/unified-static-20261105-01/artifacts/clubMember-origin35-7e7915d4e15c66b1/dist'
def need(v,g):
 if not v:raise RuntimeError(g)
def project_registry(original,manifest):
 need(hashlib.sha256(original).hexdigest()==BASELINE_SHA,'EXACT_CURRENT33_REGISTRY')
 a=json.loads(original);out=copy.deepcopy(a);club=a['clubMember']
 need(club['version']==BASE_VERSION and len(club['files'])==48,'EXACT_RETAINED606_BASE')
 need(manifest['version']==VERSION and manifest['baseVersion']==BASE_VERSION and manifest['sourceClosureSha256']=='7e7915d4e15c66b1cb3141c648670377929ec1971b94d8bf56f7f9f5e30d43df','EXACT_ORIGIN35_MANIFEST')
 files=manifest['files'];need(type(files)is dict and len(files)==48,'EXACT48_BUILD_ARTIFACTS')
 for n,h in files.items():need(n and not n.startswith('/') and '..'not in n.split('/') and re.fullmatch('[a-f0-9]{64}',h),'EXACT_SAFE_ARTIFACT_ROW')
 retained=copy.deepcopy(club.get('retainedVersions',[]))
 need(not any(r['version']in(BASE_VERSION,VERSION)for r in retained),'NO_DUPLICATE_RETAINED_VERSION')
 retained.append({k:copy.deepcopy(club[k])for k in ['root','version','files']})
 out['clubMember'].update(root=ROOT,version=VERSION,files=copy.deepcopy(files),manifest=MANIFEST,manifestSha256=MANIFEST_SHA,retainedVersions=retained)
 need({k:v for k,v in out.items()if k!='clubMember'}=={k:v for k,v in a.items()if k!='clubMember'},'ALL_PERSONAL33_WORK_MEMBER_AND_OTHER_ROWS_UNCHANGED')
 need(out['clubMember']['retainedVersions'][:-1]==club.get('retainedVersions',[]),'ALL_RETAINED_HISTORY_UNCHANGED')
 return (json.dumps(out,sort_keys=True,indent=2)+'\n').encode()
