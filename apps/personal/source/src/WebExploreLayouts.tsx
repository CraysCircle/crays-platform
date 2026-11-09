import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {Children,Fragment,isValidElement,type ReactNode} from 'react';
import {Plus,Trophy,CaretDown} from '@phosphor-icons/react';
import {ClubAdjustableRegion} from './WebAdjustableRegion';
import {AwardEntry} from './AwardWorkspace';
import {resolveCraysMedia} from './craysMedia';
import './web-explore.css';
export function WebExploreComposer({onCreate}:{photo:string;onChuck:(draft:string)=>void;onCreate:()=>void}){
 return <div className="web-explore-composer"><button className="web-explore-create" onClick={onCreate}><Plus size={21}/>Create</button></div>;
}

function flatten(children:ReactNode):ReactNode[]{return Children.toArray(children).flatMap(n=>isValidElement<{children?:ReactNode}>(n)&&n.type===Fragment?flatten(n.props.children):[n]);}
function cls(n:ReactNode){return isValidElement<{className?:string}>(n)?n.props.className||'':'';}
export function WebDiscoverLayout({children,header}:{children:ReactNode;header?:ReactNode}){
 const nodes=flatten(children),hero=nodes.find(n=>/dx-featured|dx-editorial-empty/.test(cls(n))),people=nodes.find(n=>cls(n)==='dx-people'),award=nodes.find(n=>isValidElement(n)&&n.type===AwardEntry),spots=nodes.find(n=>isValidElement<{'aria-labelledby'?:string}>(n)&&n.props['aria-labelledby']==='dx-spaces-title');
 const rest=nodes.filter(n=>![hero,people,award,spots].includes(n));
 return <div className="web-discover-page">{header}<ClubAdjustableRegion id="personal-web:explore:discover:sections" labels={['Inspiration highlights','Find your kind of Spot',...rest.map((_,i)=>['Your CRAYS world','Grow with CRAYS','Events and gatherings','Meet the makers','Collaboration','About inspiration'][i]||'Inspiration section')]} minWidth={240} className="web-explore-sections"><ClubAdjustableRegion id="personal-web:explore:discover:highlights" labels={['Featured Spot','People and Props']} className="web-discover-highlights" basis={['57%','41%']} minWidth={240}>{hero}<div className="web-discover-side"><div className="web-discover-photo-link"><img src={resolveCraysMedia('web-discover-people.webp')} alt="Friends talking on a terrace"/>{people}</div><div className="web-discover-photo-link"><img src={resolveCraysMedia('web-discover-camera.webp')} alt="Camera on a sunlit table"/>{award}</div></div></ClubAdjustableRegion>{spots}{rest}</ClubAdjustableRegion></div>;
}
/** Rearranges original hub elements only: source callbacks, campaign data and guards stay owned by AwardStoryExperience. */
export function WebPropsHub({children,web}:{children:ReactNode;web:boolean}){
 if(!web)return <>{children}</>;
 const nodes=flatten(children),hero=nodes.find(n=>cls(n)==='as-featured'),stats=nodes.find(n=>cls(n)==='as-teaser-stats'),event=nodes.find(n=>cls(n)==='as-event-banner'),heading=nodes.find(n=>cls(n)==='as-heading'),cards=nodes.find(n=>cls(n)==='as-horizontal');
 const intro=nodes.slice(0,(hero===undefined?0:nodes.indexOf(hero))),rest=nodes.filter(n=>![...intro,hero,stats,event,heading,cards].includes(n));
 const groups:ReactNode[][]=[];for(const node of rest){if(cls(node)==='as-row'&&groups.length&&cls(groups[groups.length-1][0])==='as-row')groups[groups.length-1].push(node);else if(cls(node)==='as-heading'||!groups.length||cls(node)==='as-row'||cls(node).includes('as-details'))groups.push([node]);else groups[groups.length-1].push(node);}
 const label=(group:ReactNode[])=>{const n=group[0];if(cls(n)==='as-heading'&&isValidElement<{children?:ReactNode}>(n)){const title=Children.toArray(n.props.children)[0];if(isValidElement<{children?:ReactNode}>(title)&&typeof title.props.children==='string')return title.props.children;}return cls(n).includes('as-details')?'Props and season rules':'Props resources';};
 return <div className="web-props-hub"><header className="web-props-intro">{intro}</header><ClubAdjustableRegion id="personal-web:explore:props:sections" labels={['Featured and almost unlocked','Annual Props Award',...groups.map(label)]} minWidth={240} className="web-explore-sections"><ClubAdjustableRegion id="personal-web:explore:props:highlights" labels={['Featured story','Almost unlocked']} basis={['60%','38%']} className="web-props-highlights" minWidth={240}><div className="web-props-featured">{hero}{stats}</div><aside className="web-props-almost">{heading}{cards}</aside></ClubAdjustableRegion>{event}{groups.map((group,i)=><section className={"web-props-section"+(cls(group[0])==='as-row'?' web-props-resources':'')} aria-label={label(group)} key={i}>{group}</section>)}</ClubAdjustableRegion></div>;
}

export function WebPropsSections({children,web,id}:{children:ReactNode;web:boolean;id:string}){
 if(!web)return <>{children}</>;
 const nodes=flatten(children),groups:ReactNode[][]=[];
 if(id==='campaign'){
  const summaryStart=nodes.findIndex(n=>cls(n)==='as-campaign-stats'),summaryEnd=nodes.findIndex((n,i)=>i>summaryStart&&cls(n)==='as-quiet');
  const heroIndex=nodes.findIndex(n=>cls(n)==='as-campaign-hero'||cls(n)==='as-source-heading');
  if(summaryStart>=0&&summaryEnd>=summaryStart&&heroIndex>=0){const intro=nodes.slice(0,heroIndex),narrative=nodes.slice(heroIndex,summaryStart),summary=nodes.slice(summaryStart,summaryEnd+1),rest=nodes.slice(summaryEnd+1);return <div className="web-props-contest-page">{intro}<ClubAdjustableRegion id="personal-web:explore:props:contest:columns" labels={['Story and media','Contest support']} className="web-props-contest-columns" basis={['65%','33%']} minWidth={240}><div>{narrative}</div><aside className="web-props-contest-summary">{summary}</aside></ClubAdjustableRegion><WebPropsSections web id="contest-details">{rest}</WebPropsSections></div>;}
 }
 if(id==='profile'){
  const identity=nodes.find(n=>cls(n).includes('as-creator-home')),annual=nodes.find(n=>cls(n)==='as-annual');
  if(identity&&annual)return <div className="web-props-profile-page">{nodes.filter(n=>cls(n)==='as-local-nav')}<ClubAdjustableRegion id="personal-web:explore:props:profile:columns" labels={['Creator identity','Annual Props summary']} className="web-props-profile-columns" minWidth={240} basis={['65%','33%']}>{identity}{annual}</ClubAdjustableRegion><WebPropsSections web id="creator-contests">{nodes.filter(n=>n!==identity&&n!==annual&&cls(n)!=='as-local-nav')}</WebPropsSections></div>;
 }
 for(const node of nodes){const tag=isValidElement(node)?node.type:'';if(!groups.length||tag==='section'||tag==='h1'||tag==='h2'||tag==='label'||tag==='div'&&/as-heading|as-grid|as-world-grid|as-experience-gallery|as-visual-ideas|as-creator-formats|as-contest-list|as-action-series|as-chapters/.test(cls(node)))groups.push([node]);else groups[groups.length-1].push(node);}
 return <ClubAdjustableRegion id={'personal-web:explore:props:'+id+':body'} labels={groups.map((_,i)=>(({creators:'Creator discovery',studio:'Your contest',history:'Your activity',ideas:'Create with Props',experiences:'Experiences',planned:'Planned contest','creator-contests':'Creator contests','contest-details':'Contest details'} as Record<string,string>)[id]||'Your contest')+' · '+(i+1))} minWidth={240} className="web-props-body-sections">{groups.map((g,i)=><section className="web-props-body-section" key={i}>{g}</section>)}</ClubAdjustableRegion>;
}

export function WebPropsMenu({label,open,onOpenChange,children}:{label:string;open:boolean;onOpenChange:(open:boolean)=>void;children:ReactNode}){
 const items=isValidElement<{children?:ReactNode}>(children)?flatten(children.props.children):flatten(children);
 return <DropdownMenu.Root open={open} onOpenChange={onOpenChange}><DropdownMenu.Trigger className="as-section-picker" aria-label="Choose Props view"><Trophy size={19}/><span>{label}</span><CaretDown size={15}/></DropdownMenu.Trigger><DropdownMenu.Portal><DropdownMenu.Content className="web-props-dropdown" align="start" sideOffset={8} aria-label="Explore Props">{items.map((item,i)=><DropdownMenu.Item key={i} asChild>{item}</DropdownMenu.Item>)}</DropdownMenu.Content></DropdownMenu.Portal></DropdownMenu.Root>;
}
export function webSpotImage(id:string,original:string){return ({'discover-aster-resort':'web-discover-resort.webp','discover-cedar-hotel':'web-discover-hotel.webp','discover-juniper':'web-discover-rooftop.webp','independent-grocer-preview':'web-discover-grocer.webp','discover-makers-trade-show':'web-event-makers.webp','discover-light-exhibition':'award-art-illustration.png','discover-horizon-cruise':'web-discover-cruise.webp','discover-skyway-airport':'web-discover-hotel.webp','crays-store-preview':'web-discover-shop.webp','discover-atelier':'member-dining.webp'} as Record<string,string>)[id]||original;}
export function WebSpotLayout({web,children,name,parent,onBack}:{web:boolean;children:ReactNode;name:string;parent:string;onBack:()=>void}){
 if(!web)return <>{children}</>;
 const nodes=flatten(children),hero=nodes.find(n=>cls(n)==='space-hero'),identity=nodes.find(n=>cls(n)==='space-community-identity'),tabs=nodes.find(n=>cls(n).includes('venue-sections'));
 const detail=nodes.filter(n=>![hero,identity,tabs].includes(n)),side=detail.filter(n=>/^(eyebrow|space-membership|space-arrival|space-about|space-primary-service)$/.test(cls(n))||cls(n).includes('space-preview-notice')),main=detail.filter(n=>!side.includes(n));
 return <div className="web-spot-page"><nav className="web-detail-breadcrumb" aria-label="Page path"><button onClick={onBack}>{parent}</button><span>/</span><span>{name}</span></nav>{hero}{identity}{tabs}<ClubAdjustableRegion id="personal-web:explore:spot:columns" labels={['Spot content','Visit and information']} basis={['66%','32%']} minWidth={240} className={side.length?'web-spot-columns':'web-spot-single'}><section className="web-spot-main">{main}</section>{side.length>0&&<aside className="web-spot-info">{side}</aside>}</ClubAdjustableRegion></div>;
}
export function WebEventLayout({web,children}:{web:boolean;children:ReactNode}){
 if(!web)return <>{children}</>;
 const nodes=flatten(children),cover=nodes.find(n=>cls(n)==='venue-cover'),title=nodes.find(n=>isValidElement(n)&&n.type==='h1'),eyebrow=nodes.find(n=>cls(n)==='eyebrow'),lead=nodes.find(n=>cls(n)==='lead'),caption=nodes.find(n=>cls(n)==='source-caption'),description=nodes.find(n=>cls(n)==='event-description');
 const rest=nodes.filter(n=>![cover,title,eyebrow,lead,caption,description].includes(n));return <ClubAdjustableRegion id="personal-web:explore:event:columns" labels={['Event story','Your response']} basis={['64%','34%']} className="web-event-columns" minWidth={240}><section className="web-event-story">{cover}{eyebrow}{title}{lead}{caption}{description}</section><aside className="web-event-response">{rest}</aside></ClubAdjustableRegion>;
}
export function WebCreatorLayout({web,children}:{web:boolean;children:ReactNode}){
 if(!web)return <>{children}</>;
 const nodes=flatten(children),cover=nodes.find(n=>cls(n)==='creator-cover'),identity=nodes.find(n=>cls(n)==='creator-public-identity'),badges=nodes.find(n=>cls(n)==='creator-public-badges');
 const support=nodes.filter(n=>isValidElement<{onChoose?:unknown}>(n)&&!!n.props.onChoose||cls(n)==='award-zap-context'),rest=nodes.filter(n=>![cover,identity,badges,...support].includes(n));
 return <div className="web-creator-page">{cover}{identity}{badges}<ClubAdjustableRegion id="personal-web:explore:public-creator:columns" labels={['Creator content','Support this creator']} basis={['66%','32%']} minWidth={240} className="web-creator-columns"><section>{rest}</section><aside className="web-creator-support">{support}</aside></ClubAdjustableRegion></div>;
}
