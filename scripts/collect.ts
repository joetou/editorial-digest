import {gatherNews,summarizeNews,groupNews} from '../lib/news';
import {readFile} from 'node:fs/promises';
import {collect} from '../lib/fetch-source';
import {summarize} from '../lib/deepseek';
import {sources} from '../lib/sources';
import {hktDate,shiftDay,validDay} from '../lib/dates';
import {readArchive,saveArchive,atomicJson,validateEditorial} from '../lib/archive';
import {canonical} from '../lib/extract';
import {sourceState} from '../lib/status';
import type {SourceStatus} from '../lib/types';
if(!process.env.DEEPSEEK_API_KEY){console.error('請先設定 GitHub Secret：DEEPSEEK_API_KEY；未呼叫API及更改歷史。');process.exit(1);}
const today=hktDate();const lower=shiftDay(today,-Math.max(1,Math.min(7,Number(process.env.LOOKBACK_DAYS)||3)));
const max=Math.max(1,Math.min(200,Number(process.env.MAX_API_REQUESTS)||96));let requests=0,saved=0;
const archive=await readArchive();const status:SourceStatus[]=[];const running=new Set<string>();
const beforeRequest=()=>{if(requests>=max)throw new Error('已達本輪 API 請求上限');requests++;};
// 新聞獨立儲存；只把成功生成及完成事件比對的摘要加入歷史。
let duplicates:Record<string,{keep_id:string;date:string}>={};try{duplicates=JSON.parse(await readFile('data/news/duplicates.json','utf8'));}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
const news=await readArchive('data/news/archive');const gathered=await gatherNews(today);let newsSaved=0;
const order=new Map<string,number>();const ranked=gathered.items.map(a=>{const key=a.source.id+'|'+a.category+'|'+a.published_date;const rank=order.get(key)||0;order.set(key,rank+1);return {a,rank};});
const candidates=ranked.sort((x,y)=>y.a.published_date.localeCompare(x.a.published_date)||x.rank-y.rank).map(v=>v.a);
for(const a of candidates){
 if(news.has(a.url)||duplicates[a.url]||requests>=max-12)continue;
 if([...news.values()].filter(v=>v.published_date===a.published_date&&v.category===a.category).length>=8)continue;
 try{const known=[...news.values()].filter(v=>v.published_date>=shiftDay(a.published_date,-1)&&v.published_date<=shiftDay(a.published_date,1));
 const result=await summarizeNews(a,known,{beforeRequest});if(result.duplicate_id){duplicates[a.url]={keep_id:result.duplicate_id,date:a.published_date};continue;}
 if([...news.values()].filter(v=>v.published_date===a.published_date&&v.category===result.category).length>=8)continue;
 const row=validateEditorial({source_id:a.source.id,newspaper:a.source.name,region:a.source.region,title:a.title,url:a.url,published_date:a.published_date,summary:result.summary,summary_version:2,category:result.category});news.set(row.url,row);newsSaved++;await saveArchive(news,'data/news/archive');
 }catch(e){console.log('新聞摘要待重試：'+(e instanceof Error?e.message:'處理失敗'));}
}
let newsMerged=0;
try{const groups=await groupNews([...news.values()].filter(a=>a.published_date>=lower),{beforeRequest});const affected=new Set<string>();for(const g of groups)for(const id of g.duplicate_ids){const duplicate=[...news.values()].find(a=>a.id===id);if(duplicate){duplicates[duplicate.url]={keep_id:g.keep_id,date:duplicate.published_date};affected.add(duplicate.published_date.slice(0,7));news.delete(duplicate.url);newsMerged++;}}for(const month of affected)await atomicJson('data/news/archive/'+month+'.json',[...news.values()].filter(a=>a.published_date.startsWith(month)));}catch{console.log('整體新聞事件比對留待下輪重試');}
await atomicJson('data/news/duplicates.json',duplicates);
await atomicJson('data/news/status.json',{last_run_at:new Date().toISOString(),status:gathered.status,saved:newsSaved,merged:newsMerged});
// 舊摘要由既有內容重新精簡，保留原意，不用字數截斷代替改寫。
for(const [url,a] of archive){if(a.summary_version===2||requests>=max-12)continue;try{const summary=await summarize(a.title,'以下是同一篇社評的已存摘要，請忠實精簡，不補充原文未有資訊：'+a.summary.join('\n'),{beforeRequest});archive.set(url,{...a,summary,summary_version:2});}catch{console.log('一篇歷史摘要留待下輪精簡');}}
await saveArchive(archive);
// 三個來源並行，各來源內逐篇執行。先保留舊資料，只新增成功摘要。
for(let i=0;i<sources.length;i+=3){await Promise.all(sources.slice(i,i+3).map(async s=>{
 let added=0,recent=0;const errors:string[]=[];
 try{const result=await collect(s,today,async a=>{
 if(!validDay(a.published_date)||a.published_date<lower||a.published_date>today)return;
 recent++;const url=canonical(a.url,a.url);if(archive.has(url)||running.has(url))return;
 if(requests>=max)throw new Error('已達本輪 API 請求上限，留待下次重試');
 running.add(url);try{
 const summary=await summarize(a.title,a.body,{beforeRequest(){if(requests>=max)throw new Error('已達本輪 API 請求上限');requests++;}});
 const row=validateEditorial({source_id:s.id,newspaper:s.name,region:s.region,title:a.title,url,published_date:a.published_date,summary,summary_version:2});archive.set(url,row);added++;saved++;
 }finally{running.delete(url);}
 });errors.push(...result.errors);if(!result.found)errors.push('未找到社評連結，需檢查來源或設定授權 feed');if(!recent&&!errors.length)errors.push('未找到近期可用社評');
 }catch(e){errors.push(e instanceof Error?e.message:'來源處理失敗');}
 const message=errors.length?[...new Set(errors)].slice(0,4).join('；').replace(/https?:\/\/\S+/g,'[來源網址]'):`新增 ${added} 篇，檢查 ${recent} 篇`;
 status.push({source_id:s.id,state:sourceState(errors,added),message,updated_at:new Date().toISOString()});console.log(`${s.name}：新增 ${added}；${errors.length?'有待處理項目':'完成'}`);
 }));await saveArchive(archive);}
let previous:{last_success_at?:string|null}={};try{previous=JSON.parse(await readFile('data/status.json','utf8'));}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
const now=new Date().toISOString();const record={schema_version:1,last_run_at:now,last_success_at:saved?now:previous.last_success_at||null,model:process.env.DEEPSEEK_MODEL||'deepseek-flash',requests,saved,news_saved:newsSaved,status};
await atomicJson('data/status.json',record);
console.log(`本輪新增 ${saved} 篇，API 請求 ${requests} 次。`);
// 即使部分來源失敗仍發布成功資料及狀態，不把空白覆蓋歷史。
if(process.env.GITHUB_STEP_SUMMARY){await import('node:fs/promises').then(fs=>fs.appendFile(process.env.GITHUB_STEP_SUMMARY!,`## 社評收錄結果\n新增 ${saved} 篇；API 請求 ${requests} 次。\n\n`+status.map(s=>`- ${sources.find(x=>x.id===s.source_id)!.name}：${s.state==='ok'?'完成':'待處理'}`).join('\n')+'\n'));}
