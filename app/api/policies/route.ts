import {readSource} from '@/lib/source-cache';
import {fetchPolicies} from '@/lib/public-data';
export async function GET() {
  try { return Response.json(await readSource('nyc-policy-notices-v3',fetchPolicies),{headers:{'Cache-Control':'no-store'}}); }
  catch { return Response.json({error:'The official notice feed is temporarily unavailable. Please try again later.'},{status:503}); }
}
