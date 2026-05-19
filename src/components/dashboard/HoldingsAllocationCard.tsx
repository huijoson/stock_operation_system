import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { AllocationChartDatum } from '@/lib/dashboard/chart-data'

interface HoldingsAllocationCardProps {
  data: AllocationChartDatum[]
}

export default function HoldingsAllocationCard({ data }: HoldingsAllocationCardProps) {
  const totalValue = data.reduce((sum, item) => sum + item.value, 0)

  if (data.length === 0) {
    return (
      <section className="rounded-2xl border border-gray-700 bg-gray-800 p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-white">持股市值佔比</h3>
        <div className="mt-6 flex min-h-[280px] items-center justify-center rounded-xl border border-dashed border-gray-600 text-gray-300">
          目前沒有可顯示的持股市值資料
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-2xl border border-gray-700 bg-gray-800 p-6 shadow-lg">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-blue-300">Allocation</p>
        <h3 className="text-xl font-semibold text-white">持股市值佔比</h3>
        <p className="text-sm text-gray-400">用排行列表取代擁擠標籤，快速比較每檔持股權重。</p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(280px,0.9fr)_minmax(360px,1.1fr)]">
        <div className="relative h-[340px]">
          <ResponsiveContainer
            width="100%"
            height="100%"
            initialDimension={{ width: 340, height: 340 }}
          >
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="symbol"
                cx="50%"
                cy="50%"
                innerRadius={82}
                outerRadius={128}
                paddingAngle={2}
                stroke="#111827"
                strokeWidth={3}
              >
                {data.map((entry) => (
                  <Cell key={entry.symbol} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [
                  `$${formatCurrency(value)}`,
                  name,
                ]}
                contentStyle={{
                  background: '#111827',
                  border: '1px solid #374151',
                  borderRadius: '12px',
                  color: '#f9fafb',
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-sm text-gray-400">總市值</span>
            <span className="mt-1 text-2xl font-bold text-white">${formatCurrency(totalValue)}</span>
            <span className="mt-1 text-xs text-gray-500">{data.length} 檔持股</span>
          </div>
        </div>

        <div className="space-y-3">
          {data.map((item) => (
            <div
              key={item.symbol}
              className="rounded-xl border border-gray-700 bg-gray-900/60 px-4 py-3"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                    aria-hidden="true"
                  />
                  <span className="font-semibold text-white">{item.symbol}</span>
                </div>
                <span className="text-sm font-semibold text-blue-200">
                  {item.percentage.toFixed(2)}%
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-700">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(item.percentage, 100)}%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>
              <div className="mt-2 text-right text-sm text-gray-300">
                ${formatCurrency(item.value)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function formatCurrency(value: number): string {
  return value.toLocaleString('zh-TW', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
