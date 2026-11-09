import type {ProductWorld} from './productModel.ts';
import {awardGlobalSource} from './awardPreview.ts';
import {awardPublicTop100} from './awardReporting.ts';
import type {AwardReportSource} from './awardReporting.ts';
import type {AwardResultRecord} from './awardCanonical.ts';
import {localPreviewId} from './localPreviewId.ts';
function need(v:unknown,m:string):asserts v{if(!v)throw Error(m);}
export function awardResultRecords(w:ProductWorld,category:string){return w.objects.filter(o=>o.kind==='award-report-result-preview'&&o.category===category&&w.objects.filter(x=>x.id===o.id).length===1).filter(o=>{try{const r=o as AwardResultRecord,s=JSON.parse(r.sourceSnapshot) as AwardReportSource;return ['draft','published-example'].includes(r.status)&&Number.isSafeInteger(r.revision)&&r.revision>0&&JSON.stringify(awardPublicTop100(s,category))===JSON.stringify(r.result);}catch{return false;}}) as AwardResultRecord[];}
export function latestPublishedAwardResult(w:ProductWorld,category:string){const r=awardResultRecords(w,category).filter(r=>r.status==='published-example').sort((a,b)=>b.revision-a.revision)[0];if(!r)return;const source=JSON.parse(r.sourceSnapshot) as AwardReportSource;return {id:r.id,revision:r.revision,publishedAt:r.publishedAt,result:awardPublicTop100(source,category),current:r.sourceSnapshot===JSON.stringify(awardGlobalSource(w))};}
export function prepareAwardResult(w:ProductWorld,category:string,approval:'explicit-organiser-example'):ProductWorld{
 need(w.identity.signedIn&&approval==='explicit-organiser-example','Open the separately labelled organiser example while signed in.');const source=awardGlobalSource(w),result=awardPublicTop100(source,category),snapshot=JSON.stringify(source),records=awardResultRecords(w,category);
 if(records.some(r=>r.owner===w.owner&&r.status==='draft'&&r.sourceSnapshot===snapshot))return w;
 const record:AwardResultRecord={id:localPreviewId(),owner:w.owner,kind:'award-report-result-preview',sourceSnapshot:snapshot,category,status:'draft',result,revision:Math.max(0,...records.map(r=>r.revision))+1,createdAt:Date.now()};
 return {...w,objects:[...w.objects,record]};
}
export function publishAwardResult(w:ProductWorld,id:string,reviewedSnapshot:string,approval:'explicit-organiser-example'):ProductWorld{
 need(w.identity.signedIn&&approval==='explicit-organiser-example','Review the exact organiser example result.');const matches=w.objects.filter(o=>o.id===id),record=matches[0] as AwardResultRecord|undefined;
 need(matches.length===1&&record?.owner===w.owner&&record.kind==='award-report-result-preview'&&record.status==='draft','Choose your own unambiguous result draft.');
 need(awardResultRecords(w,record.category).some(r=>r.id===id),'The saved result needs its original checked source.');
 need(record.sourceSnapshot===reviewedSnapshot&&record.sourceSnapshot===JSON.stringify(awardGlobalSource(w)),'The vote source changed. Review a new result revision; the old original is retained.');
 awardPublicTop100(awardGlobalSource(w),record.category);
 return {...w,objects:w.objects.map(o=>o.id===id?{...o,status:'published-example',publishedAt:Date.now()}:o)};
}
