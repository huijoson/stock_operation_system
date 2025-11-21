'use client'

interface Transaction {
  id: string
  portfolioId: string
  symbol: string
  type: string
  quantity: string
  price: string
  date: string
  createdAt: string
}

interface TransactionTableProps {
  transactions: Transaction[]
  onDelete: (id: string) => void
  onEdit: (transaction: Transaction) => void
}

export default function TransactionTable({ transactions, onDelete, onEdit }: TransactionTableProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  const formatNumber = (value: string) => {
    return parseFloat(value).toLocaleString('zh-TW', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  const getTypeColor = (type: string) => {
    return type === 'BUY' ? 'text-green-600' : 'text-red-600'
  }

  const getTypeText = (type: string) => {
    return type === 'BUY' ? '買入' : '賣出'
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow">
        <p className="text-gray-500">尚無交易記錄</p>
      </div>
    )
  }

  return (
    <>
      {/* Desktop/Tablet Table View */}
      <div className="hidden sm:block bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  日期
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  股票代號
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  類型
                </th>
                <th className="px-4 lg:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  數量
                </th>
                <th className="px-4 lg:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  價格
                </th>
                <th className="px-4 lg:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  總金額
                </th>
                <th className="px-4 lg:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactions.map((transaction) => {
                const total = parseFloat(transaction.quantity) * parseFloat(transaction.price)
                return (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(transaction.date)}
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {transaction.symbol}
                    </td>
                    <td className={`px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-medium ${getTypeColor(transaction.type)}`}>
                      {getTypeText(transaction.type)}
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatNumber(transaction.quantity)}
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      ${formatNumber(transaction.price)}
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      ${formatNumber(total.toString())}
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => onEdit(transaction)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        編輯
                      </button>
                      <button
                        onClick={() => onDelete(transaction.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        刪除
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="sm:hidden space-y-4">
        {transactions.map((transaction) => {
          const total = parseFloat(transaction.quantity) * parseFloat(transaction.price)
          return (
            <div key={transaction.id} className="bg-white rounded-lg shadow p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{transaction.symbol}</h3>
                  <p className="text-xs text-gray-500">{formatDate(transaction.date)}</p>
                </div>
                <span className={`text-sm font-semibold ${getTypeColor(transaction.type)}`}>
                  {getTypeText(transaction.type)}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                <div>
                  <p className="text-gray-500 text-xs">數量</p>
                  <p className="font-medium text-gray-900">{formatNumber(transaction.quantity)}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">價格</p>
                  <p className="font-medium text-gray-900">${formatNumber(transaction.price)}</p>
                </div>
              </div>
              
              <div className="pt-3 border-t border-gray-200 flex justify-between items-center">
                <div>
                  <p className="text-xs text-gray-500">總金額</p>
                  <p className="text-base font-bold text-gray-900">${formatNumber(total.toString())}</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => onEdit(transaction)}
                    className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                  >
                    編輯
                  </button>
                  <button
                    onClick={() => onDelete(transaction.id)}
                    className="text-red-600 hover:text-red-900 text-sm font-medium"
                  >
                    刪除
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
