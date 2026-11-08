"""Offline three-way table/sequence digest classification; never connects or writes SQL."""
import argparse,datetime,hashlib,json,pathlib,re
SHA=re.compile(r'^[a-f0-9]{64}$')
def require(v,label):
 if not v:raise ValueError(label)
def validate(doc):
 require(doc.get('schema')=='crays.neon-rds.content-digest.v1','DIGEST_SCHEMA_REQUIRED')
 require(isinstance(doc.get('realm'),str) and doc['realm'],'EXACT_REALM_REQUIRED')
 require(SHA.fullmatch(doc.get('snapshotAuthoritySHA256','')),'SNAPSHOT_AUTHORITY_DIGEST_REQUIRED')
 require(isinstance(doc.get('objects'),dict),'OBJECT_MAP_REQUIRED')
 for k,v in doc['objects'].items():
  require(isinstance(k,str) and k and isinstance(v,dict),'EXACT_OBJECT_IDENTITY_REQUIRED')
  require(v.get('kind') in ('table','sequence'),'TABLE_OR_SEQUENCE_ONLY')
  require(SHA.fullmatch(v.get('contentSHA256','')),'CONTENT_DIGEST_REQUIRED')
  require(type(v.get('rows')) is int and v['rows']>=0 if v['kind']=='table' else v.get('rows') is None,'TABLE_ROW_COUNT_REQUIRED')
  require(set(v)=={'kind','contentSHA256','rows'},'UNKNOWN_OBJECT_FIELDS_REJECTED')
 return doc

def classify(base,source,target):
 base,source,target=map(validate,(base,source,target))
 require(base['realm']==source['realm']==target['realm'],'CROSS_REALM_COMPARISON_REJECTED')
 require(base['snapshotAuthoritySHA256']==source['snapshotAuthoritySHA256']==target['snapshotAuthoritySHA256'],'BASELINE_AUTHORITY_MISMATCH')
 results={};counts={k:0 for k in ['equal','source_changed_only','target_changed_only','conflict']}
 for key in sorted(base['objects'].keys()|source['objects'].keys()|target['objects'].keys()):
  b,s,t=(d['objects'].get(key) for d in (base,source,target))
  state='equal' if s==t else 'source_changed_only' if b==t else 'target_changed_only' if b==s else 'conflict'
  counts[state]+=1;results[key]={'state':state,'kind':(s or t or b)['kind'],'sourceMissing':s is None,'targetMissing':t is None,'automaticWriteApproved':False}
 return {'schema':'crays.neon-rds.delta-classification.v1','atUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'realm':base['realm'],'counts':counts,'objects':results,'equivalentContentAtSuppliedSnapshots':counts['equal']==len(results),'writerFenceOrSnapshotConsistencyProven':False,'RLSACLFunctionOrCustomerAcceptanceProven':False,'mutationApproved':False,'policy':'Source-only differences need reviewed bounded apply; target-only must be preserved/reconciled; concurrent divergent changes require key-level conflict review; no full restore over current target.'}
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('baseline',type=pathlib.Path);p.add_argument('source',type=pathlib.Path);p.add_argument('target',type=pathlib.Path);p.add_argument('output',type=pathlib.Path);a=p.parse_args()
 result=classify(*(json.loads(x.read_text()) for x in [a.baseline,a.source,a.target]));result['inputFileSHA256']={k:hashlib.sha256(v.read_bytes()).hexdigest() for k,v in [('baseline',a.baseline),('source',a.source),('target',a.target)]}
 with a.output.open('x') as f:json.dump(result,f,indent=2);f.write('\n')
 print(json.dumps({'counts':result['counts'],'mutationApproved':False}))
