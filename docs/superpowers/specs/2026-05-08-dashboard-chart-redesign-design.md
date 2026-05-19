# Dashboard Chart Redesign Design

## Problem

The current dashboard chart area is difficult to read in dark mode:

- Pie chart labels overlap when many holdings are present.
- The legend consumes space but does not help users compare allocation quickly.
- The profit/loss chart grid and axis styling compete with the data.
- The dashboard does not provide a clear line chart view for portfolio movement.

The goal is to redesign the dashboard chart UI so users can clearly understand allocation, profit/loss distribution, and portfolio trend at a glance.

## Selected Approach

Use a layered overview layout.

1. Place a large market-value donut chart beside a holdings allocation list.
2. Add a wide portfolio market-value trend line chart below the allocation card.
3. Keep the profit/loss bar chart as a separate wide chart with clearer positive and negative styling.

This approach preserves the existing dashboard information while making each visualization easier to scan.

## Layout

### Allocation Card

The "持股市值佔比" section becomes a full-width card on desktop.

- Left side: a large donut chart with no dense outer labels.
- Center of donut: total market value and holding count.
- Right side: ranked holding rows with symbol, percentage, market value, and color marker.
- Mobile: stack donut above the ranked list.

This removes label overlap and gives users a readable text alternative for the same chart data.

### Trend Line Chart

Add a "投資組合市值趨勢" section as a wide card.

- Use a line chart with subtle grid lines.
- Use clear tooltip values formatted in zh-TW number style.
- Prefer a 30-day view when enough historical data exists.
- If historical data is unavailable, show a Traditional Chinese empty state instead of a misleading chart.

### Profit/Loss Bar Chart

Keep "各持股損益分布" as a bar chart.

- Use green for gains and red for losses.
- Reduce grid opacity and axis noise.
- Format Y-axis and tooltip values as TWD.
- Keep symbol labels readable with adequate spacing.

## Component Strategy

Prefer dashboard-specific presentation wrappers so other pages using shared chart components are not unexpectedly changed.

Acceptable implementation options:

- Add optional props to existing chart components only when the behavior is generally reusable.
- Add dashboard-only chart components when the behavior is specific to the overview layout.

All user-facing text must remain in Traditional Chinese.

## Data Flow

Existing dashboard data remains the source of truth:

- Holdings come from `PortfolioApi.getHoldings`.
- Current prices come from `StockApi.getPrice`.
- Allocation and profit/loss values are calculated from holdings and current prices.

For the trend chart:

- Prefer deriving recent portfolio value from existing stock history APIs if enough data is available.
- If the data cannot be calculated safely, render a clear empty state explaining that trend data is unavailable.

The redesign must not invent or silently fabricate trend values.

## Empty and Error States

Charts should render readable Traditional Chinese states for:

- No holdings.
- No current prices.
- Only one allocation data point.
- Missing or insufficient history for the trend line.

The UI should not show cramped or misleading charts when the data is not suitable for visualization.

## Accessibility

- Maintain keyboard-accessible dashboard controls.
- Provide text equivalents for chart insights through the allocation list and chart summaries.
- Preserve sufficient color contrast in dark mode.
- Do not rely on color alone for gain/loss values; use signs and labels in tooltip/list text.

## Testing

Add or update tests to cover:

- Allocation list renders symbols, percentages, and market values.
- Trend chart shows an empty state when historical data is unavailable.
- Profit/loss chart preserves positive and negative gain/loss presentation.
- Dashboard build/type-check remains valid.

## Out of Scope

- Changing backend portfolio APIs unless required for safe trend data retrieval.
- Redesigning unrelated dashboard sections such as news, portfolio cards, login, or navigation.
- Replacing the charting library.
