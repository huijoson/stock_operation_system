# StrategyConditionBuilder 元件

策略條件建立器元件，提供視覺化介面讓使用者建立自訂的技術指標組合策略。

## 功能特色

- ✅ 視覺化介面建立策略條件
- ✅ 支援多種技術指標選擇（RSI、MACD、布林通道、費波那契、ATR、綜合技術評分）
- ✅ 支援多種運算子（>、<、>=、<=、==、!=）
- ✅ 支援邏輯運算組合（AND、OR、NOT）
- ✅ 即時預覽策略條件表達式
- ✅ 條件管理（新增、移除）
- ✅ 顏色編碼區分不同指標
- ✅ 響應式設計

## 使用方式

### 基本用法

```tsx
import StrategyConditionBuilder from '@/components/charts/StrategyConditionBuilder'

export default function MyPage() {
  const handleConditionsChange = (conditions, logic) => {
    console.log('條件已更新:', conditions)
    console.log('邏輯運算:', logic)
  }

  return (
    <StrategyConditionBuilder
      onConditionsChange={handleConditionsChange}
    />
  )
}
```

### 帶初始值

```tsx
import StrategyConditionBuilder, { Condition, LogicOperator } from '@/components/charts/StrategyConditionBuilder'

const initialConditions: Condition[] = [
  {
    id: 'condition-1',
    indicator: 'RSI',
    operator: '>',
    value: 70,
    description: 'RSI 相對強弱指標 大於 (>) 70'
  },
  {
    id: 'condition-2',
    indicator: 'MACD',
    operator: '>',
    value: 0,
    description: 'MACD 指標 大於 (>) 0'
  }
]

export default function MyPage() {
  return (
    <StrategyConditionBuilder
      initialConditions={initialConditions}
      initialLogic="AND"
      onConditionsChange={(conditions, logic) => {
        // 處理條件變更
      }}
    />
  )
}
```

### 完整範例（含儲存功能）

```tsx
'use client'

import { useState } from 'react'
import StrategyConditionBuilder, { Condition, LogicOperator } from '@/components/charts/StrategyConditionBuilder'

export default function StrategyBuilder() {
  const [conditions, setConditions] = useState<Condition[]>([])
  const [logic, setLogic] = useState<LogicOperator>('AND')
  const [strategyName, setStrategyName] = useState('')

  const handleConditionsChange = (newConditions: Condition[], newLogic: LogicOperator) => {
    setConditions(newConditions)
    setLogic(newLogic)
  }

  const saveStrategy = async () => {
    const strategy = {
      name: strategyName,
      conditions,
      logic
    }

    // 呼叫 API 儲存策略
    const response = await fetch('/api/strategies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(strategy)
    })

    if (response.ok) {
      alert('策略已儲存！')
    }
  }

  return (
    <div>
      <input
        type="text"
        value={strategyName}
        onChange={(e) => setStrategyName(e.target.value)}
        placeholder="策略名稱"
      />
      
      <StrategyConditionBuilder
        onConditionsChange={handleConditionsChange}
        initialConditions={conditions}
        initialLogic={logic}
      />

      <button onClick={saveStrategy}>
        儲存策略
      </button>
    </div>
  )
}
```

## Props

| 屬性 | 類型 | 必填 | 預設值 | 說明 |
|------|------|------|--------|------|
| `onConditionsChange` | `(conditions: Condition[], logic: LogicOperator) => void` | 否 | - | 條件變更時的回調函數 |
| `initialConditions` | `Condition[]` | 否 | `[]` | 初始條件列表 |
| `initialLogic` | `LogicOperator` | 否 | `'AND'` | 初始邏輯運算子 |

## 類型定義

### IndicatorType

```typescript
type IndicatorType = 'RSI' | 'MACD' | 'BOLLINGER' | 'FIBONACCI' | 'ATR' | 'TECHNICAL_SCORE'
```

支援的技術指標：
- `RSI`: RSI 相對強弱指標
- `MACD`: MACD 指標
- `BOLLINGER`: 布林通道位置
- `FIBONACCI`: 費波那契水平
- `ATR`: ATR 波動性
- `TECHNICAL_SCORE`: 綜合技術評分

### OperatorType

```typescript
type OperatorType = '>' | '<' | '>=' | '<=' | '==' | '!='
```

支援的運算子：
- `>`: 大於
- `<`: 小於
- `>=`: 大於等於
- `<=`: 小於等於
- `==`: 等於
- `!=`: 不等於

### LogicOperator

```typescript
type LogicOperator = 'AND' | 'OR' | 'NOT'
```

支援的邏輯運算：
- `AND`: 所有條件都必須滿足
- `OR`: 任一條件滿足即可
- `NOT`: 條件不滿足時觸發

### Condition

```typescript
interface Condition {
  id: string              // 唯一識別碼
  indicator: IndicatorType // 技術指標
  operator: OperatorType   // 運算子
  value: number           // 數值
  description: string     // 條件描述
}
```

## 使用情境

### 1. 強勢突破策略

適合捕捉強勢上漲趨勢：

```typescript
const conditions = [
  { indicator: 'RSI', operator: '>', value: 50 },
  { indicator: 'MACD', operator: '>', value: 0 },
  { indicator: 'TECHNICAL_SCORE', operator: '>', value: 70 }
]
const logic = 'AND'
```

### 2. 超賣反彈策略

適合尋找超賣後的反彈機會：

```typescript
const conditions = [
  { indicator: 'RSI', operator: '<', value: 30 },
  { indicator: 'BOLLINGER', operator: '<', value: -1 }
]
const logic = 'OR'
```

### 3. 風險警示策略

使用 NOT 邏輯避開高風險情況：

```typescript
const conditions = [
  { indicator: 'RSI', operator: '>', value: 70 },
  { indicator: 'ATR', operator: '>', value: 3 }
]
const logic = 'NOT'
// 意思是：避開 RSI > 70 且 ATR > 3 的情況
```

### 4. 中性區間策略

適合盤整區間的操作：

```typescript
const conditions = [
  { indicator: 'RSI', operator: '>=', value: 45 },
  { indicator: 'RSI', operator: '<=', value: 55 },
  { indicator: 'ATR', operator: '<', value: 2 }
]
const logic = 'AND'
```

## 設計特點

### 1. 視覺化設計

- 使用顏色編碼區分不同指標
- 清晰的條件卡片展示
- 即時預覽策略表達式

### 2. 使用者體驗

- 直觀的下拉選單選擇
- 一鍵新增/移除條件
- 邏輯運算按鈕切換
- 詳細的使用說明

### 3. 響應式設計

- 支援桌面和行動裝置
- 網格佈局自動調整
- 觸控友善的按鈕大小

## 整合建議

### 與策略 API 整合

```typescript
// 建立策略
const createStrategy = async (name: string, conditions: Condition[], logic: LogicOperator) => {
  const response = await fetch('/api/strategies', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      conditions: JSON.stringify(conditions),
      logic
    })
  })
  return response.json()
}

// 執行回測
const backtest = async (strategyId: string, startDate: Date, endDate: Date) => {
  const response = await fetch(`/api/strategies/${strategyId}/backtest`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  })
  return response.json()
}
```

### 與通知系統整合

```typescript
const handleConditionsChange = (conditions: Condition[], logic: LogicOperator) => {
  // 儲存條件
  setConditions(conditions)
  setLogic(logic)

  // 檢查是否符合條件並發送通知
  if (evaluateConditions(conditions, logic, currentMarketData)) {
    sendNotification('策略條件已滿足！')
  }
}
```

## 注意事項

1. **條件數量**：建議不要設定過多條件（建議 3-5 個），避免策略過於複雜
2. **邏輯運算**：NOT 邏輯會對所有條件取反，使用時需特別注意
3. **數值範圍**：不同指標有不同的合理數值範圍，請參考各指標說明
4. **回測驗證**：建立策略後務必進行回測驗證，確認策略有效性

## 相關元件

- `IndicatorChart`: 技術指標圖表
- `RSIIndicator`: RSI 指標元件
- `MACDIndicator`: MACD 指標元件
- `TechnicalScoreCard`: 技術評分卡片

## 相關 API

- `POST /api/strategies`: 建立策略
- `GET /api/strategies/:id/backtest`: 執行策略回測
- `GET /api/indicators/*`: 取得各種技術指標資料

## 需求對應

此元件實現以下需求：
- **需求 10.1**: 允許使用者建立策略並選擇多個指標和設定觸發條件
- **需求 10.2**: 支援邏輯運算（AND、OR、NOT）組合多個指標訊號
- **需求 10.5**: 驗證價格是否在指定的費波那契水平附近（透過 FIBONACCI 指標）

## 範例頁面

完整的範例實作請參考：`src/components/charts/StrategyConditionBuilder.example.tsx`
