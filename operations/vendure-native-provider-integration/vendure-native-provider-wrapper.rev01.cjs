'use strict';
const fs=require('node:fs');
const launch=JSON.parse(fs.readFileSync('/run/crays/original-launch.json','utf8'));
if(launch.Id!=='c7fc469dc0b58a43cecbc82b1ff9da5685d2fcc2a3e506d939b7f7a03728ef4f')throw Error('ORIGINAL_LAUNCH_ID_REQUIRED');
for(const item of launch.Config.Env){const i=item.indexOf('=');if(i>0)process.env[item.slice(0,i)]=item.slice(i+1);}
process.env.DB_HOST='crays-prod-postgres-20261106-01.cpewggqg89tp.eu-central-2.rds.amazonaws.com';
process.env.DB_PORT='5432';process.env.DB_NAME='crays_business_vendure';process.env.API_HOSTNAME='0.0.0.0';
const {config}=require('/app/dist/config.js');
if(config.dbConnectionOptions.synchronize!==false||config.dbConnectionOptions.username!=='crays_vendure'||config.dbConnectionOptions.database!=='crays_business_vendure')throw Error('ORIGINAL_SCOPED_NATIVE_CONFIGURATION_REQUIRED');
config.dbConnectionOptions.ssl={ca:fs.readFileSync('/run/crays/rds-ca.pem','utf8'),rejectUnauthorized:true,servername:process.env.DB_HOST};
// Configure the original module before its original index requires it from the module cache.
// Necessary AWS-private original asset transport only; native permission/channel guards stay native.
const {OriginalAssetDeliveryPlugin}=require('/run/crays/original-asset-delivery-controller.cjs');
if(typeof OriginalAssetDeliveryPlugin!=='function'||!Array.isArray(config.plugins)||config.plugins.some(p=>p&&p.name==='OriginalAssetDeliveryPlugin'))throw Error('ORIGINAL_ASSET_PLUGIN_REGISTRATION_REQUIRED');
config.plugins.push(OriginalAssetDeliveryPlugin);
const originalAssetStorage=config.assetOptions.assetStorageStrategy;
if(!originalAssetStorage||typeof originalAssetStorage.toAbsoluteUrl!=='function')throw Error('ORIGINAL_ASSET_STORAGE_REQUIRED');
const privateAssetUrl=(request,name)=>{
  const legacy=originalAssetStorage.toAbsoluteUrl(request,name);
  const prefix='http://127.0.0.1:42516/task-assets/';
  if(typeof legacy!=='string'||!legacy.startsWith(prefix))throw Error('ORIGINAL_ASSET_URL_CONTRACT_REQUIRED');
  const filename=decodeURIComponent(legacy.slice(prefix.length));
  if(!/^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/.test(filename)||legacy!==prefix+encodeURIComponent(filename))throw Error('ORIGINAL_ASSET_URL_CONTRACT_REQUIRED');
  return 'http://172.27.0.2:3000/task-assets/'+encodeURIComponent(filename);
};
config.assetOptions.assetStorageStrategy=new Proxy(originalAssetStorage,{get(target,key){
  if(key==='toAbsoluteUrl')return privateAssetUrl;
  const value=Reflect.get(target,key,target);
  return typeof value==='function'?value.bind(target):value;
}});
require('/app/dist/index.js');
