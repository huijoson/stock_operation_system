# 技術規格

## 技術棧

### 前端
- **框架**：React 或 Next.js（建議使用 Next.js 以支援 SSR）
- **UI 框架**：Tailwind CSS 或 Material-UI
- **圖表庫**：Chart.js、Recharts 或 Apache ECharts
- **狀態管理**：React Context API 或 Zustand
- **表格元件**：TanStack Table (React Table)

### 後端
- **語言**：Node.js (TypeScript) 或 Python
- **框架**：Express.js、Fastify 或 FastAPI (Python)
- **資料庫**：PostgreSQL 或 MongoDB
- **ORM**：Prisma (Node.js) 或 SQLAlchemy (Python)

### 股市資料來源
- **台股資料**：
  - Yahoo Finance API
  - 台灣證券交易所公開資訊
  - FinMind API（台灣金融資料）
  - TEJ API（若需要專業數據）

### 部署
- **前端**：Vercel 或 Netlify
- **後端**：Railway、Render 或 AWS
- **資料庫**：Supabase 或 PlanetScale

## 常用指令

```bash
# 開發環境啟動
npm run dev          # 啟動開發伺服器
npm run build        # 建置生產版本
npm run start        # 啟動生產伺服器

# 測試
npm test             # 執行測試
npm run test:watch   # 監看模式執行測試

# 資料庫
npm run db:migrate   # 執行資料庫遷移
npm run db:seed      # 填充測試資料
npm run db:studio    # 開啟資料庫管理介面

# 程式碼品質
npm run lint         # 執行 ESLint
npm run format       # 執行 Prettier 格式化
npm run type-check   # TypeScript 型別檢查
```

## 開發規範

- 使用 TypeScript 以確保型別安全
- 金額計算使用 Decimal.js 或 Big.js 避免浮點數誤差
- API 回應格式統一使用 JSON
- 錯誤處理需完整，特別是外部 API 呼叫
- 敏感資料（API keys）使用環境變數管理
