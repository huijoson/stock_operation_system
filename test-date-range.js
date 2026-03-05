// Test date range calculation
function getDateRange(period) {
  const now = new Date()
  const endDate = now

  let startDate

  switch (period) {
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      break
    case 'quarter':
      const currentQuarter = Math.floor(now.getMonth() / 3)
      startDate = new Date(now.getFullYear(), currentQuarter * 3, 1)
      break
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1)
      break
    case 'all':
    default:
      startDate = new Date(2000, 0, 1)
      break
  }

  return { startDate, endDate }
}

console.log('Current date:', new Date().toISOString())
console.log('\nMonth:', getDateRange('month'))
console.log('\nQuarter:', getDateRange('quarter'))
console.log('\nYear:', getDateRange('year'))
console.log('\nAll:', getDateRange('all'))
