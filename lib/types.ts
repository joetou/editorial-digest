export type Region = '香港' | '澳門';
export type Editorial = {id:string;source_id:string;newspaper:string;region:Region;title:string;url:string;published_date:string;summary:string[];summary_version?:number;category?:NewsCategory};
export type SourceStatus = {source_id:string;state:string;message:string;updated_at:string};
export type DayCount = {day:string;count:number};

export const newsCategories=['國際新聞','內地新聞','港聞','澳聞'] as const;
export type NewsCategory=typeof newsCategories[number];
