## Context

現行交易紀錄新增為單筆操作：前端 `TransactionForm` 送出一個物件，呼叫 `POST /api/transactions`，後端 `TransactionService.createTransaction()` 寫入一筆資料。預設日期硬編碼為 `new Date().toISOString().split('T')[0]`（今天）。

需求：支援一次送出多筆，以及將預設日期改為昨天。

## Goals / Non-Goals

**Goals:**
- 新增 `POST /api/transactions/bulk` endpoint，接受 `{ portfolioId, transactions[] }` 並以單一 DB transaction 寫入全部，保持原子性
- 新增前端 `BulkTransactionForm` 元件：可動態增減列（row），共用每列的日期預設值（昨天）
- 修改 `TransactionForm` 將預設日期從今天改為昨天
- 前端 `transaction.api.ts` 新增 `createTransactionsBulk()` 呼叫

**Non-Goals:**
- 不修改現有單筆 `POST /api/transactions` endpoint（向後相容）
- 不支援 CSV import 之外的批次格式
- 不做 UI 上的分頁 / 虛擬化（一次最多新增數量由前端 UI 限制在合理範圍，如 20 筆）

## Decisions

### 1. 新增獨立 `/bulk` endpoint 而非改造現有 endpoint
**決策**: 新增 `POST /api/transactions/bulk`，不修改 `POST /api/transactions`。

**理由**: 保持向後相容；現有呼叫者（其他 UI、CSV import）不受影響。若改造現有 endpoint 以同時支援單筆 / 批次，會讓 request body schema 變複雜，且失敗語義不同（單筆 400 vs 批次部分失敗）。

**替代方案**: 在現有 endpoint 以 array 包單筆；捨棄，因為 breaking change 風險高。

### 2. 全有全無（all-or-nothing）的 DB transaction 語義
**決策**: `createTransactionsBulk` 以 `prisma.$transaction([...])` 包裝，任一筆失敗則全部回滾。

**理由**: 使用者期待「一次送出」是原子操作；部分成功會讓持倉計算（holding）進入不一致狀態，難以除錯。

**替代方案**: 逐筆嘗試、回報部分成功；捨棄，太複雜且使用者難以理解哪幾筆失敗。

### 3. 預設日期：前端計算昨天，不依賴後端
**決策**: 前端 utility function `getYesterdayDateString()` 回傳 `YYYY-MM-DD` 字串，由 `TransactionForm` 和 `BulkTransactionForm` 共用。

**理由**: 日期顯示與時區屬於 UI 關注點；後端接受明確的日期字串，不需要推斷預設值。

### 4. BulkTransactionForm 使用 row array state
**決策**: 元件內部維護 `rows: TransactionRow[]` state，每個 row 有獨立的 symbol / type / quantity / price / date。提供「新增一列」按鈕和每列的刪除按鈕。初始顯示 1 列。

**理由**: 直覺、彈性，且對比表格/試算表 UI 實作複雜度低，符合現有表單設計語言。

## Risks / Trade-offs

- **[風險] 大量列時前端效能** → 以 UI 上限 20 列緩解，不做虛擬化
- **[風險] 部分列驗證失敗時 UX** → 送出前做前端驗證，標記哪列有錯誤，阻止送出；後端仍做驗證以防繞過
- **[Trade-off] 所有列共享日期 vs 每列獨立日期** → 選擇每列獨立日期（初始皆為昨天），允許使用者分別調整，更靈活

## Migration Plan

1. 後端先部署 `/bulk` endpoint（不影響現有 endpoint）
2. 前端 `TransactionForm` 日期預設值改為昨天（單行改動）
3. 前端新增 `BulkTransactionForm` 元件
4. Portfolio detail 頁面加入 `BulkTransactionForm` 入口（例如：Tab 或按鈕切換）

Rollback: `BulkTransactionForm` 為新增元件，移除不影響現有功能；`/bulk` endpoint 可直接停用。

## Open Questions

- Portfolio detail 頁面入口設計：是否新增 Tab「批次新增」，或在現有新增按鈕旁加「批次」選項？（建議後者，避免 Tab 過多）
