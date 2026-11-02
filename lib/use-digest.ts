"use client";
import {useEffect,useMemo,useState} from 'react';
import type {Editorial,SourceStatus} from './types';
import {sources} from './sources';
type Index={schema_version:number;demo:boolean;months:string[];counts:{day:string;source_id:string;count:number}[];status:SourceStatus[];last_run_at:string|null};
const base=process.env.NEXT_PUBLIC_BASE_PATH||'';
export function useDigest(day:string,region:string,source:string,page:number,ready:boolean){
 const [index,setIndex]=useState<Index|null>(null),[items,setItems]=useState<Editorial[]>([]),[indexError,setIndexError]=useState(false),[monthError,setMonthError]=useState(false),[loaded,setLoaded]=useState('');
 useEffect(()=>{const controller=new AbortController();fetch(base+'/data/index.json',{signal:controller.signal,cache:'no-cache'}).then(async r=>{if(!r.ok)throw new Error();const value=await r.json();if(value.schema_version!==1||!Array.isArray(value.months)||!Array.isArray(value.counts))throw new Error();setIndex(value);}).catch(e=>{if(e.name!=='AbortError')setIndexError(true)});return()=>controller.abort();},[]);
 const month=day.slice(0,7);
 useEffect(()=>{if(!index||!ready)return;const controller=new AbortController();setMonthError(false);setItems([]);setLoaded('');
 if(!index.months.includes(month)){setLoaded(month);return;}
 fetch(base+'/data/archive/'+month+'.json',{signal:controller.signal,cache:'no-cache'}).then(async r=>{if(!r.ok)throw new Error();const rows=await r.json();if(!Array.isArray(rows))throw new Error();setItems(rows);setLoaded(month);}).catch(e=>{if(e.name!=='AbortError'){setMonthError(true);setLoaded(month);}});return()=>controller.abort();},[index,month,ready]);
 return useMemo(()=>{const filtered=items.filter(a=>a.published_date===day&&(!region||a.region===region)&&(!source||a.source_id===source));const counts=new Map<string,number>();for(const row of index?.counts||[]){const s=sources.find(s=>s.id===row.source_id);if((!region||s?.region===region)&&(!source||source===row.source_id))counts.set(row.day,(counts.get(row.day)||0)+row.count);}
 return {items:filtered.slice((page-1)*24,page*24),counts:[...counts].map(([day,count])=>({day,count})),total:filtered.length,status:index?.status||[],demo:index?.demo||false,lastRun:index?.last_run_at||null,error:indexError||monthError,loading:!indexError&&(!ready||!index||loaded!==month)};
 },[items,index,day,region,source,page,indexError,monthError,loaded,month,ready]);
}
