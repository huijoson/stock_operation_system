'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import PortfolioCard from '@/components/portfolio/PortfolioCard'
import PortfolioForm from '@/components/portfolio/PortfolioForm'

interface Portfolio {
  id: string
  name: string
  userId: string
  createdAt: string
  updatedAt: string
}

export default function PortfolioListPage() {
  const router = useRouter()
  const [portfolios, setPortfolios] = useState<Portfolio[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    fetchPortfolios()
  }, [])

  const fetchPortfolios = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/portfolios')
      
      if (response.status === 401) {
        router.push('/login')
        return
      }

      if (!response.ok) {
        throw new Error('Failed to fetch portfolios')
      }

      const data = await response.json()
      setPortfolios(data.portfolios)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (name: string) => {
    try {
      const response = await fetch('/api/portfolios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create portfolio')
      }

      await fetchPortfolios()
      setShowForm(false)
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('確定要刪除此投資組合嗎？所有相關的持股和交易記錄都會被刪除。')) {
      return
    }

    try {
      const response = await fetch(`/api/portfolios/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete portfolio')
      }

      await fetchPortfolios()
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
        {/* Navigation */}
        <div className="mb-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-blue-600 hover:text-blue-800 inline-flex items-center text-sm sm:text-base"
          >
            ← 返回儀表板
          </button>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">我的投資組合</h1>
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={() => router.push('/technical-analysis')}
              className="flex-1 sm:flex-none bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition text-sm sm:text-base"
            >
              技術分析
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="flex-1 sm:flex-none bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm sm:text-base"
            >
              新增投資組合
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
            <PortfolioForm
              onSubmit={handleCreate}
              onCancel={() => setShowForm(false)}
            />
          </div>
        )}

        {portfolios.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-base sm:text-lg">尚未建立任何投資組合</p>
            <p className="text-gray-400 mt-2 text-sm sm:text-base">點擊上方按鈕建立您的第一個投資組合</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {portfolios.map((portfolio) => (
              <PortfolioCard
                key={portfolio.id}
                portfolio={portfolio}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
