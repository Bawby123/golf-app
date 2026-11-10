import React from 'react';

export default function HoleSelector({round,onSelect}) {
 return <section className="hole-selector" aria-labelledby="hole-title">
  <div className="hole-selector-heading"><h2 id="hole-title">Hole {round.hole}</h2><span>{round.completed?.length||0} / 18 complete</span></div>
  <div className="hole-grid" role="group" aria-label="Select a hole">
   {Array.from({length:18},(_,i)=>{
    const hole=i+1,done=round.completed?.includes(hole),count=round.shots.filter(s=>s.hole===hole).length;
    return <button type="button" key={hole} className={`hole-tile${done?' completed':count?' recorded':''}${round.hole===hole?' selected':''}`} aria-pressed={round.hole===hole} aria-label={`Hole ${hole}, ${done?'completed':count?'in progress':'not started'}, ${count} strokes`} onClick={()=>onSelect(hole)}>
     <strong>{hole}</strong><span className="hole-status" aria-hidden="true">{done?'✓':count?'•':''}</span>
    </button>;
   })}
  </div>
  <p className="hole-legend">✓ Complete · • In progress · Tap any hole to review or edit</p>
 </section>;
}
