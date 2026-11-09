import type {Wallet} from './productModel.ts';
// Display policy only. This never grants wallet access, validates a proof or authorises a transfer.
export function walletBalancePresentation(wallet:Wallet){
 const connected=wallet.connected===true,canRead=connected&&wallet.read===true;
 const requiresProof=['rgb','utexo'].includes(wallet.id)||/(?:^|[ /·])RGB(?:$|[ /·])/i.test(wallet.network);
 const needsValidation=canRead&&requiresProof&&wallet.proof!=='valid';
 const mayDisplay=canRead&&!needsValidation;
 const quantity=(value:string)=>mayDisplay&&typeof value==='string'&&/^\d+(?:\.\d+)?$/.test(value.trim())&&Number.isFinite(Number(value))?value:'—';
 const available=quantity(wallet.available),pending=quantity(wallet.pending),reserved=quantity(wallet.reserved);
 const reason=!connected?'Connect balance access to see this source.':wallet.read!==true?'Balance access is off for this connection.':needsValidation?'Validate this source’s RGB proof before its quantities can be shown.':available==='—'?'The available balance is not supplied.':'';
 const status=!connected?'Not connected':wallet.read!==true?'Connected · balance access off':needsValidation?'Connected · validation needed':'Connected in preview';
 const unit=(value:string)=>value==='—'?'—':`${value} ${wallet.asset}`;
 return {canRead,needsValidation,mayDisplay,available,pending,reserved,reason,status,availableWithUnit:unit(available),pendingWithUnit:unit(pending),reservedWithUnit:unit(reserved)};
}
