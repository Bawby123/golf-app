import React from 'react';
import {Link} from 'react-router-dom';

export default function Dashboard({data}) {
  const active=data.active;
  const recorded=data.rounds.flatMap(round=>round.shots);
  const measured=recorded.filter(shot=>shot.type==='shot'&&Number.isFinite(shot.distance));
  const longest=measured.length?Math.max(...measured.map(shot=>shot.distance)):null;
  const recent=data.rounds.slice(0,3);
  return <div className="dashboard">
    <p>{data.name?`${data.name}, make your next round count.`:'Your game. One shot at a time.'}</p>
    <section className="record-card" aria-labelledby="record-title">
      <div className="record-top"><span className="eyebrow">{active?'ROUND IN PROGRESS':'READY TO PLAY'}</span><span className="record-icon" aria-hidden="true">↗</span></div>
      <h2 id="record-title">{active?'Pick up where you left off.':'Record your next round.'}</h2>
      <p>{active?active.course:'Track every shot. Get to know your game.'}</p>
      {active&&<div className="active-round"><span>Hole <strong>{active.hole}</strong></span><span><strong>{active.shots.length}</strong> strokes recorded</span></div>}
      <Link className="button record-cta" to={active?'/play':'/courses'}>{active?'Resume round':'Start a round'} <span aria-hidden="true">→</span></Link>
      <span className="record-caption">GPS shot measurement · Manual entry available</span>
    </section>
    <section aria-labelledby="snapshot-title">
      <div className="section-heading"><h2 id="snapshot-title">Your game at a glance</h2><Link to="/progress">View progress →</Link></div>
      <div className="stat-grid">
        <div className="stat-card"><strong>{data.rounds.length}</strong><span>Saved rounds</span></div>
        <div className="stat-card"><strong>{measured.length}</strong><span>Measured shots</span></div>
        <div className="stat-card"><strong>{longest===null?'—':longest}<small>{longest===null?'':' m'}</small></strong><span>Longest shot</span></div>
      </div>
      <p className="section-note">From saved rounds{measured.length?' · GPS and manually entered distances.':'. Your highlights will grow as you play.'}</p>
    </section>
    <section aria-labelledby="recent-title">
      <div className="section-heading"><h2 id="recent-title">Recent rounds</h2><Link to="/rounds">View all →</Link></div>
      {recent.length?<div className="recent-rounds">{recent.map(round=><Link className="round-preview" to="/rounds" key={round.id}><div><h3>{round.course}</h3><p>{new Date(round.date).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'})} · {new Set(round.shots.map(s=>s.hole)).size} holes recorded</p></div><div className="round-score"><strong>{round.shots.length}</strong><span>strokes</span></div></Link>)}</div>:<div className="empty-rounds"><h3>Your story starts on the first tee.</h3><p>Finish a round to see your scorecard and shot history here.</p></div>}
    </section>
    <div className="dashboard-shortcuts"><Link to="/courses"><span className="shortcut-icon" aria-hidden="true">⚑</span><strong>Singapore courses</strong><span>Find your next round →</span></Link><Link to="/bag"><span className="shortcut-icon" aria-hidden="true">◎</span><strong>Your club bag</strong><span>{data.bag.length} clubs · Manage bag →</span></Link></div>
  </div>;
}
