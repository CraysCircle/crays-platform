// Exact additional Core-consumer device only. Original SDK backend operator
// scope, never operator.admin, customer identity substitution or phone linking.
import {createHash} from 'node:crypto';
const sdk='/opt/crays/openclaw/dependency-artifacts/sdk4-complete/2badb63c9d2ed692a4d2d71c63e1d96ac7453a9c5519348a8dc5a001d611afbb/node_modules/openclaw/dist/';
const state='/run/crays-owner-tools-whatsapp-live/state';
const expectedId='30e9c958fd3c11dbcf645c1415ccf3f58c868787b5f5eb49f851a3513663fc3d';
let input='';for await(const c of process.stdin){input+=c;if(Buffer.byteLength(input)>8192)throw Error('INPUT_LIMIT');if(input.includes('\n'))break;}
const request=JSON.parse(input);if(request.deviceId!==expectedId||createHash('sha256').update(Buffer.from(request.publicKey,'base64url')).digest('hex')!==expectedId)throw Error('EXACT_OWN_CORE_DEVICE_REQUIRED');
const pair=await import(sdk+'device-pairing-Drmq_Czv.mjs'),approval=await import(sdk+'device-pairing-approval-DyoNg7Fe.mjs');
const old=await pair.t(expectedId,state);if(!old||old.publicKey!==request.publicKey||old.tokens?.operator?.scopes?.join(',')!=='operator.sessions.read,operator.sessions.write')throw Error('EXACT_PRIOR_MINIMAL_DEVICE_REQUIRED');
const scopes=['operator.write'];
const pending=await pair.u({deviceId:expectedId,publicKey:request.publicKey,displayName:'CRAYS native Core consumer',platform:'linux',clientId:'gateway-client',clientMode:'backend',role:'operator',scopes},state);
const result=await approval.n(pending.request.requestId,{callerScopes:scopes,isApprovalCurrent:({pending})=>pending.deviceId===expectedId&&pending.scopes?.length===1&&pending.scopes[0]==='operator.write'},state);
if(result?.status!=='approved')throw Error('ORIGINAL_BACKEND_SCOPE_APPROVAL_REQUIRED');
const current=await pair.t(expectedId,state),token=current.tokens?.operator;
const allowed=new Set(['operator.write','operator.read','operator.sessions.read','operator.sessions.write']);
if(!token?.token||!token.scopes.includes('operator.write')||token.scopes.some(s=>!allowed.has(s)))throw Error('NON_ADMIN_SCOPE_CEILING_REQUIRED');
// Original approval retains earlier, now implied session scopes. The client
// requests only operator.write and verifies that exact hello grant.
process.stdout.write(JSON.stringify({deviceId:expectedId,token:token.token,scopes:token.scopes,requestedScopes:['operator.write']})+'\n');
