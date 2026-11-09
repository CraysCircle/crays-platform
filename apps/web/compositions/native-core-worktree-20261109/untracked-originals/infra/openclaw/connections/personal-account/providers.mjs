const G='https://www.googleapis.com/auth/';
const deepFreeze=x=>{for(const v of Object.values(x))if(v&&typeof v==='object')deepFreeze(v);return Object.freeze(x);};
export const PROVIDERS=deepFreeze({
 google:Object.freeze({authorization:'https://accounts.google.com/o/oauth2/v2/auth',token:'https://oauth2.googleapis.com/token',userinfo:'https://openidconnect.googleapis.com/v1/userinfo',issuer:'https://accounts.google.com',identity:['openid','profile','email'],pkce:true,actions:Object.freeze({'profile.read':[], 'mail.read':[G+'gmail.readonly'],'mail.draft':[G+'gmail.compose'],'mail.send':[G+'gmail.send'],'mail.modify':[G+'gmail.modify'],'calendar.read':[G+'calendar.events.readonly'],'calendar.modify':[G+'calendar.events']})}),
 microsoft:Object.freeze({authorization:'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',token:'https://login.microsoftonline.com/common/oauth2/v2.0/token',userinfo:'https://graph.microsoft.com/oidc/userinfo',identity:['openid','profile','email','offline_access'],pkce:true,actions:Object.freeze({'profile.read':[], 'mail.read':['Mail.Read'],'mail.draft':['Mail.ReadWrite'],'mail.send':['Mail.Send'],'mail.modify':['Mail.ReadWrite'],'calendar.read':['Calendars.Read'],'calendar.modify':['Calendars.ReadWrite']})}),
 linkedin:Object.freeze({authorization:'https://www.linkedin.com/oauth/v2/authorization',token:'https://www.linkedin.com/oauth/v2/accessToken',userinfo:'https://api.linkedin.com/v2/userinfo',issuer:'https://www.linkedin.com',identity:['openid','profile','email'],pkce:false,actions:Object.freeze({'profile.read':[]})})
});
export function actionScopes(provider,actions){
 const p=Object.hasOwn(PROVIDERS,provider)?PROVIDERS[provider]:null;
 if(!p||!Array.isArray(actions)||!actions.length||actions.length>8||Reflect.ownKeys(actions).length!==actions.length+1)throw Error('ACTION_DENIED');
 for(let i=0;i<actions.length;i++)if(!Object.hasOwn(actions,i)||!Object.hasOwn(Object.getOwnPropertyDescriptor(actions,String(i))??{},'value')||typeof actions[i]!=='string'||!Object.hasOwn(p.actions,actions[i]))throw Error('ACTION_DENIED');
 if(new Set(actions).size!==actions.length)throw Error('ACTION_DENIED');
 return [...new Set(actions.flatMap(a=>p.actions[a]))].sort();
}
