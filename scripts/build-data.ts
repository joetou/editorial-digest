import {mkdir,rm,readFile} from 'node:fs/promises';
import {readArchive,atomicJson} from '../lib/archive';
import {hktDate,shiftDay} from '../lib/dates';
import {sources} from '../lib/sources';
import type {Editorial,SourceStatus} from '../lib/types';
const demo=process.env.DEMO_MODE==='true';let rows=[...(await readArchive()).values()];
if(demo){const points=['這是介面示範文字，並非報章真實社評，也不代表該報立場。','正式文章由收錄程式取得正文後，透過 DeepSeek 生成三至四點繁體中文摘要。','可按地區、報章及日期篩選，並點選日曆回看已收錄的歷史文章。'];rows=[{id:'demo-hk',source_id:'mingpao',newspaper:'明報',region:'香港',title:'示範文章｜從公共交通看城市日常',url:'https://news.mingpao.com/',published_date:hktDate(),summary:points},{id:'demo-mo',source_id:'macaodaily',newspaper:'澳門日報',region:'澳門',title:'示範文章｜在社區生活中理解公共服務',url:'https://www.macaodaily.com/',published_date:hktDate(),summary:points},{id:'demo-scmp',source_id:'scmp',newspaper:'SCMP',region:'香港',title:'示範文章｜以繁體中文閱讀不同觀點',url:'https://www.scmp.com/author/scmp-editorial',published_date:shiftDay(hktDate(),-1),summary:points}] as Editorial[];}
let raw:{last_run_at?:string;last_success_at?:string;model?:string;status?:SourceStatus[]}={};try{raw=JSON.parse(await readFile('data/status.json','utf8'));}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
// 只發布白名單欄位；全文、feed設定、API密鑰不會進入網站。
const groups=new Map<string,Editorial[]>(),daily=new Map<string,{day:string;source_id:string;count:number}>();
for(const a of rows){const m=a.published_date.slice(0,7);groups.set(m,[...(groups.get(m)||[]),a]);const k=a.published_date+'|'+a.source_id;daily.set(k,{day:a.published_date,source_id:a.source_id,count:(daily.get(k)?.count||0)+1});}
await rm('public/data',{recursive:true,force:true});await mkdir('public/data/archive',{recursive:true});
for(const [m,a] of groups)await atomicJson(`public/data/archive/${m}.json`,a);
const status=sources.map(s=>{const v=raw.status?.find(v=>v.source_id===s.id);return {source_id:s.id,state:v?.state||'pending',message:v?.message||s.note||'尚未執行收錄',updated_at:v?.updated_at||''};});
await atomicJson('public/data/index.json',{schema_version:1,demo,generated_at:new Date().toISOString(),last_run_at:demo?null:raw.last_run_at||null,last_success_at:demo?null:raw.last_success_at||null,model:raw.model||'deepseek-flash',months:[...groups.keys()].sort(),counts:[...daily.values()],status});
console.log(`已建立公開資料：${rows.length}篇，${groups.size}個月份，示範模式=${demo}`);

const newsRows=[...(await readArchive('data/news/archive')).values()].filter(a=>a.category);
const newsMonths=new Map<string,Editorial[]>(),newsCounts=new Map<string,{day:string;source_id:string;category:string;count:number}>();
for(const a of newsRows){const month=a.published_date.slice(0,7);newsMonths.set(month,[...(newsMonths.get(month)||[]),a]);const key=a.published_date+'|'+a.source_id+'|'+a.category;newsCounts.set(key,{day:a.published_date,source_id:a.source_id,category:a.category!,count:(newsCounts.get(key)?.count||0)+1});}
let newsStatus:{last_run_at?:string;status?:SourceStatus[]}={};try{newsStatus=JSON.parse(await readFile('data/news/status.json','utf8'));}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
for(const [month,rows] of newsMonths)await atomicJson(`public/data/news/archive/${month}.json`,rows);
await atomicJson('public/data/news/index.json',{schema_version:1,demo:false,months:[...newsMonths.keys()].sort(),counts:[...newsCounts.values()],status:newsStatus.status||[],last_run_at:newsStatus.last_run_at||null});
console.log(`新聞資料：${newsRows.length} 則`);
