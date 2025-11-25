/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import IndicatorChart, { ChartDataPoint, DataSeries } from '../IndicatorChart'

/**
 * Unit tests for IndicatorChart component
 * 
 * Tests verify that the component renders correctly with different configurations
 * and handles edge cases appropriately.
 */

describe('IndicatorChart', () => {
  const mockData: ChartDataPoint[] = [
    { date: '2024-01-01', value: 100, volume: 1000 },
    { date: '2024-01-02', value: 105, volume: 1200 },
    { date: '2024-01-03', value: 103, volume: 1100 },
    { date: '2024-01-04', value: 108, volume: 1300 },
    { date: '2024-01-05', value: 110, volume: 1400 },
  ]

  const mockSeries: DataSeries[] = [
    { key: 'value', name: '價格', color: '#8884d8' },
  ]

  describe('Basic Rendering', () => {
    it('should render line chart with data', () => {
      render(
        <IndicatorChart
          data={mockData}
          type="line"
          series={mockSeries}
          title="測試圖表"
        />
      )

      expect(screen.getByText('測試圖表')).toBeInTheDocument()
    })

    it('should render without title', () => {
      const { container } = render(
        <IndicatorChart
          data={mockData}
          type="line"
          series={mockSeries}
        />
      )

      expect(container.querySelector('h3')).not.toBeInTheDocument()
    })

    it('should show error message when data is empty', () => {
      render(
        <IndicatorChart
          data={[]}
          type="line"
          series={mockSeries}
        />
      )

      expect(screen.getByText('資料不足，無法顯示圖表')).toBeInTheDocument()
    })

    it('should show error message when data is null', () => {
      render(
        <IndicatorChart
          data={null as any}
          type="line"
          series={mockSeries}
        />
      )

      expect(screen.getByText('資料不足，無法顯示圖表')).toBeInTheDocument()
    })
  })

  describe('Chart Types', () => {
    it('should render bar chart', () => {
      const { container } = render(
        <IndicatorChart
          data={mockData}
          type="bar"
          series={mockSeries}
        />
      )

      // Verify chart container exists
      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument()
    })

    it('should render composed chart', () => {
      const composedSeries: DataSeries[] = [
        { key: 'value', name: '價格', color: '#8884d8', type: 'line' },
        { key: 'volume', name: '成交量', color: '#82ca9d', type: 'bar', yAxisId: 'right' },
      ]

      const { container } = render(
        <IndicatorChart
          data={mockData}
          type="composed"
          series={composedSeries}
          rightYAxisLabel="成交量"
        />
      )

      // Verify chart container exists
      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument()
    })

    it('should render candlestick chart', () => {
      const candlestickData = [
        { date: '2024-01-01', open: 100, high: 105, low: 98, close: 103 },
        { date: '2024-01-02', open: 103, high: 108, low: 102, close: 107 },
        { date: '2024-01-03', open: 107, high: 110, low: 105, close: 106 },
      ]

      const { container } = render(
        <IndicatorChart
          data={candlestickData}
          type="candlestick"
        />
      )

      // Verify chart container exists
      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument()
    })
  })

  describe('Features', () => {
    it('should render with custom height', () => {
      const { container } = render(
        <IndicatorChart
          data={mockData}
          type="line"
          series={mockSeries}
          height={600}
        />
      )

      const responsiveContainer = container.querySelector('.recharts-responsive-container')
      expect(responsiveContainer).toBeInTheDocument()
    })

    it('should render with reference lines', () => {
      const referenceLines = [
        { value: 105, label: '上限', color: '#ff0000' },
        { value: 95, label: '下限', color: '#00ff00' },
      ]

      const { container } = render(
        <IndicatorChart
          data={mockData}
          type="line"
          series={mockSeries}
          referenceLines={referenceLines}
        />
      )

      // Verify chart renders with reference lines config
      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument()
    })

    it('should render with brush when enabled', () => {
      const { container } = render(
        <IndicatorChart
          data={mockData}
          type="line"
          series={mockSeries}
          enableBrush={true}
        />
      )

      // Verify chart renders with brush config
      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument()
    })

    it('should not render brush when disabled', () => {
      const { container } = render(
        <IndicatorChart
          data={mockData}
          type="line"
          series={mockSeries}
          enableBrush={false}
        />
      )

      expect(container.querySelector('.recharts-brush')).not.toBeInTheDocument()
    })

    it('should render with grid when enabled', () => {
      const { container } = render(
        <IndicatorChart
          data={mockData}
          type="line"
          series={mockSeries}
          showGrid={true}
        />
      )

      // Verify chart renders with grid config
      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument()
    })

    it('should not render grid when disabled', () => {
      const { container } = render(
        <IndicatorChart
          data={mockData}
          type="line"
          series={mockSeries}
          showGrid={false}
        />
      )

      expect(container.querySelector('.recharts-cartesian-grid')).not.toBeInTheDocument()
    })

    it('should render legend when enabled', () => {
      const { container } = render(
        <IndicatorChart
          data={mockData}
          type="line"
          series={mockSeries}
          showLegend={true}
        />
      )

      // Verify chart renders with legend config
      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument()
    })

    it('should not render legend when disabled', () => {
      const { container } = render(
        <IndicatorChart
          data={mockData}
          type="line"
          series={mockSeries}
          showLegend={false}
        />
      )

      expect(container.querySelector('.recharts-legend-wrapper')).not.toBeInTheDocument()
    })
  })

  describe('Multiple Series', () => {
    it('should render multiple line series', () => {
      const multiData = [
        { date: '2024-01-01', price: 100, ma5: 98, ma10: 95 },
        { date: '2024-01-02', price: 105, ma5: 100, ma10: 97 },
        { date: '2024-01-03', price: 103, ma5: 102, ma10: 99 },
      ]

      const multiSeries: DataSeries[] = [
        { key: 'price', name: '價格', color: '#8884d8' },
        { key: 'ma5', name: 'MA5', color: '#82ca9d' },
        { key: 'ma10', name: 'MA10', color: '#ffc658' },
      ]

      const { container } = render(
        <IndicatorChart
          data={multiData}
          type="line"
          series={multiSeries}
        />
      )

      // Verify chart renders with multiple series
      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument()
    })

    it('should render series with different y-axes', () => {
      const dualAxisData = [
        { date: '2024-01-01', price: 100, volume: 1000 },
        { date: '2024-01-02', price: 105, volume: 1200 },
      ]

      const dualAxisSeries: DataSeries[] = [
        { key: 'price', name: '價格', color: '#8884d8', yAxisId: 'left' },
        { key: 'volume', name: '成交量', color: '#82ca9d', yAxisId: 'right' },
      ]

      const { container } = render(
        <IndicatorChart
          data={dualAxisData}
          type="line"
          series={dualAxisSeries}
          yAxisLabel="價格"
          rightYAxisLabel="成交量"
        />
      )

      // Verify chart renders with dual axes
      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument()
    })
  })

  describe('Axis Labels', () => {
    it('should render with x-axis label', () => {
      const { container } = render(
        <IndicatorChart
          data={mockData}
          type="line"
          series={mockSeries}
          xAxisLabel="日期"
        />
      )

      // Verify chart renders with x-axis label config
      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument()
    })

    it('should render with y-axis label', () => {
      const { container } = render(
        <IndicatorChart
          data={mockData}
          type="line"
          series={mockSeries}
          yAxisLabel="價格"
        />
      )

      // Verify chart renders with y-axis label config
      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument()
    })

    it('should render with both axis labels', () => {
      const { container } = render(
        <IndicatorChart
          data={mockData}
          type="line"
          series={mockSeries}
          xAxisLabel="日期"
          yAxisLabel="價格"
        />
      )

      // Verify chart renders with both axis labels config
      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument()
    })
  })
})
