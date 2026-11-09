/** Search only the current reader's already-authorized message snapshot. */
export function searchConversationMessages(snapshot,query){
 const needle=String(query??'').slice(0,200).trim().normalize('NFC').toLocaleLowerCase();
 if(!needle||!snapshot.available||['closed','unavailable','loading'].includes(snapshot.state))return {matches:[],total:0};
 const matches=[],seen=new Set();let total=0;
 for(const row of snapshot.messages){
  if(seen.has(row.id))continue;seen.add(row.id);
  const text=String(row.text??'').normalize('NFC'),index=text.toLocaleLowerCase().indexOf(needle);
  if(index<0)continue;total++;
  if(matches.length<100){const begin=Math.max(0,index-45),end=Math.min(text.length,index+needle.length+90);matches.push({id:row.id,author:row.author,excerpt:(begin?'…':'')+text.slice(begin,end)+(end<text.length?'…':''),createdAt:row.createdAt});}
 }
 return {matches,total};
}
