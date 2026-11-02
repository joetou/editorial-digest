import {load} from 'cheerio';
import type {Source} from './sources';
import {publicationDay} from './dates';
export function canonical(raw:string,base:string){const u=new URL(raw,base);u.hash='';for(const key of [...u.searchParams.keys()])if(/^(utm_|fbclid|gclid)/.test(key))u.searchParams.delete(key);return u.href;}
export function discover(html:string,s:Source,base:string){const $=load(html);const urls=new Set<string>();$('a[href]').each((_,a)=>{try{const href=canonical($(a).attr('href')!,base);if(['takung','wenwei'].includes(s.id)&&!new RegExp(s.editorial).test($(a).text()))return;if(s.id==='macaodaily'&&!/社論|新聞小語/.test($(a).text()))return;if(s.id==='oriental'&&!$(a).closest('.sectionList').find('.subHeader').text().includes('正論'))return;if(new RegExp(s.link,'i').test(decodeURI(href)))urls.add(href);}catch{}});return [...urls].slice(0,24);}
export function extract(html:string,url:string,s:Source){
 const $=load(html);const nodes:Record<string,unknown>[]=[];
 function visit(v:unknown){if(Array.isArray(v))v.forEach(visit);else if(v&&typeof v==='object'){const o=v as Record<string,unknown>;if(/Article|NewsArticle|ReportageNewsArticle/.test(String(o['@type'])))nodes.push(o);if(o['@graph'])visit(o['@graph']);}}
 $('script[type="application/ld+json"]').each((_,el)=>{try{visit(JSON.parse($(el).text()));}catch{}});
 const node=nodes.find(n=>n.articleBody)||nodes[0]||{};
 const founderTitle=s.id==='macaodaily'?html.match(/<founder-title>(.*?)<\/founder-title>/s)?.[1]:null;
 const title=String(founderTitle||node.headline||$('meta[property="og:title"]').attr('content')||$('h1').first().text()).trim();
 const author=typeof node.author==='object'?JSON.stringify(node.author):String(node.author||'');
 // Classification uses article heading/author, never site navigation.
 const evidence=title+' '+author+' '+$('.article-category, .breadcrumb, [rel="author"]').text();
 if(!new RegExp(s.editorial,'i').test(evidence) && !(s.id==='oriental' && ($('meta[name="psCodeMid"]').attr('content')==='185'||/00190_001/.test(url))) && !(s.id==='mingpao'&&/社評|editorial/.test(decodeURI(url))) && !(s.id==='singtao'&&/editorial/.test(url)))throw new Error('無法確認為該報社評');
 const paid=nodes.some(n=>n.isAccessibleForFree===false||n.isAccessibleForFree==='False')||$('[class*="paywall"], [id*="paywall"]').filter((_,el)=>$(el).text().trim().length>20).length>0;
 if(paid)throw new Error('需要訂閱或授權正文');
 let raw=String(node.datePublished||$('meta[property="article:published_time"]').attr('content')||$('meta[name="pubdate"]').attr('content')||$('time[datetime]').first().attr('datetime')||'');
 let day=publicationDay(raw);
 if(!day){const m=url.match(/(?:\/|odn-)(20\d{2})(\d{2})(\d{2})(?:\/|-)/);if(m)day=publicationDay(`${m[1]}-${m[2]}-${m[3]}`);}
 if(!day){const m=url.match(/html\/(20\d{2}-\d{2})\/(\d{2})\//);if(m)day=publicationDay(m[1]+'-'+m[2]);}
 if(!day)day=publicationDay($('.date, .publish-time, .article-date, #pubtime, .story-list-unit-bottom-time').first().text());
 if(!day){const m=url.match(/\/a\/(20\d{2})(\d{2})\/(\d{2})\//);if(m)day=publicationDay(`${m[1]}-${m[2]}-${m[3]}`);}
 if(!day)throw new Error('找不到可信刊登日期');
 $('script,style,nav,footer,aside,form,.related,.advertisement').remove();
 let body=typeof node.articleBody==='string'?node.articleBody:'';
 for(const selector of s.body.split(',')){const all=$(selector.trim());const el=all.first();const paragraphs=el.find('p').map((_,e)=>$(e).text().trim()).get().filter(Boolean);const text=s.id==='oriental'?all.map((_,e)=>$(e).text().trim()).get().join('\n'):(paragraphs.length?paragraphs.join('\n'):el.text().trim());if(text.length>body.length)body=text;}
 body=body.replace(/\s+/g,' ').trim();
 if(!title||body.length<350||/enable javascript|verify you are human|subscribe to (read|continue)|訂閱後.*閱讀|登入後.*閱讀/i.test(body))throw new Error('正文不足或受到存取限制');
 return {title,body:body.slice(0,24000),published_date:day};
}
