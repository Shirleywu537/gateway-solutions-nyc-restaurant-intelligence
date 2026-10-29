import {readSource} from '@/lib/source-cache';
import {fetchLocationSupply} from '@/lib/location-data';
export async function GET(){try{return Response.json(await readSource('location-supply-v1',fetchLocationSupply,24*60*60*1000),{headers:{'Cache-Control':'no-store'}})}catch{return Response.json({error:'Neighborhood data is temporarily unavailable. Retry to load the official source.'},{status:503})}}
