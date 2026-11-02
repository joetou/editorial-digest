export type Region = '香港' | '澳門';
export type Editorial = {id:string;source_id:string;newspaper:string;region:Region;title:string;url:string;published_date:string;summary:string[]};
export type SourceStatus = {source_id:string;state:string;message:string;updated_at:string};
export type DayCount = {day:string;count:number};
