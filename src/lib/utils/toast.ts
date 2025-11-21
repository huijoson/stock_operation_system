import toast from 'react-hot-toast'

/**
 * Toast notification utilities
 * Provides consistent toast messages across the application
 */

export const showToast = {
  /**
   * Show success toast
   */
  success: (message: string) => {
    toast.success(message)
  },

  /**
   * Show error toast
   */
  error: (message: string) => {
    toast.error(message)
  },

  /**
   * Show loading toast
   * Returns a toast ID that can be used to dismiss or update the toast
   */
  loading: (message: string) => {
    return toast.loading(message)
  },

  /**
   * Show info toast
   */
  info: (message: string) => {
    toast(message, {
      icon: 'ℹ️',
    })
  },

  /**
   * Show warning toast
   */
  warning: (message: string) => {
    toast(message, {
      icon: '⚠️',
      style: {
        background: '#fef3c7',
        color: '#92400e',
      },
    })
  },

  /**
   * Dismiss a specific toast by ID
   */
  dismiss: (toastId: string) => {
    toast.dismiss(toastId)
  },

  /**
   * Dismiss all toasts
   */
  dismissAll: () => {
    toast.dismiss()
  },

  /**
   * Update an existing toast
   */
  update: (toastId: string, message: string, type: 'success' | 'error' | 'loading') => {
    if (type === 'success') {
      toast.success(message, { id: toastId })
    } else if (type === 'error') {
      toast.error(message, { id: toastId })
    } else {
      toast.loading(message, { id: toastId })
    }
  },

  /**
   * Show a promise toast that automatically updates based on promise state
   */
  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string
      success: string | ((data: T) => string)
      error: string | ((error: any) => string)
    }
  ) => {
    return toast.promise(promise, messages)
  },
}

/**
 * Common toast messages for the application
 */
export const toastMessages = {
  // Auth messages
  auth: {
    loginSuccess: '登入成功',
    loginError: '登入失敗，請檢查您的電子郵件和密碼',
    logoutSuccess: '登出成功',
    registerSuccess: '註冊成功',
    registerError: '註冊失敗',
    sessionExpired: '登入已過期，請重新登入',
  },

  // Portfolio messages
  portfolio: {
    createSuccess: '投資組合建立成功',
    createError: '投資組合建立失敗',
    updateSuccess: '投資組合更新成功',
    updateError: '投資組合更新失敗',
    deleteSuccess: '投資組合刪除成功',
    deleteError: '投資組合刪除失敗',
  },

  // Transaction messages
  transaction: {
    createSuccess: '交易記錄新增成功',
    createError: '交易記錄新增失敗',
    deleteSuccess: '交易記錄刪除成功',
    deleteError: '交易記錄刪除失敗',
    insufficientHoldings: '持股數量不足',
  },

  // Import/Export messages
  importExport: {
    importSuccess: (count: number) => `成功匯入 ${count} 筆交易記錄`,
    importError: 'CSV 匯入失敗',
    exportSuccess: '資料匯出成功',
    exportError: '資料匯出失敗',
  },

  // Stock messages
  stock: {
    searchError: '股票搜尋失敗',
    priceError: '無法取得股價資料',
  },

  // Generic messages
  generic: {
    saveSuccess: '儲存成功',
    saveError: '儲存失敗',
    deleteSuccess: '刪除成功',
    deleteError: '刪除失敗',
    loadError: '載入資料失敗',
    networkError: '網路連線錯誤，請稍後再試',
    unknownError: '發生未知錯誤',
  },
}
