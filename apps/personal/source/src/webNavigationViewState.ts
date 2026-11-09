/** Ephemeral DOM state only. Never persisted in URLs/history or used as access authority. */
type NodeRef={path:number[];tag:string;label:string;text:string;messageId?:string};
const originalMessageNode=(node:HTMLElement)=>node.getAttribute("tabindex")==="-1"&&/^personal-message-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(node.dataset.messageId??"");
export type NavigationViewState={focus?:NodeRef;scroll:{node:NodeRef;top:number;left:number}[]};
function reference(root:HTMLElement,node:HTMLElement):NodeRef|undefined{
 const path:number[]=[];let current:Element|null=node;
 while(current&&current!==root){const parent:HTMLElement|null=current.parentElement;if(!parent)return;path.unshift(Array.prototype.indexOf.call(parent.children,current));current=parent;}
 if(current!==root)return;
 return {path,tag:node.tagName,label:node.getAttribute('aria-label')||'',text:originalMessageNode(node)||node.matches('input,textarea,select')?'':(node.textContent||'').trim(),...(originalMessageNode(node)?{messageId:node.dataset.messageId}:{})};
}
function resolve(root:HTMLElement,ref:NodeRef,matchText=true):HTMLElement|undefined{
 // A loaded, currently rendered original message is identified by its exact
 // canonical ID, not by a DOM path that changes when older pages are inserted.
 // This is ephemeral focus state only: no transcript text, identity or grant.
 if(ref.messageId){const nodes=[...root.querySelectorAll<HTMLElement>('[data-message-id]')].filter(node=>originalMessageNode(node)&&node.dataset.messageId===ref.messageId&&node.tagName===ref.tag&&(node.getAttribute('aria-label')||'')===ref.label&&!node.closest('[data-flow-current="false"],[hidden],[inert],[aria-hidden="true"]'));return nodes.length===1?nodes[0]:undefined;}
 let node:Element=root;for(const index of ref.path){if(!node.children[index])return;node=node.children[index];}
 if(!(node instanceof HTMLElement)||node.tagName!==ref.tag||node.getAttribute('aria-label')!== (ref.label||null))return;
 if(matchText&&!node.matches('input,textarea,select')&&(node.textContent||'').trim()!==ref.text)return;
 return node;
}
export function captureNavigationView(root:HTMLElement,previous?:NavigationViewState):NavigationViewState{
 const active=document.activeElement,focus=active instanceof HTMLElement&&root.contains(active)&&(active.matches('button,a,input,textarea,select,[contenteditable="true"],[role="button"],[role="link"]')||originalMessageNode(active))?reference(root,active):previous?.focus;
 const scroll=[root,...root.querySelectorAll<HTMLElement>('*')].filter(node=>node.scrollTop||node.scrollLeft).flatMap(node=>{const ref=reference(root,node);return ref?[{node:ref,top:node.scrollTop,left:node.scrollLeft}]:[];});
 return {focus,scroll};
}
export function restoreNavigationView(root:HTMLElement,state?:NavigationViewState,preserveFocus=false){
 for(const item of state?.scroll||[]){const node=resolve(root,item.node,false);if(node){node.scrollTop=item.top;node.scrollLeft=item.left;}}
 if(preserveFocus)return;
 const target=state?.focus?resolve(root,state.focus):undefined;
 if(target?.getClientRects().length&&!target.matches(':disabled')&&!target.closest('[inert]')){target.focus({preventScroll:true});return;}
 const heading=root.querySelector<HTMLElement>('h1,[role="heading"]')||root.querySelector<HTMLElement>('main')||root;
 if(heading){heading.setAttribute('tabindex','-1');heading.focus({preventScroll:true});}
}
