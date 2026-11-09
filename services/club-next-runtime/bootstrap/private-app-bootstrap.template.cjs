"use strict";
// Root fills only the private projection digest in a PRIVATE runtime copy. No URL in this source.
const fs=require("node:fs"),crypto=require("node:crypto"),assert=require("node:assert/strict");
const key="CRAYS_CLUBS_PUBLIC_PRODUCTION_DATABASE_URL",file="/run/crays-club-public/environment.private.json";
const ca="/run/crays-club-public/rds-regional-ca.pem",expected="__ROOT_PRIVATE_PROJECTION_SHA256__";
assert(/^[a-f0-9]{64}$/.test(expected),"ROOT_PRIVATE_PIN_REQUIRED");
assert(process.getuid()===1000&&process.getgid()===1000,"EXACT_EXISTING_CLUB_USER_REQUIRED");
assert(process.env.NODE_EXTRA_CA_CERTS===ca,"RDS_CA_MUST_ALREADY_BE_PRESENT_AT_NODE_START");
assert.equal(crypto.createHash("sha256").update(fs.readFileSync(ca)).digest("hex"),"a2c1bf4e3775a038e1db2cf92f9792c94855f20c6e1a72ada7587cb29e242c6e","EXACT_QUALIFIED_PUBLIC_RDS_CA_REQUIRED");
assert(!Object.hasOwn(process.env,key),"PRIVATE_URL_MUST_NOT_BE_IN_DOCKER_ENV");
const fd=fs.openSync(file,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);let bytes;
try{const s=fs.fstatSync(fd);assert(s.isFile()&&s.uid===1000&&s.gid===1000&&(s.mode&511)===256&&s.nlink===1&&s.size<=8192,"EXACT_PRIVATE_PROJECTION_LEAF_REQUIRED");bytes=fs.readFileSync(fd);const t=fs.fstatSync(fd);assert(s.dev===t.dev&&s.ino===t.ino&&s.size===t.size&&s.mtimeMs===t.mtimeMs&&s.ctimeMs===t.ctimeMs,"PRIVATE_PROJECTION_CUSTODY_CHANGED");}finally{fs.closeSync(fd);}
assert.equal(crypto.createHash("sha256").update(bytes).digest("hex"),expected,"ROOT_PRIVATE_PROJECTION_PIN_CHANGED");
const env=JSON.parse(bytes);assert(Object.keys(env).length===1&&typeof env[key]==="string"&&env[key].length>0,"ONE_EXISTING_CLUB_PUBLIC_PURPOSE_REQUIRED");
process.env[key]=env[key];env[key]=null;bytes.fill(0);bytes=null;
