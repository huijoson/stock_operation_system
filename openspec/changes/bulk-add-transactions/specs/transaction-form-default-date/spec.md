## ADDED Requirements

### Requirement: 交易表單日期欄位預設為昨天
系統 SHALL 在 `TransactionForm` 和 `BulkTransactionForm` 的交易日期欄位預設值設定為昨天（本地時間，格式 `YYYY-MM-DD`），而非今天。

#### Scenario: TransactionForm 開啟時預設日期為昨天
- **WHEN** 使用者開啟 `TransactionForm`（單筆新增）
- **THEN** 日期欄位的初始值為昨天的日期字串（`YYYY-MM-DD`）

#### Scenario: BulkTransactionForm 每列預設日期為昨天
- **WHEN** `BulkTransactionForm` 初始化或新增一列
- **THEN** 該列的日期欄位預設為昨天的日期字串

#### Scenario: 單筆新增成功後重設日期為昨天
- **WHEN** `TransactionForm` 成功送出後 reset 表單
- **THEN** 日期欄位重設為昨天（不是今天）
