import React,{useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {ResponsiveContainer,LineChart,Line,CartesianGrid,XAxis,YAxis,Tooltip} from 'recharts';
import {Action,Choices} from './UI.jsx';
import {strokesOn,playedHoles,scoreToPar,formatToPar,scoreName,nineTotals,isFull18,isNine,formatDistance,toDisplayUnits,plural,formatDate,parseBackup} from './round.js';

export const completeRound=isFull18;
const measuredShots=data=>[...data.rounds,...(data.active?[data.active]:[])].flatMap(r=>r.shots).filter(s=>s.type==='shot'&&Number.isFinite(s.distance));
export function clubAverages(data){
 const by={};
 measuredShots(data).forEach(s=>{(by[s.club]??=[]).push(s.distance)});
 return Object.fromEntries(Object.entries(by).map(([c,ds])=>[c,Math.round(ds.reduce((a,b)=>a+b,0)/ds.length)]));
}
function Card({title,subtitle,onClick,to}){const content=<><span className="card-title">{title} <span aria-hidden="true">›</span></span><p>{subtitle}</p></>;return to?<Link className="detail-card" to={to}>{content}</Link>:<button type="button" className="detail-card" onClick={onClick}>{content}</button>}

/** One row per hole plus Out / In / Total, with golf score marks (circle = under par, square = over par). */
export function ScoreList({round,onSelect,current}){
 const row=h=>{const n=strokesOn(round,h),par=round.pars?.[h-1],diff=n&&par?n-par:null;
  return <button type="button" className={`score-line${current===h?' current':''}`} key={h} onClick={()=>onSelect(h)} aria-label={`Hole ${h}, par ${par??'unknown'}, ${n?`${plural(n,'stroke')}, ${scoreName(n,par)}`:'no score'}`}>
   <strong>Hole {h}</strong><span>Par {par??'—'}</span><b className={diff===null?'':`score-mark score-${Math.max(-2,Math.min(2,diff))}`}>{n||'—'}</b></button>};
 const total=(label,t)=><div className="score-total" key={label}><strong>{label}</strong><span>Par {t.par}</span><b>{t.played?t.strokes:'—'}</b></div>;
 const out=nineTotals(round,1),inn=nineTotals(round,10);
 return <div className="round-score-list">
  {Array.from({length:9},(_,i)=>row(i+1))}{total('Out',out)}
  {Array.from({length:9},(_,i)=>row(i+10))}{total('In',inn)}
  {total('Total',{par:out.par+inn.par,strokes:out.strokes+inn.strokes,played:out.played+inn.played})}
 </div>;
}

export function Progress({data}){
 const [params,setParams]=useSearchParams(),view=params.get('view');
 const full=data.rounds.filter(isFull18),nines=data.rounds.filter(isNine);
 const useNine=!full.length&&nines.length>0,counted=(useNine?nines:full).slice(0,6),scores=counted.map(r=>r.shots.length);
 const shots=data.rounds.flatMap(r=>r.shots),holesPlayed=data.rounds.reduce((n,r)=>n+playedHoles(r).length,0);
 if(view==='scoring'){
  const dist={'Eagle or better':0,Birdie:0,Par:0,Bogey:0,'Double bogey or worse':0};
  data.rounds.forEach(r=>playedHoles(r).forEach(h=>{const d=strokesOn(r,h)-(r.pars?.[h-1]??0);dist[d<=-2?'Eagle or better':d===-1?'Birdie':d===0?'Par':d===1?'Bogey':'Double bogey or worse']++}));
  const putts=shots.filter(s=>s.type==='putt').length,pens=shots.filter(s=>s.type==='penalty').length;
  return <><section className="metric-card"><p>PUTTS PER HOLE</p><strong>{holesPlayed?(putts/holesPlayed).toFixed(1):'—'}</strong><p>{plural(putts,'putt')} over {plural(holesPlayed,'hole')}</p></section><section className="metric-card"><p>PENALTIES</p><strong>{pens}</strong><p>{holesPlayed?`${(pens/holesPlayed*18).toFixed(1)} per 18 holes`:'Penalty strokes recorded'}</p></section><section className="detail-card"><span className="card-title">Scoring by hole</span>{Object.entries(dist).map(([k,v])=><p key={k}>{k}: {plural(v,'hole')}</p>)}</section><p>Based on {plural(data.rounds.length,'saved round')}, including partial rounds.</p><Action kind="quiet" onClick={()=>setParams({})}>Back to progress</Action></>;
 }
 return <><section className="metric-card"><p>{useNine?'9-HOLE AVERAGE':'AVERAGE SCORE'}</p><strong>{scores.length?(scores.reduce((a,b)=>a+b,0)/scores.length).toFixed(1):'—'}</strong><p>{scores.length?`Last ${plural(scores.length,useNine?'9-hole round':'complete round')} · Best ${Math.min(...scores)}`:'Finish 9 or 18 holes to establish your average.'}</p></section><div className="trend-card">{scores.length?<ResponsiveContainer width="100%" height={134}><LineChart data={[...counted].reverse().map((r,i)=>({round:i+1,score:r.shots.length}))}><CartesianGrid vertical={false} stroke="#e0e6d8"/><XAxis hide dataKey="round"/><YAxis hide domain={['dataMin - 2','dataMax + 2']}/><Tooltip/><Line dataKey="score" stroke="#2f6b4f" strokeWidth={4} dot={{r:4}} isAnimationActive={false}/></LineChart></ResponsiveContainer>:<p>Your score trend will appear here. Partial rounds remain in your history.</p>}</div>{scores.length>0&&<div className="score-labels">{[...scores].reverse().map((s,i)=><span key={i}>{s}</span>)}</div>}<Card title="Where strokes are lost" subtitle="Putts, penalties and scoring by hole" onClick={()=>setParams({view:'scoring'})}/><Card title="Club distances" subtitle="Distance and consistency" to="/bag"/><Action kind="outline" to="/rounds">Review your rounds</Action></>;
}

export function Bag({data,save}){
 const [params,setParams]=useSearchParams(),view=params.get('view'),club=params.get('club');
 const [name,setName]=useState(''),[error,setError]=useState('');
 const units=data.units||'m',fmt=m=>formatDistance(m,units);
 const measured=measuredShots(data);
 const forClub=c=>measured.filter(s=>s.club===c),average=ss=>ss.length?Math.round(ss.reduce((n,s)=>n+s.distance,0)/ss.length):null;
 const add=()=>{const value=name.trim();if(!value||data.bag.some(c=>c.toLowerCase()===value.toLowerCase()))return setError('Enter a unique club name.');if(save({...data,bag:[...data.bag,value]})){setName('');setError('');setParams({view:'manage'})}};
 const rename=()=>{const value=name.trim();if(!value||data.bag.some(c=>c!==club&&c.toLowerCase()===value.toLowerCase()))return setError('Enter a unique club name.');const renameRound=r=>({...r,selectedClub:r.selectedClub===club?value:r.selectedClub,draft:r.draft?.club===club?{...r.draft,club:value}:r.draft,shots:r.shots.map(s=>s.club===club?{...s,club:value}:s)});if(save({...data,bag:data.bag.map(c=>c===club?value:c),rounds:data.rounds.map(renameRound),active:data.active?renameRound(data.active):null})){setParams({view:'manage'});setError('')}};
 if(view==='add'||view==='edit')return <><h2>{view==='add'?'Add a club.':club}</h2><label>Club name<input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. 5 Wood"/></label>{error&&<p role="alert">{error}</p>}<Action onClick={view==='add'?add:rename}>{view==='add'?'Add club':'Save club'}</Action>{view==='edit'&&<Action kind="danger" onClick={()=>{if(save({...data,bag:data.bag.filter(c=>c!==club)}))setParams({view:'manage'})}}>Remove club</Action>}<Action kind="cancel" onClick={()=>{setParams({view:'manage'});setError('')}}>Cancel</Action></>;
 if(view==='club'&&club){const ss=forClub(club),withDir=ss.filter(s=>s.miss);return <><section className="metric-card"><p>{club.toUpperCase()}</p><strong>{average(ss)===null?'—':fmt(average(ss))}</strong><p>{plural(ss.length,'measured shot')} · Average total distance</p></section><section className="detail-card"><span className="card-title">Shot patterns</span>{withDir.length?['Left','Centre','Right','Short','Long'].map(m=><p key={m}>{m}: {plural(withDir.filter(s=>s.miss===m).length,'shot')}</p>):<p>Add a direction when you record or edit a shot to see your patterns.</p>}</section><p>GPS and manual distances include roll; carry and lateral spread are not measured.</p><Action kind="quiet" onClick={()=>setParams({})}>Back to bag</Action></>}
 return <>{data.bag.map(c=>{const ss=forClub(c),avg=average(ss);return <Card key={c} title={<>{c}<span>{view==='manage'?'':avg===null?'—':fmt(avg)}</span></>} subtitle={view==='manage'?'Included in your bag':`${plural(ss.length,'measured shot')}${ss.length?` · ${toDisplayUnits(Math.min(...ss.map(s=>s.distance)),units)}–${fmt(Math.max(...ss.map(s=>s.distance)))} range`:' · No distance recorded yet'}`} onClick={()=>{setName(c);setError('');setParams({view:view==='manage'?'edit':'club',club:c})}}/>})}{view==='manage'?<><Action onClick={()=>{setName('');setParams({view:'add'})}}>Add a club</Action><Action kind="cancel" onClick={()=>setParams({})}>Close bag editor</Action></>:<Action kind="outline" onClick={()=>setParams({view:'manage'})}>Manage bag</Action>}</>;
}

export function Scorecard({round,units='m'}){
 const [selected,setSelected]=useState(null);
 const holes=playedHoles(round),putts=round.shots.filter(s=>s.type==='putt').length,pens=round.shots.filter(s=>s.type==='penalty').length;
 if(selected!==null){const shots=round.shots.filter(s=>s.hole===selected),par=round.pars?.[selected-1];return <><h2>Hole {selected}</h2><p>Par {par??'—'} · {plural(shots.length,'stroke')}{shots.length&&par?` · ${scoreName(shots.length,par)}`:''}</p>{shots.length?shots.map((s,i)=><div className="detail-card" key={s.id}><span className="card-title">{i+1}. {s.type==='shot'?s.club:s.type==='putt'?'Putt':s.type==='penalty'?'Penalty':'Stroke'}</span><p>{s.type==='shot'?[formatDistance(s.distance,units),s.lie,s.miss].filter(Boolean).join(' · '):'1 stroke'}</p></div>):<p>No strokes recorded.</p>}<Action kind="quiet" onClick={()=>setSelected(null)}>Back to scorecard</Action></>}
 return <div className="scorecard"><p>{round.course} · {round.tee||'Recorded'} tees · {formatDate(round.date)}</p><strong className="big-score">{holes.length?`${plural(round.shots.length,'stroke')} · ${formatToPar(scoreToPar(round))}`:'No strokes'}</strong><div className="round-summary"><div><b>{holes.length}</b><span>Holes played</span></div><div><b>{putts}</b><span>Putts</span></div><div><b>{pens}</b><span>Penalties</span></div></div><ScoreList round={round} onSelect={setSelected}/></div>;
}

export function Profile({data,save}){
 const [params,setParams]=useSearchParams(),view=params.get('view');
 const [pending,setPending]=useState(null),[message,setMessage]=useState('');
 const backup=()=>{const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));a.href=url;a.download=`mycaddie-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
 const pick=async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;try{setPending(parseBackup(await file.text()));setMessage('')}catch(err){setPending(null);setMessage(err.message)}};
 const restore=()=>{if(save({...data,...pending,active:pending.active??null})){setMessage(`Restored ${plural(pending.rounds.length,'round')}.`);setPending(null)}};
 const units=data.units||'m';
 if(view==='units')return <><h2>Distance units.</h2><p>Choose how distances are shown and entered. Saved shots are kept in metres and converted for display.</p>{[['m','Metres'],['yd','Yards']].map(([u,label])=><Action key={u} kind={units===u?'tonal':'outline'} aria-pressed={units===u} onClick={()=>save({...data,units:u})}>{label}{units===u?' ✓':''}</Action>)}<Action kind="quiet" onClick={()=>setParams({})}>Back</Action></>;
 if(view==='conditions')return <><h2>Before you tee off.</h2><Choices label="Weather" options={['Not recorded','Sunny','Cloudy','Rain']} value={data.weather||'Not recorded'} onChange={weather=>save({...data,weather})}/><Choices label="Wind" options={['Not recorded','Calm','Light','Moderate','Strong']} value={data.wind||'Not recorded'} onChange={wind=>save({...data,wind})}/><p>Manually selected conditions are saved with new shots.</p><Action to="/courses" kind="outline">Choose course</Action><Action kind="quiet" onClick={()=>setParams({})}>Back to preferences</Action></>;
 if(view==='data')return <><label>Your name<input value={data.name} onChange={e=>save({...data,name:e.target.value})} placeholder="Your name"/></label><p>Your rounds and preferences are saved on this device only. Download a backup regularly, and add MyCaddie to your home screen so the browser keeps your data.</p><Action kind="outline" onClick={backup}>Download data backup</Action><label className="action action-outline file-action">Restore from backup<input type="file" accept="application/json,.json" onChange={pick}/></label>{pending&&<><p className="warning-note" role="alert">This replaces everything on this device with the backup ({plural(pending.rounds.length,'round')}, {plural(pending.bag.length,'club')}).</p><Action kind="danger" onClick={restore}>Replace my data</Action><Action kind="quiet" onClick={()=>setPending(null)}>Cancel restore</Action></>}{message&&<p role="status">{message}</p>}<Action kind="quiet" onClick={()=>setParams({})}>Back</Action></>;
 return <><Card title="Distance units" subtitle={`${units==='yd'?'Yards':'Metres'} · Change display preference`} onClick={()=>setParams({view:'units'})}/><Card title="Your clubs" subtitle="Manage your equipment" to="/bag?view=manage"/><Card title="Course & conditions" subtitle={data.active?.course||'Preferences for your next round'} onClick={()=>setParams({view:'conditions'})}/><p>Preferences and rounds are saved on this device.</p><Action kind="outline" onClick={()=>setParams({view:'data'})}>Your name, backup & restore</Action><Action to="/" kind="quiet">Back to home</Action></>;
}
