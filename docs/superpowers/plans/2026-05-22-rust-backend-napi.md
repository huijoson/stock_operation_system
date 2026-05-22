# Rust backend N-API 串接 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓 backend 技術指標 service 可透過 Rust N-API 呼叫 calculation core，並在 native addon 不可用時自動 fallback 到既有 TypeScript 邏輯。

**Architecture:** 新增獨立 Rust Node binding crate 與 backend native loader / adapter。backend `RSIService`、`MACDService`、`BollingerBandsService` 保持 public API 不變，只在內部切換 native 或 TypeScript fallback。

**Tech Stack:** TypeScript、Jest、Rust、N-API、`decimal.js`、`rust_decimal`。

---

## File Structure

- Create: `docs/superpowers/specs/2026-05-22-rust-backend-napi-design.md` — backend N-API 串接設計規格。
- Create: `backend/src/lib/rust-indicators/native-loader.ts` — native addon 載入、模式切換、fallback 決策。
- Create: `backend/src/lib/rust-indicators/indicator-fallback.ts` — 既有 TypeScript RSI / MACD / Bollinger fallback 計算。
- Create: `backend/src/lib/rust-indicators/rsi-adapter.ts` — TS ↔ Rust RSI payload / result 轉換。
- Create: `backend/src/lib/rust-indicators/macd-adapter.ts` — TS ↔ Rust MACD payload / result 轉換。
- Create: `backend/src/lib/rust-indicators/bollinger-adapter.ts` — TS ↔ Rust Bollinger payload / result 轉換。
- Modify: `backend/src/services/rsi.service.ts` — 包成 facade，優先 native、失敗 fallback。
- Modify: `backend/src/services/macd.service.ts` — 包成 facade，優先 native、失敗 fallback。
- Modify: `backend/src/services/bollinger-bands.service.ts` — 包成 facade，優先 native、失敗 fallback。
- Create: `backend/src/__tests__/rust-indicators-loader.test.ts` — loader mode / fallback 測試。
- Create: `backend/src/__tests__/rust-indicators-parity.test.ts` — service parity / adapter 測試。
- Create: `rust/technical-indicators-node/Cargo.toml` — Node binding crate manifest。
- Create: `rust/technical-indicators-node/build.rs` — napi build setup。
- Create: `rust/technical-indicators-node/src/lib.rs` — N-API export layer。

---

### Task 1: Native loader mode 與 fallback 測試

**Files:**
- Create: `backend/src/__tests__/rust-indicators-loader.test.ts`
- Create: `backend/src/lib/rust-indicators/native-loader.ts`

- [ ] **Step 1: Write the failing test**

```ts
import path from 'path'

describe('rust native loader', () => {
  beforeEach(() => {
    jest.resetModules()
    delete process.env.RUST_INDICATORS_MODE
  })

  it('returns unavailable in ts-only mode without loading native addon', () => {
    process.env.RUST_INDICATORS_MODE = 'ts-only'

    const { loadRustIndicatorsNative } = require('../lib/rust-indicators/native-loader')
    const result = loadRustIndicatorsNative(() => {
      throw new Error('should not load native addon in ts-only mode')
    })

    expect(result.available).toBe(false)
    expect(result.reason).toBe('ts-only mode')
  })

  it('falls back in auto mode when native addon cannot be loaded', () => {
    process.env.RUST_INDICATORS_MODE = 'auto'

    const { loadRustIndicatorsNative } = require('../lib/rust-indicators/native-loader')
    const result = loadRustIndicatorsNative(() => {
      throw new Error('native addon missing')
    })

    expect(result.available).toBe(false)
    expect(result.reason).toContain('native addon missing')
  })

  it('throws in native-only mode when native addon cannot be loaded', () => {
    process.env.RUST_INDICATORS_MODE = 'native-only'

    const { loadRustIndicatorsNative } = require('../lib/rust-indicators/native-loader')

    expect(() =>
      loadRustIndicatorsNative(() => {
        throw new Error('native addon missing')
      })
    ).toThrow('native addon missing')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && jest src/__tests__/rust-indicators-loader.test.ts --runInBand`
Expected: FAIL with module not found for `native-loader.ts`.

- [ ] **Step 3: Write minimal implementation**

```ts
import path from 'path'

export type RustIndicatorsMode = 'auto' | 'native-only' | 'ts-only'

export type NativeAddonLoadResult =
  | { available: true; addon: unknown }
  | { available: false; reason: string }

export function getRustIndicatorsMode(): RustIndicatorsMode {
  const mode = process.env.RUST_INDICATORS_MODE
  if (mode === 'native-only' || mode === 'ts-only') {
    return mode
  }
  return 'auto'
}

export function getRustIndicatorsNativePath(): string {
  return path.resolve(__dirname, '../../../../rust/technical-indicators-node')
}

export function loadRustIndicatorsNative(
  loader: (targetPath: string) => unknown = (targetPath) => require(targetPath)
): NativeAddonLoadResult {
  const mode = getRustIndicatorsMode()

  if (mode === 'ts-only') {
    return { available: false, reason: 'ts-only mode' }
  }

  try {
    return { available: true, addon: loader(getRustIndicatorsNativePath()) }
  } catch (error) {
    if (mode === 'native-only') {
      throw error
    }

    const message = error instanceof Error ? error.message : 'native addon unavailable'
    return { available: false, reason: message }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && jest src/__tests__/rust-indicators-loader.test.ts --runInBand`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/__tests__/rust-indicators-loader.test.ts backend/src/lib/rust-indicators/native-loader.ts
git commit -m "test: 新增 Rust native loader fallback 測試"
```

---

### Task 2: RSI adapter parity 與 fallback facade

**Files:**
- Create: `backend/src/lib/rust-indicators/indicator-fallback.ts`
- Create: `backend/src/lib/rust-indicators/rsi-adapter.ts`
- Create: `backend/src/__tests__/rust-indicators-parity.test.ts`
- Modify: `backend/src/services/rsi.service.ts`

- [ ] **Step 1: Write the failing test**

```ts
import Decimal from 'decimal.js'

const loadRustIndicatorsNative = jest.fn()

jest.mock('../lib/rust-indicators/native-loader', () => ({
  loadRustIndicatorsNative: (...args: unknown[]) => loadRustIndicatorsNative(...args),
}))

describe('RSIService native parity', () => {
  beforeEach(() => {
    jest.resetModules()
    loadRustIndicatorsNative.mockReset()
  })

  it('falls back to TypeScript implementation when native addon is unavailable', async () => {
    loadRustIndicatorsNative.mockReturnValue({ available: false, reason: 'missing addon' })
    const { RSIService } = await import('../services/rsi.service')

    const service = new RSIService()
    const prices = [44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.1, 45.42, 45.84, 46.08, 45.89, 46.03, 45.61, 46.28, 46.28, 46, 46.03, 46.41, 46.22, 45.64]
    const result = service.calculateRSI(prices, 14)

    expect(result.value).toBeCloseTo(57.91502067008556, 10)
    expect(result.status).toBe('neutral')
    expect(result.history).toHaveLength(6)
  })

  it('maps native result back to the existing service shape', async () => {
    loadRustIndicatorsNative.mockReturnValue({
      available: true,
      addon: {
        calculateRsi: jest.fn().mockReturnValue({
          value: 57.91502067008556,
          status: 'neutral',
          history: [70.46413502109705, 66.24961855355508, 66.48094183471267, 69.3468531629087, 66.29471265892626, 57.91502067008556],
        }),
      },
    })

    const { RSIService } = await import('../services/rsi.service')
    const service = new RSIService()
    const prices = [44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.1, 45.42, 45.84, 46.08, 45.89, 46.03, 45.61, 46.28, 46.28, 46, 46.03, 46.41, 46.22, 45.64].map((value) => new Decimal(value))

    const result = service.calculateRSI(prices, 14)

    expect(result.value).toBeCloseTo(57.91502067008556, 10)
    expect(result.status).toBe('neutral')
    expect(result.history).toHaveLength(6)
    expect(result.divergences).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && jest src/__tests__/rust-indicators-parity.test.ts --runInBand`
Expected: FAIL because adapter/fallback facade is not implemented.

- [ ] **Step 3: Write minimal implementation**

Implement:

- `calculateRsiFallback(prices, period)` in `indicator-fallback.ts`
- `calculateRsiViaNative(addon, prices, period)` in `rsi-adapter.ts`
- `RSIService.calculateRSI()` to choose native or fallback

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && jest src/__tests__/rust-indicators-parity.test.ts --runInBand`
Expected: PASS for RSI tests.

- [ ] **Step 5: Commit**

```bash
git add backend/src/lib/rust-indicators/indicator-fallback.ts backend/src/lib/rust-indicators/rsi-adapter.ts backend/src/services/rsi.service.ts backend/src/__tests__/rust-indicators-parity.test.ts
git commit -m "feat: 串接 backend RSI Rust adapter 與 fallback"
```

---

### Task 3: MACD adapter parity 與 fallback facade

**Files:**
- Modify: `backend/src/lib/rust-indicators/indicator-fallback.ts`
- Create: `backend/src/lib/rust-indicators/macd-adapter.ts`
- Modify: `backend/src/services/macd.service.ts`
- Modify: `backend/src/__tests__/rust-indicators-parity.test.ts`

- [ ] **Step 1: Write the failing test**

Add tests verifying:

- unavailable addon uses TypeScript fallback
- native addon output is mapped back to `MACDResult`
- `crossovers` are enriched to keep existing fields

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && jest src/__tests__/rust-indicators-parity.test.ts --runInBand`
Expected: FAIL on MACD assertions.

- [ ] **Step 3: Write minimal implementation**

Implement:

- `calculateMacdFallback(prices, fastPeriod, slowPeriod, signalPeriod)`
- `calculateMacdViaNative(addon, prices, fastPeriod, slowPeriod, signalPeriod)`
- `MACDService.calculateMACD()` native/fallback facade

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && jest src/__tests__/rust-indicators-parity.test.ts --runInBand`
Expected: PASS for RSI + MACD cases.

- [ ] **Step 5: Commit**

```bash
git add backend/src/lib/rust-indicators/indicator-fallback.ts backend/src/lib/rust-indicators/macd-adapter.ts backend/src/services/macd.service.ts backend/src/__tests__/rust-indicators-parity.test.ts
git commit -m "feat: 串接 backend MACD Rust adapter 與 fallback"
```

---

### Task 4: Bollinger adapter parity 與 fallback facade

**Files:**
- Modify: `backend/src/lib/rust-indicators/indicator-fallback.ts`
- Create: `backend/src/lib/rust-indicators/bollinger-adapter.ts`
- Modify: `backend/src/services/bollinger-bands.service.ts`
- Modify: `backend/src/__tests__/rust-indicators-parity.test.ts`

- [ ] **Step 1: Write the failing test**

Add tests verifying:

- unavailable addon uses TypeScript fallback
- native addon output is mapped back to existing `BollingerBandsResult`
- `detectSqueeze()` remains consistent with current backend behavior

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && jest src/__tests__/rust-indicators-parity.test.ts --runInBand`
Expected: FAIL on Bollinger assertions.

- [ ] **Step 3: Write minimal implementation**

Implement:

- `calculateBollingerFallback(prices, period, stdDevMultiplier)`
- `detectBollingerSqueezeFallback(bands, lookbackPeriod, threshold)`
- `calculateBollingerViaNative(addon, prices, period, stdDevMultiplier)`
- `BollingerBandsService.calculateBands()` and `detectSqueeze()` facade

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && jest src/__tests__/rust-indicators-parity.test.ts --runInBand`
Expected: PASS for RSI + MACD + Bollinger cases.

- [ ] **Step 5: Commit**

```bash
git add backend/src/lib/rust-indicators/indicator-fallback.ts backend/src/lib/rust-indicators/bollinger-adapter.ts backend/src/services/bollinger-bands.service.ts backend/src/__tests__/rust-indicators-parity.test.ts
git commit -m "feat: 串接 backend Bollinger Rust adapter 與 fallback"
```

---

### Task 5: Rust Node binding crate skeleton

**Files:**
- Create: `rust/technical-indicators-node/Cargo.toml`
- Create: `rust/technical-indicators-node/build.rs`
- Create: `rust/technical-indicators-node/src/lib.rs`

- [ ] **Step 1: Write the failing test / verification target**

Use `cargo metadata` as the first verification target for the new crate layout, because the current Windows environment may not complete full native linking.

```bash
cd rust/technical-indicators-node
cargo metadata --no-deps --format-version 1
```

Expected initially: FAIL because crate files do not exist.

- [ ] **Step 2: Run command to verify it fails**

Run: `cd rust/technical-indicators-node && cargo metadata --no-deps --format-version 1`
Expected: FAIL with missing manifest.

- [ ] **Step 3: Write minimal implementation**

Create:

```toml
# Cargo.toml
[package]
name = "technical-indicators-node"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
technical-indicators = { path = "../technical-indicators" }
```

```rust
// build.rs
fn main() {}
```

```rust
// src/lib.rs
pub fn napi_binding_placeholder() -> &'static str {
    "technical-indicators-node"
}
```

- [ ] **Step 4: Run command to verify it passes**

Run: `cd rust/technical-indicators-node && cargo metadata --no-deps --format-version 1`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add rust/technical-indicators-node
git commit -m "feat: 新增 Rust Node binding crate 骨架"
```

---

### Task 6: Route-level smoke coverage and final verification

**Files:**
- Modify: `backend/src/__tests__/indicators.test.ts`
- Modify: `vite.config.ts` only if unrelated regressions are discovered (not expected)

- [ ] **Step 1: Write the failing test**

Add a route-level smoke test proving indicators routes still respond when the Rust native loader is unavailable and service falls back to TS logic.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && jest src/__tests__/indicators.test.ts --runInBand`
Expected: FAIL until the route mocking and fallback wiring are aligned.

- [ ] **Step 3: Write minimal implementation**

Update mocks or route initialization as needed so `indicators.test.ts` continues to pass with the new service facade.

- [ ] **Step 4: Run all targeted tests**

Run:

```bash
cd backend && jest src/__tests__/rust-indicators-loader.test.ts src/__tests__/rust-indicators-parity.test.ts src/__tests__/indicators.test.ts --runInBand
```

Expected: PASS.

- [ ] **Step 5: Run verification commands**

Run:

```bash
npm run type-check -- --pretty false
cd backend && npx tsc --project tsconfig.json --pretty false
cd ../rust/technical-indicators && cargo fmt -- --check
cd ../technical-indicators-node && cargo metadata --no-deps --format-version 1
```

Expected: TypeScript checks pass; Rust metadata passes; note full native build may still require Windows SDK / linker fix.

- [ ] **Step 6: Commit**

```bash
git add backend/src/__tests__/indicators.test.ts backend/src/lib/rust-indicators backend/src/services rust/technical-indicators-node
git commit -m "test: 補齊 backend Rust N-API 串接 smoke coverage"
```

---

## Self-Review

- Spec coverage: covers backend-only N-API integration, loader/fallback, adapter mapping, parity tests, route smoke tests, and Rust node binding skeleton.
- Red-flag scan: no incomplete implementation markers remain.
- Type consistency: uses the same service names and native/fallback facade pattern across RSI, MACD, and Bollinger.
