import {sources} from '../lib/sources';
import {collect} from '../lib/fetch-source';
import {hktDate} from '../lib/dates';
// 不呼叫 OpenAI、不寫入資料庫。此命令會連線報章，並遵守 robots.txt。
await Promise.all(sources.map(async s=>{let count=0;try{const result=await collect(s,hktDate(),async a=>{count++;console.log(s.name,a.published_date,a.title,a.url)});console.log(JSON.stringify({source:s.id,parsed:count,...result}));}catch(e){console.log(JSON.stringify({source:s.id,error:e instanceof Error?e.message:'failed'}));}}));
