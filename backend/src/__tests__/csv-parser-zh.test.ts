import { parseCSV, detectCSVFormat } from '../lib/csv/csv-parser'

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
