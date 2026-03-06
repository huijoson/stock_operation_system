import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import TransactionTable from '@/components/transactions/TransactionTable'
import TransactionForm from '@/components/transactions/TransactionForm'
import ImportDialog from '@/components/transactions/ImportDialog'
import ExportButton from '@/components/transactions/ExportButton'
import EditTransactionDialog from '@/components/transactions/EditTransactionDialog'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

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

export default function TransactionListPage() {
  const navigate = useNavigate()
  const params = useParams()
  const portfolioId = params.portfolioId as string

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [symbolFilter, setSymbolFilter] = useState<string>('')

  useEffect(() => {
    if (portfolioId) {
      fetchTransactions()
    }
  }, [portfolioId])

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/portfolios/${portfolioId}/transactions`)
      
      if (response.status === 401) {
        navigate('/login')
        return
      }

      if (!response.ok) {
        throw new Error('Failed to fetch transactions')
      }

      const data = await response.json()
      setTransactions(data.transactions)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (transaction: {
    symbol: string
    type: 'BUY' | 'SELL'
    quantity: number
    price: number
    date: string
  }) => {
    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portfolioId,
          ...transaction,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create transaction')
      }

      await fetchTransactions()
      setShowForm(false)
    } catch (err: any) {
      throw err
    }
  }

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction)
  }

  const handleUpdate = async (id: string, data: {
    type: 'BUY' | 'SELL'
    quantity: number
    price: number
    date: string
  }) => {
    try {
      const response = await fetch(`/api/transactions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update transaction')
      }

      await fetchTransactions()
      setEditingTransaction(null)
    } catch (err: any) {
      throw err
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('確定要刪除此交易記錄嗎？相關的持股數量和平均成本將會重新計算。')) {
      return
    }

    try {
      const response = await fetch(`/api/transactions/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete transaction')
      }

      await fetchTransactions()
    } catch (err: any) {
      alert(err.message)
    }
  }

  // Memoize filtered transactions to avoid duplicate filtering
  const filteredTransactions = useMemo(() => {
    if (!symbolFilter) return transactions
    return transactions.filter(t => t.symbol.toUpperCase().includes(symbolFilter))
  }, [transactions, symbolFilter])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-300">載入中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-4 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Navigation */}
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/portfolios')}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 inline-flex items-center text-sm sm:text-base"
          >
            ← 返回投資組合
          </button>
          <ThemeToggle />
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
          <div className="w-full sm:w-auto">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">交易記錄</h1>
          </div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <button
              onClick={() => navigate('/technical-analysis')}
              className="flex-1 sm:flex-none bg-indigo-600 dark:bg-indigo-500 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition text-sm sm:text-base"
            >
              技術分析
            </button>
            <ExportButton
              portfolioId={portfolioId}
              type="transactions"
              className="flex-1 sm:flex-none bg-purple-600 dark:bg-purple-500 hover:bg-purple-700 dark:hover:bg-purple-600"
            />
            <button
              onClick={() => setShowImportDialog(true)}
              className="flex-1 sm:flex-none bg-green-600 dark:bg-green-500 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition text-sm sm:text-base"
            >
              匯入 CSV
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex-1 sm:flex-none bg-blue-600 dark:bg-blue-500 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition text-sm sm:text-base"
            >
              {showForm ? '取消' : '新增交易'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-4 text-sm sm:text-base">
            {error}
          </div>
        )}

        {showForm && (
          <div className="mb-6 sm:mb-8">
            <TransactionForm
              portfolioId={portfolioId}
              onSubmit={handleCreate}
              onCancel={() => setShowForm(false)}
            />
          </div>
        )}

        {/* Symbol Filter */}
        <div className="mb-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-transparent dark:border-gray-700 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex-1">
                <label htmlFor="symbol-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  篩選股票代號
                </label>
                <input
                  id="symbol-filter"
                  type="text"
                  placeholder="輸入股票代號 (例如: TSM, AAPL)"
                  value={symbolFilter}
                  onChange={(e) => setSymbolFilter(e.target.value.toUpperCase())}
                  className="w-full sm:w-64 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm sm:text-base"
                />
              </div>
              {symbolFilter && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    顯示 {filteredTransactions.length} / {transactions.length} 筆交易
                  </span>
                  <button
                    onClick={() => setSymbolFilter('')}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 whitespace-nowrap"
                  >
                    清除篩選
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <TransactionTable 
          transactions={filteredTransactions} 
          onDelete={handleDelete}
          onEdit={handleEdit}
        />

        {editingTransaction && (
          <EditTransactionDialog
            transaction={editingTransaction}
            onClose={() => setEditingTransaction(null)}
            onSave={handleUpdate}
          />
        )}

        {showImportDialog && (
          <ImportDialog
            portfolioId={portfolioId}
            onClose={() => setShowImportDialog(false)}
            onSuccess={() => {
              fetchTransactions()
              setShowImportDialog(false)
            }}
          />
        )}
      </div>
    </div>
  )
}
