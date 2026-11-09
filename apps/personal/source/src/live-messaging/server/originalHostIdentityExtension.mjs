import {createMessagingIdentitySessionReader,createMessagingIdentityHandler} from './currentIdentity.mjs';
const IDENTITY_PATH='/api/crays/personal/messaging/identity';
/** Called only inside the existing pinned original host process. Configuration
 * stays in that original process; this module neither reads private files nor
 * returns SDK/config/Core handles. This installs a public self-identity READ,
 * never a signer, private conversation grant or Nostr key creation service. */
export function createOriginalHostIdentityExtension({Auth0Client,configuration,core,assertRuntimeCurrent}){
 const sdkReader=createMessagingIdentitySessionReader({Auth0Client,configuration,assertConfigurationCurrent:assertRuntimeCurrent});
 const handle=createMessagingIdentityHandler({sdkReader,core,assertRuntimeCurrent});
 return Object.freeze({path:IDENTITY_PATH,handle});
}
/** Exactly one new Personal path precedes the existing original router. Every
 * other request, including Chuck/Member/Auth/Work, retains its original handler.
 * A failed identity extension can never fall through into Work authorization. */
export function composeOriginalHostIdentityRoute({originalHandle,identityExtension,assertRuntimeCurrent}){
 if(typeof originalHandle!=='function'||identityExtension?.path!==IDENTITY_PATH||typeof identityExtension.handle!=='function'||typeof assertRuntimeCurrent!=='function')throw Error('ORIGINAL_MESSAGING_IDENTITY_EXTENSION_REQUIRED');
 return async(request,response)=>{
  if(request.url!==IDENTITY_PATH)return originalHandle(request,response);
  try{assertRuntimeCurrent();const handled=await identityExtension.handle(request,response);if(handled!==true&&!response.writableEnded)throw Error('MESSAGING_IDENTITY_NOT_ADMITTED');}
  catch{if(response.destroyed||response.writableEnded)return;if(response.headersSent){response.destroy();return;}response.writeHead(503,{'Content-Type':'application/json','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'});response.end(JSON.stringify({error:'MESSAGING_IDENTITY_UNAVAILABLE'}));}
 };
}
