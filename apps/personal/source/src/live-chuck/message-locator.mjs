/** Find an original message through the SAME admitted controller. This adds no
 * identity, grant, bind, send, replay or separate history cache. Three pages per
 * explicit action; cursor/binding/contact checks remain in the original reader. */
export const validChuckMessageId=id=>typeof id==='string'&&/^personal-message-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id);
const readable=s=>s&&['ready','waiting-reply'].includes(s.phase)&&s.setup&&s.conversation;
const identity=s=>JSON.stringify([s.setup.contactRevision,s.conversation.bindingId,s.conversation.revision,s.conversation.conversationId]);
export class ChuckOriginalMessageLocator{
 #controller;#target;#state;#listeners=new Set();#unsubscribe;#disposed=false;#started=false;#busy=false;#paused=false;#finished=false;#blocked=false;#identity=null;#remaining=3;#pages=0;#seen=new Set();
 constructor({controller,targetId}){if(!controller||['getSnapshot','subscribe','loadOlder'].some(k=>typeof controller[k]!=='function')||!validChuckMessageId(targetId))throw Error('original-message-unavailable');this.#controller=controller;this.#target=targetId;this.#state=Object.freeze({phase:'waiting',pagesRead:0,canContinue:false});}
 subscribe=fn=>{this.#listeners.add(fn);return()=>this.#listeners.delete(fn);};getSnapshot=()=>this.#state;
 #emit(phase,canContinue=false){const next={phase,pagesRead:this.#pages,canContinue};if(this.#disposed||JSON.stringify(next)===JSON.stringify(this.#state))return;this.#state=Object.freeze(next);for(const fn of this.#listeners)fn();}
 start(){if(this.#started||this.#disposed)return;this.#started=true;this.#unsubscribe=this.#controller.subscribe(()=>this.#observe());this.#observe();}
 #observe(){
  if(this.#disposed)return;const s=this.#controller.getSnapshot();
  if(['unavailable','contact-required','storage-error','outcome-unknown','reviewing-request'].includes(s.phase)){this.#paused=true;this.#blocked=true;this.#emit('unavailable');return;}
  if(this.#blocked||this.#identity!==null&&s.phase==='idle'){this.#blocked=true;this.#emit('unavailable');return;}
  if(!readable(s)){if(!this.#paused)this.#emit(this.#busy?'searching':'waiting');return;}
  const pin=identity(s);if(this.#identity!==null&&pin!==this.#identity){this.#paused=true;this.#blocked=true;this.#emit('unavailable');return;}this.#identity??=pin;
  if(this.#blocked){this.#emit('unavailable');return;}
  if(this.#paused){this.#emit('paused',!this.#busy);return;}
  if(s.messages.some(m=>m.messageId===this.#target)){this.#finished=true;this.#emit('found');return;}
  if(this.#busy)return;
  if(this.#finished){this.#emit('paused',true);return;}
  if(!s.conversation.hasOlderMessages){this.#finished=true;this.#emit('missing');return;}
  if(this.#remaining===0){this.#emit('more',true);return;}
  const cursor=s.conversation.nextBeforeMessageId;
  if(!validChuckMessageId(cursor)||this.#seen.has(cursor)){this.#blocked=true;this.#emit('unavailable');return;}
  this.#busy=true;this.#emit('searching');
  void new Promise(resolve=>setTimeout(resolve,0)).then(()=>{if(this.#disposed||this.#paused)return;const fresh=this.#controller.getSnapshot();if(!readable(fresh)||identity(fresh)!==this.#identity){this.#blocked=true;this.#emit('unavailable');return;}this.#seen.add(cursor);this.#remaining--;this.#pages++;this.#emit('searching');return this.#controller.loadOlder();}).catch(()=>{this.#paused=true;this.#blocked=true;this.#emit('unavailable');}).finally(()=>{this.#busy=false;this.#observe();});
 }
 cancel(){if(this.#disposed)return;this.#paused=true;this.#emit('paused',!this.#busy);}
 continue(){if(this.#disposed||this.#blocked||this.#busy||!this.#state.canContinue)return;this.#remaining=3;this.#paused=false;this.#finished=false;this.#observe();}
 dispose(){this.#disposed=true;this.#unsubscribe?.();this.#listeners.clear();}
}
