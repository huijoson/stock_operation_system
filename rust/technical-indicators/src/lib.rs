pub mod bollinger;
pub mod macd;
pub mod rsi;

pub use bollinger::{
    calculate_bollinger_bands, calculate_sma, calculate_standard_deviation, detect_squeeze,
    BollingerBandsResult, BollingerPosition,
};
pub use macd::{
    calculate_ema, calculate_macd, detect_crossover, Crossover, CrossoverType, MacdResult,
    MacdSignal,
};
pub use rsi::{calculate_rsi, RsiResult, RsiStatus};

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum IndicatorError {
    InsufficientData {
        required: usize,
        actual: usize,
        indicator: &'static str,
    },
    InvalidPeriod {
        period: usize,
        indicator: &'static str,
    },
    InvalidParameter {
        name: &'static str,
        reason: &'static str,
    },
}

impl std::fmt::Display for IndicatorError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            IndicatorError::InsufficientData {
                required,
                actual,
                indicator,
            } => write!(
                formatter,
                "Insufficient data for {indicator}: need at least {required} values, got {actual}"
            ),
            IndicatorError::InvalidPeriod { period, indicator } => {
                write!(formatter, "Invalid period for {indicator}: {period}")
            }
            IndicatorError::InvalidParameter { name, reason } => {
                write!(formatter, "Invalid parameter {name}: {reason}")
            }
        }
    }
}

impl std::error::Error for IndicatorError {}

pub(crate) fn validate_period(
    period: usize,
    indicator: &'static str,
) -> Result<(), IndicatorError> {
    if period == 0 {
        return Err(IndicatorError::InvalidPeriod { period, indicator });
    }

    Ok(())
}

pub(crate) fn require_len(
    actual: usize,
    required: usize,
    indicator: &'static str,
) -> Result<(), IndicatorError> {
    if actual < required {
        return Err(IndicatorError::InsufficientData {
            required,
            actual,
            indicator,
        });
    }

    Ok(())
}
