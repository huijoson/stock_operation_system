# 錯誤處理和使用者體驗優化指南

本文件說明如何使用新實作的錯誤處理和使用者體驗功能。

## 1. 錯誤處理

### 1.1 使用 ApplicationError

在服務層拋出標準化的錯誤：

```typescript
import { ErrorFactory } from '@/types/errors'

// 拋出特定錯誤
throw ErrorFactory.invalidCredentials()
throw ErrorFactory.portfolioNotFound(portfolioId)
throw ErrorFactory.insufficientHoldings(symbol, available, requested)
```

### 1.2 API 路由錯誤處理

使用 `withErrorHandler` 包裝 API 路由：

```typescript
import { withErrorHandler } from '@/lib/api/error-handler'
import { ErrorFactory } from '@/types/errors'

export const POST = withErrorHandler(async (request: NextRequest) => {
  // 驗證輸入
  if (!email) {
    throw ErrorFactory.invalidInput('電子郵件為必填欄位')
  }

  // 業務邏輯
  const result = await someService.doSomething()

  return NextResponse.json(result)
})
```

### 1.3 前端錯誤邊界

ErrorBoundary 已自動包裹整個應用程式，會捕捉 React 元件中的錯誤。

自訂錯誤顯示：

```typescript
<ErrorBoundary fallback={<CustomErrorUI />}>
  <YourComponent />
</ErrorBoundary>
```

## 2. 載入狀態

### 2.1 Loading 元件

```typescript
import { Loading, LoadingSkeleton, LoadingCard, LoadingTable } from '@/components/ui/Loading'

// 基本載入指示器
<Loading size="md" text="載入中..." />

// 全螢幕載入
<Loading fullScreen text="處理中..." />

// 骨架屏
<LoadingSkeleton className="h-4 w-full" />
<LoadingCard />
<LoadingTable rows={5} columns={4} />
```

### 2.2 LoadingButton

```typescript
import { LoadingButton } from '@/components/ui/Loading'

<LoadingButton
  loading={isSubmitting}
  onClick={handleSubmit}
  className="px-4 py-2 bg-blue-600 text-white rounded"
>
  提交
</LoadingButton>
```

### 2.3 useLoading Hook

```typescript
import { useLoading } from '@/hooks/useLoading'

function MyComponent() {
  const { isLoading, withLoading } = useLoading()

  const handleAction = async () => {
    await withLoading(async () => {
      // 執行非同步操作
      await fetchData()
    })
  }

  return (
    <div>
      {isLoading && <Loading />}
      <button onClick={handleAction}>執行</button>
    </div>
  )
}
```

## 3. Toast 通知

### 3.1 基本使用

```typescript
import { showToast, toastMessages } from '@/lib/utils/toast'

// 成功訊息
showToast.success('操作成功')
showToast.success(toastMessages.portfolio.createSuccess)

// 錯誤訊息
showToast.error('操作失敗')
showToast.error(toastMessages.auth.loginError)

// 警告訊息
showToast.warning('請注意')

// 資訊訊息
showToast.info('提示訊息')

// 載入訊息
const toastId = showToast.loading('處理中...')
// 稍後更新
showToast.update(toastId, '完成', 'success')
```

### 3.2 Promise Toast

自動根據 Promise 狀態更新 toast：

```typescript
showToast.promise(
  fetchData(),
  {
    loading: '載入中...',
    success: '載入成功',
    error: '載入失敗',
  }
)
```

### 3.3 在 API 呼叫中使用

```typescript
const handleSubmit = async () => {
  try {
    const response = await fetch('/api/portfolios', {
      method: 'POST',
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error('Failed')
    }

    showToast.success(toastMessages.portfolio.createSuccess)
  } catch (error) {
    showToast.error(toastMessages.portfolio.createError)
  }
}
```

## 4. 表單驗證

### 4.1 使用驗證工具

```typescript
import { validators, validateForm } from '@/lib/utils/validation'

// 單一欄位驗證
const emailError = validators.email('test@example.com')
const requiredError = validators.required(value, '欄位名稱')

// 多欄位驗證
const result = validateForm(
  { email, password },
  {
    email: [
      (v) => validators.required(v, '電子郵件'),
      validators.email,
    ],
    password: [
      (v) => validators.required(v, '密碼'),
      (v) => validators.minLength(v, 6, '密碼'),
    ],
  }
)

if (!result.isValid) {
  console.log(result.errors)
}
```

### 4.2 使用預定義的驗證 Schema

```typescript
import { validationSchemas } from '@/lib/utils/validation'

// 登入驗證
const result = validationSchemas.login({ email, password })

// 註冊驗證
const result = validationSchemas.register({ email, password, confirmPassword })

// 投資組合驗證
const result = validationSchemas.portfolio({ name })

// 交易驗證
const result = validationSchemas.transaction({ symbol, type, quantity, price, date })
```

### 4.3 使用 useFormValidation Hook

```typescript
import { useFormValidation } from '@/hooks/useFormValidation'
import { validationSchemas } from '@/lib/utils/validation'

function LoginForm() {
  const {
    values,
    getFieldProps,
    getFieldError,
    handleSubmit,
    isSubmitting,
  } = useFormValidation({
    initialValues: { email: '', password: '' },
    validate: validationSchemas.login,
    onSubmit: async (values) => {
      // 提交表單
      await login(values)
    },
  })

  return (
    <form onSubmit={handleSubmit}>
      <FormInput
        label="電子郵件"
        type="email"
        {...getFieldProps('email')}
        error={getFieldError('email')}
      />
      <FormInput
        label="密碼"
        type="password"
        {...getFieldProps('password')}
        error={getFieldError('password')}
      />
      <LoadingButton loading={isSubmitting} type="submit">
        登入
      </LoadingButton>
    </form>
  )
}
```

### 4.4 使用 FormInput 元件

```typescript
import { FormInput, FormSelect, FormTextarea } from '@/components/ui/FormInput'

<FormInput
  label="電子郵件"
  type="email"
  required
  error={errors.email}
  helperText="請輸入有效的電子郵件地址"
  {...otherProps}
/>

<FormSelect
  label="交易類型"
  required
  options={[
    { value: 'BUY', label: '買入' },
    { value: 'SELL', label: '賣出' },
  ]}
  error={errors.type}
  {...otherProps}
/>

<FormTextarea
  label="備註"
  rows={4}
  error={errors.note}
  {...otherProps}
/>
```

## 5. 完整範例

結合所有功能的完整表單範例：

```typescript
'use client'

import { useFormValidation } from '@/hooks/useFormValidation'
import { validationSchemas } from '@/lib/utils/validation'
import { FormInput } from '@/components/ui/FormInput'
import { LoadingButton } from '@/components/ui/Loading'
import { showToast, toastMessages } from '@/lib/utils/toast'

export function CreatePortfolioForm() {
  const {
    getFieldProps,
    getFieldError,
    handleSubmit,
    isSubmitting,
    resetForm,
  } = useFormValidation({
    initialValues: { name: '' },
    validate: validationSchemas.portfolio,
    onSubmit: async (values) => {
      try {
        const response = await fetch('/api/portfolios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error.message)
        }

        showToast.success(toastMessages.portfolio.createSuccess)
        resetForm()
      } catch (error) {
        showToast.error(
          error instanceof Error
            ? error.message
            : toastMessages.portfolio.createError
        )
      }
    },
  })

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormInput
        label="投資組合名稱"
        required
        {...getFieldProps('name')}
        error={getFieldError('name')}
        helperText="為您的投資組合取一個名稱"
      />

      <div className="flex gap-2">
        <LoadingButton
          type="submit"
          loading={isSubmitting}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          建立
        </LoadingButton>
        <button
          type="button"
          onClick={resetForm}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
        >
          重置
        </button>
      </div>
    </form>
  )
}
```

## 6. 最佳實踐

1. **錯誤處理**
   - 在服務層使用 `ErrorFactory` 拋出標準化錯誤
   - 在 API 路由使用 `withErrorHandler` 統一處理錯誤
   - 避免在前端直接顯示技術性錯誤訊息

2. **載入狀態**
   - 所有非同步操作都應顯示載入狀態
   - 使用骨架屏提升使用者體驗
   - 避免阻塞整個頁面，優先使用局部載入

3. **Toast 通知**
   - 使用預定義的訊息保持一致性
   - 成功操作使用簡短訊息
   - 錯誤訊息應提供有用的資訊
   - 避免過多的 toast 同時顯示

4. **表單驗證**
   - 使用即時驗證提供即時回饋
   - 在提交前進行完整驗證
   - 錯誤訊息應清楚說明問題
   - 使用 `helperText` 提供輸入提示
