/** Reuse the inbox's existing foreground scheduler for group conversations.
 * The original group port still performs every account/membership admission.
 * Background summaries resume at the same cursor after connection or failure; no
 * private history, key, identity or permission is cached by this scheduler. */
export async function openForegroundGroupConversation({groups,inbox,request}){
 if(typeof groups?.openConversation!=='function'||typeof inbox?.prioritizeConversation!=='function'||!request?.signal?.addEventListener||request.signal.aborted)throw Error('Current group selection required');
 const release=inbox.prioritizeConversation();let workspace,unsubscribe,unsubscribeClient,client,ended=false;
 const finish=()=>{if(ended)return;ended=true;request.signal.removeEventListener('abort',finish);workspace?.signal.removeEventListener('abort',finish);unsubscribe?.();unsubscribeClient?.();release();};
 request.signal.addEventListener('abort',finish,{once:true});
 try{
  workspace=await groups.openConversation(request);
  if(ended||request.signal.aborted||workspace.signal.aborted){finish();workspace.close();throw Error('Group selection ended');}
  const observe=()=>{
   const value=workspace.getSnapshot();if(['closed','unavailable'].includes(value.state)){finish();return;}
   if(value.state!=='ready'||!value.client)return;
   if(client!==value.client){unsubscribeClient?.();client=value.client;unsubscribeClient=client.subscribe(observe);}
   // The legacy engine renders admitted saved messages before catch-up. The
   // original engine returns a ready workspace after its actual connection.
   // Read-only membership must not indefinitely suppress other unread chats.
   if(client.getSnapshot().connectionState!=='connecting')finish();
  };
  workspace.signal.addEventListener('abort',finish,{once:true});unsubscribe=workspace.subscribe(observe);observe();
  // Preserve the exact admitted workspace object: composer ownership is
  // keyed by that object in both existing group engines.
  return workspace;
 }catch(error){finish();throw error;}
}
