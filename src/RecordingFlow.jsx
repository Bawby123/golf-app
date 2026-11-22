import React,{useEffect,useRef,useState} from 'react';
import {useLocation,useNavigate} from 'react-router-dom';
import {Action,Page,Choices} from './UI.jsx';
import {locate,metresBetween} from './gps.js';
import {commitShot,gpsMeasurement} from './round.js';
import HoleSelector from './HoleSelector.jsx';

export const recordingPaths=['/play','/shot','/clubs','/manual','/holes','/more','/gps','/map','/scorecard','/hole-shots','/finish','/end','/cancel','/shot-details'];
const asset=name=>`${import.meta.env.BASE_URL}assets/${name}`;

export default function RecordingFlow({data,save}){
  const {pathname:path}=useLocation(),nav=useNavigate();
  const round=data.active,draft=round?.draft,club=draft?.club||round?.selectedClub||data.bag[0]||'Driver';
  const shots=round?.shots.filter(s=>s.hole===round.hole)||[];
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[toast,setToast]=useState(false),[point,setPoint]=useState(null),[signal,setSignal]=useState('Waiting for GPS…');
  const operation=useRef(0),locked=useRef(false),current=useRef(data);current.current=data;
  const returnTo=useRef('/play');
  useEffect(()=>()=>{operation.current++},[]);
  useEffect(()=>{window.scrollTo(0,0)},[path]);
  useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(false),4000);return ()=>clearTimeout(timer)},[toast]);
  useEffect(()=>{
    setPoint(null);
    if(!draft?.start||draft.manual!==undefined||!navigator.geolocation)return;
    let active=true;
    const id=navigator.geolocation.watchPosition(p=>{
      if(!active)return;
      if(p.coords.accuracy>50){setSignal('Weak GPS signal · Last reliable distance');return}
      setPoint({latitude:p.coords.latitude,longitude:p.coords.longitude,accuracy:p.coords.accuracy});
      setSignal(`GPS ±${Math.round(p.coords.accuracy)} m · Straight-line distance`);
    },()=>{if(active)setSignal('GPS unavailable · Use manual distance')},{enableHighAccuracy:true,maximumAge:0,timeout:15000});
    return ()=>{active=false;navigator.geolocation.clearWatch(id)};
  },[draft?.start?.timestamp,draft?.id,draft?.manual]);
  if(!round)return <Page title="Ready when you are."><Action to="/courses">Choose a course to begin</Action></Page>;
  const update=fn=>save(d=>({...d,active:d.active?.id===round.id?fn(d.active):d.active}));
  const makeDraft=()=>({id:crypto.randomUUID(),hole:round.hole,club});
  const ensureDraft=()=>{if(!current.current.active?.draft)update(r=>({...r,draft:makeDraft()}))};
  const changeDraft=patch=>update(r=>({...r,draft:{...(r.draft||makeDraft()),...patch}}));
  const start=async()=>{
    if(locked.current)return;
    if(draft){nav('/shot');return}
    locked.current=true;setBusy(true);setError('');setToast(false);
    const token=++operation.current,newDraft=makeDraft();
    if(!update(r=>({...r,draft:newDraft}))){locked.current=false;setBusy(false);return}
    nav('/shot');
    try{const p=await locate();if(token!==operation.current)return;if(p.accuracy>50)throw new Error('GPS accuracy is over 50 m. Try outdoors or enter a manual distance.');update(r=>({...r,draft:r.draft?.id===newDraft.id?{...r.draft,start:p}:r.draft}))}
    catch(e){if(token===operation.current){setError(e.message);nav('/gps')}}
    finally{if(token===operation.current){locked.current=false;setBusy(false)}}
  };
  const retryGPS=async()=>{
    if(locked.current)return;
    locked.current=true;setBusy(true);setError('');const token=++operation.current;ensureDraft();
    try{const p=await locate();if(token!==operation.current)return;if(p.accuracy>50)throw new Error('GPS accuracy is over 50 m. Try again outdoors.');changeDraft({start:p,manual:undefined});nav('/shot')}
    catch(e){if(token===operation.current)setError(e.message)}finally{if(token===operation.current){locked.current=false;setBusy(false)}}
  };
  const saveShot=async()=>{
    if(locked.current)return;
    const activeDraft=current.current.active?.draft;
    if(!activeDraft){nav('/manual');return}
    if(activeDraft.manual===undefined&&!activeDraft.start){nav('/gps');return}
    locked.current=true;setBusy(true);setError('');const token=++operation.current;
    try{
      const measurement=activeDraft.manual!==undefined?{distance:Number(activeDraft.manual),measurement:'manual'}:gpsMeasurement(activeDraft.start,await locate());
      if(activeDraft.manual==='')throw new Error('Enter a distance before saving.');
      if(token!==operation.current)return;
      const ok=update(r=>r.draft?.id===activeDraft.id?commitShot(r,activeDraft,measurement,current.current):r);
      if(ok){setToast(true);nav('/play')}
    }catch(e){if(token===operation.current){setError(e.message);nav(activeDraft.manual!==undefined?'/manual':'/gps')}}
    finally{if(token===operation.current){locked.current=false;setBusy(false)}}
  };
  const discard=()=>{operation.current++;locked.current=false;setBusy(false);setError('');update(r=>({...r,draft:null}));nav('/play')};
  const quickStroke=type=>{const s={id:crypto.randomUUID(),hole:round.hole,club:type==='putt'?'Putter':club,type,distance:null,measurement:'manual'};if(update(r=>({...r,shots:[...r.shots,s]}))){setToast(true);nav('/play')}};
  const chooseClub=()=>{returnTo.current=path;nav('/clubs')};
  const selectHole=hole=>{update(r=>({...r,hole}));setToast(false);nav('/play')};
  const finish=()=>{if(update(r=>({...r,completed:[...new Set([...(r.completed||[]),r.hole])],hole:Math.min(18,r.hole+1)})))nav(round.hole===18?'/scorecard':'/play')};
  const end=()=>{const {draft:ignored,...finished}=round;if(save(d=>({...d,active:null,rounds:[{...finished,finished:new Date().toISOString()},...d.rounds]})))nav(`/rounds/${round.id}`)};
  const goManual=()=>{operation.current++;locked.current=false;setBusy(false);setError('');ensureDraft();nav('/manual')};
  const edit=s=>{update(r=>({...r,draft:{...s,editing:true,manual:s.distance??0}}));nav('/manual')};
  const undo=()=>{if(shots.length)update(r=>({...r,shots:r.shots.filter(s=>s.id!==shots.at(-1).id)}))};
  const back=draft?'/shot':'/play';
  const distance=draft?.manual!==undefined?(draft.manual||'—'):point&&draft?.start?Math.round(metresBetween(draft.start,point)):0;
  const map=(full=false)=><section className={full?'full-map':'course-map'} aria-label="Course map preview">
    <img src={asset(full?'full-map.png':'map-preview.png')} alt="Satellite preview of Garden Course, not a live location map"/>
    {full?<><Action to={back} kind="outline">Back to recording</Action><div className="full-map-caption"><strong>GARDEN COURSE</strong><p>Map preview · Esri World Imagery</p><p>Google Maps integration area</p></div></>:<><span className="map-status">{path==='/shot'?'Tracking shot':'Course overview'}</span><Action to="/map" kind="map">Full map</Action><p className="map-credit">Map preview · Esri World Imagery</p>{toast&&<div className="shot-toast" role="status"><strong>Shot recorded</strong><p>Stroke added. Ready for your next shot.</p></div>}</>}
  </section>;
  if(path==='/map')return <div className="app design-app">{map(true)}</div>;
  if(path==='/play'||path==='/shot')return <div className="app design-app recorder">
    <header className="record-header"><div><small>{round.course.split('·').at(-1).trim().toUpperCase()}</small><Action to="/scorecard" kind="quiet">Scorecard</Action></div><div><Action to="/holes" kind="outline">HOLE {round.hole}</Action><strong>{shots.length} {shots.length===1?'stroke':'strokes'}</strong></div></header>
    {map()}
    <main className="thumb-controls">{path==='/play'?<>
      <div className="club-actions"><Action kind="outline" onClick={chooseClub}>{club}</Action><Action kind="tonal" onClick={()=>quickStroke('putt')}>+ Putt</Action></div>
      <Action onClick={start} disabled={busy}>{draft?'Resume measurement':toast?'Record next shot':'Record shot · Mark start'}</Action>
      <div className="two-actions"><Action to="/finish" kind="outline">Finish hole</Action><Action to="/more" kind="quiet">More</Action></div>
      <p className={toast?'success-note':''}>{toast?'Ready for your next shot.':'Select your club. Mark your starting point.'}</p>
    </>:<>
      <div className="measurement-row"><div className="distance-readout" aria-label="Live shot distance"><span>SHOT DISTANCE</span><strong>{distance} m</strong></div><Action kind="outline" onClick={chooseClub}>{club}</Action></div>
      <Action onClick={saveShot} disabled={busy}>{busy?'Finding your location…':draft?.editing?'Save changes':'Save shot · Mark end'}</Action>
      <div className="two-actions"><Action kind="quiet" onClick={goManual}>Manual distance</Action><Action to="/cancel" kind="cancel">Cancel shot</Action></div>
      <p role="status">{busy?'Keep this page open while GPS finds your position.':draft?.manual!==undefined?'Manual distance · Save when ready.':'Walk to your ball, then save.'}</p>
      {draft?.start&&draft.manual===undefined&&<p className="gps-status">{signal}</p>}
    </>}</main>
  </div>;
  const titles={'/clubs':'Choose your club.','/manual':draft?.editing?'Edit your shot.':'Enter shot distance.','/holes':'Choose a hole.','/more':'Round actions.','/gps':'GPS unavailable.','/scorecard':'Your round.','/hole-shots':`Hole ${round.hole}.`,'/finish':'Finish this hole?','/end':'Save and end round?','/cancel':'Cancel this shot?','/shot-details':'Shot details.'};
  return <Page title={titles[path]||'Your round.'}>
    {error&&<p role="alert" className="error-message">{error}</p>}
    {path==='/clubs'&&<><p>Your bag</p>{data.bag.map(c=><Action key={c} kind={club===c?'tonal':'outline'} aria-pressed={club===c} onClick={()=>{update(r=>({...r,selectedClub:c,draft:r.draft?{...r.draft,club:c}:null}));nav(returnTo.current)}}>{c}</Action>)}<Action to={back} kind="quiet">Back</Action></>}
    {path==='/manual'&&<><h2>{club}</h2><label className="manual-label" htmlFor="manual-distance">Distance in metres</label><input className="manual-input" id="manual-distance" type="number" min="0" inputMode="decimal" value={draft?.manual??''} placeholder="0" onChange={e=>changeDraft({manual:e.target.value})}/><div className="preset-row">{[150,186,210].map(n=><Action key={n} kind={Number(draft?.manual)===n?'tonal':'outline'} onClick={()=>changeDraft({manual:String(n)})}>{n} m</Action>)}</div><p>Use a measured distance when GPS is unavailable.</p><Action to="/shot" kind="quiet">Back to measuring</Action>{draft?.editing&&<Action to="/shot-details" kind="outline">Lie & shot direction</Action>}</>}
    {path==='/shot-details'&&<><Choices label="Lie" options={['Tee','Fairway','Rough','Bunker','Green']} value={draft?.lie||'Fairway'} onChange={lie=>changeDraft({lie})}/><Choices label="Shot direction" options={['Left','Centre','Right']} value={draft?.miss||'Centre'} onChange={miss=>changeDraft({miss})}/><Action to="/manual" kind="quiet">Back to shot</Action></>}
    {path==='/holes'&&<><HoleSelector round={round} onSelect={selectHole}/><Action to={back} kind="quiet">Back to round</Action></>}
    {path==='/more'&&<><Action kind="outline" onClick={()=>quickStroke('penalty')}>+ Penalty stroke</Action><Action kind="outline" disabled={!shots.length} onClick={undo}>Undo last stroke</Action><Action to="/scorecard" kind="outline">Scorecard</Action><Action to="/gps" kind="quiet">GPS unavailable?</Action><Action to="/bag" kind="quiet">Club comparison · optional</Action><Action to="/end" kind="cancel">End round</Action><Action to={back} kind="quiet">Back to recording</Action></>}
    {path==='/gps'&&<><h2 className="recovery-title">You can keep recording with manual distances.</h2><Action onClick={goManual}>Enter distance manually</Action><Action kind="outline" disabled={busy} onClick={retryGPS}>{busy?'Finding your location…':'Try GPS again'}</Action><Action to={back} kind="quiet">Back to round</Action></>}
    {path==='/cancel'&&<><p className="large-copy">The current measurement will be discarded. Saved strokes stay in your round.</p><Action to="/shot">Keep recording</Action><Action kind="danger" onClick={discard}>Discard measurement</Action><p className="caption">No stroke is added when you cancel.</p></>}
    {path==='/finish'&&<><strong className="big-score">{shots.length} {shots.length===1?'stroke':'strokes'}</strong><p>Check the score, then continue playing.</p><Action onClick={finish} disabled={!!draft}>{round.hole===18?'Finish hole · View scorecard':'Finish hole · Next tee'}</Action>{draft&&<p>Save or cancel the active measurement first.</p>}<Action to={back} kind="outline">Keep playing this hole</Action><Action to="/scorecard" kind="quiet">View scorecard</Action></>}
    {path==='/end'&&<><p className="large-copy">Your recorded strokes will be kept. Review your performance after saving.</p><Action onClick={end} disabled={!!draft}>Save round & review</Action>{draft&&<p>Save or cancel the active measurement first.</p>}<Action to={back} kind="outline">Continue playing</Action></>}
    {path==='/scorecard'&&<><p>{round.course.split('·').at(-1).trim()} · {round.tee||'White'} tees</p><strong className="big-score">{round.shots.length} strokes</strong><Action to={back}>Continue recording</Action><Action to="/end" kind="cancel">End round</Action><div className="round-score-list">{Array.from({length:18},(_,i)=>{const count=round.shots.filter(s=>s.hole===i+1).length;return <button key={i} className="score-line" onClick={()=>{update(r=>({...r,hole:i+1}));nav('/hole-shots')}}><strong>Hole {i+1}</strong><span>Par {round.pars?.[i]??'—'}</span><b>{count||'—'}</b></button>})}</div></>}
    {path==='/hole-shots'&&<><p>Par {round.pars?.[round.hole-1]??'—'} · {shots.length} strokes</p>{shots.length?shots.map((s,i)=><section className="detail-card" key={s.id}><h2>{i+1}. {s.type==='shot'?s.club:s.type==='putt'?'Putt':'Penalty'}</h2><p>{s.type==='shot'?`${s.distance} m · ${s.lie||'Not recorded'}`:'1 stroke'}</p>{s.type==='shot'&&<Action kind="outline" onClick={()=>edit(s)}>Edit shot</Action>}</section>):<p>No shots recorded on this hole.</p>}<Action to="/play">Record on this hole</Action><Action kind="cancel" disabled={!shots.length} onClick={undo}>Undo last stroke</Action><Action to="/scorecard" kind="quiet">Back to scorecard</Action></>}
  </Page>;
}
