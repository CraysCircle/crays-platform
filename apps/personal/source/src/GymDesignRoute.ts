import type {GymRoute,GymHistoryContext} from './gym-design/GymPrototype';

const surfaces=new Set(['today','book','health','training','progress','nutrition','recipes','shop','coaching','more','access','membership','profile','support','connections','referrals']);
const historyStates=new Set(['ACTIVE','PAUSED','ABORTED','COMPLETED']);
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const validDate=(value:string)=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
function checkedHistory(params:URLSearchParams):GymHistoryContext|null{
 if([...params.keys()].some(key=>!['state','from','to','session'].includes(key)||params.getAll(key).length!==1))return null;
 const state=params.get('state'),from=params.get('from'),to=params.get('to'),sessionId=params.get('session');
 if(state!==null&&!historyStates.has(state)||from!==null&&!validDate(from)||to!==null&&!validDate(to)||from&&to&&from>to||sessionId!==null&&!uuid.test(sessionId))return null;
 return {...(state?{state:state as NonNullable<GymHistoryContext['state']>}:{}),...(from?{from}:{}),...(to?{to}:{}),...(sessionId?{sessionId}:{})};
}
export function isGymEntry(){return /^\/personal\/gym\/?$/.test(window.location.pathname)||(window.location.pathname==='/'&&/^#gym(?:\/|$)/.test(window.location.hash))}
export function readGymRoute(hash=window.location.hash):GymRoute{
 try{
  if(hash.length>2048)return {surface:'today'};
  const queryAt=hash.indexOf('?'),fragment=queryAt<0?hash:hash.slice(0,queryAt),params=new URLSearchParams(queryAt<0?'':hash.slice(queryAt+1));
  const parts=fragment.replace(/^#(?:gym(?:\/|$))?/,'').split('/');
  const surface=decodeURIComponent(parts[0]||'today');
  if(!surfaces.has(surface)||parts.length>2)return {surface:'today'};
  const tab=parts[1]===undefined?undefined:decodeURIComponent(parts[1]);
  if(tab!==undefined&&(!tab||tab.length>120||/[\u0000-\u001f]/.test(tab)))return {surface:'today'};
  if(!params.size)return {surface,tab};
  if(surface!=='training'||tab!=='History')return {surface:'today'};
  const history=checkedHistory(params);return history?{surface,tab,history}:{surface:'today'};
 }catch{return {surface:'today'}}
}
export function gymDesignHref(route:GymRoute){
 const safe:GymRoute=surfaces.has(route.surface)?route:{surface:'today'};
 const href='/personal/gym#'+encodeURIComponent(safe.surface)+(safe.tab?'/'+encodeURIComponent(safe.tab):'');
 if(safe.surface!=='training'||safe.tab!=='History'||!safe.history)return href;
 const params=new URLSearchParams();
 for(const key of ['state','from','to','sessionId'] as const){const value=safe.history[key];if(typeof value==='string'&&value)params.set(key==='sessionId'?'session':key,value);}
 return params.size&&checkedHistory(params)?href+'?'+params:href;
}
