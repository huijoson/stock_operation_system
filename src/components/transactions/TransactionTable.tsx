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
      <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow border border-transparent dark:border-gray-700">
        <p className="text-gray-500 dark:text-gray-400">尚無交易記錄</p>
      </div>
    )
  }

  return (
    <>
      {/* Desktop/Tablet Table View */}
      <div className="hidden sm:block bg-white dark:bg-gray-800 rounded-lg shadow border border-transparent dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  日期
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  股票代號
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  類型
                </th>
                <th className="px-4 lg:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  數量
                </th>
                <th className="px-4 lg:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  價格
                </th>
                <th className="px-4 lg:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  總金額
                </th>
                <th className="px-4 lg:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {transactions.map((transaction) => {
                const total = parseFloat(transaction.quantity) * parseFloat(transaction.price)
                return (
                  <tr key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {formatDate(transaction.date)}
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                      {transaction.symbol}
                    </td>
                    <td className={`px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-medium ${getTypeColor(transaction.type)}`}>
                      {getTypeText(transaction.type)}
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 text-right">
                      {formatNumber(transaction.quantity)}
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 text-right">
                      ${formatNumber(transaction.price)}
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 text-right">
                      ${formatNumber(total.toString())}
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => onEdit(transaction)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 mr-4"
                      >
                        編輯
                      </button>
                      <button
                        onClick={() => onDelete(transaction.id)}
                        className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
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
            <div key={transaction.id} className="bg-white dark:bg-gray-800 rounded-lg shadow border border-transparent dark:border-gray-700 p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{transaction.symbol}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(transaction.date)}</p>
                </div>
                <span className={`text-sm font-semibold ${getTypeColor(transaction.type)}`}>
                  {getTypeText(transaction.type)}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs">數量</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{formatNumber(transaction.quantity)}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs">價格</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">${formatNumber(transaction.price)}</p>
                </div>
              </div>
              
              <div className="pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">總金額</p>
                  <p className="text-base font-bold text-gray-900 dark:text-white">${formatNumber(total.toString())}</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => onEdit(transaction)}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 text-sm font-medium"
                  >
                    編輯
                  </button>
                  <button
                    onClick={() => onDelete(transaction.id)}
                    className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 text-sm font-medium"
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
