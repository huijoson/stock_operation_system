# 已實現損益時間範圍篩選修正

## 問題描述

用戶報告「本月」、「本季」、「本年」、「全部」的績效顯示相同的數值，時間範圍篩選功能未正常運作。

## 根本原因

**時區轉換問題**：原本的實作使用本地時區建立日期物件，導致在時區轉換時出現錯誤。

### 範例說明

假設當前時間是 `2026-01-22 16:00:00 (UTC+8 台北時間)`：

#### 舊實作（有問題）
```javascript
const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
// 建立: 2026-01-01 00:00:00 (本地時間)
// 轉換成 UTC: 2025-12-31 16:00:00 (UTC)
```

這導致「本月」的查詢實際上從 2025/12/31 開始，包含了不應該包含的 2025年12月的交易。

#### 新實作（已修正）
```javascript
const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0))
// 建立: 2026-01-01 00:00:00 (UTC)
// 正確的起始時間
```

## 修正內容

### 1. 服務層
- **檔案**: `src/services/realized-pl.service.ts`
- **修改**: `getDateRange()` 和 `getPortfolioSummary()` 方法
- **變更**: 使用 `Date.UTC()` 建立日期物件，確保使用 UTC 時區

### 2. 工具函數
- **檔案**: `src/lib/utils/date-filters.ts`
- **修改**: `getDateRangeForPeriod()` 函數
- **變更**: 同樣使用 `Date.UTC()` 建立日期物件

### 3. 測試更新
- **檔案**: 
  - `tests/unit/realized-pl.service.test.ts`
  - `tests/integration/realized-pl.api.test.ts`
- **變更**: 更新測試案例中的日期建立方式，與服務層保持一致

## 預期效果

修正後，時間範圍篩選應該正常運作：

- **本月**: 只顯示當月 (2026年1月) 的交易
- **本季**: 只顯示當季 (2026年Q1) 的交易
- **本年**: 只顯示當年 (2026年) 的交易
- **全部**: 顯示所有歷史交易

## 測試方式

1. 重新整理頁面
2. 切換不同的時間範圍按鈕（本月、本季、本年、全部）
3. 確認顯示的金額和期間範圍都有正確變化
4. 特別注意跨年、跨季、跨月的交易是否正確篩選

## 技術細節

### 時區處理原則

1. **資料庫儲存**: PostgreSQL 的 `TIMESTAMP WITH TIME ZONE` 自動處理 UTC 儲存
2. **查詢條件**: 使用 UTC 時間建立查詢的起始/結束日期
3. **顯示**: 前端使用 `toLocaleDateString()` 轉換成使用者本地時區顯示

### Date.UTC() 參數

```javascript
Date.UTC(year, monthIndex, day, hours, minutes, seconds, milliseconds)
```

- `monthIndex`: 0-based (0=1月, 1=2月, ...)
- 所有時間參數設為 0，確保是午夜 00:00:00.000

## 相關檔案

- `src/services/realized-pl.service.ts`
- `src/lib/utils/date-filters.ts`
- `src/components/portfolio/RealizedPLCard.tsx`
- `src/components/portfolio/RealizedPLBreakdown.tsx`
- `src/app/api/realized-pl/route.ts`
- `src/app/api/realized-pl/portfolio/[portfolioId]/route.ts`

## 備註

此修正同時影響：
1. 儀表板的已實現損益卡片
2. 投資組合詳細頁面的損益明細
3. 所有使用時間範圍篩選的 API 端點
