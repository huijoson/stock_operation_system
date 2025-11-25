# RSIIndicator Component

## Overview
The RSIIndicator component displays the Relative Strength Index (RSI) technical indicator with visual highlighting for overbought and oversold zones, reference lines, and divergence signals.

## Features
✅ **RSI Line Chart** - Displays RSI values over time
✅ **Reference Lines** - Shows 30 (oversold), 50 (neutral), and 70 (overbought) levels
✅ **Highlighted Zones** - Visual highlighting for overbought (70-100) and oversold (0-30) regions
✅ **Divergence Signals** - Marks bullish and bearish divergences on the chart
✅ **Status Badge** - Shows current RSI value with color-coded status (overbought/oversold/neutral)
✅ **Interpretation Guide** - Displays a quick reference guide for RSI interpretation

## Requirements Validation
- ✅ **Requirement 3.3**: RSI > 70 marked as overbought with warning
- ✅ **Requirement 3.4**: RSI < 30 marked as oversold with prompt
- ✅ **Requirement 3.5**: Display line chart with 30 and 70 reference lines
- ✅ **Requirement 3.6**: Mark divergence signals

## Props

```typescript
interface RSIIndicatorProps {
  data: RSIDataPoint[]          // Array of RSI data points
  divergences?: Divergence[]    // Optional divergence signals
  title?: string                // Chart title (default: 'RSI 相對強弱指標')
  height?: number               // Chart height in pixels (default: 300)
}

interface RSIDataPoint {
  date: string                  // Date in string format
  rsi: number                   // RSI value (0-100)
  price?: number                // Optional price data
}

interface Divergence {
  startIndex: number            // Start index in data array
  endIndex: number              // End index in data array
  type: 'bullish' | 'bearish'   // Divergence type
  description: string           // Description of the divergence
}
```

## Usage

### Basic Usage
```tsx
import RSIIndicator from '@/components/charts/RSIIndicator'

const data = [
  { date: '2024-01-01', rsi: 45.2 },
  { date: '2024-01-02', rsi: 52.8 },
  { date: '2024-01-03', rsi: 72.4 }, // Overbought
  // ...
]

<RSIIndicator data={data} />
```

### With Divergences
```tsx
const divergences = [
  {
    startIndex: 4,
    endIndex: 8,
    type: 'bearish',
    description: '價格創新高但 RSI 未創新高，可能反轉向下'
  }
]

<RSIIndicator 
  data={data} 
  divergences={divergences}
  title="AAPL RSI 指標"
  height={400}
/>
```

## Visual Features

### Color Coding
- **Red (#ef4444)**: Overbought zone (RSI > 70)
- **Green (#10b981)**: Oversold zone (RSI < 30)
- **Blue (#3b82f6)**: RSI line
- **Gray (#6b7280)**: Neutral zone (30-70)

### Reference Lines
- **70 Line**: Overbought threshold (red dashed line)
- **50 Line**: Neutral level (gray dashed line)
- **30 Line**: Oversold threshold (green dashed line)

### Divergence Highlighting
- **Bullish Divergence**: Green shaded area with label
- **Bearish Divergence**: Red shaded area with label

## Interpretation Guide
The component includes a built-in interpretation guide at the bottom:
- **超買 (>70)**: Possible pullback
- **中性 (30-70)**: Normal range
- **超賣 (<30)**: Possible bounce

## Empty State
When no data is provided, the component displays a friendly message:
"資料不足，無法顯示 RSI 圖表"

## Dependencies
- recharts: For chart rendering
- React: Component framework
- Tailwind CSS: Styling

## Example File
See `RSIIndicator.example.tsx` for comprehensive usage examples.
