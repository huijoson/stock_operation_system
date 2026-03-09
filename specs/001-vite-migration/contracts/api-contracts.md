# API 合約規格：Next.js 至 Vite 遷移

**Branch**: `001-vite-migration` | **Date**: 2025-07-17
**格式**: OpenAPI 3.0 簡化格式（Markdown 表示）

---

## 概述

本文件定義遷移後的 API 端點合約。所有端點維持相同的路徑、HTTP 方法與請求/回應格式，僅 handler 內部實作從 `NextRequest`/`NextResponse` 轉換為標準 Express handler。

**基礎 URL**: `/api`
**認證方式**: Cookie-based session token (`session_token`)
**內容類型**: `application/json`

---

## 通用模式

### 認證中間件

```yaml
# 所有標記 ✅ 認證的端點都經過此中間件
securitySchemes:
  sessionCookie:
    type: apiKey
    in: cookie
    name: session_token
    description: Session token set during login

# 中間件注入的 headers
x-middleware-headers:
  x-user-id: string     # 使用者 ID
  x-user-email: string  # 使用者 Email
```

### 標準錯誤回應

```yaml
ErrorResponse:
  type: object
  properties:
    error:
      type: string
      description: 錯誤訊息
    code:
      type: string
      description: 錯誤代碼 (optional)
  required: [error]

# HTTP 狀態碼對照
# 400 - Bad Request (驗證錯誤)
# 401 - Unauthorized (未認證)
# 403 - Forbidden (權限不足)
# 404 - Not Found (資源不存在)
# 500 - Internal Server Error (伺服器錯誤)
```

---

## Auth 端點

### POST /api/auth/login

```yaml
requestBody:
  content:
    application/json:
      schema:
        type: object
        properties:
          email: { type: string, format: email }
          password: { type: string, minLength: 8 }
        required: [email, password]
responses:
  200:
    description: 登入成功
    headers:
      Set-Cookie: session_token={token}; HttpOnly; SameSite=Strict
    content:
      application/json:
        schema:
          type: object
          properties:
            user:
              type: object
              properties:
                id: { type: string }
                email: { type: string }
                name: { type: string }
  401:
    description: 帳號或密碼錯誤
```

### POST /api/auth/register

```yaml
requestBody:
  content:
    application/json:
      schema:
        type: object
        properties:
          email: { type: string, format: email }
          password: { type: string, minLength: 8 }
          name: { type: string }
        required: [email, password, name]
responses:
  201:
    description: 註冊成功
  409:
    description: Email 已存在
```

### GET /api/auth/me

```yaml
security: [sessionCookie]
responses:
  200:
    content:
      application/json:
        schema:
          type: object
          properties:
            id: { type: string }
            email: { type: string }
            name: { type: string }
  401:
    description: 未認證
```

### POST /api/auth/logout

```yaml
security: [sessionCookie]
responses:
  200:
    description: 登出成功
    headers:
      Set-Cookie: session_token=; Max-Age=0
```

---

## Portfolios 端點

### GET /api/portfolios

```yaml
security: [sessionCookie]
responses:
  200:
    content:
      application/json:
        schema:
          type: array
          items:
            $ref: '#/components/schemas/Portfolio'
```

### POST /api/portfolios

```yaml
security: [sessionCookie]
requestBody:
  content:
    application/json:
      schema:
        type: object
        properties:
          name: { type: string }
          description: { type: string }
        required: [name]
responses:
  201:
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/Portfolio'
```

### GET /api/portfolios/:id

```yaml
security: [sessionCookie]
parameters:
  - name: id
    in: path
    required: true
    schema: { type: string }
responses:
  200:
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/PortfolioDetail'
  404:
    description: 投資組合不存在
```

### PUT /api/portfolios/:id

```yaml
security: [sessionCookie]
parameters:
  - name: id
    in: path
    required: true
requestBody:
  content:
    application/json:
      schema:
        type: object
        properties:
          name: { type: string }
          description: { type: string }
responses:
  200:
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/Portfolio'
```

### DELETE /api/portfolios/:id

```yaml
security: [sessionCookie]
responses:
  204:
    description: 刪除成功
```

### GET /api/portfolios/:id/holdings

```yaml
security: [sessionCookie]
responses:
  200:
    content:
      application/json:
        schema:
          type: array
          items:
            $ref: '#/components/schemas/Holding'
```

### GET /api/portfolios/:id/transactions

```yaml
security: [sessionCookie]
responses:
  200:
    content:
      application/json:
        schema:
          type: array
          items:
            $ref: '#/components/schemas/Transaction'
```

---

## Transactions 端點

### POST /api/transactions

```yaml
security: [sessionCookie]
requestBody:
  content:
    application/json:
      schema:
        type: object
        properties:
          portfolioId: { type: string }
          symbol: { type: string }
          type: { type: string, enum: [BUY, SELL] }
          quantity: { type: number }
          price: { type: number }
          date: { type: string, format: date-time }
          fee: { type: number }
        required: [portfolioId, symbol, type, quantity, price, date]
responses:
  201:
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/Transaction'
```

### PUT /api/transactions/:id

```yaml
security: [sessionCookie]
# Same schema as POST
responses:
  200:
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/Transaction'
```

### DELETE /api/transactions/:id

```yaml
security: [sessionCookie]
responses:
  204:
    description: 刪除成功
```

### GET /api/transactions/export

```yaml
security: [sessionCookie]
parameters:
  - name: portfolioId
    in: query
    schema: { type: string }
responses:
  200:
    content:
      text/csv:
        description: CSV 匯出
```

### POST /api/transactions/import

```yaml
security: [sessionCookie]
requestBody:
  content:
    multipart/form-data:
      schema:
        type: object
        properties:
          file: { type: string, format: binary }
          portfolioId: { type: string }
responses:
  200:
    content:
      application/json:
        schema:
          type: object
          properties:
            imported: { type: number }
            errors: { type: array }
```

---

## Stocks 端點

### GET /api/stocks/search

```yaml
security: [sessionCookie]
parameters:
  - name: q
    in: query
    required: true
    schema: { type: string }
responses:
  200:
    content:
      application/json:
        schema:
          type: array
          items:
            type: object
            properties:
              symbol: { type: string }
              name: { type: string }
              exchange: { type: string }
```

### GET /api/stocks/:symbol/price

```yaml
security: [sessionCookie]
responses:
  200:
    content:
      application/json:
        schema:
          type: object
          properties:
            symbol: { type: string }
            price: { type: number }
            change: { type: number }
            changePercent: { type: number }
```

### GET /api/stocks/:symbol/history

```yaml
security: [sessionCookie]
parameters:
  - name: period
    in: query
    schema: { type: string, enum: [1d, 5d, 1mo, 3mo, 6mo, 1y, 5y] }
responses:
  200:
    content:
      application/json:
        schema:
          type: array
          items:
            type: object
            properties:
              date: { type: string }
              open: { type: number }
              high: { type: number }
              low: { type: number }
              close: { type: number }
              volume: { type: number }
```

---

## Indicators 端點

所有技術指標端點遵循共同模式：

```yaml
# 共用參數
parameters:
  - name: symbol
    in: query
    required: true
    schema: { type: string }
  - name: period
    in: query
    schema: { type: string, default: '3mo' }
```

### GET /api/indicators/{type}

適用端點：`/atr`, `/macd`, `/rsi`, `/bollinger`, `/support-resistance`, `/technical-score`, `/candlestick-patterns`

```yaml
security: [sessionCookie]
responses:
  200:
    content:
      application/json:
        schema:
          type: object
          description: 各指標回傳特定資料結構
```

### GET /api/indicators/fibonacci/retracement

```yaml
security: [sessionCookie]
parameters:
  - name: symbol
    in: query
    required: true
  - name: high
    in: query
    required: true
    schema: { type: number }
  - name: low
    in: query
    required: true
    schema: { type: number }
responses:
  200:
    content:
      application/json:
        schema:
          type: object
          properties:
            levels:
              type: array
              items:
                type: object
                properties:
                  ratio: { type: number }
                  price: { type: number }
```

### GET /api/indicators/fibonacci/extension

```yaml
# Similar to retracement with additional 'mid' parameter
```

### GET|POST /api/indicators/cache/clear

```yaml
security: [sessionCookie]
responses:
  200:
    description: 快取已清除
```

---

## 其他端點

### Risk Assessment, Holding Advice, Strategies, News

這些端點群遵循相同的 RESTful 模式：
- 均需認證（除 `/api/news/sources` 外）
- 使用 JSON 請求/回應格式
- 路徑參數使用 `:symbol` 或 `:portfolioId`

詳細的請求/回應 schema 請參考 `backend/api-inventory.json` 與各 handler 的 TypeScript 型別定義。

---

## 共用型別定義

```yaml
components:
  schemas:
    Portfolio:
      type: object
      properties:
        id: { type: string }
        name: { type: string }
        description: { type: string, nullable: true }
        userId: { type: string }
        createdAt: { type: string, format: date-time }
        updatedAt: { type: string, format: date-time }

    PortfolioDetail:
      allOf:
        - $ref: '#/components/schemas/Portfolio'
        - type: object
          properties:
            holdings: { type: array, items: { $ref: '#/components/schemas/Holding' } }
            totalValue: { type: number }

    Holding:
      type: object
      properties:
        symbol: { type: string }
        name: { type: string }
        quantity: { type: number }
        avgCost: { type: number }
        currentPrice: { type: number }
        totalValue: { type: number }
        unrealizedPL: { type: number }
        unrealizedPLPercent: { type: number }

    Transaction:
      type: object
      properties:
        id: { type: string }
        portfolioId: { type: string }
        symbol: { type: string }
        type: { type: string, enum: [BUY, SELL] }
        quantity: { type: number }
        price: { type: number }
        fee: { type: number }
        date: { type: string, format: date-time }
        createdAt: { type: string, format: date-time }
```

---

## 遷移合約保證

### 不變性保證
1. **所有端點路徑不變** — 前端 axios 呼叫無需修改
2. **所有請求/回應格式不變** — JSON schema 完全相同
3. **認證機制不變** — Cookie-based session token
4. **HTTP 狀態碼不變** — 同樣的成功/錯誤碼

### Handler 簽名變更

```typescript
// 遷移前 (Next.js Route Handler)
export async function GET(request: NextRequest): Promise<NextResponse> {
  const userId = request.headers.get('x-user-id');
  return NextResponse.json({ data }, { status: 200 });
}

// 遷移後 (Express Handler)
export async function GET(req: Request, res: Response): Promise<void> {
  const userId = req.headers['x-user-id'] as string;
  res.status(200).json({ data });
}
```

此變更對前端完全透明 — 請求與回應的 HTTP 層面完全相同。
