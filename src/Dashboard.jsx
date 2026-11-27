import React from 'react';
import {Link} from 'react-router-dom';
import {Action} from './UI.jsx';
import {Icon} from './Brand.jsx';
import {formatDistance,toDisplayUnits,plural,formatDate,playedHoles,formatToPar,scoreToPar} from './round.js';
export default function Dashboard({data}){
 const active=data.active,measured=data.rounds.flatMap(r=>r.shots).filter(s=>s.type==='shot'&&Number.isFinite(s.distance));
 const recent=data.rounds[0];
 return <div className="home-content golf-home">
  <section className="golf-hero">
   <img className="fairway-art" src={`${import.meta.env.BASE_URL}assets/fairway-art.svg`} alt=""/>
   <div className="hero-copy"><span className="golf-eyebrow"><span className="status-dot"/>{active?'ROUND IN PROGRESS':'YOUR NEXT GREAT ROUND'}</span><h2>{active?<>Back to<br/>the fairway.</>:<>Less tapping.<br/>More golfing.</>}</h2><p>{active?`Hole ${active.hole} · ${plural(active.shots.length,'stroke')} recorded`:'Stay in the moment. We’ll keep track of the shots.'}</p></div>
   <div className="hero-bottom"><Action to={active?'/play':'/courses'} kind="accent"><Icon name="flag"/>{active?'Resume round':'Let’s play'}<Icon name="arrow"/></Action><span><Icon name="target" size={14}/> GPS tracking · Manual entry anytime</span></div>
  </section>
  <section className="game-snapshot"><div className="home-glance"><div><span className="section-kicker">THE BIG PICTURE</span><h2>Your game at a glance</h2></div><Action to="/progress" kind="quiet" aria-label="View performance">View <Icon name="arrow" size={16}/></Action></div><div className="home-metrics">{[[data.rounds.length,'Rounds','rounds'],[measured.length,'Measured shots','target'],[measured.length?toDisplayUnits(Math.max(...measured.map(s=>s.distance)),data.units):'—',`Longest · ${data.units==='yd'?'yd':'m'}`,'flag']].map(([value,label,icon])=><div key={label}><Icon name={icon} size={18}/><strong>{value}</strong><span>{label}</span></div>)}</div></section>
  <div className="golf-shortcuts"><Link to="/bag" className="golf-shortcut"><span className="shortcut-mark"><Icon name="bag" size={24}/></span><div><strong>Know your clubs</strong><p>{data.bag.length} clubs in your bag</p></div><Icon name="arrow" size={18}/></Link><Link to="/courses" className="golf-shortcut"><span className="shortcut-mark"><Icon name="flag" size={24}/></span><div><strong>Find your fairway</strong><p>Explore Garden Course</p></div><Icon name="arrow" size={18}/></Link></div>
  <section className="recent-golf"><div className="home-glance"><div><span className="section-kicker">ROUND BY ROUND</span><h2>{recent?'Last time out':'Your story starts here'}</h2></div><Icon name="rounds"/></div>{recent?<Link className="recent-golf-link" to={`/rounds/${recent.id}`}><div><strong>{recent.course}</strong><p>{formatDate(recent.date,false)} · {plural(playedHoles(recent).length,'hole')} played · {formatToPar(scoreToPar(recent))}</p></div><b>{recent.shots.length}<small>{recent.shots.length===1?'stroke':'strokes'}</small></b><Icon name="arrow" size={18}/></Link>:<p>From your first tee shot to your final putt, every round tells you something new.</p>}<Action to="/rounds" kind="outline">{recent?'View round history':'Explore your rounds'}<Icon name="arrow" size={16}/></Action></section>
 </div>;
}
