import type {Region} from './types';
export type Source={id:string;name:string;region:Region;index:string;link:string;editorial:string;body:string;hosts?:string[];note?:string};
export const sources:Source[]=[
 {id:'mingpao',name:'明報',region:'香港',index:'https://news.mingpao.com/pns/社評',link:'/pns/社評/|/pns/editorial/',editorial:'社評',body:'.article_content, #blockcontent, [itemprop="articleBody"]'},
 {id:'hkej',name:'信報',region:'香港',index:'https://www.hkej.com/dailynews/toc',hosts:['www.hkej.com','www1.hkej.com'],link:'/dailynews/article/|/dailyNews/article/',editorial:'社評',body:'.article-content, #article-content, .article_content',note:'官方 robots.txt 禁止一般機器人，需取得授權 feed'},
 {id:'oriental',name:'東方日報',region:'香港',index:'https://orientaldaily.on.cc/',link:'00186_001|00190_001',editorial:'正論',body:'.articleContent .paragraph .content, [itemprop="articleBody"]'},
 {id:'singtao',name:'星島日報',region:'香港',index:'https://www.stheadline.com/daily-editorial/社論',hosts:['www.stheadline.com','std.stheadline.com'],link:'/daily-editorial/[0-9]+/',editorial:'社論',body:'.std-article-body, .article-content, .content-body, [itemprop="articleBody"]'},
 {id:'scmp',name:'SCMP',region:'香港',index:'https://www.scmp.com/author/scmp-editorial',link:'/comment/.*article/|/opinion/.*article/',editorial:'SCMP Editorial',body:'[itemprop="articleBody"], .article-body, [data-qa="article-body"]',note:'可能需要訂閱；只接受 SCMP Editorial 署名'},
 {id:'takung',name:'大公報',region:'香港',index:'https://www.tkww.hk/opinion/editorial',link:'/a/\\d',editorial:'大公社評',body:'.content-body-inner, .tkp_content, [itemprop="articleBody"]'},
 {id:'wenwei',name:'文匯報',region:'香港',index:'https://www.tkww.hk/opinion/editorial',link:'/a/\\d',editorial:'文匯社評',body:'.content-body-inner, .tkp_content, [itemprop="articleBody"]'},
 {id:'hk01',name:'HK01',region:'香港',index:'https://www.hk01.com/channel/50/01觀點',link:'/01觀點/\\d',editorial:'01觀點|01主筆室|社論',body:'.cmp-article-detail, .article-content, [itemprop="articleBody"]'},
 {id:'hket',name:'經濟日報',region:'香港',index:'https://paper.hket.com/srap001/社評',link:'/article/',editorial:'社評',body:'.article-detail-body, .article-content, [itemprop="articleBody"]',note:'可能需要訂閱；不繞過付費限制'},
 {id:'macaodaily',name:'澳門日報',region:'澳門',index:'https://www.macaodaily.com/html/{month}/{day}/node_1.htm',link:'content_.*htm',editorial:'社論|新聞小語',body:'#ozoom, .article-content'},
 {id:'shimin',name:'市民日報',region:'澳門',index:'https://www.shimindaily.net/',link:'blog-details|/市民之言/|/shimin/',editorial:'市民之言|社論',body:'.entry-content, .article-content, .blog-content',note:'新版網站部分內容由 JavaScript 載入，可能需要授權 feed'},
 {id:'houkong',name:'濠江日報',region:'澳門',index:'https://www.houkongdailynews.com/',link:'news|article',editorial:'社論|社評',body:'.article-content, .news-content, [itemprop="articleBody"]',note:'網站為動態載入，未核實可公開使用的正文 API；可接授權 feed'}
];
