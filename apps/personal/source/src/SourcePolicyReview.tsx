import {Globe,LinkSimple} from '@phosphor-icons/react';
import './source-policy.css';

/** Read-only disclosure of the exact user-authored rules. It grants no access. */
export function SourcePolicyReview({rules}:{rules:string[]}){
 if(!rules.length)return <p className="sp-caption">Only the safe public sources you select.</p>;
 return <details className="sp-review" data-testid="source-policy-review"><summary><Globe size={19}/><span>Allowed websites</span><small>{rules.length} {rules.length===1?'rule':'rules'}</small></summary><ol>{rules.map((rule,index)=>{
  let host=rule;const page=/^https?:\/\//i.test(rule);if(page)try{host=new URL(rule).hostname;}catch{/* Keep invalid draft wording visible for correction. */}
  return <li key={`${index}:${rule}`}><details><summary><LinkSimple size={18}/><span>{host}<small>{page?'Exact page rule':'Exact website host'}</small></span><span className="sp-rule-number">{index+1}</span></summary><code>{rule}</code><p className="sp-caption">{page?'This exact public page is allowed. Other pages are separate choices.':'This exact hostname is allowed. Other subdomains are separate choices.'}</p></details></li>;
 })}</ol></details>;
}
