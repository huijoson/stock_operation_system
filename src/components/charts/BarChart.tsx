import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'

interface BarChartData {
  name: string
  value: number
}

interface BarChartProps {
  data: BarChartData[]
  title?: string
  xAxisLabel?: string
  yAxisLabel?: string
}

export default function BarChart({ data, title, xAxisLabel, yAxisLabel }: BarChartProps) {
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
        <RechartsBarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="name"
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
          <Bar dataKey="value" name="損益" radius={[8, 8, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.value >= 0 ? '#10B981' : '#EF4444'} />
            ))}
          </Bar>
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  )
}
