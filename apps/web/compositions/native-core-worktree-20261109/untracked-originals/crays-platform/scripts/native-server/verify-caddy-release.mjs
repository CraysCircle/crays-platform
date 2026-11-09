// Verify the original release checksum signature with the already installed
// original Sigstore verifier, including its default CT/Rekor thresholds and
// independently refreshed TUF trust. No home-grown signature/trust verifier.
import {createRequire} from 'node:module';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash,X509Certificate} from 'node:crypto';
const original='/opt/crays/openclaw/dependency-artifacts/sdk4-complete/2badb63c9d2ed692a4d2d71c63e1d96ac7453a9c5519348a8dc5a001d611afbb/node_modules/npm/node_modules/';
const require=createRequire(import.meta.url),{verify}=require(original+'sigstore');
const directory=new URL('../../../.task-work/native-owner-consumer-20261025/caddy-2.11.7/',import.meta.url);
const bytes=await readFile(new URL('checksums.txt',directory));
const cert=new X509Certificate(await readFile(new URL('signer.pem',directory)));
const signature=(await readFile(new URL('checksums.txt.sig',directory),'utf8')).trim();
const entries=JSON.parse(await readFile(new URL('REKOR_ENTRIES.json',directory),'utf8'));
if(entries.length!==1)throw Error('EXACT_RELEASE_LOG_ENTRY_REQUIRED');
const entry=Object.values(entries[0])[0];
const bundle={mediaType:'application/vnd.dev.sigstore.bundle+json;version=0.1',messageSignature:{messageDigest:{algorithm:'SHA2_256',digest:createHash('sha256').update(bytes).digest('base64')},signature},verificationMaterial:{x509CertificateChain:{certificates:[{rawBytes:cert.raw.toString('base64')}]},tlogEntries:[{logIndex:String(entry.logIndex),logId:{keyId:Buffer.from(entry.logID,'hex').toString('base64')},kindVersion:{kind:'hashedrekord',version:'0.0.1'},integratedTime:String(entry.integratedTime),inclusionPromise:{signedEntryTimestamp:entry.verification.signedEntryTimestamp},canonicalizedBody:entry.body}]}};
const options={certificateIdentityURI:'https://github.com/caddyserver/caddy/.github/workflows/release.yml@refs/tags/v2.11.7',certificateIssuer:'https://token.actions.githubusercontent.com',tufCachePath:new URL('tuf-cache/',directory).pathname,timeout:15000,retry:1};
await verify(bundle,bytes,options);
const checksum=bytes.toString().split('\n').find(x=>x.endsWith('  caddy_2.11.7_linux_amd64.tar.gz'))?.split(/\s+/)[0];
const source=JSON.parse(await readFile(new URL('SOURCE.json',directory),'utf8'));
if(checksum!==source.officialArchiveSha512||createHash('sha256').update(await readFile(new URL('caddy',directory))).digest('hex')!=='678ade3bfc088749c81a681adc603333ee0bb023b6a6cfe3c0f58bef8ff854e9')throw Error('EXACT_ORIGINAL_RELEASE_BINARY_REQUIRED');
let tamperDenied=false;try{await verify(bundle,Buffer.concat([bytes,Buffer.from('changed')]),options);}catch{tamperDenied=true;}
if(!tamperDenied)throw Error('TAMPERED_RELEASE_ACCEPTED');
const result={schema:'crays.native.caddy-release-signature.v1',status:'ORIGINAL_SIGSTORE_RELEASE_CHECKSUM_SIGNATURE_VERIFIED',at:new Date().toISOString(),certificateIdentityURI:options.certificateIdentityURI,certificateIssuer:options.certificateIssuer,defaultCtAndRekorThresholdsRetained:true,rekorLogIndex:String(entry.logIndex),tamperedChecksumDenied:true,archiveSha512PreviouslyVerified:checksum,binarySha256:source.binarySha256,sigstoreVersion:require(original+'sigstore/package.json').version,actualPublicTls:false};
await writeFile(new URL('ACTUAL_SIGNATURE_RESULT.json',directory),JSON.stringify(result,null,2)+'\n',{mode:0o600,flag:'wx'});
console.log(JSON.stringify(result));
