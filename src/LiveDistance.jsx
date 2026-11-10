import React,{useEffect,useState} from 'react';
import {metresBetween} from './gps.js';

export default function LiveDistance({gps,enabled}) {
 const [point,setPoint]=useState(null),[notice,setNotice]=useState('Waiting for GPS updates…');
 useEffect(()=>{
  setPoint(null);
  if(!enabled||!gps?.start||gps.end||!navigator.geolocation)return;
  let active=true;
  const id=navigator.geolocation.watchPosition(p=>{
   if(!active)return;
   if(p.coords.accuracy>50){setNotice('Weak GPS signal. Showing last reliable distance.');return;}
   setPoint({latitude:p.coords.latitude,longitude:p.coords.longitude,accuracy:p.coords.accuracy});
   setNotice(`GPS accuracy ±${Math.round(p.coords.accuracy)} m`);
  },()=>{if(active)setNotice('GPS update unavailable. Try outdoors or use manual entry.');},{enableHighAccuracy:true,maximumAge:0,timeout:15000});
  return ()=>{active=false;navigator.geolocation.clearWatch(id)};
 },[enabled,gps?.start,gps?.end]);
 if(!gps)return null;
 const current=gps.end||point;
 return <section className="live-distance" aria-label="Live shot distance"><span>{gps.end?'MEASURED DISTANCE':'LIVE SHOT DISTANCE'}</span><div><strong>{current?Math.round(metresBetween(gps.start,current)):0}</strong> <b>m</b></div><p>Straight-line distance from your starting position</p><p role="status">{gps.end?`End accuracy ±${Math.round(gps.end.accuracy)} m`:notice}</p></section>;
}
