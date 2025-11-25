'use client'

import { useState } from 'react'

export type IndicatorType = 'RSI' | 'MACD' | 'BOLLINGER' | 'FIBONACCI' | 'ATR' | 'TECHNICAL_SCORE'
export type OperatorType = '>' | '<' | '>=' | '<=' | '==' | '!='
export type LogicOperator = 'AND' | 'OR' | 'NOT'

export interface Condition {
  id: string
  indicator: IndicatorType
  operator: OperatorType
  value: number
  description: string
}

export interface StrategyConditionBuilderProps {
  onConditionsChange?: (conditions: Condition[], logic: LogicOperator) => void
  initialConditions?: Condition[]
  initialLogic?: LogicOperator
}

export default function StrategyConditionBuilder({
  onConditionsChange,
  initialConditions = [],
  initialLogic = 'AND',
}: StrategyConditionBuilderProps) {
  const [conditions, setConditions] = useState<Condition[]>(initialConditions)
  const [logic, setLogic] = useState<LogicOperator>(initialLogic)
  const [editingCondition, setEditingCondition] = useState<Partial<Condition>>({
    indicator: 'RSI',
    operator: '>',
    value: 70,
  })

  const indicatorOptions: Array<{ value: IndicatorType; label: string; defaultValue: number }> = [
    { value: 'RSI', label: 'RSI 相對強弱指標', defaultValue: 70 },
    { value: 'MACD', label: 'MACD 指標', defaultValue: 0 },
    { value: 'BOLLINGER', label: '布林通道位置', defaultValue: 0 },
    { value: 'FIBONACCI', label: '費波那契水平', defaultValue: 0.618 },
    { value: 'ATR', label: 'ATR 波動性', defaultValue: 1 },
    { value: 'TECHNICAL_SCORE', label: '綜合技術評分', defaultValue: 70 },
  ]

  const operatorOptions: Array<{ value: OperatorType; label: string }> = [
    { value: '>', label: '大於 (>)' },
    { value: '<', label: '小於 (<)' },
    { value: '>=', label: '大於等於 (≥)' },
    { value: '<=', label: '小於等於 (≤)' },
    { value: '==', label: '等於 (=)' },
    { value: '!=', label: '不等於 (≠)' },
  ]

  const logicOptions: Array<{ value: LogicOperator; label: string; description: string }> = [
    { value: 'AND', label: 'AND (且)', description: '所有條件都必須滿足' },
    { value: 'OR', label: 'OR (或)', description: '任一條件滿足即可' },
    { value: 'NOT', label: 'NOT (非)', description: '條件不滿足時觸發' },
  ]

  const generateDescription = (indicator: IndicatorType, operator: OperatorType, value: number): string => {
    const indicatorLabel = indicatorOptions.find((opt) => opt.value === indicator)?.label || indicator
    const operatorLabel = operatorOptions.find((opt) => opt.value === operator)?.label || operator
    return `${indicatorLabel} ${operatorLabel} ${value}`
  }

  const addCondition = () => {
    if (!editingCondition.indicator || !editingCondition.operator || editingCondition.value === undefined) {
      return
    }

    const newCondition: Condition = {
      id: `condition-${Date.now()}`,
      indicator: editingCondition.indicator,
      operator: editingCondition.operator,
      value: editingCondition.value,
      description: generateDescription(editingCondition.indicator, editingCondition.operator, editingCondition.value),
    }

    const updatedConditions = [...conditions, newCondition]
    setConditions(updatedConditions)

    if (onConditionsChange) {
      onConditionsChange(updatedConditions, logic)
    }

    // Reset editing condition
    setEditingCondition({
      indicator: 'RSI',
      operator: '>',
      value: 70,
    })
  }

  const removeCondition = (id: string) => {
    const updatedConditions = conditions.filter((c) => c.id !== id)
    setConditions(updatedConditions)

    if (onConditionsChange) {
      onConditionsChange(updatedConditions, logic)
    }
  }

  const handleLogicChange = (newLogic: LogicOperator) => {
    setLogic(newLogic)
    if (onConditionsChange) {
      onConditionsChange(conditions, newLogic)
    }
  }

  const handleIndicatorChange = (indicator: IndicatorType) => {
    const defaultValue = indicatorOptions.find((opt) => opt.value === indicator)?.defaultValue || 0
    setEditingCondition({
      ...editingCondition,
      indicator,
      value: defaultValue,
    })
  }

  const getConditionColor = (indicator: IndicatorType): string => {
    const colors: { [key in IndicatorType]: string } = {
      RSI: '#3b82f6',
      MACD: '#10b981',
      BOLLINGER: '#f59e0b',
      FIBONACCI: '#8b5cf6',
      ATR: '#ef4444',
      TECHNICAL_SCORE: '#06b6d4',
    }
    return colors[indicator] || '#6b7280'
  }

  const generatePreview = (): string => {
    if (conditions.length === 0) return '尚未設定條件'

    if (logic === 'NOT') {
      return `NOT (${conditions.map((c) => c.description).join(' AND ')})`
    }

    return conditions.map((c) => c.description).join(` ${logic} `)
  }

  return (
    <div className="w-full bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">策略條件建立器</h3>

      {/* Add condition form */}
      <div className="mb-6 p-4 bg-gray-50 rounded-md">
        <h4 className="font-semibold text-gray-700 mb-3">新增條件</h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">指標</label>
            <select
              value={editingCondition.indicator}
              onChange={(e) => handleIndicatorChange(e.target.value as IndicatorType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {indicatorOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">運算子</label>
            <select
              value={editingCondition.operator}
              onChange={(e) => setEditingCondition({ ...editingCondition, operator: e.target.value as OperatorType })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {operatorOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">數值</label>
            <input
              type="number"
              step="0.01"
              value={editingCondition.value}
              onChange={(e) => setEditingCondition({ ...editingCondition, value: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={addCondition}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              新增條件
            </button>
          </div>
        </div>
      </div>

      {/* Logic operator selection */}
      {conditions.length > 1 && (
        <div className="mb-6">
          <h4 className="font-semibold text-gray-700 mb-3">邏輯運算</h4>
          <div className="grid grid-cols-3 gap-3">
            {logicOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleLogicChange(opt.value)}
                className={`p-3 rounded-md border-2 transition-all ${
                  logic === opt.value
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                <div className="font-semibold">{opt.label}</div>
                <div className="text-xs mt-1">{opt.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Conditions list */}
      <div className="mb-6">
        <h4 className="font-semibold text-gray-700 mb-3">已設定條件 ({conditions.length})</h4>
        {conditions.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">尚未新增任何條件</p>
        ) : (
          <div className="space-y-2">
            {conditions.map((condition, index) => (
              <div key={condition.id} className="flex items-center gap-3">
                {index > 0 && (
                  <div className="px-2 py-1 bg-gray-200 rounded text-xs font-semibold text-gray-700">{logic}</div>
                )}
                <div
                  className="flex-1 flex items-center justify-between p-3 rounded-md border-2"
                  style={{ borderColor: getConditionColor(condition.indicator), backgroundColor: `${getConditionColor(condition.indicator)}10` }}
                >
                  <div>
                    <div className="font-medium text-gray-800">{condition.description}</div>
                    <div className="text-xs text-gray-600 mt-1">
                      {condition.indicator} {condition.operator} {condition.value}
                    </div>
                  </div>
                  <button
                    onClick={() => removeCondition(condition.id)}
                    className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors text-sm font-medium"
                  >
                    移除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
        <h4 className="font-semibold text-blue-800 mb-2">策略條件預覽</h4>
        <div className="text-sm text-blue-700 font-mono bg-white p-3 rounded border border-blue-300">
          {generatePreview()}
        </div>
        {conditions.length > 0 && (
          <div className="text-xs text-blue-600 mt-2">
            當以上條件滿足時，策略將觸發訊號
          </div>
        )}
      </div>

      {/* Helper guide */}
      <div className="mt-4 p-3 bg-gray-50 rounded-md text-xs text-gray-600">
        <div className="font-semibold mb-1">使用說明：</div>
        <ul className="list-disc list-inside space-y-1">
          <li>選擇技術指標、運算子和數值來建立條件</li>
          <li>可以新增多個條件，並選擇邏輯運算方式（AND/OR/NOT）</li>
          <li>AND: 所有條件都必須滿足；OR: 任一條件滿足即可；NOT: 條件不滿足時觸發</li>
          <li>即時預覽顯示完整的策略條件表達式</li>
        </ul>
      </div>
    </div>
  )
}
