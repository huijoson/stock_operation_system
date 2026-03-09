import { useState, useEffect, useRef } from 'react'
import { StockApi } from '@/services/stock.api'

interface Stock {
  id: string
  symbol: string
  name: string
  industry: string | null
}

interface StockSearchBarProps {
  onSelect: (stock: Stock) => void
  placeholder?: string
  className?: string
}

/**
 * StockSearchBar component
 * 
 * Provides autocomplete search functionality for stocks
 * Searches by symbol or name with minimum 2 characters
 */
export default function StockSearchBar({
  onSelect,
  placeholder = '搜尋股票代號或名稱...',
  className = '',
}: StockSearchBarProps) {
  const [keyword, setKeyword] = useState('')
  const [results, setResults] = useState<Stock[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const searchRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Search for stocks when keyword changes
  useEffect(() => {
    const searchStocks = async () => {
      // Don't search if keyword is too short
      if (keyword.trim().length < 2) {
        setResults([])
        setIsOpen(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const data = await StockApi.search<{ stocks: Stock[] }>(keyword)
        setResults(data.stocks || [])
        setIsOpen(true)
      } catch (err) {
        console.error('Error searching stocks:', err)
        setError('搜尋時發生錯誤')
        setResults([])
      } finally {
        setIsLoading(false)
      }
    }

    // Debounce search
    const timeoutId = setTimeout(searchStocks, 300)
    return () => clearTimeout(timeoutId)
  }, [keyword])

  const handleSelect = (stock: Stock) => {
    onSelect(stock)
    setKeyword('')
    setResults([])
    setIsOpen(false)
  }

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        
        {/* Loading Indicator */}
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {error && (
            <div className="px-4 py-3 text-red-600">
              {error}
            </div>
          )}

          {!error && results.length === 0 && !isLoading && (
            <div className="px-4 py-3 text-gray-500">
              查無股票
            </div>
          )}

          {!error && results.length > 0 && (
            <ul>
              {results.map((stock) => (
                <li
                  key={stock.id}
                  onClick={() => handleSelect(stock)}
                  className="px-4 py-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-gray-900">
                        {stock.symbol}
                      </div>
                      <div className="text-sm text-gray-600">
                        {stock.name}
                      </div>
                    </div>
                    {stock.industry && (
                      <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {stock.industry}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Hint Text */}
      {keyword.length > 0 && keyword.length < 2 && (
        <div className="mt-1 text-xs text-gray-500">
          請輸入至少 2 個字元進行搜尋
        </div>
      )}
    </div>
  )
}
