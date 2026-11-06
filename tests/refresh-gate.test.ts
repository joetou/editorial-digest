import {test} from 'node:test';import assert from 'node:assert/strict';
import {decideRefresh} from '../scripts/refresh-gate.mjs';
const now=new Date('2026-11-06T22:48:00Z'),last='2026-11-06T22:10:00Z';
test('港澳6時前不收錄；6時後沒有今天資料便補跑',()=>{assert.equal(decideRefresh({event:'schedule',now:new Date('2026-11-06T21:59:59Z')}).run,false);assert.equal(decideRefresh({event:'schedule',now}).collect,true);assert.equal(decideRefresh({event:'schedule',now,lastRun:last,healthy:true,hasToday:false,publishedLastRun:last}).collect,true);});
test('今天已收錄但尚未發布，只重建發布，不重複摘要',()=>{assert.deepEqual(decideRefresh({event:'schedule',now,lastRun:last,hasToday:true,healthy:true,publishedLastRun:'old'}),{run:true,collect:false,reason:'今天已收錄，重試發布，不重複呼叫摘要服務'});});
test('今天收錄及公開網站時間一致才跳過；昨天或6時前的更新不能冒充今日完成',()=>{assert.equal(decideRefresh({event:'schedule',now,lastRun:last,hasToday:true,healthy:true,publishedLastRun:last}).run,false);for(const stale of ['2026-11-06T10:00:00Z','2026-11-06T21:50:00Z'])assert.equal(decideRefresh({event:'schedule',now,lastRun:stale,hasToday:true,healthy:true,publishedLastRun:stale}).collect,true);});
test('手動補跑不受日更檢查阻擋，普通程式發布不呼叫AI',()=>{assert.equal(decideRefresh({event:'workflow_dispatch',collect:true,now}).collect,true);assert.deepEqual(decideRefresh({event:'push',now}),{run:true,collect:false,reason:'發布程式變更'});});
