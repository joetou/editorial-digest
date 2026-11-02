const raw = process.env.NEXT_PUBLIC_BASE_PATH || '';
if(raw && !/^\/[A-Za-z0-9._-]+$/.test(raw)) throw new Error('NEXT_PUBLIC_BASE_PATH 必須是 /儲存庫名稱，或留空');
/** @type {import('next').NextConfig} */
const config={output:'export',basePath:raw,trailingSlash:true,images:{unoptimized:true},poweredByHeader:false,experimental:{cpus:2}};
export default config;
