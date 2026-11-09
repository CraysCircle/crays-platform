import {createOwnedGroupBlossomBridge} from './ownedGroupBlossomBridge.mjs';
import {createOwnedGroupRelayBridge} from './ownedGroupRelayBridge.mjs';
import {openExistingFileSigner} from './existingFileSigner.mjs';
import {createOriginalHostGroupDirectory} from './originalHostGroupDirectory.mjs';
import {createOwnedTestContactContext} from './ownedTestContactContext.mjs';
import {createOriginalHostSignerExtension} from './originalHostSignerExtension.mjs';
import {createCanonicalHumanMessagingHttp} from './canonicalHumanMessagingHttp.mjs';
import {createOwnedTestConversationResolver} from './ownedTestConversations.mjs';
const base='/api/crays/personal/messaging/';
/** Original host and SDK. The owner-only test inbox never replaces original
 * platform identity, Chuck, Member/Work handlers or production Core contacts. */
export function createOriginalHostHumanExtension(options){
 const groupDirectory=createOriginalHostGroupDirectory(options);
 const groupBlossom=createOwnedGroupBlossomBridge({directory:groupDirectory,openCustody:context=>openExistingFileSigner({descriptorPath:'/srv/crays/dev-state/01a183ad-4854-7cb2-9518-ad67bf453db4/NOSTR_OWNER_BINDING.json',...context})});
 const groupRelay=createOwnedGroupRelayBridge({directory:groupDirectory,openCustody:context=>openExistingFileSigner({descriptorPath:'/srv/crays/dev-state/01a183ad-4854-7cb2-9518-ad67bf453db4/NOSTR_OWNER_BINDING.json',...context})});
 const signer=createOriginalHostSignerExtension({...options,authorizeGroupRelayOperation:(binding,operation)=>groupDirectory.authorizeRelayOperation(binding,operation)});
 const contextRoot='/srv/crays/worktrees/nostr-web-01a1863a/apps/web-runtime/.qualification/visible-demo-public-v4/';
 const contactContext=createOwnedTestContactContext({catalogPath:contextRoot+'catalog.json',networkPath:contextRoot+'network.json',catalogSHA256:'8e8480a3b055b55f4b6cceeae40f55bb7d85c40c0977d525ecfd6863ba5899be',networkSHA256:'4dfda6dd6d054702b7b27849f7397ce8137ebe1ba2f098a6434ccfda0b07f673'});
 const resolve=createOwnedTestConversationResolver({contactContext,indexPath:'/srv/crays/worktrees/nostr-web-01a1863a/apps/web-runtime/.qualification/owned-test-conversations-v266/CONVERSATION_INDEX.json',journalRoot:'/home/craysdev/.local/state/crays-nostr-messaging-01a1863a/private-intents-v1',fileRoot:'/home/craysdev/.local/state/crays-nostr-messaging-01a1863a/private-files-v1',blossom:true,requestBoundaryRuntimeGuard:true,assertRuntimeCurrent:options.assertRuntimeCurrent});
 const human=createCanonicalHumanMessagingHttp({...options,authorizeConversation:resolve,groupDirectory,groupRelay,groupBlossom});
 const accepts=req=>signer.paths.includes(req.url)||[base+'send',base+'send-file',base+'attachment',base+'history',base+'destinations',base+'groups',base+'group-relay',base+'group-blob'].includes(req.url)||req.url?.startsWith(base+'destinations?')||req.url===base+'conversation'||req.url?.startsWith(base+'conversation?')||req.url?.startsWith(base+'inbox?')||req.url===base+'inbox';
 return Object.freeze({accepts,close:()=>groupDirectory.close(),qualification:()=>({...signer.qualification(),ownedTestConversationCount:980,productionCoreContactsCreated:0}),paths:[...signer.paths,base+'conversation',base+'history',base+'send',base+'send-file',base+'attachment',base+'inbox',base+'destinations',base+'groups',base+'group-relay',base+'group-blob'],handle:(req,res)=>signer.paths.includes(req.url)?signer.handle(req,res):human(req,res)});
}
export function composeOriginalHostHumanRoutes({originalHandle,extension,assertRuntimeCurrent}){
 if(typeof originalHandle!=='function'||typeof extension?.accepts!=='function'||typeof assertRuntimeCurrent!=='function')throw Error('Original human messaging extension required');
 return async(req,res)=>{
  if(!extension.accepts(req))return originalHandle(req,res);
  try{assertRuntimeCurrent();if(await extension.handle(req,res)!==true&&!res.writableEnded)throw Error('NOT_ADMITTED');}
  catch{if(res.destroyed||res.writableEnded)return;if(res.headersSent){res.destroy();return;}res.writeHead(503,{'content-type':'application/json','cache-control':'private, no-store'});res.end(JSON.stringify({status:'conversation_temporarily_unavailable'}));}
 };
}
