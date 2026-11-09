/** Explicit display-only incoming statement; never convert the buyer's outgoing payments into creator income. */
export type CreatorIncomeLine={id:string;type:'Content'|'Membership'|'Zap';title:string;day:number;grossMinor:number;refundMinor:number;providerMinor:number;status:'Paid'|'Refunded'};
export function creatorIncomeExample(owner:string,period:string){
 if(!owner||!/^\d{4}-(?:0[1-9]|1[0-2])$/.test(period))throw Error('Choose your own statement month.');
 const id=`creator-income-example:${owner}:${period}`;
 const rows:CreatorIncomeLine[]=[
  {id:`${id}:edition`,type:'Content',title:'A little more room · complete article',day:4,grossMinor:1800,refundMinor:0,providerMinor:60,status:'Paid'},
  {id:`${id}:membership`,type:'Membership',title:'Field notes · one-month access',day:8,grossMinor:2400,refundMinor:0,providerMinor:75,status:'Paid'},
  {id:`${id}:zap`,type:'Zap',title:'A thank-you for your original',day:12,grossMinor:600,refundMinor:0,providerMinor:30,status:'Paid'},
  {id:`${id}:returned`,type:'Content',title:'Weekend collection · refunded purchase',day:16,grossMinor:1200,refundMinor:1200,providerMinor:45,status:'Refunded'},
 ];
 const grossMinor=rows.reduce((n,r)=>n+r.grossMinor,0),refundMinor=rows.reduce((n,r)=>n+r.refundMinor,0),providerMinor=rows.reduce((n,r)=>n+r.providerMinor,0);
 return {id,owner,period,source:'fictional-incoming-statement' as const,liveExecution:false as const,rows,grossMinor,refundMinor,providerMinor,netMinor:grossMinor-refundMinor-providerMinor,awardAllocationMinor:1500,awardVotePrincipalMinor:3000};
}
export const incomeUSD=(minor:number)=>`${Math.floor(minor/100)}.${String(minor%100).padStart(2,'0')} USD`;
export function creatorIncomeExampleText(s:ReturnType<typeof creatorIncomeExample>){return ['CRAYS · FICTIONAL CREATOR INCOMING STATEMENT','Design example. Not actual revenue, a tax invoice, payout or payment authorisation.',`Reference: ${s.id}`,`Month: ${s.period}`,`Gross incoming sales/tips: ${incomeUSD(s.grossMinor)}`,`Refunded principal: ${incomeUSD(s.refundMinor)}`,`Example merchant provider costs: ${incomeUSD(s.providerMinor)}`,`Net statement amount: ${incomeUSD(s.netMinor)}`,'CRAYS content sales commission: 0%','The 0.25% ecosystem fee has its own official USD payment review; no crypto fee or additional deduction is made in this statement.',`Props nominee allocation: ${incomeUSD(s.awardAllocationMinor)} from ${incomeUSD(s.awardVotePrincipalMinor)} vote principal. 50% nominee, 25% prize draws, 25% event. Not paid; excluded from net sales.`,...s.rows.map(r=>`${s.period}-${String(r.day).padStart(2,'0')} | ${r.type} | ${r.title} | Gross ${incomeUSD(r.grossMinor)} | Refunded ${incomeUSD(r.refundMinor)} | Provider ${incomeUSD(r.providerMinor)} | ${r.status} | ${r.id}`),'No wallet balance, payment, buyer contact or media entitlement changed.'].join('\n');}
