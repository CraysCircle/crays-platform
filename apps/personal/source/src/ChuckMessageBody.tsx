import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './chuck-message-body.css';
import {chuckTaskReviewLink,chuckMessageUrl,remarkChuckTaskReviewLinks} from './chuckTaskReviewLinks.mjs';

// Render only the message projection. Original bodies and attachment authority remain unchanged.
export default function ChuckMessageBody({body,owner=false,onOpenTask}:{body:string;owner?:boolean;onOpenTask?:(taskId:string)=>void}){
 const origin=typeof window==='undefined'?undefined:window.location.origin;
 if(owner)return <div className="chuck-message-body chuck-message-body-plain">{body}</div>;
 return <div className="chuck-message-body"><Markdown skipHtml remarkPlugins={[remarkGfm,remarkChuckTaskReviewLinks]}
  urlTransform={(value,key)=>chuckMessageUrl(value,{origin,attribute:key})}
  components={{
   a:({href,children})=>{const task=chuckTaskReviewLink(href,{origin});return task?<a href={task.href} onClick={event=>{if(!onOpenTask||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();onOpenTask(task.taskId);}}>{children}</a>:href?<a href={href} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">{children}</a>:<span>{children}</span>;},
   img:({src,alt})=>src?<a href={typeof src==='string'?src:undefined} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">{alt||'Open linked image'}</a>:<span>{alt||'Image link unavailable'}</span>,
   table:({children})=><div className="chuck-message-table" role="region" aria-label="Table in Chuck response" tabIndex={0}><table>{children}</table></div>,
   input:({checked})=><input type="checkbox" checked={!!checked} disabled aria-label={checked?'Completed item':'Open item'}/>
  }}>{body}</Markdown></div>;
}
