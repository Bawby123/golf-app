export function metresBetween(a,b){
 const rad=n=>n*Math.PI/180;
 const dLat=rad(b.latitude-a.latitude),dLon=rad(b.longitude-a.longitude);
 const h=Math.sin(dLat/2)**2+Math.cos(rad(a.latitude))*Math.cos(rad(b.latitude))*Math.sin(dLon/2)**2;
 return 6371000*2*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)));
}
export function locate(){return new Promise((resolve,reject)=>{
 if(!navigator.geolocation)return reject(new Error('Location is unavailable. Enter the distance manually.'));
 navigator.geolocation.getCurrentPosition(p=>resolve({latitude:p.coords.latitude,longitude:p.coords.longitude,accuracy:p.coords.accuracy,timestamp:p.timestamp}),e=>reject(new Error(e.code===1?'Location permission was denied. Allow location in browser settings or enter distance manually.':'Could not obtain a fresh location. Try again outdoors or use manual entry.')),{enableHighAccuracy:true,timeout:20000,maximumAge:0});
});}
