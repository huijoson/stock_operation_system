'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'

export interface ComponentScore {
  score: number
  weight: number
  contribution: number
}

export interface ComponentScores {
  rsi: ComponentScore
  macd: ComponentScore
  bollinger: ComponentScore
  fibonacci: ComponentScore
}

export interface TechnicalScoreData {
  totalScore: number
  rating: 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'strong_sell'
  components: ComponentScores
  timestamp: Date
}

export interface ScoreHistory {
  date: string
  score: number
}

export interface TechnicalScoreCardProps {
  currentScore: TechnicalScoreData
  history?: ScoreHistory[]
  title?: string
}

export default function TechnicalScoreCard({
  currentScore,
  history = [],
  title = '綜合技術評分',
}: TechnicalScoreCardProps) {
  const getRatingInfo = (rating: string) => {
    switch (rating) {
      case 'strong_buy':
        return { label: '強勢看多', color: '#10b981', bgColor: '#d1fae5', description: '多項指標顯示強勁買入訊號' }
      case 'buy':
        return { label: '看多', color: '#34d399', bgColor: '#ecfdf5', description: '技術面偏多，可考慮買入' }
      case 'neutral':
        return { label: '中性', color: '#6b7280', bgColor: '#f3f4f6', description: '技術面無明確方向' }
      case 'sell':
        return { label: '看空', color: '#f87171', bgColor: '#fee2e2', description: '技術面偏空，建議觀望' }
      case 'strong_sell':
        return { label: '強勢看空', color: '#ef4444', bgColor: '#fecaca', description: '多項指標顯示賣出訊號' }
      default:
        return { label: '未知', color: '#6b7280', bgColor: '#f3f4f6', description: '' }
    }
  }

  const ratingInfo = getRatingInfo(currentScore.rating)

  const getScoreColor = (score: number): string => {
    if (score >= 70) return '#10b981'
    if (score >= 55) return '#34d399'
    if (score >= 45) return '#6b7280'
    if (score >= 30) return '#f87171'
    return '#ef4444'
  }

  const componentData = [
    { name: 'RSI', ...currentScore.components.rsi },
    { name: 'MACD', ...currentScore.components.macd },
    { name: '布林通道', ...currentScore.components.bollinger },
    { name: '費波那契', ...currentScore.components.fibonacci },
  ]

  return (
    <div className="w-full bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>

      {/* Main score display */}
      <div className="flex items-center justify-between mb-6 p-6 rounded-lg" style={{ backgroundColor: ratingInfo.bgColor }}>
        <div>
          <div className="text-sm text-gray-600 mb-1">綜合評分</div>
          <div className="text-5xl font-bold" style={{ color: ratingInfo.color }}>
            {currentScore.totalScore.toFixed(0)}
          </div>
          <div className="text-xs text-gray-500 mt-1">滿分 100</div>
        </div>
        <div className="text-right">
          <div
            className="text-2xl font-bold mb-2"
            style={{ color: ratingInfo.color }}
          >
            {ratingInfo.label}
          </div>
          <div className="text-sm text-gray-600">{ratingInfo.description}</div>
          <div className="text-xs text-gray-500 mt-2">
            更新時間: {new Date(currentScore.timestamp).toLocaleString('zh-TW')}
          </div>
        </div>
      </div>

      {/* Component scores */}
      <div className="mb-6">
        <h4 className="font-semibold text-gray-800 mb-3">各指標貢獻度</h4>
        <div className="space-y-3">
          {componentData.map((component, index) => (
            <div key={index} className="space-y-1">
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium text-gray-700">{component.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">評分: {Number(component.score || 0).toFixed(0)}</span>
                  <span className="text-gray-500">權重: {(Number(component.weight || 0) * 100).toFixed(0)}%</span>
                  <span className="font-semibold" style={{ color: getScoreColor(Number(component.contribution || 0)) }}>
                    貢獻: {Number(component.contribution || 0).toFixed(1)}
                  </span>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${component.score}%`,
                    backgroundColor: getScoreColor(component.score),
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Score breakdown */}
      <div className="mb-6 p-4 bg-gray-50 rounded-md">
        <h4 className="font-semibold text-gray-800 mb-2">評分計算</h4>
        <div className="text-sm text-gray-700 space-y-1">
          {componentData.map((component, index) => (
            <div key={index} className="flex justify-between">
              <span>
                {component.name}: {Number(component.score || 0).toFixed(0)} × {(Number(component.weight || 0) * 100).toFixed(0)}%
              </span>
              <span className="font-medium">= {Number(component.contribution || 0).toFixed(1)}</span>
            </div>
          ))}
          <div className="border-t border-gray-300 pt-1 mt-2 flex justify-between font-semibold">
            <span>總分</span>
            <span style={{ color: getScoreColor(currentScore.totalScore) }}>
              {currentScore.totalScore.toFixed(1)}
            </span>
          </div>
        </div>
      </div>

      {/* Score history chart */}
      {history.length > 0 && (
        <div>
          <h4 className="font-semibold text-gray-800 mb-3">評分變化趨勢</h4>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={history} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#6b7280" />
              <YAxis domain={[0, 100]} stroke="#6b7280" />
              <Tooltip
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.375rem' }}
                formatter={(value: any) => [Number(value).toFixed(1), '評分']}
              />
              <ReferenceLine y={70} stroke="#10b981" strokeDasharray="3 3" label="強勢看多" />
              <ReferenceLine y={30} stroke="#ef4444" strokeDasharray="3 3" label="弱勢看空" />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Rating scale guide */}
      <div className="mt-6 grid grid-cols-5 gap-1 text-xs">
        <div className="p-2 bg-green-100 border border-green-300 rounded text-center">
          <div className="font-semibold text-green-800">強勢看多</div>
          <div className="text-green-700">70-100</div>
        </div>
        <div className="p-2 bg-green-50 border border-green-200 rounded text-center">
          <div className="font-semibold text-green-700">看多</div>
          <div className="text-green-600">55-70</div>
        </div>
        <div className="p-2 bg-gray-100 border border-gray-300 rounded text-center">
          <div className="font-semibold text-gray-700">中性</div>
          <div className="text-gray-600">45-55</div>
        </div>
        <div className="p-2 bg-red-50 border border-red-200 rounded text-center">
          <div className="font-semibold text-red-700">看空</div>
          <div className="text-red-600">30-45</div>
        </div>
        <div className="p-2 bg-red-100 border border-red-300 rounded text-center">
          <div className="font-semibold text-red-800">強勢看空</div>
          <div className="text-red-700">0-30</div>
        </div>
      </div>
    </div>
  )
}
