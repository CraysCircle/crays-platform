import type {HealthViewSnapshot} from './client/health-view';
export const healthCursorKeys=['observationCursor','activityCursor','sleepCursor','workoutCursor','reconciliationCursor'] as const;
export type HealthCursorKey=typeof healthCursorKeys[number];
type CursorSet=Partial<Record<HealthCursorKey,string>>;
export type HealthPageState={binding:string;range:{from:string;to:string;timezone:string};cursors:CursorSet;history:CursorSet[]};
export function healthPageQuery(base:URLSearchParams,binding:string,page?:HealthPageState){
 const query=new URLSearchParams(base);
 if(page?.binding===binding){query.delete('days');query.set('from',page.range.from);query.set('to',page.range.to);for(const key of healthCursorKeys)if(page.cursors[key])query.set(key,page.cursors[key]!);}
 return query;
}
export function healthPageOptions(view:HealthViewSnapshot['view']):{key:HealthCursorKey;label:string;nextCursor:string|null}[]{
 if(!view||view.domain==='connections')return [];
 if(view.domain==='reconciliation')return [{key:'reconciliationCursor',label:'Session twin',nextCursor:view.model.pagination.nextCursor}];
 if(view.domain==='workout-analytics')return [{key:'workoutCursor',label:'Workouts',nextCursor:view.model.pagination.nextCursor}];
 const p=view.model.pagination;
 return [{key:'observationCursor',label:'Measurements',nextCursor:p.observations.nextCursor},{key:'activityCursor',label:'Activity',nextCursor:p.activity.nextCursor},{key:'sleepCursor',label:'Sleep',nextCursor:p.sleep.nextCursor},...(p.workouts?[{key:'workoutCursor' as const,label:'Workouts',nextCursor:p.workouts.nextCursor}]:[])];
}
/** Tokens are opaque original signed server cursors. The UI does not decode,
 * synthesize, persist or combine records from successive pages. */
export function nextHealthPage(binding:string,range:HealthPageState['range'],page:HealthPageState|undefined,key:HealthCursorKey,token:string):HealthPageState{
 const current=page?.binding===binding?page:undefined;
 return {binding,range:{...range},cursors:{...current?.cursors,[key]:token},history:[...(current?.history??[]),{...current?.cursors}]};
}
export function previousHealthPage(page:HealthPageState):HealthPageState{
 if(!page.history.length)return page;
 return {...page,cursors:{...page.history.at(-1)!},history:page.history.slice(0,-1)};
}
