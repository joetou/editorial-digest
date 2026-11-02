import type {Source} from './sources';
import {discover,extract} from './extract';
import {sourceFetch,SourceHttpError} from './http-source';
import {shiftDay} from './dates';
export {sourceFetch} from './http-source';
export type Candidate={url:string;title:string;body:string;published_date:string};
export async function collect(s:Source,date:string,onItem:(c:Candidate)=>Promise<void>){
 const deadline=Date.now()+240000;
 const overrides=JSON.parse(process.env.SOURCE_OVERRIDES_JSON||'{}') as Record<string,{feedUrl?:string}>;
 const feed=overrides[s.id]?.feedUrl;
 if(feed){const u=new URL(feed);if(u.protocol!=='https:'||u.username||u.password)throw new Error('授權 feed 必須是 HTTPS');const r=await fetch(u,{signal:AbortSignal.timeout(12000),cache:'no-store',redirect:'error'});if(!r.ok)throw new Error('授權 feed 讀取失敗');const items=await r.json() as Candidate[];if(!Array.isArray(items))throw new Error('feed 格式錯誤');for(const a of items.slice(0,24)){if(typeof a.body!=='string'||a.body.length<350||!a.title||!/^https:\/\//.test(a.url))throw new Error('feed 文章資料不足');await onItem(a);}return {found:items.length,errors:[] as string[]};}
 const back=s.index.includes('{month}')?Math.max(1,Math.min(7,Number(process.env.LOOKBACK_DAYS)||3)):0;
 const errors:string[]=[];const urls=new Set<string>();
 for(let offset=0;offset<=back;offset++){
 const target=shiftDay(date,-offset);const index=s.index.replace('{month}',target.slice(0,7)).replace('{day}',target.slice(8));
 try{const html=await sourceFetch(index,s);for(const url of discover(html,s,index))urls.add(url);}catch(e){if(e instanceof SourceHttpError&&e.status===404&&back){errors.push(`${target} 電子版尚未提供（HTTP 404）`);continue;}throw e;}
 }
 for(const url of [...urls].slice(0,24)){if(Date.now()>deadline){errors.push('來源處理時間已到，未完成文章留待重試');break;}try{const a=extract(await sourceFetch(url,s),url,s);await onItem({url,...a});}catch(e){errors.push(e instanceof Error?e.message:'來源解析失敗');}}
 return {found:urls.size,errors};
}
