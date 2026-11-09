"use strict";
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const candidate=fs.readFileSync(__dirname+'/common-host.main-context46.candidate.cjs','utf8');
const contract=fs.readFileSync('/srv/crays/releases/common-canonical-20261106-01/common/common-host-contract.cjs','utf8');
const hctx={module:{exports:{}}};vm.runInNewContext(contract,hctx);const H=hctx.module.exports;
const start=candidate.indexOf('const projectOriginalMainSession46=');const end=candidate.indexOf('async function access(req,d)',start);assert(start>0&&end>start);
let response,calls=[];const ctx={getOriginal:async(req,port,url)=>{calls.push({port,url});return response;}};
vm.runInNewContext(candidate.slice(start,end)+';this.read=getOriginalMainSession46;',ctx);
const main='fixture-main-account',native='fixture-native-account';
const work={status:'current_original_account',application:'b2b',actorMode:'auth0',identityBinding:'issuer+subject+server-selected-client',accountId:main,workAdmitted:true};
const mapped=status=>({status:200,body:{status:'mapped',providerAuthenticated:true,accountMapped:true,provider:{contactVerified:true},session:{status:status==='blocked'?'blocked':'crays_mapped',account:{id:main,displayName:'Synthetic regression only',primaryContact:null,status}}}});
(async()=>{
 let checks=0;
 response=mapped('active');const projected=await ctx.read({}, {member:{port:8991}});assert.equal(projected.status,200);assert.equal(H.originalAccount(projected.body,'clubs'),main);assert.equal(projected.body.ownState,undefined);assert.equal(H.workAdmission(projected.body,work).admitted,true);checks++;
 assert.equal(calls.length,1);assert.equal(calls[0].port,8991);assert.equal(calls[0].url,'/api/crays/auth/provider/account');checks++;
 assert.equal(H.workAdmission(projected.body,{...work,accountId:native}).admitted,false);checks++;
 assert.equal(H.workAdmission(projected.body,{...work,workAdmitted:false}).admitted,false);checks++;
 assert.equal(H.workAdmission(projected.body,{...work,application:'clubs'}).admitted,false);checks++;
 for(const status of ['review','blocked']){response=mapped(status);const q=await ctx.read({}, {member:{port:8991}});assert.equal(q.status,403);assert.equal(H.workAdmission(q.body,work).admitted,false);checks++;}
 for(const r of [{status:200,body:{status:'no_provider_session'}},{status:409,body:{status:'provider_authenticated_unmapped'}},{status:503,body:{status:'core_unavailable'}}]){response=r;const q=await ctx.read({}, {member:{port:8991}});assert.equal(H.originalAccount(q.body,'clubs'),null);assert.equal(H.workAdmission(q.body,work).admitted,false);checks++;}
 const ownMismatch={...projected.body,ownState:{schema:'crays.clubs.member-own-state-rpc.v1',accountId:native,authorities:{authenticationReady:true}}};assert.equal(H.originalAccount(ownMismatch,'clubs'),null);checks++;
 assert.equal(candidate.split('getOriginalMainSession46(req,d)').length-1,4);assert.equal(candidate.includes('/api/crays/clubs/member/session?returnTo=%2Fen%2Faccount'),false);checks++;
 console.log(JSON.stringify({status:'PASS',checks,syntheticFixtures:true,actualHTTPRequests:0,actualSQLCalls:0,runtimeChanged:false}));
})().catch(()=>{console.log(JSON.stringify({status:'FAIL',privateValuesPrinted:false}));process.exitCode=1;});
