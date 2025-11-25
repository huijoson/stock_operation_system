# 實作計畫

- [x] 1. 擴展資料庫架構以支援技術指標





- [x] 1.1 更新 Prisma schema 新增技術指標相關資料表


  - 新增 IndicatorCache 模型（儲存指標計算結果）
  - 新增 Strategy 模型（儲存使用者策略）
  - 新增 Backtest 模型（儲存回測結果）
  - 新增 StrategySignal 模型（儲存策略訊號）
  - 新增 CandlestickPattern 模型（儲存 K線型態識別結果）
  - _需求：11.1, 10.1_

- [x] 1.2 執行資料庫遷移


  - 執行 `npm run db:migrate` 建立新資料表
  - _需求：11.1_

- [x] 2. 實作費波那契計算服務




- [x] 2.1 建立 FibonacciService 類別


  - 實作 calculateRetracement 方法計算回撤水平
  - 實作 calculateExtension 方法計算擴展目標
  - 實作 findNearestLevel 方法尋找最接近的費波那契水平
  - 使用 Decimal.js 確保高精度計算
  - _需求：1.1, 1.2, 1.4, 2.1, 2.2, 2.5_

- [x] 2.2 撰寫費波那契服務的屬性測試





  - **屬性 1：回撤水平完整性**
  - **驗證需求：1.1**

- [x] 2.3 撰寫費波那契服務的屬性測試






  - **屬性 2：回撤公式正確性**
  - **驗證需求：1.2**

- [x] 2.4 撰寫費波那契服務的屬性測試






  - **屬性 3：價格接近度判斷**
  - **驗證需求：1.4**

- [x] 2.5 撰寫費波那契服務的屬性測試






  - **屬性 4：擴展公式正確性**
  - **驗證需求：2.2**

- [x] 2.6 撰寫費波那契服務的屬性測試






  - **屬性 5：高精度數值運算**
  - **驗證需求：2.5**

- [x] 3. 實作 RSI 指標服務







- [x] 3.1 建立 RSIService 類別



  - 實作 calculateRSI 方法計算 RSI 值
  - 實作 detectDivergence 方法識別背離
  - 支援自訂週期參數（預設 14 日）
  - 判斷超買（>70）和超賣（<30）狀態
  - _需求：3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 3.2 撰寫 RSI 服務的屬性測試






  - **屬性 6：RSI 公式正確性**
  - **驗證需求：3.2**

- [x] 3.3 撰寫 RSI 服務的屬性測試






  - **屬性 7：RSI 超買判斷**
  - **驗證需求：3.3**

- [x] 3.4 撰寫 RSI 服務的屬性測試






  - **屬性 8：RSI 超賣判斷**
  - **驗證需求：3.4**

- [x] 3.5 撰寫 RSI 服務的屬性測試






  - **屬性 9：RSI 背離識別**
  - **驗證需求：3.6**

- [x] 4. 實作 MACD 指標服務


- [x] 4.1 建立 MACDService 類別





  - 實作 calculateEMA 輔助方法計算指數移動平均
  - 實作 calculateMACD 方法計算 MACD 線、訊號線和柱狀圖
  - 實作 detectCrossover 方法識別黃金交叉和死亡交叉
  - 支援自訂快線、慢線和訊號線週期
  - _需求：4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [x] 4.2 撰寫 MACD 服務的屬性測試





  - **屬性 10：MACD 黃金交叉識別**
  - **驗證需求：4.2**

- [x] 4.3 撰寫 MACD 服務的屬性測試






  - **屬性 11：MACD 死亡交叉識別**
  - **驗證需求：4.3**

- [x] 4.4 撰寫 MACD 服務的屬性測試





  - **屬性 12：EMA 公式正確性**
  - **驗證需求：4.6**

- [x] 5. 實作布林通道服務

- [x] 5.1 建立 BollingerBandsService 類別


  - 實作 calculateSMA 輔助方法計算簡單移動平均
  - 實作 calculateStandardDeviation 輔助方法計算標準差
  - 實作 calculateBands 方法計算上軌、中軌、下軌
  - 實作 detectSqueeze 方法識別通道收窄
  - 判斷價格相對於通道的位置
  - _需求：5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [x] 5.2 撰寫布林通道服務的屬性測試






  - **屬性 13：布林通道計算正確性**
  - **驗證需求：5.1**

- [x] 5.3 撰寫布林通道服務的屬性測試






  - **屬性 14：布林通道收窄判斷**
  - **驗證需求：5.4**

- [x] 6. 實作 ATR 波動性指標服務

- [x] 6.1 建立 ATRService 類別


  - 實作 calculateTrueRange 輔助方法計算真實波幅
  - 實作 calculateATR 方法計算平均真實波幅
  - 實作 suggestStopLoss 方法建議止損位
  - 判斷波動性狀態（高/中/低）
  - _需求：6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 6.2 撰寫 ATR 服務的屬性測試






  - **屬性 15：ATR 公式正確性**
  - **驗證需求：6.2**

- [x] 7. 實作支撐壓力位服務


- [x] 7.1 建立 SupportResistanceService 類別


  - 實作 calculateLevels 方法計算支撐壓力位
  - 實作 findGoldenRatioLevels 方法基於黃金分割計算關鍵價位
  - 實作 mergeNearbyLevels 方法合併接近的價位
  - 識別目前最接近的支撐和壓力位
  - _需求：7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [x] 7.2 撰寫支撐壓力位服務的屬性測試






  - **屬性 16：價位合併邏輯**
  - **驗證需求：7.4**

- [x] 8. 實作技術評分服務


- [x] 8.1 建立 TechnicalScoreService 類別


  - 實作 calculateScore 方法綜合計算技術評分
  - 實作 getComponentScores 方法取得各指標貢獻度
  - 整合 RSI、MACD、布林通道、費波那契位置
  - 根據評分判斷市場狀態（強勢看多/看空/中性）
  - _需求：8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [x] 8.2 撰寫技術評分服務的屬性測試






  - **屬性 17：評分範圍正確性**
  - **驗證需求：8.1**

- [x] 8.3 撰寫技術評分服務的屬性測試


























  - **屬性 18：強勢看多判斷**
  - **驗證需求：8.2**



- [x] 8.4 撰寫技術評分服務的屬性測試



















  - **屬性 19：弱勢看空判斷**
  - **驗證需求：8.3**


- [x] 9. 實作 K線型態識別服務



- [x] 9.1 建立 CandlestickPatternService 類別








  - 實作各種型態識別方法（錘子線、吊人線、十字星、吞噬型態、晨星、暮星）
  - 實作 identifyPatterns 方法掃描並識別所有型態
  - 實作 calculateReliability 方法計算型態可靠度
  - 判斷型態是否出現在黃金分割關鍵位
  - _需求：9.1, 9.2, 9.3, 9.4, 9.5, 9.6_


- [x] 9.2 撰寫 K線型態服務的屬性測試





  - **屬性 20：看漲型態訊號**
  - **驗證需求：9.2**



- [x] 9.3 撰寫 K線型態服務的屬性測試










  - **屬性 21：看跌型態訊號**
  - **驗證需求：9.3**

- [x] 10. 實作指標快取服務



- [x] 10.1 建立 IndicatorCacheService 類別







  - 實作 get 方法從快取取得指標資料
  - 實作 set 方法儲存指標資料至快取
  - 實作 invalidate 方法清除特定股票的快取
  - 實作 clear 方法清除所有快取
  - 實作快取過期檢查邏輯（預設 1 小時）
  - _需求：11.1, 11.2, 11.3, 11.4, 11.5_
- [x] 10.2 撰寫快取服務的屬性測試



- [x] 10.2 撰寫快取服務的屬性測試




  - **屬性 23：快取命中返回**
  - **驗證需求：11.2**



- [x] 10.3 撰寫快取服務的屬性測試












  - **屬性 24：快取失效機制**
  - **驗證需求：11.3**

- [x] 11. 實作策略管理服務



- [x] 11.1 建立 StrategyService 類別






  - 實作 createStrategy 方法建立策略
  - 實作 evaluateConditions 方法評估策略條件
  - 實作 backtest 方法執行策略回測
  - 支援邏輯運算（AND、OR、NOT）組合多個指標訊號
  - 計算回測統計（勝率、平均報酬、最大回撤）
  - _需求：10.1, 10.2, 10.3, 10.4, 10.5, 10.6_



- [x] 11.2 撰寫策略服務的屬性測試












  - **屬性 22：回測統計計算正確性**
  - **驗證需求：10.4**

- [x] 12. 建立技術指標 API 路由





- [x] 12.1 實作費波那契 API 路由







  - 建立 GET /api/indicators/fibonacci/retracement 路由
  - 建立 GET /api/indicators/fibonacci/extension 路由
  - 整合 FibonacciService 和 IndicatorCacheService
  - 實作錯誤處理和輸入驗證
  - _需求：1.1, 1.2, 2.1, 2.2_


- [x] 12.2 實作 RSI API 路由






  - 建立 GET /api/indicators/rsi 路由
  - 整合 RSIService、StockService 和 IndicatorCacheService
  - 支援自訂週期參數
  - _需求：3.1, 3.2_



- [x] 12.3 實作 MACD API 路由





  - 建立 GET /api/indicators/macd 路由
  - 整合 MACDService、StockService 和 IndicatorCacheService
  - 支援自訂週期參數
  - _需求：4.1, 4.2_


- [x] 12.4 實作布林通道 API 路由





  - 建立 GET /api/indicators/bollinger 路由
  - 整合 BollingerBandsService、StockService 和 IndicatorCacheService
  - _需求：5.1, 5.2_



- [x] 12.5 實作 ATR API 路由





  - 建立 GET /api/indicators/atr 路由
  - 整合 ATRService、StockService 和 IndicatorCacheService
  - _需求：6.1, 6.2_


- [x] 12.6 實作支撐壓力位 API 路由




  - 建立 GET /api/indicators/support-resistance 路由
  - 整合 SupportResistanceService、StockService 和 IndicatorCacheService
  - _需求：7.1, 7.2_


- [x] 12.7 實作技術評分 API 路由






  - 建立 GET /api/indicators/technical-score 路由
  - 整合 TechnicalScoreService 和所有指標服務
  - _需求：8.1, 8.2_



- [x] 12.8 實作 K線型態 API 路由





  - 建立 GET /api/indicators/candlestick-patterns 路由
  - 整合 CandlestickPatternService 和 StockService
  - _需求：9.1, 9.2_


- [x] 12.9 實作快取管理 API 路由





  - 建立 GET /api/indicators/cache/clear 路由
  - 整合 IndicatorCacheService
  - _需求：11.3, 11.4_
-

- [x] 13. 建立策略管理 API 路由






- [x] 13.1 實作策略 CRUD API 路由




  - 建立 POST /api/strategies 路由（建立策略）
  - 建立 GET /api/strategies 路由（列出策略）
  - 建立 GET /api/strategies/:id 路由（取得策略詳情）
  - 建立 PUT /api/strategies/:id 路由（更新策略）
  - 建立 DELETE /api/strategies/:id 路由（刪除策略）
  - _需求：10.1, 10.2_


- [x] 13.2 實作策略回測 API 路由






  - 建立 GET /api/strategies/:id/backtest 路由
  - 整合 StrategyService 執行回測
  - 返回詳細的回測結果和統計數據
  - _需求：10.4, 10.6_

- [x] 14. 建立技術指標前端元件






- [x] 14.1 建立 IndicatorChart 通用圖表元件






  - 使用 Recharts 建立可重用的圖表元件
  - 支援多種圖表類型（折線圖、K線圖、柱狀圖）
  - 支援懸停顯示數值
  - 支援縮放和平移
  - _需求：12.1, 12.3, 12.4_
-

- [x] 14.2 建立 FibonacciDrawingTool 元件





  - 實作互動式費波那契繪圖工具
  - 支援在圖表上選擇兩點繪製回撤線
  - 支援選擇三點繪製擴展線
  - 高亮顯示接近的費波那契水平
  - _需求：1.1, 1.3, 1.4, 2.1, 2.3, 12.2_



- [x] 14.3 建立 RSIIndicator 元件





  - 顯示 RSI 折線圖
  - 標示 30 和 70 參考線
  - 高亮超買和超賣區域
  - 標示背離訊號
  - _需求：3.3, 3.4, 3.5, 3.6_



- [x] 14.4 建立 MACDIndicator 元件




  - 顯示 MACD 線、訊號線和柱狀圖
  - 標示黃金交叉和死亡交叉
  - 標示動能轉強訊號
  - _需求：4.2, 4.3, 4.4, 4.5_


- [x] 14.5 建立 BollingerBandsChart 元件





  - 顯示價格線、中軌、上軌、下軌
  - 標示價格觸及上下軌的訊號
  - 標示通道收窄和擴大狀態
  - _需求：5.2, 5.3, 5.4, 5.5, 5.6_

- [x] 14.6 建立 CandlestickPatternMarker 元件






  - 在 K線圖上標記識別的型態
  - 顯示型態名稱和訊號方向
  - 顯示可靠度評分
  - 高亮在黃金分割位的型態
  - _需求：9.2, 9.3, 9.4, 9.5_


- [x] 14.7 建立 SupportResistanceLines 元件






  - 在價格圖表上繪製支撐壓力線
  - 區分強支撐/壓力區域
  - 高亮最接近的支撐和壓力位
  - _需求：7.4, 7.5, 7.6_




- [x] 14.8 建立 TechnicalScoreCard 元件




  - 顯示綜合技術評分
  - 顯示市場狀態標籤（強勢看多/看空/中性）
  - 顯示各指標貢獻度和權重
  - 顯示評分變化趨勢圖
  - _需求：8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

-

- [x] 14.9 建立 StrategyConditionBuilder 元件





  - 提供視覺化介面建立策略條件
  - 支援選擇指標和設定觸發條件
  - 支援邏輯運算組合（AND、OR、NOT）
  - 即時預覽策略條件
  - _需求：10.1, 10.2, 10.5_


- [x] 15. 建立技術分析頁面




- [x] 15.1 建立 TechnicalAnalysisPage 主頁面





  - 整合股票搜尋功能
  - 顯示選定股票的所有技術指標
  - 提供指標選擇和參數設定介面
  - 整合所有指標元件
  - _需求：3.1, 4.1, 5.1, 6.1, 7.1, 8.1, 9.1_


-

- [x] 15.2 建立 FibonacciToolPage 費波那契工具頁面




  - 專注於費波那契分析
  - 整合 FibonacciDrawingTool 元件
  - 顯示回撤和擴展計算結果
  - 提供趨勢方向切換
  - _需求：1.1, 1.2, 1.3, 1.5, 2.1, 2.2, 2.3_


- [x] 15.3 建立 StrategyBuilderPage 策略建立器頁面






  - 整合 StrategyConditionBuilder 元件
  - 提供策略命名和描述輸入
  - 顯示策略列表
  - 提供策略編輯和刪除功能
  - _需求：10.1, 10.2, 10.3_

- [x] 15.4 建立 BacktestResultsPage 回測結果頁面








  - 顯示回測統計數據（勝率、平均報酬、最大回撤）
  - 顯示詳細交易記錄表格
  - 顯示績效曲線圖
  - 提供匯出回測報告功能
  - _需求：10.4, 10.6_



- [x] 16. 整合與優化




- [x] 16.1 實作指標計算效能優化






  - 實作增量計算邏輯（EMA、ATR）
  - 實作並行計算多個指標
  - 實作資料預處理快取
  - _需求：11.1, 11.2_
-

- [x] 16.2 實作價格資料更新時的快取失效






  - 在 StockService 的 cachePrice 方法中整合 IndicatorCacheService
  - 當價格更新時自動清除相關指標快取
  - _需求：11.3_

- [x] 16.3 新增導航連結到技術分析功能






  - 在主導航選單新增技術分析入口
  - 在股票詳情頁面新增技術分析連結
  - 在儀表板新增技術指標摘要卡片
  - _需求：12.1_
- [x] 17. 最終檢查點

- [x] 17. 最終檢查點



  - 確保所有測試通過
  - 驗證所有 API 路由正常運作
  - 驗證前端元件正確顯示
  - 驗證快取機制正常運作
  - 如有問題請詢問使用者
