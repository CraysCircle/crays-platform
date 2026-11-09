import {Children,cloneElement,Fragment,isValidElement,type ReactNode} from 'react';
import type {GymDesignPorts} from '../gym-design/GymPrototype';
import {renderApprovedProgressView} from './ProgressApprovedViews';
import layoutContract from './progress-section-layout-contract.json';

function heading(node:ReactNode):string{
 if(!isValidElement<Record<string,unknown>>(node))return '';
 if(node.type==='h2'||node.type==='h3')return Children.toArray(node.props.children as ReactNode).filter(value=>typeof value==='string').join('');
 for(const child of Children.toArray(node.props.children as ReactNode)){const text=heading(child);if(text)return text;}
 return '';
}
export function ProgressSectionLayout({tab,ports}:{tab:string;ports:GymDesignPorts}){
 const view=renderApprovedProgressView(tab);
 if(!view)return null;
 const sections=Children.toArray(view.props.children),contract=layoutContract[tab as keyof typeof layoutContract];
 if(!contract||contract.flatMap(row=>row.indices).join(',')!==sections.map((_,index)=>index).join(','))throw Error('APPROVED_PROGRESS_LAYOUT_CONTRACT_MISMATCH');
 const A=ports.AdjustableRegion,root='personal-web:gym:progress:'+tab.toLowerCase().replaceAll(' ','-');
 function arrange(node:ReactNode,position:string):ReactNode{
  // Widget components own their state and original records. Only the static,
  // approved HTML section/card structure receives the existing shared wrapper.
  if(!isValidElement<Record<string,unknown>>(node)||(typeof node.type!=='string'&&node.type!==Fragment))return node;
  const children=Children.toArray(node.props.children as ReactNode),classes=typeof node.props.className==='string'?node.props.className.split(' '):[];
  if(classes.includes('pg-pair')||classes.includes('pg-three')){
   const ids=children.map((_,index)=>'card-'+index),labels=children.map((child,index)=>heading(child)||'Progress card '+(index+1));
   return <A key={position} id={root+':'+position} itemIds={ids} retainedItemIds={ids} labels={labels} className={String(node.props.className)+' pg-card-layout'} minWidth={260} basis={children.map((_,index)=>classes.includes('pg-three')?'33.333%':index===0?'60%':'40%')}>{children.map((child,index)=>arrange(child,position+'-'+index))}</A>;
  }
  if(node.props.children===undefined)return node;
  return cloneElement(node,undefined,children.map((child,index)=>arrange(child,position+'-'+index)));
 }
 return <A id={root+':sections'} itemIds={contract.map(row=>row.id)} retainedItemIds={contract.map(row=>row.id)} labels={contract.map(row=>row.label)} className="pg-body-sections" minWidth={260} basis={contract.map(()=>'100%')}>{contract.map(row=>row.indices.length===1?arrange(sections[row.indices[0]],row.id):<div key={row.id}>{row.indices.map(index=>arrange(sections[index],row.id+'-'+index))}</div>)}</A>;
}
