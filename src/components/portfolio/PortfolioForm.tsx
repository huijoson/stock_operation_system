import { useState } from 'react'

interface PortfolioFormProps {
  initialName?: string
  onSubmit: (name: string) => Promise<void>
  onCancel: () => void
}

export default function PortfolioForm({ initialName = '', onSubmit, onCancel }: PortfolioFormProps) {
  const [name, setName] = useState(initialName)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate name
    if (!name.trim()) {
      setError('投資組合名稱不能為空')
      return
    }

    try {
      setLoading(true)
      setError(null)
      await onSubmit(name)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow border border-transparent dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {initialName ? '編輯投資組合' : '新增投資組合'}
      </h3>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="mb-4">
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          投資組合名稱
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700"
          placeholder="例如：長期投資、短期交易"
          disabled={loading}
        />
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-blue-600 dark:bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition disabled:bg-gray-400 dark:disabled:bg-gray-600"
        >
          {loading ? '處理中...' : initialName ? '更新' : '建立'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition disabled:bg-gray-100 dark:disabled:bg-gray-800"
        >
          取消
        </button>
      </div>
    </form>
  )
}
