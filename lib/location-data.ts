import {neighborhoodCoordinates} from '../app/models.ts';
import {restaurantSource} from './concept-config.ts';
export type LocationRecord={camis?:string;cuisine_description?:string;latitude?:string;longitude?:string;inspected?:string;record_date?:string};
export type AreaSupply={name:string;total:number;counts:Record<string,number>};
export type LocationSnapshot={areas:AreaSupply[];city:AreaSupply;total:number;mapped:number;excluded:number;radiusKm:number;sourceDate:string;sourceUrl:string};
export function distanceKm(lat1:number,lng1:number,lat2:number,lng2:number){const rad=Math.PI/180;const a=Math.sin((lat2-lat1)*rad/2)**2+Math.cos(lat1*rad)*Math.cos(lat2*rad)*Math.sin((lng2-lng1)*rad/2)**2;return 6371*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))}
export function summarizeLocations(records:LocationRecord[]):LocationSnapshot{
 const unique=new Map<string,LocationRecord>();
 for(const r of records){if(!r.camis)continue;const old=unique.get(r.camis);const key=(x:LocationRecord)=>[x.inspected||'',x.record_date||'',x.cuisine_description||'',x.latitude||'',x.longitude||''].join('|');if(!old||key(r)>key(old))unique.set(r.camis,r)}
 if(!unique.size)throw new Error('No restaurant records returned');
 const radiusKm=1;const areas=Object.keys(neighborhoodCoordinates).map(name=>({name,total:0,counts:{} as Record<string,number>}));const city={name:'NYC mapped records',total:0,counts:{} as Record<string,number>};let sourceDate='';
 const add=(a:AreaSupply,c:string)=>{a.total++;a.counts[c]=(a.counts[c]||0)+1};
 for(const r of unique.values()){if((r.record_date||'')>sourceDate)sourceDate=r.record_date!;const lat=Number(r.latitude),lng=Number(r.longitude);if(!Number.isFinite(lat)||!Number.isFinite(lng)||lat<40.49||lat>40.93||lng< -74.26||lng> -73.69)continue;const c=r.cuisine_description?.trim()||'Not recorded';add(city,c);for(const a of areas){const p=neighborhoodCoordinates[a.name];if(distanceKm(lat,lng,p.lat,p.lng)<=radiusKm)add(a,c)}}
 return {areas,city,total:unique.size,mapped:city.total,excluded:unique.size-city.total,radiusKm,sourceDate:sourceDate.slice(0,10),sourceUrl:restaurantSource};
}
export async function fetchLocationSupply(){
 const q=new URLSearchParams({'$select':'camis,cuisine_description,latitude,longitude,max(inspection_date) as inspected,max(record_date) as record_date','$group':'camis,cuisine_description,latitude,longitude','$limit':'50000'});
 const r=await fetch('https://data.cityofnewyork.us/resource/43nn-pn8j.json?'+q,{signal:AbortSignal.timeout(25000),headers:{Accept:'application/json'}});if(!r.ok)throw new Error('Restaurant source unavailable');const data=await r.json();if(!Array.isArray(data)||data.length>=50000)throw new Error('Restaurant source coverage limit');return summarizeLocations(data);
}
