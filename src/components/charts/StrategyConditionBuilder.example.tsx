import { useState } from 'react'
import StrategyConditionBuilder, { Condition, LogicOperator } from './StrategyConditionBuilder'

export default function StrategyConditionBuilderExample() {
  const [conditions, setConditions] = useState<Condition[]>([])
  const [logic, setLogic] = useState<LogicOperator>('AND')
  const [savedStrategies, setSavedStrategies] = useState<Array<{ name: string; conditions: Condition[]; logic: LogicOperator }>>([])
  const [strategyName, setStrategyName] = useState('')

  const handleConditionsChange = (newConditions: Condition[], newLogic: LogicOperator) => {
    setConditions(newConditions)
    setLogic(newLogic)
  }

  const saveStrategy = () => {
    if (!strategyName.trim()) {
      alert('請輸入策略名稱')
      return
    }

    if (conditions.length === 0) {
      alert('請至少新增一個條件')
      return
    }

    setSavedStrategies([
      ...savedStrategies,
      {
        name: strategyName,
        conditions: [...conditions],
        logic,
      },
    ])

    setStrategyName('')
    alert('策略已儲存！')
  }

  const loadStrategy = (strategy: { name: string; conditions: Condition[]; logic: LogicOperator }) => {
    setConditions(strategy.conditions)
    setLogic(strategy.logic)
    setStrategyName(strategy.name)
  }

  const deleteStrategy = (index: number) => {
    setSavedStrategies(savedStrategies.filter((_, i) => i !== index))
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">策略條件建立器範例</h1>
        <p className="text-gray-600 mb-8">建立自訂的技術指標組合策略</p>

        {/* Strategy Name Input */}
        <div className="mb-6 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">策略資訊</h2>
          <div className="flex gap-3">
            <input
              type="text"
              value={strategyName}
              onChange={(e) => setStrategyName(e.target.value)}
              placeholder="輸入策略名稱..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={saveStrategy}
              disabled={conditions.length === 0}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              儲存策略
            </button>
          </div>
        </div>

        {/* Strategy Condition Builder */}
        <StrategyConditionBuilder
          onConditionsChange={handleConditionsChange}
          initialConditions={conditions}
          initialLogic={logic}
        />

        {/* Current Strategy Summary */}
        {conditions.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">目前策略摘要</h2>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">條件數量：</span>
                <span className="font-semibold text-gray-800">{conditions.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">邏輯運算：</span>
                <span className="font-semibold text-gray-800">{logic}</span>
              </div>
              <div className="mt-4">
                <span className="text-gray-600 block mb-2">條件列表：</span>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                  {conditions.map((condition) => (
                    <li key={condition.id}>{condition.description}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Saved Strategies */}
        {savedStrategies.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">已儲存的策略 ({savedStrategies.length})</h2>
            <div className="space-y-3">
              {savedStrategies.map((strategy, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-md hover:border-blue-300 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-800">{strategy.name}</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => loadStrategy(strategy)}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors text-sm font-medium"
                      >
                        載入
                      </button>
                      <button
                        onClick={() => deleteStrategy(index)}
                        className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors text-sm font-medium"
                      >
                        刪除
                      </button>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    <div className="mb-1">
                      <span className="font-medium">邏輯：</span> {strategy.logic}
                    </div>
                    <div>
                      <span className="font-medium">條件：</span>
                      <ul className="list-disc list-inside ml-4 mt-1">
                        {strategy.conditions.map((condition) => (
                          <li key={condition.id}>{condition.description}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Example Strategies */}
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">範例策略</h2>
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <h3 className="font-semibold text-green-800 mb-2">📈 強勢突破策略</h3>
              <p className="text-sm text-green-700 mb-2">適合捕捉強勢上漲趨勢</p>
              <ul className="list-disc list-inside text-sm text-green-700 space-y-1">
                <li>RSI 相對強弱指標 &gt; 50</li>
                <li>AND MACD 指標 &gt; 0</li>
                <li>AND 綜合技術評分 &gt; 70</li>
              </ul>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
              <h3 className="font-semibold text-blue-800 mb-2">🔄 超賣反彈策略</h3>
              <p className="text-sm text-blue-700 mb-2">適合尋找超賣後的反彈機會</p>
              <ul className="list-disc list-inside text-sm text-blue-700 space-y-1">
                <li>RSI 相對強弱指標 &lt; 30</li>
                <li>AND 布林通道位置 &lt; -1</li>
                <li>OR 費波那契水平 ≈ 0.618</li>
              </ul>
            </div>

            <div className="p-4 bg-purple-50 border border-purple-200 rounded-md">
              <h3 className="font-semibold text-purple-800 mb-2">⚖️ 中性區間策略</h3>
              <p className="text-sm text-purple-700 mb-2">適合盤整區間的操作</p>
              <ul className="list-disc list-inside text-sm text-purple-700 space-y-1">
                <li>RSI 相對強弱指標 &gt;= 45</li>
                <li>AND RSI 相對強弱指標 &lt;= 55</li>
                <li>AND ATR 波動性 &lt; 2</li>
              </ul>
            </div>

            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <h3 className="font-semibold text-red-800 mb-2">🛑 風險警示策略</h3>
              <p className="text-sm text-red-700 mb-2">使用 NOT 邏輯避開高風險情況</p>
              <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                <li>NOT (RSI 相對強弱指標 &gt; 70 AND ATR 波動性 &gt; 3)</li>
                <li>避開超買且高波動的危險區域</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Usage Tips */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-yellow-800 mb-4">💡 使用技巧</h2>
          <ul className="list-disc list-inside space-y-2 text-sm text-yellow-700">
            <li>
              <strong>AND 邏輯：</strong>適合建立嚴格的進場條件，所有指標都必須符合才觸發
            </li>
            <li>
              <strong>OR 邏輯：</strong>適合建立寬鬆的條件，任一指標符合即可觸發
            </li>
            <li>
              <strong>NOT 邏輯：</strong>適合建立反向策略或風險控制條件
            </li>
            <li>
              <strong>組合使用：</strong>可以先建立多個條件，再選擇適合的邏輯運算方式
            </li>
            <li>
              <strong>回測驗證：</strong>建立策略後，建議使用歷史資料進行回測驗證
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
