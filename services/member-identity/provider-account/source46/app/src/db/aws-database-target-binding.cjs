'use strict';
// Exact existing AWS databases and restricted roles. No password or URI lives here.
const fs=require('node:fs'),path=require('node:path');
const {createHash,X509Certificate}=require('node:crypto');
const WORK_CA='a2c1bf4e3775a038e1db2cf92f9792c94855f20c6e1a72ada7587cb29e242c6e';
const MEMBER_CA='a2c1bf4e3775a038e1db2cf92f9792c94855f20c6e1a72ada7587cb29e242c6e';
const TARGETS=Object.freeze({
 coreIdentity:{hostname:'crays-prod-postgres-20261106-01.cpewggqg89tp.eu-central-2.rds.amazonaws.com',database:'crays_forest_city_main_test_20260925',role:'crays_core_identity_rpc_runtime_v1',port:5432,tlsCaSHA256:WORK_CA},
 clubProperty:{hostname:'crays-prod-postgres-20261106-01.cpewggqg89tp.eu-central-2.rds.amazonaws.com',database:'crays_forest_city_main_test_20260925',role:'crays_club_property_reader_test_v1',port:5432,tlsCaSHA256:WORK_CA},
 originalMember:{hostname:'crays-prod-postgres-20261106-01.cpewggqg89tp.eu-central-2.rds.amazonaws.com',database:'member_core_01a11155_20261011',role:'crays_core_member_identity_rpc_runtime_v3',port:5432,tlsCaSHA256:MEMBER_CA},
 // Exact existing AWS Scheduling and finite Finance targets; application acceptance remains required.
 scheduling:{hostname:'crays-prod-postgres-20261106-01.cpewggqg89tp.eu-central-2.rds.amazonaws.com',database:'crays_clubs_test_20260729',role:'crays_scheduling_runtime',port:5432,tlsCaSHA256:WORK_CA},
 financeContext:{hostname:'crays-prod-postgres-20261106-01.cpewggqg89tp.eu-central-2.rds.amazonaws.com',database:'crays_forest_city_main_test_20260925',role:'crays_aws_finance_context_runtime_v1',port:5432,tlsCaSHA256:WORK_CA},
});
function invalid(){throw Error('INVALID_AWS_DATABASE_TARGET_BINDING');}
function requireValue(ok){if(!ok)invalid();}
function exactKeys(value,keys){requireValue(value&&typeof value==='object'&&!Array.isArray(value));requireValue(Object.keys(value).sort().join('|')===[...keys].sort().join('|'));}
function readImmutableRootFile(filename,maxBytes){
 const fd=fs.openSync(filename,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);
 try{const st=fs.fstatSync(fd);requireValue(st.isFile()&&st.uid===0&&st.nlink===1&&(st.mode&0o022)===0&&st.size>0&&st.size<=maxBytes);const bytes=fs.readFileSync(fd);requireValue(bytes.length===st.size);return bytes;}finally{fs.closeSync(fd);}
}
function verifyParents(directory){for(const item of ['/run','/run/crays-bindings',directory]){const st=fs.lstatSync(item);requireValue(st.isDirectory()&&!st.isSymbolicLink()&&st.uid===0&&(st.mode&0o022)===0);}}
function getAwsDatabaseTargetBinding(env,purpose){
 const mode=env.CRAYS_RUNTIME_DEPLOYMENT_ENV,manifestPath=env.CRAYS_AWS_DB_TARGET_BINDINGS_FILE,expectedHash=env.CRAYS_AWS_DB_TARGET_BINDINGS_SHA256;
 if(mode===undefined&&manifestPath===undefined&&expectedHash===undefined)return null;
 try{
  requireValue(mode==='aws-prod'||mode==='aws-acceptance');requireValue(Object.hasOwn(TARGETS,purpose));
  const environment=mode==='aws-prod'?'prod':'acceptance',directory=`/run/crays-bindings/${environment}`;
  requireValue(manifestPath===`${directory}/work-db-targets.json`);requireValue(typeof expectedHash==='string'&&/^[a-f0-9]{64}$/.test(expectedHash));verifyParents(directory);
  const raw=readImmutableRootFile(manifestPath,16384);requireValue(createHash('sha256').update(raw).digest('hex')===expectedHash);const doc=JSON.parse(raw.toString('utf8'));
  exactKeys(doc,['schema','account','region','environment','bindings']);requireValue(doc.schema==='crays.aws-work-db-targets.v4'&&doc.account==='391674093840'&&doc.region==='eu-central-2'&&doc.environment===environment);exactKeys(doc.bindings,Object.keys(TARGETS));
  for(const[name,target]of Object.entries(TARGETS)){
   const binding=doc.bindings[name];if(target===null){requireValue(binding===null);continue;}
   exactKeys(binding,Object.keys(target));for(const[key,value]of Object.entries(target))requireValue(binding[key]===value);
  }
  const binding=doc.bindings[purpose];requireValue(binding!==null);
  const bytes=readImmutableRootFile(path.join(directory,`${purpose}-ca.pem`),32768);requireValue(createHash('sha256').update(bytes).digest('hex')===binding.tlsCaSHA256);
  const ca=bytes.toString('utf8');const certificates=ca.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g)||[];requireValue(certificates.length===3&&!ca.includes('PRIVATE KEY'));for(const pem of certificates){const cert=new X509Certificate(pem);requireValue(cert.ca===true&&Date.now()>=Date.parse(cert.validFrom)&&Date.now()<Date.parse(cert.validTo));}
  return Object.freeze({hostname:binding.hostname,database:binding.database,role:binding.role,port:binding.port,ca});
 }catch{invalid();}
}
module.exports={getAwsDatabaseTargetBinding};
