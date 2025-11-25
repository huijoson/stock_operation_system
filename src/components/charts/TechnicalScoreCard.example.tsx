'use client'

import TechnicalScoreCard, { TechnicalScoreData, ScoreHistory } from './TechnicalScoreCard'

/**
 * TechnicalScoreCard 元件使用範例
 * 
 * 此檔案展示如何使用 TechnicalScoreCard 元件來顯示股票的綜合技術評分
 */

// 範例 1: 強勢看多 (評分 > 70)
const strongBuyScore: TechnicalScoreData = {
  totalScore: 78.5,
  rating: 'strong_buy',
  components: {
    rsi: { score: 80, weight: 0.3, contribution: 24.0 },
    macd: { score: 85, weight: 0.3, contribution: 25.5 },
    bollinger: { score: 75, weight: 0.2, contribution: 15.0 },
    fibonacci: { score: 70, weight: 0.2, contribution: 14.0 },
  },
  timestamp: new Date('2024-01-15T10:30:00'),
}

// 範例 2: 看多 (評分 55-70)
const buyScore: TechnicalScoreData = {
  totalScore: 62.0,
  rating: 'buy',
  components: {
    rsi: { score: 65, weight: 0.3, contribution: 19.5 },
    macd: { score: 70, weight: 0.3, contribution: 21.0 },
    bollinger: { score: 55, weight: 0.2, contribution: 11.0 },
    fibonacci: { score: 60, weight: 0.2, contribution: 12.0 },
  },
  timestamp: new Date('2024-01-15T10:30:00'),
}

// 範例 3: 中性 (評分 45-55)
const neutralScore: TechnicalScoreData = {
  totalScore: 50.0,
  rating: 'neutral',
  components: {
    rsi: { score: 50, weight: 0.3, contribution: 15.0 },
    macd: { score: 48, weight: 0.3, contribution: 14.4 },
    bollinger: { score: 52, weight: 0.2, contribution: 10.4 },
    fibonacci: { score: 51, weight: 0.2, contribution: 10.2 },
  },
  timestamp: new Date('2024-01-15T10:30:00'),
}

// 範例 4: 看空 (評分 30-45)
const sellScore: TechnicalScoreData = {
  totalScore: 38.0,
  rating: 'sell',
  components: {
    rsi: { score: 35, weight: 0.3, contribution: 10.5 },
    macd: { score: 30, weight: 0.3, contribution: 9.0 },
    bollinger: { score: 45, weight: 0.2, contribution: 9.0 },
    fibonacci: { score: 40, weight: 0.2, contribution: 8.0 },
  },
  timestamp: new Date('2024-01-15T10:30:00'),
}

// 範例 5: 強勢看空 (評分 < 30)
const strongSellScore: TechnicalScoreData = {
  totalScore: 22.5,
  rating: 'strong_sell',
  components: {
    rsi: { score: 20, weight: 0.3, contribution: 6.0 },
    macd: { score: 15, weight: 0.3, contribution: 4.5 },
    bollinger: { score: 30, weight: 0.2, contribution: 6.0 },
    fibonacci: { score: 25, weight: 0.2, contribution: 5.0 },
  },
  timestamp: new Date('2024-01-15T10:30:00'),
}

// 歷史評分資料（用於趨勢圖）
const scoreHistory: ScoreHistory[] = [
  { date: '01/08', score: 45 },
  { date: '01/09', score: 52 },
  { date: '01/10', score: 58 },
  { date: '01/11', score: 65 },
  { date: '01/12', score: 70 },
  { date: '01/13', score: 72 },
  { date: '01/14', score: 75 },
  { date: '01/15', score: 78.5 },
]

// 下跌趨勢的歷史資料
const decliningHistory: ScoreHistory[] = [
  { date: '01/08', score: 75 },
  { date: '01/09', score: 68 },
  { date: '01/10', score: 62 },
  { date: '01/11', score: 55 },
  { date: '01/12', score: 48 },
  { date: '01/13', score: 40 },
  { date: '01/14', score: 32 },
  { date: '01/15', score: 22.5 },
]

// 震盪趨勢的歷史資料
const volatileHistory: ScoreHistory[] = [
  { date: '01/08', score: 50 },
  { date: '01/09', score: 55 },
  { date: '01/10', score: 48 },
  { date: '01/11', score: 52 },
  { date: '01/12', score: 47 },
  { date: '01/13', score: 53 },
  { date: '01/14', score: 49 },
  { date: '01/15', score: 50 },
]

export default function TechnicalScoreCardExamples() {
  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">TechnicalScoreCard 元件範例</h1>

      <div className="space-y-8">
        {/* 範例 1: 強勢看多 */}
        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">範例 1: 強勢看多（評分 78.5）</h2>
          <p className="text-gray-600 mb-4">
            當評分超過 70 時，顯示為「強勢看多」，表示多項技術指標顯示強勁買入訊號。
          </p>
          <TechnicalScoreCard 
            currentScore={strongBuyScore} 
            history={scoreHistory}
            title="AAPL - 蘋果公司"
          />
        </section>

        {/* 範例 2: 看多 */}
        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">範例 2: 看多（評分 62.0）</h2>
          <p className="text-gray-600 mb-4">
            評分在 55-70 之間時，顯示為「看多」，技術面偏多，可考慮買入。
          </p>
          <TechnicalScoreCard 
            currentScore={buyScore}
            title="TSLA - 特斯拉"
          />
        </section>

        {/* 範例 3: 中性 */}
        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">範例 3: 中性（評分 50.0）</h2>
          <p className="text-gray-600 mb-4">
            評分在 45-55 之間時，顯示為「中性」，技術面無明確方向，建議觀望。
          </p>
          <TechnicalScoreCard 
            currentScore={neutralScore}
            history={volatileHistory}
            title="MSFT - 微軟"
          />
        </section>

        {/* 範例 4: 看空 */}
        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">範例 4: 看空（評分 38.0）</h2>
          <p className="text-gray-600 mb-4">
            評分在 30-45 之間時，顯示為「看空」，技術面偏空，建議觀望或減倉。
          </p>
          <TechnicalScoreCard 
            currentScore={sellScore}
            title="NVDA - 輝達"
          />
        </section>

        {/* 範例 5: 強勢看空 */}
        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">範例 5: 強勢看空（評分 22.5）</h2>
          <p className="text-gray-600 mb-4">
            評分低於 30 時，顯示為「強勢看空」，多項指標顯示賣出訊號，建議避開或做空。
          </p>
          <TechnicalScoreCard 
            currentScore={strongSellScore}
            history={decliningHistory}
            title="META - Meta Platforms"
          />
        </section>

        {/* 範例 6: 無歷史資料 */}
        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">範例 6: 無歷史資料</h2>
          <p className="text-gray-600 mb-4">
            當沒有提供歷史資料時，不顯示趨勢圖表。
          </p>
          <TechnicalScoreCard 
            currentScore={strongBuyScore}
            title="GOOGL - Alphabet"
          />
        </section>

        {/* 使用說明 */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">使用說明</h2>
          <div className="space-y-4 text-gray-700">
            <div>
              <h3 className="font-semibold mb-2">評分計算方式</h3>
              <p>總評分 = Σ(各指標評分 × 權重)</p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                <li>RSI 權重: 30%</li>
                <li>MACD 權重: 30%</li>
                <li>布林通道權重: 20%</li>
                <li>費波那契權重: 20%</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">評分等級</h3>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li><strong>強勢看多</strong>: 70-100 分</li>
                <li><strong>看多</strong>: 55-70 分</li>
                <li><strong>中性</strong>: 45-55 分</li>
                <li><strong>看空</strong>: 30-45 分</li>
                <li><strong>強勢看空</strong>: 0-30 分</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">元件特點</h3>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>顯示綜合技術評分和市場狀態標籤</li>
                <li>展示各指標的評分、權重和貢獻度</li>
                <li>提供評分計算明細</li>
                <li>可選的評分變化趨勢圖</li>
                <li>評分區間參考指南</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">API 整合範例</h3>
              <pre className="bg-gray-100 p-4 rounded-md overflow-x-auto text-sm">
{`const response = await fetch(
  '/api/indicators/technical-score?symbol=AAPL'
)
const data = await response.json()

<TechnicalScoreCard 
  currentScore={data.currentScore}
  history={data.history}
  title="AAPL 技術評分"
/>`}
              </pre>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
