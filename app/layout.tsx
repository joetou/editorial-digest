import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'港澳社評透視｜讀懂兩地觀點',description:'每天整理香港及澳門報章社評，以繁體中文重點摘要連結不同觀點。'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="zh-Hant"><body>{children}</body></html>}
