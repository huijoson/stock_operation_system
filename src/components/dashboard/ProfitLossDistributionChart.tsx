import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ProfitLossChartDatum } from '@/lib/dashboard/chart-data'

interface ProfitLossDistributionChartProps {
  data: ProfitLossChartDatum[]
}

export default function ProfitLossDistributionChart({ data }: ProfitLossDistributionChartProps) {
  if (data.length === 0) {
    return (
      <section className="rounded-2xl border border-gray-700 bg-gray-800 p-6 shadow-lg">
        <h3 className="text-xl font-semibold text-white">各持股損益分布</h3>
        <div className="mt-6 flex min-h-[260px] items-center justify-center rounded-xl border border-dashed border-gray-600 text-gray-300">
          目前沒有可顯示的損益資料
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-2xl border border-gray-700 bg-gray-800 p-6 shadow-lg">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-rose-300">Profit / Loss</p>
        <h3 className="text-xl font-semibold text-white">各持股損益分布</h3>
        <p className="text-sm text-gray-400">正損益用綠色、負損益用紅色，搭配數值列表避免只靠顏色判讀。</p>
      </div>

      <div className="mt-6 h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 12, right: 24, bottom: 12, left: 12 }}>
            <CartesianGrid stroke="#334155" strokeDasharray="4 8" vertical={false} />
            <XAxis dataKey="symbol" tick={{ fill: '#94a3b8', fontSize: 12 }} tickLine={false} />
            <YAxis
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              tickFormatter={(value: number) => `$${compactNumber(value)}`}
              tickLine={false}
              axisLine={false}
              width={80}
            />
            <Tooltip
              formatter={(value: number) => [formatSignedCurrency(value), '損益']}
              labelStyle={{ color: '#e5e7eb' }}
              contentStyle={{
                background: '#111827',
                border: '1px solid #374151',
                borderRadius: '12px',
                color: '#f9fafb',
              }}
            />
            <Bar dataKey="value" name="損益" radius={[10, 10, 0, 0]}>
              {data.map((entry) => (
                <Cell key={entry.symbol} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {data.map((item) => (
          <div
            key={item.symbol}
            className="flex items-center justify-between rounded-xl border border-gray-700 bg-gray-900/60 px-4 py-3"
          >
            <span className="font-semibold text-white">{item.symbol}</span>
            <span className={item.value >= 0 ? 'font-semibold text-emerald-300' : 'font-semibold text-rose-300'}>
              {formatSignedCurrency(item.value)}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}

function formatSignedCurrency(value: number): string {
  const absolute = Math.abs(value).toLocaleString('zh-TW', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `${value >= 0 ? '+' : '-'}$${absolute}`
}

function compactNumber(value: number): string {
  return value.toLocaleString('zh-TW', {
    notation: 'compact',
    maximumFractionDigits: 1,
  })
}

