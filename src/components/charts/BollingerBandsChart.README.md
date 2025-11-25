# BollingerBandsChart Component

## Overview
The BollingerBandsChart component displays Bollinger Bands technical indicator with price line, upper/middle/lower bands, and visual signals for price position, channel squeeze, and expansion states.

## Features
✅ **Price Line** - Displays stock price over time
✅ **Bollinger Bands** - Shows upper band, middle band (SMA), and lower band
✅ **Shaded Areas** - Visual highlighting for band regions
✅ **Price Position Detection** - Identifies when price is near upper/lower bands
✅ **Squeeze Detection** - Marks channel narrowing (consolidation state)
✅ **Expansion Detection** - Marks channel widening (increased volatility)
✅ **Status Badges** - Shows current price position and channel state
✅ **Interpretation Guide** - Displays quick reference for Bollinger Bands signals

## Requirements Validation
- ✅ **Requirement 5.2**: Price touching upper band marked as possible overbought/breakout
- ✅ **Requirement 5.3**: Price touching lower band marked as possible oversold/support
- ✅ **Requirement 5.4**: Channel narrowing marked as consolidation state
- ✅ **Requirement 5.5**: Channel widening marked as increased volatility
- ✅ **Requirement 5.6**: Display price line, middle band, upper band, lower band

## Props

```typescript
interface BollingerBandsChartProps {
  data: BollingerBandsDataPoint[]   // Array of Bollinger Bands data points
  title?: string                     // Chart title (default: '布林通道')
  height?: number                    // Chart height in pixels (default: 400)
  showBandwidth?: boolean            // Show bandwidth information (default: false)
  squeezeThreshold?: number          // Threshold for squeeze detection (optional)
  expansionThreshold?: number        // Threshold for expansion detection (optional)
}

interface BollingerBandsDataPoint {
  date: string                       // Date in string format
  price: number                      // Stock price
  upper: number                      // Upper band value
  middle: number                     // Middle band (SMA) value
  lower: number                      // Lower band value
  bandwidth?: number                 // Optional bandwidth (upper - lower)
}
```

## Usage

### Basic Usage
```tsx
import BollingerBandsChart from '@/components/charts/BollingerBandsChart'

const data = [
  { date: '2024-01-01', price: 100, upper: 105, middle: 100, lower: 95 },
  { date: '2024-01-02', price: 102, upper: 107, middle: 102, lower: 97 },
  { date: '2024-01-03', price: 104, upper: 109, middle: 104, lower: 99 },
  // ...
]

<BollingerBandsChart data={data} />
```

### With Squeeze Detection
```tsx
const dataWithBandwidth = [
  { date: '2024-01-01', price: 100, upper: 105, middle: 100, lower: 95, bandwidth: 10 },
  { date: '2024-01-02', price: 100.5, upper: 104, middle: 100, lower: 96, bandwidth: 8 },
  { date: '2024-01-03', price: 100.2, upper: 103, middle: 100, lower: 97, bandwidth: 6 },
  { date: '2024-01-04', price: 100.3, upper: 101.2, middle: 100, lower: 98.8, bandwidth: 2.4 },
  // ...
]

<BollingerBandsChart 
  data={dataWithBandwidth}
  showBandwidth={true}
  squeezeThreshold={3}
  title="AAPL 布林通道"
  height={500}
/>
```

### With Expansion Detection
```tsx
<BollingerBandsChart 
  data={dataWithBandwidth}
  showBandwidth={true}
  expansionThreshold={15}
  title="TSLA 布林通道"
/>
```

## Visual Features

### Color Coding
- **Blue (#3b82f6)**: Price line (solid)
- **Orange (#f59e0b)**: Middle band / SMA (dashed)
- **Red (#ef4444)**: Upper band (dashed) with light red shaded area
- **Green (#10b981)**: Lower band (dashed) with light green shaded area

### Price Position Badges
- **接近上軌 (Red)**: Price near upper band - possible overbought or breakout
- **接近下軌 (Green)**: Price near lower band - possible oversold or support
- **通道內 (Gray)**: Price within normal range

### Channel State Badges
- **通道收窄 (Yellow)**: Squeeze detected - consolidation state, possible breakout brewing
- **通道擴大 (Purple)**: Expansion detected - increased volatility, clear trend

## Price Position Detection
The component automatically detects price position:
- **Near Upper**: Price >= upper band - 10% of band range
- **Near Lower**: Price <= lower band + 10% of band range
- **Within Bands**: Price in normal range

## Squeeze & Expansion Detection
- **Squeeze**: Triggered when `bandwidth < squeezeThreshold`
- **Expansion**: Triggered when `bandwidth > expansionThreshold`

## Current Status Display
The component shows:
- Current price value
- Upper band value (red)
- Middle band/SMA value (orange)
- Lower band value (green)
- Bandwidth value (if available)
- Price position description
- Channel state (squeeze/expansion)

## Interpretation Guide
The component includes a built-in interpretation guide:
- **觸及上軌**: Possible overbought or upward breakout
- **觸及下軌**: Possible oversold or support
- **通道收窄**: Consolidation state, possible breakout brewing
- **通道擴大**: Increased volatility, clear trend

## Empty State
When no data is provided, the component displays:
"資料不足，無法顯示布林通道圖表"

## Dependencies
- recharts: For chart rendering (ComposedChart, Line, Area)
- React: Component framework
- Tailwind CSS: Styling

## Example File
See `BollingerBandsChart.example.tsx` for comprehensive usage examples including:
- Normal volatility
- Price near upper band
- Price near lower band
- Channel squeeze (consolidation)
- Channel expansion (increased volatility)
- Custom height
- Empty data state

## Technical Notes
- Uses ComposedChart to overlay Line and Area components
- Shaded areas provide visual context for band regions
- Responsive design adapts to container width
- Tooltip shows all values on hover
- Legend helps identify different lines
