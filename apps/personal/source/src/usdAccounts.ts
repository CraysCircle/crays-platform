import type {ProductWorld,Wallet} from './productModel';
const fiatCurrencies=new Set(Intl.supportedValuesOf('currency'));
export function historicalFiatAccount(wallet:Pick<Wallet,'asset'>){return wallet.asset!=='USD'&&fiatCurrencies.has(wallet.asset);}
export function newUSDAccount(available='0'):Wallet{return {id:'usd',name:'Global USD account · Stripe',asset:'USD',network:'Stripe · USD',custody:'External provider',available,pending:'0',reserved:'0',connected:false,read:false,transfer:false,budget:false,proof:'valid'};}
export function newUSDBAccount():Wallet{return {id:'usdb-spark',name:'USDB · Spark',asset:'USDB',network:'Spark · Brale USDB',custody:'Provider connection required',available:'0',pending:'0',reserved:'0',connected:false,read:false,transfer:false,budget:false,proof:'missing',contract:'Brale USDB on Spark · exact token verification required'};}
/** Add an independent empty USD account; never convert or rewrite a saved foreign balance. */
export function withUSDAccount(w:ProductWorld):ProductWorld{
 const wallets=[...w.wallets];
 if(!wallets.some(a=>a.asset==='USD'&&a.network==='Stripe · USD')){
  const account=newUSDAccount();if(wallets.some(a=>a.id===account.id))account.id='stripe-usd';
  if(!wallets.some(a=>a.id===account.id))wallets.push(account);
 }
 if(!wallets.some(a=>a.asset==='USDB')){const account=newUSDBAccount();if(!wallets.some(a=>a.id===account.id))wallets.push(account);}
 return wallets.length===w.wallets.length?w:{...w,wallets};
}
