'use client'

import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface LineChartData {
  date: string
  value: number
}

interface LineChartProps {
  data: LineChartData[]
  title?: string
  xAxisLabel?: string
  yAxisLabel?: string
}

export default function LineChart({ data, title, xAxisLabel, yAxisLabel }: LineChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <p>資料不足，無法顯示圖表</p>
      </div>
    )
  }

  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <p>需要至少兩個資料點才能顯示圖表</p>
      </div>
    )
  }

  return (
    <div className="w-full">
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height={300}>
        <RechartsLineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: -5 } : undefined}
          />
          <YAxis
            label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft' } : undefined}
          />
          <Tooltip
            formatter={(value: number) =>
              value.toLocaleString('zh-TW', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            }
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#8884d8"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
            name="總市值"
          />
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  )
}
