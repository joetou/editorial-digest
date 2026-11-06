"use client";
import {useEffect,useMemo,useState} from 'react';
import type {Editorial,SourceStatus} from './types';
import {sources} from './sources';
type Index={schema_version:number;demo:boolean;months:string[];counts:{day:string;source_id:string;category?:string;count:number}[];status:SourceStatus[];last_run_at:string|null;generated_at?:string};
const base=process.env.NEXT_PUBLIC_BASE_PATH||'';
export function useDigest(day:string,region:string,source:string,page:number,ready:boolean,section="editorials",category=""){
 const path=section==='news'?'/data/news':'/data';
 const [index,setIndex]=useState<Index|null>(null),[items,setItems]=useState<Editorial[]>([]),[indexError,setIndexError]=useState(false),[monthError,setMonthError]=useState(false),[loaded,setLoaded]=useState('');
 const [checking,setChecking]=useState(false),[checkedAt,setCheckedAt]=useState<string|null>(null);
 useEffect(()=>{const controller=new AbortController();let busy=false,disposed=false;
 async function refresh(){if(busy||disposed)return;busy=true;setChecking(true);
 try{const r=await fetch(base+path+'/index.json?check='+Math.floor(Date.now()/60000),{signal:controller.signal,cache:'no-store'});if(!r.ok)throw new Error();const value=await r.json();if(value.schema_version!==1||!Array.isArray(value.months)||!Array.isArray(value.counts))throw new Error();if(!disposed){setIndex(prev=>JSON.stringify(prev)===JSON.stringify(value)?prev:value);setIndexError(false);setCheckedAt(new Date().toISOString());}}
 catch(e){if(!disposed&&(e as Error).name!=='AbortError')setIndexError(true);}
 finally{busy=false;if(!disposed)setChecking(false);}
 }
 function visible(){if(document.visibilityState==='visible')void refresh();}
 void refresh();const timer=window.setInterval(visible,60000);window.addEventListener('focus',visible);document.addEventListener('visibilitychange',visible);window.addEventListener('editorial-refresh',visible);
 return()=>{disposed=true;controller.abort();window.clearInterval(timer);window.removeEventListener('focus',visible);document.removeEventListener('visibilitychange',visible);window.removeEventListener('editorial-refresh',visible);};
 },[path]);
 const month=day.slice(0,7);
 useEffect(()=>{if(!index||!ready)return;const controller=new AbortController();setMonthError(false);setItems([]);setLoaded('');
 if(!index.months.includes(month)){setLoaded(month);return;}
 fetch(base+path+'/archive/'+month+'.json?v='+encodeURIComponent(index.last_run_at||index.generated_at||'initial'),{signal:controller.signal,cache:'no-cache'}).then(async r=>{if(!r.ok)throw new Error();const rows=await r.json();if(!Array.isArray(rows))throw new Error();setItems(rows);setLoaded(month);}).catch(e=>{if(e.name!=='AbortError'){setMonthError(true);setLoaded(month);}});return()=>controller.abort();},[index,month,ready,path]);
 return useMemo(()=>{const filtered=items.filter(a=>a.published_date===day&&(!region||a.region===region)&&(!source||a.source_id===source)&&(!category||a.category===category));const counts=new Map<string,number>();for(const row of index?.counts||[]){const s=sources.find(s=>s.id===row.source_id);if((!region||s?.region===region)&&(!source||source===row.source_id)&&(!category||category===row.category))counts.set(row.day,(counts.get(row.day)||0)+row.count);}
 return {items:filtered.slice((page-1)*24,page*24),counts:[...counts].map(([day,count])=>({day,count})),total:filtered.length,status:index?.status||[],demo:index?.demo||false,lastRun:index?.last_run_at||null,checking,checkedAt,error:indexError||monthError,loading:!indexError&&(!ready||!index||loaded!==month)};
 },[items,index,day,region,source,page,indexError,monthError,loaded,month,ready,category,checking,checkedAt]);
}
