/** Versioned owner-requested fictional brand programs. Existing IDs/Relays/history/rights stay unchanged. */
export type CraysVertical='Club'|'Gym'|'Coffee'|'Shop';
export const CRAYS_PROGRAM_REVISION='crays-brand-program-v1';
const assignments:Record<CraysVertical,readonly number[]>={Club:[16,36,56,76],Gym:[17,37,57,77,97,6],Coffee:[5,25,45,65,85,9,29,49,69,89,11,31],Shop:[20,40,60,80,100,8,28,48,68,88,14,34,54,94]};
const entries=new Map<string,CraysVertical>();
for(const vertical of Object.keys(assignments) as CraysVertical[])for(const suffix of assignments[vertical]){const id='crays-demo-01a1863a-v1-spot-'+String(suffix).padStart(4,'0');if(entries.has(id))throw Error('A CRAYS location has conflicting programs.');entries.set(id,vertical);}
if(entries.size!==36||entries.has('crays-demo-01a1863a-v1-spot-0001'))throw Error('The CRAYS location programs are incomplete.');
export function craysVenueVertical(id:string){return entries.get(id);}
export function craysVenueProgram<T extends{id:string;name:string;city:string;type:string}>(spot:T){
 const vertical=craysVenueVertical(spot.id);if(!vertical)return undefined;
 const copy:Record<CraysVertical,string>={Club:'A place to settle in, share a table and meet your community.',Gym:'Movement, coaching and recovery, with people who help you keep going.',Coffee:'Your neighbourhood cup, a good little break and a shared table.',Shop:'Considered objects, local makers and useful finds to take with you.'};
 return{id:spot.id+':'+CRAYS_PROGRAM_REVISION,spotId:spot.id,revision:CRAYS_PROGRAM_REVISION,brand:'CRAYS' as const,vertical,name:'Crays '+vertical+' '+spot.city,type:'CRAYS '+vertical,description:copy[vertical],previousName:spot.name,previousType:spot.type,sourceAuthority:'owner-requested-fictional-brand-program' as const,realCoreAuthority:false as const,realSaasTenantId:null};
}
