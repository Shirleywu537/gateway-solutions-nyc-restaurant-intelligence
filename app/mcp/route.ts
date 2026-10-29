import {fetchLocationSupply} from '@/lib/location-data';
import {readSource} from '@/lib/source-cache';
import {fetchCuisines,fetchPolicies} from '@/lib/public-data';
const tool={name:'read_gateway_public_updates',title:'Check Gateway public restaurant updates',description:'Read and refresh the Gateway website’s fixed public NYC policy-notice and cuisine-metric caches when due. Uses only NYC City Record and DOHMH. No visitor input, private business data, arbitrary URLs, or publication is accepted. Returns source-check times, stale/error state, and counts. Use for the linked daily update task; a fresh cache is reused. This action works without an open browser or a local computer.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:true}};
export async function POST(request:Request){
 let id:unknown=null;
 try{
  const msg=await request.json() as {jsonrpc?:string;id?:unknown;method?:string;params?:{name?:string;arguments?:Record<string,unknown>}};id=msg.id??null;
  if(msg.jsonrpc!=='2.0')return Response.json({jsonrpc:'2.0',id,error:{code:-32600,message:'Expected JSON-RPC 2.0'}},{status:400});
  const ok=(result:unknown)=>Response.json({jsonrpc:'2.0',id,result});
  if(msg.method==='server/discover')return ok({supportedVersions:['2026-07-28'],capabilities:{tools:{}}});
  if(msg.method==='initialize')return ok({protocolVersion:'2025-03-26',capabilities:{tools:{}},serverInfo:{name:'Gateway Public Data',version:'2.0.0'}});
  if(msg.method==='notifications/initialized')return new Response(null,{status:204});
  if(msg.method==='tools/list')return ok({tools:[tool]});
  if(msg.method==='tools/call'){
   if(msg.params?.name!==tool.name||Object.keys(msg.params.arguments||{}).length)return ok({isError:true,content:[{type:'text',text:'Use read_gateway_public_updates with an empty argument object.'}]});
   const results=await Promise.allSettled([readSource('nyc-policy-notices-v3',fetchPolicies),readSource('cuisine-presence-v1',fetchCuisines,24*60*60*1000),readSource('location-supply-v1',fetchLocationSupply,24*60*60*1000)]);
   const summary=results.map((r,i)=>r.status==='fulfilled'?{source:['NYC City Record agency notices','NYC DOHMH restaurant records','NYC DOHMH neighborhood cuisine supply'][i],fetchedAt:r.value.fetchedAt,stale:r.value.stale,error:r.value.error,records:'items' in r.value.data?r.value.data.items.length:r.value.data.total}:{source:['NYC City Record agency notices','NYC DOHMH restaurant records','NYC DOHMH neighborhood cuisine supply'][i],error:'Official data could not be checked.'});
   return ok({isError:summary.some(r=>!!r.error),content:[{type:'text',text:JSON.stringify({checkedAt:new Date().toISOString(),website:'https://gateway-nyc-restaurant-intelligence.ww537136522.chatgpt.site',sources:summary})}]});
  }
  return Response.json({jsonrpc:'2.0',id,error:{code:-32601,message:'Method not found'}});
 }catch{return Response.json({jsonrpc:'2.0',id,error:{code:-32603,message:'The update check could not be completed.'}},{status:500})}
}
