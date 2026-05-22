# Rust 技術指標 backend N-API 串接設計規格

**日期**：2026-05-22  
**分支**：`feature/rust-financial-calculation-core`  
**範圍**：將 backend `RSIService`、`MACDService`、`BollingerBandsService` 透過 Node N-API 串接 Rust calculation core，並保留 TypeScript fallback。  
**策略**：先只串 `backend/src/services/*`，不直接修改 `src/services/*`；先讓 backend 可切換 Rust native addon，之後再評估是否抽掉 `src/services` 的重複邏輯。

---

## 1. 背景與目的

目前專案已完成第一階段 Rust 純計算核心：

- `rust/technical-indicators/`

其中包含：

- RSI
- EMA / MACD
- SMA / Bollinger Bands
- squeeze detection
- golden tests

backend 仍使用 TypeScript 版本技術指標 service：

- `backend/src/services/rsi.service.ts`
- `backend/src/services/macd.service.ts`
- `backend/src/services/bollinger-bands.service.ts`

這三個 service 目前被 `backend/src/routes/indicators.ts` 直接使用，因此最合理的下一步是：

1. 保持 backend service public API 不變。
2. 在 service 內部改為呼叫 Rust N-API。
3. 若 native addon 不可用，退回既有 TypeScript 邏輯。

這樣可以在不破壞現有 API contract 的前提下，逐步把高計算量核心切換到 Rust。

---

## 2. 非目標

本階段不做以下事項：

1. 不直接修改 React 前端使用方式。
2. 不讓 browser 直接執行 Rust native addon。
3. 不將 `src/services/*.service.ts` 直接切到 N-API。
4. 不移除既有 TypeScript 計算邏輯。
5. 不導入 WASM。
6. 不變更 `/api/indicators/*` 的 request / response schema。
7. 不處理 ATR、Candlestick、Fibonacci、SupportResistance 等其他指標。

---

## 3. 建議架構

新增獨立 Node binding crate：

```text
rust/
├── technical-indicators/
│   └── ... 既有純 Rust 計算核心
└── technical-indicators-node/
    ├── Cargo.toml
    ├── build.rs
    └── src/lib.rs
```

backend 端新增 adapter 與 loader：

```text
backend/src/lib/rust-indicators/
├── native-loader.ts
├── indicator-fallback.ts
├── rsi-adapter.ts
├── macd-adapter.ts
└── bollinger-adapter.ts
```

資料流：

```text
routes/indicators.ts
    ↓
backend service (public API 不變)
    ↓
Rust adapter
    ↓
Native loader
    ↓
N-API addon
    ↓
rust/technical-indicators-node
    ↓
rust/technical-indicators
```

若 native addon 載入失敗：

```text
backend service
    ↓
TypeScript fallback implementation
```

---

## 4. 為什麼使用獨立 N-API crate

不建議把 N-API 直接加進 `rust/technical-indicators`，原因如下：

1. `rust/technical-indicators` 是純 calculation core，應保持可測試、可重用、與 Node 無關。
2. N-API 會引入 Node ABI、編譯流程、平台差異、`.node` binary 載入等 concerns。
3. 將 binding 與 core 分離，能讓未來替換成 WASM、HTTP worker、CLI wrapper 更容易。
4. 純 Rust crate 仍可維持 cargo tests 與 golden tests，不受 Node binding 影響。

---

## 5. TypeScript 與 Rust 的資料契約

為避免 JavaScript number 精度問題，TypeScript 傳給 Rust 的價格資料應使用字串陣列：

```ts
string[]
```

例如：

```ts
prices.map((price) => new Decimal(price).toString())
```

Rust N-API 接收到後再轉成 `rust_decimal::Decimal`。

### RSI 輸入 / 輸出

輸入：

```ts
{
  prices: string[]
  period: number
}
```

輸出：

```ts
{
  value: number
  status: 'overbought' | 'oversold' | 'neutral'
  history: number[]
}
```

TypeScript service 再補上：

- `Date` history 欄位
- divergences（若第一版 binding 尚未包含 divergence，可先 fallback 到 TS divergence 或保持既有策略）

### MACD 輸入 / 輸出

輸入：

```ts
{
  prices: string[]
  fastPeriod: number
  slowPeriod: number
  signalPeriod: number
}
```

輸出：

```ts
{
  macdLine: number[]
  signalLine: number[]
  histogram: number[]
  crossovers: Array<{
    type: 'golden' | 'death'
    index: number
    macdValue: number
    signalValue: number
  }>
  currentSignal: 'bullish' | 'bearish' | 'neutral'
}
```

TypeScript service 再補上：

- crossover `date`
- crossover `description`

### Bollinger 輸入 / 輸出

輸入：

```ts
{
  prices: string[]
  period: number
  stdDevMultiplier: string
}
```

輸出：

```ts
{
  upper: number[]
  middle: string[]
  lower: number[]
  bandwidth: number[]
  currentPosition: 'above_upper' | 'below_lower' | 'within_bands'
}
```

TypeScript service 再轉回：

- `upper: Decimal[]`
- `middle: Decimal[]`
- `lower: Decimal[]`

並保留 `detectSqueeze()` 在 TypeScript 或由 Rust 一併提供。

---

## 6. Native loader 與 fallback 策略

### Native loader

`backend/src/lib/rust-indicators/native-loader.ts` 負責：

1. 嘗試載入 `.node` native addon。
2. 封裝 require / import path。
3. 在初始化失敗時回傳 unavailable 狀態，而不是直接 crash backend。

### Fallback

`backend/src/lib/rust-indicators/indicator-fallback.ts` 負責：

1. 保留目前既有 TypeScript 計算流程。
2. 在 native addon 無法使用時提供替代實作。
3. 確保 backend route 與 API 回應不受影響。

### 設計原則

- 開發環境不能因為 `.node` 尚未建好而使 backend 無法啟動。
- 測試環境可用 mock native loader 驗證 fallback 與 native 路徑。
- production 若要求嚴格使用 Rust，可之後再加上環境變數控制。

建議環境變數：

```text
RUST_INDICATORS_MODE=auto | native-only | ts-only
```

預設使用：

```text
auto
```

行為：

- `auto`：先嘗試 native，失敗則 fallback TS
- `native-only`：native 載入失敗即報錯
- `ts-only`：完全跳過 native，方便除錯

---

## 7. backend service 改造方式

保留原本 class 與 method 名稱：

- `RSIService.calculateRSI()`
- `MACDService.calculateMACD()`
- `BollingerBandsService.calculateBands()`
- `BollingerBandsService.detectSqueeze()`

改造方式：

1. service 仍是 backend routes 直接依賴的 facade。
2. service 先把 `Decimal.Value[]` 轉成 string payload。
3. adapter 呼叫 native addon。
4. 將 native 輸出轉回現有 service result shape。
5. 若 native unavailable，走 TypeScript fallback。

這代表 `backend/src/routes/indicators.ts` 可完全不改或只做最小調整。

---

## 8. 測試策略

本階段必須遵守 TDD。

### 測試分層

1. **backend adapter tests**
   - 驗證 TS → Rust payload 轉換正確
   - 驗證 native result → service result 轉換正確

2. **fallback tests**
   - native loader unavailable 時，service 仍回傳既有結果
   - `RUST_INDICATORS_MODE=ts-only` 時不載入 native

3. **parity tests**
   - 同一組價格資料，native-backed service 與既有 TS fallback 結果一致
   - RSI、MACD、Bollinger 各至少一組 golden parity

4. **route-level smoke tests**
   - `/api/indicators/rsi`
   - `/api/indicators/macd`
   - `/api/indicators/bollinger`
   不需要驗證 N-API 細節，但要確認 route 在 mock native loader 下仍可正常工作。

### 驗收重點

- backend 啟動不因 native 缺失而失敗
- native 路徑與 fallback 路徑都可被測試覆蓋
- 對外 API response shape 不變

---

## 9. 預期新增/修改檔案

### Rust

- Create: `rust/technical-indicators-node/Cargo.toml`
- Create: `rust/technical-indicators-node/build.rs`
- Create: `rust/technical-indicators-node/src/lib.rs`

### backend TypeScript

- Create: `backend/src/lib/rust-indicators/native-loader.ts`
- Create: `backend/src/lib/rust-indicators/indicator-fallback.ts`
- Create: `backend/src/lib/rust-indicators/rsi-adapter.ts`
- Create: `backend/src/lib/rust-indicators/macd-adapter.ts`
- Create: `backend/src/lib/rust-indicators/bollinger-adapter.ts`
- Modify: `backend/src/services/rsi.service.ts`
- Modify: `backend/src/services/macd.service.ts`
- Modify: `backend/src/services/bollinger-bands.service.ts`
- Possibly Modify: `backend/src/routes/indicators.ts`（若需要調整 import 或初始化）

### 測試

- Create: `backend/src/__tests__/rust-indicators-loader.test.ts`
- Create: `backend/src/__tests__/rust-indicators-parity.test.ts`
- Possibly Modify: `backend/src/__tests__/indicators.test.ts`

---

## 10. 風險與緩解

| 風險 | 緩解方式 |
| --- | --- |
| Windows/Rust native build 在部分環境不可用 | 預設 `auto` mode + TS fallback，不阻塞 backend 啟動 |
| N-API 輸出 shape 與現有 TS result 不一致 | adapter 層統一轉換，不讓 route 直接依賴 native output |
| Decimal 精度在 JS/Rust 來回轉換出現誤差 | TypeScript → Rust 只傳 string；Rust → TS 對需要保留 Decimal 的欄位使用 string 或可精確重建值 |
| backend 與 src/services 邏輯雙軌維護成本高 | 本階段只改 backend；下一階段再評估 `src/services` 去重策略 |
| native loader 在 jest 測試中難以控制 | 將 loader 抽獨立 module，方便 mock |

---

## 11. 驗收標準

1. backend `RSIService`、`MACDService`、`BollingerBandsService` 能透過 adapter 呼叫 Rust native addon。
2. native addon 不可用時，backend 仍能 fallback 到既有 TS 計算。
3. `/api/indicators/rsi`、`/api/indicators/macd`、`/api/indicators/bollinger` response shape 不變。
4. 有 parity tests 驗證 native 與 TS fallback 一致。
5. 有 loader/fallback tests 驗證 `auto` / `ts-only` 行為。
6. backend 不因 native addon 缺失而啟動失敗。

---

## 12. 後續實作方式

後續請透過 superpowers 參考本 spec 進行：

1. 使用 writing-plans 產出 implementation plan。
2. 使用 test-driven-development 先寫 backend parity / fallback failing tests。
3. 先完成 TypeScript loader/adapter/fallback，再接 Rust N-API binding。
4. 本階段完成後，再評估 `src/services/*` 的保留、抽共用 fallback、或去重策略。
