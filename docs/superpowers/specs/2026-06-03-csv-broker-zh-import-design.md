# 設計：中文券商 CSV 匯入（Schwab / Firstrade）

- 日期：2026-06-03
- 狀態：已通過設計、待寫實作計畫
- 分支：`feature/csv-broker-zh-import`

## 1. 背景與目標

使用者會從券商下載中文版報表，現有匯入只支援英文表頭的 `schwab`、`firstrade`
兩種格式（表頭 `Date,Action,Symbol,Quantity,Price`），無法解析中文報表。

目標：在**既有匯入管線**上新增兩種中文格式，讓使用者能直接上傳以下報表並同步到資料庫：

- 檔 ①　`export (1).csv`　＝ **Schwab 中文成交明細**　→ 新格式 `schwab-zh`
- 檔 ②　`Individual…Order_Status…csv`　＝ **Firstrade 中文訂單狀態**　→ 新格式 `firstrade-zh`

並加入「防止重複匯入」能力。

## 2. 範圍

**在範圍內**
- `csv-parser.ts` 新增 `schwab-zh`、`firstrade-zh` 兩個 parser，`CSVFormat` 型別擴充。
- `Transaction` 新增可空 `externalId` 欄位 + 唯一鍵，作為權威防重複鍵。
- `importFromCSV` 防重複邏輯擴充（externalId 優先，否則沿用既有 composite 比對）。
- 後端 route 的 `format` 白名單、前端 `ImportDialog` 下拉選單加入新選項，並加入**表頭自動偵測**。
- 單元測試（parser、import 防重）＋ 以兩個真實檔做 golden 測試。

**不在範圍內**
- 不重寫匯入架構、不改 `{ successCount, skippedCount, errorCount, errors }` 回應格式。
- 不處理 `融資` 帳戶別、手續費、`金額` 欄（`Transaction` model 無對應欄位，捨棄）。
- 不引入資料庫 MCP（App 內建功能在 runtime 透過 Prisma 寫入，MCP 非執行時依賴）。
- 既有上傳 plumbing 的修復另議（見 §8 風險）。

## 3. 現況整合點

```
ImportDialog.tsx ──importCsv(file, format, portfolioId)──▶ POST /transactions/import
   └─ 下拉選單 format                                          └─ importFromCSV(portfolioId, csvContent, format)
                                                                   └─ parseCSV(content, format) ──▶ parseSchwabRow / parseFirstradeRow
                                                                   └─ 逐筆防重 + createTransaction
```

關鍵既有事實：
- `parseCSV(content, format)` 依 `format` 分派到各 row parser，回傳 `{ transactions: ParsedTransaction[], errors }`。
- `importFromCSV`（`transaction.service.ts:491`）**已內建** composite 防重複：
  比對 `(symbol, type, quantity, price, date 到日)` 相同則 `skippedCount++`。
- route（`transactions.ts:235`）已回傳 `skippedCount`；前端 `ImportDialog` 已顯示「成功 / 跳過 / 錯誤」。

因此新增格式只需「多兩個 parser + 一個欄位」，不動管線結構。

## 4. 欄位對應（核心）

### 4.1 `schwab-zh`（檔 ①：Schwab 中文成交明細）

表頭：`日期,交易類別,數量,說明,代號,賬戶類別,價格,金額`

| CSV 欄位 | → `ParsedTransaction` | 處理 |
|---|---|---|
| `日期` 例 `2026/6/2` | `date` | 解析 `YYYY/M/D`（補零後 `new Date`），非法→該列 error |
| `交易類別` 買進/賣出 | `type` | `買進`→`BUY`、`賣出`→`SELL`，其他→error |
| `數量` 例 `15` / `-30` | `quantity` | `Decimal` 取**絕對值**；`0`/NaN→error |
| `代號` 例 `MRVL` | `symbol` | `trim()` |
| `價格` 例 `285.202` | `price` | `Decimal`；`<=0`/NaN→error |
| `說明` / `賬戶類別`(融資) / `金額` | — | 忽略 |
| 防重複 | `externalId` 留空 | 走既有 composite 防重 |

### 4.2 `firstrade-zh`（檔 ②：Firstrade 中文訂單狀態）

表頭：`代號,策略名稱,證券名稱,狀態,行動,數量|面值,價格,時間限制,成交價格,成交價是平均值,時間和日期（美東時間）,最新活動(美東時間),資本利得再投資,訂單號碼`

| CSV 欄位 | → `ParsedTransaction` | 處理 |
|---|---|---|
| `狀態` 已成交/已取消/… | （過濾） | **僅** `已成交` 匯入；其餘→`skipped`（非 error） |
| `行動` 買入/賣出 | `type` | `買入`→`BUY`、`賣出`→`SELL`，其他→error |
| `數量\|面值` 例 `20 股數` | `quantity` | 抽前導數字 `20`；非法→error |
| `成交價格` 例 `$422.55` / `-` | `price` | 去 `$` 與千分位逗號→`Decimal`；`-`/空→視為未成交→`skipped` |
| `時間和日期（美東時間）` 例 `1:00 PM 06/02/2026` | `date` | 解析為 `Date`（取日期；時區見 §8 假設） |
| `代號` 例 `TSLA` | `symbol` | `trim()` |
| `訂單號碼` 例 `1006575884073` | **`externalId`** | 權威防重複鍵 |
| `策略名稱`/`證券名稱`/`時間限制`/`成交價是平均值`/`最新活動`/`資本利得再投資` | — | 忽略 |

## 5. 防重複設計

### 5.1 Schema 變更（需 migration）

```prisma
model Transaction {
  // …既有欄位…
  externalId  String?
  // …
  @@index([portfolioId, date])
  @@unique([portfolioId, externalId])   // 新增；可空，Postgres 允許多個 NULL
}
```

- 透過專案既有流程套用 migration：`npm run db:migrate`（`scripts/db-migrate.mjs`）。
  注意 `prisma/migrations` 已被 `.gitignore` 忽略，故**版控的真實來源是 `schema.prisma`**，migration 檔不入庫（沿用專案現況）。
- 既有資料 `externalId` 皆為 `NULL`，唯一鍵不衝突；現有功能零影響。

### 5.2 匯入防重邏輯（`importFromCSV` 擴充）

```
對每一筆 parsedTx：
  若 parsedTx.externalId 存在：
    若該 portfolio 已有相同 externalId 的 Transaction → skipped
  否則（無 externalId）：
    沿用既有 composite 比對（symbol+type+qty+price+date 到日）→ skipped
  否則 → createTransaction（含 externalId）, success
```

- `ParsedTransaction` 介面新增 `externalId?: string`。
- `createTransaction` / `TransactionInput` 接受並寫入 `externalId`（可選）。
- `firstrade-zh` → 用 `訂單號碼`，同訂單永不重覆。
- `schwab-zh` → `externalId` 留空，行為等同使用者要的「日期+代號+類別+數量+價格 組合鍵」，重用既有程式碼。
- 既有 `schwab` / `firstrade` 英文格式行為 **100% 不變**。

## 6. 格式選擇 UX

- `ImportDialog` 下拉預設「**自動偵測**」：依表頭特徵字串判斷
  - 含 `訂單號碼` 且 `狀態` → `firstrade-zh`
  - 含 `交易類別` 且 `賬戶類別` → `schwab-zh`
  - 英文表頭 → 既有 `schwab` / `firstrade`（以 `Action` 等欄位區分）
- 偵測不到時提示使用者手動指定；下拉仍提供全部格式（含兩個新選項）作為覆寫。
- 偵測函式 `detectCSVFormat(headerLine): CSVFormat | null` 放在 `csv-parser.ts`，前後端可共用邏輯（後端在 `importFromCSV` 前若 format=auto 亦可呼叫）。

## 7. 錯誤處理

- 單列解析錯誤（壞日期/壞數字/未知 type）→ 收進 `errors[{ row, message }]`，**不中斷**整批。
- 已取消/未成交/未知狀態、`成交價格` 為 `-` → 計入 `skippedCount`。
- 重複（externalId 或 composite）→ `skippedCount`。
- 整體沿用既有回應結構 `{ successCount, skippedCount, errorCount, errors }`。

## 8. 已知風險與假設

- **既有上傳 plumbing**：route 讀 `req.body.file`，但前端送 `multipart/form-data` 且未掛 `multer`。
  現有 UI 上傳路徑很可能本就接不上（既有問題）。本案以**單元測試直接驗證 `parseCSV` / `importFromCSV`**
  保證解析與防重正確；是否一併補 `multer` 留待實作前與使用者確認。
- **時區假設**：Firstrade 時間為「美東時間」。`Transaction.date` 僅用到「日」（既有 composite 防重也是比到日）。
  預設以該日期字串建立 `Date`，不做時區換算；若需精確 UTC 對齊，於實作時加註並測試。
- **數量單位**：`數量|面值` 假設恆為「股數」；若出現面值/選擇權單位，列為 error 由使用者檢視。

## 9. 受影響檔案

| 檔案 | 變更 |
|---|---|
| `prisma/schema.prisma` | `Transaction.externalId` + `@@unique([portfolioId, externalId])` |
| `prisma/migrations/*` | 新 migration |
| `backend/src/lib/csv/csv-parser.ts` | `CSVFormat` 擴充、`parseSchwabZhRow`、`parseFirstradeZhRow`、`detectCSVFormat`、`ParsedTransaction.externalId` |
| `backend/src/services/transaction.service.ts` | `importFromCSV` 防重擴充、`TransactionInput`/`createTransaction` 支援 `externalId` |
| `backend/src/routes/transactions.ts` | `format` 白名單加入新值（含 auto） |
| `src/components/transactions/ImportDialog.tsx` | 下拉加入新格式 + 自動偵測 |
| `src/services/transaction.api.ts` | `format` 型別放寬（字串即可，無需大改） |
| `backend/src/__tests__/*` | parser + import 防重 + golden 測試 |

## 10. 測試策略

- `parseCSV('…','schwab-zh')`：正常買/賣、負數量取絕對值、壞日期、壞價格、缺欄位。
- `parseCSV('…','firstrade-zh')`：已成交匯入、已取消跳過、`股數` 抽數字、`$`/逗號價格、`-` 成交價跳過、訂單號碼帶入 externalId。
- `detectCSVFormat`：四種格式表頭 + 無法辨識。
- `importFromCSV`：externalId 防重（重覆匯入第二次全 skip）、composite 防重不回歸、混合 success/skip/error 計數正確；英文既有格式回歸測試。
- Golden：以本案兩個真實檔為 fixture，斷言成功/跳過筆數與關鍵欄位值。
