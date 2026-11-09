/** Navigation only: a task reference never proves ownership or task existence.
 * The existing canonical route re-reads the original current Core task.
 */
const id='personal-task-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}';
const pathPattern=new RegExp('^/(?:#/)?chuck/tasks/('+id+')$');
export function chuckTaskReviewLink(value,{origin}={}){
 if(typeof value!=='string'||value.length>1000||/[\\\x00-\x20\x7f]/.test(value))return null;
 let path=value;
 if(/^https?:\/\//i.test(value)){
  let url,base;try{url=new URL(value);base=new URL(origin);}catch{return null;}
  if(base.origin!==origin||url.origin!==base.origin||url.username||url.password||url.search)return null;
  if(url.pathname==='/'&&url.hash.startsWith('#/'))path='/'+url.hash;else if(!url.hash)path=url.pathname;else return null;
 }
 const match=pathPattern.exec(path);if(!match)return null;
 return Object.freeze({taskId:match[1],href:'/#/chuck/tasks/'+match[1]});
}
export function chuckMessageUrl(value,{origin,attribute='href'}={}){
 if(attribute==='href'){
  const task=chuckTaskReviewLink(value,{origin});if(task)return task.href;
 }
 // Preserve existing external-link policy. Every other relative/private path,
 // protocol-relative URL, script/data/blob scheme remains unavailable.
 if(typeof value!=='string'||!/^https?:\/\//i.test(value))return '';
 try{const url=new URL(value);if(url.protocol!=='http:'&&url.protocol!=='https:')return '';}catch{return '';}
 return value;
}
/** Autolink original bare task paths outside code/images/HTML/existing links.
 * Markdown rendering only: original message bytes and Core actions unchanged.
 */
export function remarkChuckTaskReviewLinks(){
 return tree=>{
  const pending=[tree],skip=new Set(['link','linkReference','code','inlineCode','html','image','imageReference']);
  while(pending.length){
   const parent=pending.pop();if(!parent||skip.has(parent.type)||!Array.isArray(parent.children))continue;
   const next=[];
   for(const node of parent.children){
    if(node?.type!=='text'||typeof node.value!=='string'){next.push(node);pending.push(node);continue;}
    const expression=new RegExp('(^|[\\s(\u0022\u0027])(/(?:#/)?chuck/tasks/'+id+')(?=$|[\\s)\u0022\u0027.,;!?])','g');
    let start=0,match;
    while((match=expression.exec(node.value))){
     const offset=match.index+match[1].length,reference=chuckTaskReviewLink(match[2]);if(!reference)continue;
     if(offset>start)next.push({type:'text',value:node.value.slice(start,offset)});
     next.push({type:'link',url:reference.href,children:[{type:'text',value:match[2]}]});start=offset+match[2].length;
    }
    if(start<node.value.length)next.push(start?{type:'text',value:node.value.slice(start)}:node);
   }
   parent.children=next;
  }
 };
}
