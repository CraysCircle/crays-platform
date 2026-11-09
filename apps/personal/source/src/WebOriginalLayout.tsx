import {Children,Fragment,isValidElement,type ReactNode} from 'react';
import {ArrowLeft,ChatCircle,DotsThree,ShieldCheck} from '@phosphor-icons/react';
import {ClubAdjustableRegion} from './WebAdjustableRegion';
import './web-original.css';
function flatten(children:ReactNode):ReactNode[]{return Children.toArray(children).flatMap(n=>isValidElement<{children?:ReactNode}>(n)&&n.type===Fragment?flatten(n.props.children):[n]);}
function classOf(n:ReactNode){return isValidElement<{className?:string}>(n)?n.props.className||'':'';}
export function WebOriginalLayout({web,children,authorImage,ownImage,hasReplies,onBack,backLabel,postedDate}:{web:boolean;children:ReactNode;authorImage?:string;ownImage?:string;hasReplies:boolean;onBack:()=>void;backLabel:string;postedDate:string}){
 if(!web)return <>{children}</>;
 const nodes=flatten(children),discussionIndex=nodes.findIndex(n=>isValidElement<{children?:ReactNode}>(n)&&n.type==='h2'&&n.props.children==='Discussion');
 const original=nodes.slice(0,discussionIndex),conversation=nodes.slice(discussionIndex+1);
 const title=original.find(n=>isValidElement(n)&&n.type==='h1'),author=original.find(n=>classOf(n)==='author-link'),source=original.find(n=>classOf(n).includes('original-source-label'));
 const metadata=original.find(n=>classOf(n).includes('original-metadata')),actions=original.find(n=>classOf(n).includes('product-action-bar'));
 const paragraphs=original.filter(n=>classOf(n)==='original-paragraph');
 const content=original.filter(n=>![title,author,source,metadata,actions,...paragraphs].includes(n));
 const profile=conversation.find(n=>isValidElement<{title?:string}>(n)&&n.props.title==='View this author’s profile');
 const safety=conversation.find(n=>isValidElement<{title?:string}>(n)&&n.props.title==='Report or protect your account');
 const reply=conversation.find(n=>isValidElement<{children?:ReactNode}>(n)&&n.props.children==='Write a reply');
 const rest=conversation.filter(n=>![profile,safety,reply].includes(n));
 return <div className="web-original-page"><button className="web-original-back" onClick={onBack}><ArrowLeft size={20}/>{backLabel}</button><ClubAdjustableRegion id="personal-web:original:columns" labels={['Original post','Discussion']} minWidth={280} basis={['59%','39%']} className="web-original-columns"><article className="web-original-post"><header className="web-original-author">{authorImage&&<img src={authorImage} alt=""/>}<div>{author}<div className="web-original-author-meta">{source}<span>· {postedDate}</span></div></div><button className="web-original-details" aria-label="View original details" title="Original & source" onClick={e=>{const details=e.currentTarget.closest('.web-original-post')?.querySelector('details.original-metadata');if(details instanceof HTMLDetailsElement){details.open=!details.open;details.scrollIntoView({block:'nearest'});}}}><DotsThree size={24}/></button></header><ClubAdjustableRegion id="personal-web:original:content" labels={['Post introduction','Original media and content','Post actions and source']} minWidth={240} className="web-original-content"><div className="web-original-intro">{title}{paragraphs}</div><div className="web-original-media">{content}</div><div>{actions}{metadata}</div></ClubAdjustableRegion></article><aside className="web-original-discussion" aria-label="Discussion"><h2>Discussion</h2>{!hasReplies&&<div className="web-original-empty"><ChatCircle size={64} weight="light"/><strong>No replies yet.</strong><p>Be the first to start the conversation<br/>about this post.</p></div>}<div className="web-original-reply">{ownImage&&<img src={ownImage} alt=""/>}{reply}</div><div className="web-original-replies">{rest}</div><div className="web-original-context"><div className="web-original-profile-link">{authorImage&&<img src={authorImage} alt=""/>}{profile}</div><div className="web-original-safety"><ShieldCheck size={23}/>{safety}</div></div></aside></ClubAdjustableRegion></div>;
}
