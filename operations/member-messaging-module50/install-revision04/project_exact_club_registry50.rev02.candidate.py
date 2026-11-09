"""Pure exact current48 descriptor projection. No IO or rights changes."""
import copy,json,hashlib,re
CURRENT_SHA='bcfb4326aeff9102a31c326204f28d85854c0292bac17f99498ef46872aea321'
BASE_VERSION='club-member-7e7915d4e15c66b1'
HISTORY_ROOT='/srv/crays/releases/common-canonical-20261106-01/member-history/'+BASE_VERSION+'/dist'
def need(v,g):
 if not v:raise RuntimeError(g)
def project(original,manifest,manifest_path,manifest_sha,root):
 need(hashlib.sha256(original).hexdigest()==CURRENT_SHA,'EXACT_CURRENT48_REGISTRY')
 a=json.loads(original);out=copy.deepcopy(a);club=a['clubMember'];files=manifest['files'];version=manifest['version']
 need(club['version']==BASE_VERSION and len(club['files'])==48,'EXACT_CURRENT35_MODULE')
 need(manifest['baseVersion']==BASE_VERSION and re.fullmatch('club-member-[a-f0-9]{16}',version) and version!='club-member-7e7915d4e15c66b1' and version=='club-member-'+manifest['sourceClosureSha256'][:16],'REAL_NEW50_MODULE_VERSION')
 need(type(files)is dict and len(files)==48,'EXACT48_BUILD_ARTIFACTS')
 for n,h in files.items():need(n and not n.startswith('/') and '..'not in n.split('/') and re.fullmatch('[a-f0-9]{64}',h),'SAFE_ARTIFACT_ROW')
 retained=copy.deepcopy(club.get('retainedVersions',[]));need(not any(z['version']in(BASE_VERSION,version)for z in retained),'NO_DUPLICATE_HISTORY')
 retained.append({'root':HISTORY_ROOT,'version':club['version'],'files':copy.deepcopy(club['files'])})
 out['clubMember'].update(root=root,version=version,files=copy.deepcopy(files),manifest=manifest_path,manifestSha256=manifest_sha,retainedVersions=retained)
 need({k:v for k,v in out.items()if k!='clubMember'}=={k:v for k,v in a.items()if k!='clubMember'},'EVERY_CURRENT_PERSONAL_GYM_WORK_MEMBER_ROW_UNCHANGED')
 return (json.dumps(out,sort_keys=True,indent=2)+'\n').encode()
