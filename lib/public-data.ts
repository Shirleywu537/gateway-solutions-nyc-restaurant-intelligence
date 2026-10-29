export type CuisineMetric = { name: string; count: number; share: number };
export type CuisineSnapshot = { rows: CuisineMetric[]; total: number; classified: number; sourceDate: string; sourceUrl: string };
export type PolicyNotice = { id: string; title: string; agency: string; published: string; eventDate: string | null; noticeType: string; status: string; topics: string[]; url: string };
export type PolicySnapshot = { items: PolicyNotice[]; examined: number; latestSourcePublication: string; since: string; sourceUrl: string };
export function plainText(value: unknown): string {
  return String(value ?? '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
}
export function summarizeCuisines(records: {camis?: string; cuisine?: string; record_date?: string}[]): CuisineSnapshot {
  const seen = new Set<string>(); const counts = new Map<string, number>(); let sourceDate = '';
  for (const r of records) {
    if (!r.camis || seen.has(r.camis)) continue;
    seen.add(r.camis);
    const name = r.cuisine?.trim() || 'Not recorded';
    counts.set(name, (counts.get(name) || 0) + 1);
    if ((r.record_date || '') > sourceDate) sourceDate = r.record_date!;
  }
  const total = seen.size;
  if (!total) throw new Error('No restaurant records returned');
  return {rows: [...counts].map(([name, count]) => ({name, count, share: count / total * 100})).sort((a,b) => b.count-a.count || a.name.localeCompare(b.name)), total, classified: total-(counts.get('Not recorded')||0), sourceDate: sourceDate.slice(0,10), sourceUrl: 'https://data.cityofnewyork.us/Health/DOHMH-New-York-City-Restaurant-Inspection-Results/43nn-pn8j'};
}
const policyTopics = [
  ['Waste & sanitation', /commercial waste|\bcwz\b|commercial organics|food waste|restaurant.*(?:waste|container)/i],
  ['Labor & payroll', /safe and sick|protected time off|paid (?:safe|sick|leave)|minimum wage|fast food|fair workweek|restaurant.*(?:employee|worker)/i],
  ['Dining & licensing', /outdoor dining|sidewalk caf[eé]|roadway dining|restaurant surcharge|restaurant.*(?:permit|licens)/i],
  ['Delivery services', /food delivery|delivery (?:worker|service)/i],
  ['Food safety', /food safety|food protection|allergen|restaurant inspection|article\s*81|food.*health code|health code.*food/i],
] as const;
export function parsePolicies(records: Record<string, unknown>[], since: string, today: string): PolicySnapshot {
  const seen = new Set<string>(); const items: PolicyNotice[] = [];
  let latestSourcePublication = '';
  for (const row of records) {
    const published = String(row.start_date || '').slice(0,10);
    if (published > latestSourcePublication && published <= today) latestSourcePublication = published;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(published) || published < since || published > today || row.section_name !== 'Agency Rules') continue;
    const id = String(row.request_id || ''); if (!/^\d+$/.test(id) || seen.has(id)) continue;
    const title = plainText(row.short_title);
    const agency = plainText(row.agency_name);
    if (!/sanitation|consumer|worker|health|transportation|buildings|labor|small business/i.test(agency)) continue;
    const body = [title, row.additional_description_1, row.additional_description_2, row.additional_description_3].map(plainText).join(' ');
    const topics: string[] = policyTopics.filter(([, pattern]) => pattern.test(body)).map(([name]) => name);
    if (!topics.length && /restaurant|food service|food establishment/i.test(body)) topics.push('Restaurant operations');
    if (!topics.length) continue;
    seen.add(id);
    const noticeType = plainText(row.type_of_notice_description);
    const status = /final rule|\bnoa\b|notice of adoption|adopted/i.test(title) ? 'Adoption notice' : /propos|\bnoh\b/i.test(title) || /hearing/i.test(noticeType) ? 'Proposal / hearing' : 'Agency notice';
    const eventDate = String(row.event_date || '').slice(0,10);
    items.push({id, title, agency, published, eventDate: /^\d{4}-\d{2}-\d{2}$/.test(eventDate) ? eventDate : null, noticeType, status, topics, url: 'https://a856-cityrecord.nyc.gov/RequestDetail/'+id});
  }
  return {items: items.sort((a,b)=>b.published.localeCompare(a.published)), examined: records.length, latestSourcePublication, since, sourceUrl:'https://data.cityofnewyork.us/City-Government/City-Record-Online/dg92-zbpx'};
}
async function getJson(url: string) {
  const response = await fetch(url, {signal: AbortSignal.timeout(25000), headers:{Accept:'application/json'}});
  if (!response.ok) throw new Error('Official source unavailable');
  const data = await response.json();
  if (!Array.isArray(data)) throw new Error('Official source format changed');
  return data;
}
export async function fetchCuisines() {
  const q = new URLSearchParams({'$select':'camis,max(cuisine_description) as cuisine,max(record_date) as record_date','$group':'camis','$limit':'50000'});
  const data = await getJson('https://data.cityofnewyork.us/resource/43nn-pn8j.json?'+q);
  if (data.length >= 50000) throw new Error('Restaurant source exceeds coverage limit');
  return summarizeCuisines(data);
}
export async function fetchPolicies() {
  const today = new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const since = new Date(Date.parse(today+'T12:00:00Z')-365*86400000).toISOString().slice(0,10);
  const q = new URLSearchParams({'$where':`section_name='Agency Rules' AND start_date >= '${since}T00:00:00'`,'$order':'start_date DESC,request_id DESC','$limit':'5000'});
  const data = await getJson('https://data.cityofnewyork.us/resource/dg92-zbpx.json?'+q);
  if (data.length >= 5000) throw new Error('Notice source exceeds coverage limit');
  return parsePolicies(data, since, today);
}
