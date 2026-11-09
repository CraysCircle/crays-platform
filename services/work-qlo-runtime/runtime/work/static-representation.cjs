'use strict';
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const zlib=require('node:zlib');

// Only bytes from the existing immutable asset allowlist may reach this helper.
// Verify the original on every read, including compressed-cache hits.
function createStaticRepresentation({maxEntries=64,maxBytes=16*1024*1024}={}){
  const cache=new Map();let cachedBytes=0;
  function gzipAccepted(value){
    if(typeof value!=='string'||value.length>8192)return false;
    const encodings=new Map();
    for(const entry of value.split(',')){
      const parts=entry.trim().toLowerCase().split(';');const name=parts.shift().trim();
      if(!name)continue;
      let q=1;
      for(const parameter of parts){
        const match=/^\s*q\s*=\s*(0(?:\.\d{0,3})?|1(?:\.0{0,3})?)\s*$/.exec(parameter);
        if(!match){q=0;break;}q=Number(match[1]);
      }
      // Malformed duplicate exclusions must never turn gzip back on.
      encodings.set(name,Math.min(encodings.get(name)??1,q));
    }
    return (encodings.get('gzip')??encodings.get('*')??0)>0;
  }
  return function representation({bytes,expectedSHA256,type,acceptEncoding,range}){
    assert(Buffer.isBuffer(bytes));
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),expectedSHA256,'STATIC_ARTIFACT_DRIFT');
    const compressible=/^(?:application\/(?:javascript|json)|text\/(?:javascript|css)|image\/svg\+xml)(?:;|$)/.test(type);
    const eligible=compressible&&bytes.length>=1024&&bytes.length<=1024*1024&&!range;
    const headers={'content-type':type,'content-length':bytes.length};
    if(!eligible)return {bytes,headers};
    headers.vary='Accept-Encoding';
    if(!gzipAccepted(acceptEncoding))return {bytes,headers};
    let compressed=cache.get(expectedSHA256);
    if(compressed){cache.delete(expectedSHA256);cache.set(expectedSHA256,compressed);}
    else{
      compressed=zlib.gzipSync(bytes,{level:zlib.constants.Z_BEST_SPEED});
      if(compressed.length>=bytes.length)return {bytes,headers};
      if(maxEntries>0&&compressed.length<=maxBytes){
        while(cache.size&&(cache.size>=maxEntries||cachedBytes+compressed.length>maxBytes)){
          const oldest=cache.keys().next().value;cachedBytes-=cache.get(oldest).length;cache.delete(oldest);
        }
        cache.set(expectedSHA256,compressed);cachedBytes+=compressed.length;
      }
    }
    return {bytes:compressed,headers:{...headers,'content-encoding':'gzip','content-length':compressed.length}};
  };
}
module.exports={createStaticRepresentation};
