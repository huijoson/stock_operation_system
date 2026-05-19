# Rust 技術指標核心設計規格

**日期**：2026-05-19  
**分支**：`feature/rust-financial-calculation-core`  
**範圍**：RSI、EMA/MACD、SMA/Bollinger Bands 的 Rust 技術指標核心  
**策略**：第一階段先建立獨立 Rust crate 與測試，不接入 TypeScript；第二階段再以 N-API 接回 backend。

---

## 1. 背景與目的

目前專案的技術指標計算主要由 TypeScript service 實作：

- `backend/src/services/rsi.service.ts`
- `backend/src/services/macd.service.ts`
- `backend/src/services/bollinger-bands.service.ts`
- `src/services/rsi.service.ts`
- `src/services/macd.service.ts`
- `src/services/bollinger-bands.service.ts`

既有測試包含單元測試與 property-based tests：

- `tests/property/rsi.property.test.ts`
- `tests/property/macd.property.test.ts`
- `tests/property/bollinger-bands.property.test.ts`

本次目標不是全面改寫專案，而是漸進式把高計算量、金融精度敏感的技術指標核心抽成 Rust 模組。第一階段只建立 Rust crate 並固定行為，不改 API contract、不改 Express backend、不改前端 UI。

---

## 2. 非目標

本階段不做以下事項：

1. 不改現有 REST API 回應格式。
2. 不替換 `backend/src/services/*` 的 TypeScript service 實作。
3. 不移除 `decimal.js`。
4. 不導入 N-API binding。
5. 不導入 WASM。
6. 不調整 Prisma schema 或資料庫 migration。
7. 不重寫 risk assessment、realized P/L、backtesting。

---

## 3. 建議架構

新增 Rust crate：

```text
rust/technical-indicators/
├── Cargo.toml
├── src/
│   ├── lib.rs
│   ├── rsi.rs
│   ├── macd.rs
│   └── bollinger.rs
└── tests/
    └── golden_indicators.rs
```

各檔案責任：

- `Cargo.toml`：定義 crate metadata、dependencies、test 設定。
- `src/lib.rs`：公開 module 與共用錯誤型別。
- `src/rsi.rs`：RSI 計算與 divergence 以外的核心 RSI value/history 計算。
- `src/macd.rs`：EMA、MACD line、signal line、histogram、crossover 計算。
- `src/bollinger.rs`：SMA、standard deviation、upper/middle/lower bands、bandwidth、current position、squeeze 判斷。
- `tests/golden_indicators.rs`：用固定輸入驗證 Rust 輸出與既有 TypeScript 行為一致。

---

## 4. Rust 公開介面草案

第一階段以純 Rust 函式為主，不包含 Node binding。

```rust
pub fn calculate_rsi(prices: &[Decimal], period: usize) -> Result<RsiResult, IndicatorError>;
pub fn calculate_ema(prices: &[Decimal], period: usize) -> Result<Vec<Decimal>, IndicatorError>;
pub fn calculate_macd(
    prices: &[Decimal],
    fast_period: usize,
    slow_period: usize,
    signal_period: usize,
) -> Result<MacdResult, IndicatorError>;
pub fn calculate_sma(prices: &[Decimal], period: usize) -> Result<Vec<Decimal>, IndicatorError>;
pub fn calculate_bollinger_bands(
    prices: &[Decimal],
    period: usize,
    std_dev_multiplier: Decimal,
) -> Result<BollingerBandsResult, IndicatorError>;
```

資料結構會對齊現有 TypeScript service 的概念，但不需要在第一階段完整重現日期欄位。日期目前在 TypeScript 中屬於計算後補上的暫位日期，非核心計算值，因此 Rust golden tests 先聚焦數值、狀態與錯誤行為。

---

## 5. 精度策略

第一階段的最高優先順序是「與現有 TypeScript 行為一致」。

1. Rust 加減乘除使用 `rust_decimal::Decimal`。
2. RSI 的平均 gain/loss、RS、RSI formula 應對齊 TypeScript `decimal.js` 計算順序。
3. EMA 的 smoothing factor 使用 `2 / (period + 1)`，初始 EMA 使用前 `period` 筆 SMA。
4. MACD 對齊現有 TypeScript 的 fast EMA / slow EMA offset 行為。
5. Bollinger standard deviation 需保留目前 TypeScript 行為：variance 先算 decimal，再透過 floating-point sqrt 取得標準差。這代表 Rust 會明確使用 `f64::sqrt()` 模擬 `Math.sqrt(variance.toNumber())`，避免第一階段出現行為差異。
6. Golden tests 比對時使用明確 tolerance，例如 `1e-10` 或依指標特性設定。

---

## 6. 錯誤處理

Rust crate 需提供明確錯誤型別：

```rust
pub enum IndicatorError {
    InsufficientData { required: usize, actual: usize, indicator: &'static str },
    InvalidPeriod { period: usize, indicator: &'static str },
    InvalidParameter { name: &'static str, reason: &'static str },
}
```

錯誤訊息需能映射回既有 TypeScript service 的錯誤語意，尤其是：

- RSI：至少需要 `period + 1` 筆價格。
- EMA：至少需要 `period` 筆價格。
- MACD：至少需要 `slowPeriod + signalPeriod` 筆價格。
- Bollinger Bands / SMA / standard deviation：至少需要 `period` 筆價格。

---

## 7. TDD 要求

所有實作必須遵守 Red-Green-Refactor：

1. 先寫 Rust failing test。
2. 執行測試並確認因功能尚未實作而失敗。
3. 寫最小 Rust 實作讓測試通過。
4. 再執行測試確認通過。
5. 重構時保持測試通過。

第一階段測試順序：

1. RSI insufficient data test。
2. RSI golden value test。
3. EMA insufficient data test。
4. EMA golden values test。
5. MACD insufficient data test。
6. MACD golden values test。
7. Bollinger insufficient data test。
8. SMA golden values test。
9. Bollinger golden bands test。
10. Bollinger squeeze behavior test。

---

## 8. Golden test 來源

Golden test 的 expected values 應由既有 TypeScript service 產生或人工依現有公式計算後固定。

可使用的來源：

- `src/services/__tests__/macd.service.test.ts`
- `src/services/__tests__/bollinger-bands.service.test.ts`
- `tests/property/rsi.property.test.ts`
- `tests/property/macd.property.test.ts`
- `tests/property/bollinger-bands.property.test.ts`

若需要新增 fixture，應放在 Rust crate 測試中，避免第一階段修改 TypeScript 行為。

---

## 9. 第二階段：N-API 接回 backend

Rust crate 測試穩定後，下一階段才新增 N-API binding。原則如下：

1. 保持 TypeScript service 的 public API 不變。
2. `RSIService.calculateRSI()`、`MACDService.calculateMACD()`、`BollingerBandsService.calculateBands()` 可改為呼叫 Rust binding。
3. TypeScript service 負責維持既有回傳格式，例如日期欄位、description 文字、Decimal 物件包裝。
4. Rust binding 只負責純計算，不讀取 DB、不處理 Express request、不處理 cache。
5. 新增 TypeScript parity tests，比對 Rust-backed service 與舊 TS fixture 的輸出一致。

---

## 10. 驗收標準

第一階段完成條件：

1. `rust/technical-indicators` crate 建立完成。
2. RSI、EMA、MACD、SMA、Bollinger Bands 至少各有一組 golden test。
3. 不足資料錯誤行為有測試。
4. `cargo test` 全部通過。
5. 不修改現有 API 行為。
6. 不修改既有 TypeScript service 的 runtime path。
7. 不引入 Node native binding。

第二階段完成條件將另開 plan 定義。

---

## 11. 風險與緩解

| 風險 | 緩解方式 |
| --- | --- |
| Rust decimal 與 Decimal.js 在除法/rounding 上有細微差異 | golden tests 使用現有 TS fixture，先以行為一致為準 |
| Bollinger 標準差涉及 floating-point sqrt | 明確保留 `f64::sqrt()` 行為並用 tolerance 比對 |
| 一次導入 N-API 增加複雜度 | 第一階段只做 Rust crate，不接 TS |
| TypeScript 前後端存在重複 service | 第一階段不重構；第二階段再決定 backend 優先接入 |
| property tests 與 Rust tests 覆蓋不一致 | 先用 golden tests 固定核心案例，後續再補 proptest |

---

## 12. 後續實作方式

後續請透過 superpowers 參考本 spec 進行：

1. 使用 writing-plans 產出 implementation plan。
2. 使用 test-driven-development 執行每個 Rust 指標的 Red-Green-Refactor。
3. 每個 task 需先提交 failing test，再提交 minimal implementation。
4. 第一階段結束後再規劃 N-API binding。
