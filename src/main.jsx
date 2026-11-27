import React,{useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {HashRouter,useLocation,useNavigate} from 'react-router-dom';
import {Progress,Bag,Profile,Scorecard} from './Performance.jsx';
import Dashboard from './Dashboard.jsx';
import RecordingFlow,{recordingPaths} from './RecordingFlow.jsx';
import {Action,Page} from './UI.jsx';
import './style.css';
import './design.css';

const gardenPars=[4,3,5,4,4,4,3,4,5,4,3,4,5,3,4,4,3,5];
const gardenWhite=[364,185,478,300,320,300,141,275,490,320,110,271,452,155,365,280,122,461];
const defaults={rounds:[],bag:['Driver','3 Wood','5 Iron','7 Iron','9 Iron','Pitching wedge','Sand wedge','Putter'],name:'',active:null};
function App(){
 const [data,setData]=useState(()=>{try{return {...defaults,...JSON.parse(localStorage.getItem('mycaddie')||'{}')}}catch{return defaults}});
 const latest=useRef(data),[error,setError]=useState(''),[query,setQuery]=useState('');
 const {pathname:path}=useLocation(),nav=useNavigate();
 useEffect(()=>{window.scrollTo(0,0)},[path]);
 function save(change){try{const next=typeof change==='function'?change(latest.current):change;localStorage.setItem('mycaddie',JSON.stringify(next));latest.current=next;setData(next);setError('');return true}catch{setError('Unable to save. Browser storage may be full. Your unsaved changes have not been discarded.');return false}}
 const start=()=>{if(!data.active&&!save({...data,active:{id:crypto.randomUUID(),date:new Date().toISOString(),course:'Tanah Merah · Garden Course',pars:gardenPars,distances:gardenWhite,tee:'White',hole:1,shots:[],completed:[]}}))return;nav('/play')};
 if(recordingPaths.includes(path))return <>{error&&<div className="storage-error" role="alert">{error}</div>}<RecordingFlow data={data} save={save}/></>;
 const titles={'/':'Your game, in focus.','/courses':'Choose your course.','/search':'Find your course.','/course':'Garden Course.','/rounds':'Your rounds.','/progress':'Your game, over time.','/bag':'Know your distances.','/profile':'Your preferences.'};
 const selectedRound=path.startsWith('/rounds/')?data.rounds.find(r=>r.id===path.split('/')[2]):null;
 return <Page title={selectedRound?'Your round.':titles[path]||'Your game, in focus.'}>
  {error&&<p role="alert">{error}</p>}
  {path==='/'&&<Dashboard data={data}/>}
  {path==='/courses'&&<><Action to="/search" kind="outline">Search courses or location</Action><p className="eyebrow">SINGAPORE</p><img className="course-image" src={`${import.meta.env.BASE_URL}assets/course-overview.png`} alt="Garden Course satellite preview"/><h2>Tanah Merah</h2><p>Garden Course · 18 holes · Par 71</p><Action to="/course">View course</Action><Action to="/" kind="quiet">Back</Action></>}
  {path==='/search'&&<><input aria-label="Search courses" placeholder="Search courses or location" value={query} onChange={e=>setQuery(e.target.value)}/>{'tanah merah garden course singapore'.includes(query.trim().toLowerCase())?<><p>1 course found</p><h2>Tanah Merah · Garden Course</h2><p>Singapore · 18 holes</p><Action to="/course">View course</Action></>:<p>No courses found.</p>}<Action kind="cancel" onClick={()=>setQuery('')}>Clear search</Action><Action to="/courses" kind="quiet">Back</Action></>}
  {path==='/course'&&<><img className="course-image course-image-detail" src={`${import.meta.env.BASE_URL}assets/course-detail.png`} alt="Garden Course satellite preview"/><h2 className="course-name">Tanah Merah Country Club</h2><strong className="course-facts">18 holes · Par 71 · 5,389 m</strong><p className="caption">White tees · Published 2025 scorecard</p><Action onClick={start}>{data.active?'Resume current round':'Start round'}</Action><Action to="/courses" kind="quiet">Choose another course</Action><h2>Hole distances</h2>{gardenPars.map((par,i)=><div className="course-hole" key={i}><strong>{String(i+1).padStart(2,'0')}</strong><span>Par {par}</span><b>{gardenWhite[i]} m</b></div>)}<a className="source-link" href="https://www.tmcc.org.sg/wp-content/uploads/2025/04/2025_Garden-Course-Scorecard.pdf" target="_blank" rel="noreferrer">Official scorecard ↗</a></>}
  {path==='/rounds'&&<>{data.rounds.length===0?<p>Your first round starts here.</p>:data.rounds.map(r=><Action kind="outline" key={r.id} to={`/rounds/${r.id}`}><span>{r.course}<br/><small className="muted">{new Date(r.date).toLocaleDateString()} · {r.shots.length} strokes</small></span></Action>)}<Action to="/courses">Start a round</Action></>}
  {selectedRound&&<><Scorecard round={selectedRound}/><Action to="/progress">View performance</Action><Action to="/rounds" kind="quiet">Back to rounds</Action></>}
  {path==='/progress'&&<Progress data={data}/>}
  {path==='/bag'&&<Bag data={data} save={save}/>}
  {path==='/profile'&&<Profile data={data} save={save}/>}
 </Page>;
}
createRoot(document.getElementById('root')).render(<HashRouter><App/></HashRouter>);

import './golf-theme.css';
