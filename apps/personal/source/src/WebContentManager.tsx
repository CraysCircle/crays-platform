import {useEffect,useRef,type ReactNode} from 'react';
import {Archive,ArrowLeft,ArrowRight,FileText,MagnifyingGlass,Plus} from '@phosphor-icons/react';
import type {Post,ProductWorld} from './productModel';
import {savedArtwork} from './SavedPage';
import {resolveCraysMedia} from './craysMedia';
import {ClubAdjustableRegion} from './WebAdjustableRegion';
import {VoiceInput} from './VoiceInput';
import {useKeyboard} from './mobile/Keyboard';
import './web-content-manager.css';

type Props={backLabel:string;world:ProductWorld;content:Post[];ownCount:number;section:string;status:string;format:string;access:string;query:string;set:(key:string,value:string)=>void;onOpen:(id:string)=>void;onCreate:()=>void;onArchive:()=>void;onBack:()=>void;children:ReactNode};
const illustrationById:Record<string,string>={
 'demo-community-original-5':'web-content-session.png',
 'demo-community-original-10':'web-content-workshop.png',
 'demo-community-original-15':'web-discover-camera.png',
 'demo-community-original-20':'web-workspace-recovery.png',
 'demo-community-original-25':'web-travel-lisbon.png',
};
export function contentAccessLabel(post:Post){return ['Free','Paid','Valid subscription','Private grant'].includes(post.accessModel||'')?post.accessModel!:(post.protected?'Protected':'Free');}
export function contentStatus(post:Post){return ({accepted:'Published',scheduled:'Scheduled',draft:'Draft',partial:'Partially delivered',unknown:'Delivery unknown'} as Record<string,string>)[post.status]||post.status;}
export default function WebContentManager({backLabel,world,content,ownCount,section,status,format,access,query,set,onOpen,onCreate,onArchive,onBack,children}:Props){
 const keyboard=useKeyboard();
 const heading=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{const timer=window.setTimeout(()=>{const node=heading.current,root=node?.closest('.web-content-manager');if(node&&(!root?.contains(document.activeElement)||document.activeElement===document.body))node.focus({preventScroll:true});},350);return()=>window.clearTimeout(timer);},[]);
 const reset=()=>{set('status','All');set('format','All formats');set('access','All');set('query','');window.requestAnimationFrame(()=>heading.current?.closest('main')?.querySelector<HTMLInputElement>('input[aria-label="Find your content"]')?.focus());};
 const filter=(label:string,key:string,value:string,options:string[])=><label className="web-content-filter"><span>{label}</span><select aria-label={label} value={value} onChange={e=>{keyboard.hide();set(key,e.target.value);}}>{options.map(option=><option key={option} value={option}>{key==='access'&&option==='Paid'?'Protected':option}</option>)}</select></label>;
 return <main className="web-desktop-page web-content-manager" data-content-owner={world.owner}><button className="web-content-back" onClick={onBack}><ArrowLeft size={20}/>{backLabel}</button><header className="web-content-heading"><div><h1 ref={heading} tabIndex={-1}>Your content</h1><p>Your originals, drafts and publishing.</p></div><div><button className="activity-secondary" data-content-return="archive" onClick={onArchive}><Archive size={21}/>Your Story archive</button><button className="activity-primary" data-content-return="create" onClick={onCreate}><Plus size={21}/>Create content</button></div></header>
 <div role="tablist" aria-label="Content workspace" className="web-content-tabs">{['Content','Media','Studio'].map(tab=><button key={tab} role="tab" aria-selected={section===tab} onClick={()=>set('section',tab)}>{tab}</button>)}</div>
 {section==='Content'?<><ClubAdjustableRegion id="personal-web:library:content:filters" labels={['Find your content','Content status','Content format','Content access']} className="web-content-filters" minWidth={160} basis={['40%','20%','20%','20%']}><label className="web-content-search"><MagnifyingGlass size={22}/><VoiceInput aria-label="Find your content" placeholder="Find your content" value={query} onChange={e=>set('query',e.target.value)}/></label>{filter('Status','status',status,['All','Drafts','Scheduled','Published','Needs attention','Archived'])}{filter('Format','format',format,['All formats','note','article','image','video','audio','live','poll','document'])}{filter('Content access','access',access,['All','Free','Paid'])}</ClubAdjustableRegion>
 {content.length?<ClubAdjustableRegion id="personal-web:library:content:originals" labels={content.map(p=>'Content: '+p.title)} className="web-content-originals" minWidth={250} view={[status,format,access,query].join(':')}>{content.map(post=>{
 const original=savedArtwork(world,post),illustrative=!original&&world.identity.destination==='Demo account'&&!post.protected?illustrationById[post.id]:'',cover=original||resolveCraysMedia(illustrative||'');
 const people=world.people.filter(p=>p.id===post.author),profile=post.author===world.owner?world.profiles[world.owner]:undefined,author=profile?{name:profile.name||'Your original',avatar:profile.photo}:people.length===1?people[0]:undefined;
 return <article className="web-content-card" key={post.id}><div className="web-content-cover">{cover?<img src={cover} alt={illustrative?'Illustrative cover for '+post.title:post.alt||post.title}/>:<div className="web-content-unavailable"><FileText size={36}/><span>Original preview unavailable</span></div>}<span className="web-content-type">{post.type==='note'?'Post':post.type.charAt(0).toUpperCase()+post.type.slice(1)}</span></div><div className="web-content-copy"><h2>{post.title}</h2>{author&&<p className="web-content-author">{author.avatar&&<img src={resolveCraysMedia(author.avatar)} alt=""/>}<span>{author.name}</span></p>}<p className="web-content-state">{contentStatus(post)} · {contentAccessLabel(post)}{post.archived?' · Archived':''}{illustrative?' · Illustrative cover':!cover?' · No original preview':''}</p><button className="activity-primary" data-content-return={'original:'+post.id} aria-label={'Manage content: '+post.title} onClick={()=>onOpen(post.id)}>Manage content<ArrowRight size={20}/></button></div></article>;
 })}</ClubAdjustableRegion>:<section className="web-content-empty"><FileText size={36}/><h2>{ownCount?'No content matches.':'Something worth sharing?'}</h2><p>{ownCount?'Try another title, status, format or access filter.':'Create a post, tell a longer story or share your work. Drafts stay private until you publish.'}</p>{ownCount&&<button className="activity-secondary" onClick={reset}>Clear filters</button>}<button className="activity-primary" data-content-return="create" onClick={onCreate}>Create content<Plus size={20}/></button></section>}</>:<div className="web-content-section">{children}</div>}</main>;
}
