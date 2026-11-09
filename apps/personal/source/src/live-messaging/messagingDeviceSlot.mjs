const key='crays:messaging-device-publication-slot:v1';
const hex=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
/** One durable publication slot per actual local account/device store.
 * This random value is an MLS key-package address, never a new Nostr identity.
 * Existing private packages and groups are retained; this is not device pairing.
 */
export async function openMessagingDeviceSlot({store,locks,scope,isCurrent,crypto=globalThis.crypto}){
 if(!store?.getItem||!store.setItem||typeof locks?.request!=='function'||!hex(scope)||typeof isCurrent!=='function'||!crypto?.getRandomValues)throw Error('Current encrypted device storage required');
 const check=()=>{if(isCurrent()!==true)throw Error('Messaging device storage locked');};
 check();return locks.request('crays.messaging.device-slot:'+scope,async()=>{check();const saved=await store.getItem(key);check();if(saved!==null){if(!hex(saved))throw Error('Stored messaging device slot is invalid');return saved;}
  const bytes=crypto.getRandomValues(new Uint8Array(32));let slot;try{slot=Array.from(bytes,byte=>byte.toString(16).padStart(2,'0')).join('');}finally{bytes.fill(0);}check();await store.setItem(key,slot);check();return slot;
 });
}
