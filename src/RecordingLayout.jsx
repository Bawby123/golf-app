import React, {useState} from 'react';
import {Link} from 'react-router-dom';

export function MapPreview() {
  const [full, setFull] = useState(false);
  return <section className={`map-preview${full ? ' expanded' : ''}`} aria-label="Static course map preview">
    <img src={`${import.meta.env.BASE_URL}assets/map-preview.png`} alt="Illustrative aerial course overview from the Figma design; not a live location map"/>
    <span className="map-badge">Course overview · Preview</span>
    <button className={`outline map-expand${full ? ' cancel' : ''}`} aria-expanded={full} onClick={() => setFull(!full)}>{full ? 'Close map' : 'Full map'}</button>
    <p>Map preview · Esri World Imagery · Not live</p>
  </section>;
}

export function RoundHeader({round, shots}) {
  return <header className="round-header">
    <div><small>{round.course}</small><Link to="/scorecard">Scorecard</Link></div>
    <div><Link className="button outline" to="/holes">HOLE {round.hole} <span>⌄</span></Link><strong>{shots.length} strokes</strong></div>
  </header>;
}
