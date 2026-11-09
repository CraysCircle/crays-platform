import {Receipt,CheckCircle,Clock,WarningCircle} from '@phosphor-icons/react';
import type {Payment} from './productModel';
import {PaymentPriceReview} from './PaymentPriceReview';
import './payment-record-summary.css';
const labels:Record<string,string>={prepared:'Ready for review',approved:'Approved · not yet confirmed',submitted:'Submitted · awaiting confirmation',pending:'Payment pending',unknown:'Outcome being checked',confirmed:'Payment confirmed',failed:'Payment failed',refunded:'Refund recorded'};
export function PaymentRecordSummary({payment,title,recipient,account}:{payment:Payment;title:string;recipient:string;account:string}){
 const Icon=payment.status==='confirmed'?CheckCircle:payment.status==='failed'?WarningCircle:Clock;
 let nativeAmount=payment.amount;if(payment.asset==='sats'&&/^\d+$/.test(payment.amount))nativeAmount=Number(payment.amount).toLocaleString('en');
 return <section className="payment-record-summary" aria-label="Your payment record"><p className="payment-record-status"><Icon size={20}/>{labels[payment.status]||'Status needs review'}<small>Design example</small></p>{payment.usdQuote?<PaymentPriceReview title={title} recipient={recipient} quote={payment.usdQuote}/>:<div className="payment-record-native"><Receipt size={26}/><h2>{title}</h2><p>{recipient}</p><strong>{nativeAmount} <small>{payment.asset}</small></strong><p className="source-caption">{payment.asset==='USD'?'Original USD amount recorded by this account.':'Original payment amount. This historical record does not include a USD valuation.'}</p></div>}<dl><div><dt>Paid to</dt><dd>{recipient}</dd></div><div><dt>Payment account</dt><dd>{account}</dd></div><div><dt>Payment route</dt><dd>{payment.network}</dd></div></dl><p className="source-caption">Payment confirmation, content rights and media availability remain separate.</p></section>;
}
