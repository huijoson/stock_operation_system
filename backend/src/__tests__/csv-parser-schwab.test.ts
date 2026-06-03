import { parseCSV, detectCSVFormat } from '../lib/csv/csv-parser'

// Real Charles Schwab "Transactions" export structure (quoted headers, $ prices,
// non-trade rows like Margin Interest).
const SCHWAB_EN = `"Date","Action","Symbol","Description","Quantity","Price","Fees & Comm","Amount"
"06/02/2026","Buy","TSLA","TESLA INC","20","$422.55","","-$8451.00"
"06/02/2026","Buy","NVDA","NVIDIA CORP","50","$227.40","","-$11370.00"
"05/28/2026","Margin Interest","","INTEREST 04/29THRU 05/27","","","","-$420.77"`

describe('parseCSV schwab (real Schwab transactions export)', () => {
  it('解析 $ 價格、跳過非交易列（Margin Interest），不報錯', () => {
    const { transactions, errors, skippedCount } = parseCSV(SCHWAB_EN, 'schwab')
    expect(errors).toHaveLength(0)
    expect(skippedCount).toBe(1) // Margin Interest
    expect(transactions).toHaveLength(2)

    expect(transactions[0]).toMatchObject({ symbol: 'TSLA', type: 'BUY' })
    expect(transactions[0].price.toString()).toBe('422.55')
    expect(transactions[0].quantity.toString()).toBe('20')
    // MM/DD/YYYY parsed as UTC (no off-by-one regardless of machine timezone)
    expect(transactions[0].date.toISOString()).toBe('2026-06-02T00:00:00.000Z')

    expect(transactions[1]).toMatchObject({ symbol: 'NVDA', type: 'BUY' })
    expect(transactions[1].price.toString()).toBe('227.4')
    expect(transactions[1].date.toISOString()).toBe('2026-06-02T00:00:00.000Z')
  })

  it('auto-detect 能辨識帶引號的英文 Schwab 表頭', () => {
    expect(detectCSVFormat(SCHWAB_EN)).toBe('schwab')
  })

  it('向後相容：簡化 schwab 格式（純數字、無 $）仍可解析', () => {
    const csv = 'Date,Action,Symbol,Quantity,Price\n2024-01-15,Buy,AAPL,10,150\n2024-01-16,Sell,AAPL,5,160'
    const { transactions, errors, skippedCount } = parseCSV(csv, 'schwab')
    expect(errors).toHaveLength(0)
    expect(skippedCount).toBe(0)
    expect(transactions).toHaveLength(2)
    expect(transactions[1]).toMatchObject({ symbol: 'AAPL', type: 'SELL' })
  })
})
