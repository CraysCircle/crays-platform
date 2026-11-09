import assert from'node:assert/strict';import fs from'node:fs/promises';import{constants as C}from'node:fs';
const ROOT='/var/lib/crays-personal-agents';
/** Existing host-authorized root only, never a caller-selected directory or a Root mkdir operation. */
export async function openRuntimeRoot(){
 assert(process.getuid()!==0,'NON_ROOT_RUNTIME_HOST_REQUIRED');const handle=await fs.open(ROOT,C.O_RDONLY|C.O_DIRECTORY|C.O_NOFOLLOW);try{const initial=await handle.stat();const assertCurrent=async()=>{const a=await fs.lstat(ROOT),b=await handle.stat();assert(a.isDirectory()&&!a.isSymbolicLink()&&a.uid===process.getuid()&&(a.mode&0o077)===0&&a.dev===initial.dev&&a.ino===initial.ino&&b.dev===initial.dev&&b.ino===initial.ino&&await fs.realpath(ROOT)===ROOT,'EXACT_HOST_GRANTED_RUNTIME_ROOT_REQUIRED');};await assertCurrent();return{handle,logicalRoot:ROOT,assertCurrent};}catch(e){await handle.close();throw e;}
}
