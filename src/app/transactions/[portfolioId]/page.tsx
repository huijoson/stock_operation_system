'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import TransactionTable from '@/components/transactions/TransactionTable'
import TransactionForm from '@/components/transactions/TransactionForm'
import ImportDialog from '@/components/transactions/ImportDialog'
import ExportButton from '@/components/transactions/ExportButton'
import EditTransactionDialog from '@/components/transactions/EditTransactionDialog'

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
  const router = useRouter()
  const params = useParams()
  const portfolioId = params.portfolioId as string

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)

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
        router.push('/login')
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">載入中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
          <div className="w-full sm:w-auto">
            <button
              onClick={() => router.push('/portfolios')}
              className="text-blue-600 hover:text-blue-800 mb-2 flex items-center text-sm sm:text-base"
            >
              ← 返回投資組合
            </button>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">交易記錄</h1>
          </div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <button
              onClick={() => router.push('/technical-analysis')}
              className="flex-1 sm:flex-none bg-indigo-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-indigo-700 transition text-sm sm:text-base"
            >
              技術分析
            </button>
            <ExportButton
              portfolioId={portfolioId}
              type="transactions"
              className="flex-1 sm:flex-none bg-purple-600 hover:bg-purple-700"
            />
            <button
              onClick={() => setShowImportDialog(true)}
              className="flex-1 sm:flex-none bg-green-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm sm:text-base"
            >
              匯入 CSV
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex-1 sm:flex-none bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm sm:text-base"
            >
              {showForm ? '取消' : '新增交易'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 text-sm sm:text-base">
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

        <TransactionTable 
          transactions={transactions} 
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
