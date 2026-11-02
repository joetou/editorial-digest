import robotsParser from 'robots-parser';
import type {Source} from './sources';
import {discover,extract} from './extract';
const UA='EditorialDigestBot/1.0';
const policyTimes=new Map<string,number>();
const policies=new Map<string,Promise<ReturnType<typeof robotsParser>>>();
async function raw(url:string){const r=await fetch(url,{headers:{'User-Agent':UA,Accept:'text/html,application/json,text/plain'},signal:AbortSignal.timeout(10000),redirect:'manual',cache:'no-store'});if(!r.ok)throw new Error(`來源 HTTP ${r.status}（跳轉需更新來源設定）`);const bytes=await r.arrayBuffer();if(bytes.byteLength>3_000_000)throw new Error('來源回應過大');const ascii=new TextDecoder().decode(bytes.slice(0,4096));const encoding=r.headers.get('content-type')?.match(/charset=([\w-]+)/i)?.[1]||ascii.match(/charset=["']?([\w-]+)/i)?.[1]||'utf-8';return new TextDecoder(encoding).decode(bytes);}
function allowed(url:string,s:Source){const u=new URL(url),host=new URL(s.index).hostname;return u.protocol==='https:'&&!u.username&&!u.password&&(u.hostname===host||u.hostname===host.replace(/^www\./,'')||'www.'+u.hostname===host);}
export async function sourceFetch(url:string,s:Source){if(!allowed(url,s))throw new Error('拒絕跨來源連結');const origin=new URL(url).origin;
 if(Date.now()-(policyTimes.get(origin)||0)>300000)policies.delete(origin);
 if(!policies.has(origin)){policyTimes.set(origin,Date.now());policies.set(origin,(async()=>{const r=await fetch(origin+'/robots.txt',{headers:{'User-Agent':UA},signal:AbortSignal.timeout(8000),redirect:'manual'});if(r.status===404)return robotsParser(origin+'/robots.txt','');if(!r.ok)throw new Error(`無法核實 robots.txt（HTTP ${r.status}）`);if(r.headers.get('content-type')?.includes('text/html'))throw new Error('robots.txt 返回 HTML，需核實來源設定');return robotsParser(origin+'/robots.txt',await r.text());})().catch(error=>{policies.delete(origin);throw error;}));}
 const robots=await policies.get(origin)!;if(robots.isAllowed(url,UA)===false)throw new Error('robots.txt 不允許抓取');return raw(url);}
export type Candidate={url:string;title:string;body:string;published_date:string};
export async function collect(s:Source,date:string,onItem:(c:Candidate)=>Promise<void>){
 const deadline=Date.now()+240000;
 const overrides=JSON.parse(process.env.SOURCE_OVERRIDES_JSON||'{}') as Record<string,{feedUrl?:string}>;
 const feed=overrides[s.id]?.feedUrl;
 if(feed){const u=new URL(feed);if(u.protocol!=='https:'||u.username||u.password)throw new Error('授權 feed 必須是 HTTPS');const r=await fetch(u,{signal:AbortSignal.timeout(12000),cache:'no-store',redirect:'error'});if(!r.ok)throw new Error('授權 feed 讀取失敗');const items=await r.json() as Candidate[];if(!Array.isArray(items))throw new Error('feed 格式錯誤');for(const a of items.slice(0,24)){if(typeof a.body!=='string'||a.body.length<350||!a.title||!/^https:\/\//.test(a.url))throw new Error('feed 文章資料不足');await onItem(a);}return {found:items.length,errors:[] as string[]};}
 const index=s.index.replace('{month}',date.slice(0,7)).replace('{day}',date.slice(8));
 const html=await sourceFetch(index,s);const urls=discover(html,s,index);const errors:string[]=[];
 for(const url of urls){if(Date.now()>deadline){errors.push('來源處理時間已到，未完成文章留待重試');break;}try{const a=extract(await sourceFetch(url,s),url,s);await onItem({url,...a});}catch(e){errors.push(e instanceof Error?e.message:'來源解析失敗');}}
 return {found:urls.length,errors};
}
