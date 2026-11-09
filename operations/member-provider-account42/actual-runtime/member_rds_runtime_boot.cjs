'use strict';
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
try{
 const p='/run/crays/member/environment.private.json',s=fs.lstatSync(p);
 assert(s.isFile()&&!s.isSymbolicLink()&&s.uid===process.getuid()&&(s.mode&0o777)===0o600&&s.nlink===1&&s.size<65536);
 const env=JSON.parse(fs.readFileSync(p));
 for(const[k,v]of Object.entries(env)){assert(typeof v==='string'&&!v.includes('\0'));assert(!/^(?:PG|AWS_|VERCEL_)/.test(k));process.env[k]=v;}
 assert.equal(env.CRAYS_AWS_MEMBER_ORIGIN,'https://member.crays.world');assert.equal(env.PORT,'8991');assert.equal(env.HOSTNAME,'127.0.0.1');
 for(const[pkg,version]of Object.entries({'next':'16.2.10','react':'19.2.4','react-dom':'19.2.4','@auth0/nextjs-auth0':'4.24.0','pg':'8.22.0'}))assert.equal(JSON.parse(fs.readFileSync('/app/node_modules/'+pkg+'/package.json')).version,version);
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync('/run/crays/member-postgres-ca.crt')).digest('hex'),'a2c1bf4e3775a038e1db2cf92f9792c94855f20c6e1a72ada7587cb29e242c6e');
 assert.equal(fs.readFileSync('/app/.next/BUILD_ID','utf8').trim(),'9P8oRXhXtamVob92nSls-');
 require('/app/server.js');
}catch(e){process.stderr.write(JSON.stringify({status:'MEMBER_CANONICAL_BOOT_GUARD_FAILED',errorClass:e?.name||'Error',privateValuesPrinted:false})+'\n');process.exitCode=1;}
