# API 端點清冊 (API Endpoint Inventory)

- 文件版本：v1.0.0
- 文件日期：2026-03-09
- 資料來源：`backend/api-inventory.json`（generatedAt: `2026-03-06T03:30:38.097Z`）
- 盤點範圍：`backend/next-api-legacy/**/handler.ts`

## 概覽

- Route 檔案數：**43**
- Endpoint 操作數（以「HTTP 方法 + 路徑」計）：**50**
- 適用對象：後端開發、前端串接、測試規格撰寫、API Mock 實作

| 領域 | 操作數 |
|---|---:|
| 認證 (Auth) | 4 |
| 投資組合 (Portfolios) | 7 |
| 交易 (Transactions) | 5 |
| 股票 (Stocks) | 3 |
| 新聞 (News) | 5 |
| 技術指標 (Indicators) | 10 |
| 策略 (Strategies) | 6 |
| 風險評估 (Risk Assessment) | 3 |
| 已實現損益 (Realized P&L) | 2 |
| 持股建議 (Holding Advice) | 2 |
| 其他 (Misc) | 3 |
| **總計** | **50** |

---

## 認證 (Auth) — 4 endpoints

| 方法 | 路徑 | 用途 | 認證 | 請求參數 | 回應格式 |
|---|---|---|---|---|---|
| POST | `/api/auth/login` | 使用者登入並建立 session cookie | ❌ 公開 | Body: `email`(必填), `password`(必填) | `session.token`, `session.expiresAt`；並設定 `session_token` cookie |
| POST | `/api/auth/register` | 註冊新使用者 | ❌ 公開 | Body: `email`(必填, email 格式), `password`(必填, ≥6) | `user.id`, `user.email`, `user.createdAt` |
| POST | `/api/auth/logout` | 使用者登出並清除 session | ✅ 需要認證 | Cookie: `session_token`(必填) | `message`（成功訊息） |
| GET | `/api/auth/me` | 取得目前登入使用者資訊 | ✅ 需要認證 | Cookie: `session_token` | `user`（當前使用者基本資料） |

---

## 投資組合 (Portfolios) — 7 endpoints

| 方法 | 路徑 | 用途 | 認證 | 請求參數 | 回應格式 |
|---|---|---|---|---|---|
| GET | `/api/portfolios` | 取得使用者所有投資組合 | ✅ 需要認證 | 無 | `portfolios[]` |
| POST | `/api/portfolios` | 建立投資組合 | ✅ 需要認證 | Body: `name`(必填) | `portfolio` |
| GET | `/api/portfolios/:id` | 取得單一投資組合 | ✅ 需要認證 | Path: `id` | `portfolio` |
| PUT | `/api/portfolios/:id` | 更新投資組合名稱 | ✅ 需要認證 | Path: `id`；Body: `name`(必填) | `portfolio`（更新後） |
| DELETE | `/api/portfolios/:id` | 刪除投資組合 | ✅ 需要認證 | Path: `id` | `success`(boolean) |
| GET | `/api/portfolios/:id/holdings` | 取得投資組合持股清單 | ✅ 需要認證 | Path: `id` | `holdings[]` |
| GET | `/api/portfolios/:id/transactions` | 取得投資組合交易清單 | ✅ 需要認證 | Path: `id` | `transactions[]` |

---

## 交易 (Transactions) — 5 endpoints

| 方法 | 路徑 | 用途 | 認證 | 請求參數 | 回應格式 |
|---|---|---|---|---|---|
| POST | `/api/transactions` | 新增交易並重算持股 | ✅ 需要認證 | Body: `portfolioId`,`symbol`,`type(BUY/SELL)`,`quantity`,`price`,`date`（皆必填） | `transaction`（201） |
| PUT | `/api/transactions/:id` | 更新交易並重算持股 | ✅ 需要認證 | Path: `id`；Body: `type`,`quantity`,`price`,`date`（必填） | `transaction` |
| DELETE | `/api/transactions/:id` | 刪除交易並重算持股 | ✅ 需要認證 | Path: `id` | `message` |
| GET | `/api/transactions/export` | 匯出交易 CSV | ❌ 公開 | Query: `portfolioId`(必填) | CSV 檔（`text/csv`） |
| POST | `/api/transactions/import` | 匯入交易 CSV | ❌ 公開 | FormData: `file`(必填), `portfolioId`(必填), `format`(`schwab`/`firstrade`) | `result`（匯入結果，欄位依 service 回傳） |

---

## 股票 (Stocks) — 3 endpoints

| 方法 | 路徑 | 用途 | 認證 | 請求參數 | 回應格式 |
|---|---|---|---|---|---|
| GET | `/api/stocks/search` | 依代號或名稱搜尋股票 | ❌ 公開 | Query: `q`(必填, 至少 2 字元) | `stocks[]`, `count` |
| GET | `/api/stocks/:symbol/price` | 取得即時股價 | ❌ 公開 | Path: `symbol` | `symbol`, `price`(string), `timestamp` |
| GET | `/api/stocks/:symbol/history` | 取得歷史價格 | ❌ 公開 | Path: `symbol`；Query: `startDate`,`endDate`(必填, ISO) | `symbol`, `startDate`, `endDate`, `prices[{date,price}]` |

---

## 新聞 (News) — 5 endpoints

| 方法 | 路徑 | 用途 | 認證 | 請求參數 | 回應格式 |
|---|---|---|---|---|---|
| GET | `/api/news/:symbol` | 取得個股新聞（Finnhub） | ❌ 公開 | Path: `symbol`；Query: `limit`(選填, 預設 10) | `success`, `data.symbol`, `data.news[]`, `data.count` |
| GET | `/api/news/sources` | 取得新聞來源可信度 | ❌ 公開 | 無 | `success`, `data.sources[]`, `data.grouped{official,mainstream,unverified}` |
| GET | `/api/news/sentiment/:symbol` | 取得個股新聞情緒分析 | ❌ 公開 | Path: `symbol` | `symbol`, `averageScore`, `overallSentiment`, `newsCount`, `breakdown` |
| GET | `/api/news/portfolio/:portfolioId` | 取得投資組合持股新聞 | ❌ 公開 | Path: `portfolioId` | `success`, `data.portfolioId`, `data.news`(symbol->news map) |
| GET | `/api/dashboard/news` | 取得儀表板新聞串流/分頁 | ❌ 公開 | Query: `category`,`cursor`,`limit`(皆選填) | `success`, `data.news[]`, `data.meta`；Header: `Cache-Control`, `X-Data-Staleness-Seconds` |

---

## 技術指標 (Indicators) — 10 endpoints

| 方法 | 路徑 | 用途 | 認證 | 請求參數 | 回應格式 |
|---|---|---|---|---|---|
| GET | `/api/indicators/technical-score` | 綜合技術評分 | ❌ 公開 | Query: `symbol`(必填) | `symbol`, `totalScore`, `rating`, `components`, `timestamp` |
| GET | `/api/indicators/rsi` | RSI 指標 | ❌ 公開 | Query: `symbol`(必填), `period`,`days`(選填) | `symbol`, `period`, `value`, `status`, `history[]`, `divergences[]` |
| GET | `/api/indicators/macd` | MACD 指標 | ❌ 公開 | Query: `symbol`(必填), `fastPeriod`,`slowPeriod`,`signalPeriod`,`days` | `symbol`, `macdLine`, `signalLine`, `histogram`, `crossovers`, `currentSignal`, `history[]` |
| GET | `/api/indicators/bollinger` | 布林通道 | ❌ 公開 | Query: `symbol`(必填), `period`,`stdDev`,`days` | `symbol`, `history[{upper,middle,lower,...}]`, `currentPosition`, `isSqueezed` |
| GET | `/api/indicators/atr` | ATR 波動度 | ❌ 公開 | Query: `symbol`(必填), `period`,`days` | `symbol`, `period`, `value`, `history[]`, `volatilityStatus`, `suggestedStopLoss` |
| GET | `/api/indicators/support-resistance` | 支撐壓力位分析 | ❌ 公開 | Query: `symbol`(必填), `period`,`tolerance` | `symbol`, `currentPrice`, `supports[]`, `resistances[]`, `goldenRatioLevels[]` |
| GET | `/api/indicators/candlestick-patterns` | 蠟燭型態辨識 | ❌ 公開 | Query: `symbol`(必填), `days`(選填) | `symbol`, `patterns[{pattern,signal,reliability,date,...}]`, `timestamp` |
| GET | `/api/indicators/fibonacci/retracement` | Fibonacci 回撤位 | ❌ 公開 | Query: `high`,`low`(必填), `isUptrend`,`symbol`(選填) | `levels[]`, `high`, `low`, `direction`, `timestamp` |
| GET | `/api/indicators/fibonacci/extension` | Fibonacci 延伸目標價 | ❌ 公開 | Query: `start`,`retracement`,`breakout`(必填), `symbol`(選填) | `targets[]`, `start`, `retracement`, `breakout`, `timestamp` |
| GET / POST | `/api/indicators/cache/clear` | 查詢或清除指標快取 | ❌ 公開 | GET: 無；POST Query: `symbol`(選填) | GET: `success`,`stats`；POST: `success`,`message`,`symbol?`,`count?` |

---

## 策略 (Strategies) — 6 endpoints

| 方法 | 路徑 | 用途 | 認證 | 請求參數 | 回應格式 |
|---|---|---|---|---|---|
| GET | `/api/strategies` | 取得使用者策略列表 | ✅ 需要認證 | 無 | `Strategy[]` |
| POST | `/api/strategies` | 建立策略 | ✅ 需要認證 | Body: `name`(必填), `conditions[]`(必填), `logic(AND/OR)`(必填), `description`(選填) | `Strategy`（201） |
| GET | `/api/strategies/:id` | 取得策略詳情 | ✅ 需要認證 | Path: `id` | `Strategy` |
| PUT | `/api/strategies/:id` | 更新策略 | ✅ 需要認證 | Path: `id`；Body 可含 `name`,`description`,`conditions`,`logic` | `Strategy`（更新後） |
| DELETE | `/api/strategies/:id` | 刪除策略 | ✅ 需要認證 | Path: `id` | `message` |
| GET | `/api/strategies/:id/backtest` | 執行策略回測 | ✅ 需要認證 | Path: `id`；Query: `symbol`,`startDate`,`endDate`(必填) | `strategyId`,`strategyName`,`totalTrades`,`winRate`,`avgReturn`,`maxDrawdown`,`totalReturn`,`trades[]`,`equityCurve[]` |

---

## 風險評估 (Risk Assessment) — 3 endpoints

| 方法 | 路徑 | 用途 | 認證 | 請求參數 | 回應格式 |
|---|---|---|---|---|---|
| GET | `/api/risk-assessment/:symbol` | 單一股票風險評估 | ✅ 需要認證 | Path: `symbol` | `symbol`,`riskScore`,`riskLevel`,`technicalAnalysis`,`newsSentiment`,`weights`,`calculatedAt`,`expiresAt` |
| POST | `/api/risk-assessment/batch` | 批次啟動風險評估 | ✅ 需要認證 | Body: `symbols[]`(選填；未傳則用全部持股) | `message`,`symbolCount`（202） |
| GET | `/api/risk-assessment/portfolio/:portfolioId` | 投資組合整體風險摘要 | ✅ 需要認證 | Path: `portfolioId` | `portfolioId`,`portfolioName`,`overallRisk`,`holdings[]`,`highRiskCount`,`mediumRiskCount`,`lowRiskCount` |

---

## 已實現損益 (Realized P&L) — 2 endpoints

| 方法 | 路徑 | 用途 | 認證 | 請求參數 | 回應格式 |
|---|---|---|---|---|---|
| GET | `/api/realized-pl` | 查詢使用者所有投組已實現損益摘要 | ✅ 需要認證 | Query: `period`(`month`/`quarter`/`year`/`all`，選填) | `totalRealizedPL`,`periodStart`,`periodEnd`,`shortTermPL`,`longTermPL`,`portfolioBreakdown[]` |
| GET | `/api/realized-pl/portfolio/:portfolioId` | 查詢單一投組已實現損益明細 | ✅ 需要認證 | Path: `portfolioId`；Query: `period`(選填), `symbol`(選填) | `portfolioId`,`portfolioName`,`totalRealizedPL`,`records[]`,`symbolBreakdown[]` |

---

## 持股建議 (Holding Advice) — 2 endpoints

| 方法 | 路徑 | 用途 | 認證 | 請求參數 | 回應格式 |
|---|---|---|---|---|---|
| GET | `/api/holding-advice/:symbol` | 依個股風險給出持股建議 | ❌ 公開 | Path: `symbol` | `success`,`data`（建議內容）；找不到評估時回 `code=RISK_ASSESSMENT_NOT_FOUND` |
| GET | `/api/holding-advice/portfolio/:portfolioId` | 取得投組內各持股建議 | ❌ 公開 | Path: `portfolioId` | `success`,`data.portfolioId`,`data.advices[]` |

---

## 其他 (Misc) — 3 endpoints

| 方法 | 路徑 | 用途 | 認證 | 請求參數 | 回應格式 |
|---|---|---|---|---|---|
| POST | `/api/sync/dashboard-news` | 觸發儀表板新聞同步（排程） | ✅ 需要認證 | Header: `Authorization: Bearer {CRON_SECRET}`(必填)；`x-vercel-cron`(資訊性) | 成功：`success`,`data{upserted,skipped,quotaUsedToday,quotaRemainingToday,syncedAt}`；配額滿：429 + `retryAfter` |
| GET | `/api/query-tsm` | 查詢 TSM 專用交易與現持股快照 | ❌ 公開 | 無 | `summary`,`buyTransactions[]`,`sellTransactions[]`,`currentHolding` |
| GET | `/api/holdings/export` | 匯出持股 CSV | ❌ 公開 | Query: `portfolioId`(必填) | CSV 檔（`text/csv`） |

---

## 補充說明

1. 多數需登入 API 使用 `requireAuth(request)`（session cookie: `session_token`）驗證。
2. 本清冊以 handler 實際程式碼回傳欄位為主；若 service 內部回傳結構可變，於表格以高層欄位表示。
3. 技術指標快取清除端點 `GET/POST /api/indicators/cache/clear` 共用同一路徑，因此在領域統計以 1 個 endpoint 計（方法雙態）。
