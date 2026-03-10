# Vite 6 → 7 升級差異分析

> **文件用途**：記錄本專案（stock-portfolio-system）從 Vite 6 升級至 Vite 7 的實際變更內容、官方遷移重點、驗證結果與風險評估。
>
> **適用對象**：專案維護者與開發者，特別是需要了解此次升級範圍與影響的人員。
>
> **基準點**：
> - 升級前：`vite ^6.3.0`（resolved 6.4.1）、`@vitejs/plugin-react ^4.3.0`（resolved 4.7.0）
> - 升級後：`vite ^7.3.1`（resolved 7.3.1）、`@vitejs/plugin-react ^5.1.4`（resolved 5.1.4）

---

## 目錄

1. [背景與目的](#1-背景與目的)
2. [實際變更內容](#2-實際變更內容)
3. [官方文件重點與本專案影響](#3-官方文件重點與本專案影響)
4. [驗證結果](#4-驗證結果)
5. [風險與建議](#5-風險與建議)
6. [結論](#6-結論)

---

## 1. 背景與目的

本專案採用 **Vite (React SPA) + Express (REST API)** 分離式架構。前端建置工具為 Vite，搭配 `@vitejs/plugin-react` 進行 React JSX/TSX 轉譯與 HMR。

此次升級目的：

- **跟進 Vite 主版本**：Vite 7 於 2025 年發佈，帶來效能改進與現代化預設值。
- **保持生態系相容性**：確保與最新版 esbuild、Rollup 等工具鏈相容。
- **Node.js 版本對齊**：Vite 7 正式移除 Node 18 支援，與專案部署環境（Node 20+）一致。

---

## 2. 實際變更內容

此次升級 **僅修改 2 個檔案**：`package.json` 與 `package-lock.json`，無任何設定檔或原始碼變更。

### 2.1 直接依賴變更

| 套件 | 升級前版本 | 升級後版本 | 說明 |
|------|-----------|-----------|------|
| `vite` | `^6.3.0`（resolved 6.4.1） | `^7.3.1`（resolved 7.3.1） | 主建置工具，主版本升級 |
| `@vitejs/plugin-react` | `^4.3.0`（resolved 4.7.0） | `^5.1.4`（resolved 5.1.4） | React 插件，主版本升級 |

### 2.2 新增 Node 引擎約束

```json
"engines": {
  "node": "^20.19.0 || >=22.12.0"
}
```

此約束與 Vite 7 官方要求對齊，確保 CI/CD 與本機開發環境不會誤用不支援的 Node 版本。

### 2.3 傳遞依賴更新（lockfile）

lockfile 中的主要傳遞依賴變更：

| 套件 | 升級前 | 升級後 |
|------|--------|--------|
| `esbuild` | 0.25.12 | 0.27.3 |
| `@babel/core` | 7.28.5 | 7.29.0 |

其餘為 Vite 7 內部依賴的連帶更新，皆為自動解析，無需手動介入。

### 2.4 未變更的檔案

以下檔案在升級前後 **完全未修改**，代表本專案的 Vite 設定已與 Vite 7 相容：

- `vite.config.ts` — 建置設定
- `tsconfig.json` — TypeScript 設定
- `index.html` — SPA 進入點
- `postcss.config.js` — PostCSS 設定
- `tailwind.config.ts` — Tailwind CSS 設定

---

## 3. 官方文件重點與本專案影響

以下整理 Vite 7 與 plugin-react 5 的官方破壞性變更，並逐一評估對本專案的影響。

> 參考來源：
> - [Vite 7 Migration Guide](https://vite.dev/guide/migration)
> - [plugin-react CHANGELOG](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/CHANGELOG.md)

### 3.1 Vite 7 破壞性變更

| 變更項目 | 說明 | 本專案影響 |
|----------|------|-----------|
| Node 18 支援移除 | 最低要求 Node 20.19+ 或 22.12+ | ✅ 無影響 — 已加入 `engines` 約束 |
| `build.target` 預設值改為 `baseline-widely-available` | 產出物的瀏覽器相容性目標更新 | ✅ 無影響 — React SPA 面向現代瀏覽器 |
| Sass legacy API 移除 | 不再支援舊版 Sass API | ✅ 無影響 — 本專案使用 Tailwind CSS，未使用 Sass |
| `splitVendorChunkPlugin` 移除 | 不再內建廠商 chunk 分割插件 | ✅ 無影響 — 本專案未使用此插件 |
| `optimizeDeps.esbuildOptions` 變更 | 預依賴最佳化選項調整 | ✅ 無影響 — 本專案未自訂此選項 |
| ESM-only 發佈 | Vite 本身僅提供 ESM 格式 | ✅ 無影響 — 專案設定已為 ESM 相容 |
| SSR 相關 API 變更 | 伺服器端渲染行為調整 | ✅ 無影響 — 本專案為純 SPA，無 SSR |

### 3.2 plugin-react 5 破壞性變更

| 變更項目 | 說明 | 本專案影響 |
|----------|------|-----------|
| 不再自動設定 `resolve.dedupe` | 移除對 `react`/`react-dom` 的自動去重 | ✅ 無影響 — 本專案未依賴此行為，無多版本 React 問題 |
| Node 版本要求對齊 Vite 7 | 同樣要求 Node 20.19+ | ✅ 無影響 — 已透過 `engines` 約束處理 |

**結論：本專案未使用任何被移除或破壞性變更影響的功能，升級過程零設定變更。**

---

## 4. 驗證結果

升級前後分別執行完整驗證流程，確認無回歸問題。

### 4.1 驗證對照表

| 驗證項目 | 升級前結果 | 升級後結果 | 判定 |
|----------|-----------|-----------|------|
| `npm run type-check` | ✅ PASS | ✅ PASS | 無回歸 |
| `npm run build` | ✅ PASS | ✅ PASS | 無回歸 |
| `npm run lint` | ⚠️ FAIL（453 問題：38 errors / 415 warnings） | ⚠️ FAIL（453 問題：38 errors / 415 warnings） | 無回歸 — 問題數量完全一致，皆為既有問題 |
| `npm test` | ⚠️ FAIL（存在 1 個不穩定的 property-based test） | ✅ PASS（470/470 全數通過） | 無回歸 — 既有不穩定測試於本次執行通過 |

### 4.2 驗證結論

- **型別檢查與建置**：完全通過，Vite 7 與 TypeScript 設定無衝突。
- **ESLint**：升級前後錯誤數完全一致，確認無新增問題。
- **測試**：升級後所有 470 個測試皆通過。升級前偶爾失敗的 property-based test 於本次執行亦通過，但因其本身具不穩定性，不宜歸因於升級本身。

---

## 5. 風險與建議

### 5.1 低風險項目

| 風險 | 說明 | 緩解措施 |
|------|------|---------|
| Node 版本不符 | CI/CD 或開發者本機使用 Node 18 | 已加入 `engines` 約束，`npm install` 時會警告 |
| `build.target` 行為差異 | 預設產出物可能略有不同 | 本專案面向現代瀏覽器，實際影響極小 |
| 傳遞依賴版本跳躍 | esbuild 0.25→0.27 為跨主版本 | 建置與測試皆通過，未觀察到問題 |

### 5.2 建議後續行動

1. **確認 CI/CD Node 版本**：確保所有 CI 環境使用 Node 20.19+ 或 22.12+。
2. **觀察生產環境**：部署後觀察前端資源載入與 HMR 行為是否正常。
3. **清理既有 lint 問題**：現有 453 個 lint 問題與本次升級無關，但建議逐步修復。

---

## 6. 結論

此次 Vite 6 → 7 升級對本專案而言是一次 **低風險、零設定變更** 的主版本升級：

- **變更範圍極小**：僅 `package.json` 與 `package-lock.json`，無任何設定檔或原始碼修改。
- **官方破壞性變更皆不影響**：本專案未使用任何被移除的 API 或功能。
- **驗證結果良好**：型別檢查、建置、lint 皆無回歸，測試全數通過。
- **信心等級：高** — 可安心合併與部署。
