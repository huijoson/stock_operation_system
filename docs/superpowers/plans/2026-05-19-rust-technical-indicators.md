# Rust 技術指標核心 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立第一階段獨立 Rust crate，提供 RSI、EMA/MACD、SMA/Bollinger Bands 純計算核心與 golden tests。

**Architecture:** 新增 `rust/technical-indicators` crate；每個指標拆成獨立 module，`lib.rs` 只公開型別與函式。第一階段不接 TypeScript、不導入 N-API、不修改既有 API。

**Tech Stack:** Rust 1.80、`rust_decimal`、`thiserror`、`cargo test`。

---

## File Structure

- Create: `rust/technical-indicators/Cargo.toml` — crate metadata 與 dependencies。
- Create: `rust/technical-indicators/src/lib.rs` — module exports、`IndicatorError`、共用 helper。
- Create: `rust/technical-indicators/src/rsi.rs` — RSI 核心計算。
- Create: `rust/technical-indicators/src/macd.rs` — EMA、MACD、crossover 核心計算。
- Create: `rust/technical-indicators/src/bollinger.rs` — SMA、standard deviation、Bollinger Bands、squeeze。
- Create: `rust/technical-indicators/tests/golden_indicators.rs` — 固定輸入與 expected values。

---

### Task 1: 建立 Rust crate 與 RSI failing tests

**Files:**
- Create: `rust/technical-indicators/Cargo.toml`
- Create: `rust/technical-indicators/tests/golden_indicators.rs`

- [ ] **Step 1: Write failing RSI tests**

```rust
use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use technical_indicators::{calculate_rsi, IndicatorError, RsiStatus};

#[test]
fn rsi_rejects_insufficient_data() {
    let prices = vec![dec!(10), dec!(11), dec!(12)];
    let error = calculate_rsi(&prices, 14).unwrap_err();
    assert_eq!(error, IndicatorError::InsufficientData { required: 15, actual: 3, indicator: "RSI" });
}

#[test]
fn rsi_matches_golden_value_for_wilder_example() {
    let prices = vec![dec!(44.34), dec!(44.09), dec!(44.15), dec!(43.61), dec!(44.33), dec!(44.83), dec!(45.10), dec!(45.42), dec!(45.84), dec!(46.08), dec!(45.89), dec!(46.03), dec!(45.61), dec!(46.28), dec!(46.28), dec!(46.00), dec!(46.03), dec!(46.41), dec!(46.22), dec!(45.64)];
    let result = calculate_rsi(&prices, 14).unwrap();
    assert!((result.value - 62.880718309962404).abs() < 1e-10);
    assert_eq!(result.status, RsiStatus::Neutral);
    assert_eq!(result.history.len(), 6);
}
```

- [ ] **Step 2: Run test to verify RED**

Run: `cd rust/technical-indicators && cargo test rsi --test golden_indicators`
Expected: FAIL because crate/functions do not exist yet.

- [ ] **Step 3: Implement minimal RSI module**

Create `src/lib.rs` and `src/rsi.rs` with `IndicatorError`, `RsiResult`, `RsiStatus`, and `calculate_rsi()`.

- [ ] **Step 4: Run test to verify GREEN**

Run: `cd rust/technical-indicators && cargo test rsi --test golden_indicators`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add rust/technical-indicators docs/superpowers/plans/2026-05-19-rust-technical-indicators.md
git commit -m "feat: 新增 Rust RSI 核心測試與實作"
```

---

### Task 2: EMA/MACD tests and implementation

**Files:**
- Modify: `rust/technical-indicators/tests/golden_indicators.rs`
- Modify: `rust/technical-indicators/src/lib.rs`
- Create: `rust/technical-indicators/src/macd.rs`

- [ ] **Step 1: Write failing EMA/MACD tests**

Add tests for `calculate_ema()` insufficient data and golden sequence, plus `calculate_macd()` insufficient data and deterministic trending data.

- [ ] **Step 2: Run test to verify RED**

Run: `cd rust/technical-indicators && cargo test macd --test golden_indicators`
Expected: FAIL because MACD functions are missing.

- [ ] **Step 3: Implement minimal MACD module**

Implement `calculate_ema()`, `calculate_macd()`, `detect_crossover()` and result structs.

- [ ] **Step 4: Run test to verify GREEN**

Run: `cd rust/technical-indicators && cargo test macd --test golden_indicators && cargo test ema --test golden_indicators`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add rust/technical-indicators
git commit -m "feat: 新增 Rust EMA 與 MACD 核心"
```

---

### Task 3: SMA/Bollinger tests and implementation

**Files:**
- Modify: `rust/technical-indicators/tests/golden_indicators.rs`
- Modify: `rust/technical-indicators/src/lib.rs`
- Create: `rust/technical-indicators/src/bollinger.rs`

- [ ] **Step 1: Write failing SMA/Bollinger tests**

Add tests for `calculate_sma()`, `calculate_standard_deviation()`, `calculate_bollinger_bands()`, insufficient data, current position, and squeeze false on insufficient lookback.

- [ ] **Step 2: Run test to verify RED**

Run: `cd rust/technical-indicators && cargo test bollinger --test golden_indicators`
Expected: FAIL because Bollinger functions are missing.

- [ ] **Step 3: Implement minimal Bollinger module**

Implement SMA, standard deviation with `f64::sqrt()`, bands, bandwidth, current position, and `detect_squeeze()`.

- [ ] **Step 4: Run test to verify GREEN**

Run: `cd rust/technical-indicators && cargo test --test golden_indicators`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add rust/technical-indicators
git commit -m "feat: 新增 Rust Bollinger Bands 核心"
```

---

### Task 4: Final verification

**Files:**
- Modify: none unless formatting finds changes.

- [ ] **Step 1: Format Rust code**

Run: `cd rust/technical-indicators && cargo fmt`
Expected: formatting completes without errors.

- [ ] **Step 2: Run full Rust tests**

Run: `cd rust/technical-indicators && cargo test`
Expected: all tests pass.

- [ ] **Step 3: Verify repo status**

Run: `git status --short --branch`
Expected: only intentional Rust crate and docs plan changes are tracked; pre-existing untracked files remain untracked.

- [ ] **Step 4: Commit final formatting if needed**

```bash
git add rust/technical-indicators
git commit -m "chore: 格式化 Rust 技術指標核心"
```

---

## Self-Review

- Spec coverage: covers independent Rust crate, RSI, EMA/MACD, SMA/Bollinger, error behavior, no TS integration, no N-API.
- Red-flag scan: no incomplete implementation markers remain.
- Type consistency: public functions match spec names and return Result-based error handling.
