import {detectConcept,conceptDefinition,checksForConcept,noticeRelevance,restaurantSource} from './concept-config.ts';
import {rankLocations,neighborhoods,boroughs} from '../app/models.ts';
import type {LocationSnapshot} from './location-data.ts';
import type {CuisineSnapshot,PolicySnapshot} from './public-data.ts';
import type {Signal} from '../app/data.ts';
export type ResearchInput={concept:string;borough:string;budget:number};
export type AssistantIntent='location'|'risk'|'market'|'help';
export type Answer={text:string;citations:{label:string;url:string}[];intent:AssistantIntent;context:ResearchInput;view?:string};
export type AssistantData={locations?:LocationSnapshot;cuisines?:CuisineSnapshot;policies?:PolicySnapshot;news?:Signal[];warnings?:string[]};
export function questionContext(question:string,previous:ResearchInput){
 const concept=detectConcept(question)||previous.concept;
 const borough=boroughs.slice(1).find(b=>question.toLowerCase().includes(b.toLowerCase()))||(/all boroughs|全市|所有区/i.test(question)?'All boroughs':previous.borough);
 const budgetMatch=question.match(/\$\s*([\d,]+(?:\.\d+)?)\s*(k)?|(?:budget|rent|预算|租金)\s*(?:of|under|is|below|:|为|是|不超过)?\s*([\d,]+(?:\.\d+)?)\s*(k)?/i);
 const parsed=budgetMatch?Number((budgetMatch[1]||budgetMatch[3]).replaceAll(',',''))*((budgetMatch[2]||budgetMatch[4])?1000:1):previous.budget;
 return {concept,borough,budget:Number.isFinite(parsed)&&parsed>0?parsed:previous.budget};
}
export function answerQuestion(question:string,previous:ResearchInput,data:AssistantData,lastIntent:AssistantIntent='help'):Answer{
 const context=questionContext(question,previous);const q=question.trim();const zh=/[\u4e00-\u9fff]/.test(q);
 const citation=(label:string,url:string)=>({label,url});const out=(text:string,intent:AssistantIntent,citations:Answer['citations']=[],view?:string):Answer=>({text,citations,intent,context,view});
 if(/ignore.*instruct|system prompt|api.?key|password|忽略.*指令|密码/i.test(q))return out(zh?'我只能帮助查询本站的餐饮研究数据。请选择选址、市场或政策问题。':'I can help with Gateway restaurant research: neighborhoods, market signals, and policy topics.','help');
 if(/wage|payroll|最低工资|工资/i.test(q)&&!detectConcept(q))return out(zh?'本站参考计算使用纽约市 2026 年一般最低时薪 $17，参考规则于 2026 年 10 月 9 日审核。小费抵扣、加班及其他员工类别不在这个简化计算内。请核对纽约州劳工部最新规定。':'Gateway’s reference calculator uses the NYC 2026 general minimum wage of $17/hour, reviewed October 9, 2026. It excludes tip credits, overtime, and other worker categories. Confirm current applicability with the NYS Department of Labor.','risk',[citation('NYS Department of Labor','https://dol.ny.gov/history-minimum-wage-new-york-state')],'risk');
 if(/how.*score|method|calculate|data source|where.*(?:data|percent)|评分|算法|数据来源/i.test(q))return out(zh?'选址评分：55% 菜系分布、25% 预算适配、20% 示例交通评分。菜系分布比较 1 公里内同类餐厅占比与全市占比，样本少时向中性分数调整。无足够数据时回退到已标注的服务类型假设。餐厅数量来自 NYC DOHMH；这不能证明消费偏好。':'Location scores combine 55% cuisine presence, 25% budget fit, and 20% illustrative transit access. Cuisine presence compares the matching share within 1 km with the citywide share; small samples are reduced toward neutral. Without enough evidence, the older service-format assumptions are clearly labeled. Counts come from NYC DOHMH, not sales or consumer surveys.','location',[citation('NYC DOHMH restaurant records',restaurantSource)],'location');
 let intent:AssistantIntent=/neighbo|location|where|open.*restaurant|recommend|shortlist|rent|budget|选址|哪里|地区|推荐|预算|租金/i.test(q)?'location':/risk|polic|regulat|rule|permit|license|notice|关注|风险|政策|法规|许可/i.test(q)?'risk':/trend|market|popular|news|cuisine.*share|市场|热门|新闻|趋势|占比/i.test(q)?'market':'help';
 const named=neighborhoods.find(n=>q.toLowerCase().includes(n.name.toLowerCase()));
 if(named)intent='location';
 if(intent==='help'&&(detectConcept(q)||/why|what about|and |为什么|那|还有/i.test(q)))intent=lastIntent==='help'?'location':lastIntent;
 if(intent==='location'){
  if(!data.locations)return out(zh?'暂时无法取得社区餐厅数据。我不能给出有证据的菜系排名。请稍后重试，或打开 Location Picker 查看明确标注的示例评分。':'Neighborhood source data is unavailable, so I cannot give an evidence-based cuisine ranking right now. Retry shortly or open Location Picker for clearly labeled illustrative screening.','location',[],'location');
  const ranked=rankLocations(named?'All boroughs':context.borough,context.concept,named?Math.max(context.budget,named.rent):context.budget,data.locations);
  const rows=named?ranked.filter(n=>n.name===named.name):ranked.slice(0,3);
  if(!rows.length)return out(zh?'在当前区域和预算下，八个样本社区中没有符合条件的选项。请增加预算或选择 All boroughs。':'None of the eight covered neighborhoods fits your borough and sample-rent budget. Try a higher budget or All boroughs.','location',[],'location');
  const intro=zh?`${context.concept} · ${context.borough} · 月租预算 $${context.budget.toLocaleString()}。以下比较来自 1 公里范围内的餐厅分布：`:`For ${context.concept}, ${context.borough}, with a $${context.budget.toLocaleString()}/month rent budget, here is the 1 km restaurant-supply evidence:`;
  const lines=rows.map((n,i)=>n.evidence?`${i+1}. ${n.name}: ${n.evidence.count}/${n.evidence.total} ${zh?'家匹配餐厅':'matching restaurants'} (${n.evidence.share.toFixed(1)}%); ${n.evidence.lift.toFixed(1)}× ${zh?'全市占比':'citywide share'}; ${zh?'示例月租':'sample rent'} $${n.rent.toLocaleString()}; ${zh?'评分':'score'} ${n.score}/100.`:`${i+1}. ${n.name}: ${zh?'数据不足，只有示例评分':'insufficient cuisine evidence; illustrative score only'} ${n.score}/100.`);
  return out([intro,...lines,zh?'更多同类餐厅既可能代表成熟的餐饮类别，也意味着竞争。这不是受欢迎程度或销量预测；租金和交通评分仍为示例。':`More existing restaurants can signal an established category and greater competition. This is not measured popularity or a sales forecast; rents and transit scores are illustrative.${conceptDefinition(context.concept).proxy?' This concept uses menu categories as a proxy, not observed service format.':''}`,data.warnings?.join(' ')||''].filter(Boolean).join('\n\n'),'location',[citation('NYC DOHMH · source '+data.locations.sourceDate,restaurantSource)],'location');
 }
 if(intent==='risk'){
  const checks=checksForConcept(context.concept);const policies=data.policies?.items.filter(p=>noticeRelevance(p,context.concept).priority).slice(0,3)||[];
  const text=[zh?`${context.concept} 的重点检查事项（需要根据实际经营情况确认）：`:`For ${context.concept}, start with these conditional operational checks:`,...checks.map(c=>`${c.title}: ${c.question}`),policies.length?(zh?'相关官方公告：':'Related official notices:')+'\n'+policies.map(p=>`${p.published} · ${p.title} (${p.status})`).join('\n'):(data.policies?(zh?'当前来源中没有匹配的优先公告。一般餐饮规定仍可能适用。':'No concept-priority notice matched this source snapshot. General restaurant obligations may still apply.'):(zh?'官方公告数据暂时不可用。':'The official notice feed is unavailable.')),zh?'检查事项来自官方参考资料，并不代表刚发布的新法规。公告发布日期不是生效日期；餐厅类型本身不能确定适用性或违规。':'These checks are official reference guidance, not necessarily new rules. Publication is not an effective date. A concept label alone does not establish applicability or a violation.',data.warnings?.join(' ')||''].filter(Boolean).join('\n\n');
  return out(text,'risk',[...checks.map(c=>citation(c.agency,c.source)),...policies.map(p=>citation(p.title,p.url))],'risk');
 }
 if(intent==='market'){
  const definition=conceptDefinition(context.concept);const related=(data.news||[]).filter(s=>definition.keywords.test(s.title));const cuisine=data.cuisines;const count=cuisine?.rows.filter(r=>definition.cuisines.includes(r.name)).reduce((n,r)=>n+r.count,0)||0;
  const text=[zh?`${context.concept} 的市场信号：`:`Market signals for ${context.concept}:`,cuisine?(zh?`全市记录中有 ${count.toLocaleString()} / ${cuisine.total.toLocaleString()} 家匹配餐厅（${(count/cuisine.total*100).toFixed(1)}%），来源日期 ${cuisine.sourceDate}。`:`${count.toLocaleString()} of ${cuisine.total.toLocaleString()} NYC restaurant records match these categories (${(count/cuisine.total*100).toFixed(1)}%), source date ${cuisine.sourceDate}.`):(zh?'餐厅数量数据暂时不可用。':'Restaurant-count data is unavailable.'),data.news===undefined?(zh?'新闻来源暂时不可用，请稍后重试。':'The news source is unavailable; please retry.'):related.length?related.slice(0,3).map(s=>`${s.date} · ${s.title}`).join('\n'):(zh?'当前七天新闻样本中没有明确匹配此类型的标题。':'No headline explicitly matches this concept in the current seven-day news sample.'),zh?'这些占比衡量餐厅供给，不能代表消费偏好、销量或一周增长。完整图表和新闻请查看 Market Investigator。':'These shares measure restaurant supply, not consumer preference, sales, or weekly growth. Open Market Investigator for the full charts and reporting.',data.warnings?.join(' ')||''].filter(Boolean).join('\n\n');
  return out(text,'market',[...(cuisine?[citation('NYC DOHMH',restaurantSource)]:[]),...related.slice(0,3).map(s=>citation(s.source+' · '+s.title,s.url))],'market');
 }
 return out(zh?'我使用本站数据和预设分析规则回答问题，目前不是通用生成式 AI。你可以问：“寿司店适合哪些社区？”、“外卖餐厅有哪些风险？”或“为什么推荐 Astoria？”。我也能继续比较另一种餐厅类型。':'I answer from Gateway data and defined research rules; I am not a general-purpose generative AI. Try “Where should I open a sushi restaurant?”, “What risks should a delivery restaurant review?”, or “Why Astoria?”. You can follow up with another concept.','help');
}
