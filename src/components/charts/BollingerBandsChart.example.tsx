/**
 * Example usage of BollingerBandsChart component
 * This demonstrates how to use the Bollinger Bands indicator with sample data
 */

import BollingerBandsChart, { BollingerBandsDataPoint } from './BollingerBandsChart'

// Sample Bollinger Bands data - normal volatility
const sampleDataNormal: BollingerBandsDataPoint[] = [
  { date: '2024-01-01', price: 100, upper: 105, middle: 100, lower: 95, bandwidth: 10 },
  { date: '2024-01-02', price: 102, upper: 107, middle: 102, lower: 97, bandwidth: 10 },
  { date: '2024-01-03', price: 104, upper: 109, middle: 104, lower: 99, bandwidth: 10 },
  { date: '2024-01-04', price: 103, upper: 108, middle: 103, lower: 98, bandwidth: 10 },
  { date: '2024-01-05', price: 105, upper: 110, middle: 105, lower: 100, bandwidth: 10 },
  { date: '2024-01-08', price: 106, upper: 111, middle: 106, lower: 101, bandwidth: 10 },
  { date: '2024-01-09', price: 107, upper: 112, middle: 107, lower: 102, bandwidth: 10 },
  { date: '2024-01-10', price: 108, upper: 113, middle: 108, lower: 103, bandwidth: 10 },
]

// Sample data - price touching upper band (overbought signal)
const sampleDataUpperBand: BollingerBandsDataPoint[] = [
  { date: '2024-01-01', price: 100, upper: 105, middle: 100, lower: 95, bandwidth: 10 },
  { date: '2024-01-02', price: 102, upper: 107, middle: 102, lower: 97, bandwidth: 10 },
  { date: '2024-01-03', price: 104, upper: 109, middle: 104, lower: 99, bandwidth: 10 },
  { date: '2024-01-04', price: 106, upper: 110, middle: 105, lower: 100, bandwidth: 10 },
  { date: '2024-01-05', price: 109, upper: 112, middle: 107, lower: 102, bandwidth: 10 },
  { date: '2024-01-08', price: 111, upper: 114, middle: 109, lower: 104, bandwidth: 10 },
  { date: '2024-01-09', price: 113, upper: 115, middle: 110, lower: 105, bandwidth: 10 },
  { date: '2024-01-10', price: 114.5, upper: 115, middle: 110, lower: 105, bandwidth: 10 }, // Near upper band
]

// Sample data - price touching lower band (oversold signal)
const sampleDataLowerBand: BollingerBandsDataPoint[] = [
  { date: '2024-01-01', price: 100, upper: 105, middle: 100, lower: 95, bandwidth: 10 },
  { date: '2024-01-02', price: 98, upper: 103, middle: 98, lower: 93, bandwidth: 10 },
  { date: '2024-01-03', price: 96, upper: 101, middle: 96, lower: 91, bandwidth: 10 },
  { date: '2024-01-04', price: 94, upper: 99, middle: 94, lower: 89, bandwidth: 10 },
  { date: '2024-01-05', price: 92, upper: 97, middle: 92, lower: 87, bandwidth: 10 },
  { date: '2024-01-08', price: 90, upper: 95, middle: 90, lower: 85, bandwidth: 10 },
  { date: '2024-01-09', price: 88, upper: 93, middle: 88, lower: 83, bandwidth: 10 },
  { date: '2024-01-10', price: 83.5, upper: 91, middle: 86, lower: 81, bandwidth: 10 }, // Near lower band
]

// Sample data - squeeze (channel narrowing)
const sampleDataSqueeze: BollingerBandsDataPoint[] = [
  { date: '2024-01-01', price: 100, upper: 105, middle: 100, lower: 95, bandwidth: 10 },
  { date: '2024-01-02', price: 100.5, upper: 104, middle: 100, lower: 96, bandwidth: 8 },
  { date: '2024-01-03', price: 100.2, upper: 103, middle: 100, lower: 97, bandwidth: 6 },
  { date: '2024-01-04', price: 100.3, upper: 102.5, middle: 100, lower: 97.5, bandwidth: 5 },
  { date: '2024-01-05', price: 100.1, upper: 102, middle: 100, lower: 98, bandwidth: 4 },
  { date: '2024-01-08', price: 100.4, upper: 101.8, middle: 100, lower: 98.2, bandwidth: 3.6 },
  { date: '2024-01-09', price: 100.2, upper: 101.5, middle: 100, lower: 98.5, bandwidth: 3 },
  { date: '2024-01-10', price: 100.3, upper: 101.2, middle: 100, lower: 98.8, bandwidth: 2.4 }, // Squeeze
]

// Sample data - expansion (channel widening)
const sampleDataExpansion: BollingerBandsDataPoint[] = [
  { date: '2024-01-01', price: 100, upper: 102, middle: 100, lower: 98, bandwidth: 4 },
  { date: '2024-01-02', price: 102, upper: 105, middle: 101, lower: 97, bandwidth: 8 },
  { date: '2024-01-03', price: 105, upper: 109, middle: 103, lower: 97, bandwidth: 12 },
  { date: '2024-01-04', price: 108, upper: 114, middle: 106, lower: 98, bandwidth: 16 },
  { date: '2024-01-05', price: 112, upper: 120, middle: 110, lower: 100, bandwidth: 20 },
  { date: '2024-01-08', price: 115, upper: 126, middle: 114, lower: 102, bandwidth: 24 },
  { date: '2024-01-09', price: 118, upper: 132, middle: 118, lower: 104, bandwidth: 28 },
  { date: '2024-01-10', price: 122, upper: 138, middle: 122, lower: 106, bandwidth: 32 }, // Expansion
]

export default function BollingerBandsChartExample() {
  return (
    <div className="space-y-8 p-8">
      <div>
        <h2 className="text-2xl font-bold mb-4">布林通道圖表範例</h2>
        <p className="text-gray-600 mb-6">
          布林通道 (Bollinger Bands) 是基於移動平均線和標準差的波動性指標，用於判斷價格波動範圍和潛在突破點
        </p>
      </div>

      {/* Normal volatility */}
      <div>
        <h3 className="text-xl font-semibold mb-4">正常波動範圍</h3>
        <p className="text-gray-600 mb-2">價格在通道內正常波動</p>
        <BollingerBandsChart data={sampleDataNormal} title="布林通道 - 正常波動" />
      </div>

      {/* Price near upper band */}
      <div>
        <h3 className="text-xl font-semibold mb-4">價格接近上軌</h3>
        <p className="text-gray-600 mb-2">價格觸及上軌，可能超買或向上突破</p>
        <BollingerBandsChart data={sampleDataUpperBand} title="布林通道 - 接近上軌" />
      </div>

      {/* Price near lower band */}
      <div>
        <h3 className="text-xl font-semibold mb-4">價格接近下軌</h3>
        <p className="text-gray-600 mb-2">價格觸及下軌，可能超賣或獲得支撐</p>
        <BollingerBandsChart data={sampleDataLowerBand} title="布林通道 - 接近下軌" />
      </div>

      {/* Squeeze (channel narrowing) */}
      <div>
        <h3 className="text-xl font-semibold mb-4">通道收窄（盤整狀態）</h3>
        <p className="text-gray-600 mb-2">通道寬度收窄，表示盤整狀態，可能醞釀突破</p>
        <BollingerBandsChart
          data={sampleDataSqueeze}
          title="布林通道 - 收窄"
          showBandwidth={true}
          squeezeThreshold={3}
        />
      </div>

      {/* Expansion (channel widening) */}
      <div>
        <h3 className="text-xl font-semibold mb-4">通道擴大（波動加劇）</h3>
        <p className="text-gray-600 mb-2">通道寬度擴大，表示波動加劇，趨勢明確</p>
        <BollingerBandsChart
          data={sampleDataExpansion}
          title="布林通道 - 擴大"
          showBandwidth={true}
          expansionThreshold={15}
        />
      </div>

      {/* Custom height */}
      <div>
        <h3 className="text-xl font-semibold mb-4">自訂高度</h3>
        <BollingerBandsChart data={sampleDataNormal} height={500} title="布林通道 (自訂高度)" />
      </div>

      {/* Empty data example */}
      <div>
        <h3 className="text-xl font-semibold mb-4">無資料狀態</h3>
        <BollingerBandsChart data={[]} />
      </div>
    </div>
  )
}
