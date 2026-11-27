import React,{useEffect,useRef,useState} from 'react';
import {useLocation,useNavigate} from 'react-router-dom';
import {Action,Page,Choices} from './UI.jsx';
import {locate,metresBetween} from './gps.js';
import {commitShot,gpsMeasurement,manualMetres,addStroke,strokesOn,playedHoles,scoreToPar,formatToPar,scoreName,suggestClub,formatDistance,toDisplayUnits,plural} from './round.js';
import {ScoreList,clubAverages} from './Performance.jsx';
import HoleSelector from './HoleSelector.jsx';
import {Icon} from './Brand.jsx';

export const recordingPaths=['/play','/shot','/clubs','/manual','/holes','/more','/gps','/map','/scorecard','/hole-shots','/finish','/end','/cancel','/shot-details','/edit-shot'];
const asset=name=>`${import.meta.env.BASE_URL}assets/${name}`;
const strokeLabel=s=>s.type==='shot'?s.club:s.type==='putt'?'Putt':s.type==='penalty'?'Penalty':'Stroke';
const vibrate=ms=>{try{navigator.vibrate?.(ms)}catch{}};

/** Keeps the screen awake while a shot is being measured, so GPS keeps tracking while the golfer walks. */
function useWakeLock(enabled){
  useEffect(()=>{
    if(!enabled||!('wakeLock' in navigator))return;
    let lock=null,stopped=false;
    const acquire=async()=>{try{if(document.visibilityState==='visible'&&!stopped)lock=await navigator.wakeLock.request('screen')}catch{}};
    const onVisible=()=>{if(document.visibilityState==='visible')acquire()};
    acquire();document.addEventListener('visibilitychange',onVisible);
    return ()=>{stopped=true;document.removeEventListener('visibilitychange',onVisible);lock?.release?.().catch(()=>{})};
  },[enabled]);
}

export default function RecordingFlow({data,save}){
  const {pathname:path}=useLocation(),nav=useNavigate();
  const units=data.units||'m',fmt=m=>formatDistance(m,units),unitLabel=units==='yd'?'yards':'metres';
  const round=data.active,draft=round?.draft,club=draft?.club||round?.selectedClub||data.bag[0]||'Driver';
  const hole=round?.hole||1,par=round?.pars?.[hole-1],length=round?.distances?.[hole-1];
  const viewHole=round?.viewHole??hole;
  const shots=round?.shots.filter(s=>s.hole===hole)||[];
  const viewShots=round?.shots.filter(s=>s.hole===viewHole)||[];
  // An error belongs to the screen it is shown on, so it never carries over to another screen.
  const [errorState,setErrorState]=useState(null),error=errorState?.at===path?errorState.msg:'';
  const setError=(msg,at=path)=>setErrorState(msg?{msg,at}:null);
  const [busy,setBusy]=useState(false),[toast,setToast]=useState(null),[point,setPoint]=useState(null),[signal,setSignal]=useState('Waiting for GPS…'),[confirmDiscard,setConfirmDiscard]=useState(false);
  const operation=useRef(0),locked=useRef(false),current=useRef(data);current.current=data;
  const returnTo=useRef('/play');
  useEffect(()=>()=>{operation.current++},[]);
  useEffect(()=>{window.scrollTo(0,0);setConfirmDiscard(false)},[path]);
  useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(null),6000);return ()=>clearTimeout(timer)},[toast]);
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
  useWakeLock(path==='/shot'&&!!draft?.start&&draft?.manual===undefined);
  if(!round)return <Page title="Ready when you are." showNav={false}><Action to="/courses">Choose a course to begin</Action><Action to="/" kind="quiet">Back to home</Action></Page>;

  const update=fn=>save(d=>({...d,active:d.active?.id===round.id?fn(d.active):d.active}));
  const makeDraft=()=>({id:crypto.randomUUID(),hole,club});
  const ensureDraft=()=>{if(!current.current.active?.draft)update(r=>({...r,draft:makeDraft()}))};
  const changeDraft=patch=>update(r=>({...r,draft:{...(r.draft||makeDraft()),...patch}}));
  const start=async()=>{
    if(locked.current)return;
    if(draft){nav(draft.editing?'/edit-shot':'/shot');return}
    locked.current=true;setBusy(true);setError('');setToast(null);
    const token=++operation.current,newDraft=makeDraft();
    if(!update(r=>({...r,draft:newDraft}))){locked.current=false;setBusy(false);return}
    nav('/shot');
    try{const p=await locate();if(token!==operation.current)return;if(p.accuracy>50)throw new Error('GPS accuracy is over 50 m. Try outdoors or enter a manual distance.');update(r=>({...r,draft:r.draft?.id===newDraft.id?{...r.draft,start:p}:r.draft}))}
    catch(e){if(token===operation.current){setError(e.message,'/gps');nav('/gps')}}
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
    const original=activeDraft.editing?current.current.active.shots.find(s=>s.id===activeDraft.id):null;
    try{
      let measurement;
      if(activeDraft.manual!==undefined){
        // An edit that leaves the distance alone keeps the original GPS measurement.
        const unchanged=original&&Number.isFinite(original.distance)&&Number(activeDraft.manual)===toDisplayUnits(original.distance,units);
        measurement=unchanged?{distance:original.distance,measurement:original.measurement,start:original.start,end:original.end}:{distance:manualMetres(activeDraft.manual,units),measurement:'manual'};
      }else measurement=gpsMeasurement(activeDraft.start,await locate());
      if(token!==operation.current)return;
      const ok=update(r=>r.draft?.id===activeDraft.id?commitShot(r,activeDraft,measurement,current.current):r);
      if(!ok)return;
      vibrate(30);
      if(activeDraft.editing){setToast({title:'Shot updated',text:`${activeDraft.club} · ${fmt(measurement.distance)}`});nav('/hole-shots')}
      else{setToast({title:'Shot saved',text:`${activeDraft.club} · ${fmt(measurement.distance)}. Ready for your next shot.`,undoId:activeDraft.id});nav('/play')}
    }catch(e){if(token===operation.current){const to=activeDraft.editing?'/edit-shot':activeDraft.manual!==undefined?'/manual':'/gps';setError(e.message,to);nav(to)}}
    finally{if(token===operation.current){locked.current=false;setBusy(false)}}
  };
  const discard=()=>{const editing=draft?.editing;operation.current++;locked.current=false;setBusy(false);setError('');update(r=>({...r,draft:null}));nav(editing?'/hole-shots':'/play')};
  const quickStroke=(type,stay=false)=>{
    const id=crypto.randomUUID();
    if(!update(r=>addStroke(r,{id,type,hole:r.hole,club})))return;
    vibrate(20);
    setToast({title:{putt:'Putt added',penalty:'Penalty stroke added',stroke:'Stroke added'}[type],text:type==='penalty'?'Added after your last shot on this hole.':`Hole ${hole} · ${plural(shots.length+1,'stroke')}`,undoId:id});
    if(!stay)nav('/play');
  };
  const removeStroke=id=>{update(r=>({...r,shots:r.shots.filter(s=>s.id!==id)}));setToast({title:'Removed',text:'That stroke has been taken off the card.'})};
  const chooseClub=()=>{returnTo.current=path;nav('/clubs')};
  const selectHole=h=>{update(r=>({...r,hole:h,viewHole:null}));setToast(null);nav('/play')};
  const finish=()=>{
    const next=Math.min(18,hole+1),avg=clubAverages(current.current);
    if(update(r=>({...r,completed:[...new Set([...(r.completed||[]),r.hole])],hole:next,viewHole:null,selectedClub:hole===18?r.selectedClub:suggestClub(current.current.bag,avg,r.pars?.[next-1],r.distances?.[next-1])}))){setToast(null);nav(hole===18?'/scorecard':'/play')}
  };
  const endRound=()=>{const {draft:ignored,viewHole:ignoredView,...finished}=round;if(save(d=>({...d,active:null,rounds:[{...finished,finished:new Date().toISOString()},...d.rounds]})))nav(`/rounds/${round.id}`)};
  const discardRound=()=>{if(save(d=>({...d,active:null})))nav('/')};
  const goManual=()=>{operation.current++;locked.current=false;setBusy(false);setError('');ensureDraft();nav('/manual')};
  const edit=s=>{update(r=>({...r,draft:{...s,editing:true,manual:Number.isFinite(s.distance)?String(toDisplayUnits(s.distance,units)):''}}));setError('');nav('/edit-shot')};
  const deleteShot=()=>{update(r=>({...r,draft:null,shots:r.shots.filter(s=>s.id!==draft.id)}));setToast({title:'Shot deleted',text:`Hole ${draft.hole}`});nav('/hole-shots')};
  const undoOn=list=>{if(list.length){const last=list.at(-1);update(r=>({...r,shots:r.shots.filter(s=>s.id!==last.id)}))}};
  const back=draft?(draft.editing?'/edit-shot':'/shot'):'/play';
  const distance=draft?.manual!==undefined?(draft.manual?`${draft.manual} ${units}`:'—'):point&&draft?.start?fmt(metresBetween(draft.start,point)):fmt(0);
  // Score to par only counts finished holes, so the hole being played does not show as under par.
  const finishedHoles=(round.completed||[]).filter(h=>strokesOn(round,h)>0),roundToPar=formatToPar(scoreToPar(round,finishedHoles)),thru=finishedHoles.length;
  const holeInfo=[par&&`Par ${par}`,Number.isFinite(length)&&fmt(length)].filter(Boolean).join(' · ');
  const map=(full=false)=><section className={full?'full-map':'course-map'} aria-label="Course map preview">
    <img src={asset(full?'full-map.png':'map-preview.png')} alt="Satellite preview of Garden Course, not a live location map"/>
    {full?<><Action to={back} kind="outline">Back to recording</Action><div className="full-map-caption"><strong>GARDEN COURSE</strong><p>Map preview · Esri World Imagery</p></div></>:<><span className="map-status">{path==='/shot'?'Tracking shot':'Course overview'}</span><Action to="/map" kind="map">Full map</Action><p className="map-credit">Map preview · Esri World Imagery</p>{toast&&<div className="shot-toast" role="status"><div><strong>{toast.title}</strong><p>{toast.text}</p></div>{toast.undoId&&<button type="button" className="toast-undo" onClick={()=>removeStroke(toast.undoId)}>Undo</button>}</div>}</>}
  </section>;
  if(path==='/map')return <div className="app design-app">{map(true)}</div>;
  if(path==='/play'||path==='/shot')return <div className="app design-app recorder">
    <header className="record-header"><div><small>{round.course.split('·').at(-1).trim().toUpperCase()}{thru?` · ${roundToPar} THRU ${thru}`:''}</small><Action to="/scorecard" kind="quiet"><Icon name="scorecard" size={16}/>Scorecard</Action></div><div><Action to="/holes" kind="outline" aria-label={`Hole ${hole}. Change hole`}>HOLE {hole}</Action><div className="hole-meta"><strong>{holeInfo||`Hole ${hole}`}</strong><span>{plural(shots.length,'stroke')}</span></div></div></header>
    {map()}
    <main className="thumb-controls">{path==='/play'?<>
      <div className="club-actions"><Action kind="outline" onClick={chooseClub} aria-label={`Club: ${club}. Change club`}>{club}</Action><Action kind="tonal" onClick={()=>quickStroke('putt')}>+ Putt</Action></div>
      <Action onClick={start} disabled={busy}>{draft?'Resume measurement':shots.length?'Record next shot':'Record shot · Mark start'}</Action>
      <div className="two-actions"><Action to="/finish" kind="outline">Finish hole</Action><Action to="/more" kind="quiet">More</Action></div>
      <p>{shots.length?'Ready for your next shot.':'Select your club. Mark your starting point on the tee.'}</p>
    </>:<>
      <div className="measurement-row"><div className="distance-readout" aria-label="Live shot distance" aria-live="polite"><span>SHOT DISTANCE</span><strong>{distance}</strong></div><Action kind="outline" onClick={chooseClub} aria-label={`Club: ${club}. Change club`}>{club}</Action></div>
      <Action onClick={saveShot} disabled={busy}>{busy?'Finding your location…':'Save shot · Mark end'}</Action>
      <div className="two-actions"><Action kind="quiet" onClick={goManual}>Manual distance</Action><Action to="/cancel" kind="cancel">Cancel shot</Action></div>
      <p role="status">{busy?'Keep this page open while GPS finds your position.':draft?.manual!==undefined?'Manual distance · Save when ready.':'Walk to your ball, then save. The screen stays on while measuring.'}</p>
      {draft?.start&&draft.manual===undefined&&<p className="gps-status">{signal}</p>}
    </>}</main>
  </div>;
  const titles={'/clubs':'Choose your club.','/manual':'Enter shot distance.','/edit-shot':'Edit your shot.','/holes':'Choose a hole.','/more':'Round actions.','/gps':'GPS unavailable.','/scorecard':'Your round.','/hole-shots':`Hole ${viewHole}.`,'/finish':'Finish this hole?','/end':'Save and end round?','/cancel':draft?.editing?'Discard your changes?':'Cancel this shot?','/shot-details':'Lie & direction.'};
  const finishStrokes=shots.length,putts=shots.filter(s=>s.type==='putt').length;
  const unplayed=18-playedHoles(round).length;
  return <Page title={titles[path]||'Your round.'} showNav={false}>
    {error&&<p role="alert" className="error-message">{error}</p>}
    {path==='/clubs'&&<><p>Your bag</p>{data.bag.map(c=><Action key={c} kind={club===c?'tonal':'outline'} aria-pressed={club===c} onClick={()=>{update(r=>({...r,selectedClub:r.draft?.editing?r.selectedClub:c,draft:r.draft?{...r.draft,club:c}:null}));nav(returnTo.current)}}>{c}</Action>)}<Action to={returnTo.current} kind="quiet">Back</Action></>}
    {path==='/manual'&&<><h2>{club}</h2><label className="manual-label" htmlFor="manual-distance">Distance in {unitLabel}</label><input className="manual-input" id="manual-distance" type="number" min="1" max={units==='yd'?492:450} inputMode="numeric" value={draft?.manual??''} placeholder="0" onChange={e=>changeDraft({manual:e.target.value})}/><div className="preset-row">{(units==='yd'?[100,150,200]:[100,150,200]).map(n=><Action key={n} kind={Number(draft?.manual)===n?'tonal':'outline'} onClick={()=>changeDraft({manual:String(n)})}>{n} {units}</Action>)}</div><p>Pace it out or use a marker post, then save.</p><Action onClick={saveShot} disabled={busy}>Save shot</Action><Action to="/shot-details" kind="outline">Add lie & direction · optional</Action><Action to="/cancel" kind="quiet">Cancel shot</Action></>}
    {path==='/edit-shot'&&draft?.editing&&<><Action kind="outline" onClick={chooseClub} aria-label={`Club: ${club}. Change club`}>Club · {club}</Action><label className="manual-label" htmlFor="edit-distance">Distance in {unitLabel}</label><input className="manual-input" id="edit-distance" type="number" min="1" inputMode="numeric" value={draft.manual??''} placeholder="0" onChange={e=>changeDraft({manual:e.target.value})}/><Choices label="Lie" options={['Tee','Fairway','Rough','Bunker','Green','Penalty area']} value={draft.lie} onChange={lie=>changeDraft({lie})}/><Choices label="Shot direction" options={['Left','Centre','Right','Short','Long']} value={draft.miss} onChange={miss=>changeDraft({miss})}/><Action onClick={saveShot} disabled={busy}>Save changes</Action><Action kind="danger" onClick={deleteShot}>Delete shot</Action><Action kind="quiet" onClick={discard}>Cancel</Action></>}
    {path==='/edit-shot'&&!draft?.editing&&<><p>There is no shot being edited.</p><Action to="/hole-shots">Back to hole</Action></>}
    {path==='/shot-details'&&<><p>Optional. Only what you choose is saved.</p><Choices label="Lie" options={['Tee','Fairway','Rough','Bunker','Green','Penalty area']} value={draft?.lie} onChange={lie=>changeDraft({lie})}/><Choices label="Shot direction" options={['Left','Centre','Right','Short','Long']} value={draft?.miss} onChange={miss=>changeDraft({miss})}/><Action to="/manual">Done</Action></>}
    {path==='/holes'&&<><HoleSelector round={round} onSelect={selectHole}/><Action to={back} kind="quiet">Back to round</Action></>}
    {path==='/more'&&<><Action kind="outline" onClick={()=>quickStroke('penalty')}>+ Penalty stroke</Action><Action kind="outline" disabled={!shots.length} onClick={()=>{undoOn(shots);nav('/play')}}>Undo last stroke</Action><Action to="/scorecard" kind="outline">Scorecard</Action><Action to="/gps" kind="quiet">GPS unavailable?</Action><Action to="/end" kind="cancel">End round</Action><Action to={back} kind="quiet">Back to recording</Action></>}
    {path==='/gps'&&<><h2 className="recovery-title">You can keep recording with manual distances.</h2><Action onClick={goManual}>Enter distance manually</Action><Action kind="outline" disabled={busy} onClick={retryGPS}>{busy?'Finding your location…':'Try GPS again'}</Action><Action to="/play" kind="quiet">Back to round</Action></>}
    {path==='/cancel'&&<><p className="large-copy">{draft?.editing?'Your changes to this shot will not be saved.':'The current measurement will be discarded. Saved strokes stay in your round.'}</p><Action to={back}>{draft?.editing?'Keep editing':'Keep recording'}</Action><Action kind="danger" onClick={discard}>{draft?.editing?'Discard changes':'Discard measurement'}</Action><p className="caption">No stroke is added when you cancel.</p></>}
    {path==='/finish'&&<><div className="finish-score"><strong className="big-score">{plural(finishStrokes,'stroke')}</strong>{par&&finishStrokes>0&&<span className={`score-name score-${Math.max(-2,Math.min(2,finishStrokes-par))}`}>{scoreName(finishStrokes,par)}</span>}</div><p>Hole {hole}{par?` · Par ${par}`:''} · {plural(putts,'putt')}</p><div className="stroke-adjust" role="group" aria-label="Adjust score"><Action kind="outline" disabled={!shots.length} onClick={()=>undoOn(shots)} aria-label="Remove last stroke">− 1</Action><span aria-live="polite">{finishStrokes}</span><Action kind="outline" onClick={()=>quickStroke('stroke',true)} aria-label="Add a stroke">+ 1</Action></div><p className="caption">Not tracking every shot? Set your score here.</p><Action onClick={finish} disabled={!!draft}>{hole===18?'Finish hole · View scorecard':'Finish hole · Next tee'}</Action>{draft&&<><p>Save or cancel the active measurement first.</p><Action to="/cancel" kind="quiet">Cancel the measurement</Action></>}<Action to={back} kind="outline">Keep playing this hole</Action></>}
    {path==='/end'&&<>{unplayed>0&&<p className="warning-note" role="note">{plural(unplayed,'hole')} {unplayed===1?'has':'have'} no score yet. {unplayed===9?'That is fine for a 9-hole round.':'They will be saved as not played.'}</p>}<p className="large-copy">Your recorded strokes will be kept. Review your performance after saving.</p><Action onClick={endRound} disabled={!!draft}>Save round & review</Action>{draft&&<><p>Save or cancel the active measurement first.</p><Action to="/cancel" kind="quiet">Cancel the measurement</Action></>}<Action to={back} kind="outline">Continue playing</Action>{confirmDiscard?<><p className="error-message">This deletes the round and all its strokes. It cannot be undone.</p><Action kind="danger" onClick={discardRound}>Yes, delete this round</Action><Action kind="quiet" onClick={()=>setConfirmDiscard(false)}>Keep the round</Action></>:<Action kind="cancel" onClick={()=>setConfirmDiscard(true)}>Discard round</Action>}</>}
    {path==='/scorecard'&&<><p>{round.course.split('·').at(-1).trim()} · {round.tee||'White'} tees</p><strong className="big-score">{round.shots.length?plural(round.shots.length,'stroke'):'No strokes yet'}</strong>{thru>0&&<p>{roundToPar} through {plural(thru,'finished hole')}</p>}<Action to={back}>Continue recording</Action><ScoreList round={round} current={hole} onSelect={h=>{update(r=>({...r,viewHole:h}));nav('/hole-shots')}}/><Action to="/end" kind="cancel">End round</Action></>}
    {path==='/hole-shots'&&<><p>Par {round.pars?.[viewHole-1]??'—'} · {plural(viewShots.length,'stroke')}{viewShots.length&&round.pars?.[viewHole-1]?` · ${scoreName(viewShots.length,round.pars[viewHole-1])}`:''}</p>{toast&&<p className="success-note" role="status">{toast.title}. {toast.text}</p>}{viewShots.length?viewShots.map((s,i)=><section className="detail-card" key={s.id}><h2>{i+1}. {strokeLabel(s)}</h2><p>{s.type==='shot'?[fmt(s.distance),s.lie,s.miss].filter(Boolean).join(' · '):'1 stroke'}</p>{s.type==='shot'&&<Action kind="outline" onClick={()=>edit(s)}>Edit shot</Action>}</section>):<p>No shots recorded on this hole.</p>}<Action kind="cancel" disabled={!viewShots.length} onClick={()=>undoOn(viewShots)}>Undo last stroke</Action>{viewHole!==hole&&<Action kind="outline" onClick={()=>selectHole(viewHole)}>Play from hole {viewHole}</Action>}<Action to="/scorecard" kind="quiet">Back to scorecard</Action><Action to="/play" kind="quiet">Back to hole {hole}</Action></>}
  </Page>;
}
