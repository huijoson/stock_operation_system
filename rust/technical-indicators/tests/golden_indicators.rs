use rust_decimal::Decimal;
use std::str::FromStr;
use technical_indicators::{calculate_rsi, IndicatorError, RsiStatus};

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
