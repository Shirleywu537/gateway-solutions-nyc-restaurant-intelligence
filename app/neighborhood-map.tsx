'use client';
import {useEffect,useState} from 'react';
import {MapPin,Plus,Minus,RotateCcw,ArrowUpRight} from 'lucide-react';
import {neighborhoodCoordinates} from './models';
type Place={name:string;borough:string;score:number;rent:number};
type Geography={features:{name:string;coordinates:number[][][][]}[]};
const project=(lng:number,lat:number)=>[(lng+74.27)/.60*720,(40.94-lat)/.47*710];
export function NeighborhoodMap({places,onSelect,compact=false}:{places:Place[];onSelect?:(name:string)=>void;compact?:boolean}) {
 const [geo,setGeo]=useState<Geography|null>(null),[failed,setFailed]=useState(false),[active,setActive]=useState(''),[zoom,setZoom]=useState(1);
 useEffect(()=>{fetch('/nyc-boroughs.json').then(r=>{if(!r.ok)throw new Error();return r.json() as Promise<Geography>}).then(setGeo).catch(()=>setFailed(true))},[]);
 const selected=places.find(p=>p.name===active);
 const named=[['MANHATTAN',-73.974,40.784],['BRONX',-73.88,40.87],['QUEENS',-73.815,40.744],['BROOKLYN',-73.945,40.63],['STATEN ISLAND',-74.162,40.57]] as const;
 return <section className={'neighborhood-map '+(compact?'compact-map':'')} aria-label="Map of candidate New York City neighborhoods">
 {!compact&&<div className="map-heading"><div><h2>Your shortlist, on the map</h2><p>{places.length} matching neighborhoods · select a numbered marker</p></div><span className="tag">NYC</span></div>}
 <div className="map-canvas">
 {!geo&&!failed&&<span className="map-loading">Loading borough map…</span>}{failed&&<span className="map-loading">Map unavailable. Neighborhood details remain below.</span>}
 <svg viewBox={`${(720-720/zoom)/2} ${(710-710/zoom)/2} ${720/zoom} ${710/zoom}`} role="group" aria-label="NYC borough boundaries with candidate neighborhood markers">
 <defs><pattern id={compact?'home-grid':'map-grid'} width="36" height="36" patternUnits="userSpaceOnUse"><path d="M36 0H0V36" fill="none" stroke="#cee0dc" strokeWidth=".6"/></pattern></defs>
 <rect x="0" y="0" width="720" height="710" fill={`url(#${compact?'home-grid':'map-grid'})`}/>
 {geo?.features.map(f=><path key={f.name} d={f.coordinates.map(poly=>poly.map(ring=>ring.map((p,i)=>`${i?'L':'M'}${project(p[0],p[1]).map(n=>n.toFixed(1)).join(',')}`).join(' ')+'Z').join(' ')).join(' ')} fill="#f4f3e9" stroke="#a5b9aa" strokeWidth="1.1" fillRule="evenodd"/>)}
 {named.map(([label,lng,lat])=>{const[x,y]=project(lng,lat);return <text key={label} x={x} y={y} textAnchor="middle" transform={label==='MANHATTAN'?`rotate(-65 ${x} ${y})`:undefined} fill="#637e70" fontSize="11" letterSpacing="1.3" fontWeight="600">{label}</text>})}
 <text x="270" y="410" textAnchor="middle" fill="#7eaaa6" fontSize="12" letterSpacing="1.6" transform="rotate(-18 270 410)">UPPER BAY</text>
 {places.map((p,i)=>{const c=neighborhoodCoordinates[p.name];if(!c)return null;const[x,y]=project(c.lng,c.lat);return <g key={p.name} transform={`translate(${x} ${y})`} className={'map-marker '+(active===p.name?'active':'')} role="button" tabIndex={0} aria-label={`${i+1}. ${p.name}, ${p.borough}, model score ${p.score}`} onClick={()=>setActive(p.name)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setActive(p.name)}}}><circle r="16" fill={active===p.name?'#db5937':'#245b47'} stroke="white" strokeWidth="3"/><text y="4" textAnchor="middle" fill="white" fontSize="12" fontWeight="700">{i+1}</text><title>{p.name}</title></g>})}
 </svg>
 <div className="map-orientation">N ↑</div>
 {!compact&&<div className="map-controls"><button aria-label="Zoom in map" onClick={()=>setZoom(Math.min(1.8,zoom+.2))}><Plus size={16}/></button><button aria-label="Zoom out map" onClick={()=>setZoom(Math.max(1,zoom-.2))}><Minus size={16}/></button><button aria-label="Reset map" onClick={()=>{setZoom(1);setActive('')}}><RotateCcw size={15}/></button></div>}
 {selected&&<div className="map-popup"><button className="map-popup-close" aria-label="Close map selection" onClick={()=>setActive('')}>×</button><span className="mini-label">{selected.borough}</span><h3>{selected.name}</h3><p>Model score {selected.score}/100 · sample rent ${selected.rent.toLocaleString()}/mo</p>{onSelect&&<button className="text-button" onClick={()=>onSelect(selected.name)}>See neighborhood details <ArrowUpRight size={15}/></button>}</div>}
 </div>
 {!compact&&<><div className="map-legend"><span><MapPin size={15}/> Numbered markers match the ranked list</span><a href="https://data.cityofnewyork.us/City-Government/Borough-Boundaries/gthc-hcne" target="_blank" rel="noreferrer">Boundaries: NYC Planning</a></div><p className="map-disclaimer">Approximate neighborhood centers, not available properties. The map reflects your applied filters.</p></>}
 </section>
}
