import {readArchive} from '../lib/archive';
import {refreshEditorials} from '../lib/refresh-editorials';
if(!process.env.DEEPSEEK_API_KEY)throw new Error('尚未設定 DEEPSEEK_API_KEY');
const max=Math.min(96,Number(process.env.MAX_API_REQUESTS)||96);let requests=0;
await refreshEditorials(await readArchive(),{beforeRequest(){if(requests>=max)throw new Error('已達本輪 API 上限');requests++;}});
console.log(`社評更新 API 請求 ${requests} 次；新聞未修改。`);
