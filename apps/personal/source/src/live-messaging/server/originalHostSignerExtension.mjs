import {createOriginalHostIdentityExtension} from './originalHostIdentityExtension.mjs';
import {createMessagingSignerSessionReader} from './currentIdentity.mjs';
import {createCurrentSignerHttp} from './currentSignerHttp.mjs';
import {openExistingFileSigner} from './existingFileSigner.mjs';
import {authorizeCurrentCustodyOperation} from './currentCustodyPolicy.mjs';
const SIGNER_PATH='/api/crays/personal/messaging/signer';
const DESCRIPTOR='/srv/crays/dev-state/01a183ad-4854-7cb2-9518-ad67bf453db4/NOSTR_OWNER_BINDING.json';
/** Executed in the same original host/configuration. Opening custody is lazy:
 * anonymous/foreign/unverified accounts never open the credential reference.
 * The matching existing verified Core public key is mandatory.
 */
export function createOriginalHostSignerExtension(options){
 let custodyOpenAttempts=0;
 const identity=createOriginalHostIdentityExtension(options);
 const sdkReader=createMessagingSignerSessionReader({Auth0Client:options.Auth0Client,configuration:options.configuration,assertConfigurationCurrent:options.assertRuntimeCurrent});
 const operationAllowed=(binding,operation)=>authorizeCurrentCustodyOperation(binding,operation)||options.authorizeGroupRelayOperation?.(binding,operation)===true;
 const signer=createCurrentSignerHttp({sdkReader,core:options.core,assertRuntimeCurrent:options.assertRuntimeCurrent,openCustody:context=>{custodyOpenAttempts++;return openExistingFileSigner({descriptorPath:DESCRIPTOR,...context});},authorizeOperation:operationAllowed});
 return Object.freeze({qualification:()=>({custodyOpenAttempts}),paths:[identity.path,SIGNER_PATH],handle:(req,res)=>req.url===SIGNER_PATH?signer(req,res):identity.handle(req,res)});
}
export function composeOriginalHostSignerRoutes({originalHandle,extension,assertRuntimeCurrent}){
 if(typeof originalHandle!=='function'||!extension?.paths?.includes(SIGNER_PATH)||typeof extension.handle!=='function'||typeof assertRuntimeCurrent!=='function')throw Error('ORIGINAL_MESSAGING_SIGNER_EXTENSION_REQUIRED');
 return async(req,res)=>{
  if(!extension.paths.includes(req.url))return originalHandle(req,res);
  try{assertRuntimeCurrent();if(await extension.handle(req,res)!==true&&!res.writableEnded)throw Error('NOT_ADMITTED');}
  catch{if(res.destroyed||res.writableEnded)return;if(res.headersSent){res.destroy();return;}res.writeHead(503,{'Content-Type':'application/json','Cache-Control':'private, no-store'});res.end(JSON.stringify({error:'MESSAGING_SIGNER_UNAVAILABLE'}));}
 };
}
