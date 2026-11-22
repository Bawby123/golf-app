import {metresBetween} from './gps.js';

export function gpsMeasurement(start,end){
  if(!start||!end||!Number.isFinite(start.accuracy)||!Number.isFinite(end.accuracy)||start.accuracy>50||end.accuracy>50)throw new Error('GPS signal is too weak. Try again outdoors or enter the distance manually.');
  return {start,end,distance:Math.round(metresBetween(start,end)),measurement:'gps'};
}
export function commitShot(round,draft,measurement,conditions={}){
  if(!round||!draft)throw new Error('Start a measurement first.');
  if(!Number.isFinite(measurement.distance)||measurement.distance<0)throw new Error('Enter a valid distance.');
  const existing=round.shots.find(s=>s.id===draft.id);
  if(existing&&!draft.editing)return round;
  const shot={id:draft.id,hole:draft.hole,club:draft.club,type:draft.type||'shot',lie:draft.lie||'Fairway',miss:draft.miss||'Centre',weather:conditions.weather||'Not recorded',wind:conditions.wind||'Not recorded',...measurement};
  return {...round,draft:null,shots:existing?round.shots.map(s=>s.id===shot.id?shot:s):[...round.shots,shot]};
}
