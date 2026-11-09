/** Pure, deterministic design-example review of the EXACT selected excerpt.
 * No world, provider, unselected original, proprietary formula or model access.
 */
export type FitnessEvidenceLine={line:number;text:string};
export type FitnessFinding={id:string;title:string;detail:string;evidence:FitnessEvidenceLine[]};
export type FitnessFindings={exampleOnly:true;method:'selected-excerpt-descriptive-v1';findings:FitnessFinding[];unknowns:FitnessFinding[];nextQuestions:FitnessFinding[]};
export function fitnessAnalysisFindings(source:{kind:'training'|'wearable';excerpt:string}):FitnessFindings {
 const out:FitnessFindings={exampleOnly:true,method:'selected-excerpt-descriptive-v1',findings:[],unknowns:[],nextQuestions:[]};
 const lines=source.excerpt.split('\n').map((text,index)=>({line:index+1,text}));
 const add=(to:FitnessFinding[],id:string,title:string,detail:string,evidence:FitnessEvidenceLine[])=>{if(evidence.length)to.push({id,title,detail,evidence});};
 if(source.kind==='training'){
  const targets:{name:string;sets:number;reps:number;rest:number;ref:FitnessEvidenceLine}[]=[],reported:{name:string;set:number;completed:boolean;reps:number|null;ref:FitnessEvidenceLine}[]=[];
  let section:'none'|'targets'|'reported'='none';
  for(const ref of lines){
   // Stop before optional private notes/question. Their free text is not a structured target or measured result.
   if(ref.text.startsWith('Selected private notes:')||ref.text.startsWith('My question:'))break;
   if(ref.text==='Prescribed targets, not performed work:'){section='targets';continue;}
   if(ref.text==='Reported work, not proof of target attainment:'){section='reported';continue;}
   const t=section==='targets'?/^(.+): (\d+) sets, (\d+) reps, (\d+) rest seconds\./.exec(ref.text):null;
   if(t){targets.push({name:t[1],sets:Number(t[2]),reps:Number(t[3]),rest:Number(t[4]),ref});continue;}
   const r=section==='reported'?/^(.+), set (\d+): (Reported completed|Not reported completed); (reps not supplied|\d+ reps);/.exec(ref.text):null;
   if(r){reported.push({name:r[1],set:Number(r[2]),completed:r[3]==='Reported completed',reps:r[4]==='reps not supplied'?null:Number(r[4].split(' ')[0]),ref});}
  }
  for(const t of targets)add(out.findings,`target-${t.ref.line}`,`${t.name}: selected target`,`${t.sets} prescribed sets, ${t.reps} repetitions per set and ${t.rest} seconds rest are included. These are selected targets, not performed work.`,[t.ref]);
  for(const r of reported){
   add(out.findings,`reported-${r.ref.line}`,`${r.name}: reported set ${r.set}`,`${r.completed?'Marked reported completed':'Not marked reported completed'}; ${r.reps===null?'repetitions not supplied':`${r.reps} repetitions supplied`}. This is a self-report, not a technique or sensor verification.`,[r.ref]);
   const missing=r.ref.text.split(';').map(x=>x.trim().replace(/\.$/,'')).filter(x=>/not supplied/.test(x));
   if(missing.length)add(out.unknowns,`missing-${r.ref.line}`,'Missing reported dimensions',`${missing.join('; ')}. These fields remain unknown and are not replaced with zero.`,[r.ref]);
   const matches=targets.filter(t=>t.name===r.name);
   if(matches.length===1&&r.completed&&r.reps!==null){const target=matches[0],delta=r.reps-target.reps;add(out.findings,`comparison-${r.ref.line}`,`${r.name}: descriptive repetitions comparison`,`Selected target: ${target.reps} repetitions per set. Reported set ${r.set}: ${r.reps}. Arithmetic difference: ${delta>0?'+':''}${delta} repetitions. This does not establish target attainment, suitable load or exercise quality.`,[target.ref,r.ref]);}
  }
  const anchor=targets[0]?.ref||reported[0]?.ref||lines.find(l=>l.text.startsWith('Selected '));
  if(!targets.length&&reported.length)add(out.unknowns,'targets-not-selected','No selected target comparison','Prescribed targets are not present in this selected excerpt. No targets are inferred from a free workout, completed sets or another plan.',[reported[0].ref]);
  if(!reported.length&&targets.length)add(out.unknowns,'reported-not-selected','Performed work is not included','This selected excerpt supplies targets, but no structured reported sets. It does not establish that a workout happened.',[targets[0].ref]);
  if(anchor)add(out.nextQuestions,'training-next','Choose the next scope',!reported.length?'Would you like to select a reported workout separately for comparison?':!targets.length?'Do you want to keep reviewing this report alone, or separately select an existing prescribed target?':'Which explicitly reported difference would you like to discuss? Any plan change remains a separate personally reviewed proposal.',[anchor]);
 }else{
  for(const ref of lines.slice(2)){
   if(!/; (measurement|provider-score);/.test(ref.text))continue;
   const score=ref.text.includes('; provider-score;'),label=ref.text.split(': ')[0],quality=/; quality ([A-Z_]+);/.exec(ref.text)?.[1],calibration=/; calibration ([^;]+);/.exec(ref.text)?.[1];
   const beforeObserved=ref.text.split('; observed ')[0].split('; '),method=beforeObserved.at(-1)||'';
   add(out.findings,`kind-${ref.line}`,`${label}: ${score?'supplied source score':'measurement example'}`,score?'The selected line identifies a supplied provider-style score. It is kept separate from measurements; no CRAYS or proprietary score formula is calculated.':'The selected line identifies a measurement example. Its value is not treated as a provider score or clinical conclusion.',[ref]);
   add(out.findings,`method-${ref.line}`,'Method and source quality',`Selected method: ${method}. Explicit source quality: ${quality||'not supplied'}. ${quality==='PARTIAL'?'Coverage is partial; this is not a complete observation window.':'The quality label alone is not clinical validation.'}`,[ref]);
   if(!calibration||/not supplied|not calibrated|no clinical validation/i.test(calibration))add(out.unknowns,`calibration-${ref.line}`,'Calibration or validation is limited',`Selected calibration statement: ${calibration||'not supplied'}. No personal baseline or clinical validation is inferred.`,[ref]);
   if(score){add(out.findings,`contributors-${ref.line}`,'Contributor boundary',ref.text.includes('supplied contributors:')?'The selected source line includes supplied contributors. They describe its context and are not a recipe for reconstructing or validating the score.':'No contributors are included in the selected excerpt; they cannot be reconstructed from the score.',[ref]);if(!ref.text.includes('supplied contributors:'))add(out.unknowns,`contributors-missing-${ref.line}`,'Score contributors unavailable','The score alone does not reveal its inputs or calculation.',[ref]);}
   add(out.nextQuestions,`wearable-next-${ref.line}`,'Choose a follow-up',score?'Would you like an explanation of the supplied contributor limitations, without converting this score into a diagnosis or training recommendation?':'Would you like to select comparable readings from the same method and source over a longer period? No unselected history will be accessed.',[ref]);
  }
 }
 if(!out.findings.length&&lines.length)add(out.unknowns,'no-structured-selected-fields','No supported structured evidence found','This excerpt has no supported selected target, reported set or typed wearable line. No analysis values are invented from free text.',[lines[0]]);
 return out;
}
