import {z} from 'zod';
import type {BookDiscoveryWorkspaceState} from './BookDiscoveryWorkspace';

// Structural admission for incomplete local editor drafts. Business validation
// stays in bookDiscovery.ts and is still required for each reviewed action.
const text=z.string(),strings=z.array(text),revision=z.number().int().positive();
const unique=<T extends {id:string}>(rows:T[])=>new Set(rows.map(x=>x.id)).size===rows.length;
const book=z.object({id:text.min(1),workId:text,editionId:text,title:text,authors:strings,language:text,publicationYear:z.number().finite().nullable(),editionLabel:text,format:text,subjects:strings,pageCount:z.number().finite().nullable(),difficulty:z.enum(['unknown','introductory','intermediate','advanced']),description:text,sourceUrl:text,metadataVersion:revision}).strict();
const pick=z.object({id:text.min(1),sourceId:text,sourceVersion:revision,bookId:text,metadataVersion:revision,reason:text,uncertainty:text,annotation:text,evidence:z.array(z.object({metadataSnapshot:text,reasonSnapshot:text,contextSnapshot:text}).strict())}).strict();
const draft=z.object({name:text,goal:text,themes:strings,language:text,preferences:z.object({formats:strings,difficulty:z.enum(['any','introductory','intermediate','advanced']),maxPages:z.number().finite().nullable(),exclude:strings}).strict(),favourites:z.array(z.object({id:text.min(1),title:text,authors:strings}).strict()).refine(unique),sources:z.array(z.object({id:text.min(1),name:text,url:text,selected:z.boolean(),version:revision,origin:z.enum(['user-catalogue','fictional-catalogue']),books:z.array(book).refine(unique)}).strict()).refine(unique),shortlist:z.array(pick).refine(unique)}).strict();
const state=z.object({owner:text,taskId:text,id:text,version:text.regex(/^\d+$/),draft,view:z.enum(['edit','review','saved']),options:z.object({sourceMode:z.enum(['fictional-public','own-preview']),scenario:z.enum(['ready','empty','failed','private-denied'])}).strict(),runId:text,proposal:z.array(pick).refine(unique),recoveryRaw:text.optional()}).strict();

export function readBookDiscoveryWorkspaceDraft(raw:string|undefined,fallback:BookDiscoveryWorkspaceState,expected:{owner:string;taskId:string;id:string}):{state:BookDiscoveryWorkspaceState;held:boolean;canRecover:boolean}{
 if(!raw)return {state:fallback,held:false,canRecover:false};
 let canRecover=false;
 try{
  const parsed=JSON.parse(raw);
  canRecover=!!parsed&&typeof parsed==='object'&&!Array.isArray(parsed)&&parsed.owner===expected.owner&&parsed.taskId===expected.taskId&&parsed.id===expected.id;
  const result=state.safeParse(parsed);
  if(result.success&&result.data.owner===expected.owner&&result.data.taskId===expected.taskId&&result.data.id===expected.id&&(result.data.view!=='saved'||!!expected.id)&& (!!expected.id||(!result.data.runId&&result.data.proposal.length===0)))return {state:result.data,held:false,canRecover:false};
 }catch{/* Retain the exact original storage string; never repair or overwrite it implicitly. */}
 return {state:fallback,held:true,canRecover};
}
