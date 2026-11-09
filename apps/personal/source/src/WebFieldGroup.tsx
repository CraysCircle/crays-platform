import {Children,isValidElement,type ReactNode} from 'react';
import {useFlow} from './mobile';
import {ClubAdjustableRegion} from './WebAdjustableRegion';
/** Original fields keep their React identity and input state during SaaS-style moves. */
export default function WebFieldGroup({id,children,className=''}:{id:string;children:ReactNode;className?:string}){
 const flow=useFlow();const nodes=Children.toArray(children);const labels=nodes.map((node,index)=>{if(isValidElement<{label?:string;title?:string;className?:string;children?:ReactNode}>(node))return node.props.label||node.props.title||(node.props.className==='booking-time-fields'?'Date and time':typeof node.props.children==='string'?node.props.children:'Area '+(index+1));return 'Area '+(index+1)});
 return <ClubAdjustableRegion id={'personal-web:page:'+flow.current.id+':'+id} labels={labels} className={'web-field-group '+className} minWidth={180}>{nodes}</ClubAdjustableRegion>;
}
