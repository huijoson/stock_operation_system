import { parseCSV, detectCSVFormat } from '../lib/csv/csv-parser'

// Representative multi-row samples that mirror the real broker export structures.
// (Sample data — not real account data.)

const SCHWAB_ZH_GOLDEN = `"日期","交易類別","數量","說明","代號","賬戶類別","價格","金額"
"2026/6/2","買進","15","Marvell Technology Inc.","MRVL","融資","285.202","-4,278.03"
"2026/6/2","賣出","-30","ServiceNow Inc.","NOW","融資","124.8496","3,745.41"
"2026/6/2","買進","150","Nokia Corporation","NOK","融資","16.6469","-2,497.04"
"2026/6/2","賣出","-30","Microsoft Corporation","MSFT","融資","443.2289","13,296.60"
"2026/6/2","買進","25","Alphabet Inc.","GOOGL","融資","368.65","-9,216.25"`

const FIRSTRADE_ZH_GOLDEN = `代號,策略名稱,證券名稱,狀態,行動,數量|面值,價格,時間限制,成交價格,成交價是平均值,時間和日期（美東時間）,最新活動(美東時間),資本利得再投資,訂單號碼
TSLA,,TESLA INC,已成交,買入,20 股數,市價,當天,$422.55,否,1:00 PM 06/02/2026,1:00 PM 06/02/2026,,1006575884073
NVDA,,NVIDIA CORP,已成交,買入,50 股數,限價 $228.00,GTC + 延長時段,$227.40,否,8:04 AM 06/02/2026,8:04 AM 06/02/2026,,1006563842257
NVDA,,NVIDIA CORP,已取消,買入,50 股數,限價 $228.00,GTC,-,否,7:57 AM 06/02/2026,8:04 AM 06/02/2026,,1006563842083`

describe('CSV import golden — schwab-zh', () => {
  it('auto-detect + 解析 5 列成交（買/賣）、賣出數量取絕對值', () => {
    expect(detectCSVFormat(SCHWAB_ZH_GOLDEN)).toBe('schwab-zh')

    const { transactions, errors, skippedCount } = parseCSV(SCHWAB_ZH_GOLDEN, 'schwab-zh')
    expect(errors).toHaveLength(0)
    expect(skippedCount).toBe(0)
    expect(transactions).toHaveLength(5)

    const buys = transactions.filter((t) => t.type === 'BUY')
    const sells = transactions.filter((t) => t.type === 'SELL')
    expect(buys).toHaveLength(3)
    expect(sells).toHaveLength(2)

    const now = transactions.find((t) => t.symbol === 'NOW')!
    expect(now.type).toBe('SELL')
    expect(now.quantity.toString()).toBe('30')
    expect(now.externalId).toBeUndefined()
  })
})

describe('CSV import golden — firstrade-zh', () => {
  it('auto-detect + 匯入 2 筆已成交、跳過 1 筆已取消、帶入訂單號碼', () => {
    expect(detectCSVFormat(FIRSTRADE_ZH_GOLDEN)).toBe('firstrade-zh')

    const { transactions, errors, skippedCount } = parseCSV(FIRSTRADE_ZH_GOLDEN, 'firstrade-zh')
    expect(errors).toHaveLength(0)
    expect(skippedCount).toBe(1)
    expect(transactions).toHaveLength(2)

    expect(transactions.map((t) => t.externalId).sort()).toEqual([
      '1006563842257',
      '1006575884073',
    ])

    const tsla = transactions.find((t) => t.symbol === 'TSLA')!
    expect(tsla.type).toBe('BUY')
    expect(tsla.quantity.toString()).toBe('20')
    expect(tsla.price.toString()).toBe('422.55')
  })
})
