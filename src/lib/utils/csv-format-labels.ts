/** 將 CSV 匯入格式代碼轉成顯示用的友善標籤 */
export function csvFormatLabel(format: string): string {
  switch (format) {
    case 'schwab':
      return 'Schwab (English)'
    case 'firstrade':
      return 'Firstrade (English)'
    case 'schwab-zh':
      return 'Schwab 中文成交明細'
    case 'firstrade-zh':
      return 'Firstrade 中文訂單狀態'
    default:
      return format
  }
}
