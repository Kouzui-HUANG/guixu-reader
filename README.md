# 《對齊：歸墟》閱讀器

小說原稿只有一份，位於 [`歸墟/`](歸墟/)。請直接在該目錄編修章節與圖片。

- `reader/`：Sites 閱讀器；建置時自動把原稿放進網站輸出。
- `docs/`：GitHub Pages 靜態閱讀器外殼；工作流程會執行 `node scripts/build-pages.mjs`，再把同一份原稿加入發布成品。
- `docs/novel/` 與 `reader/public/novel/` 不再保存原稿副本。

本機驗證兩個發布成品：

```bash
node scripts/build-pages.mjs
npm --prefix reader run build
node scripts/verify-novel-assets.mjs
```
