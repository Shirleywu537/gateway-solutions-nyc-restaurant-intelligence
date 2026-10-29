import assert from 'node:assert/strict';
import {test} from 'node:test';
import {summarizeCuisines,parsePolicies} from '../lib/public-data.ts';
import {rankLocations,concepts} from '../app/models.ts';
test('cuisine denominator counts distinct restaurants and includes missing labels',()=>{
 const r=summarizeCuisines([{camis:'1',cuisine:'Italian',record_date:'2026-10-09'},{camis:'1',cuisine:'Italian'},{camis:'2',cuisine:'Chinese'},{camis:'3'}]);
 assert.equal(r.total,3);assert.equal(r.classified,2);assert.equal(r.rows.find(x=>x.name==='Italian').count,1);assert.ok(Math.abs(r.rows.reduce((s,x)=>s+x.share,0)-100)<.00001);assert.equal(r.sourceDate,'2026-10-09');
});
test('policy screen separates notices from legal effective dates and rejects irrelevant records',()=>{
 const base={agency_name:'Sanitation',section_name:'Agency Rules',start_date:'2026-10-01T00:00:00',type_of_notice_description:'Notice'};
 const result=parsePolicies([{...base,request_id:1,short_title:'Final Rule commercial waste zones'},{...base,request_id:1,short_title:'Final Rule commercial waste zones'},{...base,request_id:2,short_title:'Proposed commercial waste changes',event_date:'2026-10-20T12:00:00'},{...base,request_id:3,short_title:'Fleet vehicle purchasing'},{...base,request_id:4,short_title:'Commercial waste',section_name:'Procurement'},{...base,request_id:5,short_title:'Commercial waste',start_date:'2026-11-01'},{...base,request_id:6,agency_name:'Health and Mental Hygiene',short_title:'Amendment of Vital Records (Article 203 of the NYC Health code)'}],'2025-10-11','2026-10-11');
 assert.equal(result.items.length,2);assert.equal(result.items[0].status,'Adoption notice');assert.equal(result.items[1].status,'Proposal / hearing');assert.equal(result.items[1].eventDate,'2026-10-20');assert.ok(!('effectiveDate' in result.items[0]));
});
test('all 15 concepts rank predictably and respect borough and budget filters',()=>{
 assert.equal(concepts.length,15);for(const c of concepts){const rows=rankLocations('Queens',c,8000);assert.equal(rows.length,2);assert.ok(rows.every(n=>n.borough==='Queens'&&n.rent<=8000&&Number.isFinite(n.score)&&n.score>=0&&n.score<=100))}
 assert.equal(rankLocations('All boroughs','Café & bakery',1).length,0);assert.throws(()=>rankLocations('Queens','Invalid',8000));
});

const {summarizeLocations}=await import('../lib/location-data.ts');
const {conceptDefinition,checksForConcept,noticeRelevance}=await import('../lib/concept-config.ts');
const {answerQuestion,questionContext}=await import('../lib/assistant.ts');
test('spatial supply deduplicates the latest complete restaurant record and reports missing coordinates',()=>{
 const r=summarizeLocations([{camis:'1',cuisine_description:'Chinese',latitude:'40.7644',longitude:'-73.9235',inspected:'2026-01-01',record_date:'2026-10-19'},{camis:'1',cuisine_description:'Japanese',latitude:'40.7447',longitude:'-73.9485',inspected:'2026-10-01',record_date:'2026-10-19'},{camis:'2',cuisine_description:'Chinese',latitude:'0',longitude:'0'},{camis:'3',latitude:'40.7644',longitude:'-73.9235'}]);
 assert.equal(r.total,3);assert.equal(r.mapped,2);assert.equal(r.excluded,1);assert.equal(r.city.counts.Japanese,1);assert.equal(r.city.counts.Chinese,undefined);assert.equal(r.areas.find(x=>x.name==='Astoria').counts.Japanese,undefined);assert.equal(r.city.counts['Not recorded'],1);
});
const sampleSupply={areas:[{name:'Astoria',total:200,counts:{Chinese:100,Japanese:5}},{name:'Long Island City',total:200,counts:{Chinese:5,Japanese:100}}],city:{name:'NYC',total:1000,counts:{Chinese:200,Japanese:200}},total:1000,mapped:1000,excluded:0,radiusKm:1,sourceDate:'2026-10-19',sourceUrl:'https://data.cityofnewyork.us'};
test('changing cuisine changes the leading neighborhood using observed shares, with no hardcoded favorites',()=>{
 assert.equal(rankLocations('Queens','Chinese & dim sum',12000,sampleSupply)[0].name,'Astoria');
 assert.equal(rankLocations('Queens','Japanese & sushi',12000,sampleSupply)[0].name,'Long Island City');
 assert.equal(rankLocations('Queens','Japanese & sushi',6000,sampleSupply).length,1);
 assert.equal(rankLocations('Queens','Japanese & sushi',12000)[0].evidence,null);
});
test('concept risk prioritization retains general notices and separates reference checks from applicability',()=>{
 assert.ok(checksForConcept('Japanese & sushi').some(c=>c.title==='Raw fish handling'));
 assert.ok(checksForConcept('Delivery & takeout').some(c=>c.title==='Third-party delivery agreements'));
 assert.equal(noticeRelevance({title:'Delivery apps',topics:['Delivery services']},'Delivery & takeout').priority,true);
 assert.equal(noticeRelevance({title:'Labor notice',topics:['Labor & payroll']},'Japanese & sushi').priority,false);
 assert.match(noticeRelevance({title:'Labor notice',topics:['Labor & payroll']},'Japanese & sushi').reason,/may still apply/);
 assert.ok(conceptDefinition('Full-service dining').proxy);
});
test('assistant uses the same ranking, handles follow-ups, and admits missing source data',()=>{
 const ctx={concept:'Café & bakery',borough:'Queens',budget:12000};
 const first=answerQuestion('Where should I open a sushi restaurant?',ctx,{locations:sampleSupply});assert.equal(first.context.concept,'Japanese & sushi');assert.match(first.text,/1\. Long Island City/);assert.ok(first.citations.length);
 const next=answerQuestion('What about Chinese?',first.context,{locations:sampleSupply},first.intent);assert.match(next.text,/1\. Astoria/);
 const budget=questionContext('Chinese restaurant in Queens, budget $5k',ctx);assert.equal(budget.budget,5000);
 const missing=answerQuestion('Where should I open a sushi restaurant?',ctx,{});assert.match(missing.text,/unavailable/);assert.doesNotMatch(missing.text,/1\. /);
 const unknown=answerQuestion('Will my business definitely succeed?',ctx,{});assert.equal(unknown.intent,'help');assert.match(unknown.text,/not a general-purpose/);
 const chinese=answerQuestion('寿司店适合哪些地区？',ctx,{locations:sampleSupply});assert.equal(chinese.context.concept,'Japanese & sushi');assert.match(chinese.text,/不是受欢迎程度/);
});
