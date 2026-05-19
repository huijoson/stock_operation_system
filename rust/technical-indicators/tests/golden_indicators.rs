use rust_decimal::Decimal;
use std::str::FromStr;
use technical_indicators::{
    calculate_ema, calculate_macd, calculate_rsi, IndicatorError, MacdSignal, RsiStatus,
};

fn dec(value: &str) -> Decimal {
    Decimal::from_str(value).unwrap()
}

#[test]
fn rsi_rejects_insufficient_data() {
    let prices = vec![dec("10"), dec("11"), dec("12")];

    let error = calculate_rsi(&prices, 14).unwrap_err();

    assert_eq!(
        error,
        IndicatorError::InsufficientData {
            required: 15,
            actual: 3,
            indicator: "RSI",
        }
    );
}

#[test]
fn rsi_matches_golden_value_for_wilder_example() {
    let prices = vec![
        dec("44.34"),
        dec("44.09"),
        dec("44.15"),
        dec("43.61"),
        dec("44.33"),
        dec("44.83"),
        dec("45.10"),
        dec("45.42"),
        dec("45.84"),
        dec("46.08"),
        dec("45.89"),
        dec("46.03"),
        dec("45.61"),
        dec("46.28"),
        dec("46.28"),
        dec("46.00"),
        dec("46.03"),
        dec("46.41"),
        dec("46.22"),
        dec("45.64"),
    ];

    let result = calculate_rsi(&prices, 14).unwrap();

    assert!((result.value - 57.91502067008556).abs() < 1e-10);
    assert_eq!(result.status, RsiStatus::Neutral);
    assert_eq!(result.history.len(), 6);
}

#[test]
fn ema_rejects_insufficient_data() {
    let prices = vec![dec("10"), dec("11"), dec("12")];

    let error = calculate_ema(&prices, 5).unwrap_err();

    assert_eq!(
        error,
        IndicatorError::InsufficientData {
            required: 5,
            actual: 3,
            indicator: "EMA",
        }
    );
}

#[test]
fn ema_matches_golden_values_for_simple_sequence() {
    let prices = vec![
        dec("10"),
        dec("12"),
        dec("14"),
        dec("16"),
        dec("18"),
        dec("20"),
    ];

    let values = calculate_ema(&prices, 3).unwrap();

    assert_eq!(values.len(), 4);
    assert!((values[0] - 12.0).abs() < 1e-10);
    assert!((values[1] - 14.0).abs() < 1e-10);
    assert!((values[2] - 16.0).abs() < 1e-10);
    assert!((values[3] - 18.0).abs() < 1e-10);
}

#[test]
fn macd_rejects_insufficient_data() {
    let prices: Vec<Decimal> = (0..20).map(|index| Decimal::from(100 + index)).collect();

    let error = calculate_macd(&prices, 12, 26, 9).unwrap_err();

    assert_eq!(
        error,
        IndicatorError::InsufficientData {
            required: 35,
            actual: 20,
            indicator: "MACD",
        }
    );
}

#[test]
fn macd_matches_golden_values_for_linear_uptrend() {
    let prices: Vec<Decimal> = (0..50)
        .map(|index| dec("100") + Decimal::from(index) / dec("2"))
        .collect();

    let result = calculate_macd(&prices, 12, 26, 9).unwrap();

    assert_eq!(result.macd_line.len(), 17);
    assert_eq!(result.signal_line.len(), 17);
    assert_eq!(result.histogram.len(), 17);
    assert!((result.macd_line[0] - 3.5).abs() < 1e-10);
    assert!((result.signal_line[0] - 3.5).abs() < 1e-10);
    assert!((result.histogram[0] - 0.0).abs() < 1e-10);
    assert!((result.macd_line[16] - 3.5).abs() < 1e-10);
    assert!((result.signal_line[16] - 3.5).abs() < 1e-10);
    assert!((result.histogram[16] - 0.0).abs() < 1e-10);
    assert_eq!(result.current_signal, MacdSignal::Neutral);
}
