import type {ProductWorld} from './productModel.ts';
import type {ComparisonSource} from './sourceComparison.ts';
import {researchFor,researchSourceFor} from './publicResearch.ts';

export type ResearchComparisonTransfer={ready:boolean;status:string;message:string;reviewSnapshot:string;researchId:string;researchVersion:number;researchName:string;question:string;sources:ComparisonSource[];sourceIds:string[]};
/** A deliberate copy of own selected PUBLIC excerpts, never an account/page grant.
 * Access records are not publication dates. Answers, claims and approvals are not copied. */
export function researchComparisonTransfer(world:ProductWorld,researchId:string):ResearchComparisonTransfer{
 const unavailable=(message:string):ResearchComparisonTransfer=>({ready:false,status:'source-unavailable',message,reviewSnapshot:'',researchId,researchVersion:0,researchName:'',question:'',sources:[],sourceIds:[]});
 const record=researchFor(world,researchId);
 if(!record||record.status!=='saved')return unavailable('Open your own saved research and its currently permitted public sources.');
 const selected=record.sources.filter(source=>source.selected);
 if(!selected.length)return unavailable('Choose at least one permitted public source in your research first. A comparison will need two sources.');
 if(selected.length>20)return {...unavailable('Choose up to 20 public sources in your research before copying them. No excerpts have been copied or silently left out.'),status:'source-selection-required'};
 try{
  const originals=selected.map(source=>researchSourceFor(world,researchId,source.id));
  const sources:ComparisonSource[]=originals.map((source,index)=>({id:`research-${index+1}-${source.id.slice(0,70)}`,name:source.title,kind:'url',url:source.url,excerpt:source.excerpt,origin:source.origin,selected:true,version:1,date:''}));
  const reviewSnapshot=JSON.stringify({owner:world.owner,researchId:record.id,researchVersion:record.version,question:record.question,sources:originals.map(source=>({id:source.id,version:source.version,title:source.title,url:source.url,excerpt:source.excerpt,origin:source.origin})),copyBoundary:'independent-own-public-excerpts-without-approvals'});
  return {ready:true,status:'review-required',message:'Review a separate copy of your selected public excerpts. Changes to the research will not update this comparison. No source/account approval, answer or comparison question is inherited.',reviewSnapshot,researchId:record.id,researchVersion:record.version,researchName:record.name,question:record.question,sources,sourceIds:originals.map(source=>source.id)};
 }catch{return unavailable('The original research task, source selection or public-source permission changed. Review your research before copying these excerpts.');}
}
export function confirmResearchComparisonTransfer(world:ProductWorld,researchId:string,reviewSnapshot:string):ComparisonSource[]{
 const current=researchComparisonTransfer(world,researchId);
 if(!current.ready||!reviewSnapshot||current.reviewSnapshot!==reviewSnapshot)throw Error('Review these exact currently selected research excerpts before making a separate comparison copy.');
 return structuredClone(current.sources);
}
