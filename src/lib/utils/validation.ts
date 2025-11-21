/**
 * Form validation utilities
 */

export interface ValidationResult {
  isValid: boolean
  errors: Record<string, string>
}

/**
 * Validation rules
 */
export const validators = {
  /**
   * Validate required field
   */
  required: (value: any, fieldName: string = '此欄位'): string | null => {
    if (value === null || value === undefined || value === '') {
      return `${fieldName}為必填欄位`
    }
    if (typeof value === 'string' && value.trim() === '') {
      return `${fieldName}不可為空白`
    }
    return null
  },

  /**
   * Validate email format
   */
  email: (value: string): string | null => {
    if (!value) return null // Skip if empty (use required validator separately)
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value)) {
      return '電子郵件格式不正確'
    }
    return null
  },

  /**
   * Validate minimum length
   */
  minLength: (value: string, min: number, fieldName: string = '此欄位'): string | null => {
    if (!value) return null // Skip if empty
    
    if (value.length < min) {
      return `${fieldName}長度至少需要 ${min} 個字元`
    }
    return null
  },

  /**
   * Validate maximum length
   */
  maxLength: (value: string, max: number, fieldName: string = '此欄位'): string | null => {
    if (!value) return null // Skip if empty
    
    if (value.length > max) {
      return `${fieldName}長度不可超過 ${max} 個字元`
    }
    return null
  },

  /**
   * Validate minimum value
   */
  min: (value: number, min: number, fieldName: string = '此欄位'): string | null => {
    if (value === null || value === undefined) return null // Skip if empty
    
    if (value < min) {
      return `${fieldName}不可小於 ${min}`
    }
    return null
  },

  /**
   * Validate maximum value
   */
  max: (value: number, max: number, fieldName: string = '此欄位'): string | null => {
    if (value === null || value === undefined) return null // Skip if empty
    
    if (value > max) {
      return `${fieldName}不可大於 ${max}`
    }
    return null
  },

  /**
   * Validate positive number
   */
  positive: (value: number, fieldName: string = '此欄位'): string | null => {
    if (value === null || value === undefined) return null // Skip if empty
    
    if (value <= 0) {
      return `${fieldName}必須為正數`
    }
    return null
  },

  /**
   * Validate non-negative number
   */
  nonNegative: (value: number, fieldName: string = '此欄位'): string | null => {
    if (value === null || value === undefined) return null // Skip if empty
    
    if (value < 0) {
      return `${fieldName}不可為負數`
    }
    return null
  },

  /**
   * Validate pattern match
   */
  pattern: (value: string, pattern: RegExp, message: string): string | null => {
    if (!value) return null // Skip if empty
    
    if (!pattern.test(value)) {
      return message
    }
    return null
  },

  /**
   * Validate date is not in the future
   */
  notFuture: (value: Date | string, fieldName: string = '日期'): string | null => {
    if (!value) return null // Skip if empty
    
    const date = typeof value === 'string' ? new Date(value) : value
    const now = new Date()
    
    if (date > now) {
      return `${fieldName}不可為未來日期`
    }
    return null
  },

  /**
   * Validate date is not in the past
   */
  notPast: (value: Date | string, fieldName: string = '日期'): string | null => {
    if (!value) return null // Skip if empty
    
    const date = typeof value === 'string' ? new Date(value) : value
    const now = new Date()
    now.setHours(0, 0, 0, 0) // Start of today
    
    if (date < now) {
      return `${fieldName}不可為過去日期`
    }
    return null
  },
}

/**
 * Validate a single field with multiple rules
 */
export function validateField(
  value: any,
  rules: Array<(value: any) => string | null>
): string | null {
  for (const rule of rules) {
    const error = rule(value)
    if (error) {
      return error
    }
  }
  return null
}

/**
 * Validate multiple fields
 */
export function validateForm<T extends Record<string, any>>(
  values: T,
  rules: Record<keyof T, Array<(value: any) => string | null>>
): ValidationResult {
  const errors: Record<string, string> = {}

  for (const field in rules) {
    const fieldRules = rules[field]
    const error = validateField(values[field], fieldRules)
    if (error) {
      errors[field] = error
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}

/**
 * Common validation schemas
 */
export const validationSchemas = {
  /**
   * User registration validation
   */
  register: (values: { email: string; password: string; confirmPassword?: string }) => {
    const rules: Record<string, Array<(value: any) => string | null>> = {
      email: [
        (v) => validators.required(v, '電子郵件'),
        validators.email,
      ],
      password: [
        (v) => validators.required(v, '密碼'),
        (v) => validators.minLength(v, 6, '密碼'),
      ],
    }

    if (values.confirmPassword !== undefined) {
      rules.confirmPassword = [
        (v) => validators.required(v, '確認密碼'),
        (v) => v === values.password ? null : '密碼不一致',
      ]
    }

    return validateForm(values, rules)
  },

  /**
   * User login validation
   */
  login: (values: { email: string; password: string }) => {
    return validateForm(values, {
      email: [
        (v) => validators.required(v, '電子郵件'),
        validators.email,
      ],
      password: [
        (v) => validators.required(v, '密碼'),
      ],
    })
  },

  /**
   * Portfolio validation
   */
  portfolio: (values: { name: string }) => {
    return validateForm(values, {
      name: [
        (v) => validators.required(v, '投資組合名稱'),
        (v) => validators.maxLength(v, 100, '投資組合名稱'),
      ],
    })
  },

  /**
   * Transaction validation
   */
  transaction: (values: {
    symbol: string
    type: string
    quantity: number
    price: number
    date: Date | string
  }) => {
    return validateForm(values, {
      symbol: [
        (v) => validators.required(v, '股票代號'),
      ],
      type: [
        (v) => validators.required(v, '交易類型'),
      ],
      quantity: [
        (v) => validators.required(v, '數量'),
        (v) => validators.positive(v, '數量'),
      ],
      price: [
        (v) => validators.required(v, '價格'),
        (v) => validators.positive(v, '價格'),
      ],
      date: [
        (v) => validators.required(v, '日期'),
        (v) => validators.notFuture(v, '交易日期'),
      ],
    })
  },
}
