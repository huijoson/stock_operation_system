import { csvFormatLabel } from './csv-format-labels'

describe('csvFormatLabel', () => {
  it('回傳各格式的友善標籤', () => {
    expect(csvFormatLabel('schwab')).toBe('Schwab (English)')
    expect(csvFormatLabel('firstrade')).toBe('Firstrade (English)')
    expect(csvFormatLabel('schwab-zh')).toBe('Schwab 中文成交明細')
    expect(csvFormatLabel('firstrade-zh')).toBe('Firstrade 中文訂單狀態')
  })

  it('未知格式回傳原字串', () => {
    expect(csvFormatLabel('something')).toBe('something')
  })
})
