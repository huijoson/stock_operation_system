import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PortfolioForm from './PortfolioForm'
import { PortfolioApi } from '@/services/portfolio.api'

interface Portfolio {
  id: string
  name: string
  userId: string
  createdAt: string
  updatedAt: string
}

interface PortfolioCardProps {
  portfolio: Portfolio
  onDelete: (id: string) => void
}

export default function PortfolioCard({ portfolio, onDelete }: PortfolioCardProps) {
  const navigate = useNavigate()
  const [isEditing, setIsEditing] = useState(false)

  const handleUpdate = async (name: string) => {
    try {
      await PortfolioApi.update(portfolio.id, { name })
      setIsEditing(false)
      window.location.reload()
    } catch (err: any) {
      alert(err.response?.data?.error || err.message)
    }
  }

  const handleView = () => {
    navigate(`/portfolios/${portfolio.id}`)
  }

  if (isEditing) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-transparent dark:border-gray-700 p-6">
        <PortfolioForm
          initialName={portfolio.name}
          onSubmit={handleUpdate}
          onCancel={() => setIsEditing(false)}
        />
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-transparent dark:border-gray-700 hover:shadow-lg transition p-6">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{portfolio.name}</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setIsEditing(true)}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm"
          >
            編輯
          </button>
          <button
            onClick={() => onDelete(portfolio.id)}
            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm"
          >
            刪除
          </button>
        </div>
      </div>

      <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        建立時間：{new Date(portfolio.createdAt).toLocaleDateString('zh-TW')}
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleView}
          className="flex-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 py-2 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50 transition"
        >
          查看詳情
        </button>
        <button
          onClick={() => navigate(`/transactions/${portfolio.id}`)}
          className="flex-1 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 py-2 rounded hover:bg-green-100 dark:hover:bg-green-900/50 transition"
        >
          交易記錄
        </button>
      </div>
    </div>
  )
}
