import {createHash} from 'node:crypto';
import {mkdir,readdir,readFile,writeFile,rename} from 'node:fs/promises';
import {join} from 'node:path';
import {canonical} from './extract';
import {validDay} from './dates';
import {sources} from './sources';
import {newsCategories} from './types';
import type {Editorial} from './types';
export function validateEditorial(v:unknown):Editorial{
 if(!v||typeof v!=='object')throw new Error('文章格式錯誤');const a=v as Editorial;
 const source=sources.find(s=>s.id===a.source_id);if(!source||source.region!==a.region||source.name!==a.newspaper)throw new Error('文章來源不一致');
 if(typeof a.title!=='string'||!a.title.trim()||a.title.length>600||typeof a.published_date!=='string'||!validDay(a.published_date))throw new Error('文章標題或日期無效');
 let u:URL;try{u=new URL(a.url);}catch{throw new Error('文章URL無效');}if(u.protocol!=='https:'||u.username||u.password)throw new Error('文章URL必須HTTPS');
 if(!Array.isArray(a.summary)||a.summary.length<3||a.summary.length>4||a.summary.some(p=>typeof p!=='string'||p.length<10||p.length>200))throw new Error('文章摘要格式錯誤');
 const url=canonical(a.url,a.url);return {id:createHash('sha256').update(url).digest('hex').slice(0,24),source_id:source.id,newspaper:source.name,region:source.region,title:a.title.trim(),url,published_date:a.published_date,summary:a.summary.map(p=>p.trim()),...([2,3].includes(a.summary_version!)?{summary_version:a.summary_version}:{}),...(newsCategories.includes(a.category!)?{category:a.category}:{})};
}
export async function readArchive(dir='data/archive'){const map=new Map<string,Editorial>();let names:string[]=[];try{names=await readdir(dir);}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
 for(const n of names.filter(n=>/^\d{4}-\d{2}\.json$/.test(n)).sort()){const rows=JSON.parse(await readFile(join(dir,n),'utf8'));if(!Array.isArray(rows))throw new Error('歷史檔案格式錯誤');for(const row of rows){const a=validateEditorial(row);if(a.published_date.slice(0,7)!==n.slice(0,7))throw new Error('歷史檔案月份不符');map.set(a.url,a);}}return map;
}
export async function atomicJson(path:string,value:unknown){await mkdir(join(path,'..'),{recursive:true});const tmp=path+'.tmp';await writeFile(tmp,JSON.stringify(value,null,2)+'\n');await rename(tmp,path);}
export async function saveArchive(articles:Map<string,Editorial>,dir='data/archive'){
 const months=new Map<string,Editorial[]>();for(const a of articles.values()){const month=a.published_date.slice(0,7);months.set(month,[...(months.get(month)||[]),a]);}
 for(const [month,rows] of months){rows.sort((a,b)=>b.published_date.localeCompare(a.published_date)||a.source_id.localeCompare(b.source_id)||a.url.localeCompare(b.url));await atomicJson(join(dir,month+'.json'),rows);}
}
