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
