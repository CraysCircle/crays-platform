import {Area,AreaChart,CartesianGrid,ResponsiveContainer,Tooltip,XAxis,YAxis} from '/home/craysdev/codex-chat-projects/member/output/gym-unified-integration-20261028/health-data-ui-integration-20261101/chart-runtime/node_modules/recharts';
import type {TrainingProgress} from './client/training-api';

/** Actual original Recharts installation, not a handmade graph or data filler.
 * Unknown points remain gaps. Every categorical point retains its session ID. */
export default function OriginalTrainingVolumeChart({history}:{history:TrainingProgress['history']}){
 const rows=history.slice(0,12).reverse();
 const date=(id:string,full=false)=>{const row=rows.find(item=>item.sessionId===id);return row?new Intl.DateTimeFormat('en-GB',{timeZone:row.timezone,...(full?{dateStyle:'medium',timeStyle:'short'} as const:{day:'numeric',month:'short'} as const)}).format(new Date(row.completedAt))+(full?' · '+row.timezone:''):id;};
 return <div style={{width:'100%',height:240,minWidth:0}} role="group" aria-label="Recorded volume across the last twelve returned completed workouts. Missing values remain gaps; the exact values are listed below."><ResponsiveContainer width="100%" height="100%"><AreaChart data={rows} accessibilityLayer><CartesianGrid stroke="#d6e3ef" strokeDasharray="3 3"/><XAxis dataKey="sessionId" tickFormatter={id=>date(String(id))} minTickGap={24}/><YAxis width={48}/><Tooltip labelFormatter={id=>date(String(id),true)} formatter={value=>[value==null?'Not supplied':String(value)+' kg','Recorded volume']}/><Area type="linear" dataKey="volumeKg" name="Recorded volume" stroke="#082638" fill="#cd003c" fillOpacity={0.12} connectNulls={false} dot={{r:3}} isAnimationActive={false}/></AreaChart></ResponsiveContainer></div>;
}
