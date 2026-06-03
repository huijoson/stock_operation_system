# 中文券商 CSV 匯入（Schwab / Firstrade）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓使用者能上傳 Schwab 中文成交明細（`schwab-zh`）與 Firstrade 中文訂單狀態（`firstrade-zh`）CSV，對應欄位後寫入資料庫，並防止重複匯入。

**Architecture:** 沿用既有匯入管線（`ImportDialog` → `POST /transactions/import` → `importFromCSV` → `parseCSV`）。新增兩個 row parser 與表頭自動偵測；`Transaction` 加可空 `externalId` 唯一鍵作權威防重（Firstrade 用訂單號碼），Schwab 沿用既有 composite 防重。

**Tech Stack:** TypeScript、Express、Prisma 7 (PostgreSQL)、PapaParse、Decimal.js、Jest + ts-jest。

設計來源：`docs/superpowers/specs/2026-06-03-csv-broker-zh-import-design.md`

---

## File Structure

| 檔案 | 責任 | 動作 |
|---|---|---|
| `prisma/schema.prisma` | `Transaction.externalId` + 唯一鍵 | Modify |
| `backend/src/lib/csv/csv-parser.ts` | 型別擴充、兩個 zh parser、`detectCSVFormat`、解析輔助 | Modify |
| `backend/src/services/transaction.service.ts` | `TransactionInput.externalId`、`createTransaction` 寫入、`importFromCSV` 防重擴充 | Modify |
| `backend/src/routes/transactions.ts` | `/import` 接受新格式 + `auto` 偵測 | Modify |
| `src/components/transactions/ImportDialog.tsx` | 下拉加入新格式 + 自動偵測預設 | Modify |
| `backend/src/__tests__/csv-parser-zh.test.ts` | parser + detect 單元測試 | Create |
| `backend/src/__tests__/import-external-id.test.ts` | importFromCSV 防重測試 | Create |

> 約束：所有變更必須行為等價於既有 `schwab`/`firstrade` 英文格式（回歸不可破）。CWD 注意：後端指令需在 `backend/` 下執行（`cd backend && npx jest …`）。

---

## Task 1: Schema — 新增 `externalId` 欄位與唯一鍵

**Files:**
- Modify: `prisma/schema.prisma`（`model Transaction`，約行 60-74）

- [ ] **Step 1: 修改 schema** — 在 `Transaction` model 加入 `externalId` 與唯一鍵

把：

```prisma
model Transaction {
  id          String       @id @default(cuid())
  portfolioId String
  portfolio   Portfolio    @relation(fields: [portfolioId], references: [id], onDelete: Cascade)
  symbol      String
  type        String
  quantity    Decimal      @db.Decimal(18, 8)
  price       Decimal      @db.Decimal(18, 8)
  date        DateTime
  createdAt   DateTime     @default(now())
  taxLot      TaxLot?
  realizedPLs RealizedPL[]

  @@index([portfolioId, date])
}
```

改為（加入 `externalId` 欄位與 `@@unique`）：

```prisma
model Transaction {
  id          String       @id @default(cuid())
  portfolioId String
  portfolio   Portfolio    @relation(fields: [portfolioId], references: [id], onDelete: Cascade)
  symbol      String
  type        String
  quantity    Decimal      @db.Decimal(18, 8)
  price       Decimal      @db.Decimal(18, 8)
  date        DateTime
  externalId  String?
  createdAt   DateTime     @default(now())
  taxLot      TaxLot?
  realizedPLs RealizedPL[]

  @@unique([portfolioId, externalId])
  @@index([portfolioId, date])
}
```

- [ ] **Step 2: 重新產生 Prisma client（離線、不需 DB）**

Run: `npx prisma generate --no-hints`
Expected: 成功，`backend/src/generated/prisma` 的 `Transaction` 型別出現 `externalId: string | null`。

- [ ] **Step 3: 套用 migration（需要可連線的資料庫）**

Run: `npm run db:migrate`
Expected: 新增一個 migration（新增 `externalId` 欄位與唯一索引）。
備註：若當下無資料庫連線，先完成 Step 2 讓型別可用，Step 3 由具備 DB 的環境補跑；`prisma/migrations` 已被 gitignore，版控真實來源為 `schema.prisma`。

- [ ] **Step 4: 型別檢查**

Run: `cd backend && npx tsc --noEmit`
Expected: PASS（此時尚未使用 externalId，僅確認 schema 改動未破壞既有型別）。

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(db): Transaction 新增可空 externalId 與 (portfolioId, externalId) 唯一鍵"
```

---

## Task 2: csv-parser — 型別擴充 + Schwab-zh parser

**Files:**
- Modify: `backend/src/lib/csv/csv-parser.ts`
- Test: `backend/src/__tests__/csv-parser-zh.test.ts`

- [ ] **Step 1: 寫失敗測試** — 建立 `backend/src/__tests__/csv-parser-zh.test.ts`

```ts
import { parseCSV } from '../lib/csv/csv-parser'

const SCHWAB_ZH = `"日期","交易類別","數量","說明","代號","賬戶類別","價格","金額"
"2026/6/2","買進","15","Marvell Technology Inc.","MRVL","融資","285.202","-4,278.03"
"2026/6/2","賣出","-30","ServiceNow Inc.","NOW","融資","124.8496","3,745.41"`

describe('parseCSV schwab-zh', () => {
  it('解析買進/賣出、數量取絕對值、UTC 日期、無 externalId', () => {
    const { transactions, errors, skippedCount } = parseCSV(SCHWAB_ZH, 'schwab-zh')
    expect(errors).toHaveLength(0)
    expect(skippedCount).toBe(0)
    expect(transactions).toHaveLength(2)
    expect(transactions[0]).toMatchObject({ symbol: 'MRVL', type: 'BUY' })
    expect(transactions[0].quantity.toString()).toBe('15')
    expect(transactions[0].price.toString()).toBe('285.202')
    expect(transactions[0].date.toISOString()).toBe('2026-06-02T00:00:00.000Z')
    expect(transactions[0].externalId).toBeUndefined()
    expect(transactions[1]).toMatchObject({ symbol: 'NOW', type: 'SELL' })
    expect(transactions[1].quantity.toString()).toBe('30')
  })

  it('壞日期列計入 errors 不中斷', () => {
    const csv = `"日期","交易類別","數量","說明","代號","賬戶類別","價格","金額"
"bad","買進","1","X","AAA","融資","10","-10"`
    const { transactions, errors } = parseCSV(csv, 'schwab-zh')
    expect(transactions).toHaveLength(0)
    expect(errors).toHaveLength(1)
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `cd backend && npx jest csv-parser-zh -t "schwab-zh"`
Expected: FAIL（`schwab-zh` 非合法 format / `skippedCount` 不存在）。

- [ ] **Step 3: 擴充型別與輔助函式** — 編輯 `backend/src/lib/csv/csv-parser.ts`

3a. `ParsedTransaction` 加入可空 `externalId`：

```ts
export interface ParsedTransaction {
  date: Date
  symbol: string
  type: 'BUY' | 'SELL'
  quantity: Decimal
  price: Decimal
  externalId?: string
}
```

3b. `CSVParseResult` 加入 `skippedCount`：

```ts
export interface CSVParseResult {
  transactions: ParsedTransaction[]
  errors: Array<{ row: number; message: string }>
  skippedCount: number
}
```

3c. `CSVFormat` 擴充：

```ts
export type CSVFormat = 'schwab' | 'firstrade' | 'schwab-zh' | 'firstrade-zh'
```

3d. 在檔案內（既有 row parser 之後、`parseCSV` 之前）加入 UTC 日期輔助與 Schwab-zh parser：

```ts
/** 解析 YYYY/M/D 為 UTC 當日午夜，避免時區位移 */
function parseSlashDateUTC(s: string): Date | null {
  const m = String(s).trim().match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/)
  if (!m) return null
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
}

/**
 * Parse Schwab 中文成交明細
 * 表頭: 日期,交易類別,數量,說明,代號,賬戶類別,價格,金額
 */
function parseSchwabZhRow(row: any): ParsedTransaction | { error: string } {
  try {
    const dateStr = row['日期']
    const action = row['交易類別']
    const quantityStr = row['數量']
    const symbol = row['代號']
    const priceStr = row['價格']

    if (!dateStr || !action || quantityStr == null || quantityStr === '' || !symbol || !priceStr) {
      return { error: 'Missing required fields' }
    }

    const date = parseSlashDateUTC(dateStr)
    if (!date || isNaN(date.getTime())) {
      return { error: 'Invalid date format' }
    }

    const type = action === '買進' ? 'BUY' : action === '賣出' ? 'SELL' : null
    if (!type) {
      return { error: 'Invalid action type' }
    }

    const quantity = new Decimal(String(quantityStr).replace(/,/g, '')).abs()
    if (quantity.lessThanOrEqualTo(0) || quantity.isNaN()) {
      return { error: 'Invalid quantity' }
    }

    const price = new Decimal(String(priceStr).replace(/,/g, ''))
    if (price.lessThanOrEqualTo(0) || price.isNaN()) {
      return { error: 'Invalid price' }
    }

    return { date, symbol: String(symbol).trim(), type, quantity, price }
  } catch (error) {
    return { error: `Parse error: ${error instanceof Error ? error.message : 'Unknown error'}` }
  }
}
```

3e. 改寫 `parseCSV` 以支援新格式、skip 結果與 `skippedCount`：

```ts
export function parseCSV(csvContent: string, format: CSVFormat): CSVParseResult {
  const transactions: ParsedTransaction[] = []
  const errors: Array<{ row: number; message: string }> = []
  let skippedCount = 0

  const parseResult = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header: string) => header.trim(),
  })

  parseResult.data.forEach((row: any, index: number) => {
    const rowNumber = index + 2

    let result: ParsedTransaction | { error: string } | { skip: string }

    if (format === 'schwab') {
      result = parseSchwabRow(row, rowNumber)
    } else if (format === 'firstrade') {
      result = parseFirstradeRow(row, rowNumber)
    } else if (format === 'schwab-zh') {
      result = parseSchwabZhRow(row)
    } else {
      result = parseFirstradeZhRow(row)
    }

    if ('error' in result) {
      errors.push({ row: rowNumber, message: result.error })
    } else if ('skip' in result) {
      skippedCount++
    } else {
      transactions.push(result)
    }
  })

  return { transactions, errors, skippedCount }
}
```

> 註：`parseFirstradeZhRow` 在 Task 3 實作；本步驟先讓 `parseCSV` 引用它會造成型別錯誤，故 Task 2 先以暫時 stub 補上，Task 3 再填實作。請在 3d 之後加入下方 stub：
>
> ```ts
> function parseFirstradeZhRow(row: any): ParsedTransaction | { error: string } | { skip: string } {
>   return { error: 'not implemented' }
> }
> ```

- [ ] **Step 4: 跑測試確認通過**

Run: `cd backend && npx jest csv-parser-zh -t "schwab-zh"`
Expected: PASS（兩個 schwab-zh 測試）。

- [ ] **Step 5: Commit**

```bash
git add backend/src/lib/csv/csv-parser.ts backend/src/__tests__/csv-parser-zh.test.ts
git commit -m "feat(csv): 新增 schwab-zh parser、ParsedTransaction.externalId、parseCSV skippedCount"
```

---

## Task 3: csv-parser — Firstrade-zh parser

**Files:**
- Modify: `backend/src/lib/csv/csv-parser.ts`（以實作取代 Task 2 的 stub）
- Test: `backend/src/__tests__/csv-parser-zh.test.ts`

- [ ] **Step 1: 寫失敗測試** — 在 `csv-parser-zh.test.ts` 追加

```ts
const FIRSTRADE_ZH = `代號,策略名稱,證券名稱,狀態,行動,數量|面值,價格,時間限制,成交價格,成交價是平均值,時間和日期（美東時間）,最新活動(美東時間),資本利得再投資,訂單號碼
TSLA,,TESLA INC,已成交,買入,20 股數,市價,當天,$422.55,否,1:00 PM 06/02/2026,1:00 PM 06/02/2026,,1006575884073
NVDA,,NVIDIA CORP,已取消,買入,50 股數,限價 $228.00,GTC,-,否,7:57 AM 06/02/2026,8:04 AM 06/02/2026,,1006563842083`

describe('parseCSV firstrade-zh', () => {
  it('匯入已成交、跳過已取消、解析數量/價格/日期/訂單號碼', () => {
    const { transactions, errors, skippedCount } = parseCSV(FIRSTRADE_ZH, 'firstrade-zh')
    expect(errors).toHaveLength(0)
    expect(skippedCount).toBe(1)
    expect(transactions).toHaveLength(1)
    expect(transactions[0]).toMatchObject({
      symbol: 'TSLA',
      type: 'BUY',
      externalId: '1006575884073',
    })
    expect(transactions[0].quantity.toString()).toBe('20')
    expect(transactions[0].price.toString()).toBe('422.55')
    expect(transactions[0].date.toISOString()).toBe('2026-06-02T00:00:00.000Z')
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `cd backend && npx jest csv-parser-zh -t "firstrade-zh"`
Expected: FAIL（stub 回傳 not implemented → transactions 為空）。

- [ ] **Step 3: 以實作取代 stub** — 將 Task 2 的 `parseFirstradeZhRow` stub 換成：

```ts
/** 解析 "1:00 PM 06/02/2026" 中的 MM/DD/YYYY 為 UTC 當日（不做時區換算，僅取日） */
function parseFirstradeDateTimeUTC(s: string): Date | null {
  const m = String(s).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (!m) return null
  return new Date(Date.UTC(Number(m[3]), Number(m[1]) - 1, Number(m[2])))
}

/**
 * Parse Firstrade 中文訂單狀態
 * 表頭: 代號,策略名稱,證券名稱,狀態,行動,數量|面值,價格,時間限制,成交價格,
 *       成交價是平均值,時間和日期（美東時間）,最新活動(美東時間),資本利得再投資,訂單號碼
 * 僅匯入「已成交」；其餘狀態與無成交價者視為 skip。
 */
function parseFirstradeZhRow(row: any): ParsedTransaction | { error: string } | { skip: string } {
  try {
    const status = row['狀態']
    if (status !== '已成交') {
      return { skip: `status=${status ?? 'unknown'}` }
    }

    const symbol = row['代號']
    const action = row['行動']
    const qtyRaw = row['數量|面值']
    const execPrice = row['成交價格']
    const dateTime = row['時間和日期（美東時間）']

    if (!symbol || !action || !qtyRaw || !dateTime) {
      return { error: 'Missing required fields' }
    }

    const type = action === '買入' ? 'BUY' : action === '賣出' ? 'SELL' : null
    if (!type) {
      return { error: 'Invalid action type' }
    }

    const qtyMatch = String(qtyRaw).match(/[\d.,]+/)
    if (!qtyMatch) {
      return { error: 'Invalid quantity' }
    }
    const quantity = new Decimal(qtyMatch[0].replace(/,/g, '')).abs()
    if (quantity.lessThanOrEqualTo(0) || quantity.isNaN()) {
      return { error: 'Invalid quantity' }
    }

    const priceClean = String(execPrice ?? '').replace(/[$,\s]/g, '')
    if (!priceClean || priceClean === '-') {
      return { skip: 'no execution price' }
    }
    const price = new Decimal(priceClean)
    if (price.lessThanOrEqualTo(0) || price.isNaN()) {
      return { error: 'Invalid price' }
    }

    const date = parseFirstradeDateTimeUTC(dateTime)
    if (!date || isNaN(date.getTime())) {
      return { error: 'Invalid date format' }
    }

    const orderId = row['訂單號碼'] ? String(row['訂單號碼']).trim() : undefined

    return { date, symbol: String(symbol).trim(), type, quantity, price, externalId: orderId }
  } catch (error) {
    return { error: `Parse error: ${error instanceof Error ? error.message : 'Unknown error'}` }
  }
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `cd backend && npx jest csv-parser-zh`
Expected: PASS（schwab-zh 與 firstrade-zh 全部）。

- [ ] **Step 5: Commit**

```bash
git add backend/src/lib/csv/csv-parser.ts backend/src/__tests__/csv-parser-zh.test.ts
git commit -m "feat(csv): 新增 firstrade-zh parser（已成交過濾、訂單號碼為 externalId）"
```

---

## Task 4: csv-parser — `detectCSVFormat` 表頭自動偵測

**Files:**
- Modify: `backend/src/lib/csv/csv-parser.ts`
- Test: `backend/src/__tests__/csv-parser-zh.test.ts`

- [ ] **Step 1: 寫失敗測試** — 在 `csv-parser-zh.test.ts` 追加（檔頭加入 import）

把第一行 import 改為：

```ts
import { parseCSV, detectCSVFormat } from '../lib/csv/csv-parser'
```

追加：

```ts
describe('detectCSVFormat', () => {
  it('依中文表頭偵測 zh 格式', () => {
    expect(detectCSVFormat(SCHWAB_ZH)).toBe('schwab-zh')
    expect(detectCSVFormat(FIRSTRADE_ZH)).toBe('firstrade-zh')
  })

  it('依英文表頭欄位順序偵測 schwab/firstrade', () => {
    expect(detectCSVFormat('Date,Action,Symbol,Quantity,Price\n2024-01-15,Buy,AAPL,1,1')).toBe('schwab')
    expect(detectCSVFormat('Date,Symbol,Action,Quantity,Price\n01/15/2024,AAPL,Bought,1,1')).toBe('firstrade')
  })

  it('無法辨識回傳 null', () => {
    expect(detectCSVFormat('foo,bar\n1,2')).toBeNull()
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `cd backend && npx jest csv-parser-zh -t "detectCSVFormat"`
Expected: FAIL（`detectCSVFormat` 未匯出）。

- [ ] **Step 3: 實作** — 在 `csv-parser.ts` 末端加入

```ts
/** 依 CSV 表頭自動偵測格式；無法判斷回傳 null */
export function detectCSVFormat(csvContent: string): CSVFormat | null {
  const firstLine = (csvContent.split(/\r?\n/)[0] || '')
  if (firstLine.includes('訂單號碼') && firstLine.includes('狀態')) return 'firstrade-zh'
  if (firstLine.includes('交易類別') && firstLine.includes('賬戶類別')) return 'schwab-zh'

  const cols = firstLine.split(',').map((c) => c.trim().toLowerCase())
  const actionIdx = cols.indexOf('action')
  const symbolIdx = cols.indexOf('symbol')
  if (actionIdx !== -1 && symbolIdx !== -1) {
    return actionIdx < symbolIdx ? 'schwab' : 'firstrade'
  }
  return null
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `cd backend && npx jest csv-parser-zh`
Expected: PASS（全部）。

- [ ] **Step 5: Commit**

```bash
git add backend/src/lib/csv/csv-parser.ts backend/src/__tests__/csv-parser-zh.test.ts
git commit -m "feat(csv): 新增 detectCSVFormat 表頭自動偵測"
```

---

## Task 5: importFromCSV — externalId 防重 + 寫入 + 解析層 skipped

**Files:**
- Modify: `backend/src/services/transaction.service.ts`
- Test: `backend/src/__tests__/import-external-id.test.ts`

- [ ] **Step 1: 寫失敗測試** — 建立 `backend/src/__tests__/import-external-id.test.ts`

```ts
import Decimal from 'decimal.js'

jest.mock('../lib/prisma', () => ({}))

import { TransactionService } from '../services/transaction.service'
import { PrismaClient } from '../lib/prisma-client'

jest.mock('../services/tax-lot.service', () => ({
  TaxLotService: jest.fn().mockImplementation(() => ({
    createFromTransaction: jest.fn().mockResolvedValue(undefined),
    backfillForSymbol: jest.fn().mockResolvedValue(undefined),
  })),
}))

jest.mock('../services/realized-pl.service', () => ({
  RealizedPLService: jest.fn().mockImplementation(() => ({
    calculateRealizedPL: jest.fn().mockResolvedValue(undefined),
  })),
}))

const FIRSTRADE_ZH = `代號,策略名稱,證券名稱,狀態,行動,數量|面值,價格,時間限制,成交價格,成交價是平均值,時間和日期（美東時間）,最新活動(美東時間),資本利得再投資,訂單號碼
TSLA,,TESLA INC,已成交,買入,20 股數,市價,當天,$422.55,否,1:00 PM 06/02/2026,1:00 PM 06/02/2026,,1006575884073`

function makePrisma(existing: any[]) {
  const prisma = new PrismaClient() as any
  prisma.holding = {
    findUnique: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({}),
    update: jest.fn().mockResolvedValue({}),
    delete: jest.fn().mockResolvedValue({}),
  }
  prisma.transaction = {
    findMany: jest.fn().mockResolvedValue(existing),
    create: jest.fn().mockResolvedValue({ id: 'tx-new', symbol: 'TSLA', type: 'BUY' }),
  }
  return prisma
}

describe('importFromCSV externalId 防重', () => {
  beforeEach(() => jest.clearAllMocks())

  it('externalId 已存在 → 跳過、不建立', async () => {
    const existing = [{
      id: 'x', symbol: 'TSLA', type: 'BUY',
      quantity: '20.00000000', price: '422.55000000',
      date: new Date('2026-06-02T00:00:00.000Z'), externalId: '1006575884073',
    }]
    const prisma = makePrisma(existing)
    const result = await new TransactionService(prisma).importFromCSV('p-1', FIRSTRADE_ZH, 'firstrade-zh')
    expect(result.successCount).toBe(0)
    expect(result.skippedCount).toBe(1)
    expect(prisma.transaction.create).not.toHaveBeenCalled()
  })

  it('externalId 為新 → 建立並寫入 externalId', async () => {
    const prisma = makePrisma([])
    const result = await new TransactionService(prisma).importFromCSV('p-1', FIRSTRADE_ZH, 'firstrade-zh')
    expect(result.successCount).toBe(1)
    expect(prisma.transaction.create).toHaveBeenCalledTimes(1)
    const createArg = prisma.transaction.create.mock.calls[0][0]
    expect(createArg.data.externalId).toBe('1006575884073')
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `cd backend && npx jest import-external-id`
Expected: FAIL（externalId 尚未被寫入/比對）。

- [ ] **Step 3a: `TransactionInput` 加入 externalId** — `transaction.service.ts` 行 11-18

```ts
export interface TransactionInput {
  portfolioId: string
  symbol: string
  type: 'BUY' | 'SELL'
  quantity: Decimal
  price: Decimal
  date: Date
  externalId?: string
}
```

- [ ] **Step 3b: `createTransaction` 解構並寫入 externalId**

行 85 解構改為：

```ts
    const { portfolioId, symbol, type, quantity, price, date, externalId } = transaction
```

BUY 的 `transaction.create`（約行 134-143）`data` 內 `date,` 之後加入 `externalId,`：

```ts
      const createdTransaction = await this.prisma.transaction.create({
        data: {
          portfolioId,
          symbol,
          type,
          quantity: quantity.toFixed(8),
          price: price.toFixed(8),
          date,
          externalId,
        },
      })
```

SELL 的 `transaction.create`（約行 197-206）同樣在 `date,` 之後加入 `externalId,`：

```ts
      const createdTransaction = await this.prisma.transaction.create({
        data: {
          portfolioId,
          symbol,
          type,
          quantity: quantity.toFixed(8),
          price: price.toFixed(8),
          date,
          externalId,
        },
      })
```

- [ ] **Step 3c: `importFromCSV` 防重邏輯擴充**（約行 491-543）

把開頭解構與計數改為（採用解析層 skipped 起始值）：

```ts
    const { transactions: parsedTransactions, errors: parseErrors, skippedCount: parseSkipped } =
      parseCSV(csvContent, format)

    let successCount = 0
    let skippedCount = parseSkipped
    const errors: Array<{ row: number; message: string }> = [...parseErrors]
    const seenExternalIds = new Set<string>()
```

把迴圈內的重複判斷（`const isDuplicate = …` 區塊）改為：

```ts
        let isDuplicate: boolean
        if (parsedTx.externalId) {
          if (seenExternalIds.has(parsedTx.externalId)) {
            isDuplicate = true
          } else {
            isDuplicate = existingTransactions.some(
              (existing) => existing.externalId === parsedTx.externalId
            )
          }
          seenExternalIds.add(parsedTx.externalId)
        } else {
          isDuplicate = existingTransactions.some((existing) => {
            const existingQty = new Decimal(existing.quantity.toString())
            const existingPrice = new Decimal(existing.price.toString())
            return (
              existing.symbol === parsedTx.symbol &&
              existing.type === parsedTx.type &&
              existingQty.equals(parsedTx.quantity) &&
              existingPrice.equals(parsedTx.price) &&
              existing.date.toISOString().split('T')[0] ===
                parsedTx.date.toISOString().split('T')[0]
            )
          })
        }
```

把建立交易處（`await this.createTransaction({…})`）改為帶入 externalId：

```ts
        await this.createTransaction({
          portfolioId,
          symbol: parsedTx.symbol,
          type: parsedTx.type,
          quantity: parsedTx.quantity,
          price: parsedTx.price,
          date: parsedTx.date,
          externalId: parsedTx.externalId,
        })
```

> `existing.externalId` 需要 Prisma `Transaction` 型別已含 externalId（Task 1 Step 2 已 generate）。

- [ ] **Step 4: 跑測試確認通過**

Run: `cd backend && npx jest import-external-id`
Expected: PASS（兩個測試）。

- [ ] **Step 5: 回歸 — 既有 import 與 bulk 測試仍綠**

Run: `cd backend && npx jest transactions-bulk`
Expected: PASS（既有行為未破壞）。

- [ ] **Step 6: Commit**

```bash
git add backend/src/services/transaction.service.ts backend/src/__tests__/import-external-id.test.ts
git commit -m "feat(import): externalId 權威防重 + 寫入 + 解析層 skipped 計數"
```

---

## Task 6: route — `/import` 接受新格式與 `auto` 偵測

**Files:**
- Modify: `backend/src/routes/transactions.ts`（行 235-265 的 `/import` handler）

- [ ] **Step 1: 加入 import** — 確保檔頭從 `../services/...` 之外也引入偵測函式

在現有 import 區加入：

```ts
import { detectCSVFormat, CSVFormat } from '../lib/csv/csv-parser'
```

- [ ] **Step 2: 改寫 `/import` handler**（先讀內容、再解析格式、支援 auto 與四種格式）

```ts
router.post('/import', async (req: Request, res: Response) => {
  try {
    const file = req.body?.file as { text: () => Promise<string> } | string | undefined
    const portfolioId = req.body?.portfolioId as string
    const requestedFormat = (req.body?.format as string) || 'auto'

    if (!file) {
      return res.status(400).json({ error: 'No file provided' })
    }

    if (!portfolioId) {
      return res.status(400).json({ error: 'Portfolio ID is required' })
    }

    const csvContent = typeof file === 'string' ? file : await file.text()

    const validFormats: CSVFormat[] = ['schwab', 'firstrade', 'schwab-zh', 'firstrade-zh']
    let format: CSVFormat
    if (requestedFormat === 'auto') {
      const detected = detectCSVFormat(csvContent)
      if (!detected) {
        return res.status(400).json({ error: 'Unable to auto-detect CSV format' })
      }
      format = detected
    } else if (validFormats.includes(requestedFormat as CSVFormat)) {
      format = requestedFormat as CSVFormat
    } else {
      return res.status(400).json({ error: 'Invalid format' })
    }

    const transactionService = new TransactionService(prisma)
    const result = await transactionService.importFromCSV(portfolioId, csvContent, format)

    return res.status(200).json(result)
  } catch (error: unknown) {
    console.error('CSV import error:', error)
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to import CSV',
    })
  }
})
```

- [ ] **Step 3: 後端型別檢查**

Run: `cd backend && npx tsc --noEmit`
Expected: PASS。

> 說明：`/import` 既有上傳 plumbing（`req.body.file` vs multipart）為既有問題，不在本案修復範圍；本 handler 對「字串 file」可運作，故 Task 8 的手動驗證以字串內容或修好 plumbing 後驗證。

- [ ] **Step 4: Commit**

```bash
git add backend/src/routes/transactions.ts
git commit -m "feat(import): /import 支援 schwab-zh/firstrade-zh 與 auto 表頭偵測"
```

---

## Task 7: ImportDialog — 下拉加入新格式與自動偵測

**Files:**
- Modify: `src/components/transactions/ImportDialog.tsx`

- [ ] **Step 1: 放寬 format 狀態型別並預設 auto**（行 12）

```tsx
  const [format, setFormat] = useState<
    'auto' | 'schwab' | 'firstrade' | 'schwab-zh' | 'firstrade-zh'
  >('auto')
```

- [ ] **Step 2: 更新下拉 onChange 型別與選項**（行 82-90）

```tsx
            <select
              value={format}
              onChange={(e) =>
                setFormat(
                  e.target.value as
                    | 'auto'
                    | 'schwab'
                    | 'firstrade'
                    | 'schwab-zh'
                    | 'firstrade-zh'
                )
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            >
              <option value="auto">自動偵測</option>
              <option value="schwab">Schwab (English)</option>
              <option value="firstrade">Firstrade (English)</option>
              <option value="schwab-zh">Schwab 中文成交明細</option>
              <option value="firstrade-zh">Firstrade 中文訂單狀態</option>
            </select>
```

- [ ] **Step 3: 前端型別檢查**

Run: `npm run type-check`
Expected: PASS。

- [ ] **Step 4: Commit**

```bash
git add src/components/transactions/ImportDialog.tsx
git commit -m "feat(ui): ImportDialog 加入中文券商格式與自動偵測"
```

---

## Task 8: 最終驗證

- [ ] **Step 1: 後端淨新增測試全綠**

Run: `cd backend && npx jest csv-parser-zh import-external-id transactions-bulk`
Expected: 全 PASS。

- [ ] **Step 2: 前後端型別檢查**

Run: `npm run type-check`
然後：`cd backend && npx tsc --noEmit`
Expected: 皆 PASS。

- [ ] **Step 3:（可選，需 DB）以真實檔手動驗證**

用你的兩個真實檔內容，呼叫 `TransactionService.importFromCSV(portfolioId, content, 'auto'→偵測)` 或經 UI 上傳，確認成功/跳過筆數（已取消列計入 skipped）。
備註：若 UI 上傳走不到（plumbing 既有問題），可改以字串內容測試或先行修復 plumbing（另案）。

- [ ] **Step 4: 完成分支**

依 `superpowers:finishing-a-development-branch` 決定 merge / PR。

---

## Self-Review 對照（spec → task）

- schwab-zh 欄位對應 → Task 2 ✓
- firstrade-zh 欄位對應（已成交過濾、股數抽數字、$ 價格、訂單號碼）→ Task 3 ✓
- 自動偵測 → Task 4 + Task 6 + Task 7 ✓
- externalId schema + 唯一鍵 → Task 1 ✓
- externalId 防重 / composite 防重不回歸 / 解析層 skipped → Task 5 ✓
- 錯誤處理（壞列 error 不中斷、取消列 skip）→ Task 2/3 測試 ✓
- 既有風險（上傳 plumbing）→ Task 6/8 已標註，明確排除於本案 ✓
- 測試（parser/detect/import/回歸）→ Task 2-5、8 ✓
