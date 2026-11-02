import robotsParser from 'robots-parser';
import type {Source} from './sources';
const UA='EditorialDigestBot/1.0';
export class SourceHttpError extends Error {constructor(public status:number,robots=false){super(robots?`無法核實 robots.txt（HTTP ${status}）`:status===403?'來源拒絕自動存取（HTTP 403），需授權來源':status===401?'來源需要登入或授權（HTTP 401）':status===404?'來源頁面尚未提供（HTTP 404）':`來源 HTTP ${status}`);}}
export function assertSourceUrl(raw:string,s:Source){const u=new URL(raw);const root=new URL(s.index).hostname;const hosts=new Set([root,root.replace(/^www\./,''),'www.'+root.replace(/^www\./,''),...(s.hosts||[])]);if(u.protocol!=='https:'||u.username||u.password||u.port&&u.port!=='443'||!hosts.has(u.hostname))throw new Error('拒絕跳轉至未核實的來源網址');return u.href;}
async function text(r:Response){const reader=r.body?.getReader();if(!reader)return '';const chunks:Uint8Array[]=[];let size=0;try{while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>3_000_000)throw new Error('來源回應過大');chunks.push(part.value);}}finally{await reader.cancel();}const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}const head=new TextDecoder().decode(bytes.slice(0,4096));const encoding=r.headers.get('content-type')?.match(/charset=([\w-]+)/i)?.[1]||head.match(/charset=["']?([\w-]+)/i)?.[1]||'utf-8';return new TextDecoder(encoding).decode(bytes);}
export function createSourceClient(fetcher:typeof fetch=fetch){
 const cache=new Map<string,{time:number;promise:Promise<ReturnType<typeof robotsParser>>}>();
 async function request(url:string){return fetcher(url,{headers:{'User-Agent':UA,Accept:'text/html,text/plain'},signal:AbortSignal.timeout(10000),redirect:'manual',cache:'no-store'});}
 async function policy(origin:string,s:Source){
 let cached=cache.get(origin);if(cached&&Date.now()-cached.time<300000)return cached.promise;
 const promise=(async()=>{const original=origin+'/robots.txt';let url=original;const seen=new Set<string>();
 for(let hop=0;hop<6;hop++){
 url=assertSourceUrl(url,s);if(seen.has(url))throw new Error('robots.txt 跳轉循環');seen.add(url);if(new URL(url).pathname!=='/robots.txt')throw new Error('robots.txt 跳到一般網頁，需核實來源設定');
 const r=await request(url);if(r.status>=300&&r.status<400){const location=r.headers.get('location');await r.body?.cancel();if(!location)throw new Error('robots.txt 跳轉缺少目的地');url=new URL(location,url).href;continue;}
 if(r.status===404)return robotsParser(original,'');if(!r.ok)throw new SourceHttpError(r.status,true);
 const content=await text(r);if(r.headers.get('content-type')?.includes('text/html')||/^\s*<!doctype|^\s*<html/i.test(content))throw new Error('robots.txt 返回 HTML，需核實來源設定');return robotsParser(original,content);
 }throw new Error('robots.txt 跳轉次數過多');})();
 cache.set(origin,{time:Date.now(),promise});try{return await promise;}catch(e){cache.delete(origin);throw e;}
 }
 return async function sourceFetch(raw:string,s:Source){let url=raw;const seen=new Set<string>();for(let hop=0;hop<6;hop++){
 url=assertSourceUrl(url,s);if(seen.has(url))throw new Error('來源跳轉循環');seen.add(url);const robots=await policy(new URL(url).origin,s);if(robots.isAllowed(url,UA)===false)throw new Error('來源 robots.txt 禁止自動抓取，需授權 feed');
 const r=await request(url);if(r.status>=300&&r.status<400){const location=r.headers.get('location');await r.body?.cancel();if(!location)throw new Error('來源跳轉缺少目的地');url=new URL(location,url).href;continue;}
 if(!r.ok)throw new SourceHttpError(r.status);return text(r);
 }throw new Error('來源跳轉次數過多');};
}
export const sourceFetch=createSourceClient();
