'use client'

import { useState } from 'react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Brush,
  ReferenceLine,
} from 'recharts'

// 圖表類型
export type ChartType = 'line' | 'bar' | 'candlestick' | 'composed'

// 資料點介面
export interface ChartDataPoint {
  date: string
  [key: string]: any
}

// K線資料介面
export interface CandlestickData extends ChartDataPoint {
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

// 資料系列配置
export interface DataSeries {
  key: string
  name: string
  color: string
  type?: 'line' | 'bar'
  yAxisId?: 'left' | 'right'
}

// 參考線配置
export interface ReferenceLine {
  value: number
  label?: string
  color?: string
  strokeDasharray?: string
}

// 圖表屬性
export interface IndicatorChartProps {
  data: ChartDataPoint[]
  type?: ChartType
  series?: DataSeries[]
  title?: string
  height?: number
  xAxisLabel?: string
  yAxisLabel?: string
  rightYAxisLabel?: string
  enableZoom?: boolean
  enableBrush?: boolean
  referenceLines?: ReferenceLine[]
  showGrid?: boolean
  showLegend?: boolean
}

// K線形狀元件
const CandlestickShape = (props: any) => {
  const { x, y, width, height, payload } = props
  
  if (!payload || !payload.open || !payload.close || !payload.high || !payload.low) {
    return null
  }

  const { open, close, high, low } = payload
  const isUp = close >= open
  const color = isUp ? '#10B981' : '#EF4444'
  const bodyHeight = Math.abs(close - open)
  const bodyY = Math.min(open, close)

  // 計算 Y 軸比例
  const yScale = height / (Math.max(...props.data.map((d: any) => d.high)) - Math.min(...props.data.map((d: any) => d.low)))
  
  return (
    <g>
      {/* 上影線 */}
      <line
        x1={x + width / 2}
        y1={y + (high - Math.max(open, close)) * yScale}
        x2={x + width / 2}
        y2={y + (high - high) * yScale}
        stroke={color}
        strokeWidth={1}
      />
      {/* 下影線 */}
      <line
        x1={x + width / 2}
        y1={y + (high - Math.min(open, close)) * yScale}
        x2={x + width / 2}
        y2={y + (high - low) * yScale}
        stroke={color}
        strokeWidth={1}
      />
      {/* K線實體 */}
      <rect
        x={x + width * 0.2}
        y={y + (high - Math.max(open, close)) * yScale}
        width={width * 0.6}
        height={Math.max(bodyHeight * yScale, 1)}
        fill={isUp ? color : color}
        stroke={color}
        strokeWidth={1}
      />
    </g>
  )
}

// 自訂 Tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) {
    return null
  }

  return (
    <div className="bg-white p-3 border border-gray-300 rounded shadow-lg">
      <p className="font-semibold text-sm mb-2">{label}</p>
      {payload.map((entry: any, index: number) => (
        <p key={index} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {typeof entry.value === 'number' 
            ? entry.value.toLocaleString('zh-TW', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : entry.value}
        </p>
      ))}
    </div>
  )
}

export default function IndicatorChart({
  data,
  type = 'line',
  series = [],
  title,
  height = 400,
  xAxisLabel,
  yAxisLabel,
  rightYAxisLabel,
  enableZoom = true,
  enableBrush = true,
  referenceLines = [],
  showGrid = true,
  showLegend = true,
}: IndicatorChartProps) {
  const [zoomDomain, setZoomDomain] = useState<[number, number] | null>(null)

  // 資料驗證
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center text-gray-500" style={{ height }}>
        <p>資料不足，無法顯示圖表</p>
      </div>
    )
  }

  // 渲染折線圖
  const renderLineChart = () => (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" />}
        <XAxis
          dataKey="date"
          label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: -5 } : undefined}
        />
        <YAxis
          yAxisId="left"
          label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft' } : undefined}
        />
        {rightYAxisLabel && (
          <YAxis
            yAxisId="right"
            orientation="right"
            label={{ value: rightYAxisLabel, angle: 90, position: 'insideRight' }}
          />
        )}
        <Tooltip content={<CustomTooltip />} />
        {showLegend && <Legend />}
        
        {/* 參考線 */}
        {referenceLines.map((line, index) => (
          <ReferenceLine
            key={index}
            y={line.value}
            yAxisId="left"
            stroke={line.color || '#999'}
            strokeDasharray={line.strokeDasharray || '3 3'}
            label={line.label}
          />
        ))}
        
        {/* 資料系列 */}
        {series.map((s, index) => (
          <Line
            key={index}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stroke={s.color}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
            yAxisId={s.yAxisId || 'left'}
          />
        ))}
        
        {/* 縮放刷 */}
        {enableBrush && <Brush dataKey="date" height={30} stroke="#8884d8" />}
      </LineChart>
    </ResponsiveContainer>
  )

  // 渲染柱狀圖
  const renderBarChart = () => (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" />}
        <XAxis
          dataKey="date"
          label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: -5 } : undefined}
        />
        <YAxis
          yAxisId="left"
          label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft' } : undefined}
        />
        {rightYAxisLabel && (
          <YAxis
            yAxisId="right"
            orientation="right"
            label={{ value: rightYAxisLabel, angle: 90, position: 'insideRight' }}
          />
        )}
        <Tooltip content={<CustomTooltip />} />
        {showLegend && <Legend />}
        
        {/* 參考線 */}
        {referenceLines.map((line, index) => (
          <ReferenceLine
            key={index}
            y={line.value}
            yAxisId="left"
            stroke={line.color || '#999'}
            strokeDasharray={line.strokeDasharray || '3 3'}
            label={line.label}
          />
        ))}
        
        {/* 資料系列 */}
        {series.map((s, index) => (
          <Bar
            key={index}
            dataKey={s.key}
            name={s.name}
            fill={s.color}
            yAxisId={s.yAxisId || 'left'}
          />
        ))}
        
        {/* 縮放刷 */}
        {enableBrush && <Brush dataKey="date" height={30} stroke="#8884d8" />}
      </BarChart>
    </ResponsiveContainer>
  )

  // 渲染組合圖（支援折線和柱狀混合）
  const renderComposedChart = () => (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" />}
        <XAxis
          dataKey="date"
          label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: -5 } : undefined}
        />
        <YAxis
          yAxisId="left"
          label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft' } : undefined}
        />
        {rightYAxisLabel && (
          <YAxis
            yAxisId="right"
            orientation="right"
            label={{ value: rightYAxisLabel, angle: 90, position: 'insideRight' }}
          />
        )}
        <Tooltip content={<CustomTooltip />} />
        {showLegend && <Legend />}
        
        {/* 參考線 */}
        {referenceLines.map((line, index) => (
          <ReferenceLine
            key={index}
            y={line.value}
            yAxisId="left"
            stroke={line.color || '#999'}
            strokeDasharray={line.strokeDasharray || '3 3'}
            label={line.label}
          />
        ))}
        
        {/* 資料系列 */}
        {series.map((s, index) => {
          if (s.type === 'bar') {
            return (
              <Bar
                key={index}
                dataKey={s.key}
                name={s.name}
                fill={s.color}
                yAxisId={s.yAxisId || 'left'}
              />
            )
          }
          return (
            <Line
              key={index}
              type="monotone"
              dataKey={s.key}
              name={s.name}
              stroke={s.color}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              yAxisId={s.yAxisId || 'left'}
            />
          )
        })}
        
        {/* 縮放刷 */}
        {enableBrush && <Brush dataKey="date" height={30} stroke="#8884d8" />}
      </ComposedChart>
    </ResponsiveContainer>
  )

  // 渲染 K線圖（簡化版本，使用柱狀圖模擬）
  const renderCandlestickChart = () => {
    // 為 K線圖準備資料
    const candlestickData = data.map((d: any) => ({
      ...d,
      range: [d.low, d.high],
      body: [Math.min(d.open, d.close), Math.max(d.open, d.close)],
      isUp: d.close >= d.open,
    }))

    return (
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={candlestickData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" />}
          <XAxis
            dataKey="date"
            label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: -5 } : undefined}
          />
          <YAxis
            label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft' } : undefined}
          />
          <Tooltip content={<CustomTooltip />} />
          {showLegend && <Legend />}
          
          {/* 參考線 */}
          {referenceLines.map((line, index) => (
            <ReferenceLine
              key={index}
              y={line.value}
              stroke={line.color || '#999'}
              strokeDasharray={line.strokeDasharray || '3 3'}
              label={line.label}
            />
          ))}
          
          {/* K線實體（使用柱狀圖） */}
          <Bar dataKey="body" fill="#8884d8" name="K線">
            {candlestickData.map((entry: any, index: number) => (
              <rect
                key={`bar-${index}`}
                fill={entry.isUp ? '#10B981' : '#EF4444'}
              />
            ))}
          </Bar>
          
          {/* 縮放刷 */}
          {enableBrush && <Brush dataKey="date" height={30} stroke="#8884d8" />}
        </ComposedChart>
      </ResponsiveContainer>
    )
  }

  // 根據類型選擇渲染方法
  const renderChart = () => {
    switch (type) {
      case 'bar':
        return renderBarChart()
      case 'candlestick':
        return renderCandlestickChart()
      case 'composed':
        return renderComposedChart()
      case 'line':
      default:
        return renderLineChart()
    }
  }

  return (
    <div className="w-full">
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      {renderChart()}
    </div>
  )
}
