import {metresBetween} from './gps.js';

export const MAX_SHOT_METRES=450;
const YARD=0.9144;

export function gpsMeasurement(start,end){
  if(!start||!end||!Number.isFinite(start.accuracy)||!Number.isFinite(end.accuracy)||start.accuracy>50||end.accuracy>50)throw new Error('GPS signal is too weak. Try again outdoors or enter the distance manually.');
  return {start,end,distance:Math.round(metresBetween(start,end)),measurement:'gps'};
}

/** Validates a distance typed by the golfer (in their display unit) and returns whole metres. */
export function manualMetres(value,units='m'){
  if(value===''||value===null||value===undefined)throw new Error('Enter a distance before saving.');
  const n=Number(value);
  if(!Number.isFinite(n)||n<=0)throw new Error('Enter a distance greater than 0.');
  const metres=Math.round(units==='yd'?n*YARD:n);
  if(metres>MAX_SHOT_METRES)throw new Error(`That is longer than ${formatDistance(MAX_SHOT_METRES,units)}. Check the distance and try again.`);
  return metres;
}

export function commitShot(round,draft,measurement,conditions={}){
  if(!round||!draft)throw new Error('Start a measurement first.');
  if(!Number.isFinite(measurement.distance)||measurement.distance<0)throw new Error('Enter a valid distance.');
  const existing=round.shots.find(s=>s.id===draft.id);
  if(existing&&!draft.editing)return round;
  // Lie and direction are only stored when the golfer chose them; the first stroke on a hole is always played from the tee.
  const firstOnHole=!existing&&!round.shots.some(s=>s.hole===draft.hole);
  const lie=draft.lie??existing?.lie??(firstOnHole?'Tee':null);
  const shot={id:draft.id,hole:draft.hole,club:draft.club,type:draft.type||'shot',lie,miss:draft.miss??existing?.miss??null,weather:conditions.weather||'Not recorded',wind:conditions.wind||'Not recorded',...measurement};
  return {...round,draft:null,shots:existing?round.shots.map(s=>s.id===shot.id?shot:s):[...round.shots,shot]};
}

/**
 * Adds a stroke that has no measured distance.
 * Putts and quick strokes go to the end of the hole; a penalty is placed straight after the
 * last full shot on that hole (the shot that caused it), before any putts.
 */
export function addStroke(round,{id,type,hole,club}){
  const stroke={id,hole,type,club:type==='putt'?'Putter':type==='penalty'?null:club,distance:null,measurement:'manual'};
  if(type!=='penalty')return {...round,shots:[...round.shots,stroke]};
  const shots=[...round.shots];
  let at=-1;
  shots.forEach((s,i)=>{if(s.hole===hole&&s.type!=='putt')at=i});
  if(at===-1){const firstOnHole=shots.findIndex(s=>s.hole===hole);at=firstOnHole===-1?shots.length-1:firstOnHole-1}
  shots.splice(at+1,0,stroke);
  return {...round,shots};
}

export const strokesOn=(round,hole)=>round.shots.filter(s=>s.hole===hole).length;

/** Holes that count towards the score: holes marked complete, plus any hole with strokes recorded. */
export function playedHoles(round){
  const holes=new Set(round.completed||[]);
  round.shots.forEach(s=>holes.add(s.hole));
  return [...holes].filter(h=>strokesOn(round,h)>0).sort((a,b)=>a-b);
}

export function scoreToPar(round,holes=playedHoles(round)){
  return holes.reduce((n,h)=>n+strokesOn(round,h)-(round.pars?.[h-1]??0),0);
}

export const formatToPar=n=>n===0?'E':n>0?`+${n}`:`${n}`;

export function scoreName(strokes,par){
  if(!strokes||!par)return '';
  if(strokes===1)return 'Hole in one';
  const d=strokes-par;
  return {[-3]:'Albatross',[-2]:'Eagle',[-1]:'Birdie',0:'Par',1:'Bogey',2:'Double bogey',3:'Triple bogey'}[d]??(d<0?`${d}`:`+${d}`);
}

/** Totals for a nine: strokes and par for the holes played in it. */
export function nineTotals(round,from){
  const holes=Array.from({length:9},(_,i)=>from+i);
  const played=holes.filter(h=>strokesOn(round,h)>0);
  return {strokes:played.reduce((n,h)=>n+strokesOn(round,h),0),par:holes.reduce((n,h)=>n+(round.pars?.[h-1]??0),0),played:played.length};
}

const done=(round,hole)=>round.completed?.includes(hole)&&strokesOn(round,hole)>0;
export const isFull18=round=>Array.from({length:18},(_,i)=>i+1).every(h=>done(round,h));
export const isNine=round=>!isFull18(round)&&([1,10].some(from=>Array.from({length:9},(_,i)=>from+i).every(h=>done(round,h))));

/** For a par 3, suggests the club whose average distance is closest to the hole length; otherwise the first club in the bag. */
export function suggestClub(bag,averages,par,length){
  if(!bag.length)return 'Driver';
  const full=bag.filter(c=>c!=='Putter');
  if(par!==3||!length)return full[0]||bag[0];
  const known=full.filter(c=>Number.isFinite(averages[c]));
  if(!known.length)return full[0]||bag[0];
  return known.reduce((best,c)=>Math.abs(averages[c]-length)<Math.abs(averages[best]-length)?c:best);
}

export function formatDistance(metres,units='m'){
  if(!Number.isFinite(metres))return '—';
  return units==='yd'?`${Math.round(metres/YARD)} yd`:`${Math.round(metres)} m`;
}
export const toDisplayUnits=(metres,units='m')=>Number.isFinite(metres)?Math.round(units==='yd'?metres/YARD:metres):metres;

export const plural=(n,word,many=`${word}s`)=>`${n} ${n===1?word:many}`;

export const formatDate=(iso,withYear=true)=>new Date(iso).toLocaleDateString('en-GB',withYear?{day:'numeric',month:'short',year:'numeric'}:{day:'numeric',month:'short'});

/** Checks that an imported backup looks like MyCaddie data before it replaces anything. */
export function parseBackup(text){
  let data;
  try{data=JSON.parse(text)}catch{throw new Error('That file is not a MyCaddie backup.')}
  if(!data||typeof data!=='object'||!Array.isArray(data.rounds)||!Array.isArray(data.bag)||!data.rounds.every(r=>r&&Array.isArray(r.shots)))throw new Error('That file is not a MyCaddie backup.');
  return data;
}
