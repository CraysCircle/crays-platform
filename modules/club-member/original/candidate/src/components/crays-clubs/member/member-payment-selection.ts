export function paymentOrderHash(orderId:string):string {
 if(!/^[1-9][0-9]{0,19}$/.test(orderId))throw new Error("Invalid order reference");
 return `#payments/${orderId}`;
}
export function selectPaymentOrder<T extends {orderId:string}>(orders:readonly T[],hash:string):{order:T|undefined;unavailable:boolean} {
 if(hash==="#payments"||hash==="")return {order:orders[0],unavailable:false};
 const match=/^#payments\/([1-9][0-9]{0,19})$/.exec(hash);
 if(!match)return {order:undefined,unavailable:true};
 const order=orders.find(item=>item.orderId===match[1]);
 return {order,unavailable:!order};
}
