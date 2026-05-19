use rust_decimal::prelude::ToPrimitive;
use rust_decimal::Decimal;

use crate::{require_len, validate_period, IndicatorError};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CrossoverType {
    Golden,
    Death,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Crossover {
    pub crossover_type: CrossoverType,
    pub index: usize,
    pub macd_value: f64,
    pub signal_value: f64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MacdSignal {
    Bullish,
    Bearish,
    Neutral,
}

#[derive(Debug, Clone, PartialEq)]
pub struct MacdResult {
    pub macd_line: Vec<f64>,
    pub signal_line: Vec<f64>,
    pub histogram: Vec<f64>,
    pub crossovers: Vec<Crossover>,
    pub current_signal: MacdSignal,
}

pub fn calculate_ema(prices: &[Decimal], period: usize) -> Result<Vec<f64>, IndicatorError> {
    validate_period(period, "EMA")?;
    require_len(prices.len(), period, "EMA")?;

    let period_decimal = Decimal::from(period as u64);
    let alpha = Decimal::from(2u64) / Decimal::from((period + 1) as u64);
    let one_minus_alpha = Decimal::ONE - alpha;

    let mut ema = prices.iter().take(period).copied().sum::<Decimal>() / period_decimal;
    let mut values = Vec::with_capacity(prices.len() - period + 1);
    values.push(decimal_to_f64(ema));

    for price in prices.iter().skip(period) {
        ema = ema * one_minus_alpha + *price * alpha;
        values.push(decimal_to_f64(ema));
    }

    Ok(values)
}

pub fn calculate_macd(
    prices: &[Decimal],
    fast_period: usize,
    slow_period: usize,
    signal_period: usize,
) -> Result<MacdResult, IndicatorError> {
    validate_period(fast_period, "MACD")?;
    validate_period(slow_period, "MACD")?;
    validate_period(signal_period, "MACD")?;

    if fast_period >= slow_period {
        return Err(IndicatorError::InvalidParameter {
            name: "fast_period",
            reason: "must be less than slow_period",
        });
    }

    let required = slow_period + signal_period;
    require_len(prices.len(), required, "MACD")?;

    let fast_ema = calculate_ema(prices, fast_period)?;
    let slow_ema = calculate_ema(prices, slow_period)?;
    let offset = slow_period - fast_period;
    let aligned_fast_ema = &fast_ema[offset..];

    let macd_source: Vec<Decimal> = aligned_fast_ema
        .iter()
        .zip(slow_ema.iter())
        .map(|(fast, slow)| decimal_from_f64(*fast) - decimal_from_f64(*slow))
        .collect();

    let signal_line = calculate_ema(&macd_source, signal_period)?;
    let aligned_macd_line: Vec<f64> = macd_source
        .iter()
        .skip(signal_period - 1)
        .map(|value| decimal_to_f64(*value))
        .collect();

    let histogram: Vec<f64> = aligned_macd_line
        .iter()
        .zip(signal_line.iter())
        .map(|(macd, signal)| decimal_to_f64(decimal_from_f64(*macd) - decimal_from_f64(*signal)))
        .collect();

    let crossovers = detect_crossover(&aligned_macd_line, &signal_line)?;
    let current_signal = current_signal(&aligned_macd_line, &signal_line, &crossovers);

    Ok(MacdResult {
        macd_line: aligned_macd_line,
        signal_line,
        histogram,
        crossovers,
        current_signal,
    })
}

pub fn detect_crossover(
    macd_line: &[f64],
    signal_line: &[f64],
) -> Result<Vec<Crossover>, IndicatorError> {
    if macd_line.len() != signal_line.len() {
        return Err(IndicatorError::InvalidParameter {
            name: "signal_line",
            reason: "must have the same length as macd_line",
        });
    }

    if macd_line.len() < 2 {
        return Ok(Vec::new());
    }

    let mut crossovers = Vec::new();
    for index in 1..macd_line.len() {
        let previous_macd = macd_line[index - 1];
        let current_macd = macd_line[index];
        let previous_signal = signal_line[index - 1];
        let current_signal = signal_line[index];

        if previous_macd <= previous_signal && current_macd > current_signal {
            crossovers.push(Crossover {
                crossover_type: CrossoverType::Golden,
                index,
                macd_value: current_macd,
                signal_value: current_signal,
            });
        }

        if previous_macd >= previous_signal && current_macd < current_signal {
            crossovers.push(Crossover {
                crossover_type: CrossoverType::Death,
                index,
                macd_value: current_macd,
                signal_value: current_signal,
            });
        }
    }

    Ok(crossovers)
}

fn current_signal(macd_line: &[f64], signal_line: &[f64], crossovers: &[Crossover]) -> MacdSignal {
    if let Some(last_crossover) = crossovers.last() {
        if macd_line.len() - last_crossover.index <= 3 {
            return match last_crossover.crossover_type {
                CrossoverType::Golden => MacdSignal::Bullish,
                CrossoverType::Death => MacdSignal::Bearish,
            };
        }
    }

    let current_macd = macd_line[macd_line.len() - 1];
    let current_signal = signal_line[signal_line.len() - 1];

    if current_macd > current_signal {
        MacdSignal::Bullish
    } else if current_macd < current_signal {
        MacdSignal::Bearish
    } else {
        MacdSignal::Neutral
    }
}

fn decimal_to_f64(value: Decimal) -> f64 {
    value.to_f64().expect("decimal value should fit into f64")
}

fn decimal_from_f64(value: f64) -> Decimal {
    Decimal::from_f64_retain(value).expect("finite f64 should convert to decimal")
}
