import React from 'react';
import {Link} from 'react-router-dom';
export function Icon({name,size=20}){
 const paths={home:<><path d="m3 10 9-7 9 7v10H3Z"/><path d="M9 20v-7h6v7"/></>,rounds:<><rect x="4" y="4" width="16" height="17" rx="3"/><path d="M8 2v4m8-4v4M8 11h8m-8 5h5"/></>,progress:<><path d="M4 3v17h17M7 15l5-5 4 2 5-7"/></>,bag:<><path d="M6 10h12l-1 11H7ZM9 10V3l4-1m1 8V5l5-1"/><path d="M8 15h8"/></>,profile:<><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></>,arrow:<path d="M5 12h14m-6-6 6 6-6 6"/>,flag:<><path d="M6 21V3l13 4-13 5"/><path d="M3 21h9"/></>,target:<><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3"/></>,scorecard:<><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M8 8v8m4-8h5m-5 4h5m-5 4h5"/></>};
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]||paths.flag}</svg>;
}
export function Brand(){return <Link className="brand" to="/" aria-label="MyCaddie home"><img src={`${import.meta.env.BASE_URL}assets/mycaddie-mark.svg`} alt="" width="36" height="36"/><span>MyCaddie<span className="brand-tagline">YOUR GAME. YOUR WAY.</span></span></Link>}
