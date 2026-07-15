# 《對齊：歸墟》— 小說寫作 · 閱讀 · 發布系統

一套環繞「**單一原稿**」打造的小說工作流：一份稿件、一個本機編輯器、兩個閱讀器，靠建置腳本自動同步。

> 小說本身是繁體中文星際生存物語，劇情與人物請見 [`歸墟/README.md`](歸墟/README.md)。本文件只談**檔案在哪裡、各自對系統的意義**。

---

## 核心概念：原稿只有一份

整個專案的設計原則是——**`歸墟/` 是唯一的稿件來源（single source of truth）**，其他所有東西不是「編輯它」就是「發布它」，任何地方都不再保存第二份副本。

```
                         ┌───────────────────────────┐
                         │        歸墟/ （唯一原稿）        │  ← 稿件的家
                         │   *.md 章節  +  images/ 插圖    │
                         └─────────────┬─────────────┘
            編輯（寫入端）              │            建置時複製（讀取端）
        ┌───────────────────┼───────────────────────┐
        ▼                    ▼                        ▼
  local-admin/        scripts/build-pages.mjs   reader/build/novel-assets.ts
  本機編輯器            → .pages-dist/            → reader/dist/client/
  （127.0.0.1）            │                        │
        │                  ▼                        ▼
  git commit「歸墟/」   GitHub Pages 閱讀器        Sites / Workers 閱讀器
  + git push           （docs/ 外殼）             （reader/ vinext）
```

- **寫入端**只有一個：`local-admin/` 編輯器，直接改 `歸墟/` 裡的檔案，再用 git 把 `歸墟/` 推上 GitHub。
- **讀取端**有兩個：`reader/`（Sites）與 `docs/`（GitHub Pages）。兩者**建置時才把 `歸墟/` 複製進各自的輸出**，平時不留副本。
- `scripts/verify-novel-assets.mjs` 會驗證兩個建置產物與 `歸墟/` 原稿**逐位元組相同**，確保三邊不走鐘。

---

## 專案結構總表

| 路徑 | 角色 | 是否進 Git |
|------|------|:---:|
| [`歸墟/`](歸墟/) | 📖 **原稿**：章節、設定集、插圖（唯一來源） | ✅ |
| [`local-admin/`](local-admin/) | ✍️ **編輯器後台**（本機限定，寫入端） | ❌ 本機工具 |
| [`reader/`](reader/) | 📱 **閱讀器 A**：Sites / Cloudflare Workers 版（vinext） | ✅（原始碼） |
| [`docs/`](docs/) | 🌐 **閱讀器 B**：GitHub Pages 靜態外殼 | ✅ |
| [`scripts/`](scripts/) | 🔧 **建置 / 驗證腳本** | ✅ |
| [`.github/workflows/`](.github/workflows/) | 🚀 **CI**：推上 main 就自動部署 Pages | ✅ |
| `.pages-dist/` | 📦 Pages 建置產物 | ❌ 產物 |
| `開啟小說後台.command` | ▶️ macOS 雙擊啟動編輯器 | ❌ 本機工具 |
| `.claude/`、`.agents/` | 🎨 AI 生圖 / 命名等技能（含金鑰） | ❌ 已忽略 |

> **可攜性重點**：整條本機編輯工具鏈（`local-admin/`、`開啟小說後台.command`、`.claude/`、`.agents/`）**刻意不進 Git**。GitHub 上的 repo 只有「原稿 + 兩個閱讀器 + 建置腳本 + CI」，乾淨到任何人 clone 下來都能直接建置閱讀器。

---

## 📖 `歸墟/` — 原稿（系統的心臟）

所有系統都從這裡讀資料。編輯器直接改這裡，兩個閱讀器建置時複製這裡。

| 檔案 | 意義 |
|------|------|
| `01-溯光.md` … `12-眾水所歸.md` | 12 章正文 |
| `00-設定集.md` | 世界觀設定集（附錄） |
| `00A-人物誌-沈寧嶼.md` | 角色人物誌（附錄） |
| `README.md` | 閱讀導覽——**唯一不會被發布的 `.md`**，所有建置與編輯器都排除它 |
| `images/chapter-01/` | 第一章插圖（`.jpg` 初版與 `-v2.png` 重製版） |
| `images/character-沈寧嶼/` | 角色設定圖 |
| `images/setting/` | 場景設定圖（溯光號母船等） |

命名慣例（被程式解讀）：檔名前綴數字決定排序與章號；`00` 開頭或標題含「設定 / 人物誌 / 附錄」者被歸類為附錄而非正文。

---

## ✍️ `local-admin/` — 編輯器後台（寫入端）

本機限定的小說編輯與發布後台，代號「**稿室**」。它是唯一會**寫入** `歸墟/` 的系統。

| 檔案 | 意義 |
|------|------|
| `server.mjs` | 零依賴的 Node HTTP 伺服器；只綁 `127.0.0.1:4175`，提供 REST API，直接讀寫 `歸墟/` 並代理 Git |
| `public/index.html` | 編輯器 UI 骨架：章節側欄、Markdown 編輯區、即時預覽、圖片管理 |
| `public/app.js` | 前端邏輯（呼叫 API、鍵盤快捷鍵、拖曳上傳圖片、發布流程動畫） |
| `public/styles.css` | 編輯器樣式 |
| `tests/server.test.mjs` | `node:test` 測試（字數計算、路徑防護、API 健康檢查） |
| `.trash/` | 刪除章節的**軟刪除**去處（不直接永久刪除） |

**啟動方式**（三選一）：

```bash
# 1) 專案根目錄雙擊
開啟小說後台.command
# 2) 直接跑，並自動開瀏覽器
node local-admin/server.mjs --open
# 3) 跑測試
node --test local-admin/tests/server.test.mjs
```

**`server.mjs` 的 REST API**（前端 `public/app.js` 使用）：

| 方法 · 路徑 | 作用 |
|------|------|
| `GET /api/bootstrap` | 一次載入：章節清單 + 全書字數 + 圖片 + Git 狀態 |
| `GET/PUT/POST/PATCH/DELETE /api/chapter` | 讀取 / 儲存 / 新增 / 改名 / 軟刪除章節 |
| `GET/POST/PATCH/DELETE /api/assets` | 列出 / 上傳 / 改名 / 刪除圖片 |
| `GET /api/git` | 分支、遠端、未提交路徑、ahead/behind |
| `POST /api/publish` | **儲存 → 只把 `歸墟/` 加入暫存並 commit → `git push`** |

**設計重點**：

- **只綁 127.0.0.1**：同網路其他裝置連不進來。
- **只 commit `歸墟/`**：發布時用 `git add -- 歸墟` 與 `--only`，絕不順手把專案其他檔案一起提交。
- **安全防護**：章節 / 圖片路徑一律限制在 `歸墟/` 與 `歸墟/images/` 內（防目錄穿越）；儲存採「寫暫存檔再 rename」的原子寫入，並以 mtime 偵測外部同時修改（回傳 409）。
- **上限**：Markdown 5 MB、單張圖片 18 MB、請求 25 MB。

---

## 📱 `reader/` — 閱讀器 A：Sites / Cloudflare Workers 版

部署在 Cloudflare Workers / OpenAI Sites 上的沉浸式閱讀器，基於 **vinext（Next.js 16 + React 19）** 範本改造。

| 路徑 | 意義 |
|------|------|
| `app/reader.tsx` | **閱讀器主元件**：抓 `/novel/*.md` → 用 `marked` 轉 HTML；三種色調（日光 / 暮紙 / 深空）、字級行距欄寬、左右鍵翻章、以 `localStorage` 記住偏好與**閱讀進度** |
| `app/page.tsx` · `app/layout.tsx` | 首頁掛載閱讀器；`layout` 設定 SEO / OG 中繼資料 |
| `app/globals.css` | 閱讀器全站樣式 |
| `build/novel-assets.ts` | **關鍵接合點**：開發時把 `../歸墟/` 即時當作 `/novel`、`/images` 提供；建置結束時把原稿與圖片複製進 `dist/client/` |
| `build/sites-vite-plugin.ts` | 把 `.openai/hosting.json` 與 drizzle 遷移打包進輸出 |
| `worker/index.ts` | Cloudflare Worker 進入點（圖片最佳化 + App Router） |
| `db/`、`drizzle.config.ts` | D1 + Drizzle 骨架（目前**空的、未使用**，保留擴充空間） |
| `.openai/hosting.json` | Sites 部署設定（`d1`、`r2` 皆為 `null`） |
| `vite.config.ts` | 串起上述外掛與 Cloudflare 外掛 |

```bash
cd reader
npm install
npm run dev      # 本機開發（直接讀 ../歸墟）
npm run build    # 產生 dist/（原稿被複製進 dist/client/）
npm test         # 建置並驗證渲染骨架
```

> `reader/` 保留了原 vinext 範本的 `README.md` 與 D1 / SIWC 說明，作為平台文件；本專案實際只用到「讀 `歸墟/` → 顯示」這條路徑。

---

## 🌐 `docs/` — 閱讀器 B：GitHub Pages 靜態外殼

與 `reader/` **同一套 UI**，但完全**無框架**、自我包含，供 GitHub Pages 直接託管。

| 檔案 | 意義 |
|------|------|
| `index.html` | 頁面外殼（掛載點 `#app`、favicon、`<noscript>` 後備） |
| `app.js` | `reader.tsx` 的**原生 JS 移植版**：同樣的章節表、色調、進度記憶，不依賴 React |
| `styles.css` | 樣式 |
| `marked.min.js` | 內建（vendored）的 Markdown 轉譯器 |
| `.nojekyll` | 關閉 Jekyll，讓 `novel/`、`images/` 等資料夾原樣提供 |

**注意**：`docs/` 只是「空外殼」，本身**不含小說**。原稿是由 `scripts/build-pages.mjs` 在建置時注入到 `.pages-dist/novel/` 的（見下）。

---

## 🔧 `scripts/` — 建置與驗證

| 檔案 | 作用 |
|------|------|
| `build-pages.mjs` | 把 `docs/` 複製成 `.pages-dist/`，再注入 `歸墟/*.md` → `.pages-dist/novel/`、`歸墟/images/` → `.pages-dist/images/`，組出可發布的 Pages 成品 |
| `verify-novel-assets.mjs` | 斷言 `.pages-dist/novel/` 與 `reader/dist/client/novel/` 兩份產物，**逐位元組等於** `歸墟/` 原稿——三邊不同步就報錯 |

本機一次驗證兩個發布成品：

```bash
node scripts/build-pages.mjs      # 組 GitHub Pages 產物
npm --prefix reader run build     # 組 Sites 產物
node scripts/verify-novel-assets.mjs   # 驗證兩者都與原稿一致
```

---

## 🚀 `.github/workflows/pages.yml` — 自動部署

推送到 `main` 分支（或手動觸發）時：`node scripts/build-pages.mjs` → 上傳 `.pages-dist/` → 部署到 GitHub Pages。

因此**發布 GitHub Pages 版本的唯一動作，就是把 `歸墟/` 推上 main**——這正是編輯器 `POST /api/publish` 做的事。閉環完成。

---

## 🎨 `.claude/`、`.agents/` — AI 創作技能（本機、已忽略）

兩份各 37 個技能的 Skill 集（分別給 Claude 與 Codex 兩種代理執行環境），用於協助**產出小說素材**：生圖提示詞、角色命名、分鏡、配樂歌詞、劇本醫生等。含 API 金鑰，故列入 `.gitignore`，不會上傳。與閱讀器 / 編輯器的執行期無關，屬於「創作階段」的輔助工具。

---

## 追蹤狀態一覽

| 進 Git（會 push、會被 clone） | 本機限定（不進 Git） |
|------|------|
| `歸墟/`（原稿） | `local-admin/`（編輯器） |
| `reader/`（原始碼，排除 `dist/`、`node_modules/`） | `開啟小說後台.command`（啟動器） |
| `docs/`（Pages 外殼） | `.claude/`、`.agents/`（AI 技能 + 金鑰） |
| `scripts/`、`.github/`、`README.md`、`.gitignore` | `.pages-dist/`、`reader/dist/`（建置產物） |

---

## 常用指令速查

```bash
# ── 編輯 & 發布（本機編輯器）──
node local-admin/server.mjs --open       # 開後台，改稿、上傳圖、一鍵發布

# ── 閱讀器 A：Sites（reader/）──
npm --prefix reader run dev              # 本機開發
npm --prefix reader run build           # 建置

# ── 閱讀器 B：GitHub Pages（docs/）──
node scripts/build-pages.mjs            # 組 .pages-dist/

# ── 驗證三邊同步 ──
node scripts/verify-novel-assets.mjs

# ── 測試 ──
node --test local-admin/tests/server.test.mjs
npm --prefix reader test
```
