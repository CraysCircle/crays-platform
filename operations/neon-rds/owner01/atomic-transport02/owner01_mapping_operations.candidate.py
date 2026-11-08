"""Exact one-DB SQL/phase acknowledgements, private postimage and no automatic retry."""
from pathlib import Path
import json,hashlib,os,subprocess,re
ROOT=Path(__file__).resolve().parent
OUT=Path('/srv/crays/acceptance/neon-rds-owner01-atomic-mapping-20261108-01')
DB='crays_dev_3abc00b5a673'
def inputs():return {}
def private_file(path,data):
 fd=os.open(path,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o600)
 with os.fdopen(fd,'wb')as f:f.write(data);f.flush();os.fsync(f.fileno())
def run(cid,job,endpoint):
 assert endpoint==json.loads((ROOT/'native-binding.json').read_text())['endpoint']=='crays-prod-postgres-20261106-01.cpewggqg89tp.eu-central-2.rds.amazonaws.com'
 binding=json.loads((ROOT/'SOURCE_BINDING.json').read_bytes());assert binding['targetDatabase']==DB
 sql=(ROOT/'atomic_owner_mapping.candidate.sql').read_bytes();assert hashlib.sha256(sql).hexdigest()==binding['sqlSHA256']and sql.startswith(b'BEGIN READ WRITE;')and sql.rstrip().endswith(b"SELECT 'OWNER01_COMMIT_ACKNOWLEDGED';")
 post=binding['postReadOnlyQuery'].strip().removesuffix(';');assert post.startswith('WITH original AS (')
 script=sql+("\nBEGIN READ ONLY; SET LOCAL statement_timeout='45s'; SET LOCAL lock_timeout='5s'; SET LOCAL search_path=pg_catalog;\n"+post+';\nROLLBACK;\n').encode()
 OUT.mkdir(mode=0o700)
 try:p=subprocess.run(['/usr/bin/docker','exec','-i',cid,'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-v','VERBOSITY=sqlstate','-h',endpoint,'-p','5432','-U','crays_rds_admin','-d',DB],input=script,capture_output=True,timeout=190)
 except subprocess.TimeoutExpired as e:
  raw=e.stdout or b'';private_file(OUT/'TIMEOUT_ACKNOWLEDGEMENT_ACTUAL.json',json.dumps(dict(outcome='UNCERTAIN_INSPECT_SAME_INTENT_NO_REPLAY',commitAcknowledged=b'OWNER01_COMMIT_ACKNOWLEDGED'in raw,stdoutSHA256=hashlib.sha256(raw).hexdigest())).encode());raise RuntimeError('OWNER01_TIMEOUT_INSPECT_SAME_INTENT_NO_REPLAY')from None
 lines=p.stdout.decode().splitlines();acks=[line for line in lines if line.startswith('OWNER01_')]
 ack=dict(exitCode=p.returncode,phaseAcknowledgements=acks,commitAcknowledged='OWNER01_COMMIT_ACKNOWLEDGED'in acks,stderrSHA256=hashlib.sha256(p.stderr).hexdigest(),sqlStateCodes=re.findall(r'\b(?:ERROR|FATAL):\s+([0-9A-Z]{5})\b',p.stderr.decode(errors='replace')),automaticReplayAllowed=False)
 private_file(OUT/'SQL_EXECUTION_ACKNOWLEDGEMENTS_ACTUAL.json',json.dumps(ack,separators=(',',':')).encode())
 assert p.returncode==0 and acks==binding['requiredPhaseAcknowledgements'],'OWNER01_NATIVE_PHASE_FAILED_INSPECT_SAME_INTENT_NO_REPLAY'
 values=[line for line in lines if line.startswith('{')];assert len(values)==1
 metadata=json.loads(values[0]);raw=json.dumps(metadata,separators=(',',':')).encode();assert len(raw)<524288
 # Retain exact postimage even if a post-commit guard fails; never rerun SQL.
 private_file(OUT/'POST_COMMIT_OWNER_METADATA_ACTUAL.private.json',raw)
 assert metadata['database']==DB and metadata['actor']=='crays_rds_admin'and metadata['transactionReadOnly']=='on'
 assert metadata['originalMetadata']==binding['expectedOriginalPostMetadata'],'OWNER01_POST_COMMIT_ORIGINAL_METADATA_CHANGED_INSPECT_RETAINED_STATE'
 policies=metadata['newOwnerPolicies'];assert len(policies)==293
 assert sorted((r['schema'],r['table'])for r in policies)==sorted((r['schema'],r['table'])for r in binding['expectedOwnerPolicyKeys'])
 assert all(r['name']=='crays_rds_original_owner_bypass_v1'and r['permissive']is True and r['command']=='*'and r['roles']==['neondb_owner']and r['using']==r['check']for r in policies)
 assert len({r['using']for r in policies})==1 and len(metadata['newCreatorDefaults'])==9
 return dict(status='OWNER01_ATOMIC_OWNER_COMPATIBILITY_COMMITTED_AND_GUARDS_PASSED',database=DB,commitAcknowledged=True,phaseAcknowledgements=acks,source306OwnerCountsPassed=True,original257PoliciesPreserved=True,exact293OwnerPoliciesAdded=True,original40FunctionsUnchanged=True,original81SequencesUnchanged=True,originalGlobalRolesMembershipsPasswordsUnchanged=True,originalDefaultACLsAndGrantOptionsPreserved=True,exactNineMinimalCreatorDefaultACLRows=True,allSyntheticFixturesRolledBack=True,originalTwoBoundTriggerDenialsPassed=True,ordinaryConnectUnchanged=True,privatePostMetadataSHA256=hashlib.sha256(raw).hexdigest(),privatePostMetadataBytes=len(raw),postMetadata=metadata,originalDataRestoredAgain=False,sourceBusinessRowsMutated=False,consumerActivationApproved=False,finalDeltaApproved=False,authenticatedCustomerApproved=False,automaticReplayAllowed=False)
