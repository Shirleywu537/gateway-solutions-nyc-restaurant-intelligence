import {conceptDefinitions,conceptDefinition} from '../lib/concept-config.ts';
import type {LocationSnapshot} from '../lib/location-data.ts';
export const conceptProfiles = conceptDefinitions;
export const concepts=conceptProfiles.map(c=>c.name);
export const neighborhoodCoordinates:Record<string,{lat:number;lng:number}>={
'Astoria':{lat:40.7644,lng:-73.9235},'Lower East Side':{lat:40.7150,lng:-73.9843},
'Williamsburg':{lat:40.7081,lng:-73.9571},'Sunset Park':{lat:40.6455,lng:-74.0124},
'Long Island City':{lat:40.7447,lng:-73.9485},'Harlem':{lat:40.8116,lng:-73.9465},
'Mott Haven':{lat:40.8091,lng:-73.9229},'St. George':{lat:40.6437,lng:-74.0736}};
export const boroughs=['All boroughs','Manhattan','Brooklyn','Queens','Bronx','Staten Island'];
export const neighborhoods=[
{name:'Astoria',borough:'Queens',rent:5500,transit:83,fit:[93,88,81],focus:'Repeat neighborhood visits',tradeoff:'Validate demand block by block, especially away from transit.'},
{name:'Lower East Side',borough:'Manhattan',rent:10000,transit:94,fit:[79,85,95],focus:'Evening dining occasions',tradeoff:'Test whether dinner revenue can support the assumed occupancy cost.'},
{name:'Williamsburg',borough:'Brooklyn',rent:9000,transit:85,fit:[91,82,92],focus:'A distinctive destination concept',tradeoff:'Compare direct competitors and the cost of standing out.'},
{name:'Sunset Park',borough:'Brooklyn',rent:4500,transit:81,fit:[72,92,75],focus:'Accessible everyday meals',tradeoff:'Check local preferences, dayparts, and suitable kitchen spaces.'},
{name:'Long Island City',borough:'Queens',rent:7000,transit:90,fit:[89,91,82],focus:'Weekday and residential occasions',tradeoff:'Measure the difference between weekday and weekend demand.'},
{name:'Harlem',borough:'Manhattan',rent:5500,transit:88,fit:[83,85,87],focus:'A regular neighborhood audience',tradeoff:'Compare specific commercial corridors and evening activity.'},
{name:'Mott Haven',borough:'Bronx',rent:4000,transit:75,fit:[79,86,73],focus:'A smaller initial footprint',tradeoff:'Validate foot traffic and demand before relying on growth assumptions.'},
{name:'St. George',borough:'Staten Island',rent:3500,transit:64,fit:[80,82,71],focus:'A commuter-facing concept',tradeoff:'Observe ferry-linked demand and slower service periods.'}
];
export function rankLocations(borough:string,concept:string,budget:number,supply?:LocationSnapshot){
 if(!boroughs.includes(borough)||!concepts.includes(concept)||!Number.isFinite(budget)||budget<=0)throw new Error('Choose a valid concept, borough, and positive budget.');
 const definition=conceptDefinition(concept);const cityCount=supply?definition.cuisines.reduce((sum,c)=>sum+(supply.city.counts[c]||0),0):0;const cityShare=supply&&supply.city.total?cityCount/supply.city.total:0;
 return neighborhoods.filter(n=>(borough==='All boroughs'||n.borough===borough)&&n.rent<=budget).map(n=>{
  const affordability=Math.round(Math.min(100,50+50*(budget-n.rent)/budget));const area=supply?.areas.find(a=>a.name===n.name);const count=area?definition.cuisines.reduce((sum,c)=>sum+(area.counts[c]||0),0):0;const share=area?.total?count/area.total:0;const lift=cityShare?share/cityShare:0;const usable=!!area&&area.total>=20&&cityCount>=10;
  const strength=usable?Math.round(50+(Math.min(100,50*Math.sqrt(lift))-50)*Math.min(1,count/10)):null;
  const fit=strength??n.fit[definition.base];const score=usable?Math.round(.25*affordability+.55*fit+.2*n.transit):Math.round(.45*affordability+.35*fit+.2*n.transit);
  return {...n,affordability,conceptFit:fit,score,evidence:usable?{count,total:area!.total,share:share*100,cityShare:cityShare*100,lift,density:count/(Math.PI*(supply!.radiusKm**2))}:null};
 }).sort((a,b)=>b.score-a.score||a.rent-b.rent)
}
export type Profile={concept?:string;employees:number;hours:number;wage:number;area:number;sharedArea:number;chainArea:number;locations:number;hotelRooms:number;lidded:boolean};
export function assess(p:Profile){for(const [k,v] of Object.entries(p))if(typeof v==='number'&&(!Number.isFinite(v)||v<0))throw new Error('Enter non-negative numbers.');if(p.hours>40)throw new Error('Use up to 40 regular weekly hours; overtime is outside this estimate.');const wageGap=Math.max(0,17-p.wage);const annual=wageGap*p.employees*p.hours*52;const reasons=[p.area>=7000?'Your restaurant is at least 7,000 sq ft.':'',p.sharedArea>=8000?'Combined food-service space at the same site is at least 8,000 sq ft.':'',p.locations>=2&&p.chainArea>=8000?'Your chain has at least 2 NYC locations and 8,000 combined sq ft.':'',p.hotelRooms>=100?'Your restaurant is in a hotel with at least 100 rooms.':''].filter(Boolean);return{annual,monthly:annual/12,wageGap,organics:reasons.length>0,reasons,attention:Number(annual>0)+Number(!p.lidded)+Number(reasons.length>0)}}
export function triageNotice(text:string){if(text.trim().length<40)throw new Error('Paste at least 40 characters from a government notice.');const topics=[{name:'Labor & payroll',pattern:/\b(wage|payroll|overtime|paid leave|employee)\b/i,action:'Compare affected worker categories, pay rates, and the effective date with your payroll.'},{name:'Waste & sanitation',pattern:/\b(waste|organics|compost|container|sanitation|recycling)\b/i,action:'Check business-size thresholds, collection arrangements, and whether the rule is adopted.'},{name:'Outdoor dining & permits',pattern:/\b(outdoor|sidewalk|roadway|permit|license|licensing)\b/i,action:'Check whether the notice covers your dining setup and requires an application or renewal.'},{name:'Food safety',pattern:/\b(inspection|food safety|temperature|allergen|health code)\b/i,action:'Compare the relevant kitchen procedure with the official rule and staff training.'}];return topics.flatMap(t=>{const m=t.pattern.exec(text);return m?[{name:t.name,matched:m[0],action:t.action}]:[]})}
