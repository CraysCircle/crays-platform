"""Pure original currentness policy derivative for reviewed source+container change.
Distinct from17 PID-only maintenance. Actual native Root facts required; no IO/proof forgery.
"""
import copy,hashlib,json,re
RELEASE='/srv/crays/releases/nostr-original-core-addon-20261108-18/'
OLD='0af175e4c5c2531fd463fbc572d456fcd722bd06dca8f754434f9cbbea0a2c07'
canon=lambda v:json.dumps(v,sort_keys=True,separators=(',',':')).encode()
sha=lambda b:hashlib.sha256(b).hexdigest()
def need(v,g):
 if not v:raise RuntimeError(g)
def derive(public,owner,policy,start,*,actual_common,sdk,sdk_process,boot_id,qualified_public_addons,qualified_policy_addons,actual_anchor=None,expected_anchor_id=None):
 need(public['common']['id']==policy['coreContainer']['id']==OLD,'EXACT_LIVE17_PREDECESSOR_REQUIRED');newid=actual_common['id'];need(re.fullmatch('[a-f0-9]{64}',newid)is not None and newid!=OLD,'ACTUAL_NEW_COMMON_ID_REQUIRED');need(actual_common['image']==public['common']['image'],'ORIGINAL_COMMON_IMAGE_UNCHANGED')
 if actual_anchor is None:
  need(actual_common['networkNamespaceInode']==policy['coreContainer']['networkNamespaceInode'],'ORIGINAL_IMAGE_AND_ANCHOR_NETNS_UNCHANGED')
 else:
  need(set(actual_anchor)=={'id','process','appEndpointSHA256','networkNamespaceInode'}and re.fullmatch('[a-f0-9]{64}',expected_anchor_id or '')is not None and actual_anchor['id']==expected_anchor_id and expected_anchor_id!='0fa6bba9af8e7bb592e72b86afddf0d5702d892e72c5f62f6f415f735886872f'and actual_anchor['id']!=public['common']['namespaceAnchor']['id'],'EXACT_OWNED_NEW_MEMBER26_ANCHOR')
  need(type(actual_anchor['networkNamespaceInode'])is int and actual_anchor['networkNamespaceInode']>0 and actual_common['networkNamespaceInode']==actual_anchor['networkNamespaceInode'],'ACTUAL_NEW_MEMBER_COMMON_NETNS_EQUAL')
  nap=actual_anchor['process'];oap=public['common']['namespaceAnchor']['process']
  need({k:v for k,v in nap.items()if k not in ['pid','startTicks','cgroup']}=={k:v for k,v in oap.items()if k not in ['pid','startTicks','cgroup']}and nap['uid']==1000 and nap['pid']>0 and nap['pid']!=oap['pid']and actual_anchor['id']in nap['cgroup']and re.fullmatch('[a-f0-9]{64}',actual_anchor['appEndpointSHA256'])is not None,'EXACT_NEW_MEMBER_ORIGINAL_SECURITY_AND_ENDPOINT_PROJECTION')
 cp=actual_common['process'];oldcp=public['common']['process']
 need({k:v for k,v in cp.items()if k not in ['pid','startTicks','cgroup']}=={k:v for k,v in oldcp.items()if k not in ['pid','startTicks','cgroup']}and cp['uid']==1000 and newid in cp['cgroup']and OLD in oldcp['cgroup']and cp['pid']!=oldcp['pid'],'NEW_ORIGINAL_SECURITY_IDENTICAL_COMMON_PROCESS_REQUIRED')
 need({k:v for k,v in sdk_process.items()if k not in ['pid','startTicks']}=={k:v for k,v in public['sdk']['process'].items()if k not in ['pid','startTicks']}and sdk_process['uid']==61304 and sdk['pid']==sdk_process['pid']and sdk['unit']==policy['sdkService']['unit']and sdk['invocationId']!=policy['sdkService']['invocationId'],'ACTUAL_NEW_ORIGINAL_SDK_MANAGER_REQUIRED')
 need(isinstance(boot_id,str)and boot_id!=owner['gatewayBootId']and type(actual_common['pidNamespaceInode'])is int and actual_common['pidNamespaceInode']>0,'ACTUAL_NEW_BOOT_AND_COMMON_PIDNS_REQUIRED')
 need(isinstance(qualified_public_addons,list)and 1<=len(qualified_public_addons)<=48,'FINITE_REVIEWED_IMMUTABLE_NEW_SOURCE_CLOSURE_REQUIRED');seen=set()
 for r in qualified_public_addons:
  need(set(r)=={'path','sha256','bytes'}and r['path'].startswith(RELEASE)and'..'not in r['path'].split('/')and r['path']not in seen and re.fullmatch('[a-f0-9]{64}',r['sha256'])is not None and type(r['bytes'])is int and 0<r['bytes']<=16777216,'EXACT_PUBLIC_SOURCE_FILE_ADMISSION');seen.add(r['path'])
 wp=copy.deepcopy(public);wp['common']['id']=newid;wp['common']['process']=copy.deepcopy(cp)
 if actual_anchor is not None:wp['common']['namespaceAnchor']={k:copy.deepcopy(actual_anchor[k])for k in ['id','process','appEndpointSHA256']}
 for name in ['configSHA256','hostConfigSHA256','mountsSHA256']:
  need(re.fullmatch('[a-f0-9]{64}',actual_common[name])is not None,'ACTUAL_NEW_CONTAINER_FINGERPRINT_REQUIRED');wp['common'][name]=actual_common[name]
 # predecessorId stays source-qualified historical8ab...; do not rewrite witness contract.
 wp['sdk'].update(invocationId=sdk['invocationId'],startedMonotonicUSec=sdk['startedMonotonicUSec'],process=copy.deepcopy(sdk_process));need(not seen.intersection(r['path']for r in wp['publicSourceFiles']),'NEW_SOURCE_PATH_COLLISION_RECONCILE');wp['publicSourceFiles']+=copy.deepcopy(qualified_public_addons);need(len(wp['publicSourceFiles'])<=64 and sum(r['bytes']for r in wp['publicSourceFiles'])<=32*1024*1024,'ORIGINAL_WITNESS_64_FILES32M_BOUND_REQUIRED')
 ow=copy.deepcopy(owner);ow['ownerServiceInvocation']=sdk['invocationId'];ow['gatewayBootId']=boot_id
 po=copy.deepcopy(policy);po['sdkService']=copy.deepcopy(sdk);po['coreContainer'].update(id=newid,hostPid=cp['pid'],hostStartTicks=cp['startTicks'],pidNamespaceInode=actual_common['pidNamespaceInode'],networkNamespaceInode=actual_common['networkNamespaceInode']);need(isinstance(qualified_policy_addons,list)and len(qualified_policy_addons)==25 and len(qualified_public_addons)==28 and all(r in qualified_public_addons for r in qualified_policy_addons)and {r['path']for r in qualified_policy_addons}=={r['path']for r in qualified_public_addons if r['path']not in {RELEASE+'bin/nostr-native-registry',RELEASE+'runtime-core-adoption18-executable/refresh_scoped_sts16.candidate.py',RELEASE+'runtime-pool-s3-binding10-rev03/scoped-sts-lease10.candidate.py'}},'EXACT_COMMON_POLICY_SUBSET_REQUIRED');need(not {r['path']for r in qualified_policy_addons}.intersection(r['path']for r in po['sourceFiles']),'POLICY_NEW_SOURCE_PATH_COLLISION');po['sourceFiles'] +=[{k:r[k]for k in ['path','sha256']}for r in qualified_policy_addons];need(len(po['sourceFiles'])<=64,'ORIGINAL_POLICY_64_SOURCE_BOUND_REQUIRED');po['ownerPolicySHA256']=sha(canon(ow));po['witness']['policySHA256']=sha(canon(wp));po['endpointId']=sha(canon({'sdkInvocationId':sdk['invocationId'],'commonId':newid,'sourceScopeSHA256':sha(canon(ow['scope']))}));st=copy.deepcopy(start);st.update(pid=sdk['pid'],invocationId=sdk['invocationId'],policySHA256=sha(canon(po)))
 return {'PUBLIC_PROCESS_BINDING.root.json':canon(wp),'OWNER_BINDING.json':canon(ow),'DEPLOYMENT.json':canon(po),'START.json':canon(st)}
