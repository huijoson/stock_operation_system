/**
 * IndicatorChart Usage Examples
 * 
 * This file demonstrates how to use the IndicatorChart component
 * with different configurations.
 */

import IndicatorChart, { ChartDataPoint, DataSeries } from './IndicatorChart'

// Example 1: Simple Line Chart
export function SimpleLineChartExample() {
  const data: ChartDataPoint[] = [
    { date: '2024-01-01', price: 100 },
    { date: '2024-01-02', price: 105 },
    { date: '2024-01-03', price: 103 },
    { date: '2024-01-04', price: 108 },
    { date: '2024-01-05', price: 110 },
  ]

  const series: DataSeries[] = [
    { key: 'price', name: '股價', color: '#8884d8' },
  ]

  return (
    <IndicatorChart
      data={data}
      type="line"
      series={series}
      title="股價走勢"
      xAxisLabel="日期"
      yAxisLabel="價格 (元)"
      enableBrush={true}
      showGrid={true}
      showLegend={true}
    />
  )
}

// Example 2: Multiple Line Series (Moving Averages)
export function MultipleLineSeriesExample() {
  const data: ChartDataPoint[] = [
    { date: '2024-01-01', price: 100, ma5: 98, ma10: 95 },
    { date: '2024-01-02', price: 105, ma5: 100, ma10: 97 },
    { date: '2024-01-03', price: 103, ma5: 102, ma10: 99 },
    { date: '2024-01-04', price: 108, ma5: 104, ma10: 101 },
    { date: '2024-01-05', price: 110, ma5: 106, ma10: 103 },
  ]

  const series: DataSeries[] = [
    { key: 'price', name: '股價', color: '#8884d8' },
    { key: 'ma5', name: 'MA5', color: '#82ca9d' },
    { key: 'ma10', name: 'MA10', color: '#ffc658' },
  ]

  return (
    <IndicatorChart
      data={data}
      type="line"
      series={series}
      title="股價與移動平均線"
      height={500}
    />
  )
}

// Example 3: Bar Chart (Volume)
export function BarChartExample() {
  const data: ChartDataPoint[] = [
    { date: '2024-01-01', volume: 1000 },
    { date: '2024-01-02', volume: 1200 },
    { date: '2024-01-03', volume: 1100 },
    { date: '2024-01-04', volume: 1300 },
    { date: '2024-01-05', volume: 1400 },
  ]

  const series: DataSeries[] = [
    { key: 'volume', name: '成交量', color: '#82ca9d' },
  ]

  return (
    <IndicatorChart
      data={data}
      type="bar"
      series={series}
      title="成交量"
      yAxisLabel="成交量 (張)"
    />
  )
}

// Example 4: Composed Chart (Price + Volume with Dual Axes)
export function ComposedChartExample() {
  const data: ChartDataPoint[] = [
    { date: '2024-01-01', price: 100, volume: 1000 },
    { date: '2024-01-02', price: 105, volume: 1200 },
    { date: '2024-01-03', price: 103, volume: 1100 },
    { date: '2024-01-04', price: 108, volume: 1300 },
    { date: '2024-01-05', price: 110, volume: 1400 },
  ]

  const series: DataSeries[] = [
    { key: 'price', name: '股價', color: '#8884d8', type: 'line', yAxisId: 'left' },
    { key: 'volume', name: '成交量', color: '#82ca9d', type: 'bar', yAxisId: 'right' },
  ]

  return (
    <IndicatorChart
      data={data}
      type="composed"
      series={series}
      title="股價與成交量"
      yAxisLabel="價格 (元)"
      rightYAxisLabel="成交量 (張)"
      height={500}
    />
  )
}

// Example 5: Chart with Reference Lines (RSI)
export function ChartWithReferenceLinesExample() {
  const data: ChartDataPoint[] = [
    { date: '2024-01-01', rsi: 45 },
    { date: '2024-01-02', rsi: 55 },
    { date: '2024-01-03', rsi: 65 },
    { date: '2024-01-04', rsi: 75 },
    { date: '2024-01-05', rsi: 68 },
  ]

  const series: DataSeries[] = [
    { key: 'rsi', name: 'RSI', color: '#8884d8' },
  ]

  const referenceLines = [
    { value: 70, label: '超買', color: '#ff0000', strokeDasharray: '3 3' },
    { value: 30, label: '超賣', color: '#00ff00', strokeDasharray: '3 3' },
  ]

  return (
    <IndicatorChart
      data={data}
      type="line"
      series={series}
      title="RSI 指標"
      yAxisLabel="RSI"
      referenceLines={referenceLines}
      height={400}
    />
  )
}

// Example 6: Candlestick Chart
export function CandlestickChartExample() {
  const data = [
    { date: '2024-01-01', open: 100, high: 105, low: 98, close: 103 },
    { date: '2024-01-02', open: 103, high: 108, low: 102, close: 107 },
    { date: '2024-01-03', open: 107, high: 110, low: 105, close: 106 },
    { date: '2024-01-04', open: 106, high: 112, low: 104, close: 111 },
    { date: '2024-01-05', open: 111, high: 115, low: 109, close: 113 },
  ]

  return (
    <IndicatorChart
      data={data}
      type="candlestick"
      title="K線圖"
      yAxisLabel="價格 (元)"
      height={500}
      enableBrush={true}
    />
  )
}

// Example 7: Minimal Configuration
export function MinimalChartExample() {
  const data: ChartDataPoint[] = [
    { date: '2024-01-01', value: 100 },
    { date: '2024-01-02', value: 105 },
    { date: '2024-01-03', value: 103 },
  ]

  const series: DataSeries[] = [
    { key: 'value', name: '數值', color: '#8884d8' },
  ]

  return <IndicatorChart data={data} series={series} />
}

// Example 8: Chart without Grid and Legend
export function CleanChartExample() {
  const data: ChartDataPoint[] = [
    { date: '2024-01-01', value: 100 },
    { date: '2024-01-02', value: 105 },
    { date: '2024-01-03', value: 103 },
  ]

  const series: DataSeries[] = [
    { key: 'value', name: '數值', color: '#8884d8' },
  ]

  return (
    <IndicatorChart
      data={data}
      series={series}
      showGrid={false}
      showLegend={false}
      enableBrush={false}
    />
  )
}
