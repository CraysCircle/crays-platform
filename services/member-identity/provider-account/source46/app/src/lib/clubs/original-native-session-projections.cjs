'use strict';
function dto(bundle,user,clientId){
 if(!bundle)return{status:409,body:{status:'provider_authenticated_unmapped',providerAuthenticated:true,accountMapped:false,provisioningAvailable:false,session:{status:'provider_authenticated'}}};
 const a=bundle.account;
 if(!a||typeof a.account_id!=='string'||!a.account_id.trim()||a.account_id.length>200||typeof a.display_name!=='string'||!a.display_name.trim()||a.display_name.length>300||!['active','review','blocked'].includes(a.status))throw Error('ORIGINAL_CORE_SCHEMA_INVALID');
 const account={id:a.account_id,displayName:a.display_name,status:a.status,primaryContact:typeof a.primary_contact==='string'?a.primary_contact:null};
 return{status:200,body:{status:'mapped',providerAuthenticated:true,accountMapped:true,provisioningAvailable:false,
  auth0Runtime:{application:'clubs',appBaseUrlConfigured:true,baseUrlMatchesRequestOrigin:true,domainConfigured:true,clientIdConfigured:true,clientSecretConfigured:true,secretConfigured:true},
  provider:{type:'auth0',subjectPresent:true,contactPresent:typeof user.email==='string',contactVerified:user.email_verified===true,identityBinding:'issuer+subject+server-selected-client'},
  session:{status:a.status==='blocked'?'blocked':'crays_mapped',account},bookingAuthority:false,privateKeysReturned:false,secretsReturned:false}};
}
function memberSession(result){
 const d=result.body;
 if(result.status===200&&d.status==='no_provider_session')return{status:401,body:{status:'signed_out',authenticated:false,accountMapped:false,bookingAuthority:false}};
 if(result.status===409&&d.status==='provider_authenticated_unmapped')return{status:409,body:{status:'identity_binding_required',authenticated:true,accountMapped:false,bookingAuthority:false}};
 if(result.status!==200||d.status!=='mapped')return result;
 const a=d.session?.account;
 if(d.session?.status!=='crays_mapped'||a?.status!=='active')return{status:403,body:{status:'account_not_admitted',authenticated:true,accountMapped:true,bookingAuthority:false}};
 return{status:200,body:{status:'ready',authenticated:true,accountMapped:true,sessionMode:'auth0',account:{id:a.id,displayName:a.displayName,name:a.displayName,email:a.primaryContact,emailVerified:d.provider?.contactVerified===true,backendSynced:true,provider:'auth0',status:a.status},bookingAuthority:false,logoutHref:'/auth/logout?returnTo=%2Fen'}};
}

module.exports=Object.freeze({dto,memberSession});
