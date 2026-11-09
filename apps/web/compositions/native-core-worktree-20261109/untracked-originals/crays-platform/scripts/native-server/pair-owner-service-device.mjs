// Run only by the owning operator in the already-running owner's mount namespace
// and service UID. No phone/WhatsApp pairing, shared-token read or SDK restart.
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const sdk='/opt/crays/openclaw/dependency-artifacts/sdk4-complete/2badb63c9d2ed692a4d2d71c63e1d96ac7453a9c5519348a8dc5a001d611afbb/node_modules/openclaw/dist/';
const state='/run/crays-owner-tools-whatsapp-live/state';
const scopes=['operator.sessions.read','operator.sessions.write'];
let line='';for await(const c of process.stdin){line+=c;if(Buffer.byteLength(line)>8192)throw Error('INPUT_LIMIT');if(line.includes('\n'))break;}
const input=JSON.parse(line);
if(Object.keys(input).sort().join(',')!=='deviceId,publicKey,sourceApprovalSha256'||!/^[a-f0-9]{64}$/.test(input.deviceId)||!/^[a-f0-9]{64}$/.test(input.sourceApprovalSha256)||!/^[A-Za-z0-9_-]{43}$/.test(input.publicKey)||createHash('sha256').update(Buffer.from(input.publicKey,'base64url')).digest('hex')!==input.deviceId)throw Error('EXACT_SERVICE_DEVICE_REQUIRED');
const config=JSON.parse(await readFile('/run/crays-owner-tools-whatsapp-live/PRIVATE_GATEWAY_CONFIG.json','utf8'));
if(config.gateway?.auth?.mode!=='token'||config.gateway?.bind!=='loopback'||!Object.hasOwn(config.agents?.entries??{},'crays-agent-thorben'))throw Error('EXISTING_OWNER_HOST_REQUIRED');
const pair=await import(sdk+'device-pairing-Drmq_Czv.mjs'),approval=await import(sdk+'device-pairing-approval-DyoNg7Fe.mjs');
if(await pair.t(input.deviceId,state))throw Error('EXISTING_DEVICE_REQUIRES_SEPARATE_RECONCILIATION');
const pending=await pair.u({deviceId:input.deviceId,publicKey:input.publicKey,displayName:'CRAYS native Core consumer',platform:'linux',clientId:'gateway-client',clientMode:'backend',role:'operator',scopes},state);
if(!pending.request?.requestId)throw Error('ORIGINAL_PAIRING_REQUEST_REQUIRED');
const approved=await approval.n(pending.request.requestId,{callerScopes:scopes,isApprovalCurrent:({pending})=>pending.deviceId===input.deviceId&&pending.scopes?.length===scopes.length&&scopes.every(s=>pending.scopes.includes(s))},state);
if(approved?.status!=='approved')throw Error('ORIGINAL_PAIRING_APPROVAL_REQUIRED');
const held=await pair.t(input.deviceId,state),token=held?.tokens?.operator;
if(!token?.token||token.scopes?.length!==scopes.length||!scopes.every(s=>token.scopes.includes(s)))throw Error('EXACT_MINIMAL_DEVICE_TOKEN_REQUIRED');
// The fixed parent captures this pipe privately. Never run directly in a terminal.
process.stdout.write(JSON.stringify({deviceId:input.deviceId,token:token.token,scopes})+'\n');
