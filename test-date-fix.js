// Test date range calculation fix
console.log('=== 測試日期範圍計算修正 ===\n')

const now = new Date()
console.log('當前時間:', now.toISOString())
console.log('當前時間 (本地):', now.toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }))
console.log()

// 舊的實作（有時區問題）
function getDateRangeOld(period) {
  const endDate = now
  let startDate

  switch (period) {
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      break
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1)
      break
  }

  return { startDate, endDate }
}

// 新的實作（修正後，使用 UTC）
function getDateRangeNew(period) {
  const endDate = now
  let startDate

  switch (period) {
    case 'month':
      startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0))
      break
    case 'year':
      startDate = new Date(Date.UTC(now.getUTCFullYear(), 0, 1, 0, 0, 0, 0))
      break
  }

  return { startDate, endDate }
}

console.log('--- 本月 (舊實作) ---')
const oldMonth = getDateRangeOld('month')
console.log('開始:', oldMonth.startDate.toISOString())
console.log('結束:', oldMonth.endDate.toISOString())
console.log()

console.log('--- 本月 (新實作) ---')
const newMonth = getDateRangeNew('month')
console.log('開始:', newMonth.startDate.toISOString())
console.log('結束:', newMonth.endDate.toISOString())
console.log()

console.log('--- 本年 (舊實作) ---')
const oldYear = getDateRangeOld('year')
console.log('開始:', oldYear.startDate.toISOString())
console.log('結束:', oldYear.endDate.toISOString())
console.log()

console.log('--- 本年 (新實作) ---')
const newYear = getDateRangeNew('year')
console.log('開始:', newYear.startDate.toISOString())
console.log('結束:', newYear.endDate.toISOString())
console.log()

// 模擬一筆在 2025/12/31 的交易
const transaction = new Date('2025-12-31T10:00:00Z')
console.log('=== 測試交易篩選 ===')
console.log('交易日期:', transaction.toISOString())
console.log()

console.log('舊實作（本月）:')
console.log('  會包含此交易？', transaction >= oldMonth.startDate && transaction <= oldMonth.endDate)
console.log()

console.log('新實作（本月）:')
console.log('  會包含此交易？', transaction >= newMonth.startDate && transaction <= newMonth.endDate)
console.log()

console.log('舊實作（本年）:')
console.log('  會包含此交易？', transaction >= oldYear.startDate && transaction <= oldYear.endDate)
console.log()

console.log('新實作（本年）:')
console.log('  會包含此交易？', transaction >= newYear.startDate && transaction <= newYear.endDate)
