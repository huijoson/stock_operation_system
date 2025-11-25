# Backtest Results Page

## Overview

The Backtest Results Page (`/backtest-results/[id]`) provides a comprehensive interface for executing and viewing strategy backtesting results. This page allows users to test their trading strategies against historical data and analyze performance metrics.

## Features

### 1. Backtest Parameter Configuration
- **Stock Symbol**: Select the stock to backtest (e.g., 2330 for Taiwan stocks, AAPL for US stocks)
- **Date Range**: Set start and end dates for the backtest period
- **Initial Capital**: Configure starting capital for the simulation (default: 100,000)

### 2. Performance Statistics Display
The page displays key performance metrics:
- **Total Trades**: Number of completed buy/sell cycles
- **Win Rate**: Percentage of profitable trades
- **Average Return**: Mean return per trade
- **Maximum Drawdown**: Largest peak-to-trough decline
- **Total Return**: Cumulative return over the backtest period

### 3. Equity Curve Visualization
- Interactive chart showing portfolio value over time
- Visualizes the growth or decline of capital throughout the backtest period
- Uses the IndicatorChart component for consistent styling

### 4. Detailed Trade History
A comprehensive table showing:
- Trade date
- Trade type (BUY/SELL)
- Execution price
- Quantity
- Profit/Loss (for sell trades)
- Profit percentage

### 5. Export Functionality
- Export backtest results to CSV format
- Includes all performance statistics and trade details
- Filename format: `backtest_{strategyName}_{date}.csv`

### 6. Analysis Recommendations
Automated insights based on backtest results:
- ✅ Excellent win rate (≥60%)
- ⚠️ Low win rate (<40%) - suggests strategy adjustment needed
- ⚠️ High drawdown (>20%) - recommends risk control
- ℹ️ Low trade count (<10) - suggests longer backtest period

## Usage

### Accessing the Page
Navigate to `/backtest-results/[strategyId]` where `[strategyId]` is the ID of your strategy.

### Running a Backtest
1. Enter the stock symbol you want to test
2. Select the start and end dates for the backtest period
3. Optionally adjust the initial capital
4. Click "執行回測" (Execute Backtest)
5. Wait for the backtest to complete
6. Review the results and analysis

### Interpreting Results

#### Win Rate
- **≥60%**: Excellent - Strategy shows strong signal quality
- **50-60%**: Good - Strategy is profitable
- **40-50%**: Average - Strategy needs refinement
- **<40%**: Poor - Consider revising strategy conditions

#### Maximum Drawdown
- **<10%**: Low risk
- **10-20%**: Moderate risk
- **>20%**: High risk - consider adding stop-loss or position sizing rules

#### Total Return
- Compare against buy-and-hold strategy for the same period
- Consider risk-adjusted returns (Sharpe ratio) for better evaluation

## API Integration

The page communicates with the backtest API endpoint:
```
GET /api/strategies/:id/backtest?symbol={symbol}&startDate={date}&endDate={date}&initialCapital={amount}
```

### Response Format
```typescript
{
  id: string
  strategyId: string
  strategyName: string
  startDate: string
  endDate: string
  totalTrades: number
  winRate: number
  avgReturn: number
  maxDrawdown: number
  totalReturn: number
  trades: Array<{
    date: string
    type: 'BUY' | 'SELL'
    price: number
    quantity: number
    profit?: number
    profitPercent?: number
  }>
  equityCurve: Array<{
    date: string
    equity: number
  }>
  createdAt: string
}
```

## Requirements Validation

This page fulfills the following requirements:

- **Requirement 10.4**: Display backtest statistics (win rate, average return, maximum drawdown)
- **Requirement 10.6**: Show detailed trade records and performance data

## Testing

Unit tests are located in `__tests__/page.test.tsx` and cover:
- Rendering of backtest parameters form
- Display of strategy information
- Empty state when no results
- Integration with API endpoints

## Future Enhancements

Potential improvements:
- Add more performance metrics (Sharpe ratio, Sortino ratio)
- Support for multiple symbols in a single backtest
- Comparison between different strategies
- Save backtest results for later review
- Add charts for drawdown visualization
- Support for different position sizing strategies
