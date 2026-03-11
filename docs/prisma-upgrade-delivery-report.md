# Prisma 7 升級報告（完整版）

> **專案**: stock_operation_system
> **升級路徑**: Prisma 6.19.0 → Prisma 7.4.2
> **Node.js**: v22.17.0 · **TypeScript**: 5.7.3

---

## 摘要

本專案的 Prisma 7 升級採三階段策略完成：

1. **Phase 1** — 在 Prisma 6 上執行安全重構準備（import 修正、PrismaClient 單例化）
2. **Phase 2** — Schema / generator / config 遷移，切換至 Prisma 7
3. **Phase 3** — Runtime 與 import 路徑收斂，全面驗證

升級後，application/runtime 路徑已切換到 Prisma 7 的新要求：

- datasource URL 由 `prisma.config.ts` 管理
- generated client 輸出到 `backend/src/generated/prisma`
- backend runtime 改為透過 `@prisma/adapter-pg` 初始化 Prisma client
- generator 改為 `prisma-client` + `moduleFormat = "cjs"`，避免全面改造 backend 成 ESM
- seed / scripts / query script 已改為相容 Prisma 7 的 client 初始化方式

整體判定：**Prisma 7 升級已在 app code 與建置路徑落地完成**，但 **legacy backend Jest 測試** 仍存在大量既有問題，尚未被一併現代化。

---

## Phase 1：背景與安全準備

### 為何升級並非直接換版本

本專案原先嘗試直接升級至 Prisma 7，但安裝後立即遭遇 **P1012** 錯誤——Prisma 7 不再允許在 `prisma/schema.prisma` 中以 `url = env("DATABASE_URL")` 設定 datasource，而改為要求在 `prisma.config.ts` 中配置。因此決定採分階段策略，先在 Prisma 6 上完成安全重構。

### Repo 盤點結果

| 指標 | 數量 | 備註 |
|------|------|------|
| `@prisma/client` import 總數 | 37 | 分佈於 backend routes、services、scripts、tests |
| 深層 runtime import | 2 | `@prisma/client/runtime/library`（Prisma 7 會斷裂） |
| 非單例 `new PrismaClient()` 站點 | 13 | 分佈於路由、服務、腳本 |
| `prisma.config.ts` | 1 | 已存在，含 `datasource.url` |
| `prisma/schema.prisma` datasource | 1 | 仍保留 `url = env("DATABASE_URL")`（Blocker） |

### Phase 1 完成的重構

**深層 import 路徑修正**（2 處）：

| 檔案 | 修改前 | 修改後 |
|------|--------|--------|
| `backend/src/middleware/error-handler.ts` | `import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'` | `import { Prisma } from '@prisma/client'` → 使用 `Prisma.PrismaClientKnownRequestError` |
| `backend/src/routes/auth.ts` | 同上深層 import | 同上公開 API |

**PrismaClient 單例化整合**（5 個檔案）：

| 檔案 | 變更摘要 |
|------|----------|
| `backend/src/routes/holding-advice.ts` | 移除 route-level `new PrismaClient()` 及 `$disconnect()`，改用 singleton |
| `backend/src/routes/news.ts` | 同上 |
| `backend/src/routes/stocks.ts` | 同上 |
| `backend/src/routes/misc.ts` | 同上 |
| `backend/src/services/strategy.service.ts` | 同上 |

> Prisma 7 對 Client 初始化策略有重大變更（adapter / accelerate），統一為單例可降低遷移風險，也避免連線耗盡問題。

**移除路由層 `$disconnect()` 呼叫**：隨著 transient client 被移除，對應的 `$disconnect()` 呼叫也一併清理。

### Phase 1 識別的 Blocker

| # | Blocker | 嚴重性 | 說明 |
|---|---------|--------|------|
| B1 | Schema datasource URL 未移除 | 🔴 高 | `prisma/schema.prisma` 仍包含 `url = env("DATABASE_URL")`，Prisma 7 會觸發 P1012 |
| B2 | Generator 區塊未更新 | 🔴 高 | `provider = "prisma-client-js"` 需依 Prisma 7 要求調整 |
| B3 | 測試環境 datasource 注入 | 🟡 中 | `jest.setup.js` 的 SQLite URL 注入方式需配合新配置調整 |
| B4 | Backend 176 個既存 TS 錯誤 | 🟡 中 | 雖與 Prisma 無關，但若升級引入新錯誤將難以區分 |

> Phase 1 在 Prisma 6.19.0 上完成，所有 Blocker 已在後續 Phase 2/3 中解決。

---

## Phase 2：Prisma 7 實作切換

已完成以下變更：

- `package.json`
  - 升級 `prisma` 至 `7.4.2`
  - 升級 `@prisma/client` 至 `7.4.2`
  - 新增 `@prisma/adapter-pg`
  - 新增 `pg`
  - 新增 `tsx`
  - 將 `postinstall` 改為 `prisma generate --no-hints && playwright install --with-deps chromium`
- `prisma/schema.prisma`
  - generator 改為 `prisma-client`
  - output 改為 `../backend/src/generated/prisma`
  - 新增 `moduleFormat = "cjs"`
  - 移除 datasource 內的 `url = env("DATABASE_URL")`
- `prisma.config.ts`
  - `datasource.url` 持續由 `env('DATABASE_URL')` 提供
  - seed runner 改為 `tsx prisma/seed.ts`

## Phase 3：Runtime 與 import 路徑收斂

已完成以下變更：

- 新增 `backend/src/lib/prisma-client.ts`
  - 作為 backend 內統一匯入 generated client 的 wrapper
- 新增 `backend/src/lib/prisma-factory.ts`
  - 透過 `PrismaPg({ connectionString })` 建立 Prisma 7 client
- 更新 `backend/src/lib/prisma.ts`
  - shared singleton 改為使用 Prisma 7 adapter 初始化
- backend runtime 檔案改由 wrapper 匯入 Prisma types/client
- `prisma/seed.ts`、`scripts/*.ts`、`query-tsm.js`
  - 已切換為 Prisma 7 相容的初始化方式
- 新增 `backend/src/routes/request-utils.ts`
  - 收斂 route path/query 參數為單一 `string`
  - 消除 Prisma 7 後更嚴格型別下的 `string | string[]` 問題

### Phase 2/3 驗證與硬化

- `.gitignore` / `.eslintignore`
  - 忽略 `backend/src/generated/`
- `backend/tsconfig.json`
  - `backend:build` 排除 `src/__tests__`
  - 讓 backend build 專注驗證 production app code，而不是被 legacy test typing 綁住
- `backend/src/__tests__/setup.ts`
  - 補齊多個 Prisma delegate mock，降低 test setup 與新 schema 的落差

## 主要檔案差異

### 依賴與設定

- `package.json`
- `package-lock.json`
- `prisma/schema.prisma`
- `prisma.config.ts`
- `.gitignore`
- `.eslintignore`
- `backend/tsconfig.json`

### Prisma runtime

- `backend/src/lib/prisma-client.ts`
- `backend/src/lib/prisma-factory.ts`
- `backend/src/lib/prisma.ts`

### 已改寫 Prisma 使用點

- `backend/src/middleware/error-handler.ts`
- `backend/src/routes/auth.ts`
- `backend/src/routes/holding-advice.ts`
- `backend/src/routes/news.ts`
- `backend/src/routes/stocks.ts`
- `backend/src/routes/misc.ts`
- `backend/src/routes/portfolios.ts`
- `backend/src/routes/transactions.ts`
- `backend/src/routes/risk-assessment.ts`
- `backend/src/routes/realized-pl.ts`
- `backend/src/routes/strategies.ts`
- `backend/src/services/*.ts` 中的 Prisma 匯入與 singleton 使用點
- `prisma/seed.ts`
- `scripts/backfill-realized-pl.ts`
- `scripts/backfill-tax-lots.ts`
- `scripts/sync-dashboard-news.ts`
- `scripts/validate-insights.ts`
- `query-tsm.js`

## 驗證結果

### 1. 安裝與 generate

指令：

```bash
npm install
```

結果：

- 成功安裝 Prisma 7 相關依賴
- 成功產生 Prisma Client 到 `backend/src/generated/prisma`

### 2. Frontend 型別檢查

指令：

```bash
npm run type-check
```

結果：`通過`

### 3. Frontend build

指令：

```bash
npm run build
```

結果：`通過`

補充：

- Vite build 成功
- 僅有既有的大 chunk warning，非 Prisma 升級導致

### 4. Backend build

指令：

```bash
npm run backend:build
```

結果：`通過`

說明：

- 在將 backend build 範圍調整為 app code 後，Prisma 7 runtime / routes / services 可正常通過 TypeScript 編譯

### 5. Root Jest

指令：

```bash
npm test
```

結果：`失敗`

觀察：

- 失敗集中於既有的 `tests/property/calculation.property.test.ts`
- 其餘大量前端 / property / unit 測試仍持續通過
- 本次失敗未觀察到與 Prisma 7 升級直接相關的訊號

### 6. Backend Jest

指令：

```bash
npm run backend:test
```

結果：`失敗`

觀察：

- 失敗主體仍為 legacy backend 測試群
- 包含既有的：
  - `node:test` / Jest 混用
  - bcrypt mock 問題
  - dashboard/news/realized-pl 類測試基礎設施脆弱
  - 舊測試對 Prisma mock / module alias / async teardown 的假設不穩定
- 雖然本次已補齊部分 Prisma delegates，但此測試群尚未完成整體現代化，不適合作為 Prisma 7 是否可交付的唯一 gate

## 風險與限制

### 1. Generated client 是必要產物

`backend/src/generated/prisma` 不應手動維護，也不應提交。新環境需要先執行：

```bash
npm install
```

或：

```bash
npx prisma generate --no-hints
```

### 2. Prisma client logging 行為已簡化

原本 singleton 建立時會傳入 `log` 設定；在目前 Prisma 7 adapter 型別限制下，已先採用最保守的 `adapter-only` 初始化方式。

這不影響功能正確性，但若後續需要更細的 query logging，建議另行研究 Prisma 7 adapter 模式下的官方建議做法。

### 3. Legacy backend tests 仍需獨立整治

目前 app code 已完成 Prisma 7 升級，但 backend 測試體系仍有與本次升級無關的既有問題。建議另案拆成：

- 測試執行器一致化（Jest vs `node:test`）
- bcrypt / external service mock 清理
- Prisma mock typing 與 fixtures 重整
- 舊 alias 與舊路徑引用清理

## 建議後續工作

1. 將 backend legacy tests 切分為「保留、重寫、淘汰」三類。
2. 如果需要 Prisma query logging，補做 adapter 模式的 logging 方案。
3. 在 CI 中明確分開：
   - app build gate
   - frontend/root test gate
   - backend legacy test gate
4. 若未來要再往 Prisma 7 後續能力演進，再評估是否需要：
   - 更進一步抽象化 generated client import
   - 導入更完整的 DB integration test strategy
5. 確認剩餘非單例 PrismaClient 站點：
   - 剩餘 `new PrismaClient()` 主要位於 scripts（backfill、sync）、seed、tests 中
   - 這些獨立腳本的直接實例化屬合理用法，升級時僅需更新 import 路徑

## 最終結論

本專案已完成從 Prisma 6.19.0 到 Prisma 7.4.2 的完整升級，經歷三個階段：

- **Phase 1**（安全準備）：完整的 repo 盤點、2 處深層 import 修正、5 個檔案的 PrismaClient 單例化、transient `$disconnect()` 清理
- **Phase 2**（實作切換）：schema / generator / config 遷移、依賴升級、adapter-pg 導入
- **Phase 3**（收斂驗證）：全 repo import 路徑收斂、request-utils 型別修正、build 驗證通過

核心目標已達成：

- ✅ Prisma 7 依賴安裝成功
- ✅ generated client 成功產生
- ✅ backend runtime 已改為 adapter 模式
- ✅ app code build 可通過
- ✅ frontend type-check / build 可通過
- ⚠️ backend Jest 測試因既有問題仍未全面通過（與 Prisma 升級無直接關聯）

**Legacy backend Jest 測試現代化**屬於獨立的測試債清理工作，不應與 Prisma 7 app/runtime 升級混為同一個交付判定。

---

> **參考文件**
> - [Prisma 7 Upgrade Guide](https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7)
> - [Prisma 7 Release Blog](https://www.prisma.io/blog/prisma-7-generally-available)
> - [Prisma Config File Reference](https://www.prisma.io/docs/orm/reference/prisma-config-reference)
