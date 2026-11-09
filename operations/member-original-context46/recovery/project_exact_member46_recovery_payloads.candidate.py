"""Pure Member46 successor payloads; no Docker, filesystem, credentials or runtime calls."""
import copy,re
CURRENT={'member':'9e3bffe1affbfab8f880ceafc5f071223d0eb8232e5c1b05640495f9d9f6b4b0','common':'9fb959aa2c4a2ccf4bb2d2b71f422f11fbeea3c1ec5544b81d086fe74da33056','work':'db90b85630a333f0097a237f6d13f4bc882db656bb5c30a19d12f98b996b6371'}
RELEASE='/srv/crays/releases/member-original-context46-20261109-01'
CONFIG_KEYS={'Hostname','Domainname','User','AttachStdin','AttachStdout','AttachStderr','ExposedPorts','Tty','OpenStdin','StdinOnce','Env','Cmd','Healthcheck','ArgsEscaped','Image','Volumes','WorkingDir','Entrypoint','NetworkDisabled','MacAddress','OnBuild','Labels','StopSignal','StopTimeout','Shell'}
REGISTRY_GUEST='/srv/crays/runtime/common-canonical-20261106-01/MODULE_REGISTRY.json'
ENV_GUEST='/run/crays/member/environment.private.json'
PRINCIPAL_GUEST='/run/crays/member-code/nextcloud-original-member-document-principal.private.json'
def payload(existing,role,new_member_id=None):
 assert role in CURRENT and existing['Id']==CURRENT[role] and existing['State']['Running']
 original={m['Destination']:m for m in existing['Mounts']}
 assert len(original)==len(existing['Mounts'])
 cfg={k:copy.deepcopy(v) for k,v in existing['Config'].items() if k in CONFIG_KEYS}
 host=copy.deepcopy(existing['HostConfig']);changes={}
 if role=='member':
  assert len(original)==9 and all(m['Type']=='bind' and m['RW'] is False for m in original.values())
  assert original[ENV_GUEST]['Source']=='/srv/crays/private/member-nextcloud-consumer26/environment.private.json'
  assert original[PRINCIPAL_GUEST]['Source']=='/srv/crays/private/nextcloud-original-member-document-20261108-24/principal.private.json'
  changes={d:RELEASE+'/app'+d.removeprefix('/app') for d in ('/app/.next','/app/package.json','/app/server.js','/app/src')}
  changes['/run/crays/member-code']=RELEASE+'/member-code'
  changes[ENV_GUEST]='/srv/crays/private/member-original-context46-20261109-01/environment.private.json'
  assert all(original[d]['Source']==('/srv/crays/releases/member-provider-account42-20261109-01/app'+d.removeprefix('/app') if d.startswith('/app/') else '/srv/crays/releases/member-provider-account42-20261109-01/member-code') for d in changes if d!=ENV_GUEST)
 else:
  assert re.fullmatch('[a-f0-9]{64}',new_member_id or '') and new_member_id not in CURRENT.values()
  assert host['NetworkMode']=='container:'+CURRENT['member'] and not existing['NetworkSettings']['Networks'] and not host.get('PortBindings')
  host['NetworkMode']='container:'+new_member_id
  cfg.pop('Hostname',None);cfg.pop('Domainname',None)
  if role=='common':
   cfg.pop('ExposedPorts',None)
   assert original[REGISTRY_GUEST]['Source']=='/srv/crays/releases/nostr-original-core-addon-20261108-18/common-machine57/MODULE_REGISTRY.member42.json'
   changes[REGISTRY_GUEST]='/srv/crays/releases/nostr-original-core-addon-20261108-18/common-machine57/MODULE_REGISTRY.member46.json'
   commonGuest='/srv/crays/releases/common-canonical-20261106-01/common/common-host.cjs'
   assert original[commonGuest]['Source']=='/srv/crays/releases/nostr-original-core-addon-20261108-18/common-machine57/common-host.machine57.candidate.cjs'
   changes[commonGuest]='/srv/crays/releases/nostr-original-core-addon-20261108-18/common-machine57/common-host.main-context46.candidate.cjs'
 seen=set()
 for m in host.get('Mounts') or []:
  d=m.get('Target')
  if d in changes:
   assert m['Source']==original[d]['Source'] and d not in seen
   m['Source']=changes[d];seen.add(d)
 binds=[]
 for b in host.get('Binds') or []:
  parts=b.split(':');assert len(parts) in (2,3)
  if parts[1] in changes:
   assert parts[0]==original[parts[1]]['Source'] and parts[1] not in seen
   parts[0]=changes[parts[1]];seen.add(parts[1])
  binds.append(':'.join(parts))
 if host.get('Binds') is not None:host['Binds']=binds
 assert seen==set(changes)
 expected={d:(changes.get(d,m['Source']),m['RW'],m['Type']) for d,m in original.items()}
 if role=='member':
  target='/run/crays-bindings/acceptance';source='/srv/crays/runtime/work-rds-five-purpose-20261107-17/database-bindings'
  assert target not in original and target not in expected
  assert host.get('Binds') is None and isinstance(host.get('Mounts'),list) and len(host['Mounts'])==9
  host['Mounts'].append({'Type':'bind','Source':source,'Target':target,'ReadOnly':True});expected[target]=(source,False,'bind')
 assert cfg.get('Env')==existing['Config'].get('Env') and cfg.get('Cmd')==existing['Config'].get('Cmd') and cfg.get('Entrypoint')==existing['Config'].get('Entrypoint')
 return {**cfg,'HostConfig':host},expected
def endpoints(member):
 assert member['Id']==CURRENT['member'] and member['State']['Running']
 result={}
 for name,e in member['NetworkSettings']['Networks'].items():
  assert e.get('NetworkID') and e.get('IPAddress')
  v={'IPAMConfig':{'IPv4Address':e['IPAddress']},'Aliases':[a for a in (e.get('Aliases') or []) if a not in (member['Id'],member['Id'][:12])],'GwPriority':e.get('GwPriority',0)}
  if e.get('GlobalIPv6Address'):v['IPAMConfig']['IPv6Address']=e['GlobalIPv6Address']
  if e.get('DriverOpts'):v['DriverOpts']=copy.deepcopy(e['DriverOpts'])
  result[name]=v
 assert len(result)==5 and result['crays-nextcloud-independent-services-20261108-15']['IPAMConfig']['IPv4Address']=='172.30.15.7' and result['crays-nextcloud-independent-services-20261108-15']['GwPriority']==-1
 return result
def registry(original,new_build_id):
 assert isinstance(new_build_id,str) and re.fullmatch('[A-Za-z0-9_-]{1,100}',new_build_id) and new_build_id!='9P8oRXhXtamVob92nSls-' and original.get('schema')=='crays.unified-platform.runtime.v1' and original.get('origin')=='https://member.crays.world'
 assert original['member']['root']=='/srv/crays/releases/member-provider-account42-20261109-01/app' and original['member']['buildId']=='9P8oRXhXtamVob92nSls-'
 out=copy.deepcopy(original);out['member'].update(root=RELEASE+'/app',buildId=new_build_id)
 return out
