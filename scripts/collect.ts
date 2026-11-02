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
const max=Math.max(1,Math.min(200,Number(process.env.MAX_API_REQUESTS)||48));let requests=0,saved=0;
const archive=await readArchive();const status:SourceStatus[]=[];const running=new Set<string>();
// 三個來源並行，各來源內逐篇執行。先保留舊資料，只新增成功摘要。
for(let i=0;i<sources.length;i+=3){await Promise.all(sources.slice(i,i+3).map(async s=>{
 let added=0,recent=0;const errors:string[]=[];
 try{const result=await collect(s,today,async a=>{
 if(!validDay(a.published_date)||a.published_date<lower||a.published_date>today)return;
 recent++;const url=canonical(a.url,a.url);if(archive.has(url)||running.has(url))return;
 if(requests>=max)throw new Error('已達本輪 API 請求上限，留待下次重試');
 running.add(url);try{
 const summary=await summarize(a.title,a.body,{beforeRequest(){if(requests>=max)throw new Error('已達本輪 API 請求上限');requests++;}});
 const row=validateEditorial({source_id:s.id,newspaper:s.name,region:s.region,title:a.title,url,published_date:a.published_date,summary});archive.set(url,row);added++;saved++;
 }finally{running.delete(url);}
 });errors.push(...result.errors);if(!result.found)errors.push('未找到社評連結，需檢查來源或設定授權 feed');if(!recent&&!errors.length)errors.push('未找到近期可用社評');
 }catch(e){errors.push(e instanceof Error?e.message:'來源處理失敗');}
 const message=errors.length?[...new Set(errors)].slice(0,4).join('；').replace(/https?:\/\/\S+/g,'[來源網址]'):`新增 ${added} 篇，檢查 ${recent} 篇`;
 status.push({source_id:s.id,state:sourceState(errors,added),message,updated_at:new Date().toISOString()});console.log(`${s.name}：新增 ${added}；${errors.length?'有待處理項目':'完成'}`);
 }));await saveArchive(archive);}
let previous:{last_success_at?:string|null}={};try{previous=JSON.parse(await readFile('data/status.json','utf8'));}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
const now=new Date().toISOString();const record={schema_version:1,last_run_at:now,last_success_at:saved?now:previous.last_success_at||null,model:process.env.DEEPSEEK_MODEL||'deepseek-flash',requests,saved,status};
await atomicJson('data/status.json',record);
console.log(`本輪新增 ${saved} 篇，API 請求 ${requests} 次。`);
// 即使部分來源失敗仍發布成功資料及狀態，不把空白覆蓋歷史。
if(process.env.GITHUB_STEP_SUMMARY){await import('node:fs/promises').then(fs=>fs.appendFile(process.env.GITHUB_STEP_SUMMARY!,`## 社評收錄結果\n新增 ${saved} 篇；API 請求 ${requests} 次。\n\n`+status.map(s=>`- ${sources.find(x=>x.id===s.source_id)!.name}：${s.state==='ok'?'完成':'待處理'}`).join('\n')+'\n'));}
