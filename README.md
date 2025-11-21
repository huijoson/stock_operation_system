# 股市投資組合管理系統

專為台灣個人投資者設計的網頁應用程式，用於追蹤、管理和分析股票投資組合。

## 功能特色

- 持股統計與追蹤
- 投資組合分析
- 損益計算與報酬率分析
- 視覺化圖表
- 交易記錄管理
- CSV 匯入/匯出
- 股票搜尋與查詢

## 技術棧

- **前端**: Next.js 15, React 18, TypeScript
- **樣式**: Tailwind CSS
- **資料庫**: PostgreSQL + Prisma ORM
- **測試**: Jest + fast-check (Property-Based Testing)
- **數值計算**: Decimal.js

## 開始使用

### 安裝依賴

```bash
npm install
```

### 開發環境

```bash
npm run dev
```

開啟 [http://localhost:3000](http://localhost:3000) 查看應用程式。

### 測試

```bash
# 執行所有測試
npm test

# 執行單元測試
npm run test:unit

# 執行屬性測試
npm run test:property

# 監看模式
npm run test:watch

# 產生覆蓋率報告
npm run test:coverage
```

### 程式碼品質

```bash
# 執行 ESLint
npm run lint

# 執行 Prettier 格式化
npm run format

# TypeScript 型別檢查
npm run type-check
```

### 資料庫

```bash
# 執行資料庫遷移
npm run db:migrate

# 填充測試資料
npm run db:seed

# 開啟資料庫管理介面
npm run db:studio
```

## 專案結構

```
/
├── src/
│   ├── app/                    # Next.js App Router 頁面
│   ├── components/             # React 元件
│   │   ├── ui/                # 基礎 UI 元件
│   │   ├── charts/            # 圖表元件
│   │   ├── portfolio/         # 投資組合相關元件
│   │   └── stocks/            # 股票相關元件
│   ├── lib/                    # 工具函式和設定
│   │   ├── api/               # API 客戶端
│   │   ├── utils/             # 通用工具函式
│   │   ├── calculations/      # 財務計算邏輯
│   │   └── db/                # 資料庫設定
│   ├── hooks/                  # 自訂 React Hooks
│   ├── types/                  # TypeScript 型別定義
│   ├── services/               # 業務邏輯服務
│   └── constants/              # 常數定義
├── prisma/                     # Prisma schema 和 migrations
├── public/                     # 靜態資源
├── tests/                      # 測試檔案
│   ├── unit/                  # 單元測試
│   └── property/              # 屬性測試
└── docs/                       # 文件
```

## 開發規範

- 使用 TypeScript 確保型別安全
- 金額計算使用 Decimal.js 避免浮點數誤差
- 遵循 TDD 開發流程
- 程式碼格式化使用 Prettier
- 遵循 ESLint 規則

## License

Private
