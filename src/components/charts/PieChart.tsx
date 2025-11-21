'use client'

import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

interface PieChartData {
  name: string
  value: number
  percentage: number
  [key: string]: any
}

interface PieChartProps {
  data: PieChartData[]
  title?: string
}

const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8',
  '#82CA9D', '#FFC658', '#FF6B9D', '#C084FC', '#34D399',
  '#F59E0B', '#EF4444', '#3B82F6', '#10B981', '#F97316',
]

export default function PieChart({ data, title }: PieChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <p>資料不足，無法顯示圖表</p>
      </div>
    )
  }

  if (data.length === 1) {
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
        <RechartsPieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={(entry: any) => `${entry.name} ${entry.percentage.toFixed(2)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number, name: string, props: any) => [
              `${value.toLocaleString('zh-TW', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${props.payload.percentage.toFixed(2)}%)`,
              name
            ]}
          />
          <Legend />
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  )
}
