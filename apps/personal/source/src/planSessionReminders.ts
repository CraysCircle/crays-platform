import type { ProductWorld } from './productModel.ts';
export function planSessionReminderSource(w:ProductWorld,planId:string,sessionId:string){
 if(!w.identity.signedIn)throw Error('Sign in to use your own training session.');
 const plan=w.objects.find(o=>o.owner===w.owner&&o.id===planId&&o.kind==='personal-plan'&&o.planType==='movement'&&o.status==='saved');
 if(!plan)throw Error('This training plan is not available in your account.');
 let items:any[]=[];try{items=Array.isArray(plan.items)?plan.items:JSON.parse(String(plan.items||'[]'));}catch{}
 const matches=items.filter(i=>i.id===sessionId),item=matches[0];
 if(matches.length!==1||!item?.name)throw Error('This session is no longer in your training plan.');
 const date=String(item.date||''),time=String(item.time||''),timezone=String(plan.timezone||'');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)||!timezone)throw Error('Choose this session’s date, time and time zone in Edit my week first.');
 const fingerprint=JSON.stringify([plan.id,sessionId,item.name,item.day,date,time,timezone]);
 return {planId:plan.id,sessionId,name:String(item.name),date,time,timezone,fingerprint,planVersion:String(plan.version||1)};
}
