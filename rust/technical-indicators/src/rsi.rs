use rust_decimal::Decimal;
use rust_decimal::prelude::ToPrimitive;

use crate::{require_len, validate_period, IndicatorError};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RsiStatus {
    Overbought,
    Oversold,
    Neutral,
}

#[derive(Debug, Clone, PartialEq)]
pub struct RsiResult {
    pub value: f64,
    pub status: RsiStatus,
    pub history: Vec<f64>,
}

pub fn calculate_rsi(prices: &[Decimal], period: usize) -> Result<RsiResult, IndicatorError> {
    validate_period(period, "RSI")?;
    require_len(prices.len(), period + 1, "RSI")?;

    let mut changes = Vec::with_capacity(prices.len() - 1);
    for window in prices.windows(2) {
        changes.push(window[1] - window[0]);
    }

    let gains: Vec<Decimal> = changes
        .iter()
        .map(|change| {
            if *change > Decimal::ZERO {
                *change
            } else {
                Decimal::ZERO
            }
        })
        .collect();
    let losses: Vec<Decimal> = changes
        .iter()
        .map(|change| {
            if *change < Decimal::ZERO {
                change.abs()
            } else {
                Decimal::ZERO
            }
        })
        .collect();

    let period_decimal = Decimal::from(period as u64);
    let mut avg_gain = gains
        .iter()
        .take(period)
        .copied()
        .sum::<Decimal>()
        / period_decimal;
    let mut avg_loss = losses
        .iter()
        .take(period)
        .copied()
        .sum::<Decimal>()
        / period_decimal;

    let mut history = Vec::with_capacity(changes.len() - period + 1);
    history.push(rsi_value(avg_gain, avg_loss));

    for index in period..changes.len() {
        avg_gain = (avg_gain * Decimal::from((period - 1) as u64) + gains[index]) / period_decimal;
        avg_loss = (avg_loss * Decimal::from((period - 1) as u64) + losses[index]) / period_decimal;
        history.push(rsi_value(avg_gain, avg_loss));
    }

    let value = *history.last().expect("history must contain at least one RSI value");
    let status = if value > 70.0 {
        RsiStatus::Overbought
    } else if value < 30.0 {
        RsiStatus::Oversold
    } else {
        RsiStatus::Neutral
    };

    Ok(RsiResult {
        value,
        status,
        history,
    })
}

fn rsi_value(avg_gain: Decimal, avg_loss: Decimal) -> f64 {
    let relative_strength = if avg_loss.is_zero() {
        Decimal::from(100u64)
    } else {
        avg_gain / avg_loss
    };
    let rsi = Decimal::from(100u64) - (Decimal::from(100u64) / (relative_strength + Decimal::ONE));

    rsi.to_f64().expect("RSI decimal should fit into f64")
}
