## ADDED Requirements

### Requirement: 使用者可在單一表單新增多筆交易
系統 SHALL 提供 `BulkTransactionForm` 元件，允許使用者在一個表單中輸入多筆交易紀錄，每列包含：股票代號、交易類型（BUY/SELL）、數量、價格、交易日期。

#### Scenario: 初始顯示一列空白輸入
- **WHEN** 使用者開啟批次新增表單
- **THEN** 表單顯示一列空白輸入欄位，日期預設為昨天

#### Scenario: 新增一列
- **WHEN** 使用者點擊「新增一列」按鈕
- **THEN** 表單在最下方附加一列新的空白輸入欄位，日期預設為昨天

#### Scenario: 移除特定列
- **WHEN** 表單中有超過一列，且使用者點擊某列的刪除按鈕
- **THEN** 該列從表單移除，其餘列不受影響

#### Scenario: 最後一列不可刪除
- **WHEN** 表單中只剩一列
- **THEN** 該列的刪除按鈕為禁用或隱藏

#### Scenario: 送出前驗證所有列
- **WHEN** 使用者點擊送出且任一列有空白必填欄位或數字 ≤ 0
- **THEN** 系統標記有誤的列並顯示錯誤訊息，阻止送出

#### Scenario: 成功批次新增
- **WHEN** 所有列驗證通過，使用者點擊送出
- **THEN** 系統呼叫 `POST /api/transactions/bulk`，成功後清空表單並顯示成功訊息

### Requirement: 後端提供批次建立交易的 API
系統 SHALL 提供 `POST /api/transactions/bulk` endpoint，接受 `{ portfolioId: string, transactions: TransactionInput[] }` 並以單一 DB transaction 原子性寫入全部交易。

#### Scenario: 成功批次建立
- **WHEN** 收到格式正確的批次請求，且所有交易驗證通過
- **THEN** 系統回傳 `201` 及所有建立的 transaction 物件陣列

#### Scenario: 空陣列被拒絕
- **WHEN** `transactions` 為空陣列
- **THEN** 系統回傳 `400 Bad Request`

#### Scenario: 任一筆驗證失敗則全部回滾
- **WHEN** 陣列中有任一筆 quantity ≤ 0、price ≤ 0、或 type 非 BUY/SELL
- **THEN** 系統回傳 `400`，不寫入任何交易

#### Scenario: 任一筆業務邏輯失敗則全部回滾
- **WHEN** 陣列中有任一筆 SELL 交易但持倉不足
- **THEN** 系統回傳 `422`，不寫入任何交易
