import { useState, useEffect } from 'react'
import StrategyConditionBuilder, { Condition, LogicOperator } from '@/components/charts/StrategyConditionBuilder'
import { Loading } from '@/components/ui/Loading'

interface Strategy {
  id: string
  name: string
  description: string
  conditions: Condition[]
  logic: LogicOperator
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export default function StrategyBuilderPage() {
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)

  // Form state
  const [strategyName, setStrategyName] = useState('')
  const [strategyDescription, setStrategyDescription] = useState('')
  const [conditions, setConditions] = useState<Condition[]>([])
  const [logic, setLogic] = useState<LogicOperator>('AND')
  const [editingStrategy, setEditingStrategy] = useState<Strategy | null>(null)

  useEffect(() => {
    fetchStrategies()
  }, [])

  const fetchStrategies = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/strategies')
      if (!response.ok) {
        throw new Error('無法載入策略列表')
      }
      const data = await response.json()
      setStrategies(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入策略時發生錯誤')
      console.error('Error fetching strategies:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleConditionsChange = (newConditions: Condition[], newLogic: LogicOperator) => {
    setConditions(newConditions)
    setLogic(newLogic)
  }

  const handleCreateStrategy = async () => {
    if (!strategyName.trim()) {
      setError('請輸入策略名稱')
      return
    }

    if (conditions.length === 0) {
      setError('請至少新增一個條件')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/strategies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: strategyName,
          description: strategyDescription,
          conditions,
          logic,
        }),
      })

      if (!response.ok) {
        throw new Error('建立策略失敗')
      }

      const newStrategy = await response.json()
      setStrategies([newStrategy, ...strategies])

      // Reset form
      setStrategyName('')
      setStrategyDescription('')
      setConditions([])
      setLogic('AND')
      setShowCreateForm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : '建立策略時發生錯誤')
      console.error('Error creating strategy:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStrategy = async () => {
    if (!editingStrategy) return

    if (!strategyName.trim()) {
      setError('請輸入策略名稱')
      return
    }

    if (conditions.length === 0) {
      setError('請至少新增一個條件')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/strategies/${editingStrategy.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: strategyName,
          description: strategyDescription,
          conditions,
          logic,
        }),
      })

      if (!response.ok) {
        throw new Error('更新策略失敗')
      }

      const updatedStrategy = await response.json()
      setStrategies(strategies.map((s) => (s.id === updatedStrategy.id ? updatedStrategy : s)))

      // Reset form
      setStrategyName('')
      setStrategyDescription('')
      setConditions([])
      setLogic('AND')
      setEditingStrategy(null)
      setShowCreateForm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新策略時發生錯誤')
      console.error('Error updating strategy:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteStrategy = async (id: string) => {
    if (!confirm('確定要刪除此策略嗎？')) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/strategies/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('刪除策略失敗')
      }

      setStrategies(strategies.filter((s) => s.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : '刪除策略時發生錯誤')
      console.error('Error deleting strategy:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleEditStrategy = (strategy: Strategy) => {
    setEditingStrategy(strategy)
    setStrategyName(strategy.name)
    setStrategyDescription(strategy.description || '')
    setConditions(strategy.conditions)
    setLogic(strategy.logic)
    setShowCreateForm(true)
  }

  const handleCancelEdit = () => {
    setEditingStrategy(null)
    setStrategyName('')
    setStrategyDescription('')
    setConditions([])
    setLogic('AND')
    setShowCreateForm(false)
  }

  const toggleStrategyActive = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/strategies/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !isActive }),
      })

      if (!response.ok) {
        throw new Error('更新策略狀態失敗')
      }

      const updatedStrategy = await response.json()
      setStrategies(strategies.map((s) => (s.id === updatedStrategy.id ? updatedStrategy : s)))
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新策略狀態時發生錯誤')
      console.error('Error toggling strategy:', err)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">策略建立器</h1>
          <p className="text-gray-600">建立自訂的技術指標組合策略，並追蹤訊號觸發</p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Create/Edit Strategy Button */}
        {!showCreateForm && (
          <div className="mb-6">
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              ➕ 建立新策略
            </button>
          </div>
        )}

        {/* Create/Edit Strategy Form */}
        {showCreateForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800">
                {editingStrategy ? '編輯策略' : '建立新策略'}
              </h2>
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
              >
                取消
              </button>
            </div>

            {/* Strategy Name and Description */}
            <div className="mb-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">策略名稱 *</label>
                <input
                  type="text"
                  value={strategyName}
                  onChange={(e) => setStrategyName(e.target.value)}
                  placeholder="例如：RSI 超賣反彈策略"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">策略描述</label>
                <textarea
                  value={strategyDescription}
                  onChange={(e) => setStrategyDescription(e.target.value)}
                  placeholder="描述此策略的目的和使用時機..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Condition Builder */}
            <StrategyConditionBuilder
              onConditionsChange={handleConditionsChange}
              initialConditions={conditions}
              initialLogic={logic}
            />

            {/* Action Buttons */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={handleCancelEdit}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
              >
                取消
              </button>
              <button
                onClick={editingStrategy ? handleUpdateStrategy : handleCreateStrategy}
                disabled={loading || !strategyName.trim() || conditions.length === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? '處理中...' : editingStrategy ? '更新策略' : '建立策略'}
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && !showCreateForm && (
          <div className="flex justify-center items-center py-12">
            <Loading />
          </div>
        )}

        {/* Strategies List */}
        {!loading && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">我的策略 ({strategies.length})</h2>
            </div>

            {strategies.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-6xl mb-4">📋</div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">尚未建立策略</h3>
                <p className="text-gray-600 mb-4">點擊上方按鈕開始建立您的第一個交易策略</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {strategies.map((strategy) => (
                  <div key={strategy.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-800">{strategy.name}</h3>
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold ${
                              strategy.isActive
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {strategy.isActive ? '啟用中' : '已停用'}
                          </span>
                          <span className="px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-700">
                            {strategy.logic}
                          </span>
                        </div>
                        {strategy.description && (
                          <p className="text-sm text-gray-600 mb-3">{strategy.description}</p>
                        )}
                        <div className="space-y-1">
                          {strategy.conditions.map((condition, index) => (
                            <div key={condition.id} className="flex items-center gap-2 text-sm">
                              {index > 0 && (
                                <span className="px-2 py-0.5 bg-gray-200 rounded text-xs font-semibold text-gray-700">
                                  {strategy.logic}
                                </span>
                              )}
                              <span className="text-gray-700">{condition.description}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => toggleStrategyActive(strategy.id, strategy.isActive)}
                          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                            strategy.isActive
                              ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                        >
                          {strategy.isActive ? '停用' : '啟用'}
                        </button>
                        <button
                          onClick={() => handleEditStrategy(strategy)}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors text-sm font-medium"
                        >
                          編輯
                        </button>
                        <button
                          onClick={() => handleDeleteStrategy(strategy.id)}
                          className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors text-sm font-medium"
                        >
                          刪除
                        </button>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      建立時間: {new Date(strategy.createdAt).toLocaleString('zh-TW')}
                      {strategy.updatedAt !== strategy.createdAt && (
                        <span className="ml-3">
                          更新時間: {new Date(strategy.updatedAt).toLocaleString('zh-TW')}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Guide Section */}
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">策略建立指南</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
              <h4 className="font-semibold text-blue-800 mb-2">💡 策略設計建議</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• 結合多個指標提高訊號可靠度</li>
                <li>• 避免過度複雜的條件組合</li>
                <li>• 定期回測和調整策略參數</li>
                <li>• 考慮市場環境和股票特性</li>
              </ul>
            </div>
            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <h4 className="font-semibold text-green-800 mb-2">📊 常見策略範例</h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• RSI &lt; 30 AND MACD 黃金交叉</li>
                <li>• 技術評分 &gt; 70 AND 價格突破上軌</li>
                <li>• ATR 上升 AND 價格接近費波那契水平</li>
                <li>• 多個指標共振的買賣訊號</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
