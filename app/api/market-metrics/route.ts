import {readSource} from '@/lib/source-cache';
import {fetchCuisines} from '@/lib/public-data';
export async function GET() {
  try { return Response.json(await readSource('cuisine-presence-v1',fetchCuisines,24*60*60*1000),{headers:{'Cache-Control':'no-store'}}); }
  catch { return Response.json({error:'Restaurant metrics are temporarily unavailable. Please try again later.'},{status:503}); }
}
