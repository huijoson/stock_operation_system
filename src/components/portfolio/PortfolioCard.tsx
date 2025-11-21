'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import PortfolioForm from './PortfolioForm'

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
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)

  const handleUpdate = async (name: string) => {
    try {
      const response = await fetch(`/api/portfolios/${portfolio.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update portfolio')
      }

      setIsEditing(false)
      window.location.reload()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleView = () => {
    router.push(`/portfolios/${portfolio.id}`)
  }

  if (isEditing) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <PortfolioForm
          initialName={portfolio.name}
          onSubmit={handleUpdate}
          onCancel={() => setIsEditing(false)}
        />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow hover:shadow-lg transition p-6">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-semibold text-gray-900">{portfolio.name}</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setIsEditing(true)}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            編輯
          </button>
          <button
            onClick={() => onDelete(portfolio.id)}
            className="text-red-600 hover:text-red-800 text-sm"
          >
            刪除
          </button>
        </div>
      </div>

      <div className="text-sm text-gray-500 mb-4">
        建立時間：{new Date(portfolio.createdAt).toLocaleDateString('zh-TW')}
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleView}
          className="flex-1 bg-blue-50 text-blue-600 py-2 rounded hover:bg-blue-100 transition"
        >
          查看詳情
        </button>
        <button
          onClick={() => router.push(`/transactions/${portfolio.id}`)}
          className="flex-1 bg-green-50 text-green-600 py-2 rounded hover:bg-green-100 transition"
        >
          交易記錄
        </button>
      </div>
    </div>
  )
}
