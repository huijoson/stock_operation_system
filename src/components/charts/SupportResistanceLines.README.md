# SupportResistanceLines Component

支撐壓力位圖表元件，用於在價格圖表上繪製支撐壓力線，並區分強支撐/壓力區域。

## 功能特點

### 1. 價格圖表繪製（需求 7.6）
- 在價格圖表上標示所有關鍵價位
- 使用不同顏色區分支撐位（綠色）和壓力位（紅色）
- 支援多個支撐和壓力位同時顯示

### 2. 強度區分（需求 7.4）
- **強支撐/壓力**：多次觸及且未突破，使用粗線條和深色顯示
- **中等強度**：有一定支撐/阻力作用，使用中等線條和顏色
- **弱支撐/壓力**：參考價位，使用細線條和淺色顯示

### 3. 最近價位高亮（需求 7.5）
- 自動識別最接近當前價格的支撐和壓力位
- 使用虛線樣式和加粗字體高亮顯示
- 顯示距離當前價格的百分比

## Props

```typescript
interface PriceLevel {
  price: number
  strength: 'strong' | 'moderate' | 'weak'
  touches: number
  type: 'support' | 'resistance'
}

interface SupportResistanceLinesProps {
  data: Array<{ date: string; price: number }>  // 價格歷史資料
  supports: PriceLevel[]                         // 支撐位列表
  resistances: PriceLevel[]                      // 壓力位列表
  currentPrice?: number                          // 當前價格
  nearestSupport?: PriceLevel                    // 最近支撐位
  nearestResistance?: PriceLevel                 // 最近壓力位
  title?: string                                 // 圖表標題
  height?: number                                // 圖表高度
}
```

## 使用範例

### 基本使用

```tsx
import SupportResistanceLines from '@/components/charts/SupportResistanceLines'

<SupportResistanceLines
  data={priceData}
  supports={supports}
  resistances={resistances}
  currentPrice={currentPrice}
/>
```

### 完整範例

```tsx
import SupportResistanceLines from '@/components/charts/SupportResistanceLines'
import { SupportResistanceService } from '@/services/support-resistance.service'

// 計算支撐壓力位
const service = new SupportResistanceService()
const levels = service.calculateLevels(prices, [30, 60, 90], currentPrice)

// 準備圖表資料
const priceData = historicalData.map(d => ({
  date: d.date,
  price: d.close.toNumber()
}))

const supports = levels.supports.map(s => ({
  price: s.price.toNumber(),
  strength: s.strength,
  touches: s.touches,
  type: 'support' as const
}))

const resistances = levels.resistances.map(r => ({
  price: r.price.toNumber(),
  strength: r.strength,
  touches: r.touches,
  type: 'resistance' as const
}))

// 渲染元件
<SupportResistanceLines
  data={priceData}
  supports={supports}
  resistances={resistances}
  currentPrice={currentPrice.toNumber()}
  nearestSupport={levels.currentNearestSupport ? {
    price: levels.currentNearestSupport.price.toNumber(),
    strength: levels.currentNearestSupport.strength,
    touches: levels.currentNearestSupport.touches,
    type: 'support'
  } : undefined}
  nearestResistance={levels.currentNearestResistance ? {
    price: levels.currentNearestResistance.price.toNumber(),
    strength: levels.currentNearestResistance.strength,
    touches: levels.currentNearestResistance.touches,
    type: 'resistance'
  } : undefined}
  title="AAPL 支撐壓力位分析"
  height={500}
/>
```

## 視覺化說明

### 線條樣式

| 強度 | 線條寬度 | 線條樣式 | 支撐顏色 | 壓力顏色 |
|------|---------|---------|---------|---------|
| 強 | 3px | 實線 | 深綠色 (#059669) | 深紅色 (#dc2626) |
| 中 | 2px | 虛線 | 中綠色 (#10b981) | 中紅色 (#ef4444) |
| 弱 | 1px | 虛線 | 淺綠色 (#6ee7b7) | 淺紅色 (#fca5a5) |

### 最近價位高亮

- 最接近當前價格的支撐和壓力位會使用更粗的線條
- 使用虛線樣式（5 5）以區別於其他價位
- 標籤使用加粗字體和較大字號

## 需求對應

- **需求 7.4**：當多個支撐或壓力位接近（價格差異小於 3%）時，系統會合併為強支撐或強壓力區域
- **需求 7.5**：當目前股價接近支撐或壓力位時，系統會高亮顯示並提供交易建議
- **需求 7.6**：在價格圖表上標示所有關鍵價位

## 技術細節

### 依賴項
- `recharts`: 圖表渲染庫
- `decimal.js`: 高精度數值計算（在 service 層使用）

### 效能考量
- 支援大量資料點的渲染
- 使用 ResponsiveContainer 自適應容器大小
- 線條數量建議控制在 10 條以內以保持圖表清晰

### 瀏覽器支援
- 現代瀏覽器（Chrome, Firefox, Safari, Edge）
- 需要支援 ES6+ 語法

## 相關元件

- `IndicatorChart`: 通用技術指標圖表元件
- `FibonacciDrawingTool`: 費波那契繪圖工具
- `BollingerBandsChart`: 布林通道圖表

## 相關服務

- `SupportResistanceService`: 支撐壓力位計算服務
  - `calculateLevels()`: 計算支撐壓力位
  - `findGoldenRatioLevels()`: 基於黃金分割計算關鍵價位
  - `mergeNearbyLevels()`: 合併接近的價位

## 注意事項

1. **資料格式**：確保價格資料按時間順序排列
2. **精度處理**：價格計算使用 Decimal.js 確保精度，顯示時轉換為 number
3. **效能優化**：大量資料時建議使用資料抽樣或分頁
4. **顏色對比**：確保支撐和壓力位顏色有足夠對比度

## 未來改進

- [ ] 支援自訂顏色主題
- [ ] 支援互動式調整支撐壓力位
- [ ] 支援匯出圖表為圖片
- [ ] 支援更多線條樣式選項
