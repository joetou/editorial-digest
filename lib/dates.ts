export function hktDate(date = new Date()): string { return new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Hong_Kong',year:'numeric',month:'2-digit',day:'2-digit'}).format(date); }
export function shiftDay(day:string,n:number) { const d=new Date(day+'T12:00:00Z'); d.setUTCDate(d.getUTCDate()+n); return d.toISOString().slice(0,10); }
export function validDay(s:string) { return /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0,10)===s; }
export function publicationDay(raw:string):string|null {
 const s=raw.trim(); if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return validDay(s)?s:null;
 if (/^\d{4}-\d{2}-\d{2}[T ]/.test(s)) { const d=new Date(/[zZ]|[+-]\d{2}:?\d{2}$/.test(s)?s:s.replace(' ','T')+'+08:00'); return isNaN(+d)?null:hktDate(d); }
 const m=s.match(/(20\d{2})[年/.-](\d{1,2})[月/.-](\d{1,2})/); if(m){const v=`${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;return validDay(v)?v:null;} return null;
}
