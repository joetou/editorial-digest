import {load} from 'cheerio';
import {sourceFetch} from './http-source';
import {canonical,extract} from './extract';
import {sources,type Source} from './sources';
import {newsCategories,type Editorial,type NewsCategory,type SourceStatus} from './types';
import {shiftDay} from './dates';
import {briefPrompt,parseSummary,requestJson,type SummaryOptions} from './deepseek';
export type NewsCandidate={title:string;body:string;url:string;published_date:string;source:Source;category:NewsCategory};
const rejectOpinion=/社論|社評|新聞小語|來論|評論|觀點|專欄/;
export function discoverNews(html:string,base:string,source:Source,category:NewsCategory){
 const $=load(html),urls=new Set<string>();
 $('a[href]').each((_,a)=>{const text=$(a).text().trim();if(text.length<6||rejectOpinion.test(text))return;
 try{const u=canonical($(a).attr('href')!,base);if(source.id==='macaodaily'){const label=$(a).closest('.listblock').prev('h4').text();if(!/content_\d+\.htm/.test(u)||!label.includes(category==='澳聞'?'澳聞':category==='港聞'?'港聞':'要聞'))return;}
 else if(source.id==='singtao'){const path=new URL(u).pathname;const section=category==='國際新聞'?'realtime-world|world':category==='內地新聞'?'realtime-china|china':'breaking-news|realtime-hongkong|news';if(!new RegExp('/('+section+')/\\d+/').test(path))return;}
 urls.add(u);}catch{}});return [...urls].slice(0,10);
}
export function parseNewsDecision(data:unknown,known:Editorial[]){
 const d=data as {choices?:{finish_reason?:string;message?:{content?:string}}[]};const choice=d?.choices?.[0];if(choice?.finish_reason!=='stop'||(choice.message as {refusal?:string})?.refusal)throw new Error('新聞判斷未完成');
 const value=JSON.parse(choice.message?.content||'');if(!newsCategories.includes(value.category))throw new Error('新聞分類無效');
 if(value.duplicate_id!==null&&!(typeof value.duplicate_id==='string'&&known.some(a=>a.id===value.duplicate_id)))throw new Error('重複新聞識別碼無效');
 return {category:value.category as NewsCategory,duplicate_id:value.duplicate_id as string|null,summary:value.duplicate_id?[]:parseSummary(data)};
}
export function summarizeNews(a:NewsCandidate,known:Editorial[],opts:SummaryOptions){
 return requestJson('你是新聞摘要編輯。先判斷是否和已收錄新聞報道同一具體事件；不同報章、改寫標題、相同事件的補充細節仍視為同一則。僅人物或主題相同，但不同時間、地點、行動或結果的事件不可合併。重複則 duplicate_id 填已收錄的 id，points 填空陣列；否則 duplicate_id 填 null。category 只可為「國際新聞」「內地新聞」「港聞」「澳聞」，按事件發生地和核心內容分類，跨境事件按主題所在地，不按報章所在地。排除社論和評論。'+briefPrompt+' JSON 必須另外包含 category 和 duplicate_id。',{title:a.title,article:a.body,section_hint:a.category,already_collected:known.map(v=>({id:v.id,title:v.title,date:v.published_date,points:v.summary}))},d=>parseNewsDecision(d,known),opts);
}
export async function gatherNews(today:string){
 const items:NewsCandidate[]=[],status:SourceStatus[]=[];
 for(const id of ['singtao','macaodaily']){
 const source=sources.find(s=>s.id===id)!,errors:string[]=[];let found=0;
 const days=id==='macaodaily'?[today,shiftDay(today,-1)]:[today];
 for(const day of days){
 const categories:NewsCategory[]=id==='macaodaily'?['澳聞','港聞','國際新聞']:['國際新聞','內地新聞','港聞'];
 for(const category of categories){
 const index=id==='macaodaily'?source.index.replace('{month}',day.slice(0,7)).replace('{day}',day.slice(8)):category==='國際新聞'?'https://www.stheadline.com/realtime-world/即時國際':category==='內地新聞'?'https://www.stheadline.com/realtime-china/即時中國':'https://www.stheadline.com/news/港聞';
 try{const html=await sourceFetch(index,source);const urls=discoverNews(html,index,source,category);for(const url of urls){if(items.some(a=>a.url===url))continue;
 try{const a=extract(await sourceFetch(url,source),url,source,true);if(a.published_date<shiftDay(today,-3)||a.published_date>today||rejectOpinion.test(a.title))continue;items.push({...a,url,source,category});found++;}catch(e){errors.push(e instanceof Error?e.message:'正文讀取失敗');}}
 }catch(e){errors.push(e instanceof Error?e.message:'來源讀取失敗');}
 }
 }
 status.push({source_id:id,state:found?'ok':'waiting',message:found?`取得 ${found} 篇候選報道；同事件只保留一個來源。`:[...new Set(errors)].slice(0,2).join('；')||'未找到近期可用新聞',updated_at:new Date().toISOString()});
 }
 return {items,status};
}
