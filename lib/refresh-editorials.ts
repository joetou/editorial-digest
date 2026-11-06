import {readFile} from 'node:fs/promises';
import {sources} from './sources';
import {sourceFetch} from './http-source';
import {extract} from './extract';
import {summarize,type SummaryOptions} from './deepseek';
import {saveArchive} from './archive';
import type {Editorial} from './types';
export async function refreshEditorials(archive:Map<string,Editorial>,opts:SummaryOptions={}){
 let context:Record<string,{title:string;summary:string[]}>={};try{context=JSON.parse(await readFile('data/editorial-context.json','utf8'));}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
 let updated=0;
 for(const [url,a] of archive){if(a.summary_version===3)continue;
 try{let body:string;const old=context[url];if(old&&old.title===a.title&&old.summary.length>=3){body='以下是先前保存的同一篇社評較完整摘要，請忠實整理成3點，勿添加未有資訊：\n'+old.summary.join('\n');}
 else{const source=sources.find(s=>s.id===a.source_id)!;const full=extract(await sourceFetch(url,source),url,source);if(full.published_date!==a.published_date)throw new Error('原文日期不符');body=full.body;}
 const summary=await summarize(a.title,body,opts);archive.set(url,{...a,summary,summary_version:3});updated++;await saveArchive(archive);
 }catch(e){console.log('社評詳細摘要待重試：'+a.newspaper+'；'+(e instanceof Error?e.message:'處理失敗'));}
 }
 console.log(`已更新 ${updated} 篇詳細社評摘要`);return updated;
}
