use rust_decimal::prelude::ToPrimitive;
use rust_decimal::Decimal;

use crate::{require_len, validate_period, IndicatorError};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BollingerPosition {
    AboveUpper,
    BelowLower,
    WithinBands,
}

#[derive(Debug, Clone, PartialEq)]
pub struct BollingerBandsResult {
    pub upper: Vec<f64>,
    pub middle: Vec<Decimal>,
    pub lower: Vec<f64>,
    pub bandwidth: Vec<f64>,
    pub current_position: BollingerPosition,
}

pub fn calculate_sma(prices: &[Decimal], period: usize) -> Result<Vec<Decimal>, IndicatorError> {
    validate_period(period, "SMA")?;
    require_len(prices.len(), period, "SMA")?;

    let period_decimal = Decimal::from(period as u64);
    let mut values = Vec::with_capacity(prices.len() - period + 1);

    for index in (period - 1)..prices.len() {
        let sum = prices[(index + 1 - period)..=index]
            .iter()
            .copied()
            .sum::<Decimal>();
        values.push(sum / period_decimal);
    }

    Ok(values)
}

pub fn calculate_standard_deviation(
    prices: &[Decimal],
    period: usize,
) -> Result<Vec<f64>, IndicatorError> {
    validate_period(period, "Standard Deviation")?;
    require_len(prices.len(), period, "Standard Deviation")?;

    let sma_values = calculate_sma(prices, period)?;
    let period_decimal = Decimal::from(period as u64);
    let mut values = Vec::with_capacity(prices.len() - period + 1);

    for index in (period - 1)..prices.len() {
        let sma_index = index + 1 - period;
        let sma = sma_values[sma_index];
        let variance = prices[(index + 1 - period)..=index]
            .iter()
            .map(|price| {
                let difference = *price - sma;
                difference * difference
            })
            .sum::<Decimal>()
            / period_decimal;

        values.push(decimal_to_f64(variance).sqrt());
    }

    Ok(values)
}

pub fn calculate_bollinger_bands(
    prices: &[Decimal],
    period: usize,
    std_dev_multiplier: Decimal,
) -> Result<BollingerBandsResult, IndicatorError> {
    validate_period(period, "Bollinger Bands")?;
    require_len(prices.len(), period, "Bollinger Bands")?;

    if std_dev_multiplier <= Decimal::ZERO {
        return Err(IndicatorError::InvalidParameter {
            name: "std_dev_multiplier",
            reason: "must be positive",
        });
    }

    let middle = calculate_sma(prices, period)?;
    let standard_deviation = calculate_standard_deviation(prices, period)?;
    let multiplier = decimal_to_f64(std_dev_multiplier);
    let mut upper = Vec::with_capacity(middle.len());
    let mut lower = Vec::with_capacity(middle.len());
    let mut bandwidth = Vec::with_capacity(middle.len());

    for (middle_band, std_dev) in middle.iter().zip(standard_deviation.iter()) {
        let middle_value = decimal_to_f64(*middle_band);
        let upper_band = middle_value + std_dev * multiplier;
        let lower_band = middle_value - std_dev * multiplier;

        upper.push(upper_band);
        lower.push(lower_band);
        bandwidth.push((upper_band - lower_band) / middle_value);
    }

    let current_price = decimal_to_f64(prices[prices.len() - 1]);
    let current_upper = upper[upper.len() - 1];
    let current_lower = lower[lower.len() - 1];
    let current_position = if current_price > current_upper {
        BollingerPosition::AboveUpper
    } else if current_price < current_lower {
        BollingerPosition::BelowLower
    } else {
        BollingerPosition::WithinBands
    };

    Ok(BollingerBandsResult {
        upper,
        middle,
        lower,
        bandwidth,
        current_position,
    })
}

pub fn detect_squeeze(
    bands: &BollingerBandsResult,
    lookback_period: usize,
    threshold: f64,
) -> bool {
    if lookback_period == 0 || bands.bandwidth.len() < lookback_period {
        return false;
    }

    let recent_bandwidth = &bands.bandwidth[(bands.bandwidth.len() - lookback_period)..];
    let average_bandwidth = recent_bandwidth.iter().sum::<f64>() / lookback_period as f64;
    let current_bandwidth = bands.bandwidth[bands.bandwidth.len() - 1];

    current_bandwidth < average_bandwidth * threshold
}

fn decimal_to_f64(value: Decimal) -> f64 {
    value.to_f64().expect("decimal value should fit into f64")
}
