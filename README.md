# 港澳社評透視｜GitHub Pages + DeepSeek

這是獨立的靜態網站版本，沿用 Next.js 14、米白紙質背景、香港紅／澳門綠、摘要卡片、地區／報章／日期篩選及月曆熱力圖。不再需要 Vercel、Supabase 或 OpenAI API。

GitHub Actions 每日收錄社評，透過 DeepSeek 生成3至4點繁體中文摘要，把成功結果按月份保存於 `data/archive/YYYY-MM.json`，再輸出靜態網站至 GitHub Pages。網站只按需要讀取所選月份；不會一次載入全部歷史。

## 你需要準備

1. GitHub 帳戶。GitHub Free 使用 Pages 時，請建立公開儲存庫；公開內容包括網站代碼及已生成摘要，不包括 Secrets。
2. DeepSeek API 帳戶、可用額度及 API key：https://platform.deepseek.com/ 。免費網頁聊天服務不等同免費 API，實際費用以供應商帳戶為準。
3. 報章正文來源。部分網站限制自動抓取，可能另需訂閱或授權 feed。

不需要把 DeepSeek API key 貼到聊天或代碼，也不用申請獨立伺服器或購買域名。

## 發布到 GitHub Pages

建議儲存庫名稱：`editorial-digest`，預設分支：`main`。

1. 把本資料夾內檔案放在儲存庫根目錄，包含 `.github/workflows/pages.yml`、`.gitignore` 及 `.env.example`。不要只上傳 ZIP，也不要把整個專案包在多一層資料夾內。
2. 開啟儲存庫 Settings → Secrets and variables → Actions → New repository secret，新增：

| 類型 | 名稱 | 內容 |
|---|---|---|
| 必填 Secret | `DEEPSEEK_API_KEY` | 你自己的 DeepSeek API key |
| 可選 Variable | `DEEPSEEK_MODEL` | 留空使用 `deepseek-flash` |
| 可選 Secret | `SOURCE_OVERRIDES_JSON` | 個別報章的授權 feed 設定，見下文 |
| 可選 Variable | `PAGES_CUSTOM_DOMAIN` | 只有已在 Pages 設定自訂網域時才填寫該域名 |

3. Settings → Pages → Build and deployment → Source 選 `GitHub Actions`。
4. 工作檔已為歸檔工作設定 `contents: write`，其餘工作只使用所需權限；一般不需改動全域權限。如果機構政策或分支保護阻止機器人保存資料，須由管理員安排合適的提交權限，不應直接關閉分支保護。
5. 初次 push 會只建置及發布，不會呼叫收費 API。到 Actions → Daily editorials and GitHub Pages → Run workflow，勾選收錄選項，執行第一次收錄。
6. 完成後開啟部署結果中的 Pages 網址。以建議名稱建立時通常是 `https://joetou.github.io/editorial-digest/`；實際以 GitHub 顯示的網址為準。

初次尚未收錄時會顯示空狀態，沒有假社評。你可展開各報「收錄狀態」查看原因。

## 每日排程及費用控制

工作檔設定 `0 22 * * *`，即 UTC22:00、翌日香港／澳門06:00。GitHub 的定時工作可能延遲，並非06:00完成的保證。工作執行後仍需收錄、摘要、建置及部署時間。

- 每輪最多48次 DeepSeek API 請求，包含重試；可在工作檔修改 `MAX_API_REQUESTS`（程式最大200）。這是請求數上限，不是金額上限。
- 模型預設使用官方現行 `deepseek-flash`，JSON Output、非思考模式；可透過 Variable 更改模型。
- 空白、JSON無效、摘要不足3點或超過4點不會入庫；429／5xx、空白或無效內容最多嘗試3次；401等設定錯誤不重試。
- 文章URL去重；已成功收錄的文章不會每天重複生成摘要。只有新文章正文會送到DeepSeek。
- 回看最近3天的可發現文章（LOOKBACK_DAYS最大7）。06:00後才出版的文章可能於翌日補收。澳門日報只探索當日電子版，尚未提供完整歷史回填。
- 三個來源並行；來源內逐篇處理。全輪25分鐘上限；每來源另有時間上限。成功資料會分批保留，部分來源失敗不清空舊資料。
- 同一工作使用 concurrency 排隊，避免同時改寫歷史。資料提交後由同一工作建置發布，不依賴機器人提交再次觸發 push。
- 公開儲存庫若長期沒有活動，GitHub可能停用定時工作；請留意 Actions 狀態。一般每日歸檔會提交更新，但不應把這視為長期服務保證。

## 2026年11月3日來源修正

- 信報改用新官方網域，核實一般機器人被robots.txt禁止，顯示「需授權」。
- 星島改用現行 `www.stheadline.com/daily-editorial/` 社論欄目。
- 東方日報依文章的正論分類資料識別，合併各段正文，修正只取第一段的問題。
- 文章結構化資料只有節錄時，使用更完整的已識別正文容器。
- 只允許在逐報核實的HTTPS網域間跟隨跳轉，每次跳轉都重新檢查robots.txt；不跟隨任意跨站或將普通首頁當成robots.txt。
- 澳門日報當日版面404時會繼續檢查最近幾日版面，不把未提供版面當成網址跳轉。
- 網站區分「需授權」「待更新」「待修復」及「部分完成」，不再全部顯示同一標籤。

這些修正不解除明報、SCMP等網站的403或付費限制。十二家完整收錄仍未完成。

## 來源限制仍然存在

12家來源設定在 `lib/sources.ts`，沿用上一版實測後的解析器。改用DeepSeek不會解除付費牆或反爬限制。本次沒有宣稱12家全部成功。

上一版2026年11月2日實測：澳門日報、HK01及大公報曾成功解析近期社評；文匯報只返回較舊文章；明報、信報、星島及香港經濟日報未能核實robots.txt；SCMP遇付費牆或403；東方日報正文不足；市民日報及濠江日報未能從靜態頁面確認完整社評。不同執行地區及日後版面可能改變結果。

程式不繞過登入、付費牆或驗證，不把普通新聞或標題片段當成完整社評；找不到可信刊登日期時會跳過。robots.txt不代表內容使用授權，營運方仍需確認相關使用條款。

### 接授權feed

設定 `SOURCE_OVERRIDES_JSON` Secret：

```json
{"houkong":{"feedUrl":"https://YOUR-LICENSED-FEED/houkong.json"},"shimin":{"feedUrl":"https://YOUR-LICENSED-FEED/shimin.json"}}
```

各feed須由你信任的供應商提供已獲授權的完整社評，並按日期倒序回傳：

```json
[{"url":"https://PUBLISHER/article/123","title":"社評標題","published_date":"2026-11-02","body":"已獲授權的完整社評正文，至少350字元……"}]
```

最多取24項。feed網址只在收錄程式使用，不發布到前端。正文不存入歷史或網站，只暫時送到DeepSeek生成摘要。源站索引及文章請求不跟隨未核實的跳轉。

## 本地執行

使用 Node.js22：

```sh
npm ci
npm test
npm run build
python3 -m http.server 3100 --directory out
```

開啟 `http://localhost:3100/`。這是純靜態網站，不要使用 `next start`。

只看示範畫面：

```sh
DEMO_MODE=true npm run build
python3 -m http.server 3100 --directory out
```

示範文章明確標記，僅在公開輸出目錄生成，不寫入真實 `data/archive`。正式Actions會強制 `DEMO_MODE=false`。

本地真實收錄時，在自己的終端設定 `DEEPSEEK_API_KEY` 再執行 `npm run collect`，隨後重新建置。`.env.example`只供對照；收錄指令不會自動讀取 `.env.local`。切勿把key寫入會提交的檔案或終端指令紀錄。

專案子路徑建置用 `NEXT_PUBLIC_BASE_PATH=/editorial-digest`，工作檔會自動依儲存庫名稱處理；根網域及已設定的自訂域名留空。收錄程式及API key均不會進入前端bundle。

## 驗證及版本

本次驗證見 `VERIFICATION.md`。DeepSeek測試使用模擬API回應，未獲真實key前不會呼叫收費服務，也不能聲稱已驗證真實摘要品質。

保留最初指定的Next.js14只作靜態建置，發布目錄沒有Node伺服器或API路由。依賴掃描仍有Next.js14及PostCSS安全公告；沒有宣稱依賴已全部修補。此版本不會公開運行Next.js伺服器，但日後仍應安排框架升級及重新驗證。

## 官方文件

- DeepSeek接口及模型：https://api-docs.deepseek.com/
- DeepSeek JSON Output：https://api-docs.deepseek.com/guides/json_mode/
- DeepSeek思考模式：https://api-docs.deepseek.com/guides/thinking_mode/
- GitHub Pages工作：https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
- GitHub排程限制：https://docs.github.com/en/actions/how-tos/troubleshoot-workflows


## 新聞速覽及短摘要

首頁加入「新聞速覽」，支援國際新聞、內地新聞、港聞及澳聞，沿用日期、來源地區、報章、歷史日曆及字體滑桿。新聞首先接入星島及澳門日報可公開讀取的版面；其餘報章社評來源維持原設定。授權或 robots 限制不會被繞過。

每天 06:00 HKT 同一個 GitHub Actions 排程收錄新聞及社評。新聞每類每天最多 4 則，候選依刊登日期排序並交替港澳來源；DeepSeek 會比對相鄰日期已收錄事件，只保留一個報章來源。同一人物但不同事件不應合併；自動語意判斷仍可能有誤。社評不進行跨報事件合併，以保留不同立場。

新摘要統一為 3 點，目標每點 18–35 字，上限 48 字。歷史社評以既有摘要忠實改寫，成功才標記 `summary_version: 2`，不截斷句子或覆蓋失敗項目。每輪最多 96 次 API 請求，含重試、去重及歷史改寫；達上限留待下輪，不刪除歷史。

新聞歷史位於 `data/news/archive/YYYY-MM.json`，來源狀態位於 `data/news/status.json`。公開檔案只含標題、來源、日期、短摘要及原文連結；不發布全文、密鑰或授權設定。
