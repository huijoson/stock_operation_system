/**
 * FibonacciDrawingTool Usage Examples
 * 
 * This file demonstrates how to use the FibonacciDrawingTool component
 * with different configurations.
 */

import FibonacciDrawingTool, { PriceDataPoint, FibonacciLevel } from './FibonacciDrawingTool'

// Example 1: Basic Fibonacci Retracement Tool
export function BasicFibonacciRetracementExample() {
  const data: PriceDataPoint[] = [
    { date: '2024-01-01', price: 100 },
    { date: '2024-01-02', price: 105 },
    { date: '2024-01-03', price: 110 },
    { date: '2024-01-04', price: 108 },
    { date: '2024-01-05', price: 112 },
    { date: '2024-01-06', price: 115 },
    { date: '2024-01-07', price: 113 },
    { date: '2024-01-08', price: 118 },
    { date: '2024-01-09', price: 116 },
    { date: '2024-01-10', price: 120 },
  ]

  const handleLevelsCalculated = (levels: FibonacciLevel[]) => {
    console.log('Calculated Fibonacci levels:', levels)
  }

  return (
    <FibonacciDrawingTool
      data={data}
      currentPrice={116}
      onLevelsCalculated={handleLevelsCalculated}
      height={500}
    />
  )
}

// Example 2: Fibonacci Tool with High/Low Data
export function FibonacciWithHighLowExample() {
  const data: PriceDataPoint[] = [
    { date: '2024-01-01', price: 100, high: 102, low: 98 },
    { date: '2024-01-02', price: 105, high: 107, low: 103 },
    { date: '2024-01-03', price: 110, high: 112, low: 108 },
    { date: '2024-01-04', price: 108, high: 111, low: 106 },
    { date: '2024-01-05', price: 112, high: 115, low: 110 },
    { date: '2024-01-06', price: 115, high: 118, low: 113 },
    { date: '2024-01-07', price: 113, high: 116, low: 111 },
    { date: '2024-01-08', price: 118, high: 120, low: 116 },
    { date: '2024-01-09', price: 116, high: 119, low: 114 },
    { date: '2024-01-10', price: 120, high: 122, low: 118 },
  ]

  return (
    <FibonacciDrawingTool
      data={data}
      currentPrice={118}
      height={600}
    />
  )
}

// Example 3: Fibonacci Extension Tool
export function FibonacciExtensionExample() {
  const data: PriceDataPoint[] = [
    { date: '2024-01-01', price: 100 },
    { date: '2024-01-02', price: 95 },
    { date: '2024-01-03', price: 90 },
    { date: '2024-01-04', price: 92 },
    { date: '2024-01-05', price: 95 },
    { date: '2024-01-06', price: 98 },
    { date: '2024-01-07', price: 102 },
    { date: '2024-01-08', price: 105 },
    { date: '2024-01-09', price: 108 },
    { date: '2024-01-10', price: 110 },
  ]

  return (
    <FibonacciDrawingTool
      data={data}
      currentPrice={108}
      height={500}
    />
  )
}

// Example 4: Downtrend Fibonacci Analysis
export function DowntrendFibonacciExample() {
  const data: PriceDataPoint[] = [
    { date: '2024-01-01', price: 120 },
    { date: '2024-01-02', price: 118 },
    { date: '2024-01-03', price: 115 },
    { date: '2024-01-04', price: 113 },
    { date: '2024-01-05', price: 110 },
    { date: '2024-01-06', price: 108 },
    { date: '2024-01-07', price: 105 },
    { date: '2024-01-08', price: 103 },
    { date: '2024-01-09', price: 100 },
    { date: '2024-01-10', price: 98 },
  ]

  return (
    <FibonacciDrawingTool
      data={data}
      currentPrice={100}
      height={500}
    />
  )
}

// Example 5: Real-time Price Update
export function RealTimeFibonacciExample() {
  const data: PriceDataPoint[] = [
    { date: '2024-01-01', price: 100 },
    { date: '2024-01-02', price: 105 },
    { date: '2024-01-03', price: 110 },
    { date: '2024-01-04', price: 108 },
    { date: '2024-01-05', price: 112 },
    { date: '2024-01-06', price: 115 },
    { date: '2024-01-07', price: 113 },
    { date: '2024-01-08', price: 118 },
    { date: '2024-01-09', price: 116 },
    { date: '2024-01-10', price: 120 },
  ]

  // Simulate real-time price updates
  const currentPrice = 117.5

  const handleLevelsCalculated = (levels: FibonacciLevel[]) => {
    // Check if current price is near any level
    const nearLevels = levels.filter(level => {
      const tolerance = 0.02
      return Math.abs(currentPrice - level.price) / level.price <= tolerance
    })

    if (nearLevels.length > 0) {
      console.log('Current price is near Fibonacci levels:', nearLevels)
    }
  }

  return (
    <FibonacciDrawingTool
      data={data}
      currentPrice={currentPrice}
      onLevelsCalculated={handleLevelsCalculated}
      height={500}
    />
  )
}

// Example 6: Compact Fibonacci Tool
export function CompactFibonacciExample() {
  const data: PriceDataPoint[] = [
    { date: '01/01', price: 100 },
    { date: '01/02', price: 105 },
    { date: '01/03', price: 110 },
    { date: '01/04', price: 108 },
    { date: '01/05', price: 112 },
  ]

  return (
    <FibonacciDrawingTool
      data={data}
      currentPrice={110}
      height={400}
    />
  )
}

// Example 7: Integration with Stock Data
export function StockFibonacciExample() {
  // Simulated stock data
  const data: PriceDataPoint[] = [
    { date: '2024-01-01', price: 580.5, high: 585.2, low: 578.3 },
    { date: '2024-01-02', price: 590.2, high: 595.8, low: 588.1 },
    { date: '2024-01-03', price: 595.8, high: 600.5, low: 592.3 },
    { date: '2024-01-04', price: 588.3, high: 596.2, low: 585.7 },
    { date: '2024-01-05', price: 592.5, high: 598.3, low: 590.1 },
    { date: '2024-01-08', price: 598.7, high: 605.2, low: 596.5 },
    { date: '2024-01-09', price: 602.3, high: 608.5, low: 600.1 },
    { date: '2024-01-10', price: 605.8, high: 610.3, low: 603.2 },
  ]

  const handleLevelsCalculated = (levels: FibonacciLevel[]) => {
    // Send levels to analytics or save to database
    console.log('Stock Fibonacci levels calculated:', levels)
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">台積電 (2330)</h3>
        <p className="text-sm text-blue-700">使用費波那契工具分析支撐壓力位</p>
      </div>
      <FibonacciDrawingTool
        data={data}
        currentPrice={605.8}
        onLevelsCalculated={handleLevelsCalculated}
        height={600}
      />
    </div>
  )
}
