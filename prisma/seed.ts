import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Taiwan stock data for seeding
 * Includes popular stocks from various industries
 */
const taiwanStocks = [
  // 半導體產業
  { symbol: '2330', name: '台積電', industry: '半導體' },
  { symbol: '2454', name: '聯發科', industry: '半導體' },
  { symbol: '2379', name: '瑞昱', industry: '半導體' },
  { symbol: '3034', name: '聯詠', industry: '半導體' },
  { symbol: '2408', name: '南亞科', industry: '半導體' },
  
  // 電子產業
  { symbol: '2317', name: '鴻海', industry: '電子' },
  { symbol: '2382', name: '廣達', industry: '電子' },
  { symbol: '2357', name: '華碩', industry: '電子' },
  { symbol: '2353', name: '宏碁', industry: '電子' },
  { symbol: '3231', name: '緯創', industry: '電子' },
  
  // 通訊產業
  { symbol: '2412', name: '中華電', industry: '通訊' },
  { symbol: '4904', name: '遠傳', industry: '通訊' },
  { symbol: '4938', name: '和碩', industry: '通訊' },
  
  // 金融產業
  { symbol: '2881', name: '富邦金', industry: '金融' },
  { symbol: '2882', name: '國泰金', industry: '金融' },
  { symbol: '2886', name: '兆豐金', industry: '金融' },
  { symbol: '2891', name: '中信金', industry: '金融' },
  { symbol: '2884', name: '玉山金', industry: '金融' },
  
  // 電力產業
  { symbol: '2308', name: '台達電', industry: '電力' },
  { symbol: '1301', name: '台塑', industry: '塑膠' },
  { symbol: '1303', name: '南亞', industry: '塑膠' },
  
  // 食品產業
  { symbol: '1216', name: '統一', industry: '食品' },
  
  // 航運產業
  { symbol: '2603', name: '長榮', industry: '航運' },
  { symbol: '2609', name: '陽明', industry: '航運' },
  
  // 鋼鐵產業
  { symbol: '2002', name: '中鋼', industry: '鋼鐵' },
  
  // 汽車產業
  { symbol: '2201', name: '裕隆', industry: '汽車' },
  { symbol: '2207', name: '和泰車', industry: '汽車' },
  
  // 觀光產業
  { symbol: '2712', name: '遠雄來', industry: '觀光' },
]

/**
 * US stock data for seeding
 */
const usStocks = [
  { symbol: 'AAPL', name: 'Apple Inc.', industry: '科技' },
  { symbol: 'MSFT', name: 'Microsoft Corp.', industry: '科技' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', industry: '科技' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', industry: '電商' },
  { symbol: 'TSLA', name: 'Tesla Inc.', industry: '汽車' },
  { symbol: 'META', name: 'Meta Platforms Inc.', industry: '科技' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', industry: '半導體' },
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.', industry: '金融' },
  { symbol: 'V', name: 'Visa Inc.', industry: '金融' },
  { symbol: 'WMT', name: 'Walmart Inc.', industry: '零售' },
]

async function main() {
  console.log('開始填充股票資料...')

  // Clear existing stock data
  await prisma.stock.deleteMany({})
  console.log('已清除現有股票資料')

  // Seed Taiwan stocks
  for (const stock of taiwanStocks) {
    await prisma.stock.create({
      data: stock,
    })
  }
  console.log(`已新增 ${taiwanStocks.length} 筆台股資料`)

  // Seed US stocks
  for (const stock of usStocks) {
    await prisma.stock.create({
      data: stock,
    })
  }
  console.log(`已新增 ${usStocks.length} 筆美股資料`)

  // Seed NewsSourceRating data
  console.log('開始填充新聞來源評等資料...')
  const newsSources = [
    { sourceName: 'SEC', credibilityLevel: 'official', description: 'U.S. Securities and Exchange Commission' },
    { sourceName: 'BusinessWire', credibilityLevel: 'official', description: 'Official press releases' },
    { sourceName: 'PR Newswire', credibilityLevel: 'official', description: 'Official press releases' },
    { sourceName: 'Reuters', credibilityLevel: 'mainstream', description: 'International news agency' },
    { sourceName: 'Bloomberg', credibilityLevel: 'mainstream', description: 'Financial news and data' },
    { sourceName: 'CNBC', credibilityLevel: 'mainstream', description: 'Business news network' },
    { sourceName: 'Wall Street Journal', credibilityLevel: 'mainstream', description: 'Financial newspaper' },
    { sourceName: 'MarketWatch', credibilityLevel: 'mainstream', description: 'Financial information website' },
    { sourceName: 'Financial Times', credibilityLevel: 'mainstream', description: 'International business newspaper' },
  ]

  for (const source of newsSources) {
    await prisma.newsSourceRating.upsert({
      where: { sourceName: source.sourceName },
      update: source,
      create: source,
    })
  }
  console.log(`已新增 ${newsSources.length} 筆新聞來源評等資料`)

  console.log('股票資料填充完成！')
}

main()
  .catch((e) => {
    console.error('填充資料時發生錯誤:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
