const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function queryTSM() {
  try {
    // 查詢TSM交易記錄
    const tsmTransactions = await prisma.transaction.findMany({
      where: { 
        symbol: {
          equals: 'TSM',
          mode: 'insensitive'
        }
      },
      orderBy: { date: 'desc' },
      include: { 
        portfolio: { 
          select: { name: true } 
        } 
      }
    });
    
    console.log('=== TSM 股票購買記錄 ===\n');
    
    if (tsmTransactions.length === 0) {
      console.log('未找到 TSM 的交易記錄');
    } else {
      // 分類買入和賣出
      const buyTransactions = tsmTransactions.filter(tx => tx.type === 'BUY');
      const sellTransactions = tsmTransactions.filter(tx => tx.type === 'SELL');
      
      console.log(`總共 ${tsmTransactions.length} 筆交易記錄 (買入: ${buyTransactions.length}, 賣出: ${sellTransactions.length})\n`);
      
      console.log('買入記錄:');
      console.log('─'.repeat(80));
      buyTransactions.forEach((tx, index) => {
        const date = new Date(tx.date).toLocaleDateString('zh-TW');
        const quantity = parseFloat(tx.quantity).toFixed(2);
        const price = parseFloat(tx.price).toFixed(2);
        const total = (parseFloat(tx.quantity) * parseFloat(tx.price)).toFixed(2);
        console.log(`${index + 1}. 日期: ${date}`);
        console.log(`   投資組合: ${tx.portfolio.name}`);
        console.log(`   數量: ${quantity} 股`);
        console.log(`   價格: $${price}`);
        console.log(`   總金額: $${total}`);
        console.log('');
      });
      
      if (sellTransactions.length > 0) {
        console.log('\n賣出記錄:');
        console.log('─'.repeat(80));
        sellTransactions.forEach((tx, index) => {
          const date = new Date(tx.date).toLocaleDateString('zh-TW');
          const quantity = parseFloat(tx.quantity).toFixed(2);
          const price = parseFloat(tx.price).toFixed(2);
          const total = (parseFloat(tx.quantity) * parseFloat(tx.price)).toFixed(2);
          console.log(`${index + 1}. 日期: ${date}`);
          console.log(`   投資組合: ${tx.portfolio.name}`);
          console.log(`   數量: ${quantity} 股`);
          console.log(`   價格: $${price}`);
          console.log(`   總金額: $${total}`);
          console.log('');
        });
      }
      
      // 查詢當前持股
      const currentHolding = await prisma.holding.findFirst({
        where: {
          symbol: {
            equals: 'TSM',
            mode: 'insensitive'
          }
        },
        include: {
          portfolio: {
            select: { name: true }
          }
        }
      });
      
      if (currentHolding) {
        console.log('\n當前持股:');
        console.log('─'.repeat(80));
        console.log(`投資組合: ${currentHolding.portfolio.name}`);
        console.log(`持有數量: ${parseFloat(currentHolding.quantity).toFixed(2)} 股`);
        console.log(`平均成本: $${parseFloat(currentHolding.averageCost).toFixed(2)}`);
        console.log(`總成本: $${(parseFloat(currentHolding.quantity) * parseFloat(currentHolding.averageCost)).toFixed(2)}`);
      }
    }
    
  } catch (error) {
    console.error('查詢錯誤:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

queryTSM();
