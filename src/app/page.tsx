import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-4xl w-full text-center space-y-8">
        {/* Logo and Title */}
        <div className="space-y-4">
          <div className="text-6xl mb-4">📈</div>
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
            股市投資組合管理系統
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            追蹤、管理和分析你的股票投資組合
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-12">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-transparent dark:border-gray-700">
            <div className="text-3xl mb-3">💼</div>
            <h3 className="font-semibold text-lg mb-2 dark:text-white">投資組合管理</h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              建立多個投資組合，分別追蹤不同的投資策略
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-transparent dark:border-gray-700">
            <div className="text-3xl mb-3">📊</div>
            <h3 className="font-semibold text-lg mb-2 dark:text-white">即時分析</h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              查看損益、報酬率和視覺化圖表分析
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-transparent dark:border-gray-700">
            <div className="text-3xl mb-3">📁</div>
            <h3 className="font-semibold text-lg mb-2 dark:text-white">資料匯入匯出</h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              支援 CSV 格式，輕鬆匯入券商交易記錄
            </p>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex gap-4 justify-center items-center">
          <Link
            to="/login"
            className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors shadow-md"
          >
            登入
          </Link>
          <Link
            to="/register"
            className="px-8 py-3 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-2 border-blue-600 dark:border-blue-500 rounded-lg font-semibold hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors"
          >
            註冊新帳號
          </Link>
        </div>

        {/* Additional Info */}
        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            專為台灣個人投資者設計 • 安全可靠 • 完全免費
          </p>
        </div>
      </div>
    </main>
  )
}
