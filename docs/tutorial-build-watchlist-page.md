# 教學：從零建立「我的觀察清單」頁面

> **學習目標**：透過手動實作一個前端觀察清單（Watchlist）頁面，深入理解本專案的
> Vite 開發流程、React Router 路由註冊、Service 層分層架構，以及 localStorage 狀態持久化。

---

## 為什麼選這個功能？

觀察清單是一個「前端為主、無需資料庫」的功能，非常適合作為第一個練習：

- **路由層**：註冊一條新路由，理解 React Router 與 Vite 的協作方式。
- **Service 層**：建立 `watchlist.service.ts`，練習本專案「API Service 物件 + 純函式 Service」的雙層慣例。
- **頁面層**：用 Tailwind CSS 和 React Hooks 組合出完整 UI。
- **不碰後端/資料庫**：專注前端架構，降低環境門檻。

完成後你會新增或修改 **三個檔案**：

| 檔案 | 用途 |
|---|---|
| `src/services/watchlist.service.ts` | 觀察清單 Service（localStorage + StockApi） |
| `src/app/watchlist/page.tsx` | 觀察清單頁面元件 |
| `src/routes.tsx` | 新增 `/watchlist` 路由 |

---

## 前置準備

### 環境需求

- Node.js `20.19+` 或 `22.12+`（以 `package.json` 的 `engines` 為準）
- 本專案已 `npm install` 完成
- 若你要做到「真的拿到即時報價」，需要能正常啟動後端並登入系統
- `StockApi.getPrice()` 走的是受保護的 `/api/stocks/*` 路由；未登入時會被導向 `/login`

### 啟動開發環境

```bash
# 同時啟動前端 (port 3000) + 後端 (port 3001)
npm run dev:full
```

> 💡 若你只想先處理前端骨架，可以先 `npm run dev` 啟動前端；等你把頁面與 service 接好後，再用 `npm run dev:full` 驗證真實報價流程。

### 建立功能分支

```bash
git checkout -b feature/watchlist-page
```

---

## 專案背景知識（讀完再動手）

### Vite 在這個專案做了什麼？

| 機制 | 說明 |
|---|---|
| **Dev Server** | `npm run dev` 啟動 Vite dev server 於 `localhost:3000`，同時透過 proxy 把 `/api` 請求轉發到後端 `localhost:3001`。 |
| **HMR（Hot Module Replacement）** | 你存檔後，Vite 只會重新編譯改動的模組並推送到瀏覽器，頁面不會整個重新整理——這就是為什麼你改 JSX 後畫面幾乎「即時」更新。 |
| **路徑別名 `@/`** | 在 `vite.config.ts` 中設定 `'@': path.resolve(__dirname, './src')`，所以 `import X from '@/services/stock.api'` 等同於 `import X from './src/services/stock.api'`。TypeScript 也在 `tsconfig.json` 的 `paths` 中做了同樣的映射。 |
| **Build** | `npm run build` 先跑 `tsc --noEmit` 型別檢查，再交給 Vite 做 tree-shaking、code-splitting，輸出到 `dist/`。 |

### 路由註冊模式

本專案使用 **React Router v7** 的 `RouteObject` 陣列定義路由，集中在 `src/routes.tsx`：

```typescript
// 模式示意（非完整程式碼）
export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/dashboard', element: <DashboardPage /> },
      // ... 你的新路由會加在這裡
    ],
  },
]
```

每條路由都包在 `RootLayout` 底下，這個 Layout 提供 Theme、ErrorBoundary、Toast 等全域 Provider 與錯誤恢復機制。

### Service 層慣例

本專案的 Service 分兩類：

1. **API Service**（`*.api.ts`）：封裝 axios 呼叫，例如 `StockApi.getPrice(symbol)`。
2. **商業邏輯 Service**（`*.service.ts`）：不直接呼叫 HTTP，處理計算或本地狀態。

我們要建立的 `watchlist.service.ts` 屬於第二類，但會呼叫 `StockApi` 來取得報價。

---

## 步驟一：建立 Watchlist Service

> 📁 新增檔案：`src/services/watchlist.service.ts`

### 1-1 想清楚 Service 要做什麼

觀察清單 Service 需要：

- **讀取/寫入 localStorage** 中的股票代號清單（`string[]`）。
- **新增/移除** 個別代號。
- **批次取得報價**：對清單中每個代號呼叫 `StockApi.getPrice()`。

先定義一個型別，描述帶報價的觀察項目：

### 1-2 逐步撰寫

在 `src/services/` 目錄下新建 `watchlist.service.ts`。以下不是要你直接貼上的完整程式碼，而是分段說明每一部分的職責。

**（a）匯入與常數**

在檔案頂部匯入 `StockApi`，並定義 localStorage 的 key 常數：

```typescript
import { StockApi } from './stock.api'

const STORAGE_KEY = 'watchlist_symbols'
```

- 為什麼用常數？避免多處硬寫字串，之後改 key 名稱只要改一處。
- `StockApi` 是本專案既有的 API Service 物件，提供 `getPrice()` 方法。

**（b）定義型別**

在匯入下方，定義觀察清單項目的介面：

```typescript
export interface WatchlistItem {
  symbol: string
  currentPrice: number | null
  lastUpdated: Date | null
}
```

- `null` 值代表「尚未取得」或「取得失敗」的狀態。
- 這裡刻意不用 `Decimal.js`——觀察清單只是顯示用途，不做財務運算。
- 目前現有報價 API 只會回傳 `price` 與 `timestamp`；如果你想顯示漲跌與漲跌幅，可以當成延伸練習自己補上。

**（c）localStorage 存取**

撰寫兩個內部 helper 函式來讀寫 localStorage：

```typescript
function loadSymbols(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveSymbols(symbols: string[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(symbols))
}
```

- 用 `try/catch` 包住 `JSON.parse`，防止 localStorage 被手動改壞時整個頁面炸掉。
- 這兩個函式不需要 export，只在 Service 內部使用。

**（d）匯出 Service 物件**

最後，仿照 `StockApi` 的模式，匯出一個物件，裡面放所有公開方法：

```typescript
export const WatchlistService = {
  getSymbols(): string[] {
    return loadSymbols()
  },

  addSymbol(symbol: string): string[] {
    const symbols = loadSymbols()
    const upper = symbol.toUpperCase().trim()
    if (!upper || symbols.includes(upper)) return symbols
    const updated = [...symbols, upper]
    saveSymbols(updated)
    return updated
  },

  removeSymbol(symbol: string): string[] {
    const symbols = loadSymbols().filter((s) => s !== symbol.toUpperCase().trim())
    saveSymbols(symbols)
    return symbols
  },

  async fetchPrices(symbols: string[]): Promise<WatchlistItem[]> {
    const results = await Promise.allSettled(
      symbols.map(async (symbol) => {
        const quote = await StockApi.getPrice<{
          symbol: string
          price: string
          timestamp: string
        }>(symbol)

        const parsedPrice = Number(quote.price)

        return {
          symbol,
          currentPrice: Number.isFinite(parsedPrice) ? parsedPrice : null,
          lastUpdated: quote.timestamp ? new Date(quote.timestamp) : new Date(),
        } satisfies WatchlistItem
      })
    )

    return results.map((r, i) =>
      r.status === 'fulfilled'
        ? r.value
        : {
            symbol: symbols[i],
            currentPrice: null,
            lastUpdated: null,
          }
    )
  },
}
```

幾個值得注意的設計決策：

| 決策 | 原因 |
|---|---|
| `addSymbol` 回傳更新後的陣列 | 讓 caller 不需要再呼叫 `getSymbols()` 就能更新 state。 |
| `symbol.toUpperCase().trim()` | 統一格式，避免 `aapl` 和 `AAPL` 被當成不同代號。 |
| `Promise.allSettled` 而非 `Promise.all` | 某一支股票查詢失敗不影響其他結果，失敗的回傳 `null` 欄位。 |
| `Number(quote.price)` | 後端把價格以字串回傳，前端顯示前要先轉成 `number`。 |
| `satisfies WatchlistItem` | TypeScript 5.3+ 的語法，確保物件結構符合型別但不丟失字面量型別。 |

### 1-3 驗證

存檔後：

1. **HMR 沒有報錯**：看終端機和瀏覽器 console 有無紅字。
2. **型別檢查通過**：

```bash
npm run type-check
```

> 🎯 **Vite 做了什麼？** 存檔瞬間，Vite 的 dev server 偵測到新檔案，透過 esbuild 以近乎即時的速度完成轉譯。因為這個檔案還沒被任何元件 import，所以瀏覽器端暫時不會有 HMR 更新——但你可以在 terminal 看到 Vite 的 transform log。

---

## 步驟二：建立觀察清單頁面

> 📁 新增檔案：`src/app/watchlist/page.tsx`

### 2-1 建立目錄結構

在 `src/app/` 下新建 `watchlist/` 資料夾，在裡面建立 `page.tsx`。

```powershell
mkdir src\app\watchlist
```

```
src/app/watchlist/
  └── page.tsx
```

### 2-2 搭建元件骨架

先寫一個最精簡的元件骨架。這一步的目的是先把頁面雛形與 JSX 結構立起來；真正的路由驗證要等到步驟三：

```typescript
export default function WatchlistPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
        我的觀察清單
      </h1>
      <p className="text-gray-500 dark:text-gray-400 mt-2">
        頁面建置中...
      </p>
    </div>
  )
}
```

- `container mx-auto px-4 py-8` 是本專案常見的頁面外框樣式。
- 先不加 import、不加 state——這是刻意的，讓你先把畫面骨架寫出來。

### 2-3 加入 State 與 Service 呼叫

確認骨架能顯示後，開始逐步加入邏輯。

**（a）匯入需要的模組**

在檔案頂部加入：

```typescript
import { useState, useEffect, useCallback } from 'react'
import { WatchlistService, WatchlistItem } from '@/services/watchlist.service'
```

- `@/services/...` 就是使用 Vite 的路徑別名，等同 `../../services/...`，但更乾淨。
- `useCallback` 稍後會用來避免 `fetchPrices` 在每次 render 都重新建立。

**（b）宣告 State**

在元件函式內部、return 之前，加入以下 state：

```typescript
const [symbols, setSymbols] = useState<string[]>([])
const [items, setItems] = useState<WatchlistItem[]>([])
const [inputValue, setInputValue] = useState('')
const [loading, setLoading] = useState(false)
```

| State | 職責 |
|---|---|
| `symbols` | 使用者收藏的代號清單（來自 localStorage） |
| `items` | 帶有報價的完整資料（來自 API） |
| `inputValue` | 新增代號的輸入框值 |
| `loading` | 是否正在載入報價 |

**（c）載入與取價邏輯**

使用 `useCallback` + `useEffect` 來初始化資料：

```typescript
const refreshPrices = useCallback(async (syms: string[]) => {
  if (syms.length === 0) {
    setItems([])
    return
  }
  setLoading(true)
  try {
    const prices = await WatchlistService.fetchPrices(syms)
    setItems(prices)
  } finally {
    setLoading(false)
  }
}, [])

useEffect(() => {
  const saved = WatchlistService.getSymbols()
  setSymbols(saved)
  void refreshPrices(saved)
}, [refreshPrices])
```

- 初次載入時從 localStorage 讀取代號，然後批次取得報價。
- `finally` 確保不管成功或失敗都會關閉 loading。

**（d）新增與移除 handler**

```typescript
const handleAdd = () => {
  if (!inputValue.trim()) return
  const updated = WatchlistService.addSymbol(inputValue)
  setSymbols(updated)
  setInputValue('')
  void refreshPrices(updated)
}

const handleRemove = (symbol: string) => {
  const updated = WatchlistService.removeSymbol(symbol)
  setSymbols(updated)
  void refreshPrices(updated)
}
```

**（e）組合 JSX**

將 return 的 JSX 替換為完整的 UI。以下是概念性的結構描述——請自己動手寫出對應的 Tailwind 類別和 HTML：

1. **標題區塊**：`<h1>` 顯示「我的觀察清單」，加一個副標題說明此清單儲存在瀏覽器中。
2. **新增區塊**：一個 `<input>` 讓使用者輸入股票代號 + 一個「新增」按鈕。
   - input 要綁定 `value={inputValue}` 和 `onChange`。
   - 按下 Enter 也要能觸發新增（監聽 `onKeyDown`）。
3. **清單區塊**：用 `items.map()` 渲染每一筆觀察項目。
   - 每項顯示：代號、現價、最後更新時間、一個「移除」按鈕。
   - `lastUpdated` 可用 `toLocaleTimeString()` 格式化；若為 `null` 就顯示 `—`。
   - 報價為 `null` 時顯示 `—`。
4. **空狀態**：`symbols.length === 0` 時顯示引導文字。
5. **Loading 狀態**：`loading` 為 true 時顯示提示。

以下只提供 **結構骨架**，請你自己補齊 Tailwind class、文案細節與條件渲染：

```tsx
return (
  <div className="container mx-auto px-4 py-8 max-w-3xl">
    <header>{/* 標題 + 副標題 */}</header>

    <section>{/* input + 新增按鈕 */}</section>

    {loading ? (
      <p>{/* 正在載入報價... */}</p>
    ) : symbols.length === 0 ? (
      <div>{/* 空狀態 */}</div>
    ) : (
      <div>
        {items.map((item) => (
          <article key={item.symbol}>
            <div>{/* symbol */}</div>
            <div>{/* currentPrice / lastUpdated */}</div>
            <button onClick={() => handleRemove(item.symbol)}>移除</button>
          </article>
        ))}
      </div>
    )}
  </div>
)
```

如果你卡住，可以用這份檢查清單回頭對照：

- 標題區有頁面名稱與 localStorage 說明
- input 綁定 `inputValue`
- Enter 與按鈕點擊都會觸發 `handleAdd`
- Loading / 空狀態 / 清單狀態三者互斥
- 清單項目至少顯示代號、現價、最後更新時間、移除按鈕

### 2-4 驗證

存檔後瀏覽器應該還看不到這個頁面（因為路由還沒註冊），但你可以確認：

```bash
npm run type-check
```

> 🎯 **Vite 做了什麼？** 你新增了 `page.tsx`，但目前還沒有任何模組 import 它，所以這個頁面尚未進入瀏覽器的模組圖。等你在 `routes.tsx` 匯入它之後，Vite 才會把它納入 HMR 流程。

---

## 步驟三：註冊路由

> ✏️ 修改檔案：`src/routes.tsx`

### 3-1 加入 import

在 `src/routes.tsx` 頂部的 import 區塊，加入你的新頁面：

```typescript
import WatchlistPage from '@/app/watchlist/page'
```

放在其他 import 後面即可，保持字母順序更佳。

### 3-2 加入路由定義

在 `children` 陣列中，找到你覺得最容易維護的位置，加入一行：

```typescript
{ path: '/watchlist', element: <WatchlistPage /> },
```

### 3-3 驗證

1. 存檔後，Vite 的 HMR 會立即生效。
2. 打開瀏覽器前往 `http://localhost:3000/watchlist`。
3. 你應該能看到「👀 我的觀察清單」標題和輸入框。

> 🎯 **Vite 做了什麼？** `routes.tsx` 被修改 → Vite 偵測變更 → 因為 `routes.tsx` 是路由的進入點，HMR 會重新載入這個模組以及它新 import 的 `WatchlistPage` → 瀏覽器立即反映新路由，無須手動重新整理。

---

## 步驟四：端對端驗證

啟動完整開發環境（如果還沒啟動的話）：

```bash
npm run dev:full
```

如果你一進 `/watchlist` 就被轉回 `/login`，代表目前還沒登入；先完成登入再回來測試報價載入。

### 驗證清單

依序檢查以下項目：

| # | 驗證項目 | 預期結果 |
|---|---|---|
| 1 | 前往 `/watchlist` | 頁面正確顯示標題、輸入框 |
| 2 | 空狀態 | 顯示「尚未加入任何觀察標的」引導文字 |
| 3 | 輸入 `AAPL` 按新增 | AAPL 出現在清單中，報價正在載入 |
| 4 | 報價載入完成 | 顯示現價與最後更新時間 |
| 5 | 再加入 `GOOGL` | 兩筆項目並存 |
| 6 | 輸入重複的 `aapl` | 不會重複加入（大小寫正規化） |
| 7 | 點擊某項的 ✕ 按鈕 | 該項被移除 |
| 8 | 重新整理瀏覽器 | 清單仍在（localStorage 持久化） |
| 9 | 暗色模式 | 若你切換頁面主題，配色可正確切換 |
| 10 | 按 Enter 新增 | 與點擊新增按鈕效果相同 |

### 型別與程式碼品質

```bash
# 型別檢查
npm run type-check

# ESLint 檢查
npm run lint

# 確認 production build 不會失敗
npm run build
```

> 🎯 **Vite 做了什麼（Build 階段）？** `npm run build` 先執行 `tsc --noEmit` 做完整型別檢查，然後 Vite 使用 Rollup 做 production build：tree-shaking 移除未使用的程式碼、code-splitting 自動拆分路由 chunk、生成 source map 到 `dist/` 目錄。你的 `WatchlistPage` 會被拆成獨立的 chunk，只有使用者真的進入 `/watchlist` 時才會下載。

---

## 步驟五：提交變更

```bash
git add src/services/watchlist.service.ts
git add src/app/watchlist/page.tsx
git add src/routes.tsx

git commit -m "feat: add watchlist page with localStorage persistence

- Add WatchlistService for localStorage symbol management and price fetching
- Create /watchlist page with add/remove/refresh functionality
- Register /watchlist route in routes.tsx"
```

---

## 延伸練習

完成以上基礎版本後，可以嘗試以下進階挑戰：

### 🏋️ 練習 A：自動定時刷新

在 `useEffect` 中加入 `setInterval` 每 30 秒自動重新取得報價。記得在 cleanup 函式中 `clearInterval`。

### 🏋️ 練習 B：搜尋建議（Autocomplete）

利用既有的 `StockApi.search(keyword)` 在使用者輸入時顯示搜尋建議下拉選單。注意要加入 debounce 避免過度呼叫 API。

### 🏋️ 練習 C：寫單元測試

為 `WatchlistService` 撰寫 Jest 單元測試。Mock `localStorage` 和 `StockApi`，測試新增/移除/重複/大小寫等邊界情境。建議測試檔案放在 `tests/unit/watchlist.service.test.ts`。

執行方式：

```bash
npm run test:unit
```

### 🏋️ 練習 D：拖曳排序

安裝 `@dnd-kit/core`，讓使用者可以拖曳調整觀察清單的順序，並將順序持久化到 localStorage。

### 🏋️ 練習 E：導航列入口

在 `RootLayout` 或導航元件中加入 `/watchlist` 的連結，讓使用者可以從任何頁面快速進入觀察清單。

---

## 回顧：你學到了什麼

| 主題 | 你做了什麼 |
|---|---|
| **Vite Dev Server** | 理解了 dev server 的 proxy、HMR、alias 機制 |
| **React Router** | 在 `routes.tsx` 中註冊新路由，理解 `RouteObject` 結構 |
| **Service 層** | 建立了遵循專案慣例的 Service 物件（localStorage + API 整合） |
| **React Hooks** | 運用 `useState`、`useEffect`、`useCallback` 管理頁面狀態 |
| **Tailwind CSS** | 使用 utility-first CSS 搭配 dark mode 樣式 |
| **TypeScript** | 定義介面、使用 `satisfies`、泛型 API 呼叫 |
| **Vite Build** | 理解 tree-shaking、code-splitting、source map 生成 |

---

> 📝 本教學優先依據 `package.json`、`vite.config.ts`、`src/routes.tsx` 與實際 source code 撰寫；如果其他文件與這些來源不一致，請以程式碼本身為準。
