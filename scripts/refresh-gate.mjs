import {readFile,readdir,appendFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
/** @param {{event:string,collect?:boolean,now?:Date,lastRun?:string|null,hasToday?:boolean,healthy?:boolean,publishedLastRun?:string|null}} input */
export function decideRefresh({event,collect=false,now=new Date(),lastRun,hasToday=false,healthy=false,publishedLastRun}){
 if(event!=='schedule')return {run:true,collect:event==='workflow_dispatch'&&collect,reason:event==='workflow_dispatch'?'手動更新':'發布程式變更'};
 const local=new Date(now.getTime()+8*3600000);const day=local.toISOString().slice(0,10);
 if(local.getUTCHours()<6)return {run:false,collect:false,reason:'港澳時間未到上午6時'};
 const start=Date.parse(day+'T06:00:00+08:00'),last=Date.parse(lastRun||'');
 const fresh=Number.isFinite(last)&&last>=start&&last<=now.getTime()&&hasToday&&healthy;
 if(!fresh)return {run:true,collect:true,reason:'今天尚未完成收錄，補跑更新'};
 if(publishedLastRun!==lastRun)return {run:true,collect:false,reason:'今天已收錄，重試發布，不重複呼叫摘要服務'};
 return {run:false,collect:false,reason:'今天已收錄並發布，跳過重跑'};
}
async function main(){
 let status={};try{status=JSON.parse(await readFile('data/status.json','utf8'));}catch{}
 const now=new Date(),day=new Date(now.getTime()+8*3600000).toISOString().slice(0,10);let hasToday=false;
 for(const dir of ['data/archive','data/news/archive']){try{const rows=JSON.parse(await readFile(`${dir}/${day.slice(0,7)}.json`,'utf8'));hasToday ||= Array.isArray(rows)&&rows.some(a=>a.published_date===day);}catch{}}
 let publishedLastRun=null;
 if(process.env.EVENT_NAME==='schedule'&&status.last_run_at){
 const repo=process.env.GITHUB_REPOSITORY||'',owner=repo.split('/')[0],name=repo.split('/')[1];
 const custom=process.env.CUSTOM_DOMAIN;const root=custom?`https://${custom}`:name===`${owner}.github.io`?`https://${owner}.github.io`:`https://${owner}.github.io/${name}`;
 try{const r=await fetch(root+'/data/index.json',{cache:'no-store',signal:AbortSignal.timeout(15000)});if(r.ok)publishedLastRun=(await r.json()).last_run_at||null;}catch{}
 }
 const result=decideRefresh({event:process.env.EVENT_NAME||'push',collect:process.env.COLLECT_REQUESTED==='true',now,lastRun:status.last_run_at,hasToday,healthy:Array.isArray(status.status)&&status.status.some(s=>['ok','partial'].includes(s.state)),publishedLastRun});
 console.log(result.reason);
 if(process.env.GITHUB_OUTPUT)await appendFile(process.env.GITHUB_OUTPUT,`run=${result.run}\ncollect=${result.collect}\n`);
 if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,`## 更新檢查\n${day} HKT：${result.reason}。\n`);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
