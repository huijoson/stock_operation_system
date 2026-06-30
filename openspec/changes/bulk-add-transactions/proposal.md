## Why

使用者在補登歷史交易時，需要逐筆新增非常耗時；同時，現有表單預設日期為今天，但交易日通常是昨天（或更早），導致每次都需手動修改日期，體驗不佳。

## What Changes

- 新增「批次新增交易」功能：一個 UI 可以同時輸入多筆交易紀錄，一次送出
- 修改 `TransactionForm` 的預設日期：從今天（`new Date()`）改為昨天
- 新增後端 bulk create API endpoint：`POST /api/transactions/bulk`，接受陣列 payload 並以單一 DB transaction 寫入
- 前端新增 `BulkTransactionForm` 元件，支援動態增減列（row）

## Capabilities

### New Capabilities
- `bulk-transaction-entry`: 允許使用者在同一表單中輸入多筆交易、動態新增 / 移除列、一次送出所有交易

### Modified Capabilities
- `transaction-form-default-date`: 預設日期從今天改為昨天（`TransactionForm` 與 `BulkTransactionForm` 共用邏輯）

## Impact

- **Frontend**: `src/components/transactions/TransactionForm.tsx`（日期預設值）、新增 `src/components/transactions/BulkTransactionForm.tsx`、使用 `BulkTransactionForm` 的頁面（portfolio detail）
- **Backend**: `backend/src/routes/transactions.ts`（新增 `/bulk` route）、`backend/src/services/transaction.service.ts`（新增 `createTransactionsBulk` method）
- **API**: 新增 `POST /api/transactions/bulk`，request body `{ portfolioId, transactions: TransactionInput[] }`
- **Tests**: 新增後端 unit tests for bulk endpoint；前端元件 smoke test
