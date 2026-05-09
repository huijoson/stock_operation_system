import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { PortfolioTrendDatum } from '@/lib/dashboard/chart-data'

interface PortfolioTrendChartProps {
  data: PortfolioTrendDatum[]
}

export default function PortfolioTrendChart({ data }: PortfolioTrendChartProps) {
  const hasTrend = data.length >= 2

  return (
    <section className="rounded-2xl border border-gray-700 bg-gray-800 p-6 shadow-lg">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-300">Trend</p>
          <h3 className="text-xl font-semibold text-white">投資組合市值趨勢</h3>
          <p className="mt-1 text-sm text-gray-400">觀察整體持股市值是否穩定上升或轉弱。</p>
        </div>
        <span className="mt-3 inline-flex w-fit rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-200 sm:mt-0">
          近 30 日
        </span>
      </div>

      {!hasTrend ? (
        <div className="mt-6 flex min-h-[260px] items-center justify-center rounded-xl border border-dashed border-gray-600 px-6 text-center text-gray-300">
          目前沒有足夠的歷史價格資料可顯示趨勢線
        </div>
      ) : (
        <div className="mt-6 h-[320px]">
          <ResponsiveContainer
            width="100%"
            height="100%"
            initialDimension={{ width: 640, height: 320 }}
          >
            <LineChart data={data} margin={{ top: 12, right: 24, bottom: 12, left: 12 }}>
              <CartesianGrid stroke="#334155" strokeDasharray="4 8" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 12 }} tickLine={false} />
              <YAxis
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                tickFormatter={(value: number) => `$${compactNumber(value)}`}
                tickLine={false}
                axisLine={false}
                width={80}
              />
              <Tooltip
                formatter={(value: number) => [`$${formatCurrency(value)}`, '總市值']}
                labelStyle={{ color: '#e5e7eb' }}
                contentStyle={{
                  background: '#111827',
                  border: '1px solid #374151',
                  borderRadius: '12px',
                  color: '#f9fafb',
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                name="總市值"
                stroke="#22c55e"
                strokeWidth={3}
                dot={{ r: 3, fill: '#22c55e', strokeWidth: 0 }}
                activeDot={{ r: 6, fill: '#86efac', stroke: '#14532d', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  )
}

function formatCurrency(value: number): string {
  return value.toLocaleString('zh-TW', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function compactNumber(value: number): string {
  return value.toLocaleString('zh-TW', {
    notation: 'compact',
    maximumFractionDigits: 1,
  })
}
