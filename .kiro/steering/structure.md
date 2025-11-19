# 專案結構

## 目錄組織

```
/
├── src/
│   ├── app/                    # Next.js App Router 頁面
│   │   ├── (auth)/            # 認證相關頁面
│   │   ├── dashboard/         # 儀表板
│   │   ├── portfolio/         # 投資組合管理
│   │   ├── stocks/            # 股票查詢
│   │   └── transactions/      # 交易記錄
│   ├── components/            # React 元件
│   │   ├── ui/               # 基礎 UI 元件
│   │   ├── charts/           # 圖表元件
│   │   ├── portfolio/        # 投資組合相關元件
│   │   └── stocks/           # 股票相關元件
│   ├── lib/                   # 工具函式和設定
│   │   ├── api/              # API 客戶端
│   │   ├── utils/            # 通用工具函式
│   │   ├── calculations/     # 財務計算邏輯
│   │   └── db/               # 資料庫設定
│   ├── hooks/                 # 自訂 React Hooks
│   ├── types/                 # TypeScript 型別定義
│   ├── services/              # 業務邏輯服務
│   │   ├── stock.service.ts  # 股票資料服務
│   │   ├── portfolio.service.ts # 投資組合服務
│   │   └── transaction.service.ts # 交易服務
│   └── constants/             # 常數定義
├── prisma/                    # Prisma schema 和 migrations
├── public/                    # 靜態資源
├── tests/                     # 測試檔案
└── docs/                      # 文件
```

## 命名規範

- **檔案名稱**：使用 kebab-case（例如：`stock-card.tsx`）
- **元件名稱**：使用 PascalCase（例如：`StockCard`）
- **函式和變數**：使用 camelCase（例如：`calculateReturn`）
- **常數**：使用 UPPER_SNAKE_CASE（例如：`MAX_HOLDINGS`）
- **型別和介面**：使用 PascalCase（例如：`Portfolio`, `StockData`）

## 資料模型

### 核心實體

- **User**：使用者帳號
- **Portfolio**：投資組合（一個使用者可有多個組合）
- **Holding**：持股記錄（股票代號、數量、平均成本）
- **Transaction**：交易記錄（買入/賣出、日期、價格、數量）
- **Stock**：股票基本資料（代號、名稱、產業）
- **StockPrice**：股價歷史資料

## 模組化原則

- 每個功能模組保持獨立，降低耦合
- 共用邏輯抽取到 `lib/` 或 `services/`
- 元件保持單一職責，複雜元件拆分為小元件
- API 路由按功能分組（`/api/stocks`, `/api/portfolio`）

## 資料流

1. 使用者操作 → UI 元件
2. 元件呼叫 Hook 或 Service
3. Service 處理業務邏輯，呼叫 API
4. API 與資料庫或外部服務互動
5. 資料回傳並更新 UI
