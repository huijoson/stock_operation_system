# 財務計算工具

此目錄包含用於股市投資組合系統的財務計算工具函式。

## Decimal 工具函式 (decimal-utils.ts)

為了避免 JavaScript 浮點數運算的精度問題，所有涉及金額的計算都應使用 Decimal.js 函式庫。

### 為什麼需要高精度運算？

JavaScript 的 Number 類型使用 IEEE 754 雙精度浮點數，會產生精度誤差：

```javascript
// 問題範例
0.1 + 0.2 === 0.3  // false! 實際結果是 0.30000000000000004

// 使用 Decimal 解決
import { add } from './decimal-utils'
add(0.1, 0.2).toString()  // "0.3" ✓
```

### 基本運算

```typescript
import * as DecimalUtils from './decimal-utils'

// 加法
const sum = DecimalUtils.add(100.5, 200.3)  // 300.8

// 減法
const diff = DecimalUtils.subtract(500, 123.45)  // 376.55

// 乘法
const product = DecimalUtils.multiply(50.25, 100)  // 5025

// 除法
const quotient = DecimalUtils.divide(1000, 3)  // 333.333...
```

### 比較運算

```typescript
// 小於
DecimalUtils.lessThan(100, 200)  // true

// 小於等於
DecimalUtils.lessThanOrEqual(100, 100)  // true

// 大於
DecimalUtils.greaterThan(200, 100)  // true

// 大於等於
DecimalUtils.greaterThanOrEqual(100, 100)  // true

// 相等
DecimalUtils.equals(100, 100)  // true
```

### 工具函式

```typescript
// 檢查是否為零
DecimalUtils.isZero(0)  // true

// 檢查是否為正數（注意：0 被視為正數）
DecimalUtils.isPositive(100)  // true

// 檢查是否為負數
DecimalUtils.isNegative(-100)  // true

// 絕對值
DecimalUtils.abs(-100)  // 100

// 四捨五入
DecimalUtils.round(123.456, 2)  // 123.46

// 轉換為數字（謹慎使用，可能失去精度）
DecimalUtils.toNumber(decimal)

// 轉換為字串
DecimalUtils.toString(decimal)
```

### 財務計算範例

```typescript
// 計算股票成本
const quantity = 100
const price = 50.25
const cost = DecimalUtils.multiply(quantity, price)  // 5025

// 計算損益
const buyPrice = 100
const sellPrice = 150
const quantity = 10

const cost = DecimalUtils.multiply(buyPrice, quantity)
const revenue = DecimalUtils.multiply(sellPrice, quantity)
const profit = DecimalUtils.subtract(revenue, cost)  // 500

// 計算平均成本
const totalCost = 5000
const totalQuantity = 100
const avgCost = DecimalUtils.divide(totalCost, totalQuantity)  // 50
```

## 測試

- **單元測試**: `src/lib/calculations/__tests__/decimal-utils.test.ts`
- **屬性測試**: `tests/property/decimal.property.test.ts`

執行測試：

```bash
# 執行所有測試
npm test

# 只執行單元測試
npm run test:unit -- decimal-utils.test.ts

# 只執行屬性測試
npm run test:property -- decimal.property.test.ts
```

## 注意事項

1. **所有金額計算都應使用 Decimal**：包括價格、數量、成本、損益等
2. **避免直接使用 Number 運算**：不要使用 `+`, `-`, `*`, `/` 運算符處理金額
3. **轉換為 Number 時要小心**：只在必要時（如顯示）才轉換，計算過程中保持 Decimal 類型
4. **資料庫儲存**：使用 Prisma 的 `Decimal` 類型（`@db.Decimal(18, 8)`）

## 相關需求

- **需求 6.6**：WHEN 計算涉及金額時 THEN 系統 SHALL 使用高精度數值運算避免浮點數誤差
- **屬性 23**：高精度數值運算正確性
